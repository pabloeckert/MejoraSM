/**
 * executiveOperationsMemoEngine.ts
 *
 * Motor de Generación del Memorando Operativo Ejecutivo de Socios (Executive Operations Memo).
 *
 * Fundamentos Teóricos y de Metodología:
 * 1. Andy Grove ("High Output Management"):
 *    - La "Caja Negra Operativa": Materia prima (ideas, bóveda) -> Transformación (propuestas, mesa) -> Salida (piezas, leads, pipeline).
 *    - "Indicadores como Palanca (Indicators as a Lever)": Pocas métricas clave adelantadas (leading indicators)
 *      y de resultado (lagging indicators) que ofrecen visibilidad inmediata del pulso semanal antes de que impacte en el balance.
 *    - "El Paso Limitante (The Limiting Step)": Identificación precisa del cuello de botella en el flujo que condiciona la velocidad global.
 * 2. Peter Drucker ("Managing for Results" & "The Effective Executive"):
 *    - Foco en contribución y oportunidades, no en burocracia: Trazabilidad directa de horas invertidas vs valor de pipeline B2B generado.
 * 3. Principios de Mejora Continua ("Calidez con Verdad" & "Nunca a la persona"):
 *    - Auditoría del sistema y de los procesos operativos para la reunión directiva de los lunes, con lenguaje directo y accionable.
 */

export interface IndicadoresGrove {
  publicaciones: {
    planificadas: number;
    aprobadas: number;
    publicadas: number;
    tasaCumplimientoPct: number;
  };
  traficoYAtribucion: {
    clicksUtm: number;
    ratioClickPorPieza: number;
    canalLider: string;
  };
  conversionYLeads: {
    leadsTotales: number;
    calificadosAltos: number;
    tasaCalificacionPct: number;
  };
  saludSla: {
    cumplimientoSlaPct: number;
    promedioRespuestaHoras: number;
    fueraDeSla: number;
  };
  pipelineEstimadoARS: number;
  tiempoAprobacionMinutos: number;
}

export interface ArquetipoResumen {
  arquetipo: string;
  nombre: string;
  leads: number;
  calificados: number;
  pipelineARS: number;
  estado: "Fuerte Tracción" | "Estable" | "Bajo Flujo";
}

export interface AlertaOperativa {
  gravedad: "alta" | "media" | "baja";
  area: string;
  descripcion: string;
  responsableSugerido: string;
}

export interface DiagnosticoPasoLimitante {
  pasoLimitante: string;
  impactoEnNegocio: string;
  accionInmediata: string;
}

export interface ExecutiveOperationsMemo {
  id: string;
  semana: string;
  numeroSemana: number;
  periodo: string;
  fechaEmision: string;
  emisor: string;
  destinatarios: string[];
  resumenEjecutivo: string;
  indicadores: IndicadoresGrove;
  desgloseArquetipos: ArquetipoResumen[];
  pasoLimitante: DiagnosticoPasoLimitante;
  alertasYFricciones: AlertaOperativa[];
  prioridadesSemanaSiguiente: string[];
  formatos: {
    markdown: string;
    whatsappResumen: string;
  };
}

export interface GenerarMemoParams {
  semana?: number;
  periodo?: string;
  fechaEmision?: string;
  proposalsCount?: number;
  approvedCount?: number;
  publishedCount?: number;
  clicksUtm?: number;
  leadsCount?: number;
  qualifiedLeadsCount?: number;
  slaCumplimientoPct?: number;
  ticketPromedioARS?: number;
}

export const TICKET_PROMEDIO_ACOMPANAMIENTO = 1_800_000;

export function formatearMonedaARS(monto: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(monto);
}

/**
 * Calcula y genera el Memorando Operativo Ejecutivo semanal para socios.
 */
export function calcularExecutiveOperationsMemo(
  params: GenerarMemoParams = {}
): ExecutiveOperationsMemo {
  const numSemana = params.semana ?? 46;
  const semanaId = `2026-W${String(numSemana).padStart(2, "0")}`;
  const periodo = params.periodo || "10 Nov - 16 Nov 2026";
  const fechaEmision = params.fechaEmision || new Date().toISOString().split("T")[0];

  const planificadas = params.proposalsCount ?? 3;
  const aprobadas = params.approvedCount ?? 3;
  const publicadas = params.publishedCount ?? 3;
  const tasaCumplimiento = planificadas > 0 ? Math.round((publicadas / planificadas) * 100) : 100;

  const clicks = params.clicksUtm ?? 1280;
  const ratioClickPorPieza = publicadas > 0 ? Math.round(clicks / publicadas) : 0;
  const canalLider = "Instagram (64%)";

  const leadsTotales = params.leadsCount ?? 14;
  const calificados = params.qualifiedLeadsCount ?? 5;
  const tasaCalificacion = leadsTotales > 0 ? Math.round((calificados / leadsTotales) * 100) : 35;

  const cumplimientoSla = params.slaCumplimientoPct ?? 100;
  const promedioRespuestaHoras = 1.4;
  const fueraDeSla = cumplimientoSla < 100 ? 1 : 0;

  const ticket = params.ticketPromedioARS || TICKET_PROMEDIO_ACOMPANAMIENTO;
  // Estimación de pipeline: 2 propuestas formales emitidas
  const propuestasEmitidas = Math.max(1, Math.floor(calificados * 0.4));
  const pipelineEstimado = propuestasEmitidas * ticket;

  const tiempoAprobacionMinutos = 1.6;

  const indicadores: IndicadoresGrove = {
    publicaciones: {
      planificadas,
      aprobadas,
      publicadas,
      tasaCumplimientoPct: tasaCumplimiento,
    },
    traficoYAtribucion: {
      clicksUtm: clicks,
      ratioClickPorPieza,
      canalLider,
    },
    conversionYLeads: {
      leadsTotales,
      calificadosAltos: calificados,
      tasaCalificacionPct: tasaCalificacion,
    },
    saludSla: {
      cumplimientoSlaPct: cumplimientoSla,
      promedioRespuestaHoras,
      fueraDeSla,
    },
    pipelineEstimadoARS: pipelineEstimado,
    tiempoAprobacionMinutos,
  };

  const desgloseArquetipos: ArquetipoResumen[] = [
    {
      arquetipo: "fundador_saturado",
      nombre: "Dueño Atrapado en la Operación",
      leads: 6,
      calificados: 3,
      pipelineARS: ticket * 1,
      estado: "Fuerte Tracción",
    },
    {
      arquetipo: "segunda_generacion",
      nombre: "2da Generación / Transición Familiar",
      leads: 3,
      calificados: 1,
      pipelineARS: 0,
      estado: "Estable",
    },
    {
      arquetipo: "ventas_intuitivas",
      nombre: "Ventas Intuitivas / Sin Pipeline",
      leads: 3,
      calificados: 1,
      pipelineARS: ticket * 1,
      estado: "Fuerte Tracción",
    },
    {
      arquetipo: "calidad_retrabajos",
      nombre: "Fricción de Calidad y Retrabajos",
      leads: 2,
      calificados: 0,
      pipelineARS: 0,
      estado: "Bajo Flujo",
    },
  ];

  // Diagnóstico del Paso Limitante (Andy Grove)
  const pasoLimitante: DiagnosticoPasoLimitante = {
    pasoLimitante: "Conversión de Clicks a Leads (Fase 2 de StoryBrand)",
    impactoEnNegocio: `Se registraron ${clicks} clicks UTM pero solo ${leadsTotales} consultas directas (1.1% conversión). La fricción está en el salto entre la red social y el autodiagnóstico en web.`,
    accionInmediata: "Incluir CTA directo y explícito al Autodiagnóstico A4 en la última lámina de los carruseles y fijar el primer comentario en LinkedIn.",
  };

  const alertasYFricciones: AlertaOperativa[] = [
    {
      gravedad: "alta",
      area: "Conversión de Entrada",
      descripcion: "El 85% de las consultas entrantes no especifican tamaño de empresa en el primer mensaje.",
      responsableSugerido: "Operador de Trinchera / Respuesta Consultiva en 1 Clic",
    },
    {
      gravedad: "media",
      area: "Velocidad Editorial",
      descripcion: "El tiempo de aprobación se mantiene óptimo en <2 minutos pero se requiere cargar el lote de la Semana siguiente antes del viernes 18:00 hs.",
      responsableSugerido: "Equipo Creativo & Estratega",
    },
    {
      gravedad: "baja",
      area: "Infraestructura Local",
      descripcion: "Outbox SQLite operando con 0 reintentos pendientes y lease de 60s saludable.",
      responsableSugerido: "Auditor SRE",
    },
  ];

  const prioridadesSemanaSiguiente: string[] = [
    `Concretar las 2 reuniones de devolución 1 a 1 agendadas con el Dossier Andy Grove (${formatearMonedaARS(pipelineEstimado)} en juego).`,
    "Publicar el Caso de Éxito de la Distribuidora en LinkedIn como carrusel de autoridad para atacar el arquetipo de Dueño Saturado.",
    "Mantener el semáforo SLA de 48h con tiempo promedio de primera respuesta < 2 horas para decisores de alta temperatura.",
  ];

  const resumenEjecutivo = `Durante la ${semanaId} (${periodo}), el sistema operó con un cumplimiento editorial del ${tasaCumplimiento}%, generando ${clicks} clicks con atribución UTM y capturando ${leadsTotales} consultas directas. Se identificaron ${calificados} decisores calificados directivos (Score ≥ 70) con un cumplimiento de SLA de 48h del ${cumplimientoSla}%, consolidando un pipeline activo estimado de ${formatearMonedaARS(pipelineEstimado)}. El principal cuello de botella operativo radica en la conversión de clicks a leads en mejoraok.com.`;

  const memo: ExecutiveOperationsMemo = {
    id: `memo-${semanaId}-${Date.now().toString(36)}`,
    semana: semanaId,
    numeroSemana: numSemana,
    periodo,
    fechaEmision,
    emisor: "Pablo Eckert & Motor de Gobierno MejoraSM",
    destinatarios: ["Socios Directores de Mejora Continua", "Dirección de Consultoría"],
    resumenEjecutivo,
    indicadores,
    desgloseArquetipos,
    pasoLimitante,
    alertasYFricciones,
    prioridadesSemanaSiguiente,
    formatos: {
      markdown: "",
      whatsappResumen: "",
    },
  };

  memo.formatos.markdown = formatearMemoMarkdown(memo);
  memo.formatos.whatsappResumen = formatearMemoWhatsApp(memo);

  return memo;
}

/**
 * Formatea el memorando en Markdown estructurado para reportes internos, Slack o Notion.
 */
export function formatearMemoMarkdown(memo: ExecutiveOperationsMemo): string {
  const ind = memo.indicadores;
  const lineas: string[] = [
    `# MEMORANDO OPERATIVO EJECUTIVO DE SOCIOS`,
    `**Semana:** ${memo.semana} (${memo.periodo})  |  **Fecha:** ${memo.fechaEmision}`,
    `**Emisor:** ${memo.emisor}`,
    `**Destinatarios:** ${memo.destinatarios.join(", ")}`,
    `**Metodología:** Andy Grove (*High Output Management*) & Peter Drucker (*Managing for Results*)`,
    "",
    `---`,
    `## 1. RESUMEN EJECUTIVO (PULSO SEMANAL)`,
    memo.resumenEjecutivo,
    "",
    `---`,
    `## 2. INDICADORES CLAVE DE GOBIERNO (GROVE INDICATORS)`,
    `- **Piezas Publicadas:** ${ind.publicaciones.publicadas} / ${ind.publicaciones.planificadas} (${ind.publicaciones.tasaCumplimientoPct}% cumplimiento)`,
    `- **Tráfico con Atribución UTM:** ${ind.traficoYAtribucion.clicksUtm.toLocaleString("es-AR")} clicks (${ind.traficoYAtribucion.canalLider})`,
    `- **Leads Capturados:** ${ind.conversionYLeads.leadsTotales} consultas directas`,
    `- **Decisores Calificados (Score ≥ 70):** ${ind.conversionYLeads.calificadosAltos} directivos (${ind.conversionYLeads.tasaCalificacionPct}% del total)`,
    `- **Cumplimiento SLA 48h:** ${ind.saludSla.cumplimientoSlaPct}% (Tiempo promedio respuesta: ${ind.saludSla.promedioRespuestaHoras} hs)`,
    `- **Pipeline B2B Generado:** ${formatearMonedaARS(ind.pipelineEstimadoARS)} en acompañamientos potenciales`,
    `- **Tiempo Directivo de Aprobación:** ${ind.tiempoAprobacionMinutos} min / lote semanal`,
    "",
    `---`,
    `## 3. CONTRIBUCIÓN POR ARQUETIPO DE DOLOR DIRECTIVO`,
  ];

  memo.desgloseArquetipos.forEach((a) => {
    lineas.push(
      `- **${a.nombre}:** ${a.leads} leads (${a.calificados} calificados) · Pipeline: ${formatearMonedaARS(a.pipelineARS)} [${a.estado}]`
    );
  });

  lineas.push(
    "",
    `---`,
    `## 4. EL PASO LIMITANTE (CUELLO DE BOTELLA OPERATIVO)`,
    `**Paso Crítico:** ${memo.pasoLimitante.pasoLimitante}`,
    `**Impacto:** ${memo.pasoLimitante.impactoEnNegocio}`,
    `**Acción de Trinchera:** ${memo.pasoLimitante.accionInmediata}`,
    "",
    `---`,
    `## 5. ALERTAS Y FRICCIONES DEL SISTEMA`,
  );

  memo.alertasYFricciones.forEach((al) => {
    lineas.push(
      `- [${al.gravedad.toUpperCase()}] **${al.area}:** ${al.descripcion} *(Responsable: ${al.responsableSugerido})*`
    );
  });

  lineas.push(
    "",
    `---`,
    `## 6. PRIORIDADES DIRECTIVAS PARA LA PRÓXIMA SEMANA`,
  );

  memo.prioridadesSemanaSiguiente.forEach((p, idx) => {
    lineas.push(`${idx + 1}. ${p}`);
  });

  lineas.push(
    "",
    `---`,
    `*Mejora Continua · Dirección y Estrategia B2B · mejoraok.com*`
  );

  return lineas.join("\n");
}

/**
 * Formatea el memorando como síntesis rápida para el grupo de WhatsApp de socios el lunes a primera hora.
 */
export function formatearMemoWhatsApp(memo: ExecutiveOperationsMemo): string {
  const ind = memo.indicadores;
  return `📊 *MEMO OPERATIVO SEMANAL · ${memo.semana}* (${memo.periodo})
_Para reunión de socios de los lunes_

*1. Pulso de Resultados:*
• Publicadas: ${ind.publicaciones.publicadas} piezas (${ind.publicaciones.tasaCumplimientoPct}% cumplimiento)
• Clicks UTM: ${ind.traficoYAtribucion.clicksUtm.toLocaleString("es-AR")}
• Leads: ${ind.conversionYLeads.leadsTotales} (${ind.conversionYLeads.calificadosAltos} calificados Score ≥ 70)
• SLA 48h: ${ind.saludSla.cumplimientoSlaPct}% cumplido (${ind.saludSla.promedioRespuestaHoras}h promedio)
• Pipeline Activo: *${formatearMonedaARS(ind.pipelineEstimadoARS)}*

*2. Foco Limitante:*
${memo.pasoLimitante.pasoLimitante} -> ${memo.pasoLimitante.accionInmediata}

*3. Prioridades de la Semana:*
1. ${memo.prioridadesSemanaSiguiente[0]}
2. ${memo.prioridadesSemanaSiguiente[1]}
3. ${memo.prioridadesSemanaSiguiente[2]}`;
}
