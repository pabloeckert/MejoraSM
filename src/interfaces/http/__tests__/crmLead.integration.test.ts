// src/interfaces/http/__tests__/crmLead.integration.test.ts
// /api/crm/lead (anti-bot, rate limit, atribución) y PATCH de estado. Servidor local efímero, sin red externa.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import { createSMServer } from "../server";
import { SqliteSMRepository } from "../../../infrastructure/sqlite/SqliteSMRepository";
import { SqliteBovedaRepository } from "../../../infrastructure/sqlite/SqliteBovedaRepository";
import { SqlitePropuestaRepository } from "../../../infrastructure/sqlite/SqlitePropuestaRepository";
import { SqliteProspectoRepository } from "../../../infrastructure/sqlite/SqliteProspectoRepository";
import { SlidingWindowRateLimiter } from "../rateLimiter";

const BEARER = { Authorization: `Bearer ${process.env.MEJORA_SM_AUTH_TOKEN || "mejora_sm_local_bearer_2026"}` };
const J = { "Content-Type": "application/json" };

async function levantar(limite: number): Promise<{ server: Server; base: string; repo: SqliteProspectoRepository }> {
  const repo = new SqliteProspectoRepository(":memory:");
  const server = createSMServer({
    smRepo: new SqliteSMRepository(":memory:"),
    bovedaRepo: new SqliteBovedaRepository(":memory:"),
    propuestaRepo: new SqlitePropuestaRepository(":memory:"),
    prospectoRepo: repo,
    leadRateLimiter: new SlidingWindowRateLimiter(limite, 60_000),
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, repo };
}

const cerrar = (s: Server) => new Promise<void>((res, rej) => s.close((e) => (e ? rej(e) : res())));
const lead = (over: Record<string, unknown> = {}) => ({
  email: "cliente@empresa.com", nombre: "Cliente", telefono: "+54 11 5555-1234", empresa: "ACME",
  utm_content: "PZ-2026-014", utm_source: "instagram", utm_medium: "social", utm_campaign: "q4", ...over,
});
const post = (base: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}/api/crm/lead`, { method: "POST", headers: { ...J, ...headers }, body: JSON.stringify(body) });

describe("POST /api/crm/lead", () => {
  let ctx: Awaited<ReturnType<typeof levantar>>;
  beforeAll(async () => { ctx = await levantar(100); });
  afterAll(async () => { await cerrar(ctx.server); });

  it("201: captura sin Bearer, persiste pieza_id_atribucion desde utm_content y SLA 48 h", async () => {
    const res = await post(ctx.base, lead());
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toMatchObject({ success: true, duplicado: false, estado: "CAPTURADO" });
    const p = ctx.repo.obtenerPorId(data.prospecto_id)!;
    expect(p.pieza_id_atribucion).toBe("PZ-2026-014");
    expect(p.origen_utm).toBe("instagram/social/q4");
    const horas = (Date.parse(p.sla_limite_calificacion) - Date.parse(p.fecha_captura)) / 3_600_000;
    expect(horas).toBe(48);
  });

  it("toma utm_content de la querystring cuando no viene en el body", async () => {
    const res = await fetch(`${ctx.base}/api/crm/lead?utm_content=PZ-QS-1`, {
      method: "POST", headers: J, body: JSON.stringify(lead({ email: "qs@empresa.com", utm_content: undefined })),
    });
    expect(res.status).toBe(201);
    expect(ctx.repo.obtenerPorId((await res.json()).prospecto_id)!.pieza_id_atribucion).toBe("PZ-QS-1");
  });

  it("200 duplicado=true con el mismo email (idempotente)", async () => {
    const res = await post(ctx.base, lead());
    expect(res.status).toBe(200);
    expect((await res.json()).duplicado).toBe(true);
  });

  it("400: sin utm_content, email inválido, teléfono inválido, body no objeto", async () => {
    expect((await post(ctx.base, lead({ email: "x1@e.com", utm_content: undefined }))).status).toBe(400);
    expect((await post(ctx.base, lead({ utm_content: "../../etc" , email: "x2@e.com" }))).status).toBe(400);
    expect((await post(ctx.base, lead({ email: "no-es-email" }))).status).toBe(400);
    expect((await post(ctx.base, lead({ email: "x3@e.com", telefono: "abc" }))).status).toBe(400);
    expect((await post(ctx.base, [1, 2])).status).toBe(400);
  });

  it("403 anti-bot: honeypot, llenado instantáneo y User-Agent de bot", async () => {
    expect((await post(ctx.base, lead({ email: "b1@e.com", website: "http://spam" }))).status).toBe(403);
    expect((await post(ctx.base, lead({ email: "b2@e.com", form_rendered_at: Date.now() }))).status).toBe(403);
    expect((await post(ctx.base, lead({ email: "b3@e.com" }), { "User-Agent": "Googlebot/2.1" })).status).toBe(403);
    expect(ctx.repo.listarSlaVencidos(new Date("2100-01-01")).filter((p) => p.email.startsWith("b"))).toHaveLength(0);
  });

  it("413 con payload sobredimensionado", async () => {
    const res = await post(ctx.base, lead({ email: "big@e.com", nombre: "x".repeat(40_000) }));
    expect(res.status).toBe(413);
  });
});

describe("Rate limit de /api/crm/lead", () => {
  it("429 con Retry-After al superar el límite por IP", async () => {
    const c = await levantar(3);
    try {
      const estados: number[] = [];
      for (let i = 0; i < 5; i++) estados.push((await post(c.base, lead({ email: `r${i}@e.com` }))).status);
      expect(estados).toEqual([201, 201, 201, 429, 429]);
      const res = await post(c.base, lead({ email: "r9@e.com" }));
      expect(res.headers.get("retry-after")).toBe("60");
    } finally {
      await cerrar(c.server);
    }
  });
});

describe("PATCH /api/crm/prospectos/:id/estado", () => {
  let ctx: Awaited<ReturnType<typeof levantar>>;
  let id: string;
  beforeAll(async () => {
    ctx = await levantar(100);
    id = (await (await post(ctx.base, lead())).json()).prospecto_id;
  });
  afterAll(async () => { await cerrar(ctx.server); });
  const patch = (pid: string, body: unknown, auth = true) =>
    fetch(`${ctx.base}/api/crm/prospectos/${pid}/estado`, { method: "PATCH", headers: { ...J, ...(auth ? BEARER : {}) }, body: JSON.stringify(body) });

  it("401 sin Bearer", async () => {
    expect((await patch(id, { estado: "CALIFICADO" }, false)).status).toBe(401);
  });
  it("200 transición válida y evento auditado; 409 inválida; 404 inexistente; 400 estado desconocido", async () => {
    expect((await patch(id, { estado: "CALIFICADO" })).status).toBe(200);
    expect((await patch(id, { estado: "CERRADO_GANADO" })).status).toBe(409);
    expect((await patch("nope", { estado: "CALIFICADO" })).status).toBe(404);
    expect((await patch(id, { estado: "VOLANDO" })).status).toBe(400);
    expect((await patch(id, { estado: "DESCARTADO" })).status).toBe(409); // falta motivo
    expect((await patch(id, { estado: "DESCARTADO", motivo_catalogo: "SIN_PRESUPUESTO" })).status).toBe(200);
    expect(ctx.repo.listarEventos(id).map((e) => e.estado_nuevo)).toEqual(["CAPTURADO", "CALIFICADO", "DESCARTADO"]);
  });
  it("las demás mutaciones de /api siguen exigiendo Bearer", async () => {
    const res = await fetch(`${ctx.base}/api/approve`, { method: "POST", headers: J, body: JSON.stringify({ id: "x" }) });
    expect(res.status).toBe(401);
  });
});
