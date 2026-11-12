// src/domain/formatRecommender.ts
// MOTOR RECOMENDADOR INTELIGENTE DE FORMATO (SPRINT S+7 - 2026)
// Evalúa el contenido y los scores Jonah Berger (STEPPS) para recomendar
// el formato óptimo de publicación:
// 1. Carrusel PDF (1080x1350, 4:5): Alto valor práctico, desgloses estructurados, LinkedIn/Instagram.
// 2. Reel / Video Vertical (1080x1920, 9:16): Alta emoción desculpabilizadora y disparadores cotidianos.
// 3. Placa de Citas / Autoridad (1080x1080 / 1080x1920): Alta moneda social, aforismos C-Level, citas de gestión.
// 4. Post Estándar (1080x1080 / 1200x627): Post base equilibrado para casos o novedades operativas.
// Invariante: Cero juicio a la persona, foco en sistemas, procesos y verdad sin rodeos.

import { EvaluacionSteppsDTO, TipoFormatoBorrador } from "./types";
import { evaluarBorradorStepps } from "./steppsValidator";

export type SupportedFormat = "carrusel" | "reel" | "cita_placa" | "post";
export type TargetChannel = "linkedin" | "instagram" | "facebook" | "multicanal";

export interface FormatRecommenderInput {
  topic?: string;
  hook?: string;
  body?: string;
  cta?: string;
  copy_tres_pasos?: {
    paso1_dolor: string;
    paso2_reencuadre: string;
    paso3_direccion_web: string;
  };
  stepps?: EvaluacionSteppsDTO;
  targetChannel?: TargetChannel;
  arquetipo?: string;
}

export interface FormatDimensions {
  width: number;
  height: number;
  ratio: string;
  description: string;
}

export interface FormatScoreBreakdown {
  format: SupportedFormat;
  label: string;
  score: number; // 0 - 100
  dimensions: FormatDimensions;
  predictedCTR: number; // Porcentaje estimado (e.g. 4.5)
  predictedRetention: number; // Porcentaje de lectura/consumo (e.g. 78)
  shareability: number; // Índice 0-10
  primaryChannel: TargetChannel;
  pros: string[];
}

export interface FormatRecommendation {
  primaryFormat: SupportedFormat;
  primaryChannel: TargetChannel;
  canonicalTipoFormato: TipoFormatoBorrador;
  confidenceScore: number; // 0 - 100%
  predictedCTR: number;
  predictedRetention: number;
  shareabilityScore: number;
  rationale: string;
  recommendedDimensions: FormatDimensions;
  breakdown: {
    carrusel: FormatScoreBreakdown;
    reel: FormatScoreBreakdown;
    cita_placa: FormatScoreBreakdown;
    post: FormatScoreBreakdown;
  };
  actionableSuggestions: string[];
}

// Catálogo canónico de pensadores de gestión y calidad para placas de citas
const PENSADORES_AUTORIDAD = [
  "drucker",
  "deming",
  "goldratt",
  "grove",
  "porter",
  "mintzberg",
  "ishikawa",
  "ohno",
  "taylor",
  "fayol",
];

// Disparadores situacionales de alta fricción para guiones de Reel
const DISPARADORES_REEL = [
  "7 de la tarde",
  "19:00",
  "whatsapp",
  "audio",
  "incendio",
  "urgencia",
  "teléfono",
  "suena",
  "viernes",
  "lunes",
  "parche",
  "fricción",
  "rehén",
  "exhausto",
  "cansado",
  "apagar incendios",
];

// Marcadores de estructuración práctica para carruseles
const MARCADORES_ESTRUCTURA = [
  "paso 1",
  "paso 2",
  "paso 3",
  "1.",
  "2.",
  "3.",
  "1)",
  "2)",
  "3)",
  "primero",
  "segundo",
  "tercero",
  "protocolo",
  "metodología",
  "matriz",
  "checklist",
  "guía",
  "procedimiento",
];

/**
 * Mapea el formato recomendado al tipo canónico de borrador en MejoraSM
 */
export function mapFormatToTipoFormatoBorrador(format: SupportedFormat): TipoFormatoBorrador {
  switch (format) {
    case "carrusel":
      return "carrusel_pdf";
    case "cita_placa":
      return "post_autoridad";
    case "reel":
    case "post":
    default:
      return "post_directo";
  }
}

/**
 * Dimensiones canónicas por formato conforme a estándares 2026
 */
export function getFormatDimensions(format: SupportedFormat): FormatDimensions {
  switch (format) {
    case "carrusel":
      return {
        width: 1080,
        height: 1350,
        ratio: "4:5",
        description: "Láminas verticales optimizadas para LinkedIn Document Post y carrusel de Instagram.",
      };
    case "reel":
      return {
        width: 1080,
        height: 1920,
        ratio: "9:16",
        description: "Video vertical full-screen para Instagram Reels, Meta Shorts y TikTok.",
      };
    case "cita_placa":
      return {
        width: 1080,
        height: 1080,
        ratio: "1:1",
        description: "Placa cuadrada institucional con tipografía de alto contraste para feed y stories.",
      };
    case "post":
    default:
      return {
        width: 1080,
        height: 1080,
        ratio: "1:1",
        description: "Imagen única con encuadre blanco y copy de 3 pasos en el cuerpo.",
      };
  }
}

/**
 * Evalúa heurísticas de texto y scores STEPPS para recomendar el formato óptimo.
 */
export function recommendFormat(input: FormatRecommenderInput): FormatRecommendation {
  const fullText = [
    input.topic || "",
    input.hook || "",
    input.body || "",
    input.cta || "",
    input.copy_tres_pasos?.paso1_dolor || "",
    input.copy_tres_pasos?.paso2_reencuadre || "",
    input.copy_tres_pasos?.paso3_direccion_web || "",
  ]
    .join(" ")
    .toLowerCase();

  // 1. Obtener o calcular scores STEPPS
  const stepps: EvaluacionSteppsDTO =
    input.stepps ||
    evaluarBorradorStepps({
      titulo_portada: input.hook || input.topic || "Estrategia de procesos",
      cuerpo_texto: input.body || "",
      copy_tres_pasos: input.copy_tres_pasos || {
        paso1_dolor: "",
        paso2_reencuadre: "",
        paso3_direccion_web: "",
      },
      cta_texto: input.cta || "",
    });

  const words = fullText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = fullText.length;

  // Detección de patrones en el contenido
  const hasAuthorOrQuote =
    PENSADORES_AUTORIDAD.some((autor) => fullText.includes(autor)) ||
    fullText.includes('"') ||
    fullText.includes("“") ||
    fullText.includes("«");

  let structureScore = 0;
  for (const marker of MARCADORES_ESTRUCTURA) {
    if (fullText.includes(marker)) structureScore += 1;
  }
  const hasStructuredSteps =
    structureScore >= 2 ||
    (Boolean(input.copy_tres_pasos?.paso1_dolor) &&
      Boolean(input.copy_tres_pasos?.paso2_reencuadre) &&
      Boolean(input.copy_tres_pasos?.paso3_direccion_web));

  let triggerHits = 0;
  for (const trig of DISPARADORES_REEL) {
    if (fullText.includes(trig)) triggerHits += 1;
  }
  const hasVisceralTrigger = triggerHits >= 1;

  // -------------------------------------------------------------
  // PUNTUACIÓN DE FORMATOS (0 a 100)
  // -------------------------------------------------------------

  // A. CARRUSEL PDF
  // Estimulado por alto valor práctico, estructura en pasos, longitud media/alta
  let carruselRaw = stepps.valor_practico * 7.5; // hasta 75 pts
  if (hasStructuredSteps) carruselRaw += 15;
  if (wordCount >= 45 && wordCount <= 300) carruselRaw += 10;
  if (input.targetChannel === "linkedin") carruselRaw += 12;
  if (stepps.publico_visual >= 7.5) carruselRaw += 8;
  if (charCount < 140 && hasAuthorOrQuote) carruselRaw -= 25; // Si es una cita breve, no conviene carrusel
  const carruselScore = Math.min(99, Math.max(15, Math.round(carruselRaw)));

  // B. REEL / VIDEO VERTICAL
  // Estimulado por emoción desculpabilizadora, disparadores situacionales y tensión de trinchera
  let reelRaw = stepps.emocion_desculpabilizadora * 5.0 + stepps.disparadores * 4.2; // hasta ~92 pts
  if (hasVisceralTrigger) reelRaw += 16;
  if (stepps.historias_troya >= 7.5) reelRaw += 8;
  if (input.targetChannel === "instagram" || input.targetChannel === "facebook") reelRaw += 10;
  if (hasStructuredSteps && wordCount > 150) reelRaw -= 12; // Muy técnico y largo diluye la retención del Reel
  const reelScore = Math.min(99, Math.max(15, Math.round(reelRaw)));

  // C. PLACA DE CITA / AUTORIDAD
  // Estimulado por moneda social alta, longitud concisa y citas directivas
  let citaRaw = stepps.moneda_social * 7.5; // hasta 75 pts
  if (hasAuthorOrQuote) citaRaw += 22;
  if (charCount > 0 && charCount <= 220) citaRaw += 18;
  else if (wordCount > 110) citaRaw -= 20; // Demasiado largo para una placa de cita
  if (stepps.valor_practico > 8.5 && hasStructuredSteps) citaRaw -= 15; // Prefiere carrusel
  const citaScore = Math.min(99, Math.max(15, Math.round(citaRaw)));

  // D. POST ESTÁNDAR / IMAGEN ÚNICA
  // Base equilibrada, ideal para avisos directos o casos sin polarización extrema
  let postRaw = 55 + (stepps.score_global - 7.0) * 4;
  if (wordCount >= 30 && wordCount <= 120) postRaw += 8;
  if (input.targetChannel === "multicanal") postRaw += 6;
  const postScore = Math.min(90, Math.max(20, Math.round(postRaw)));

  // Desgloses y métricas predictivas calibradas
  const carruselBreakdown: FormatScoreBreakdown = {
    format: "carrusel",
    label: "Carrusel PDF B2B (1080x1350)",
    score: carruselScore,
    dimensions: getFormatDimensions("carrusel"),
    predictedCTR: Number((3.6 + (carruselScore / 100) * 2.2).toFixed(1)), // 3.6% - 5.8%
    predictedRetention: Math.min(92, Math.round(62 + carruselScore * 0.28)), // 62% - 90%
    shareability: Number((6.0 + (stepps.valor_practico / 10) * 3.5).toFixed(1)),
    primaryChannel: input.targetChannel === "instagram" ? "instagram" : "linkedin",
    pros: [
      "Mayor tiempo de permanencia en LinkedIn Document Posts.",
      "Excelente tasa de guardados (bookmarking) por valor metodológico.",
      "Facilita la lectura pausada de planes de 3 pasos.",
    ],
  };

  const reelBreakdown: FormatScoreBreakdown = {
    format: "reel",
    label: "Reel / Video Vertical (1080x1920)",
    score: reelScore,
    dimensions: getFormatDimensions("reel"),
    predictedCTR: Number((2.8 + (reelScore / 100) * 2.6).toFixed(1)), // 2.8% - 5.4%
    predictedRetention: Math.min(88, Math.round(50 + reelScore * 0.35)), // 50% - 85%
    shareability: Number((6.2 + (stepps.emocion_desculpabilizadora / 10) * 3.3).toFixed(1)),
    primaryChannel: "instagram",
    pros: [
      "Máximo alcance algorítmico orgánico inicial en Meta.",
      "Genera empatía inmediata con la voz desculpabilizadora.",
      "Ideal para arrancar con el sonido o fricción de las 19:00.",
    ],
  };

  const citaBreakdown: FormatScoreBreakdown = {
    format: "cita_placa",
    label: "Placa de Cita / Autoridad (1080x1080)",
    score: citaScore,
    dimensions: getFormatDimensions("cita_placa"),
    predictedCTR: Number((2.5 + (citaScore / 100) * 1.8).toFixed(1)), // 2.5% - 4.3%
    predictedRetention: Math.min(96, Math.round(75 + citaScore * 0.2)), // 75% - 95%
    shareability: Number((7.0 + (stepps.moneda_social / 10) * 2.8).toFixed(1)),
    primaryChannel: "multicanal",
    pros: [
      "Fuerte autoridad C-Level y alto índice de capturas de pantalla.",
      "Consumo ultra-rápido en Stories de Instagram y Feed de LinkedIn.",
      "Ancla la postura editorial en pensadores clásicos (Drucker, Deming, Goldratt).",
    ],
  };

  const postBreakdown: FormatScoreBreakdown = {
    format: "post",
    label: "Post Estándar (1080x1080)",
    score: postScore,
    dimensions: getFormatDimensions("post"),
    predictedCTR: Number((2.0 + (postScore / 100) * 1.5).toFixed(1)), // 2.0% - 3.5%
    predictedRetention: Math.min(80, Math.round(55 + postScore * 0.25)),
    shareability: Number((5.5 + (stepps.score_global / 10) * 2.0).toFixed(1)),
    primaryChannel: "multicanal",
    pros: [
      "Formato versátil sin fricción de diseño multi-slide.",
      "Apto para publicación cruzada simultánea en Meta y LinkedIn.",
      "Permite explayarse en el copy escrito con enlace directivo.",
    ],
  };

  // -------------------------------------------------------------
  // DETERMINACIÓN DEL FORMATO GANADOR Y CONFIANZA
  // -------------------------------------------------------------
  const candidates: FormatScoreBreakdown[] = [
    carruselBreakdown,
    reelBreakdown,
    citaBreakdown,
    postBreakdown,
  ];

  candidates.sort((a, b) => b.score - a.score);
  const winner = candidates[0];
  const runnerUp = candidates[1];

  const scoreDiff = winner.score - runnerUp.score;
  const confidenceScore = Math.min(
    99,
    Math.max(65, Math.round(70 + scoreDiff * 1.3))
  );

  // Generación de Rationale y Recomendaciones Accionables
  let rationale = "";
  const actionableSuggestions: string[] = [];

  if (winner.format === "carrusel") {
    rationale = `El contenido tiene un valor práctico sobresaliente (${stepps.valor_practico}/10) y una estructura procedimental en pasos. Los carruseles PDF verticales (1080x1350) logran el mayor índice de guardados y retención en LinkedIn e Instagram.`;
    actionableSuggestions.push("Desglosá el contenido en exactamente 5 láminas para mantener el ritmo de lectura.");
    actionableSuggestions.push("Lámina 1: Gancho de quiebre. Láminas 2 a 4: Metodología. Lámina 5: CTA hacia mejoraok.com.");
    if (reelScore >= 70) {
      actionableSuggestions.push("Alternativa: Podés grabarlo como guion de Reel si preferís alcance por sobre guardados.");
    }
  } else if (winner.format === "reel") {
    rationale = `El gancho y el cuerpo presentan alta carga emocional desculpabilizadora (${stepps.emocion_desculpabilizadora}/10) con anclaje en situaciones cotidianas de trinchera (${stepps.disparadores}/10). El formato vertical de video corto (1080x1920) maximiza el alcance orgánico y la conexión humana.`;
    actionableSuggestions.push("Iniciá los primeros 3 segundos nombrando el dolor exacto ('Son las 7 de la tarde y tu teléfono no para...').");
    actionableSuggestions.push("Mantené la duración total entre 45 y 65 segundos con subtítulos dinámicos.");
    actionableSuggestions.push("Cerrá con una instrucción de proceso en lugar de una promesa de venta vacía.");
  } else if (winner.format === "cita_placa") {
    rationale = `El texto destaca por su alta moneda social (${stepps.moneda_social}/10) y síntesis conceptual directiva. Una placa tipográfica cuadrada (1080x1080) transmite máxima autoridad institucional con consumo inmediato.`;
    actionableSuggestions.push("Resaltá en color ciruela/rojo quirúrgico la frase central de quiebre.");
    actionableSuggestions.push("Atribuí la cita a su autor o al marco de Mejora Continua para blindar la reputación directiva.");
    actionableSuggestions.push("Replicá la pieza en Stories con sticker interactivo o caja de debate.");
  } else {
    rationale = `El mensaje mantiene un equilibrio editorial armónico apto para publicación multipropósito. Un post con imagen de encuadre institucional y copy de 3 pasos garantiza distribución consistente sin sobrecargar la producción.`;
    actionableSuggestions.push("Asegurá que la imagen mantenga la regla de 80% espacio blanco y puntuación azul.");
    actionableSuggestions.push("Utilizá la estructura de 3 pasos (dolor, reencuadre, dirección) en el primer tercio del copy.");
  }

  return {
    primaryFormat: winner.format,
    primaryChannel: winner.primaryChannel,
    canonicalTipoFormato: mapFormatToTipoFormatoBorrador(winner.format),
    confidenceScore,
    predictedCTR: winner.predictedCTR,
    predictedRetention: winner.predictedRetention,
    shareabilityScore: winner.shareability,
    rationale,
    recommendedDimensions: winner.dimensions,
    breakdown: {
      carrusel: carruselBreakdown,
      reel: reelBreakdown,
      cita_placa: citaBreakdown,
      post: postBreakdown,
    },
    actionableSuggestions,
  };
}
