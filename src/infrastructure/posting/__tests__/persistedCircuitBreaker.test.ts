// src/infrastructure/posting/__tests__/persistedCircuitBreaker.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  PersistedChannelCircuitBreaker,
  Http4xxError,
  isHttp4xx,
} from "../persistedCircuitBreaker";
import { CREATE_TABLES_V2_SQL } from "../../sqlite/schema";

describe("Fase 3: Circuit Breaker Persistido por Canal en SQLite", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(CREATE_TABLES_V2_SQL);
  });

  it("aislamiento: estados independientes por canal ('linkedin' vs 'instagram')", async () => {
    const cbLinkedin = new PersistedChannelCircuitBreaker(db, "linkedin", { failureThreshold: 2 });
    const cbInstagram = new PersistedChannelCircuitBreaker(db, "instagram", { failureThreshold: 2 });

    expect(cbLinkedin.getState()).toBe("CLOSED");
    expect(cbInstagram.getState()).toBe("CLOSED");

    // Linkedin falla 2 veces por error de sistema (500)
    await cbLinkedin.execute(
      async () => { throw new Error("500 Internal Server Error"); },
      async () => "fallback_li"
    );
    await cbLinkedin.execute(
      async () => { throw new Error("503 Service Unavailable"); },
      async () => "fallback_li"
    );

    // Linkedin debe estar OPEN, pero Instagram debe continuar CLOSED
    expect(cbLinkedin.getState()).toBe("OPEN");
    expect(cbInstagram.getState()).toBe("CLOSED");

    const rowLi = cbLinkedin.getRow();
    const rowIg = cbInstagram.getRow();
    expect(rowLi.estado).toBe("OPEN");
    expect(rowLi.conteo_fallas).toBe(2);
    expect(rowIg.estado).toBe("CLOSED");
    expect(rowIg.conteo_fallas).toBe(0);
  });

  it("omisión estricta de errores HTTP 4xx como fallas del sistema", async () => {
    const cb = new PersistedChannelCircuitBreaker(db, "twitter", { failureThreshold: 2 });

    // 10 errores 4xx (400 Bad Request, 401 Unauthorized, 404, etc.)
    for (let i = 0; i < 10; i++) {
      const res = await cb.execute(
        async () => {
          throw new Http4xxError(400, "Borrador con formato inválido para Twitter");
        },
        async (err) => `fallback_${err.message}`
      );
      expect(res.fromFallback).toBe(true);
      expect(res.error).toContain("[4xx Client Error]");
    }

    // El circuito DEBE permanecer CLOSED con 0 fallas del sistema
    expect(cb.getState()).toBe("CLOSED");
    const row = cb.getRow();
    expect(row.estado).toBe("CLOSED");
    expect(row.conteo_fallas).toBe(0);
  });

  it("isHttp4xx detecta códigos 4xx numéricos y de texto estándar", () => {
    expect(isHttp4xx(new Http4xxError(422, "Unprocessable"))).toBe(true);
    expect(isHttp4xx({ status: 404, message: "Not found" })).toBe(true);
    expect(isHttp4xx({ statusCode: 401, message: "Unauthorized" })).toBe(true);
    expect(isHttp4xx(new Error("HTTP 403: Forbidden"))).toBe(true);
    expect(isHttp4xx(new Error("500 Internal Server Error"))).toBe(false);
    expect(isHttp4xx(new Error("ECONNREFUSED"))).toBe(false);
  });

  it("conmuta a OPEN ante timeouts o caídas de red y ejecuta fallback en < 50ms", async () => {
    let virtualNow = 10000;
    const now = () => virtualNow;

    const cb = new PersistedChannelCircuitBreaker(db, "facebook", {
      failureThreshold: 2,
      timeoutMs: 50,
      now,
    });

    // 2 fallas consecutivas por timeout
    await cb.execute(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
      () => "fallback_fb"
    );
    await cb.execute(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
      () => "fallback_fb"
    );

    expect(cb.getState()).toBe("OPEN");

    // Estando OPEN, no intenta la llamada y el fallback responde en < 50ms
    const t0 = performance.now();
    const res = await cb.execute(
      async () => "nunca_ejecutado",
      async () => "fallback_inmediato"
    );
    const dur = performance.now() - t0;

    expect(dur).toBeLessThan(50);
    expect(res.fromFallback).toBe(true);
    expect(res.result).toBe("fallback_inmediato");
  });

  it("recuperación HALF_OPEN y cierre tras éxito posterior", async () => {
    let virtualNow = 10000;
    const now = () => virtualNow;

    const cb = new PersistedChannelCircuitBreaker(db, "linkedin", {
      failureThreshold: 1,
      cooldownMs: 5000,
      now,
    });

    // Falla 1 vez y abre
    await cb.execute(
      async () => { throw new Error("500 Error"); },
      async () => "fb"
    );
    expect(cb.getState()).toBe("OPEN");

    // Pasan 3 segundos (menos del cooldown de 5s)
    virtualNow += 3000;
    expect(cb.getState()).toBe("OPEN");

    // Pasan 3 segundos más (total 6s >= cooldown)
    virtualNow += 3000;
    expect(cb.getState()).toBe("HALF_OPEN");

    // Prueba exitosa en HALF_OPEN
    const res = await cb.execute(
      async () => "publicacion_exitosa",
      async () => "fb"
    );

    expect(res.fromFallback).toBe(false);
    expect(res.result).toBe("publicacion_exitosa");
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.getRow().conteo_fallas).toBe(0);
  });
});
