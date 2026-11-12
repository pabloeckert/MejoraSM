// src/domain/steppsValidator.ts
// EVALUADOR Y VALIDADOR DETERMINISTA DEL MARCO STEPPS (JONAH BERGER)
// Audita 6 dimensiones de resonancia psicológica y viralidad profesional B2B:
// 1. Social Currency (Moneda Social)
// 2. Triggers (Disparadores de Contexto)
// 3. Emotion (Emoción Desculpabilizadora - Calidez con Verdad)
// 4. Public (Visibilidad y Arquetipos)
// 5. Practical Value (Valor Práctico Accionable en 3 Pasos)
// 6. Stories (Historias Troya de Trinchera)

import { BorradorPropuestaDTO, EvaluacionSteppsDTO } from "./types";

export interface EvaluacionSteppsInput {
  titulo_portada: string;
  cuerpo_texto: string;
  copy_tres_pasos: {
    paso1_dolor: string;
    paso2_reencuadre: string;
    paso3_direccion_web: string;
  };
  cta_texto?: string;
}

/**
 * Evalúa un borrador bajo el marco STEPPS de Jonah Berger adaptado a PyMEs B2B.
 */
export function evaluarBorradorStepps(input: EvaluacionSteppsInput): EvaluacionSteppsDTO {
  const fullText = [
    input.titulo_portada,
    input.cuerpo_texto,
    input.copy_tres_pasos.paso1_dolor,
    input.copy_tres_pasos.paso2_reencuadre,
    input.copy_tres_pasos.paso3_direccion_web,
    input.cta_texto || "",
  ]
    .join(" ")
    .toLowerCase();

  // 1. Moneda Social (Social Currency)
  // Palabras clave de arquitectura directiva, marcos metodológicos y criterio C-Level
  const terminosMonedaSocial = [
    "matriz", "proceso", "sistema", "protocolo", "estándar", "arquitectura",
    "gobierno", "directivo", "decisión", "efectividad", "indicador", "kpi",
    "rentabilidad", "margen", "ebitda", "orden", "método", "liderazgo", "autoridad"
  ];
  let hitsMonedaSocial = 0;
  for (const t of terminosMonedaSocial) {
    if (fullText.includes(t)) hitsMonedaSocial++;
  }
  const scoreMonedaSocial = Math.min(10, Math.max(5, 5 + hitsMonedaSocial));

  // 2. Disparadores de Contexto (Triggers)
  // Anclajes temporales, situaciones de fricción recurrente en la semana
  const terminosDisparadores = [
    "lunes", "viernes", "semana", "mañana", "tarde", "urgencia", "incendio",
    "whatsapp", "audio", "escritorio", "reunión", "llamada", "fin de semana",
    "cierre de mes", "día", "hora", "feriado", "vacaciones", "apagar"
  ];
  let hitsDisparadores = 0;
  for (const t of terminosDisparadores) {
    if (fullText.includes(t)) hitsDisparadores++;
  }
  const scoreDisparadores = Math.min(10, Math.max(5, 5 + hitsDisparadores * 1.2));

  // 3. Emoción Desculpabilizadora (Emotion: Calidez con Verdad)
  // El foco en el proceso, jamas en la persona
  const terminosEmocion = [
    "no es", "culpa", "persona", "sistema", "proceso", "cuidado", "verdad",
    "calidez", "desidia", "falta de", "miedo", "alivio", "tranquilidad",
    "frustración", "agotado", "soledad", "rehén"
  ];
  let hitsEmocion = 0;
  for (const t of terminosEmocion) {
    if (fullText.includes(t)) hitsEmocion++;
  }
  const scoreEmocion = Math.min(10, Math.max(6, 5 + hitsEmocion * 1.2));

  // 4. Público y Arquetipos (Public)
  // Elementos visibles que el empresario puede mostrar, comparar o auditar
  const terminosPublico = [
    "diagnóstico", "arquetipo", "dimensión", "tablero", "organigrama", "test",
    "evaluación", "perfil", "nivel", "estándar", "benchmark", "pyme"
  ];
  let hitsPublico = 0;
  for (const t of terminosPublico) {
    if (fullText.includes(t)) hitsPublico++;
  }
  const scorePublico = Math.min(10, Math.max(5, 5 + hitsPublico * 1.1));

  // 5. Valor Práctico (Practical Value: 3 pasos accionables)
  // El texto incluye estructura de dolor, reencuadre y dirección con verbos ejecutables
  const tieneEstructuraTresPasos =
    Boolean(input.copy_tres_pasos.paso1_dolor.trim()) &&
    Boolean(input.copy_tres_pasos.paso2_reencuadre.trim()) &&
    Boolean(input.copy_tres_pasos.paso3_direccion_web.trim());

  const verbosAccion = [
    "medí", "documentá", "implementá", "definí", "conocé", "recuperá",
    "estructurá", "establecé", "defendé", "hacé", "probá", "revisá", "entrá"
  ];
  let hitsVerbos = 0;
  for (const v of verbosAccion) {
    if (fullText.includes(v)) hitsVerbos++;
  }
  const scoreValorPractico = Math.min(
    10,
    tieneEstructuraTresPasos ? Math.max(7, 6 + hitsVerbos * 1.0) : 5
  );

  // 6. Historias Troya (Stories)
  // Menciones a contextos de negocio reales, operarios, clientes, galpones o diálogos
  const terminosHistorias = [
    "empresa", "equipo", "dueño", "cliente", "socio", "empleado", "mando medio",
    "colaborador", "galpón", "planta", "vendedor", "familia", "caso", "decís"
  ];
  let hitsHistorias = 0;
  for (const h of terminosHistorias) {
    if (fullText.includes(h)) hitsHistorias++;
  }
  const scoreHistorias = Math.min(10, Math.max(5, 5 + hitsHistorias * 1.1));

  // Cálculo ponderado final
  const scoreGlobalRaw =
    scoreMonedaSocial * 0.15 +
    scoreDisparadores * 0.15 +
    scoreEmocion * 0.20 +
    scorePublico * 0.15 +
    scoreValorPractico * 0.20 +
    scoreHistorias * 0.15;

  const score_global = Number(scoreGlobalRaw.toFixed(1));
  const aprobado_stepps = score_global >= 7.0;

  // Generación de feedback sintético para la UI
  const feedbackItems: string[] = [];
  if (scoreEmocion >= 8.5) feedbackItems.push("Excelente desculpabilización: foco en arquitectura de procesos.");
  if (scoreValorPractico >= 8.5) feedbackItems.push("Alto valor práctico con llamada directiva precisa.");
  if (scoreDisparadores >= 8.0) feedbackItems.push("Fuerte disparador anclado a la fricción diaria.");
  if (feedbackItems.length === 0) feedbackItems.push("Contenido con equilibrio editorial conforme al estándar Mejora Continua.");

  return {
    moneda_social: Number(scoreMonedaSocial.toFixed(1)),
    disparadores: Number(scoreDisparadores.toFixed(1)),
    emocion_desculpabilizadora: Number(scoreEmocion.toFixed(1)),
    publico_visual: Number(scorePublico.toFixed(1)),
    valor_practico: Number(scoreValorPractico.toFixed(1)),
    historias_troya: Number(scoreHistorias.toFixed(1)),
    score_global,
    aprobado_stepps,
    feedback_editorial: feedbackItems.join(" "),
  };
}

/**
 * Asigna la evaluación STEPPS a un BorradorPropuestaDTO.
 */
export function enriquecerBorradorConStepps(borrador: BorradorPropuestaDTO): BorradorPropuestaDTO {
  const stepps = evaluarBorradorStepps({
    titulo_portada: borrador.titulo_portada,
    cuerpo_texto: borrador.cuerpo_texto,
    copy_tres_pasos: borrador.copy_tres_pasos,
    cta_texto: borrador.cta_texto,
  });

  return {
    ...borrador,
    stepps_evaluacion: stepps,
  };
}
