/**
 * pipelineCsvExporterEngine.ts
 *
 * Motor Determinista de Exportación y Portabilidad de Datos (CSV RFC 4180 + TSV Google Sheets).
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Fundamentos Teóricos y Estándares:
 * 1. Martin Kleppmann ("Designing Data-Intensive Applications - DDIA"):
 *    - Soberanía de Datos y Portabilidad Inmutable: Extracción determinista de vistas analíticas
 *      derivadas para auditoría externa, respaldo offline y portabilidad sin vendor lock-in.
 * 2. OWASP CSV / Formula Injection Prevention:
 *    - Neutralización preventiva de payloads (=, +, -, @, \t, \r) anteponiendo apóstrofe (').
 * 3. Peter Drucker ("Managing for Results"):
 *    - Disponibilidad inmediata de métricas de negocio en herramientas financieras estándar.
 */

import { type InboxItem } from "@/services/supabase";
import {
  calcularContentRoi,
  type FiltroPeriodoRoi,
} from "./contentRoiEngine";
import {
  calcularExecutiveOperationsMemo,
  formatearMonedaARS,
} from "./executiveOperationsMemoEngine";

export type TipoDatasetExportacion =
  | "embudo_roi"
  | "prospectos_sla"
  | "grilla_editorial_26s"
  | "memo_grove_socios";

export interface FilaProspectoExport {
  id: string;
  fechaCaptura: string;
  autor: string;
  empresa: string;
  canal: string;
  arquetipo: string;
  score: number;
  cuadrante: string;
  estadoSla: string;
  horasTranscurridas: number;
  horasRestantes: number;
  email: string;
  telefono: string;
  valorEstimadoARS: number;
}

export interface FilaGrillaExport {
  id: string;
  semana: number;
  canal: string;
  formato: string;
  buyerPersona: string;
  dimension: string;
  titular: string;
  estado: string;
  scoreStepps: number;
  utmUrl: string;
}

export interface InputExportacionCsv {
  filtroPeriodo?: FiltroPeriodoRoi;
  proposalsCount?: number;
  totalImpressions?: number;
  totalClicks?: number;
  inboxItems?: InboxItem[];
  prospectos?: FilaProspectoExport[];
  piezasGrilla?: FilaGrillaExport[];
  semanaMemo?: number;
  fechaReferencia?: string;
}

export interface ResultadoExportacionCsv {
  tipo: TipoDatasetExportacion;
  titulo: string;
  subtitulo: string;
  nombreArchivo: string;
  headers: string[];
  filas: string[][];
  csvContent: string;
  tsvContent: string;
  resumenMetricas: {
    totalFilas: number;
    totalColumnas: number;
    valorPipelineTotalARS: number;
    fechaGeneracion: string;
  };
}

export interface PaqueteExportacionCsv {
  fechaGeneracion: string;
  nombreArchivoMaestro: string;
  csvMaestroConsolidado: string;
  datasets: Record<TipoDatasetExportacion, ResultadoExportacionCsv>;
}

const UTF8_BOM = "\uFEFF";

/**
 * Neutraliza vectores de CSV / Spreadsheet Formula Injection según guía OWASP.
 * Convierte saltos de línea internos en espacios simples para preservar integridad por fila.
 */
export function sanitizarCeldaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "";
  }
  const raw = String(valor);
  const empiezaConFormula = /^[=+\-@\t\r]/.test(raw);
  const normalizado = raw.replace(/\r\n|\r|\n/g, " ");
  return empiezaConFormula ? `'${normalizado}` : normalizado;
}

/**
 * Formatea y escapa una celda según RFC 4180 para CSV o limpieza tabular para TSV (Google Sheets).
 */
export function escaparCeldaCsv(
  valor: unknown,
  separador: "," | ";" | "\t" = ","
): string {
  const seguro = sanitizarCeldaCsv(valor);

  if (separador === "\t") {
    return seguro.replace(/\t/g, " ");
  }

  const requiereComillas =
    seguro.includes(separador) ||
    seguro.includes('"') ||
    seguro.includes("\n") ||
    seguro.includes("\r");

  if (!requiereComillas) {
    return seguro;
  }

  return `"${seguro.replace(/"/g, '""')}"`;
}

function construirCsvYRfc4180(headers: string[], filas: string[][]): string {
  const lineas = [
    headers.map((h) => escaparCeldaCsv(h, ",")).join(","),
    ...filas.map((fila) => fila.map((c) => escaparCeldaCsv(c, ",")).join(",")),
  ];
  return `${UTF8_BOM}${lineas.join("\r\n")}`;
}

function construirTsvParaSheets(headers: string[], filas: string[][]): string {
  const lineas = [
    headers.map((h) => escaparCeldaCsv(h, "\t")).join("\t"),
    ...filas.map((fila) => fila.map((c) => escaparCeldaCsv(c, "\t")).join("\t")),
  ];
  return lineas.join("\n");
}

function generarProspectosDefault(fechaRef: string): FilaProspectoExport[] {
  return [
    {
      id: "PROS-2026-001",
      fechaCaptura: fechaRef,
      autor: "Martín Echeverría",
      empresa: "Distribuidora Norte S.R.L.",
      canal: "LinkedIn",
      arquetipo: "Dueño Atrapado en la Operación",
      score: 92,
      cuadrante: "CALIFICADO_ALTO",
      estadoSla: "CALIFICADO_EN_SLA",
      horasTranscurridas: 1.2,
      horasRestantes: 46.8,
      email: "martin.e@distribuidoranorte.com.ar",
      telefono: "+54 9 11 5555-0101",
      valorEstimadoARS: 1_800_000,
    },
    {
      id: "PROS-2026-002",
      fechaCaptura: fechaRef,
      autor: "Carolina Méndez",
      empresa: "Metalúrgica Méndez e Hijos",
      canal: "Instagram",
      arquetipo: "2da Generación / Transición Familiar",
      score: 84,
      cuadrante: "CALIFICADO_ALTO",
      estadoSla: "EN_TIEMPO",
      horasTranscurridas: 4.5,
      horasRestantes: 43.5,
      email: "cmendez@metalurgicamendez.com.ar",
      telefono: "+54 9 341 555-0202",
      valorEstimadoARS: 1_800_000,
    },
    {
      id: "PROS-2026-003",
      fechaCaptura: fechaRef,
      autor: "Ricardo Valenzuela",
      empresa: "Logística Integral Cuyo",
      canal: "LinkedIn",
      arquetipo: "Ventas Intuitivas / Sin Pipeline",
      score: 78,
      cuadrante: "CALIFICADO_ALTO",
      estadoSla: "CALIFICADO_EN_SLA",
      horasTranscurridas: 1.8,
      horasRestantes: 46.2,
      email: "rvalenzuela@logisticacuyo.com.ar",
      telefono: "+54 9 261 555-0303",
      valorEstimadoARS: 1_800_000,
    },
    {
      id: "PROS-2026-004",
      fechaCaptura: fechaRef,
      autor: "Lucía Ferreyra",
      empresa: "Laboratorios Litoral",
      canal: "Instagram",
      arquetipo: "Fricción de Calidad y Retrabajos",
      score: 71,
      cuadrante: "CALIFICADO_ALTO",
      estadoSla: "PROXIMO_VENCER",
      horasTranscurridas: 39.0,
      horasRestantes: 9.0,
      email: "lferreyra@lablitoral.com.ar",
      telefono: "+54 9 342 555-0404",
      valorEstimadoARS: 1_800_000,
    },
    {
      id: "PROS-2026-005",
      fechaCaptura: fechaRef,
      autor: "Sebastián Quiroga",
      empresa: "Agrotech Pampa S.A.",
      canal: "Facebook",
      arquetipo: "Dueño Atrapado en la Operación",
      score: 56,
      cuadrante: "EN_NUTRICION",
      estadoSla: "EN_TIEMPO",
      horasTranscurridas: 11.0,
      horasRestantes: 37.0,
      email: "squiroga@agrotechpampa.com.ar",
      telefono: "+54 9 351 555-0505",
      valorEstimadoARS: 0,
    },
    {
      id: "PROS-2026-006",
      fechaCaptura: fechaRef,
      autor: "Valeria Domínguez",
      empresa: "Textil Austral",
      canal: "Instagram",
      arquetipo: "Ventas Intuitivas / Sin Pipeline",
      score: 48,
      cuadrante: "EN_NUTRICION",
      estadoSla: "EN_TIEMPO",
      horasTranscurridas: 16.5,
      horasRestantes: 31.5,
      email: "vdominguez@textilaustral.com.ar",
      telefono: "+54 9 11 5555-0606",
      valorEstimadoARS: 0,
    },
  ];
}

function generarGrillaDefault(): FilaGrillaExport[] {
  const baseUrl = "https://mejoraok.com/diagnostico";
  return [
    {
      id: "PROP-2026-W01-01",
      semana: 1,
      canal: "Instagram",
      formato: "Carrusel PDF 4:5",
      buyerPersona: "Dueño Atrapado en la Operación",
      dimension: "Dimensión Organizacional",
      titular: "Cuando cada problema termina en tu escritorio, el cuello de botella no es tu equipo: es la falta de sistema.",
      estado: "Aprobado",
      scoreStepps: 88,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=dueno_saturado&pieza_id=PROP-2026-W01-01&canal=instagram`,
    },
    {
      id: "PROP-2026-W01-02",
      semana: 1,
      canal: "Facebook",
      formato: "Post 1:1",
      buyerPersona: "2da Generación / Transición Familiar",
      dimension: "Profesionalización",
      titular: "Profesionalizar una empresa familiar sin romper la cultura fundacional exige reglas claras antes que organigramas.",
      estado: "Aprobado",
      scoreStepps: 85,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=segunda_generacion&pieza_id=PROP-2026-W01-02&canal=facebook`,
    },
    {
      id: "PROP-2026-W01-03",
      semana: 1,
      canal: "LinkedIn",
      formato: "Carrusel Document B2B",
      buyerPersona: "Empresario Escéptico / Ventas",
      dimension: "Dimensión Comercial",
      titular: "Tus comerciales bajan el margen apenas el cliente duda porque compiten por precio al no tener proceso consultivo.",
      estado: "Pendiente",
      scoreStepps: 91,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=empresario_mal_asesorado&pieza_id=PROP-2026-W01-03&canal=linkedin`,
    },
    {
      id: "PROP-2026-W02-01",
      semana: 2,
      canal: "Instagram",
      formato: "Reel Vertical 9:16",
      buyerPersona: "Dueño Atrapado en la Operación",
      dimension: "Dimensión Personal",
      titular: "Si no podés tomarte diez días sin el celular prendido, tenés un autoempleo exigente, no una empresa gobernada.",
      estado: "Aprobado",
      scoreStepps: 90,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=dueno_saturado&pieza_id=PROP-2026-W02-01&canal=instagram`,
    },
    {
      id: "PROP-2026-W02-02",
      semana: 2,
      canal: "LinkedIn",
      formato: "Hilo C-Level Zero-Penalty",
      buyerPersona: "Fricción de Calidad y Retrabajos",
      dimension: "Dimensión Empresarial",
      titular: "El costo oculto del retrabajo rara vez figura en el estado de resultados, pero consume hasta el 18% de la capacidad útil.",
      estado: "Aprobado",
      scoreStepps: 87,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=calidad_retrabajos&pieza_id=PROP-2026-W02-02&canal=linkedin`,
    },
    {
      id: "PROP-2026-W02-03",
      semana: 2,
      canal: "Facebook",
      formato: "Placa de Cita 1:1",
      buyerPersona: "Ventas Intuitivas / Sin Pipeline",
      dimension: "Dimensión Comercial",
      titular: "La venta dependiente del dueño tiene techo físico; la venta basada en método escala con el equipo.",
      estado: "Publicado",
      scoreStepps: 84,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=ventas_intuitivas&pieza_id=PROP-2026-W02-03&canal=facebook`,
    },
    {
      id: "PROP-2026-W03-01",
      semana: 3,
      canal: "Instagram",
      formato: "Carrusel PDF 4:5",
      buyerPersona: "Dueño Atrapado en la Operación",
      dimension: "Dimensión Organizacional",
      titular: "Tres señales de que estás gestionando urgencias en lugar de diseñar responsabilidades.",
      estado: "Aprobado",
      scoreStepps: 86,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=dueno_saturado&pieza_id=PROP-2026-W03-01&canal=instagram`,
    },
    {
      id: "PROP-2026-W03-02",
      semana: 3,
      canal: "LinkedIn",
      formato: "Carrusel Document B2B",
      buyerPersona: "2da Generación / Transición Familiar",
      dimension: "Profesionalización",
      titular: "Cómo implementar tableros semanales de 30 minutos para alinear socios sin discusiones subjetivas.",
      estado: "Aprobado",
      scoreStepps: 89,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=segunda_generacion&pieza_id=PROP-2026-W03-02&canal=linkedin`,
    },
    {
      id: "PROP-2026-W03-03",
      semana: 3,
      canal: "Facebook",
      formato: "Post 1:1",
      buyerPersona: "Fricción de Calidad y Retrabajos",
      dimension: "Dimensión Empresarial",
      titular: "Estandarizar no burocratiza: libera criterio directivo para las decisiones que realmente importan.",
      estado: "Pendiente",
      scoreStepps: 82,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=calidad_retrabajos&pieza_id=PROP-2026-W03-03&canal=facebook`,
    },
    {
      id: "PROP-2026-W04-01",
      semana: 4,
      canal: "Instagram",
      formato: "Reel Vertical 9:16",
      buyerPersona: "Ventas Intuitivas / Sin Pipeline",
      dimension: "Dimensión Comercial",
      titular: "Por qué responder consultas B2B antes de las 48 horas duplica la tasa de reunión 1 a 1.",
      estado: "Aprobado",
      scoreStepps: 88,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=ventas_intuitivas&pieza_id=PROP-2026-W04-01&canal=instagram`,
    },
    {
      id: "PROP-2026-W04-02",
      semana: 4,
      canal: "LinkedIn",
      formato: "Hilo C-Level Zero-Penalty",
      buyerPersona: "Dueño Atrapado en la Operación",
      dimension: "Dimensión Personal",
      titular: "Indicadores adelantados vs indicadores tardíos: lo que Andy Grove enseñó sobre gobernar la semana.",
      estado: "Publicado",
      scoreStepps: 93,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=dueno_saturado&pieza_id=PROP-2026-W04-02&canal=linkedin`,
    },
    {
      id: "PROP-2026-W04-03",
      semana: 4,
      canal: "Facebook",
      formato: "Carrusel PDF 4:5",
      buyerPersona: "2da Generación / Transición Familiar",
      dimension: "Dimensión Empresarial",
      titular: "Las 4 Dimensiones de Mejora Continua aplicadas a PyMEs industriales y de servicios.",
      estado: "Aprobado",
      scoreStepps: 86,
      utmUrl: `${baseUrl}?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=segunda_generacion&pieza_id=PROP-2026-W04-03&canal=facebook`,
    },
  ];
}

/**
 * Genera el dataset CSV (RFC 4180 + UTF-8 BOM) y TSV (Google Sheets) para una vista específica.
 */
export function generarCsvDataset(
  tipo: TipoDatasetExportacion,
  input: InputExportacionCsv = {}
): ResultadoExportacionCsv {
  const fechaRef = input.fechaReferencia || new Date().toISOString().split("T")[0];
  const filtro = input.filtroPeriodo || "ultimos_30_dias";
  const roi = calcularContentRoi({
    filtroPeriodo: filtro,
    proposalsCount: input.proposalsCount,
    totalImpressions: input.totalImpressions,
    totalClicks: input.totalClicks,
    inboxItems: input.inboxItems,
  });

  let titulo = "";
  let subtitulo = "";
  let nombreArchivo = "";
  let headers: string[] = [];
  let filas: string[][] = [];
  let valorPipelineTotalARS = roi.metricasTotales.valorTotalPipeline;

  if (tipo === "embudo_roi") {
    titulo = "Embudo B2B & Retorno de Contenido (Content ROI)";
    subtitulo = `Atribución directa desde publicaciones UTMs hasta acuerdos emitidos (${roi.periodoLabel})`;
    nombreArchivo = `MejoraSM_Embudo_ROI_${fechaRef}_${filtro}.csv`;
    headers = [
      "Sección",
      "Etapa / Arquetipo",
      "Descripción / Detalle",
      "Cantidad / Leads",
      "Calificados / Conversión %",
      "Propuestas / % Total",
      "Valor Pipeline (ARS)",
    ];

    const filasEmbudo = roi.etapasEmbudo.map((e) => [
      "Embudo de Conversión",
      e.etapa,
      e.descripcion,
      String(e.cantidad),
      `${e.porcentajeConversionAnterior}%`,
      `${e.porcentajeSobreTotal}%`,
      e.id === "propuestas" ? String(roi.metricasTotales.valorTotalPipeline) : "0",
    ]);

    const filasArquetipos = roi.metricasPorArquetipo.map((a) => [
      "Arquetipo de Dolor",
      a.label,
      `Tasa calificación: ${a.tasaConversion}%`,
      String(a.leadsCount),
      String(a.calificadosCount),
      String(a.propuestasCount),
      String(a.valorPipeline),
    ]);

    const filaTotal = [
      "Resumen Ejecutivo",
      "TOTAL PIPELINE ACTIVO",
      `Cuello de botella: ${roi.diagnosticoEstrategico.cuelloDeBotellaDetectado}`,
      String(roi.metricasTotales.leadsTotales),
      String(roi.metricasTotales.leadsCalificados),
      String(roi.metricasTotales.propuestasEmitidas),
      String(roi.metricasTotales.valorTotalPipeline),
    ];

    filas = [...filasEmbudo, ...filasArquetipos, filaTotal];
  } else if (tipo === "prospectos_sla") {
    const lista =
      input.prospectos && input.prospectos.length > 0
        ? input.prospectos
        : generarProspectosDefault(fechaRef);

    titulo = "Auditoría de Prospectos B2B y Cumplimiento SLA 48h";
    subtitulo = "Trazabilidad Lead-to-CRM con Lead Scoring, arquetipos y semáforo de respuesta";
    nombreArchivo = `MejoraSM_Prospectos_SLA48h_${fechaRef}.csv`;
    headers = [
      "ID Prospecto",
      "Fecha Captura",
      "Decisor / Contacto",
      "Empresa",
      "Canal Origen",
      "Arquetipo de Dolor",
      "Lead Score",
      "Cuadrante",
      "Estado SLA 48h",
      "Horas Respuesta",
      "Email",
      "Teléfono",
      "Pipeline Estimado (ARS)",
    ];

    filas = lista.map((p) => [
      p.id,
      p.fechaCaptura,
      p.autor,
      p.empresa,
      p.canal,
      p.arquetipo,
      String(p.score),
      p.cuadrante,
      p.estadoSla,
      String(p.horasTranscurridas),
      p.email,
      p.telefono,
      String(p.valorEstimadoARS),
    ]);

    valorPipelineTotalARS = lista.reduce((acc, p) => acc + p.valorEstimadoARS, 0);
  } else if (tipo === "grilla_editorial_26s") {
    const piezas =
      input.piezasGrilla && input.piezasGrilla.length > 0
        ? input.piezasGrilla
        : generarGrillaDefault();

    titulo = "Grilla Editorial Evergreen (26 Semanas & Trazabilidad UTM)";
    subtitulo = "Inventario estructurado de piezas con Buyer Persona, Dimensión 4D y Score STEPPS";
    nombreArchivo = `MejoraSM_Grilla_Editorial_26S_${fechaRef}.csv`;
    headers = [
      "ID Pieza",
      "Semana",
      "Canal Destino",
      "Formato",
      "Arquetipo / Buyer Persona",
      "Dimensión 4D",
      "Titular / Gancho",
      "Estado Editorial",
      "Score STEPPS",
      "Link UTM Trazable",
    ];

    filas = piezas.map((g) => [
      g.id,
      String(g.semana),
      g.canal,
      g.formato,
      g.buyerPersona,
      g.dimension,
      g.titular,
      g.estado,
      String(g.scoreStepps),
      g.utmUrl,
    ]);
  } else {
    const semanaMemo = input.semanaMemo ?? 46;
    const memo = calcularExecutiveOperationsMemo({
      semana: semanaMemo,
      fechaEmision: fechaRef,
      proposalsCount: input.proposalsCount,
      clicksUtm: input.totalClicks,
      leadsCount: input.inboxItems?.length || undefined,
    });

    titulo = `Memorando Operativo Ejecutivo de Socios (${memo.semana})`;
    subtitulo = "Indicadores de palanca de Andy Grove, paso limitante y prioridades semanales";
    nombreArchivo = `MejoraSM_Memo_Grove_Socios_W${String(memo.numeroSemana).padStart(2, "0")}_${fechaRef}.csv`;
    headers = [
      "Semana",
      "Categoría Grove",
      "Indicador / Palanca",
      "Valor Actual",
      "Meta / Referencia",
      "Estado Operativo",
      "Paso Limitante / Acción de Trinchera",
    ];

    const filasIndicadores: string[][] = [
      [
        memo.semana,
        "Capacidad Productiva",
        "Publicaciones & Ritmo",
        `${memo.indicadores.publicaciones.publicadas}/${memo.indicadores.publicaciones.planificadas} piezas`,
        "100% cumplimiento semanal",
        `${memo.indicadores.publicaciones.tasaCumplimientoPct}%`,
        memo.pasoLimitante.pasoLimitante,
      ],
      [
        memo.semana,
        "Atribución UTM",
        "Tráfico Directo a Diagnóstico",
        `${memo.indicadores.traficoYAtribucion.clicksUtm} clicks`,
        memo.indicadores.traficoYAtribucion.canalLider,
        `${memo.indicadores.traficoYAtribucion.ratioClickPorPieza} clicks/pieza`,
        memo.pasoLimitante.accionInmediata,
      ],
      [
        memo.semana,
        "Calidad de Demanda",
        "Leads & Decisores Score >= 70",
        `${memo.indicadores.conversionYLeads.calificadosAltos}/${memo.indicadores.conversionYLeads.leadsTotales} leads`,
        ">= 30% decisores C-Level",
        `${memo.indicadores.conversionYLeads.tasaCalificacionPct}%`,
        memo.pasoLimitante.impactoEnNegocio,
      ],
      [
        memo.semana,
        "Gobernanza Comercial",
        "Cumplimiento SLA 48h & Pipeline",
        formatearMonedaARS(memo.indicadores.pipelineEstimadoARS),
        "SLA 100% (< 2h promedio)",
        `${memo.indicadores.saludSla.cumplimientoSlaPct}% SLA (${memo.indicadores.saludSla.promedioRespuestaHoras}h)`,
        memo.alertasYFricciones[0]?.descripcion || "Operación estable",
      ],
    ];

    const filasArquetiposMemo: string[][] = memo.desgloseArquetipos.map((a) => [
      memo.semana,
      "Contribución Arquetipo",
      a.nombre,
      formatearMonedaARS(a.pipelineARS),
      `${a.leads} leads / ${a.calificados} calificados`,
      a.estado,
      "Atribución de trinchera",
    ]);

    const filasPrioridades: string[][] = memo.prioridadesSemanaSiguiente.map((pri, idx) => [
      memo.semana,
      "Prioridad Directora",
      `Prioridad #${idx + 1}`,
      "Foco Semana Entrante",
      "Alta Palanca (Grove)",
      "Activa",
      pri,
    ]);

    filas = [...filasIndicadores, ...filasArquetiposMemo, ...filasPrioridades];
    valorPipelineTotalARS = memo.indicadores.pipelineEstimadoARS;
  }

  const csvContent = construirCsvYRfc4180(headers, filas);
  const tsvContent = construirTsvParaSheets(headers, filas);

  return {
    tipo,
    titulo,
    subtitulo,
    nombreArchivo,
    headers,
    filas,
    csvContent,
    tsvContent,
    resumenMetricas: {
      totalFilas: filas.length,
      totalColumnas: headers.length,
      valorPipelineTotalARS,
      fechaGeneracion: fechaRef,
    },
  };
}

/**
 * Genera el paquete consolidado 4 en 1 con todos los datasets analíticos del sistema.
 */
export function generarPaqueteCsvCompleto(
  input: InputExportacionCsv = {}
): PaqueteExportacionCsv {
  const fechaRef = input.fechaReferencia || new Date().toISOString().split("T")[0];
  const tipos: TipoDatasetExportacion[] = [
    "embudo_roi",
    "prospectos_sla",
    "grilla_editorial_26s",
    "memo_grove_socios",
  ];

  const datasets = {} as Record<TipoDatasetExportacion, ResultadoExportacionCsv>;
  const bloquesCsv: string[] = [];

  for (const tipo of tipos) {
    const res = generarCsvDataset(tipo, { ...input, fechaReferencia: fechaRef });
    datasets[tipo] = res;
    // Remover UTF-8 BOM individual para unir en un único archivo maestro limpio
    const sinBom = res.csvContent.startsWith(UTF8_BOM)
      ? res.csvContent.slice(1)
      : res.csvContent;
    bloquesCsv.push(
      `=== [${res.titulo.toUpperCase()}] (${res.resumenMetricas.totalFilas} filas) ===\r\n${sinBom}`
    );
  }

  return {
    fechaGeneracion: fechaRef,
    nombreArchivoMaestro: `MejoraSM_Reporte_Maestro_4en1_${fechaRef}.csv`,
    csvMaestroConsolidado: `${UTF8_BOM}${bloquesCsv.join("\r\n\r\n")}`,
    datasets,
  };
}
