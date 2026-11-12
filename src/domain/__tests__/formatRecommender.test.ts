// src/domain/__tests__/formatRecommender.test.ts
import { describe, it, expect } from "vitest";
import {
  recommendFormat,
  mapFormatToTipoFormatoBorrador,
  getFormatDimensions,
  FormatRecommenderInput,
} from "../formatRecommender";
import { EvaluacionSteppsDTO } from "../types";

describe("Motor Recomendador Inteligente de Formato (Sprint S+7)", () => {
  it("recomienda CARRUSEL PDF para contenido con alto valor práctico y pasos estructurados", () => {
    const input: FormatRecommenderInput = {
      topic: "Protocolo de delegación efectiva para mandos medios",
      hook: "Cómo delegar sin que todo vuelva a tu escritorio",
      body: "La mayoría de los dueños no delegan: desparraman tareas. Para lograr autonomía real necesitás un proceso claro en 3 pasos:\n\nPaso 1: Mapeá las decisiones recurrentes de tu área operativa.\nPaso 2: Acordá rangos de presupuesto y márgenes de error tolerables con tus supervisores.\nPaso 3: Establecé un tablero semanal de control por excepción en lugar de microgestión.",
      copy_tres_pasos: {
        paso1_dolor: "Tus mandos medios te consultan hasta para autorizar un remito menor.",
        paso2_reencuadre: "La causa no es su compromiso: es que no tienen una matriz de decisión explícita.",
        paso3_direccion_web: "Descargá el checklist directivo en mejoraok.com",
      },
      targetChannel: "linkedin",
    };

    const rec = recommendFormat(input);

    expect(rec.primaryFormat).toBe("carrusel");
    expect(rec.canonicalTipoFormato).toBe("carrusel_pdf");
    expect(rec.recommendedDimensions.ratio).toBe("4:5");
    expect(rec.recommendedDimensions.width).toBe(1080);
    expect(rec.recommendedDimensions.height).toBe(1350);
    expect(rec.breakdown.carrusel.score).toBeGreaterThan(rec.breakdown.reel.score);
    expect(rec.breakdown.carrusel.score).toBeGreaterThan(rec.breakdown.cita_placa.score);
    expect(rec.confidenceScore).toBeGreaterThanOrEqual(70);
    expect(rec.predictedCTR).toBeGreaterThan(3.5);
    expect(rec.actionableSuggestions.length).toBeGreaterThanOrEqual(2);
  });

  it("recomienda REEL VERTICAL para ganchos con alta carga emocional y disparadores de trinchera", () => {
    const steppsReel: EvaluacionSteppsDTO = {
      moneda_social: 6.5,
      disparadores: 9.2,
      emocion_desculpabilizadora: 9.5,
      publico_visual: 6.0,
      valor_practico: 6.0,
      historias_troya: 8.5,
      score_global: 7.6,
      aprobado_stepps: true,
      feedback_editorial: "Excelente conexión empática con la soledad del dueño.",
    };

    const input: FormatRecommenderInput = {
      topic: "La soledad del dueño un viernes a la tarde",
      hook: "Son las 7 de la tarde y tu teléfono sigue sonando para apagar incendios",
      body: "Estás exhausto en tu escritorio mientras el resto del equipo ya se fue. Sentís culpa por no estar con tu familia y frustración porque la operación sigue dependiendo de que vos pongas parches cotidianos.",
      stepps: steppsReel,
      targetChannel: "instagram",
    };

    const rec = recommendFormat(input);

    expect(rec.primaryFormat).toBe("reel");
    expect(rec.recommendedDimensions.ratio).toBe("9:16");
    expect(rec.recommendedDimensions.width).toBe(1080);
    expect(rec.recommendedDimensions.height).toBe(1920);
    expect(rec.breakdown.reel.score).toBeGreaterThan(rec.breakdown.carrusel.score);
    expect(rec.breakdown.reel.score).toBeGreaterThan(rec.breakdown.post.score);
    expect(rec.rationale).toContain("emocional desculpabilizadora");
    expect(rec.actionableSuggestions.some((s) => s.includes("3 segundos"))).toBe(true);
  });

  it("recomienda PLACA DE CITAS para aforismos C-Level breves y pensadores clásicos de gestión", () => {
    const input: FormatRecommenderInput = {
      topic: "El axioma de Deming sobre calidad y sistemas",
      hook: "El 94% de los problemas provienen del sistema, no de las personas",
      body: '"El 94% de los problemas en cualquier empresa provienen del sistema y sus procesos, no de las personas." — W. Edwards Deming',
      targetChannel: "multicanal",
    };

    const rec = recommendFormat(input);

    expect(rec.primaryFormat).toBe("cita_placa");
    expect(rec.canonicalTipoFormato).toBe("post_autoridad");
    expect(rec.recommendedDimensions.ratio).toBe("1:1");
    expect(rec.recommendedDimensions.width).toBe(1080);
    expect(rec.breakdown.cita_placa.score).toBeGreaterThan(rec.breakdown.carrusel.score);
    expect(rec.shareabilityScore).toBeGreaterThanOrEqual(7.0);
    expect(rec.rationale).toContain("moneda social");
  });

  it("evalúa y asigna scores STEPPS automáticamente si no fueron provistos", () => {
    const input: FormatRecommenderInput = {
      topic: "Reuniones improductivas",
      hook: "Peter Drucker: No hay nada tan inútil como hacer con gran eficiencia algo que no debería hacerse",
      body: "Revisá la agenda directiva de tu pyme.",
    };

    const rec = recommendFormat(input);
    expect(rec.breakdown.cita_placa.score).toBeGreaterThan(0);
    expect(rec.breakdown.carrusel.score).toBeGreaterThan(0);
    expect(rec.breakdown.reel.score).toBeGreaterThan(0);
    expect(rec.confidenceScore).toBeGreaterThan(50);
  });

  it("mapea los formatos recomendados a los tipos canónicos de borrador de MejoraSM", () => {
    expect(mapFormatToTipoFormatoBorrador("carrusel")).toBe("carrusel_pdf");
    expect(mapFormatToTipoFormatoBorrador("cita_placa")).toBe("post_autoridad");
    expect(mapFormatToTipoFormatoBorrador("reel")).toBe("post_directo");
    expect(mapFormatToTipoFormatoBorrador("post")).toBe("post_directo");
  });

  it("devuelve dimensiones canónicas correctas para cada formato", () => {
    const carruselDim = getFormatDimensions("carrusel");
    expect(carruselDim.width).toBe(1080);
    expect(carruselDim.height).toBe(1350);
    expect(carruselDim.ratio).toBe("4:5");

    const reelDim = getFormatDimensions("reel");
    expect(reelDim.width).toBe(1080);
    expect(reelDim.height).toBe(1920);
    expect(reelDim.ratio).toBe("9:16");

    const citaDim = getFormatDimensions("cita_placa");
    expect(citaDim.width).toBe(1080);
    expect(citaDim.height).toBe(1080);
    expect(citaDim.ratio).toBe("1:1");

    const postDim = getFormatDimensions("post");
    expect(postDim.width).toBe(1080);
    expect(postDim.height).toBe(1080);
    expect(postDim.ratio).toBe("1:1");
  });

  it("gestiona entradas mínimas y cadenas vacías de forma segura sin excepciones", () => {
    const input: FormatRecommenderInput = {};
    const rec = recommendFormat(input);

    expect(rec.primaryFormat).toBeDefined();
    expect(rec.confidenceScore).toBeGreaterThanOrEqual(60);
    expect(rec.recommendedDimensions).toBeDefined();
    expect(rec.breakdown).toBeDefined();
    expect(rec.actionableSuggestions.length).toBeGreaterThan(0);
  });
});
