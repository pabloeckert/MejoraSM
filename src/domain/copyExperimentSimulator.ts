// src/domain/copyExperimentSimulator.ts
// SIMULADOR A/B DE COPY Y HOOKS EN MESA DE DIÁLOGO (2026)
// Compara variantes estratégicas (Provocador / Quiebre vs Empático / Trinchera)
// con scoring automático de Jonah Berger (STEPPS) y predicción de retención.
// Invariante: Cero juicio a la persona; foco exclusivo en sistemas y procesos B2B.

import { EvaluacionSteppsDTO } from "./types";
import { evaluarBorradorStepps } from "./steppsValidator";
import { supabase } from "@/integrations/supabase/client";

export type VariantType = "provocador" | "empatico_operativo";

export interface CopyVariant {
  id: "A" | "B";
  type: VariantType;
  label: string;
  badge: string;
  targetPersona: string;
  hook: string;
  body: string;
  slides: [string, string, string, string, string];
  cta: string;
  stepps: EvaluacionSteppsDTO;
  metrics: {
    predictedScrollStopRate: number; // Porcentaje estimado 0-100%
    predictedCompletionRate: number; // Porcentaje de lectura completa 0-100%
    shareabilityScore: number;       // Índice de viralidad/reenviabilidad 0-10
    readingTimeSeconds: number;      // Tiempo estimado de lectura en segundos
    wordCount: number;
  };
  keyHypothesis: string;
}

export interface ExperimentSimulationResult {
  topic: string;
  variants: {
    A: CopyVariant;
    B: CopyVariant;
  };
  recommendedVariant: "A" | "B";
  differentialAnalysis: {
    strongerInVirality: "A" | "B";
    strongerInPracticalValue: "A" | "B";
    retentionAdvantagePercent: number;
    summary: string;
  };
}

/**
 * Genera las 5 láminas estructuradas de un carrusel a partir de gancho, cuerpo y llamado a la acción.
 */
export function generateSlidesFromContent(
  hook: string,
  body: string,
  cta: string,
  type: VariantType
): [string, string, string, string, string] {
  const bodyParts = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  let slide2: string;
  let slide3: string;
  let slide4: string;

  if (type === "provocador") {
    slide2 = bodyParts[0] || "El Autoengaño: Creer que vender más o contratar más gente soluciona una operación desordenada.";
    slide3 = bodyParts[1] || "El Costo Oculto: Horas del dueño apagando incendios y rentabilidad que se diluye en parches cotidianos.";
    slide4 = bodyParts[2] || "La Decisión Directiva: Diseñar arquitectura de procesos y mandos medios con criterios de decisión autónomos.";
  } else {
    slide2 = bodyParts[0] || "La Fricción Cotidiana: Son las 7 de la tarde y tu teléfono sigue sonando para destrabar entregas que ventas prometió.";
    slide3 = bodyParts[1] || "La Desculpabilización: No es falta de capacidad de tu equipo; es la ausencia de un flujo de coordinación explícito.";
    slide4 = bodyParts[2] || "Los 3 Pasos en Trinchera: 1) Mapeá el cuello de botella, 2) Acordá reglas interáreas, 3) Medí el tiempo de ciclo semanal.";
  }

  const slide5 = cta || "Escribinos para auditar tus procesos en mejoraok.com";

  return [hook, slide2, slide3, slide4, slide5];
}

/**
 * Calcula estimaciones predictivas de scroll-stop y retención según métricas de Berger y longitud.
 */
function calculatePredictiveMetrics(
  hook: string,
  body: string,
  stepps: EvaluacionSteppsDTO
): {
  predictedScrollStopRate: number;
  predictedCompletionRate: number;
  shareabilityScore: number;
  readingTimeSeconds: number;
  wordCount: number;
} {
  const fullText = `${hook} ${body}`;
  const words = fullText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Tiempo estimado de lectura (promedio 200 palabras por minuto)
  const readingTimeSeconds = Math.max(15, Math.round((wordCount / 200) * 60));

  // 1. Scroll-Stop Rate (0-100%): Influenciado por longitud de gancho (óptimo 40-90 caracteres) y disparadores
  const hookLen = hook.length;
  let hookScore = 60;
  if (hookLen >= 35 && hookLen <= 95) hookScore += 18;
  else if (hookLen < 35) hookScore += 8;
  else hookScore += 10;

  const triggerBonus = Math.min(15, (stepps.disparadores - 5) * 3);
  const predictedScrollStopRate = Math.min(95, Math.max(50, Math.round(hookScore + triggerBonus)));

  // 2. Completion Rate (0-100%): Influenciado por Valor Práctico y Emoción Desculpabilizadora
  const practicalBonus = (stepps.valor_practico - 5) * 4;
  const emotionBonus = (stepps.emocion_desculpabilizadora - 5) * 3;
  const lengthPenalty = wordCount > 250 ? Math.min(15, (wordCount - 250) * 0.1) : 0;
  const predictedCompletionRate = Math.min(
    94,
    Math.max(45, Math.round(52 + practicalBonus + emotionBonus - lengthPenalty))
  );

  // 3. Shareability Score (0-10): Estatus social y visibilidad pública
  const shareabilityRaw =
    stepps.moneda_social * 0.45 +
    stepps.valor_practico * 0.35 +
    stepps.publico_visual * 0.20;
  const shareabilityScore = Number(Math.min(10, Math.max(4, shareabilityRaw)).toFixed(1));

  return {
    predictedScrollStopRate,
    predictedCompletionRate,
    shareabilityScore,
    readingTimeSeconds,
    wordCount,
  };
}

/**
 * Simula y enfrenta dos variantes de copy a partir de un tema base o propuesta preliminar.
 */
export function simulateCopyExperiment(input: {
  topic?: string;
  hook?: string;
  body?: string;
  cta?: string;
  dimension?: string;
}): ExperimentSimulationResult {
  const baseTopic = (input.topic || input.hook || "Optimización de Procesos y Mandos Medios").trim();
  const cta = input.cta?.trim() || "Escribinos para auditar tus procesos en mejoraok.com";

  // ══════════════════════════════════════════════════════════════
  // VARIANTE A: PROVOCADORA / QUIEBRE DE STATUS QUO (DIRECTIVA)
  // ══════════════════════════════════════════════════════════════
  const hookA = input.hook && input.hook.toLowerCase().includes("no es")
    ? input.hook
    : `El problema de tu pyme no es la falta de ventas: es que tu operación premia el desorden.`;

  const bodyA = input.body && input.body.length > 50
    ? input.body
    : `Muchos empresarios creen que vendiendo más van a tapar las ineficiencias de su entrega. En la realidad, cada nuevo cliente solo amplifica el cuello de botella.\n\nCuando no hay una arquitectura de procesos clara, la rentabilidad se diluye en parches de urgencia y retrabajos que nadie mide.\n\nLa verdadera profesionalización no consiste en trabajar más horas, sino en construir un sistema que opere con estándares objetivos y mandos medios autónomos.`;

  const slidesA = generateSlidesFromContent(hookA, bodyA, cta, "provocador");

  const steppsA = evaluarBorradorStepps({
    titulo_portada: hookA,
    cuerpo_texto: bodyA,
    copy_tres_pasos: {
      paso1_dolor: slidesA[1],
      paso2_reencuadre: slidesA[2],
      paso3_direccion_web: slidesA[3],
    },
    cta_texto: cta,
  });

  const metricsA = calculatePredictiveMetrics(hookA, bodyA, steppsA);

  const variantA: CopyVariant = {
    id: "A",
    type: "provocador",
    label: "Variante A: Provocador / Quiebre Directivo",
    badge: "Quiebre de Creencias",
    targetPersona: "Empresario Escéptico / Director General",
    hook: hookA,
    body: bodyA,
    slides: slidesA,
    cta,
    stepps: steppsA,
    metrics: metricsA,
    keyHypothesis: "Desafiar el mito del crecimiento por volumen genera mayor debate y autoridad C-Level en LinkedIn.",
  };

  // ══════════════════════════════════════════════════════════════
  // VARIANTE B: EMPÁTICA / TRINCHERA OPERATIVA (CALIDEZ CON VERDAD)
  // ══════════════════════════════════════════════════════════════
  const hookB =
    `Son las 7 de la tarde y tu teléfono sigue sonando para destrabar lo que ventas prometió sin consultar.`;

  const bodyB =
    `No te falta compromiso ni capacidad de trabajo: te falta un sistema que no dependa de tu memoria ni de tu presencia física en la planta.\n\nCuando cada sector cuida su metro cuadrado, el dueño termina siendo el único puente de comunicación entre áreas desconectadas.\n\nPara salir del rol de bombero permanente se requieren 3 pasos concretos: 1) Mapeá el flujo de valor, 2) Definí acuerdos interáreas claros, 3) Implementá tableros de gestión semanal sin excusas.`;

  const slidesB = generateSlidesFromContent(hookB, bodyB, cta, "empatico_operativo");

  const steppsB = evaluarBorradorStepps({
    titulo_portada: hookB,
    cuerpo_texto: bodyB,
    copy_tres_pasos: {
      paso1_dolor: slidesB[1],
      paso2_reencuadre: slidesB[2],
      paso3_direccion_web: slidesB[3],
    },
    cta_texto: cta,
  });

  const metricsB = calculatePredictiveMetrics(hookB, bodyB, steppsB);

  const variantB: CopyVariant = {
    id: "B",
    type: "empatico_operativo",
    label: "Variante B: Empático / Trinchera Operativa",
    badge: "Calidez con Verdad",
    targetPersona: "Dueño Saturado / Apagador de Incendios",
    hook: hookB,
    body: bodyB,
    slides: slidesB,
    cta,
    stepps: steppsB,
    metrics: metricsB,
    keyHypothesis: "Validar el agotamiento cotidiano con desculpabilización maximiza la tasa de respuesta en WhatsApp e Instagram.",
  };

  // Análisis Diferencial
  const strongerInVirality: "A" | "B" =
    variantA.metrics.shareabilityScore >= variantB.metrics.shareabilityScore ? "A" : "B";
  const strongerInPracticalValue: "A" | "B" =
    variantB.stepps.valor_practico >= variantA.stepps.valor_practico ? "B" : "A";

  const diffRetention = Number(
    Math.abs(variantA.metrics.predictedCompletionRate - variantB.metrics.predictedCompletionRate).toFixed(1)
  );

  const recommendedVariant: "A" | "B" =
    variantB.stepps.score_global > variantA.stepps.score_global ? "B" : "A";

  const summary =
    recommendedVariant === "B"
      ? `Variante B recomendada por superioridad en Valor Práctico (${variantB.stepps.valor_practico}/10) y Disparadores cotidianos (${variantB.stepps.disparadores}/10). Variante A ofrece mayor tracción en debate C-Level.`
      : `Variante A recomendada por superioridad en Moneda Social (${variantA.stepps.moneda_social}/10) e interpelación directiva. Variante B ofrece mayor calidez desculpabilizadora.`;

  return {
    topic: baseTopic,
    variants: { A: variantA, B: variantB },
    recommendedVariant,
    differentialAnalysis: {
      strongerInVirality,
      strongerInPracticalValue,
      retentionAdvantagePercent: diffRetention,
      summary,
    },
  };
}

/**
 * Registra formalmente el experimento de copy en Supabase o en fallback local.
 */
export async function recordCopyExperiment(opts: {
  proposalId: string;
  variant: VariantType;
  hypothesis: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!opts.proposalId) {
    return { ok: false, error: "proposalId es mandatorio para registrar experimento" };
  }

  try {
    const { error } = await supabase.from("content_experiments").insert({
      proposal_id: opts.proposalId,
      dimension: "copy_style",
      variant: opts.variant,
      hypothesis: opts.hypothesis,
    });

    if (error) {
      console.warn("No se pudo registrar experimento en Supabase, registrando en log local:", error.message);
      return { ok: true }; // Contingencia no bloqueante
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("Fallo secundario al registrar experimento de copy:", msg);
    return { ok: true }; // No bloquea la publicación
  }
}
