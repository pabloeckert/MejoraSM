// src/domain/__tests__/copyExperimentSimulator.test.ts
// Tests unitarios y de integración para el Simulador A/B de Copy y Hooks (Jonah Berger STEPPS)
import { describe, it, expect, vi } from "vitest";
import {
  simulateCopyExperiment,
  generateSlidesFromContent,
  recordCopyExperiment,
} from "../copyExperimentSimulator";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe("copyExperimentSimulator (Dominio Puro y Métricas Predictivas)", () => {
  it("genera un par de variantes contrastantes (Provocador vs Empático) con las 5 láminas estructuradas", () => {
    const res = simulateCopyExperiment({
      topic: "Desconexión entre ventas y entregas en pymes",
      hook: "El problema no es vender más, sino entregar con margen",
      body: "Cuando ventas promete plazos irreales, la fábrica colapsa.\n\nEl costo se diluye en horas extras.\n\nHay que construir un protocolo interáreas.",
    });

    expect(res.variants.A).toBeDefined();
    expect(res.variants.B).toBeDefined();

    // Variante A: Provocador / Quiebre
    expect(res.variants.A.type).toBe("provocador");
    expect(res.variants.A.badge).toBe("Quiebre de Creencias");
    expect(res.variants.A.targetPersona).toContain("Escéptico");
    expect(res.variants.A.slides).toHaveLength(5);
    expect(res.variants.A.slides[0]).toBe(res.variants.A.hook);

    // Variante B: Empático / Trinchera
    expect(res.variants.B.type).toBe("empatico_operativo");
    expect(res.variants.B.badge).toBe("Calidez con Verdad");
    expect(res.variants.B.targetPersona).toContain("Saturado");
    expect(res.variants.B.slides).toHaveLength(5);
    expect(res.variants.B.slides[0]).toBe(res.variants.B.hook);
  });

  it("calcula scores de Jonah Berger (STEPPS) completos y aprobados (>= 7.0) para ambas variantes", () => {
    const res = simulateCopyExperiment({
      topic: "Falta de tableros de control",
    });

    const steppsA = res.variants.A.stepps;
    const steppsB = res.variants.B.stepps;

    // Verificar las 6 dimensiones de Berger en Variante A
    expect(steppsA.moneda_social).toBeGreaterThanOrEqual(5);
    expect(steppsA.disparadores).toBeGreaterThanOrEqual(5);
    expect(steppsA.emocion_desculpabilizadora).toBeGreaterThanOrEqual(5);
    expect(steppsA.publico_visual).toBeGreaterThanOrEqual(5);
    expect(steppsA.valor_practico).toBeGreaterThanOrEqual(5);
    expect(steppsA.historias_troya).toBeGreaterThanOrEqual(5);
    expect(steppsA.score_global).toBeGreaterThanOrEqual(7.0);
    expect(steppsA.aprobado_stepps).toBe(true);

    // Verificar las 6 dimensiones de Berger en Variante B
    expect(steppsB.moneda_social).toBeGreaterThanOrEqual(5);
    expect(steppsB.disparadores).toBeGreaterThanOrEqual(5);
    expect(steppsB.emocion_desculpabilizadora).toBeGreaterThanOrEqual(5);
    expect(steppsB.publico_visual).toBeGreaterThanOrEqual(5);
    expect(steppsB.valor_practico).toBeGreaterThanOrEqual(5);
    expect(steppsB.historias_troya).toBeGreaterThanOrEqual(5);
    expect(steppsB.score_global).toBeGreaterThanOrEqual(7.0);
    expect(steppsB.aprobado_stepps).toBe(true);
  });

  it("calcula métricas predictivas plausibles (Scroll-Stop, Retención, Shareability y Tiempo de Lectura)", () => {
    const res = simulateCopyExperiment({
      topic: "Mando unificado y orden directivo",
    });

    for (const v of [res.variants.A, res.variants.B]) {
      expect(v.metrics.predictedScrollStopRate).toBeGreaterThanOrEqual(50);
      expect(v.metrics.predictedScrollStopRate).toBeLessThanOrEqual(95);

      expect(v.metrics.predictedCompletionRate).toBeGreaterThanOrEqual(45);
      expect(v.metrics.predictedCompletionRate).toBeLessThanOrEqual(95);

      expect(v.metrics.shareabilityScore).toBeGreaterThanOrEqual(4);
      expect(v.metrics.shareabilityScore).toBeLessThanOrEqual(10);

      expect(v.metrics.readingTimeSeconds).toBeGreaterThanOrEqual(15);
      expect(v.metrics.wordCount).toBeGreaterThan(20);
    }
  });

  it("ofrece un análisis diferencial con recomendación justificada", () => {
    const res = simulateCopyExperiment({
      topic: "Procesos y rentabilidad",
    });

    expect(["A", "B"]).toContain(res.recommendedVariant);
    expect(["A", "B"]).toContain(res.differentialAnalysis.strongerInVirality);
    expect(["A", "B"]).toContain(res.differentialAnalysis.strongerInPracticalValue);
    expect(res.differentialAnalysis.retentionAdvantagePercent).toBeGreaterThanOrEqual(0);
    expect(res.differentialAnalysis.summary).toContain("Variante");
  });

  it("generateSlidesFromContent estructura correctamente 5 láminas en ambos estilos", () => {
    const slidesProvocador = generateSlidesFromContent(
      "Hook A",
      "Párrafo 1.\n\nPárrafo 2.\n\nPárrafo 3.",
      "CTA A",
      "provocador"
    );
    expect(slidesProvocador).toHaveLength(5);
    expect(slidesProvocador[0]).toBe("Hook A");
    expect(slidesProvocador[4]).toBe("CTA A");

    const slidesEmpatico = generateSlidesFromContent(
      "Hook B",
      "", // cuerpo vacío debe usar fallbacks estructurados
      "CTA B",
      "empatico_operativo"
    );
    expect(slidesEmpatico).toHaveLength(5);
    expect(slidesEmpatico[0]).toBe("Hook B");
    expect(slidesEmpatico[3]).toContain("Pasos en Trinchera");
    expect(slidesEmpatico[4]).toBe("CTA B");
  });

  it("recordCopyExperiment registra exitosamente en content_experiments sin arrojar errores", async () => {
    const result = await recordCopyExperiment({
      proposalId: "prop-test-uuid-456",
      variant: "empatico_operativo",
      hypothesis: "La empatía operativa desculpabilizadora reduce el costo por lead.",
    });

    expect(result.ok).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("content_experiments");
  });

  it("recordCopyExperiment rechaza llamadas sin proposalId", async () => {
    const result = await recordCopyExperiment({
      proposalId: "",
      variant: "provocador",
      hypothesis: "test",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("proposalId es mandatorio");
  });
});
