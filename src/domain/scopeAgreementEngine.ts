/**
 * scopeAgreementEngine.ts — Motor de Acuerdos de Alcance y Propuestas B2B
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - David Maister (The Trusted Advisor): La propuesta como confirmación de entendimiento
 *   mutuo, sin jerga de ventas; foco en el diagnóstico del cliente y límites claros.
 * - Andy Grove (High Output Management): Apalancamiento gerencial, fases con hitos medibles,
 *   indicadores de trinchera y rutinas de autocontrol en planta y oficina.
 * - Alexander Osterwalder (Value Proposition Design): Ajuste problema-solución estructurado
 *   en entregables por dimensión (Personal, Organizacional, Comercial, Empresarial).
 * - Alan Weiss (Value-Based Fees): Inversión acotada al valor sistémico protegido y desbloqueado.
 * - Principios Institucionales de Mejora Continua: Calidez con Verdad, 4 Dimensiones,
 *   procesos claros que independizan la operación de las personas clave.
 */

import { ArquetipoDolor } from "./executiveDiagnosticEngine";

export interface InputAcuerdoAlcance {
  nombreDirectivo: string;
  empresa?: string;
  cargo?: string;
  canal?: string;
  arquetipoDolor?: ArquetipoDolor | string;
  doloresDetectados?: string[];
  mesesDuracion?: number; // 3 o 6 meses
  modalidad?: "Hibrida (Trinchera + Remoto)" | "Presencial Intensiva" | "Acompañamiento Remoto";
  fechaPropuesta?: string;
  honorariosMensuales?: string;
}

export interface FaseAlcance {
  fase: string;
  periodo: string;
  nombre: string;
  objetivoPrincipal: string;
  entregables: string[];
  hitoValidacion: string;
}

export interface EntregableDimension {
  dimension: "Personal" | "Organizacional" | "Comercial" | "Empresarial";
  titulo: string;
  detalle: string;
  impactoEsperado: string;
}

export interface CompromisoMutuo {
  actor: "Mejora Continua (Equipo Consultor)" | "La Dirección y el Equipo de la Empresa";
  compromisos: string[];
}

export interface EsquemaInversion {
  modalidad: string;
  duracionMeses: number;
  inversionMensual: string;
  condicionesFacturacion: string;
  garantiaCompromiso: string;
  proximoPasoInicio: string;
}

export interface AcuerdoAlcance {
  idAcuerdo: string;
  fechaEmision: string;
  validezDias: number;
  directivo: string;
  empresa: string;
  cargo: string;
  canal: string;
  arquetipo: ArquetipoDolor;
  arquetipoLabel: string;
  diagnosticoSituacional: string;
  objetivoGeneral: string;
  fasesIntervencion: FaseAlcance[];
  entregablesPorDimension: EntregableDimension[];
  compromisosMutuos: CompromisoMutuo[];
  esquemaInversion: EsquemaInversion;
  resumenWhatsApp: string;
}

interface DatosArquetipoAcuerdo {
  label: string;
  diagnosticoSituacional: (dir: string, emp: string) => string;
  objetivoGeneral: (emp: string) => string;
  fases: FaseAlcance[];
  entregables4D: EntregableDimension[];
  inversionMensualSugerida: string;
}

const DATOS_ARQUETIPOS_ACUERDO: Record<ArquetipoDolor, DatosArquetipoAcuerdo> = {
  fundador_saturado: {
    label: "Dueño / Fundador Atrapado en la Operación Diaria",
    diagnosticoSituacional: (dir, emp) =>
      `En ${emp}, el fundador (${dir}) asume el rol de único resolvedor de contingencias operativas, centralizando consultas, aprobaciones de compras y decisiones menores. Esta dinámica genera un cuello de botella que agota la energía directiva, limita el crecimiento y deja al negocio vulnerable ante ausencias del líder.`,
    objetivoGeneral: (emp) =>
      `Descentralizar la operación de ${emp} mediante la formalización de acuerdos de delegación, tableros visuales de control y rutinas de trinchera que devuelvan al fundador al menos 15 horas semanales para dedicarse a la dirección estratégica.`,
    fases: [
      {
        fase: "Fase 1",
        periodo: "Mes 1 (Semanas 1 a 4)",
        nombre: "Mapeo de Trinchera & Desahogo de Urgencias",
        objetivoPrincipal: "Auditar los flujos reales de piso y cortar de raíz las interrupciones diarias al fundador.",
        entregables: [
          "Matriz de Delegación y Límites de Autonomía por Puesto de Mando.",
          "Protocolo de 'Filtro de Urgencias' para resolver contingencias sin consultar al dueño.",
          "Gemba Walk inicial: Mapeo de los 3 puntos de fuga de tiempo más severos.",
        ],
        hitoValidacion: "Primera semana completa del fundador sin responder consultas operativas básicas.",
      },
      {
        fase: "Fase 2",
        periodo: "Mes 2 (Semanas 5 a 8)",
        nombre: "Estandarización de Procesos y Acuerdos de Área",
        objetivoPrincipal: "Documentar en fichas visuales de 1 página los estándares críticos que hoy están solo en la cabeza del líder.",
        entregables: [
          "Manual Operativo Visual de 5 Procesos Core (Checklists de apertura/cierre y entrega).",
          "Tablero Físico/Digital de Estado de Pedidos y Trabajos en Curso.",
          "Entrenamiento a Mandos Medios en Gestión Autónoma de Contingencias.",
        ],
        hitoValidacion: "El equipo resuelve el 80% de las desviaciones de calidad aplicando los acuerdos de piso.",
      },
      {
        fase: "Fase 3",
        periodo: "Mes 3 (Semanas 9 a 12)",
        nombre: "Rutinas de Stand-up & Transferencia de Autonomía",
        objetivoPrincipal: "Instalar el pulso diario de mejora continua sin dependencia de la consultoría.",
        entregables: [
          "Rutina Diaria de 10 minutos (Daily Stand-up) liderada por mandos medios.",
          "Tablero Semanal de Indicadores Clave (KPIs de entrega, reclamos y productividad).",
          "Auditoría de Salida: Protocolo para ausencias prolongadas del fundador (vacaciones sin llamadas).",
        ],
        hitoValidacion: "Salida del fundador por 7 días seguidos con el negocio operando a ritmo normal.",
      },
    ],
    entregables4D: [
      {
        dimension: "Personal",
        titulo: "Blindaje de la Agenda Directiva y Descompresión Mental",
        detalle: "Recuperación de 15 horas semanales para el líder mediante límites explícitos de disponibilidad y agenda protegida.",
        impactoEsperado: "Reducción inmediata del estrés y enfoque en proyectos de expansión de largo plazo.",
      },
      {
        dimension: "Organizacional",
        titulo: "Matriz de Roles, Autonomía y Acuerdos Explícitos",
        detalle: "Definición documentada de qué decide cada puesto, hasta qué monto financiero y con qué criterio de calidad.",
        impactoEsperado: "Eliminación de la parálisis decisional y empoderamiento de los mandos medios.",
      },
      {
        dimension: "Comercial",
        titulo: "SLA de Entrega y Promesa Confiable al Cliente",
        detalle: "Alineación entre lo que promete el área comercial y lo que operaciones puede entregar en tiempo y forma.",
        impactoEsperado: "Cero fricción con clientes por fechas de entrega postergadas.",
      },
      {
        dimension: "Empresarial",
        titulo: "Gobernanza y Continuidad Operativa Sin el Fundador",
        detalle: "Transformación de un negocio unipersonal tácito en una empresa gobernable con procesos explícitos.",
        impactoEsperado: "Incremento del valor patrimonial del negocio y viabilidad de delegación total.",
      },
    ],
    inversionMensualSugerida: "Inversión mensual estructurada según escala de facturación y puestos clave",
  },

  segunda_generacion: {
    label: "Segunda Generación / Mando Medio en Transición de Liderazgo",
    diagnosticoSituacional: (dir, emp) =>
      `En ${emp}, conviven la visión tradicional de los socios fundadores con la necesidad de modernización y profesionalización impulsada por la segunda generación (${dir}). Esta tensión genera decisiones duplicadas, lealtades divididas en el personal histórico y demoras en la ejecución de cambios indispensables.`,
    objetivoGeneral: (emp) =>
      `Establecer un puente metodológico objetivo en ${emp} basado en datos y procesos neutrales, unificando los criterios de dirección entre generaciones y profesionalizando el organigrama sin quebrar la cultura fundacional.`,
    fases: [
      {
        fase: "Fase 1",
        periodo: "Mes 1 (Semanas 1 a 4)",
        nombre: "Mesa de Acuerdos Directivos & Mapa de Roles",
        objetivoPrincipal: "Separar la relación societaria/familiar de la gestión ejecutiva diaria del negocio.",
        entregables: [
          "Pacto de Convivencia Operativa: Delimitación de áreas de incumbencia y autoridad formal.",
          "Matriz de Criterios de Decisión Unificados (Reglas claras para evitar vetos cruzados).",
          "Mapeo de percepciones del equipo histórico frente a la nueva etapa.",
        ],
        hitoValidacion: "Alineación 100% explícita en las 3 decisiones estratégicas del trimestre.",
      },
      {
        fase: "Fase 2",
        periodo: "Mes 2 (Semanas 5 a 8)",
        nombre: "Profesionalización de Mandos Medios & Fichas de Puesto",
        objetivoPrincipal: "Crear una capa gerencial sólida que responda a procesos objetivos y no a simpatías personales.",
        entregables: [
          "Definición de 4 Fichas de Puesto Clave con metas e indicadores numéricos.",
          "Implementación del Comité Operativo Semanal (reunión estructurada de 45 minutos).",
          "Protocolo de comunicación interna para cambios en métodos de trabajo.",
        ],
        hitoValidacion: "El personal histórico reporta directamente al mando medio designado sin 'puentear' a los fundadores.",
      },
      {
        fase: "Fase 3",
        periodo: "Mes 3 (Semanas 9 a 12)",
        nombre: "Tablero de Control Unificado & Transición Confiable",
        objetivoPrincipal: "Consolidar un tablero único de números que elimine discusiones basadas en intuiciones.",
        entregables: [
          "Tablero Directivo Mensual (Finanzas, Ventas, Operaciones y Personas).",
          "Protocolo de Evaluación de Rendimiento Semestral.",
          "Hoja de Ruta de Gobernanza Familiar / Societaria a 12 meses.",
        ],
        hitoValidacion: "Directorio mensual fluido con lectura de indicadores y 0 discusiones de piso.",
      },
    ],
    entregables4D: [
      {
        dimension: "Personal",
        titulo: "Legitimación del Liderazgo Joven sin Confrontación",
        detalle: "Acompañamiento directivo para construir autoridad basada en rigor metodológico y no en imposición jerárquica.",
        impactoEsperado: "Paz mental y certidumbre en las conversaciones de socios.",
      },
      {
        dimension: "Organizacional",
        titulo: "Estructura Orgánica Formal y Cero Doble Mando",
        detalle: "Eliminación de la ambigüedad en instrucciones a los colaboradores mediante canales jerárquicos únicos.",
        impactoEsperado: "Fin de las lealtades divididas y aumento del 30% en la velocidad de ejecución.",
      },
      {
        dimension: "Comercial",
        titulo: "Sistematización de Clientes Históricos y Expansión",
        detalle: "Documentación de las relaciones comerciales para que pertenezcan a la empresa y no exclusivamente al socio fundador.",
        impactoEsperado: "Retención de cartera asegurada y profesionalización de la venta.",
      },
      {
        dimension: "Empresarial",
        titulo: "Protocolo de Continuidad y Gobernanza B2B",
        detalle: "Reglas claras de incorporación de familiares, distribución de utilidades y reinversión en infraestructura.",
        impactoEsperado: "Blindaje de la empresa para las próximas décadas.",
      },
    ],
    inversionMensualSugerida: "Inversión mensual de acompañamiento y facilitación de directorio",
  },

  estancamiento_comercial: {
    label: "Empresa con Buen Producto pero Proceso Comercial Intuitivo",
    diagnosticoSituacional: (dir, emp) =>
      `En ${emp}, las ventas se sostienen en el boca a boca, la reputación técnica histórica y el esfuerzo individual del directivo (${dir}). La ausencia de un pipeline predecible y de criterios rigurosos de calificación genera fluctuaciones bruscas de facturación (ingresos en serrucho) y sobrecarga en cotizaciones que no cierran.`,
    objetivoGeneral: (emp) =>
      `Construir un embudo comercial B2B predecible en ${emp}, profesionalizando las cotizaciones, reduciendo el ciclo de venta a la mitad y blindando la captación mensual sin depender del azar o de rebajas de precios.`,
    fases: [
      {
        fase: "Fase 1",
        periodo: "Mes 1 (Semanas 1 a 4)",
        nombre: "Auditoría de Pipeline & Criterio de Calificación B2B",
        objetivoPrincipal: "Dejar de cotizar a clientes inviables y enfocar la energía en cuentas de alto valor.",
        entregables: [
          "Matriz ICP (Perfil de Cliente Ideal) y Criterios de Descarte Rápido.",
          "Estandarización de Propuestas Comerciales en 1 Página (Plantilla de Alto Cierre).",
          "Auditoría del Ciclo de Cotización actual (detección de cuellos de botella).",
        ],
        hitoValidacion: "Reducción del tiempo de envío de cotizaciones de 5 días a menos de 24 horas.",
      },
      {
        fase: "Fase 2",
        periodo: "Mes 2 (Semanas 5 a 8)",
        nombre: "Estructuración del Proceso Consultivo de Venta",
        objetivoPrincipal: "Entrenar al equipo comercial en venta Challenger basada en diagnóstico y valor de trinchera.",
        entregables: [
          "Guion de Indagación y Preguntas de Trinchera para la fuerza de ventas.",
          "Matriz de Manejo de Objeciones de Precio ('No vendemos por precio').",
          "Configuración del Pipeline Visual en CRM (SLA por etapa).",
        ],
        hitoValidacion: "Aumento de la tasa de conversión de presupuestos presentados a contratos firmados (+25%).",
      },
      {
        fase: "Fase 3",
        periodo: "Mes 3 (Semanas 9 a 12)",
        nombre: "Máquina de Prospección & Cuentas Recurrentes",
        objetivoPrincipal: "Estabilizar el flujo de prospectos calificados y activar contratos de recurrencia.",
        entregables: [
          "Rutina Semanal de Seguimiento Comercial (Pipeline Review de 30 minutos).",
          "Estrategia de Up-selling y Reactivación de Clientes Inactivos.",
          "Tablero de Control Comercial con KPIs de Cierre, Ticket Medio y Margen Bruto.",
        ],
        hitoValidacion: "Facturación recurrente predecible que cubre el 100% de los costos fijos de la empresa.",
      },
    ],
    entregables4D: [
      {
        dimension: "Personal",
        titulo: "Liberación de la Presión de Venta Diaria",
        detalle: "El directivo deja de ser el único vendedor de la empresa para convertirse en el líder de una máquina comercial.",
        impactoEsperado: "Tranquilidad financiera y eliminación del estrés a fin de mes.",
      },
      {
        dimension: "Organizacional",
        titulo: "SLA Rápido Entre Comercial y Operaciones",
        detalle: "Acuerdos claros para que lo presupuestado coincida exactamente con las capacidades de entrega de la planta.",
        impactoEsperado: "Cero fricción interna entre vendedores y equipo técnico.",
      },
      {
        dimension: "Comercial",
        titulo: "Posicionamiento de Autoridad y Defensibilidad de Precio",
        detalle: "La empresa deja de competir por precio para competir por certeza de cumplimiento y diagnóstico experto.",
        impactoEsperado: "Aumento del margen bruto por operación y tickets de mayor envergadura.",
      },
      {
        dimension: "Empresarial",
        titulo: "Previsibilidad de Flujo de Caja y Planificación a 12 Meses",
        detalle: "Transformación del flujo de caja errático en una curva de ingresos ascendente y planificada.",
        impactoEsperado: "Capacidad real de invertir en maquinaria, tecnología y talento calificado.",
      },
    ],
    inversionMensualSugerida: "Inversión mensual ligada al programa de estructuración comercial y pipeline",
  },

  calidad_entregas: {
    label: "Fricción Operativa, Demoras en Entrega y Retrabajos Costosos",
    diagnosticoSituacional: (dir, emp) =>
      `En ${emp}, el aumento de la demanda o la complejidad de los trabajos está generando demoras en las fechas de entrega, reclamos de clientes y costos ocultos por retrabajos. El directivo (${dir}) pasa sus jornadas resolviendo urgencias de calidad en lugar de consolidar el sistema.`,
    objetivoGeneral: (emp) =>
      `Blindar la línea de producción y entrega de ${emp}, reduciendo los retrabajos al mínimo mediante puntos de control intermedios, acuerdos visuales de piso y rutinas de autocontrol en cada puesto de trabajo.`,
    fases: [
      {
        fase: "Fase 1",
        periodo: "Mes 1 (Semanas 1 a 4)",
        nombre: "Mapeo de Flujo de Valor & Puntos Críticos de Falla",
        objetivoPrincipal: "Identificar exactamente dónde y por qué se producen las demoras y los errores.",
        entregables: [
          "Diagrama de Flujo de Trinchera con detección de los 3 mayores cuellos de botella.",
          "Tablero de Control de Desperdicios y Costo Real de Retrabajos.",
          "Gemba Walk con los operarios y mandos de piso.",
        ],
        hitoValidacion: "Cálculo exacto del costo mensual que hoy la empresa pierde en retrabajos y urgencias.",
      },
      {
        fase: "Fase 2",
        periodo: "Mes 2 (Semanas 5 a 8)",
        nombre: "Estandarización Visual & Protocolos de Autocontrol",
        objetivoPrincipal: "Instalar controles de calidad en el origen para que ningún trabajo defectuoso pase a la etapa siguiente.",
        entregables: [
          "Hojas de Proceso Visual (1 página con fotos y tolerancias claras por puesto).",
          "Protocolo de 'Parada Técnica' ante anomalías antes de completar el trabajo.",
          "Checklist de Liberación Final para entrega a cliente.",
        ],
        hitoValidacion: "Reducción del 50% en los reclamos de clientes durante el primer mes de aplicación.",
      },
      {
        fase: "Fase 3",
        periodo: "Mes 3 (Semanas 9 a 12)",
        nombre: "Cadencia de Mejora Continua & Indicadores de Piso",
        objetivoPrincipal: "Empoderar a los supervisores para liderar la resolución sistemática de problemas diarios.",
        entregables: [
          "Tablero de Control Visual en Planta/Oficina con métricas diarias.",
          "Rutina Diaria de 10 minutos al inicio de turno.",
          "Protocolo de Análisis de Causa Raíz (Método de los 5 Porqués simplificado).",
        ],
        hitoValidacion: "Cumplimiento del 95% o superior en entregas a tiempo (On-Time Delivery).",
      },
    ],
    entregables4D: [
      {
        dimension: "Personal",
        titulo: "Fin de las Llamadas de Quejas de Clientes a Deshoras",
        detalle: "El directivo recupera la tranquilidad de saber que lo que sale de la empresa cumple el estándar acordado.",
        impactoEsperado: "Paz mental y orgullo genuino por la calidad del trabajo entregado.",
      },
      {
        dimension: "Organizacional",
        titulo: "Cultura de Autocontrol y Orgullo de Oficio",
        detalle: "El personal asume la responsabilidad de su propio puesto y deja de esconder fallas para no ser reprendido.",
        impactoEsperado: "Clima laboral de cooperación, prolijidad y respeto por los acuerdos.",
      },
      {
        dimension: "Comercial",
        titulo: "Garantía de Cumplimiento Imbatible como Diferencial",
        detalle: "La empresa se posiciona en el mercado como el proveedor más confiable y puntual del sector.",
        impactoEsperado: "Fidelización de clientes existentes y justificación sólida de precios premium.",
      },
      {
        dimension: "Empresarial",
        titulo: "Recuperación de Rentabilidad Oculta por Cero Desperdicio",
        detalle: "Los recursos que antes se quemaban en rehacer trabajos ahora van directo al margen neto de la compañía.",
        impactoEsperado: "Aumento tangible de la rentabilidad operativa mensual (EBITDA).",
      },
    ],
    inversionMensualSugerida: "Inversión mensual basada en el rescate de rentabilidad y productividad de planta",
  },
};

/**
 * Normaliza cualquier entrada de texto o arquetipo hacia uno de los 4 arquetipos soportados.
 */
export function normalizarArquetipoAcuerdo(arquetipo?: string): ArquetipoDolor {
  if (!arquetipo) return "fundador_saturado";
  if (arquetipo in DATOS_ARQUETIPOS_ACUERDO) {
    return arquetipo as ArquetipoDolor;
  }
  const low = arquetipo.toLowerCase();
  if (low.includes("comercial") || low.includes("ventas") || low.includes("estancamiento")) {
    return "estancamiento_comercial";
  }
  if (low.includes("calidad") || low.includes("entrega") || low.includes("proceso") || low.includes("retrabajo")) {
    return "calidad_entregas";
  }
  if (
    low.includes("segunda") ||
    low.includes("familia") ||
    low.includes("socio") ||
    low.includes("generacion") ||
    low.includes("generación")
  ) {
    return "segunda_generacion";
  }
  return "fundador_saturado";
}

/**
 * Genera el Acuerdo de Alcance y Propuesta de Acompañamiento B2B
 */
export function generarAcuerdoAlcance(input: InputAcuerdoAlcance): AcuerdoAlcance {
  const directivo = input.nombreDirectivo?.trim() || "Colega Directivo";
  const empresa = input.empresa?.trim() || "Empresa PyME";
  const cargo = input.cargo?.trim() || "Director General / Socio Gerente";
  const canal = input.canal || "Instagram";
  const duracionMeses = input.mesesDuracion && input.mesesDuracion > 0 ? input.mesesDuracion : 3;
  const modalidad = input.modalidad || "Hibrida (Trinchera + Remoto)";
  const arquetipo = normalizarArquetipoAcuerdo(input.arquetipoDolor);
  const datos = DATOS_ARQUETIPOS_ACUERDO[arquetipo];

  const idAcuerdo = `ACUERDO-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  const fechaEmision =
    input.fechaPropuesta ||
    new Date().toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const compromisosMutuos: CompromisoMutuo[] = [
    {
      actor: "Mejora Continua (Equipo Consultor)",
      compromisos: [
        "Acompañamiento directo en trinchera (Gemba Walks, reuniones con mandos medios y directorio).",
        "Diseño a medida de herramientas, manuales visuales y tableros de control (cero burocracia genérica).",
        "Disponibilidad ejecutiva continua para resolución de dudas y calibración de acuerdos.",
        "Rigor metodológico: Calidez con Verdad, enfoque 100% en sistemas y acuerdos de trabajo.",
      ],
    },
    {
      actor: "La Dirección y el Equipo de la Empresa",
      compromisos: [
        `Participación activa del directivo (${directivo}) en las reuniones semanales de calibración (45 min).`,
        "Transparencia total en el acceso a datos reales de operación, tiempos y reclamos.",
        "Facilitar el tiempo necesario para que los mandos medios participen en las sesiones de estandarización.",
        "Compromiso institucional de sostener los acuerdos de piso y no desautorizarlos en la urgencia diaria.",
      ],
    },
  ];

  const esquemaInversion: EsquemaInversion = {
    modalidad,
    duracionMeses,
    inversionMensual: input.honorariosMensuales?.trim() || datos.inversionMensualSugerida,
    condicionesFacturacion: "Facturación mensual adelantada del 1 al 10 de cada período.",
    garantiaCompromiso:
      "Si al finalizar el Mes 1 la Dirección no evidencia un avance tangible en la claridad de roles y el alivio operativo, se puede rescindir el acuerdo sin penalidad alguna.",
    proximoPasoInicio:
      "Firma del presente acuerdo y fijación de fecha para el Gemba Walk inicial de relevamiento en trinchera.",
  };

  const primerNombre = directivo.split(" ")[0];
  const resumenWhatsApp = `Hola ${primerNombre}, fue un gusto conversar hoy. Te preparé la propuesta formal de acompañamiento para ${empresa} estructurada en 3 fases a 90 días, con foco en ${datos.label.toLowerCase()}. Podés revisarla y descargar el PDF formal aquí. ¿Te parece que coordinemos el Gemba Walk de inicio para la semana próxima?`;

  return {
    idAcuerdo,
    fechaEmision,
    validezDias: 15,
    directivo,
    empresa,
    cargo,
    canal,
    arquetipo,
    arquetipoLabel: datos.label,
    diagnosticoSituacional: datos.diagnosticoSituacional(directivo, empresa),
    objetivoGeneral: datos.objetivoGeneral(empresa),
    fasesIntervencion: datos.fases,
    entregablesPorDimension: datos.entregables4D,
    compromisosMutuos,
    esquemaInversion,
    resumenWhatsApp,
  };
}
