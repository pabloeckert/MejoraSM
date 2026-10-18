// src/infrastructure/posting/__tests__/circuitBreakerV2.test.ts
// Circuit Breaker V2 (3 fallos / 60 s, backoff exponencial + jitter) y dispatcher del Outbox.
// 100% hermético: reloj inyectado y transporte simulado, cero red.
import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { ZernioCircuitBreaker, calcularBackoffConJitter } from "../circuitBreaker";
import { dispatchOutbox } from "../outboxDispatcher";
import { SqliteOutboxRepository } from "../../sqlite/SqliteOutboxRepository";
import { CREATE_TABLES_SQL } from "../../sqlite/schema";

function reloj(inicio = 1_000_000) {
  let t = inicio;
  return { now: () => t, avanzar: (ms: number) => { t += ms; } };
}

const falla = async () => { throw new Error("red caída"); };
const ok = async () => "ok";
const fb = () => "fb";

describe("Circuit Breaker V2: ventana de 60 s", () => {
  it("abre tras 3 fallos dentro de 60 s", async () => {
    const c = reloj();
    const cb = new ZernioCircuitBreaker({ now: c.now });
    await cb.execute(falla, fb); c.avanzar(10_000);
    await cb.execute(falla, fb); c.avanzar(10_000);
    expect(cb.getState()).toBe("CLOSED");
    await cb.execute(falla, fb);
    expect(cb.getState()).toBe("OPEN");
  });

  it("NO abre si los fallos caen fuera de la ventana de 60 s", async () => {
    const c = reloj();
    const cb = new ZernioCircuitBreaker({ now: c.now });
    await cb.execute(falla, fb); c.avanzar(40_000);
    await cb.execute(falla, fb); c.avanzar(40_000); // el 1.º ya expiró (80 s)
    await cb.execute(falla, fb);
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.getMetrics().failureCount).toBe(2);
  });

  it("OPEN -> HALF_OPEN tras cooldown; éxito -> CLOSED; fallo en HALF_OPEN -> OPEN", async () => {
    const c = reloj();
    const cb = new ZernioCircuitBreaker({ now: c.now, cooldownMs: 5000 });
    for (let i = 0; i < 3; i++) await cb.execute(falla, fb);
    expect(cb.getState()).toBe("OPEN");
    c.avanzar(5000);
    expect(cb.getState()).toBe("HALF_OPEN");
    await cb.execute(falla, fb);
    expect(cb.getState()).toBe("OPEN");
    c.avanzar(5000);
    expect(cb.getState()).toBe("HALF_OPEN");
    const r = await cb.execute(ok, fb);
    expect(r.fromFallback).toBe(false);
    expect(cb.getState()).toBe("CLOSED");
  });

  it("en OPEN no invoca la acción de red (bypass directo al fallback)", async () => {
    const cb = new ZernioCircuitBreaker({ now: reloj().now });
    for (let i = 0; i < 3; i++) await cb.execute(falla, fb);
    let llamadas = 0;
    const r = await cb.execute(async () => { llamadas++; return "x"; }, fb);
    expect(llamadas).toBe(0);
    expect(r.fromFallback).toBe(true);
  });
});

describe("Backoff exponencial con jitter", () => {
  it("el techo crece 2^n, está acotado por cap y el jitter respeta [0, techo)", () => {
    const max = (n: number) => calcularBackoffConJitter(n, { baseMs: 1000, capMs: 60_000, rng: () => 0.999999 });
    expect(max(1)).toBeLessThan(2000);
    expect(max(2)).toBeLessThan(4000);
    expect(max(3)).toBeGreaterThan(max(2));
    expect(max(20)).toBeLessThan(60_000);
    expect(calcularBackoffConJitter(3, { rng: () => 0 })).toBe(0);
    expect(calcularBackoffConJitter(3, { baseMs: 1000, rng: () => 0.5 })).toBe(4000);
  });

  it("rng real produce valores dispersos (jitter efectivo)", () => {
    const set = new Set(Array.from({ length: 30 }, () => calcularBackoffConJitter(5)));
    expect(set.size).toBeGreaterThan(10);
  });
});

describe("dispatchOutbox", () => {
  function setup() {
    const db = new DatabaseSync(":memory:");
    db.exec(CREATE_TABLES_SQL);
    const outbox = new SqliteOutboxRepository(db);
    const t = new Date("2026-10-18T10:00:00Z");
    for (const id of ["P1", "P2", "P3", "P4"]) outbox.encolarAprobado({ propuesta_id: id, canal: "linkedin", borrador_opcion: "A" }, t);
    return { outbox, ahora: new Date("2026-10-18T10:00:00Z") };
  }

  it("éxito => PUBLICADO", async () => {
    const { outbox, ahora } = setup();
    const cb = new ZernioCircuitBreaker({ now: () => ahora.getTime() });
    const r = await dispatchOutbox({ outbox, circuitBreaker: cb, sender: async (p) => `ext_${p.post_id}`, now: () => ahora });
    expect(r).toMatchObject({ reclamados: 4, publicados: 4, reintentos: 0 });
    expect(outbox.listarPorPropuesta("P1")[0].estado_post).toBe("PUBLICADO");
  });

  it("fallo => REINTENTO con proximo_reintento_at futuro y contador; a la 5.ª falla => FALLIDO_PERMANENTE", async () => {
    const { outbox, ahora } = setup();
    outbox.cancelar(outbox.listarPorPropuesta("P2")[0].post_id);
    outbox.cancelar(outbox.listarPorPropuesta("P3")[0].post_id);
    outbox.cancelar(outbox.listarPorPropuesta("P4")[0].post_id);
    const cb = new ZernioCircuitBreaker({ now: () => ahora.getTime(), failureThreshold: 999 });
    let reloj = ahora.getTime();
    const sender = async () => { throw new Error("503"); };

    for (let intento = 1; intento <= 5; intento++) {
      reloj += 24 * 3_600_000; // salta cualquier backoff
      const r = await dispatchOutbox({ outbox, circuitBreaker: cb, sender, now: () => new Date(reloj) });
      expect(r.reclamados).toBe(1);
      const post = outbox.listarPorPropuesta("P1")[0];
      expect(post.reintentos_cont).toBe(intento);
      expect(post.error_ultimo).toBe("503");
      if (intento < 5) {
        expect(post.estado_post).toBe("REINTENTO");
        expect(new Date(post.proximo_reintento_at!).getTime()).toBeGreaterThanOrEqual(reloj);
      } else {
        expect(post.estado_post).toBe("FALLIDO_PERMANENTE");
        expect(r.fallidosPermanentes).toBe(1);
      }
    }
    reloj += 24 * 3_600_000;
    expect((await dispatchOutbox({ outbox, circuitBreaker: cb, sender, now: () => new Date(reloj) })).reclamados).toBe(0);
  });

  it("un REINTENTO no se reclama antes de proximo_reintento_at", async () => {
    const { outbox, ahora } = setup();
    const cb = new ZernioCircuitBreaker({ now: () => ahora.getTime(), failureThreshold: 999 });
    const post = outbox.reclamarLote(1, ahora)[0];
    outbox.registrarFallo(post.post_id, "x", ahora, { backoff: { baseMs: 60_000, rng: () => 0.99 } });
    const antes = await dispatchOutbox({ outbox, circuitBreaker: cb, sender: async () => "ok", now: () => ahora, limite: 1 });
    expect(antes.reclamados).toBe(1); // se reclaman los otros APROBADO, no el REINTENTO
    expect(outbox.obtenerPorId(post.post_id)!.estado_post).toBe("REINTENTO");
  });

  it("circuito abre tras 3 fallos: el resto se difiere SIN consumir reintentos", async () => {
    const { outbox, ahora } = setup();
    const cb = new ZernioCircuitBreaker({ now: () => ahora.getTime() });
    const r = await dispatchOutbox({ outbox, circuitBreaker: cb, sender: async () => { throw new Error("down"); }, now: () => ahora });
    expect(cb.getState()).toBe("OPEN");
    expect(r.reintentos).toBe(3);
    expect(r.diferidosPorCircuitoAbierto).toBe(1);
    const diferido = outbox.listarPorPropuesta("P4")[0];
    expect(diferido.estado_post).toBe("REINTENTO");
    expect(diferido.reintentos_cont).toBe(0);
    // Con el circuito abierto el siguiente ciclo ni reclama ni llama al transporte.
    let llamadas = 0;
    const r2 = await dispatchOutbox({ outbox, circuitBreaker: cb, sender: async () => { llamadas++; return "x"; }, now: () => ahora });
    expect(r2.reclamados).toBe(0);
    expect(llamadas).toBe(0);
  });
});
