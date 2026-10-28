// src/infrastructure/posting/__tests__/postingDaemon.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  buildZernioPayload,
  runPostingCycle,
} from "../postingDaemon";
import { SqliteSMRepository } from "../../sqlite/SqliteSMRepository";
import { PropuestaMejoraSMDTO, CanalDestino, EstadoPropuesta, OpcionBorrador } from "../../../domain/types";

describe("Subfase 1.6: Auto-Posting Local con Zernio y Canal WhatsApp", () => {
  const testDbPath = path.join(process.cwd(), "data", "test_posting_subfase_1_6.db");
  let repo: SqliteSMRepository;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore Windows lock
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
        // ignore Windows lock
      }
    }
  });

  function crearPropuesta(
    id: string,
    canal: CanalDestino | string,
    estado: EstadoPropuesta,
    dia: string,
    opcionBorrador: OpcionBorrador = "A"
  ): PropuestaMejoraSMDTO {
    return {
      propuesta_id: id,
      canal_destino: canal as CanalDestino,
      dia_programado: dia,
      origen_boveda_id: "BOV-001",
      borradores: [
        {
          opcion: "A",
          tipo_formato: "carrusel_pdf",
          estrategia: "jab_educativo",
          titulo_portada: "El orden operativo precede a la rentabilidad",
          cuerpo_texto: "Texto completo del carrusel",
          copy_tres_pasos: {
            paso1_dolor: "Tu equipo no sabe qué prioridad atender primero.",
            paso2_reencuadre: "La causa es la ausencia de protocolos de despacho visuales.",
            paso3_direccion_web: "Auditalo en mejoraok.com",
          },
          cta_texto: "Ver más",
        },
        {
          opcion: "B",
          tipo_formato: "post_autoridad",
          estrategia: "networking_prueba_social",
          titulo_portada: "Mesa Directiva C-Level",
          cuerpo_texto: "Texto autoridad",
          copy_tres_pasos: {
            paso1_dolor: "Fricción directiva",
            paso2_reencuadre: "Gobierno por sistema",
            paso3_direccion_web: "mejoraok.com/after",
          },
          cta_texto: "Ver más",
        },
        {
          opcion: "C",
          tipo_formato: "post_directo",
          estrategia: "right_hook_conversion",
          titulo_portada: "Diagnóstico en 60 minutos",
          cuerpo_texto: "Texto directo",
          copy_tres_pasos: {
            paso1_dolor: "¿Caos operativo?",
            paso2_reencuadre: "Metodología de 4 dimensiones",
            paso3_direccion_web: "mejoraok.com",
          },
          cta_texto: "Diagnosticar",
        },
      ],
      borrador_seleccionado: opcionBorrador,
      tratamiento_visual: {
        marco_expandido_requerido: true,
        color_fondo_marco: "#FFFFFF",
        regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
        relacion_aspecto_destino: "4:5",
      },
      imagen_boveda_vinculada: {
        id: "BOV-IMG-01",
        ruta_archivo_local: "https://example.com/foto_operativa.jpg",
      },
      estado,
    };
  }

  it("construye un payload canónico multicanal adecuado para WhatsApp", () => {
    const propWa = crearPropuesta("PROP-WA-01", "whatsapp", "aprobado", "2026-10-16T10:00:00Z", "A");
    const payload = buildZernioPayload(propWa, { whatsapp: "wa_acc_123" });

    expect(payload.platforms).toEqual([{ platform: "whatsapp", accountId: "wa_acc_123" }]);
    expect(payload.publishNow).toBe(true);
    // WhatsApp debe contener negritas (*texto*)
    expect(payload.content).toContain("*El orden operativo precede a la rentabilidad*");
    expect(payload.content).toContain("*Auditalo en mejoraok.com*");
    expect(payload.mediaItems[0].url).toBe("https://example.com/foto_operativa.jpg");
  });

  it("construye un payload canónico para Instagram con hashtags y formato editorial", () => {
    const propIg = crearPropuesta("PROP-IG-01", "instagram", "aprobado", "2026-10-16T10:00:00Z", "A");
    const payload = buildZernioPayload(propIg, { instagram: "ig_acc_456" });

    expect(payload.platforms).toEqual([{ platform: "instagram", accountId: "ig_acc_456" }]);
    expect(payload.content).toContain("#MejoraContinua");
    expect(payload.content).toContain("Tu equipo no sabe qué prioridad atender primero.");
  });

  it("ejecuta el ciclo de posting procesando únicamente propuestas aprobadas y vencidas", async () => {
    const ahora = new Date("2026-10-16T12:00:00.000Z");
    const pasada = "2026-10-16T10:00:00.000Z";
    const futura = "2026-10-16T18:00:00.000Z";

    // 1. Aprobada y pasada -> DEBE publicarse
    repo.guardarPropuesta(crearPropuesta("P-LISTA-IG", "instagram", "aprobado", pasada));
    // 2. Aprobada pero para WhatsApp y pasada -> DEBE publicarse
    repo.guardarPropuesta(crearPropuesta("P-LISTA-WA", "whatsapp", "aprobado", pasada));
    // 3. Aprobada pero FUTURA -> NO debe publicarse
    repo.guardarPropuesta(crearPropuesta("P-FUTURA", "facebook", "aprobado", futura));
    // 4. Pendiente de revisión pasada -> NO debe publicarse
    repo.guardarPropuesta(crearPropuesta("P-PENDIENTE", "instagram", "pendiente_revision", pasada));

    const res = await runPostingCycle({
      repository: repo,
      now: ahora,
      sandbox: true,
      accountIds: { instagram: "acc_test_ig", whatsapp: "acc_test_wa" },
    });

    expect(res.propuestasProcesadas).toBe(2);
    expect(res.publicadasExitosamente).toBe(2);
    expect(res.fallidas).toBe(0);

    // Verificar en la base SQLite que su estado cambió a "publicado"
    const pLi = repo.obtenerPropuesta("P-LISTA-IG");
    expect(pLi?.estado).toBe("publicado");

    const pWa = repo.obtenerPropuesta("P-LISTA-WA");
    expect(pWa?.estado).toBe("publicado");

    // Las otras dos deben mantener su estado original
    const pFut = repo.obtenerPropuesta("P-FUTURA");
    expect(pFut?.estado).toBe("aprobado");

    const pPend = repo.obtenerPropuesta("P-PENDIENTE");
    expect(pPend?.estado).toBe("pendiente_revision");
  });

  it("RES-01: ante caída de Zernio (fallback local), computa encoladasFallbackLocal y 0 publicadas (cero falsos positivos)", async () => {
    const ahora = new Date("2026-10-16T12:00:00.000Z");
    const pasada = "2026-10-16T10:00:00.000Z";

    repo.guardarPropuesta(crearPropuesta("P-FALLA-ZERNIO", "instagram", "aprobado", pasada));

    // Mock global de fetch que falla con error de red simulando caída de Zernio
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network connection refused to zernio.com"));
    vi.stubGlobal("fetch", mockFetch);

    const res = await runPostingCycle({
      repository: repo,
      now: ahora,
      sandbox: false,
      apiKey: "test_key",
      accountIds: { instagram: "acc_test_ig" },
    });

    expect(res.propuestasProcesadas).toBe(1);
    expect(res.publicadasExitosamente).toBe(0); // CERO falsos positivos
    expect(res.encoladasFallbackLocal).toBe(1); // Computado explícitamente
    expect(res.fallidas).toBe(0);

    // La propuesta debe mantenerse en aprobado con la nota de fallback en SQLite
    const propEnDb = repo.obtenerPropuesta("P-FALLA-ZERNIO");
    expect(propEnDb?.estado).toBe("aprobado");
    expect(propEnDb?.motivo_rechazo).toContain("Fallback local");

    vi.restoreAllMocks();
  });

  it("falla con error explícito (throw) si falta ZERNIO_API_KEY o account IDs reales sin sandbox", async () => {
    const ahora = new Date("2026-10-16T12:00:00.000Z");
    repo.guardarPropuesta(crearPropuesta("P-SIN-KEY", "instagram", "aprobado", ahora.toISOString()));

    await expect(
      runPostingCycle({
        repository: repo,
        now: ahora,
        sandbox: false,
        apiKey: undefined,
      })
    ).rejects.toThrow(/Falta ZERNIO_API_KEY/);

    await expect(
      runPostingCycle({
        repository: repo,
        now: ahora,
        sandbox: false,
        apiKey: "valid_key",
        accountIds: {},
      })
    ).rejects.toThrow(/Falta ID de cuenta real/);
  });
});
