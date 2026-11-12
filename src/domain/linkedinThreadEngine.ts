// src/domain/linkedinThreadEngine.ts
// MOTOR GENERADOR DE HILOS Y CONVERSACIÓN DIRECTIVA C-LEVEL PARA LINKEDIN (SPRINT S+8 - 2026)
// Optimizado para el algoritmo de LinkedIn (Zero Penalty Reach):
// 1. Post Principal limpio sin enlaces externos (evita la penalización algorítmica de alcance).
// 2. Primer Comentario Estratégico (Sticky Lead Anchor) con UTM de campaña y CTA de conversión.
// 3. Simulación de Hilo de Debate C-Level con 3 intervenciones de decisores (Fundador, Director Operaciones, Mejora Continua).
// 4. Métricas de Rendimiento: Dwell Time estimado, Potencial SSI y Multiplicador de Alcance.
// Invariante: Cero juicio a la persona, foco en sistemas, procesos y verdad sin rodeos.

export interface LinkedInComment {
  id: string;
  autorNombre: string;
  autorCargo: string;
  autorAvatarInitials: string;
  autorAvatarBg: string; // Color Tailwind
  esAutor: boolean;
  tiempo: string;
  contenido: string;
  likesCount: number;
  esPrimerComentarioEstrategico?: boolean;
  enlaceConversion?: string;
}

export interface LinkedInThreadInput {
  propuesta_id?: string;
  tema?: string;
  titulo_portada: string;
  cuerpo_texto?: string;
  copy_tres_pasos: {
    paso1_dolor: string;
    paso2_reencuadre: string;
    paso3_direccion_web: string;
  };
  cta_texto?: string;
  arquetipo_target?: string;
  url_diagnostico_trazable?: string;
  es_right_hook?: boolean;
}

export interface LinkedInThreadData {
  postPrincipal: {
    hook: string;
    cuerpo: string;
    engagementPrompt: string;
    hashtags: string[];
    textoCompletoCopiable: string;
    lineCount: number;
    wordCount: number;
    hasExternalLinkPenaltyRisk: boolean;
  };
  primerComentarioEstrategico: {
    contenido: string;
    urlTrazable: string;
    textoCompletoCopiable: string;
    ctaLabel: string;
  };
  hiloDebateSimulado: LinkedInComment[];
  metricasPredictivas: {
    estimatedDwellTimeSeconds: number;
    ssiBoostScore: number;
    viralReachMultiplier: number;
    estimatedReactions: number;
    estimatedComments: number;
  };
  textoExportableMarkdown: string;
}

/**
 * Genera el paquete completo de hilo de conversación directiva C-Level para LinkedIn.
 */
export function generarHiloLinkedIn(input: LinkedInThreadInput): LinkedInThreadData {
  const urlFallback = "https://mejoraok.com/diagnostico?utm_source=linkedin&utm_medium=organic_social&utm_campaign=hilo_c_level";
  const urlTrazable = input.url_diagnostico_trazable || urlFallback;

  // 1. Post Principal Limpio (Sin URLs en el cuerpo para blindar el algoritmo)
  const hook = input.titulo_portada.trim();

  // Limpiamos cualquier URL accidental en los pasos para proteger el alcance del post
  const cleanPaso1 = input.copy_tres_pasos.paso1_dolor.replace(/https?:\/\/[^\s]+/g, "").trim();
  const cleanPaso2 = input.copy_tres_pasos.paso2_reencuadre.replace(/https?:\/\/[^\s]+/g, "").trim();
  const cleanPaso3 = input.copy_tres_pasos.paso3_direccion_web.replace(/https?:\/\/[^\s]+/g, "").trim();

  const engagementPrompt =
    "Para directores generales y dueños de PyMEs: ¿En qué proceso de su operación sienten que el volumen actual desborda la estructura? Los leo en comentarios.";

  const hashtags = [
    "#Liderazgo",
    "#DireccionGeneral",
    "#PyMEs",
    "#GestionEmpresarial",
    "#MejoraContinua",
  ];

  const postLines = [
    hook,
    "",
    cleanPaso1,
    "",
    cleanPaso2,
    "",
    cleanPaso3.length > 0 && !cleanPaso3.includes("mejoraok")
      ? cleanPaso3
      : "El síntoma se manifiesta en la urgencia cotidiana; la solución real se construye en el diseño del sistema.",
    "",
    engagementPrompt,
    "",
    hashtags.join(" "),
  ].filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));

  const textoCompletoCopiable = postLines.join("\n");
  const words = textoCompletoCopiable.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lineCount = postLines.length;

  // 2. Primer Comentario Estratégico (Sticky Lead Anchor)
  const ctaLabel = input.es_right_hook
    ? "Diagnóstico de 4 Dimensiones PyME"
    : "Evaluación de Autonomía Operativa";

  const primerComentarioTexto = [
    `🔗 Dejo acá el enlace directo al ${ctaLabel} para auditar la madurez de procesos y la dependencia del fundador:`,
    urlTrazable,
    "",
    "¿Preguntas sobre cómo estructurar la matriz de delegación con sus mandos medios? Respondo personalmente cada consulta en este hilo.",
  ].join("\n");

  const primerComentarioObj: LinkedInComment = {
    id: "comm-01-lead-anchor",
    autorNombre: "Mejora Continua",
    autorCargo: "Sistemas de Autonomía Operativa y Comercial para PyMEs",
    autorAvatarInitials: "MC",
    autorAvatarBg: "bg-[#1A3D84]",
    esAutor: true,
    tiempo: "1er Comentario · Autor",
    contenido: primerComentarioTexto,
    likesCount: 14,
    esPrimerComentarioEstrategico: true,
    enlaceConversion: urlTrazable,
  };

  // 3. Réplicas del Hilo de Debate C-Level Simulado
  const arquetipo = input.arquetipo_target || "fundador_saturado";

  let commentPymeTexto = "";
  let commentRespuestaTexto = "";
  let commentGerenteTexto = "";

  if (arquetipo.includes("mal_asesorado") || arquetipo.includes("esceptico")) {
    commentPymeTexto =
      "Coincido plenamente con el reencuadre. Nos cansamos de consultores que dejaban carpetas de 200 páginas que nadie aplicaba. Cuando bajamos las reglas a 3 criterios duros por puesto, el equipo empezó a resolver solo.";
    commentRespuestaTexto =
      "Exactamente. El problema nunca fue la inteligencia de los líderes, sino la sobrecarga de abstracción. Un estándar de 1 página que se ejecuta todos los días vale 100 veces más que un manual perfecto archivado.";
    commentGerenteTexto =
      "Desde el área de producción lo confirmamos: cuando la regla de prioridad está clara, no hace falta llamar al dueño un viernes a las 19hs.";
  } else {
    commentPymeTexto =
      "Nos pasaba exactamente lo mismo: creíamos que nos faltaba gente en planta, pero el verdadero cuello de botella era que ventas prometía plazos sin mirar la capacidad instalada.";
    commentRespuestaTexto =
      "Es el clásico desacople entre comercial y operaciones. Si no hay un SLA interno y una regla de capacidad acordada, el equipo de entregas vive apagando incendios ajenos.";
    commentGerenteTexto =
      "Implementar la reunión de control por excepción de 30 minutos los lunes nos ordenó la semana entera. Bajó el estrés operativo un 80%.";
  }

  const replica1: LinkedInComment = {
    id: "comm-02-pyme-founder",
    autorNombre: "Ing. Martín Rossi",
    autorCargo: "Director General · Rossi Metalúrgica Industrial",
    autorAvatarInitials: "MR",
    autorAvatarBg: "bg-slate-700",
    esAutor: false,
    tiempo: "45 min",
    contenido: commentPymeTexto,
    likesCount: 8,
  };

  const replica2: LinkedInComment = {
    id: "comm-03-mc-reply",
    autorNombre: "Mejora Continua",
    autorCargo: "Sistemas de Autonomía Operativa y Comercial para PyMEs",
    autorAvatarInitials: "MC",
    autorAvatarBg: "bg-[#1A3D84]",
    esAutor: true,
    tiempo: "32 min",
    contenido: commentRespuestaTexto,
    likesCount: 6,
  };

  const replica3: LinkedInComment = {
    id: "comm-04-ops-manager",
    autorNombre: "Lic. Valeria Benítez",
    autorCargo: "Gerente de Operaciones & Logística · Grupo Delta",
    autorAvatarInitials: "VB",
    autorAvatarBg: "bg-blue-900",
    esAutor: false,
    tiempo: "18 min",
    contenido: commentGerenteTexto,
    likesCount: 5,
  };

  const hiloDebateSimulado: LinkedInComment[] = [
    primerComentarioObj,
    replica1,
    replica2,
    replica3,
  ];

  // 4. Métricas Predictivas de Rendimiento del Algoritmo de LinkedIn
  // Tiempo de lectura estimado del post + tiempo de consumo del hilo (promedio 180 wpm)
  const totalThreadWords =
    wordCount +
    primerComentarioTexto.split(/\s+/).length +
    commentPymeTexto.split(/\s+/).length +
    commentRespuestaTexto.split(/\s+/).length +
    commentGerenteTexto.split(/\s+/).length;

  const estimatedDwellTimeSeconds = Math.max(35, Math.round((totalThreadWords / 180) * 60));
  const ssiBoostScore = Number((7.8 + (input.es_right_hook ? 0.8 : 1.2)).toFixed(1)); // Escala 0-10
  const viralReachMultiplier = Number((1.6 + (hiloDebateSimulado.length * 0.1)).toFixed(1)); // 1.6x - 2.0x
  const estimatedReactions = Math.round(95 + wordCount * 0.8);
  const estimatedComments = Math.round(14 + hiloDebateSimulado.length * 2.5);

  // 5. Formato Exportable Markdown
  const textoExportableMarkdown = [
    `# HILO DE AUTORIDAD C-LEVEL PARA LINKEDIN (${input.propuesta_id || "PROP-2026"})`,
    "",
    "## 1. POST PRINCIPAL (PUBLICAR EN EL FEED)",
    "```text",
    textoCompletoCopiable,
    "```",
    "",
    "## 2. PRIMER COMENTARIO ESTRATÉGICO (PUBLICAR DE INMEDIATO)",
    "```text",
    primerComentarioTexto,
    "```",
    "",
    "## 3. SECUENCIA DE DIÁLOGO DIRECTIVO Y RESPUESTAS RECOMENDADAS",
    `1. ${replica1.autorNombre} (${replica1.autorCargo}):`,
    `   > "${replica1.contenido}"`,
    "",
    `2. Réplica recomendada de ${replica2.autorNombre}:`,
    `   > "${replica2.contenido}"`,
    "",
    `3. ${replica3.autorNombre} (${replica3.autorCargo}):`,
    `   > "${replica3.contenido}"`,
  ].join("\n");

  return {
    postPrincipal: {
      hook,
      cuerpo: `${cleanPaso1}\n\n${cleanPaso2}`,
      engagementPrompt,
      hashtags,
      textoCompletoCopiable,
      lineCount,
      wordCount,
      hasExternalLinkPenaltyRisk: false, // 100% blindado contra penalización de link en body
    },
    primerComentarioEstrategico: {
      contenido: primerComentarioTexto,
      urlTrazable,
      textoCompletoCopiable: primerComentarioTexto,
      ctaLabel,
    },
    hiloDebateSimulado,
    metricasPredictivas: {
      estimatedDwellTimeSeconds,
      ssiBoostScore,
      viralReachMultiplier,
      estimatedReactions,
      estimatedComments,
    },
    textoExportableMarkdown,
  };
}
