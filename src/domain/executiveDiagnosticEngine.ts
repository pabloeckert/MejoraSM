/**
 * executiveDiagnosticEngine.ts — Motor de Diagnósticos Ejecutivos B2B
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - Matthew Dixon & Brent Adamson (The Challenger Sale): Reencuadre conceptual,
 *   identificación de costos ocultos y educación constructiva al decisor escéptico.
 * - David Maister (The Trusted Advisor): Ecuación de confianza, máxima credibilidad
 *   y baja orientación propia (foco 100% en el sistema del cliente).
 * - Principios Institucionales de Mejora Continua: Calidez con Verdad, 4 Dimensiones
 *   (Personal, Organizacional, Comercial, Empresarial) y foco exclusivo en acuerdos y procesos.
 */

export type ArquetipoDolor =
  | "fundador_saturado"
  | "segunda_generacion"
  | "estancamiento_comercial"
  | "calidad_entregas";

export interface InputDiagnosticoEjecutivo {
  nombreDirectivo: string;
  empresa?: string;
  cargo?: string;
  arquetipoDolor?: ArquetipoDolor;
  doloresDetectados?: string[];
  scoreLead?: number;
  canalOrigen?: string;
}

export interface CausaRaizFila {
  sintomaVisible: string;
  causaRaizSistemica: string;
  impactoNegocio: string;
}

export interface DimensionIntervencion {
  id: "personal" | "organizacional" | "comercial" | "empresarial";
  nombre: string;
  enfoque: string;
  metaClave: string;
}

export interface Fase90Dias {
  fase: string;
  periodo: string;
  objetivo: string;
  entregable: string;
}

export interface DiagnosticoEjecutivo {
  id: string;
  fechaEmision: string;
  directivo: string;
  empresa: string;
  cargo: string;
  arquetipo: ArquetipoDolor;
  arquetipoLabel: string;
  scoreOportunidad: number;
  reencuadreChallenger: {
    premisaFalsa: string;
    verdadSistemica: string;
    paradojaDirectiva: string;
  };
  matrizCausaRaiz: CausaRaizFila[];
  cuatroDimensiones: DimensionIntervencion[];
  hojaDeRuta90Dias: Fase90Dias[];
  diagnosticoResumenTexto: string; // Formateado para WhatsApp / Email con bullets
  ctaAgendamiento: {
    url: string;
    accion: string;
    nota: string;
  };
}

const DATOS_ARQUETIPOS: Record<
  ArquetipoDolor,
  {
    label: string;
    premisaFalsa: string;
    verdadSistemica: string;
    paradojaDirectiva: string;
    filasCausaRaiz: CausaRaizFila[];
    dimensiones: DimensionIntervencion[];
    fases90Dias: Fase90Dias[];
  }
> = {
  fundador_saturado: {
    label: "Dueño / Fundador Atrapado en la Operación Diaria",
    premisaFalsa:
      "Me faltan horas en el día y mi equipo no tiene el mismo nivel de compromiso que yo.",
    verdadSistemica:
      "No es falta de compromiso ni de horas; es la ausencia de acuerdos operativos explícitos y reglas claras de delegación que hacen que todo dependa de tu memoria.",
    paradojaDirectiva:
      "Cuanto más resolvés de urgencia en la trinchera, más entrenás a tu equipo para no decidir por sí mismo.",
    filasCausaRaiz: [
      {
        sintomaVisible: "Apagar incendios continuos y urgencias desordenadas",
        causaRaizSistemica: "Falta de buffers operativos y criterios de priorización documentados",
        impactoNegocio: "El dueño actúa como bombero reactivo en lugar de arquitecto del negocio.",
      },
      {
        sintomaVisible: "Todas las consultas y compras pasan por el fundador",
        causaRaizSistemica: "Autoridad centralizada sin límites de autonomía definidos por rol",
        impactoNegocio: "Cuello de botella decisional que frena el crecimiento y agota la energía directiva.",
      },
      {
        sintomaVisible: "Imposibilidad de tomar vacaciones sin llamadas urgentes",
        causaRaizSistemica: "Procesos tácitos ('en la cabeza del líder') no transferibles",
        impactoNegocio: "Riesgo existencial de continuidad y saturación personal severa.",
      },
    ],
    dimensiones: [
      {
        id: "personal",
        nombre: "Dimensión Personal",
        enfoque: "Desahogo de la agenda del líder y recuperación de tiempo reflexivo.",
        metaClave: "Liberar 10 a 15 horas semanales de microgestión operativa.",
      },
      {
        id: "organizacional",
        nombre: "Dimensión Organizacional",
        enfoque: "Estandarización de los 3 procesos troncales y traspaso de autoridad.",
        metaClave: "Mandos medios con capacidad de resolución sin intervención del dueño.",
      },
      {
        id: "comercial",
        nombre: "Dimensión Comercial",
        enfoque: "Sistematización de ventas sin depender de la presencia del fundador.",
        metaClave: "Cierre de cuentas predecible con propuestas y precios estructurados.",
      },
      {
        id: "empresarial",
        nombre: "Dimensión Empresarial",
        enfoque: "Gobierno corporativo, tablero de control y previsibilidad financiera.",
        metaClave: "Empresa con valor transferible y margen operativo sostenible.",
      },
    ],
    fases90Dias: [
      {
        fase: "Fase 1",
        periodo: "Días 1 a 30",
        objetivo: "Auditoría de Tiempo Directivo y Mapa de Fricciones Críticas",
        entregable: "Diagnóstico de cuellos de botella y protocolo de urgencias clasificadas.",
      },
      {
        fase: "Fase 2",
        periodo: "Días 31 a 60",
        objetivo: "Rediseño de Procesos Troncales y Acuerdos de Delegación",
        entregable: "Matriz de responsabilidades y límites de decisión por puesto de trabajo.",
      },
      {
        fase: "Fase 3",
        periodo: "Días 61 a 90",
        objetivo: "Tablero de Control de Trinchera y Autonomía Operativa",
        entregable: "Reuniones de seguimiento de 20 minutos y operación desacoplada del dueño.",
      },
    ],
  },

  segunda_generacion: {
    label: "Segunda Generación & Mandos Medios en Transición",
    premisaFalsa:
      "Los colaboradores históricos se resisten a cambiar y la cultura de los fundadores no permite innovar.",
    verdadSistemica:
      "La profesionalización no destruye el legado ni la cultura de los fundadores; la protege, convirtiendo el conocimiento intuitivo en un sistema transferible.",
    paradojaDirectiva:
      "Imponer sistemas por la fuerza genera rechazo; diseñar acuerdos con quienes operan genera adopción natural.",
    filasCausaRaiz: [
      {
        sintomaVisible: "Fricciones entre la vieja guardia y los nuevos criterios de gestión",
        causaRaizSistemica: "Expectativas implícitas y falta de roles formalizados por escrito",
        impactoNegocio: "Desgaste en las relaciones familiares y fuga de mandos jóvenes calificados.",
      },
      {
        sintomaVisible: "Información dispersa en planillas personales o charlas de pasillo",
        causaRaizSistemica: "Ausencia de una única fuente de verdad operativa y métricas compartidas",
        impactoNegocio: "Discusiones basadas en opiniones personales en lugar de datos de trinchera.",
      },
      {
        sintomaVisible: "Dificultad para rendir cuentas con claridad y objetividad",
        causaRaizSistemica: "Falta de indicadores de proceso acordados previamente",
        impactoNegocio: "Evaluaciones percibidas como ataques personales en lugar de revisiones de sistema.",
      },
    ],
    dimensiones: [
      {
        id: "personal",
        nombre: "Dimensión Personal",
        enfoque: "Claridad en el rol de liderazgo y gestión serena del conflicto.",
        metaClave: "Autoridad legitimada por método y claridad, no por jerarquía o apellido.",
      },
      {
        id: "organizacional",
        nombre: "Dimensión Organizacional",
        enfoque: "Protocolos operativos consensuados y documentación visual de trinchera.",
        metaClave: "Procesos estandarizados respetando la mística original de la empresa.",
      },
      {
        id: "comercial",
        nombre: "Dimensión Comercial",
        enfoque: "Modernización del canal de ventas y fidelización sistemática.",
        metaClave: "Trazabilidad de oportunidades con métricas de conversión semanales.",
      },
      {
        id: "empresarial",
        nombre: "Dimensión Empresarial",
        enfoque: "Institucionalización de la mesa de dirección y gobierno familiar/socios.",
        metaClave: "Separación clara entre roles de accionistas, directores y operarios.",
      },
    ],
    fases90Dias: [
      {
        fase: "Fase 1",
        periodo: "Días 1 a 30",
        objetivo: "Mapeo de Acuerdos Cruzados y Puntos de Dolor Intergeneracionales",
        entregable: "Documento de alineación directiva y código de convivencia operativa.",
      },
      {
        fase: "Fase 2",
        periodo: "Días 31 a 60",
        objetivo: "Estandarización de Rutinas Operativas y Fuentes de Información",
        entregable: "Sistema unificado de métricas operativas y rutinas de equipo semanales.",
      },
      {
        fase: "Fase 3",
        periodo: "Días 61 a 90",
        objetivo: "Consolidación de la Mesa de Dirección y Rendición por Procesos",
        entregable: "Comité de gestión autónomo con reuniones directivas eficaces.",
      },
    ],
  },

  estancamiento_comercial: {
    label: "Empresa con Buen Producto pero Proceso Comercial Intuitivo",
    premisaFalsa:
      "El mercado está difícil o los vendedores no tienen suficiente agresividad comercial.",
    verdadSistemica:
      "El problema rara vez es el mercado; es la falta de un proceso comercial repetible con calificación temprana de prospectos y SLAs estrictos de respuesta.",
    paradojaDirectiva:
      "Cotizar a cualquiera satura al equipo técnico y reduce drásticamente la tasa de cierre.",
    filasCausaRaiz: [
      {
        sintomaVisible: "Ingresos en serrucho: meses récord seguidos de meses con caja vacía",
        causaRaizSistemica: "Las ventas dependen de picos de atención del dueño y no de un flujo constante",
        impactoNegocio: "Inestabilidad financiera, estrés recurrente y dificultad para planificar inversiones.",
      },
      {
        sintomaVisible: "Decenas de presupuestos entregados que quedan en la nada ('lo estamos viendo')",
        causaRaizSistemica: "Falta de un filtro estricto de cliente ideal y criterios de calificación previa",
        impactoNegocio: "Cientos de horas técnicas desperdiciadas presupuestando a curiosos o sin presupuesto.",
      },
      {
        sintomaVisible: "Desacople entre lo prometido por ventas y lo que operaciones puede entregar",
        causaRaizSistemica: "Falta de acuerdos de nivel de servicio (SLA) internos entre áreas",
        impactoNegocio: "Urgencias operativas, quejas de clientes y sobrecostos por retrabajos de campo.",
      },
    ],
    dimensiones: [
      {
        id: "personal",
        nombre: "Dimensión Personal",
        enfoque: "Salida del dueño de la venta transaccional diaria.",
        metaClave: "El fundador actúa como consultor de confianza sólo en cuentas estratégicas.",
      },
      {
        id: "organizacional",
        nombre: "Dimensión Organizacional",
        enfoque: "Alineación comercial-operativa con entrega garantizada en tiempo y forma.",
        metaClave: "Entregas en plazo (OTIF) superiores al 95% sin caos interno.",
      },
      {
        id: "comercial",
        nombre: "Dimensión Comercial",
        enfoque: "Embudo B2B con etapas claras, matriz de scoring y SLA de contacto < 2h.",
        metaClave: "Tasa de conversión de propuesta a cliente superior al 35%.",
      },
      {
        id: "empresarial",
        nombre: "Dimensión Empresarial",
        enfoque: "Previsibilidad de caja e ingresos recurrentes mediante contratos de servicio.",
        metaClave: "Cartera comercial diversificada sin dependencia de un único cliente grande.",
      },
    ],
    fases90Dias: [
      {
        fase: "Fase 1",
        periodo: "Días 1 a 30",
        objetivo: "Estandarización de la Oferta de Alto Valor y Criterios de Calificación",
        entregable: "Matriz de Lead Scoring y protocolo de primera respuesta comercial.",
      },
      {
        fase: "Fase 2",
        periodo: "Días 31 a 60",
        objetivo: "Implementación del Proceso Comercial en 4 Etapas y SLAs",
        entregable: "Embudo comercial activo con plantillas consultivas y seguimiento riguroso.",
      },
      {
        fase: "Fase 3",
        periodo: "Días 61 a 90",
        objetivo: "Acuerdos de Entrega Comercial-Operación y Tablero de Conversión",
        entregable: "Ritual semanal de alineación ventas-operaciones y previsibilidad de ingresos.",
      },
    ],
  },

  calidad_entregas: {
    label: "Desorden Operativo, Demoras y Retrabajos Frecuentes",
    premisaFalsa:
      "La gente no presta atención a los detalles o comete errores por falta de interés.",
    verdadSistemica:
      "Nadie va a trabajar con ganas de equivocarse: los errores nacen de procesos ambiguos, herramientas inadecuadas o instrucciones verbales no estandarizadas.",
    paradojaDirectiva:
      "Retar a las personas por un error sólo logra que oculten el próximo problema en lugar de avisarlo a tiempo.",
    filasCausaRaiz: [
      {
        sintomaVisible: "Retrabajos frecuentes y reclamos de clientes por fallas de calidad",
        causaRaizSistemica: "Puntos de control preventivo ausentes en las etapas intermedias del proceso",
        impactoNegocio: "Erosión directa del margen de rentabilidad y daño a la reputación corporativa.",
      },
      {
        sintomaVisible: "Demoras crónicas respecto a las fechas de entrega prometidas",
        causaRaizSistemica: "Cuellos de botella ocultos y asignación informal de cargas de trabajo",
        impactoNegocio: "Descrédito comercial y necesidad de horas extras costosas e ineficientes.",
      },
      {
        sintomaVisible: "Cada persona hace el trabajo a su manera sin un criterio homogéneo",
        causaRaizSistemica: "Inexistencia de un estándar visual claro y consensuado con el equipo",
        impactoNegocio: "Variabilidad incontrolable del resultado final y dependencia de operarios clave.",
      },
    ],
    dimensiones: [
      {
        id: "personal",
        nombre: "Dimensión Personal",
        enfoque: "Liderazgo de facilitación: foco en quitar obstáculos en lugar de sancionar.",
        metaClave: "Cultura de seguridad psicológica para reportar fallas en el minuto cero.",
      },
      {
        id: "organizacional",
        nombre: "Dimensión Organizacional",
        enfoque: "Estandarización visual de trinchera y rutinas de autocontrol en cada puesto.",
        metaClave: "Reducción del 70% en retrabajos mediante listas de chequeo simples.",
      },
      {
        id: "comercial",
        nombre: "Dimensión Comercial",
        enfoque: "Capacidad de promesa realista basada en la cadencia real de la operación.",
        metaClave: "Cero promesas de entrega incompatibles con la capacidad de planta.",
      },
      {
        id: "empresarial",
        nombre: "Dimensión Empresarial",
        enfoque: "Aumento de rentabilidad por eliminación de desperdicios y horas extras.",
        metaClave: "Incremento del margen bruto entre 4 y 8 puntos porcentuales.",
      },
    ],
    fases90Dias: [
      {
        fase: "Fase 1",
        periodo: "Días 1 a 30",
        objetivo: "Mapeo de Flujo de Operación y Detección de Fugas de Calidad",
        entregable: "Diagrama de flujo de trinchera con identificación de los 3 puntos críticos de falla.",
      },
      {
        fase: "Fase 2",
        periodo: "Días 31 a 60",
        objetivo: "Estandarización de Métodos y Puntos de Control Intermedios",
        entregable: "Guías visuales de 1 página y protocolo de autocontrol por puesto.",
      },
      {
        fase: "Fase 3",
        periodo: "Días 61 a 90",
        objetivo: "Métricas de Calidad en Tiempo Real y Rutinas de Mejora Diaria",
        entregable: "Tablero visual de planta/oficina con reuniones diarias de 10 minutos (Stand-up).",
      },
    ],
  },
};

/**
 * Infiere el arquetipo de dolor a partir de síntomas detectados o texto
 */
export function inferirArquetipoDolor(
  texto: string,
  doloresDetectados: string[] = []
): ArquetipoDolor {
  const t = `${texto} ${doloresDetectados.join(" ")}`.toLowerCase();

  if (
    t.includes("generación") ||
    t.includes("generacion") ||
    t.includes("familiar") ||
    t.includes("fundadores") ||
    t.includes("históricos") ||
    t.includes("historicos")
  ) {
    return "segunda_generacion";
  }

  if (
    t.includes("ventas") ||
    t.includes("comercial") ||
    t.includes("cotizaciones") ||
    t.includes("presupuesto") ||
    t.includes("precio") ||
    t.includes("clientes nuevos")
  ) {
    return "estancamiento_comercial";
  }

  if (
    t.includes("calidad") ||
    t.includes("retrabajo") ||
    t.includes("error") ||
    t.includes("demoras") ||
    t.includes("reclamo") ||
    t.includes("taller") ||
    t.includes("planta")
  ) {
    return "calidad_entregas";
  }

  // Por defecto para dueños saturados
  return "fundador_saturado";
}

/**
 * Genera el diagnóstico ejecutivo estructurado en base a las premisas de The Challenger Sale
 */
export function generarDiagnosticoEjecutivo(
  input: InputDiagnosticoEjecutivo
): DiagnosticoEjecutivo {
  const directivo = input.nombreDirectivo?.trim() || "Colega Directivo";
  const empresa = input.empresa?.trim() || "Empresa PyME en Expansión";
  const cargo = input.cargo?.trim() || "Director General / Socio Gerente";

  const arquetipo =
    input.arquetipoDolor ||
    inferirArquetipoDolor(
      `${input.nombreDirectivo} ${input.empresa || ""}`,
      input.doloresDetectados
    );

  const datos = DATOS_ARQUETIPOS[arquetipo];
  const scoreOportunidad = Math.min(100, Math.max(30, input.scoreLead ?? 85));

  const id = `DIAG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  const fechaEmision = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Generar resumen formateado para compartir directamente por WhatsApp o Email
  const resumenTexto = `*Diagnóstico Preliminar Directivo — Mejora Continua*
_Preparado exclusivamente para ${directivo} (${empresa})_

*1. El Reencuadre Sistémico:*
"${datos.verdadSistemica}"
_Paradoja:_ ${datos.paradojaDirectiva}

*2. Causa Raíz Identificada en Trinchera:*
${datos.filasCausaRaiz
  .map(
    (f, i) =>
      `• *${f.sintomaVisible}:* ${f.causaRaizSistemica}. _Impacto:_ ${f.impactoNegocio}`
  )
  .join("\n")}

*3. Plan de Desahogo a 90 Días:*
${datos.fases90Dias.map((p) => `• *${p.fase} (${p.periodo}):* ${p.objetivo} — _${p.entregable}_`).join("\n")}

*4. Próximo Paso Recomendado:*
Para analizar la arquitectura de acuerdos y flujos de trabajo de tu empresa en una sesión 1 a 1 de 45 minutos (sin juicio a las personas), podés agendar tu sesión de devolución directiva acá:
https://mejoraok.com/diagnostico?ref=${id}
`;

  return {
    id,
    fechaEmision,
    directivo,
    empresa,
    cargo,
    arquetipo,
    arquetipoLabel: datos.label,
    scoreOportunidad,
    reencuadreChallenger: {
      premisaFalsa: datos.premisaFalsa,
      verdadSistemica: datos.verdadSistemica,
      paradojaDirectiva: datos.paradojaDirectiva,
    },
    matrizCausaRaiz: datos.filasCausaRaiz,
    cuatroDimensiones: datos.dimensiones,
    hojaDeRuta90Dias: datos.fases90Dias,
    diagnosticoResumenTexto: resumenTexto,
    ctaAgendamiento: {
      url: `https://mejoraok.com/diagnostico?ref=${id}`,
      accion: "Agendar Sesión de Devolución Directiva 1 a 1",
      nota: "Sesión de 45 minutos con Pablo Eckert. Análisis confidencial de arquitectura de procesos.",
    },
  };
}
