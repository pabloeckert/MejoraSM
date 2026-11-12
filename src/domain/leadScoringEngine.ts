/**
 * leadScoringEngine.ts — Motor de Calificación y Scoring Predictivo de Prospectos B2B
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - Aaron Ross (Predictable Revenue): Lead Qualification Matrix & SLA de respuesta inmediata
 * - Geoffrey Moore (Crossing the Chasm): Segmentación de Pragmatistas y Decisores Escépticos
 * - Principios de Marca: Calidez con Verdad, Foco en Sistemas y Cero Juicio a las Personas
 */

export interface InputLeadScoring {
  textoMensaje: string;
  nombreRemitente?: string;
  cargoRemitente?: string;
  canal?: "instagram" | "facebook" | "linkedin" | "whatsapp" | string;
  fechaInteraccion?: string;
  seguidor?: boolean | null;
}

export type CuadranteLead = "CALIFICADO_ALTO" | "EN_NUTRICION" | "COMUNIDAD";
export type PrioridadCRM = "ALTA" | "MEDIA" | "BAJA";

export interface DesglosePuntosScoring {
  fitRolDirectivo: number; // 0 - 35
  intensidadDolor: number; // 0 - 35
  intencionAccion: number; // 0 - 30
}

export interface RespuestaSugeridaConsultiva {
  id: "diagnostico" | "pregunta_trinchera" | "canal_privado";
  etiquetaCorta: string;
  titulo: string;
  texto: string;
  objetivo: string;
}

export interface ResultadoLeadScoring {
  scoreTotal: number; // 0 - 100
  cuadrante: CuadranteLead;
  cuadranteLabel: string;
  prioridadCrm: PrioridadCRM;
  slaHorasRecomendado: number;
  badgeColor: string; // Tailwind class
  fitRolDetectado: string;
  doloresDetectados: string[];
  intencionesDetectadas: string[];
  desglose: DesglosePuntosScoring;
  respuestasSugeridas: RespuestaSugeridaConsultiva[];
  enriquecimientoCrm: {
    arquetipoSugerido: "fundador_saturado" | "segunda_generacion" | "director_comercial" | "general";
    prioridad: PrioridadCRM;
    slaLimiteHoras: number;
    notaScoring: string;
  };
}

// Diccionarios deterministas de palabras clave
const ROLES_DIRECTIVOS_ALTO = [
  "dueño", "dueña", "fundador", "fundadora", "socio", "socia", "propietario", "propietaria",
  "ceo", "director general", "directora general", "director de operaciones", "gerente general",
  "gerente de planta", "titular", "presidente", "vicepresidente", "director ejecutivo"
];

const ROLES_MANDO_MEDIO = [
  "jefe", "jefa", "coordinador", "coordinadora", "supervisor", "supervisora",
  "responsable", "líder de equipo", "gerente", "project manager"
];

const PRONOMBRES_EMPRESA = [
  "mi empresa", "nuestra empresa", "en mi fábrica", "nuestra fábrica", "mi equipo",
  "mis socios", "mis empleados", "nuestros clientes", "nuestros procesos", "tenemos personas a cargo",
  "mi negocio", "nuestro taller", "en la planta"
];

const SINTOMAS_DOLOR_PROCESOS = [
  "cuello de botella", "cuellos de botella", "urgencias", "apagar incendios", "incendios diarios",
  "saturado", "saturada", "desbordado", "desbordada", "no llego", "todo pasa por mí", "dependen de mí",
  "no puedo delegar", "delegar", "falta de tiempo", "esclavizado", "esclavizada", "sin descanso"
];

const SINTOMAS_DOLOR_CALIDAD_ENTREGA = [
  "retrabajo", "retrabajos", "errores", "fallas", "demoras", "demora en entregas", "retrasos",
  "quejas de clientes", "reclamos", "desorden", "desorganización", "desacople", "no cumplen",
  "falta de compromiso", "descontrol", "falta de procesos", "sin procedimientos"
];

const ESCALA_EMPRESA = [
  "empleados", "personas", "operarios", "sucursales", "turnos", "línea de producción",
  "vendedores", "clientes activos", "planta industrial"
];

const INTENCION_ACCION_ALTA = [
  "diagnóstico", "diagnostico", "consultoría", "consultoria", "acompañamiento", "asesoría",
  "asesoria", "reunión", "reunion", "llamada", "charlemos", "contacto", "costos", "honorarios",
  "precio", "presupuesto", "cómo trabajan", "como trabajan", "cómo es el servicio", "escribime",
  "escríbeme", "quiero contratar", "quiero información", "me interesa el servicio"
];

const INTENCION_ACCION_MEDIA = [
  "cómo se hace", "como se hace", "cómo se implementa", "por dónde arrancar", "por donde arrancar",
  "consejo", "recomendación", "recomendacion", "tienen material", "algún libro", "algún curso",
  "qué opinan", "qué recomiendan"
];

/**
 * Motor determinista de cálculo de scoring para leads y prospectos B2B
 */
export function calcularLeadScoring(input: InputLeadScoring): ResultadoLeadScoring {
  const texto = (input.textoMensaje || "").toLowerCase();
  const cargo = (input.cargoRemitente || "").toLowerCase();
  const nombre = input.nombreRemitente || "Colega Directivo";

  let puntosRol = 0;
  let rolDetectado = "Sin rol explícito";
  const doloresDetectados: string[] = [];
  const intencionesDetectadas: string[] = [];

  // 1. FIT DE ROL DIRECTIVO (0 a 35 pts)
  const esCLevel = ROLES_DIRECTIVOS_ALTO.some((r) => cargo.includes(r) || texto.includes(r));
  const esMandoMedio = ROLES_MANDO_MEDIO.some((r) => cargo.includes(r) || texto.includes(r));
  const hablaEnPrimeraPersonaEmpresa = PRONOMBRES_EMPRESA.some((p) => texto.includes(p));

  if (esCLevel) {
    puntosRol += 32;
    rolDetectado = "Dueño / Socio / Director C-Level";
  } else if (esMandoMedio) {
    puntosRol += 20;
    rolDetectado = "Mando Medio / Coordinador";
  } else if (hablaEnPrimeraPersonaEmpresa) {
    puntosRol += 22;
    rolDetectado = "Decisor de Negocio (Inferencia Textual)";
  } else {
    puntosRol += 5;
  }

  // Bonus si sigue la cuenta en redes
  if (input.seguidor) {
    puntosRol = Math.min(35, puntosRol + 3);
  }

  // 2. INTENSIDAD DEL DOLOR OPERATIVO (0 a 35 pts)
  let puntosDolor = 0;

  SINTOMAS_DOLOR_PROCESOS.forEach((s) => {
    if (texto.includes(s) && !doloresDetectados.includes(s)) {
      doloresDetectados.push(s);
      puntosDolor += 10;
    }
  });

  SINTOMAS_DOLOR_CALIDAD_ENTREGA.forEach((s) => {
    if (texto.includes(s) && !doloresDetectados.includes(s)) {
      doloresDetectados.push(s);
      puntosDolor += 8;
    }
  });

  ESCALA_EMPRESA.forEach((s) => {
    if (texto.includes(s) && !doloresDetectados.includes(s)) {
      doloresDetectados.push(s);
      puntosDolor += 6;
    }
  });

  puntosDolor = Math.min(35, Math.max(5, puntosDolor));

  // 3. INTENCIÓN DE ACCIÓN / MOMENTO DE COMPRA (0 a 30 pts)
  let puntosAccion = 0;

  INTENCION_ACCION_ALTA.forEach((i) => {
    if (texto.includes(i) && !intencionesDetectadas.includes(i)) {
      intencionesDetectadas.push(i);
      puntosAccion += 20;
    }
  });

  INTENCION_ACCION_MEDIA.forEach((i) => {
    if (texto.includes(i) && !intencionesDetectadas.includes(i)) {
      intencionesDetectadas.push(i);
      puntosAccion += 10;
    }
  });

  // Si solo es elogio social o emojis sin preguntas
  if (puntosAccion === 0) {
    if (texto.includes("gracias") || texto.includes("excelente") || texto.includes("buen post") || texto.includes("👏")) {
      puntosAccion = 5;
      intencionesDetectadas.push("Elogio / Reconocimiento social");
    } else {
      puntosAccion = 2;
    }
  }

  puntosAccion = Math.min(30, puntosAccion);

  // CÁLCULO TOTAL
  const scoreTotal = Math.min(100, puntosRol + puntosDolor + puntosAccion);

  // CLASIFICACIÓN EN CUADRANTES
  let cuadrante: CuadranteLead = "COMUNIDAD";
  let cuadranteLabel = "⚪ Interacción Social / Comunidad";
  let prioridadCrm: PrioridadCRM = "BAJA";
  let slaHorasRecomendado = 48;
  let badgeColor = "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-200";

  if (scoreTotal >= 70) {
    cuadrante = "CALIFICADO_ALTO";
    cuadranteLabel = "🔥 Oportunidad Calificada (Decisor B2B)";
    prioridadCrm = "ALTA";
    slaHorasRecomendado = 2; // Ventana crítica de respuesta ejecutiva
    badgeColor = "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200";
  } else if (scoreTotal >= 35) {
    cuadrante = "EN_NUTRICION";
    cuadranteLabel = "🟡 Prospecto en Nutrición (Interés Técnico)";
    prioridadCrm = "MEDIA";
    slaHorasRecomendado = 24;
    badgeColor = "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200";
  }

  // INFERENCIA DE ARQUETIPO
  let arquetipoSugerido: "fundador_saturado" | "segunda_generacion" | "director_comercial" | "general" = "general";
  if (texto.includes("delegar") || texto.includes("tiempo") || texto.includes("saturad") || texto.includes("apagar")) {
    arquetipoSugerido = "fundador_saturado";
  } else if (texto.includes("ventas") || texto.includes("comercial") || texto.includes("clientes")) {
    arquetipoSugerido = "director_comercial";
  } else if (texto.includes("familia") || texto.includes("socio") || texto.includes("segunda generacion") || texto.includes("cultura")) {
    arquetipoSugerido = "segunda_generacion";
  }

  // GENERACIÓN DE 3 RESPUESTAS CONSULTIVAS EN 1 CLIC (CALIDEZ CON VERDAD)
  const primerNombre = nombre.split(" ")[0];
  const dolorPrincipal = doloresDetectados[0] || "la fricción operativa diaria";

  const respuestasSugeridas: RespuestaSugeridaConsultiva[] = [
    {
      id: "diagnostico",
      etiquetaCorta: "🎯 Autodiagnóstico 4D",
      titulo: "Invitación a Diagnóstico de 4 Dimensiones",
      texto: `Hola ${primerNombre}, gracias por compartirlo. En empresas con este ritmo, cuando aparece ${dolorPrincipal}, la clave es mirar la arquitectura del proceso y los acuerdos internos, no exigirle más horas al equipo. Si querés mapear dónde está el desborde exacto, te sugiero hacer nuestro autodiagnóstico de 4 dimensiones en mejoraok.com/diagnostico.`,
      objetivo: "Conducir al prospecto a la herramienta de autoevaluación estructurada de Mejora Continua.",
    },
    {
      id: "pregunta_trinchera",
      etiquetaCorta: "🔍 Pregunta de Trinchera",
      titulo: "Indagación Consultiva de Causa Raíz",
      texto: `Hola ${primerNombre}, totalmente entendible lo que planteás. En trinchera solemos ver dos caminos: ¿notás que ${dolorPrincipal} ocurre más por falta de protocolos y acuerdos claros entre áreas, o porque el escalamiento final siempre termina recayendo en tu escritorio?`,
      objetivo: "Abrir un diálogo reflexivo de alto valor técnico posicionando la consultoría como guía experta.",
    },
    {
      id: "canal_privado",
      etiquetaCorta: "💬 Continuar por Privado / WhatsApp",
      titulo: "Derivación Directa a Conversación Uno a Uno",
      texto: `Hola ${primerNombre}, para darte un criterio con datos reales sobre el tamaño y la dinámica de tu equipo, ¿te parece que lo conversemos brevemente por WhatsApp? Podés escribirnos directo a mejoraok.com/contacto o dejarnos un teléfono de contacto por acá.`,
      objetivo: "Acelerar el pasaje de red social a canal comercial privado con SLA express de seguimiento.",
    },
  ];

  const desglose: DesglosePuntosScoring = {
    fitRolDirectivo: puntosRol,
    intensidadDolor: puntosDolor,
    intencionAccion: puntosAccion,
  };

  const notaScoring = `[LeadScoring ${scoreTotal}/100 - ${cuadrante}] Rol: ${rolDetectado} | Dolor: ${doloresDetectados.slice(0, 3).join(", ") || "General"} | SLA: <${slaHorasRecomendado}h`;

  return {
    scoreTotal,
    cuadrante,
    cuadranteLabel,
    prioridadCrm,
    slaHorasRecomendado,
    badgeColor,
    fitRolDetectado: rolDetectado,
    doloresDetectados,
    intencionesDetectadas,
    desglose,
    respuestasSugeridas,
    enriquecimientoCrm: {
      arquetipoSugerido,
      prioridad: prioridadCrm,
      slaLimiteHoras: slaHorasRecomendado,
      notaScoring,
    },
  };
}
