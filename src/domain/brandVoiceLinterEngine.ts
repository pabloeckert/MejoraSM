/**
 * brandVoiceLinterEngine.ts
 *
 * Motor Determinista de Auditoría y Calibración de Identidad Verbal y Tono de Marca
 * ("Calidez con Verdad" Brand Voice Linter & Calibration Engine — Sprint S+19).
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Fundamentos Teóricos e Institucionales:
 * 1. Manual de Identidad Verbal de Mejora Continua (AGENTS.md):
 *    - Criterio 1 ("Nunca a la persona"): El foco siempre es el sistema, el proceso o la falta de claridad;
 *      jamás la inteligencia, capacidad o valía personal del líder o de su equipo.
 *    - Criterio 2 ("Calidez con verdad"): La calidez radica en el cuidado detrás de decir la verdad sin rodeos,
 *      sin humo gurú, sin promesas mágicas y sin complacencia vacía.
 *    - Criterio 3 ("No se vende por precio"): "Sin costo" es un dato funcional menor, nunca el gancho comercial;
 *      cero apelación a descuentos, regateo o urgencia artificial de infoproducto.
 *    - Criterio 4 ("Un solo marco de servicios"): 4 Dimensiones (Personal, Organizacional, Comercial, Empresarial)
 *      + Profesionalización + Sociales, bajo las estructuras Verdad + Claridad y Exposición + Dirección.
 * 2. Kim Scott ("Radical Candor"):
 *    - Intersección exacta entre "Importar Personalmente (Calidez)" y "Desafiar Directamente (Verdad)".
 * 3. Donald Miller ("Building a StoryBrand") & Ann Handley ("Everybody Writes"):
 *    - El cliente es el héroe; la marca actúa como guía empático con autoridad técnica y claridad quirúrgica.
 */

export type ReglaBrandVoice =
  | "sistema_no_persona"
  | "calidez_con_verdad"
  | "no_vender_por_precio"
  | "estructura_direccion_4d";

export type SeveridadHallazgo = "bloqueante" | "advertencia" | "sugerencia";

export type EstadoAprobacionBrandVoice =
  | "APROBADO_IMPECABLE"
  | "APROBADO_CON_AJUSTES"
  | "RECHAZADO_TONO_NO_ALINEADO";

export type CuadranteRadicalCandor =
  | "CALIDEZ_CON_VERDAD"
  | "AGRESION_PUNITIVA"
  | "HUMO_COMERCIAL"
  | "COMPLACENCIA_DIFUSA";

export interface HallazgoBrandVoice {
  id: string;
  regla: ReglaBrandVoice;
  reglaLabel: string;
  severidad: SeveridadHallazgo;
  terminoDetectado: string;
  explicacionCriterio: string;
  reemplazoSugerido: string;
}

export interface PuntajesPilaresBrandVoice {
  sistemaNoPersona: number;     // Máx 30
  calidezConVerdad: number;     // Máx 25
  noVenderPorPrecio: number;    // Máx 25
  estructuraDireccion4D: number; // Máx 20
}

export interface EstructuraTresPasosCalibrada {
  paso1VerdadSinJuzgar: string;
  paso2CausaRaizSistema: string;
  paso3DireccionConcreta: string;
}

export interface ResultadoAuditoriaBrandVoice {
  scoreGlobal: number; // 0 a 100
  estadoAprobacion: EstadoAprobacionBrandVoice;
  cuadranteRadicalCandor: CuadranteRadicalCandor;
  cuadranteLabel: string;
  cuadranteDescripcion: string;
  puntajesPorPilar: PuntajesPilaresBrandVoice;
  hallazgos: HallazgoBrandVoice[];
  textoOriginal: string;
  textoCalibradoSugerido: string;
  estructuraTresPasos: EstructuraTresPasosCalibrada;
  metricasTexto: {
    palabrasCount: number;
    tieneTerminosSistema: boolean;
    tieneDireccionConcreta: boolean;
    bloqueantesCount: number;
    advertenciasCount: number;
  };
}

export interface PresetAuditoriaBrandVoice {
  id: string;
  nombre: string;
  descripcion: string;
  texto: string;
}

interface PatronRegla {
  id: string;
  regla: ReglaBrandVoice;
  reglaLabel: string;
  severidad: SeveridadHallazgo;
  regex: RegExp;
  terminoLabel: string;
  explicacion: string;
  reemplazo: string;
  penalizacion: number;
}

const PATRONES_REGLAS: PatronRegla[] = [
  // 1. NUNCA A LA PERSONA (Foco en Sistema)
  {
    id: "PNP-01",
    regla: "sistema_no_persona",
    reglaLabel: "1. Nunca a la Persona (Foco en el Sistema)",
    severidad: "bloqueante",
    regex: /\btu culpa\b/gi,
    terminoLabel: "tu culpa",
    explicacion:
      "Culpabiliza personalmente al líder. En Mejora Continua el problema nunca es la persona, sino el diseño del sistema o proceso.",
    reemplazo: "una brecha en el diseño del proceso operativo",
    penalizacion: 15,
  },
  {
    id: "PNP-02",
    regla: "sistema_no_persona",
    reglaLabel: "1. Nunca a la Persona (Foco en el Sistema)",
    severidad: "bloqueante",
    regex: /\bno sab[eé]s liderar\b/gi,
    terminoLabel: "no sabés liderar",
    explicacion:
      "Ataca la capacidad del directivo. Debe reencuadrarse hacia la estructura de delegación y claridad de roles.",
    reemplazo: "el esquema actual de delegación concentra las decisiones operativas en la dirección",
    penalizacion: 15,
  },
  {
    id: "PNP-03",
    regla: "sistema_no_persona",
    reglaLabel: "1. Nunca a la Persona (Foco en el Sistema)",
    severidad: "bloqueante",
    regex: /\b(sos un incapaz|incapaz|incompetentes?|ineptos?|torpes?)\b/gi,
    terminoLabel: "adjetivo descalificador personal (incapaz / incompetente)",
    explicacion:
      "Descalificación personal directa. Ningún diagnóstico serio juzga la inteligencia del equipo; audita la ausencia de estándares.",
    reemplazo: "un equipo operando sin estándares ni tableros de seguimiento claros",
    penalizacion: 18,
  },
  {
    id: "PNP-04",
    regla: "sistema_no_persona",
    reglaLabel: "1. Nunca a la Persona (Foco en el Sistema)",
    severidad: "bloqueante",
    regex: /\b(fracasaste|sos un fracaso|mal dueño|mal jefe|mediocres?)\b/gi,
    terminoLabel: "juicio de valor punitivo (fracasaste / mediocre / mal jefe)",
    explicacion:
      "Reemplazar juicios morales hacia el empresario por el diagnóstico objetivo del techo operativo alcanzado.",
    reemplazo: "el modelo operativo actual alcanzó su límite de escala",
    penalizacion: 15,
  },

  // 2. CALIDEZ CON VERDAD (Cero Humo Gurú / Motivación Vacía)
  {
    id: "CCV-01",
    regla: "calidez_con_verdad",
    reglaLabel: "2. Calidez con Verdad (Cero Humo Gurú)",
    severidad: "bloqueante",
    regex: /\bf[óo]rmula m[áa]gica\b/gi,
    terminoLabel: "fórmula mágica",
    explicacion:
      "Promesa irreal de infoproducto. Mejora Continua trabaja con método, ingeniería de procesos y criterio de trinchera.",
    reemplazo: "metodología estructurada en las 4 Dimensiones",
    penalizacion: 13,
  },
  {
    id: "CCV-02",
    regla: "calidez_con_verdad",
    reglaLabel: "2. Calidez con Verdad (Cero Humo Gurú)",
    severidad: "bloqueante",
    regex: /\b[ée]xito garantizado\b/gi,
    terminoLabel: "éxito garantizado",
    explicacion:
      "Eslogan vacío que erosiona la autoridad B2B C-Level. Prometer orden medible y trazabilidad operativa.",
    reemplazo: "resultados medibles basados en claridad de procesos",
    penalizacion: 13,
  },
  {
    id: "CCV-03",
    regla: "calidez_con_verdad",
    reglaLabel: "2. Calidez con Verdad (Cero Humo Gurú)",
    severidad: "advertencia",
    regex: /\b(mentalidad millonaria|hack secreto|secreto infalible|sin esfuerzo|rompela)\b/gi,
    terminoLabel: "jerga de motivación vacía / humo gurú",
    explicacion:
      "Lenguaje ajeno a directores de PyMEs industriales y de servicios. Sustituir por rigor directivo y trabajo sobre causas raíz.",
    reemplazo: "criterio directivo, indicadores claros y disciplina de ejecución",
    penalizacion: 12,
  },

  // 3. NO SE VENDE POR PRECIO
  {
    id: "NVP-01",
    regla: "no_vender_por_precio",
    reglaLabel: "3. Autoridad Consultiva (No se Vende por Precio)",
    severidad: "bloqueante",
    regex: /\b(oferta imperdible|promo limitada|liquidaci[óo]n|2x1)\b/gi,
    terminoLabel: "gancho de liquidación / oferta imperdible",
    explicacion:
      "La consultoría B2B de dirección no se comercializa como retail de descuento. El valor reside en resolver el cuello de botella.",
    reemplazo: "programa de acompañamiento ejecutivo a medida",
    penalizacion: 14,
  },
  {
    id: "NVP-02",
    regla: "no_vender_por_precio",
    reglaLabel: "3. Autoridad Consultiva (No se Vende por Precio)",
    severidad: "bloqueante",
    regex: /\b(descuento exclusivo|s[úu]per descuento|m[áa]s barato|barat[íi]simo|barato)\b/gi,
    terminoLabel: "apelación a precio bajo / descuento",
    explicacion:
      "Competir por precio atrae prospectos desalineados. Enfatizar el retorno sobre el orden organizacional y comercial.",
    reemplazo: "inversión con retorno directo en previsibilidad y margen operativo",
    penalizacion: 14,
  },
  {
    id: "NVP-03",
    regla: "no_vender_por_precio",
    reglaLabel: "3. Autoridad Consultiva (No se Vende por Precio)",
    severidad: "advertencia",
    regex: /\b(100%\s*gratis\s*ya|gratis\s*por\s*hoy|regalo\s*exclusivo)\b/gi,
    terminoLabel: "'gratis' como gancho principal de urgencia",
    explicacion:
      "Regla de marca: 'Sin costo' es un dato funcional menor, jamás el gancho principal de un hero o CTA.",
    reemplazo: "autodiagnóstico ejecutivo inicial en mejoraok.com/diagnostico",
    penalizacion: 11,
  },
];

const TERMINOS_SISTEMA = [
  "sistema",
  "proceso",
  "procesos",
  "claridad",
  "método",
  "metodo",
  "indicador",
  "indicadores",
  "estructura",
  "estándar",
  "estandar",
  "dimensiones",
  "organizacional",
  "comercial",
  "empresarial",
  "profesionalización",
  "profesionalizacion",
  "roles",
  "tablero",
  "causa raíz",
  "causa raiz",
  "operación",
  "operacion",
];

const TERMINOS_DIRECCION = [
  "diagnóstico",
  "diagnostico",
  "mejoraok.com",
  "evaluá",
  "evaluar",
  "medir",
  "medí",
  "conversar",
  "agenda",
  "agendá",
  "revisá",
  "revisar",
  "paso",
  "criterio",
  "definir",
  "ordenar",
  "implementar",
];

export const PRESETS_AUDITORIA_BRAND_VOICE: PresetAuditoriaBrandVoice[] = [
  {
    id: "borrador_con_vicios",
    nombre: "Borrador con Vicios (Demo Corrección)",
    descripcion: "Contiene lenguaje punitivo hacia el dueño, humo gurú y venta por descuento.",
    texto:
      "Si tu empresa no crece es tu culpa porque no sabés liderar a un equipo incompetente. Tenemos la fórmula mágica con éxito garantizado para lograr una mentalidad millonaria. Aprovechá nuestra oferta imperdible con descuento exclusivo y 100% gratis ya.",
  },
  {
    id: "borrador_tibio_sin_direccion",
    nombre: "Borrador Tibio / Sin Dirección",
    descripcion: "Amable pero complaciente; no nombra la causa raíz ni ofrece dirección concreta.",
    texto:
      "Sabemos que dirigir una PyME hoy es difícil y lleva muchas horas. Esperamos que puedas descansar pronto y cualquier duda que tengas estamos a disposición para charlar cuando quieras.",
  },
  {
    id: "borrador_impecable_mc",
    nombre: "Estándar Impecable Mejora Continua",
    descripcion: "Cumple Verdad + Claridad, foco en el sistema, las 4 Dimensiones y dirección trazable.",
    texto:
      "1. Dolor: Cuando cada urgencia operativa termina en tu escritorio, la jornada se consume apagando incendios.\n2. Reencuadre: El cuello de botella nunca es la capacidad del dueño, sino la falta de procesos estandarizados y claridad de roles en las 4 Dimensiones de la empresa.\n3. Dirección: Evaluá el estado actual de tu estructura completando el diagnóstico ejecutivo en https://mejoraok.com/diagnostico.",
  },
];

function extraerEstructuraTresPasos(textoCalibrado: string): EstructuraTresPasosCalibrada {
  const oraciones = textoCalibrado
    .split(/(?:\r?\n|(?<=[.!?])\s+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  const paso1 =
    oraciones[0] ||
    "Cuando la operación diaria absorbe toda la agenda directiva, el crecimiento se detiene por saturación.";
  const paso2 =
    oraciones[1] ||
    "La causa raíz no reside en las personas, sino en la falta de procesos estandarizados e indicadores claros en las 4 Dimensiones.";
  const paso3 =
    oraciones.slice(2).join(" ") ||
    "Definí el primer criterio de orden completando el autodiagnóstico ejecutivo en https://mejoraok.com/diagnostico.";

  return {
    paso1VerdadSinJuzgar: paso1.replace(/^(1\.\s*Dolor:\s*)/i, ""),
    paso2CausaRaizSistema: paso2.replace(/^(2\.\s*Reencuadre:\s*)/i, ""),
    paso3DireccionConcreta: paso3.replace(/^(3\.\s*Direcci[óo]n:\s*)/i, ""),
  };
}

/**
 * Audita determinísticamente un texto contra el Manual de Marca de Mejora Continua
 * y genera la calibración quirúrgica recomendada.
 */
export function auditarBrandVoice(textoInput: string): ResultadoAuditoriaBrandVoice {
  const textoOriginal = (textoInput || "").trim();
  const textoLower = textoOriginal.toLowerCase();

  let sistemaNoPersona = 30;
  let calidezConVerdad = 25;
  let noVenderPorPrecio = 25;
  let estructuraDireccion4D = 20;

  const hallazgos: HallazgoBrandVoice[] = [];
  let textoCalibrado = textoOriginal;

  for (const patron of PATRONES_REGLAS) {
    // Reset regex lastIndex
    patron.regex.lastIndex = 0;
    if (patron.regex.test(textoOriginal)) {
      hallazgos.push({
        id: patron.id,
        regla: patron.regla,
        reglaLabel: patron.reglaLabel,
        severidad: patron.severidad,
        terminoDetectado: patron.terminoLabel,
        explicacionCriterio: patron.explicacion,
        reemplazoSugerido: patron.reemplazo,
      });

      if (patron.regla === "sistema_no_persona") {
        sistemaNoPersona = Math.max(0, sistemaNoPersona - patron.penalizacion);
      } else if (patron.regla === "calidez_con_verdad") {
        calidezConVerdad = Math.max(0, calidezConVerdad - patron.penalizacion);
      } else if (patron.regla === "no_vender_por_precio") {
        noVenderPorPrecio = Math.max(0, noVenderPorPrecio - patron.penalizacion);
      }

      patron.regex.lastIndex = 0;
      textoCalibrado = textoCalibrado.replace(patron.regex, patron.reemplazo);
    }
  }

  const palabras = textoOriginal.split(/\s+/).filter(Boolean);
  const tieneTerminosSistema = TERMINOS_SISTEMA.some((t) => textoLower.includes(t));
  const tieneDireccionConcreta = TERMINOS_DIRECCION.some((t) => textoLower.includes(t));

  if (!tieneTerminosSistema) {
    estructuraDireccion4D = Math.max(0, estructuraDireccion4D - 10);
    hallazgos.push({
      id: "EST-01",
      regla: "estructura_direccion_4d",
      reglaLabel: "4. Estructura Verdad + Sistema + Dirección 4D",
      severidad: "advertencia",
      terminoDetectado: "Ausencia de anclaje en Sistema / Procesos / 4 Dimensiones",
      explicacionCriterio:
        "El mensaje no explicita la causa raíz sistémica (procesos, roles, indicadores o las 4 Dimensiones).",
      reemplazoSugerido:
        "Explicitar que la fricción proviene de la falta de procesos estandarizados en las 4 Dimensiones.",
    });
  }

  if (!tieneDireccionConcreta) {
    estructuraDireccion4D = Math.max(0, estructuraDireccion4D - 10);
    hallazgos.push({
      id: "EST-02",
      regla: "estructura_direccion_4d",
      reglaLabel: "4. Estructura Verdad + Sistema + Dirección 4D",
      severidad: "sugerencia",
      terminoDetectado: "Cierre sin Dirección Concreta (Exposición + Dirección)",
      explicacionCriterio:
        "Toda pieza o respuesta consultiva debe cerrar con un criterio accionable o paso diagnóstico concreto.",
      reemplazoSugerido:
        "Evaluá el nivel de orden de tus procesos en https://mejoraok.com/diagnostico.",
    });
  }

  // Enriquecer el texto calibrado si le faltaba anclaje en sistema o dirección
  const calibradoLower = textoCalibrado.toLowerCase();
  const calibradoTieneSistema = TERMINOS_SISTEMA.some((t) => calibradoLower.includes(t));
  const calibradoTieneDireccion = TERMINOS_DIRECCION.some((t) => calibradoLower.includes(t));

  if (!calibradoTieneSistema) {
    textoCalibrado = `${textoCalibrado} La causa raíz no está en el esfuerzo individual, sino en estructurar procesos y roles claros en las 4 Dimensiones de la empresa.`.trim();
  }
  if (!calibradoTieneDireccion) {
    textoCalibrado = `${textoCalibrado} Evaluá el estado actual de tu sistema operativo en https://mejoraok.com/diagnostico.`.trim();
  }

  const scoreGlobal = Math.max(
    0,
    Math.min(
      100,
      sistemaNoPersona + calidezConVerdad + noVenderPorPrecio + estructuraDireccion4D
    )
  );

  const bloqueantesCount = hallazgos.filter((h) => h.severidad === "bloqueante").length;
  const advertenciasCount = hallazgos.filter((h) => h.severidad !== "bloqueante").length;

  let estadoAprobacion: EstadoAprobacionBrandVoice = "APROBADO_IMPECABLE";
  if (bloqueantesCount > 0 || scoreGlobal < 65) {
    estadoAprobacion = "RECHAZADO_TONO_NO_ALINEADO";
  } else if (scoreGlobal < 90 || hallazgos.length > 0) {
    estadoAprobacion = "APROBADO_CON_AJUSTES";
  }

  // Clasificación en el Cuadrante de Radical Candor (Kim Scott adaptada a Mejora Continua)
  let cuadranteRadicalCandor: CuadranteRadicalCandor = "CALIDEZ_CON_VERDAD";
  let cuadranteLabel = "Calidez con Verdad (Estándar Mejora Continua)";
  let cuadranteDescripcion =
    "Equilibrio exacto: cuida la dignidad del líder mientras señala con rigor técnico la falla en el sistema.";

  if (sistemaNoPersona < 20) {
    cuadranteRadicalCandor = "AGRESION_PUNITIVA";
    cuadranteLabel = "Agresión Punitiva (Ataca a la Persona)";
    cuadranteDescripcion =
      "Desafía pero juzga al individuo en lugar de auditar el proceso. Viola la regla N°1 del Manual de Marca.";
  } else if (noVenderPorPrecio < 20 || calidezConVerdad < 15) {
    cuadranteRadicalCandor = "HUMO_COMERCIAL";
    cuadranteLabel = "Humo Comercial / Venta por Precio";
    cuadranteDescripcion =
      "Apela a promesas mágicas o descuentos impropios de una firma de consultoría directiva B2B.";
  } else if (estructuraDireccion4D < 15) {
    cuadranteRadicalCandor = "COMPLACENCIA_DIFUSA";
    cuadranteLabel = "Empatía Difusa (Sin Dirección de Sistema)";
    cuadranteDescripcion =
      "Es amable pero no expone la causa raíz de los procesos ni entrega un siguiente paso concreto.";
  }

  return {
    scoreGlobal,
    estadoAprobacion,
    cuadranteRadicalCandor,
    cuadranteLabel,
    cuadranteDescripcion,
    puntajesPorPilar: {
      sistemaNoPersona,
      calidezConVerdad,
      noVenderPorPrecio,
      estructuraDireccion4D,
    },
    hallazgos,
    textoOriginal,
    textoCalibradoSugerido: textoCalibrado,
    estructuraTresPasos: extraerEstructuraTresPasos(textoCalibrado),
    metricasTexto: {
      palabrasCount: palabras.length,
      tieneTerminosSistema,
      tieneDireccionConcreta,
      bloqueantesCount,
      advertenciasCount,
    },
  };
}
