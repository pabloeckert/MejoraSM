// src/infrastructure/posting/__tests__/circuitBreaker.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { ZernioCircuitBreaker } from "../circuitBreaker";
import { SqliteSMRepository } from "../../sqlite/SqliteSMRepository";
import { PropuestaMejoraSMDTO, CanalDestino } from "../../../domain/types";

function mockPropuesta(id: string, canal: CanalDestino | string, motivo: string): PropuestaMejoraSMDTO {
  return {
    propuesta_id: id,
    canal_destino: canal as CanalDestino,
    dia_programado: new Date().toISOString(),
    origen_boveda_id: "BOV-001",
    borradores: [
      {
        opcion: "A",
        tipo_formato: "post_directo",
        estrategia: "jab_educativo",
        titulo_portada: "Mock Title",
        cuerpo_texto: "Cuerpo",
        copy_tres_pasos: { paso1_dolor: "p1", paso2_reencuadre: "p2", paso3_direccion_web: "p3" },
        cta_texto: "CTA",
      },
      {
        opcion: "B",
        tipo_formato: "carrusel_pdf",
        estrategia: "networking_prueba_social",
        titulo_portada: "Mock B",
        cuerpo_texto: "Cuerpo B",
        copy_tres_pasos: { paso1_dolor: "p1", paso2_reencuadre: "p2", paso3_direccion_web: "p3" },
        cta_texto: "CTA B",
      },
      {
        opcion: "C",
        tipo_formato: "post_autoridad",
        estrategia: "right_hook_conversion",
        titulo_portada: "Mock C",
        cuerpo_texto: "Cuerpo C",
        copy_tres_pasos: { paso1_dolor: "p1", paso2_reencuadre: "p2", paso3_direccion_web: "p3" },
        cta_texto: "CTA C",
      },
    ],
    borrador_seleccionado: "A",
    tratamiento_visual: {
      marco_expandido_requerido: false,
      color_fondo_marco: "#FFFFFF",
      regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
      relacion_aspecto_destino: "4:5",
    },
    imagen_boveda_vinculada: { id: "img-1", ruta_archivo_local: "/test.jpg" },
    estado: "pendiente_revision",
    motivo_rechazo: motivo,
  };
}

describe("SRE Circuit Breaker Zernio & Fallback a SQLite", () => {
  const testDbPath = path.join(process.cwd(), "data", "test_circuit_breaker.db");
  let repo: SqliteSMRepository;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore lock
      }
    }
    repo = new SqliteSMRepository(testDbPath);
  });

  afterEach(() => {
    if (repo) {
      repo.close();
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore lock
      }
    }
  });

  it("mantiene el circuito CLOSED ante llamadas exitosas y no invoca fallback", async () => {
    const cb = new ZernioCircuitBreaker({ failureThreshold: 3, timeoutMs: 500 });

    const execution = await cb.execute(
      async () => "post_id_ok_123",
      () => "fallback_id"
    );

    expect(execution.fromFallback).toBe(false);
    expect(execution.result).toBe("post_id_ok_123");
    expect(cb.getState()).toBe("CLOSED");
  });

  it("simula latencia excesiva (> timeoutMs) disparando Fast-Window Abort y ejecutando fallback a SQLite en < 50ms", async () => {
    // Timeout a 100ms, simulamos latencia de 2500ms
    const cb = new ZernioCircuitBreaker({ failureThreshold: 3, timeoutMs: 100 });

    const execution = await cb.execute(
      async (signal) => {
        return new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => resolve("never_reached"), 2500);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("AbortError: Operation timed out"));
          });
        });
      },
      (err) => {
        // Fallback a SQLite: registrar estado encolado
        const start = performance.now();
        repo.guardarPropuesta(mockPropuesta("PROP-FALLBACK-TIMEOUT", "instagram", `Fallback de red: ${err.message}`));
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(50);
        return "fallback_sqlite_id";
      }
    );

    expect(execution.fromFallback).toBe(true);
    expect(execution.result).toBe("fallback_sqlite_id");
    expect(execution.fallbackDurationMs).toBeDefined();
    expect(execution.fallbackDurationMs!).toBeLessThan(50);

    // Verificar en SQLite que se guardó
    const p = repo.obtenerPropuesta("PROP-FALLBACK-TIMEOUT");
    expect(p).not.toBeNull();
    expect(p?.motivo_rechazo).toContain("Fallback de red");
  });

  it("simula caídas de red ('TypeError: Failed to fetch') y responde con fallback en < 50ms sin bloquear el proceso", async () => {
    const cb = new ZernioCircuitBreaker({ failureThreshold: 3, timeoutMs: 1000 });

    const execution = await cb.execute(
      async () => {
        throw new TypeError("Failed to fetch");
      },
      (err) => {
        repo.guardarPropuesta(mockPropuesta("PROP-FETCH-FAIL", "whatsapp", `Caída de red: ${err.message}`));
        return "fallback_fetch_error_id";
      }
    );

    expect(execution.fromFallback).toBe(true);
    expect(execution.result).toBe("fallback_fetch_error_id");
    expect(execution.fallbackDurationMs!).toBeLessThan(50);

    const p = repo.obtenerPropuesta("PROP-FETCH-FAIL");
    expect(p).not.toBeNull();
    expect(p?.motivo_rechazo).toContain("Failed to fetch");
  });

  it("transiciona a estado OPEN tras alcanzar el umbral de fallas y hace bypass de red inmediato (< 50ms)", async () => {
    const cb = new ZernioCircuitBreaker({ failureThreshold: 2, timeoutMs: 50 });

    // Falla 1
    await cb.execute(
      async () => { throw new Error("Falla 1"); },
      () => "fb1"
    );
    expect(cb.getState()).toBe("CLOSED");

    // Falla 2 -> Abre circuito
    await cb.execute(
      async () => { throw new Error("Falla 2"); },
      () => "fb2"
    );
    expect(cb.getState()).toBe("OPEN");

    // Falla 3 -> Circuito OPEN, bypass inmediato sin tocar la red
    let redIntentada = false;
    const start = performance.now();
    const res = await cb.execute(
      async () => {
        redIntentada = true;
        return "red_ok";
      },
      () => "fb_open"
    );
    const elapsed = performance.now() - start;

    expect(redIntentada).toBe(false); // No tocó la red
    expect(res.fromFallback).toBe(true);
    expect(res.result).toBe("fb_open");
    expect(elapsed).toBeLessThan(50); // Inmediato
  });
});
