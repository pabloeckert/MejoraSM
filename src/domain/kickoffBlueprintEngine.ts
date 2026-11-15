/**
 * kickoffBlueprintEngine.ts — Motor de Onboarding y Plan de Primeros 30 Días (Kickoff Blueprint & Gemba Walk 4D)
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - Joey Coleman (Never Lose a Customer Again): Erradicar el arrepentimiento post-firma en los
 *   primeros 30 días (fases Assess, Admit, Affirm, Activate) mediante victorias tempranas tangibles.
 * - Taiichi Ohno (Gemba Walk / Genchi Genbutsu): Ir al lugar real donde ocurre el trabajo para
 *   observar el flujo del sistema y las fricciones de piso — jamás auditar ni señalar a las personas.
 * - David Maister (The Trusted Advisor) & Andy Grove (High Output Management): Pedido de insumos
 *   sin burocracia, cadencia semanal medible y transferencia gradual de autonomía operativa.
 * - Manual de Marca de Mejora Continua: Calidez con Verdad, Foco en el Sistema y las 4 Dimensiones
 *   (Personal, Organizacional, Comercial, Empresarial).
 */

import { type ArquetipoDolor } from "./executiveDiagnosticEngine";

export type ModalidadKickoff =
  | "Hibrida (Trinchera + Remoto)"
  | "Presencial en Planta / Oficina"
  | "Remoto Ejecutivo";

export interface InputKickoffBlueprint {
  nombreDirectivo: string;
  empresa?: string;
  cargo?: string;
  arquetipoDolor?: ArquetipoDolor | string;
  modalidad?: ModalidadKickoff;
  fechaInicio?: string;
  sponsorInterno?: string;
}

export interface BloqueAgendaKickoff {
  minuto: string;
  titulo: string;
  objetivo: string;
  entregableEnVivo: string;
}

export interface EstacionGembaWalk {
  dimension: "Personal" | "Organizacional" | "Comercial" | "Empresarial";
  estacion: string;
  focoObservacion: string;
  preguntaTrinchera: string;
  evidenciaSistemica: string;
}

export interface HitoQuickWin30D {
  ventana:
    | "Día 1 a 7 (Activación & Gemba)"
    | "Día 8 a 15 (1er Quick Win)"
    | "Día 16 a 30 (Estándar & Tablero)";
  tituloHito: string;
  accionSistema: string;
  indicadorExito: string;
  impactoDirectivo: string;
}

export interface RequisitoSinBurocracia {
  id: string;
  item: string;
  proposito: string;
  formatoAceptado: string;
  obligatorioAntesDeKickoff: boolean;
}

export interface KickoffBlueprint {
  idBlueprint: string;
  fechaEmision: string;
  fechaInicio: string;
  directivo: string;
  empresa: string;
  cargo: string;
  sponsorInterno: string;
  modalidad: ModalidadKickoff;
  arquetipo: ArquetipoDolor;
  arquetipoLabel: string;
  mensajeAfirmacionColeman: string;
  reglaDeOroGemba: string;
  agendaKickoff90Min: BloqueAgendaKickoff[];
  recorridoGemba4D: EstacionGembaWalk[];
  hitosPrimeros30Dias: HitoQuickWin30D[];
  requisitosCeroBurocracia: RequisitoSinBurocracia[];
  comunicadoInternoEquipo: string;
  resumenWhatsAppBienvenida: string;
}

interface ConfigArquetipoKickoff {
  prefijoId: string;
  label: string;
  focoAfirmacion: string;
  agendaEnfoqueOperativo: string;
  estacionesGemba4D: EstacionGembaWalk[];
  hitos30Dias: HitoQuickWin30D[];
  focoRequisitosExtra: RequisitoSinBurocracia;
}

const CONFIG_ARQUETIPOS_KICKOFF: Record<ArquetipoDolor, ConfigArquetipoKickoff> = {
  fundador_saturado: {
    prefijoId: "FS",
    label: "Dueño / Fundador Atrapado en la Operación Diaria",
    focoAfirmacion:
      "recuperar horas directivas reales desde la primera quincena instalando filtros de decisión en el equipo sin frenar el ritmo de entrega",
    agendaEnfoqueOperativo:
      "Mapear las 5 interrupciones diarias que hoy suben al escritorio del fundador y definir umbrales claros de autonomía.",
    estacionesGemba4D: [
      {
        dimension: "Personal",
        estacion: "Escritorio del Fundador & Bandeja de Urgencias",
        focoObservacion:
          "Registrar durante 48 horas qué pedidos operativos llegan por WhatsApp, pasillo o llamada directa al titular.",
        preguntaTrinchera:
          "De cada diez consultas que recibís por día, ¿cuántas se resolverían solas con un criterio escrito en una hoja visible?",
        evidenciaSistemica: "Mapa de interrupciones recurrentes clasificado por frecuencia y urgencia.",
      },
      {
        dimension: "Organizacional",
        estacion: "Piso Operativo / Mostrador y Mandos Medios",
        focoObservacion:
          "Detectar en qué momentos el equipo detiene una tarea esperando confirmación por falta de límites de autoridad.",
        preguntaTrinchera:
          "Cuando el dueño no está disponible, ¿qué proceso se frena primero y por falta de qué acuerdo escrito?",
        evidenciaSistemica: "Matriz inicial de autonomía y topes de decisión por puesto.",
      },
      {
        dimension: "Comercial",
        estacion: "Cotizaciones Especiales & Excepciones a Clientes",
        focoObservacion:
          "Verificar si plazos, descuentos o cambios de alcance pasan exclusivamente por aprobación personal del fundador.",
        preguntaTrinchera:
          "¿Qué regla paramétrica permitiría responder presupuestos estándar en menos de 4 horas sin intervención directiva?",
        evidenciaSistemica: "Tabla de márgenes y plazos aprobados de respuesta autónoma.",
      },
      {
        dimension: "Empresarial",
        estacion: "Tablero Visual de Caja, Pedidos y Semáforos",
        focoObservacion:
          "Observar dónde reside la visión global del negocio: si en planillas dispersas o en la memoria del socio.",
        preguntaTrinchera:
          "¿Cuáles son los 4 números concretos que te permitirían dormir tranquilo el viernes sin revisar cada factura?",
        evidenciaSistemica: "Borrador de tablero semanal de 4 indicadores de gobierno.",
      },
    ],
    hitos30Dias: [
      {
        ventana: "Día 1 a 7 (Activación & Gemba)",
        tituloHito: "Auditoría de Interrupciones y Encuadre al Equipo",
        accionSistema:
          "Realizar el Gemba Walk 4D y relevar durante 3 días hábiles las consultas operativas entrantes al fundador.",
        indicadorExito: "Listado jerarquizado de las 5 causas de interrupción que consumen >70% del tiempo.",
        impactoDirectivo: "Visibilidad inmediata sobre dónde se pierde el foco estratégico.",
      },
      {
        ventana: "Día 8 a 15 (1er Quick Win)",
        tituloHito: "Protocolo de Filtro de Urgencias y Topes de Autonomía",
        accionSistema:
          "Poner en marcha la regla de decisión en 1 página para mandos medios con montos, plazos y criterios de escalado.",
        indicadorExito: "Reducción mínima del 40% en consultas menores diarias por WhatsApp al titular.",
        impactoDirectivo: "Primer bloque protegido de 6+ horas semanales libres para dirección.",
      },
      {
        ventana: "Día 16 a 30 (Estándar & Tablero)",
        tituloHito: "Tablero Visual de Piso + Ritual Semanal de 30 Minutos",
        accionSistema:
          "Instalar el tablero físico o digital de pedidos en curso y la reunión semanal con agenda fija sin desvíos.",
        indicadorExito: "Cuatro semanas de cadencia iniciada y al menos 2 procesos críticos documentados.",
        impactoDirectivo: "La operación avanza con acuerdos visibles aunque el líder se ausente 48 horas.",
      },
    ],
    focoRequisitosExtra: {
      id: "req-interrupciones",
      item: "Últimos 10 mensajes o pedidos de autorización recibidos por el dueño",
      proposito: "Calibrar de inmediato los límites reales de delegación en la semana 1.",
      formatoAceptado: "Capturas simples de WhatsApp o notas breves de voz",
      obligatorioAntesDeKickoff: false,
    },
  },

  segunda_generacion: {
    prefijoId: "SG",
    label: "Empresa Familiar en Transición / 2da Generación",
    focoAfirmacion:
      "honrar el oficio que construyó la empresa mientras se traducen los acuerdos informales en reglas profesionales compartidas entre generaciones",
    agendaEnfoqueOperativo:
      "Delimitar ámbitos de decisión entre generación fundadora y segunda generación mediante indicadores neutros.",
    estacionesGemba4D: [
      {
        dimension: "Personal",
        estacion: "Mesa de Dirección Familiar (Roles & Voz Única)",
        focoObservacion:
          "Observar dónde se superponen indicaciones directivas hacia los mismos colaboradores o sectores.",
        preguntaTrinchera:
          "Cuando surgen dos criterios distintos frente al equipo, ¿qué canal y horario existen para resolverlo puertas adentro?",
        evidenciaSistemica: "Reglamento breve de unidad de mando y mesa ejecutiva quincenal.",
      },
      {
        dimension: "Organizacional",
        estacion: "Puestos Clave de Confianza Histórica vs Nuevos Mandos",
        focoObservacion:
          "Evaluar cómo circula la información técnica entre colaboradores antiguos y perfiles de reciente ingreso.",
        preguntaTrinchera:
          "¿Qué saberes clave de planta o administración dependen hoy de una sola persona sin registro compartido?",
        evidenciaSistemica: "Mapa de puestos y protocolos de traspaso de criterio operativo.",
      },
      {
        dimension: "Comercial",
        estacion: "Cartera Histórica vs Desarrollo de Nuevos Segmentos",
        focoObservacion:
          "Diferenciar acuerdos históricos de palabra con clientes antiguos respecto de nuevas condiciones comerciales.",
        preguntaTrinchera:
          "¿Qué condiciones especiales otorgadas hace años siguen vigentes sin estar formalizadas en el sistema?",
        evidenciaSistemica: "Categorización clara de cuentas y reglas comerciales vigentes.",
      },
      {
        dimension: "Empresarial",
        estacion: "Tablero Objetivo Neutro (Números sobre Opiniones)",
        focoObservacion:
          "Identificar si las conversaciones societarias se basan en percepciones aisladas o en métricas compartidas.",
        preguntaTrinchera:
          "¿Qué 5 datos objetivos mensuales darían tranquilidad tanto al fundador como a la nueva generación?",
        evidenciaSistemica: "Cuadro de indicadores único de lectura mensual en directorio.",
      },
    ],
    hitos30Dias: [
      {
        ventana: "Día 1 a 7 (Activación & Gemba)",
        tituloHito: "Entrevistas de Alineación Generacional + Gemba Walk 4D",
        accionSistema:
          "Relevar expectativas de ambas generaciones por separado y cruzarlas con la realidad operativa del piso.",
        indicadorExito: "Mapa compartido de acuerdos comunes y zonas de superposición directiva.",
        impactoDirectivo: "Descompresión emocional al poner las tensiones sobre el sistema y no sobre vínculos.",
      },
      {
        ventana: "Día 8 a 15 (1er Quick Win)",
        tituloHito: "Matriz RACI de Decisión Societaria y Unidad de Mando",
        accionSistema:
          "Acordar por escrito quién decide, quién ejecuta y quién es informado en las 8 decisiones clave del negocio.",
        indicadorExito: "100% de las áreas con un único referente ejecutivo visible frente al personal.",
        impactoDirectivo: "Fin de las contramarchas frente a mandos medios y operadores.",
      },
      {
        ventana: "Día 16 a 30 (Estándar & Tablero)",
        tituloHito: "Primera Reunión de Directorio Familiar con Tablero Neutro",
        accionSistema:
          "Conducir la primera mesa mensual estructurada con agenda, métricas de rentabilidad y minuta de compromisos.",
        indicadorExito: "Minuta firmada con responsables, fechas y métricas sin agenda paralela.",
        impactoDirectivo: "Profesionalización tangible preservando el respeto por la historia fundacional.",
      },
    ],
    focoRequisitosExtra: {
      id: "req-organigrama-real",
      item: "Esquema informal actual de quién reporta a quién (incluso en papel)",
      proposito: "Detectar líneas cruzadas de mando antes de la primera mesa ejecutiva.",
      formatoAceptado: "Foto de esquema hecho a mano o listado en texto simple",
      obligatorioAntesDeKickoff: false,
    },
  },

  estancamiento_comercial: {
    prefijoId: "EC",
    label: "Ventas Intuitivas / Estancamiento Comercial B2B",
    focoAfirmacion:
      "transformar la intuición comercial aislada en un proceso predecible de prospección, seguimiento y conversión medible",
    agendaEnfoqueOperativo:
      "Detectar en qué paso exacto del embudo comercial se enfrían los presupuestos emitidos sin seguimiento.",
    estacionesGemba4D: [
      {
        dimension: "Personal",
        estacion: "Rutina Semanal del Equipo o Referente Comercial",
        focoObservacion:
          "Observar cuánto tiempo real semanal se dedica a prospección activa vs apagar urgencias administrativas.",
        preguntaTrinchera:
          "¿Cuántas horas limpias por semana tiene protegido tu equipo comercial para hablar con decisores nuevos?",
        evidenciaSistemica: "Auditoría de agenda semanal y carga no comercial.",
      },
      {
        dimension: "Organizacional",
        estacion: "Traspaso de Pedido: De Venta a Producción / Entrega",
        focoObservacion:
          "Revisar cómo llegan las especificaciones vendidas al equipo operativo para evitar promesas incumplibles.",
        preguntaTrinchera:
          "¿Qué porcentaje de fricciones con clientes nace por un acuerdo poco claro entre quien vende y quien entrega?",
        evidenciaSistemica: "Ficha mínima estándar de alta de pedido sin ambigüedades.",
      },
      {
        dimension: "Comercial",
        estacion: "Embudo de Presupuestos Emitidos y Seguimiento SLA",
        focoObservacion:
          "Inspeccionar el historial real de cotizaciones enviadas los últimos 60 días y su cadencia de seguimiento.",
        preguntaTrinchera:
          "¿Qué ocurre exactamente al día 3 y al día 7 después de enviar una cotización cuando el cliente no responde?",
        evidenciaSistemica: "Diagnóstico de tasa de respuesta, abandono de presupuestos y ticket medio.",
      },
      {
        dimension: "Empresarial",
        estacion: "Rentabilidad por Línea, Margen y Recurrencia",
        focoObservacion:
          "Cruzar volumen facturado por producto o cliente contra margen real y desgaste operativo generado.",
        preguntaTrinchera:
          "¿Qué porcentaje de tus ventas actuales sostiene margen genuino frente a operaciones que solo mueven caja?",
        evidenciaSistemica: "Matriz básica de rentabilidad por segmento de cliente y servicio.",
      },
    ],
    hitos30Dias: [
      {
        ventana: "Día 1 a 7 (Activación & Gemba)",
        tituloHito: "Radiografía del Embudo Actual & Recuperación de Presupuestos",
        accionSistema:
          "Auditar los presupuestos abiertos de los últimos 45 días y clasificar etapas reales de cierre.",
        indicadorExito: "100% de presupuestos vigentes inventariados en un tablero único con próximo paso.",
        impactoDirectivo: "Visualización inmediata de facturación latente olvidada.",
      },
      {
        ventana: "Día 8 a 15 (1er Quick Win)",
        tituloHito: "Protocolo de Respuesta Rápida y Secuencia Consultiva 3 Pasos",
        accionSistema:
          "Instalar guiones consultivos (*Calidez con Verdad*, foco en dolor y sin bajar precio) y SLA de primer contacto.",
        indicadorExito: "100% de consultas respondidas bajo SLA <24h y seguimiento estructurado al día 3/7/14.",
        impactoDirectivo: "Reactivación de oportunidades comerciales activas dentro de la primera quincena.",
      },
      {
        ventana: "Día 16 a 30 (Estándar & Tablero)",
        tituloHito: "Tablero Comercial Semanal + Ritual de Pipeline de 30 Minutos",
        accionSistema:
          "Definir las 4 etapas fijas del embudo y medir semanalmente tasa de conversión, margen y motivo de no cierre.",
        indicadorExito: "Tablero semanal operativo y ficha estándar de traspaso Venta -> Entrega activa.",
        impactoDirectivo: "Previsibilidad mensual de ventas sin depender del humor o empuje aislado del dueño.",
      },
    ],
    focoRequisitosExtra: {
      id: "req-presupuestos",
      item: "Últimos 10 presupuestos o propuestas enviadas (anonimizados si preferís)",
      proposito: "Detectar oportunidades inmediatas de reactivación y mejora de encuadre sin bajar precio.",
      formatoAceptado: "PDF, captura de pantalla o planilla exportada del sistema actual",
      obligatorioAntesDeKickoff: false,
    },
  },

  calidad_entregas: {
    prefijoId: "CE",
    label: "Fricción en Calidad, Desperdicios y Retrabajos de Planta",
    focoAfirmacion:
      "eliminar la raíz repetitiva de los retrabajos y urgencias en piso haciendo visible el estándar de calidad en cada estación",
    agendaEnfoqueOperativo:
      "Seguir físicamente el recorrido de una orden desde su ingreso hasta el despacho para localizar los puntos de falla.",
    estacionesGemba4D: [
      {
        dimension: "Personal",
        estacion: "Capacitación en Puesto y Claridad de Criterio de Aceptación",
        focoObservacion:
          "Verificar si dos operadores en el mismo turno interpretan exactamente igual qué es un producto bien hecho.",
        preguntaTrinchera:
          "¿El estándar de calidad 'ok vs no ok' está ilustrado en el puesto o depende del criterio visual del día?",
        evidenciaSistemica: "Brechas de criterio estándar entre turnos y puestos críticos.",
      },
      {
        dimension: "Organizacional",
        estacion: "Puntos de Falla en Línea, Insumos y Retrabajos",
        focoObservacion:
          "Observar en piso dónde se acumula material esperando corrección, faltantes o re-procesos silenciosos.",
        preguntaTrinchera:
          "¿Cuántas horas-hombre de la semana se consumen rehaciendo trabajo que ya se había cobrado una vez?",
        evidenciaSistemica: "Registro de Pareto con los 3 defectos o demoras más costosos del mes.",
      },
      {
        dimension: "Comercial",
        estacion: "Promesa de Plazo de Entrega y Postventa / Reclamos",
        focoObservacion:
          "Contrastación entre fechas de entrega prometidas al cliente y capacidad real libre de la operación.",
        preguntaTrinchera:
          "¿Qué canal formal alimenta a piso cuando un cliente devuelve o observa una falla para que no se repita?",
        evidenciaSistemica: "Flujo trazable entre reclamo comercial y corrección de proceso.",
      },
      {
        dimension: "Empresarial",
        estacion: "Costo de No Calidad y Cumplimiento On-Time Delivery (OTD)",
        focoObservacion:
          "Cuantificar el margen que se evapora por entregas fuera de término, fletes de urgencia y desperdicio.",
        preguntaTrinchera:
          "¿Qué impacto mensual tendría en tu EBITDA reducir a la mitad los retrabajos actuales en 60 días?",
        evidenciaSistemica: "Línea base de cumplimiento OTD (%) y tasa semanal de retrabajo.",
      },
    ],
    hitos30Dias: [
      {
        ventana: "Día 1 a 7 (Activación & Gemba)",
        tituloHito: "Caminata de Trinchera (Gemba Walk) sobre el Flujo Completo",
        accionSistema:
          "Recorrer paso a paso una orden de producción o servicio midiendo esperas, traslados y puntos de retrabajo.",
        indicadorExito: "Pareto inicial identificando los 3 cuellos de botella que causan >75% de las demoras.",
        impactoDirectivo: "Foco absoluto en causas raíz de sistema evitando correcciones dispersas.",
      },
      {
        ventana: "Día 8 a 15 (1er Quick Win)",
        tituloHito: "Checklist Visual de Autocontrol (Gate Anti-Defecto en Origen)",
        accionSistema:
          "Implementar tarjeta visual de 5 puntos en la estación crítica anterior al despacho para frenar fallas a tiempo.",
        indicadorExito: "Reducción inmediata mínima del 30% en reprocesos de la línea priorizada.",
        impactoDirectivo: "Alivio operativo en piso y caída rápida de urgencias con clientes.",
      },
      {
        ventana: "Día 16 a 30 (Estándar & Tablero)",
        tituloHito: "Tablero de Piso Visual (OTD & Desvíos) + Ritual Diario de 10 Minutos",
        accionSistema:
          "Instalar pizarra diaria en planta/oficina mostrando entregas del día, trabas visibles y responsables de destrabe.",
        indicadorExito: "Medición semanal confiable de On-Time Delivery (OTD) y tasa de falla trazada.",
        impactoDirectivo: "Control preventivo del sistema antes de que el problema llegue al cliente final.",
      },
    ],
    focoRequisitosExtra: {
      id: "req-reclamos",
      item: "Lista simple de los últimos 5 reclamos, demoras o retrabajos significativos",
      proposito: "Aterrizar el Gemba Walk directamente en los puntos donde la empresa está perdiendo margen.",
      formatoAceptado: "Notas simples o listado cronológico breve sin planillas extensas",
      obligatorioAntesDeKickoff: false,
    },
  },
};

function computeDeterministicHash3(seed: string): string {
  let acc = 0;
  for (let i = 0; i < seed.length; i++) {
    acc = (acc * 31 + seed.charCodeAt(i)) % 900;
  }
  return String(acc + 100);
}

/**
 * Normaliza cualquier texto o identificador hacia una de las 4 variantes de ArquetipoDolor.
 */
export function normalizarArquetipoKickoff(arq?: ArquetipoDolor | string): ArquetipoDolor {
  if (!arq) return "fundador_saturado";
  if (arq in CONFIG_ARQUETIPOS_KICKOFF) {
    return arq as ArquetipoDolor;
  }
  const low = arq.toLowerCase().trim();
  if (
    low.includes("venta") ||
    low.includes("comercial") ||
    low.includes("estancamiento") ||
    low.includes("intuitiva")
  ) {
    return "estancamiento_comercial";
  }
  if (
    low.includes("calidad") ||
    low.includes("retrabajo") ||
    low.includes("entrega") ||
    low.includes("planta") ||
    low.includes("proceso")
  ) {
    return "calidad_entregas";
  }
  if (
    low.includes("segunda") ||
    low.includes("familia") ||
    low.includes("familiar") ||
    low.includes("socio") ||
    low.includes("generacion") ||
    low.includes("generación")
  ) {
    return "segunda_generacion";
  }
  return "fundador_saturado";
}

/**
 * Genera de forma determinista el Protocolo de Onboarding y Plan de Primeros 30 Días (Kickoff Blueprint).
 */
export function generarKickoffBlueprint(input: InputKickoffBlueprint): KickoffBlueprint {
  const directivo = input.nombreDirectivo?.trim() || "Director General";
  const empresa = input.empresa?.trim() || "Empresa PyME";
  const cargo = input.cargo?.trim() || "Dueño / Socio Gerente";
  const sponsorInterno = input.sponsorInterno?.trim() || directivo;
  const modalidad: ModalidadKickoff = input.modalidad || "Hibrida (Trinchera + Remoto)";
  const arquetipo = normalizarArquetipoKickoff(input.arquetipoDolor);
  const config = CONFIG_ARQUETIPOS_KICKOFF[arquetipo];

  const fechaEmision = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fechaInicio = input.fechaInicio?.trim() || "Semana Próxima (Día 1 de Intervención)";

  const hash3 = computeDeterministicHash3(`${directivo}|${empresa}|${arquetipo}|${modalidad}`);
  const idBlueprint = `KICK-2026-${config.prefijoId}-${hash3}`;

  const mensajeAfirmacionColeman = `Bienvenida formal de ${empresa} al programa de Mejora Continua. Desde hoy dejás de sostener la operación en soledad: nuestro foco durante los primeros 30 días estará puesto exclusivamente en ${config.focoAfirmacion}, instalando acuerdos visibles sin interrumpir tu operación diaria ni sumar burocracia.`;

  const reglaDeOroGemba =
    "REGLA DE ORO DEL GEMBA WALK (SISTEMA, NO PERSONA): En Mejora Continua auditamos el flujo de trabajo, los tableros, los acuerdos entre áreas y las causas raíz operativas — jamás evaluamos ni responsabilizamos a las personas. Un proceso claro multiplica el talento del equipo actual; la falta de claridad desgasta incluso al mejor colaborador.";

  const agendaKickoff90Min: BloqueAgendaKickoff[] = [
    {
      minuto: "Min 00 a 15",
      titulo: "1. Encuadre de Confianza y Protección de los Primeros 30 Días",
      objetivo:
        "Validar expectativas mutuas, confirmar sponsor interno, bajar ansiedades y acordar qué NO vamos a tocar aún para cuidar el foco.",
      entregableEnVivo: "Acta breve de alcance inicial y reglas de comunicación ejecutiva.",
    },
    {
      minuto: "Min 15 a 45",
      titulo: "2. Lectura Cruda de Trinchera sobre el Dolor Prioritario",
      objetivo: config.agendaEnfoqueOperativo,
      entregableEnVivo: "Top 3 de fricciones operativas seleccionadas para intervención inmediata.",
    },
    {
      minuto: "Min 45 a 75",
      titulo: "3. Diseño del Gemba Walk 4D y Calendario de Victorias Rápidas",
      objetivo:
        "Acordar estaciones a recorrer en planta/oficina, horarios sin freno productivo y el 1er Quick Win a entregar antes del Día 15.",
      entregableEnVivo: "Hoja de ruta de 4 semanas con responsables y métricas base.",
    },
    {
      minuto: "Min 75 a 90",
      titulo: "4. Validación del Comunicado al Equipo y Próximo Hito",
      objetivo:
        "Aprobar el mensaje de tranquilidad para todo el personal y fijar día/hora exacta del recorrido inicial y la primera revisión semanal.",
      entregableEnVivo: "Mensaje de presentación aprobado + fecha fija en agenda.",
    },
  ];

  const requisitosCeroBurocracia: RequisitoSinBurocracia[] = [
    {
      id: "req-referente",
      item: "Confirmación de Sponsor Interno (1 referente de trinchera junto al director)",
      proposito: "Asegurar que cada estándar diseñado en mesa baje a la operación real sin cuellos.",
      formatoAceptado: "Nombre, rol y WhatsApp directo",
      obligatorioAntesDeKickoff: true,
    },
    {
      id: "req-horarios",
      item: "Ventana de 2 horas para recorrido Gemba Walk en horario operativo real",
      proposito: "Observar el ritmo real de trabajo sin preparar escenarios artificiales.",
      formatoAceptado: "Día y franja horaria confirmada",
      obligatorioAntesDeKickoff: true,
    },
    {
      id: "req-indicadores",
      item: "Los 2 o 3 tableros o planillas que hoy miran todas las semanas (como estén)",
      proposito: "Partir de los datos reales vigentes sin exigir armado de informes previos.",
      formatoAceptado: "Foto, enlace a Drive/Excel o captura simple",
      obligatorioAntesDeKickoff: false,
    },
    config.focoRequisitosExtra,
  ];

  const primerNombre = directivo.split(" ")[0];

  const comunicadoInternoEquipo = `Equipo de ${empresa}: queremos contarles que a partir de ${fechaInicio} comenzamos a trabajar junto al equipo de Mejora Continua. El objetivo de este acompañamiento es claro: ordenar los procesos internos, simplificar herramientas diarias y hacer que el trabajo de cada área fluya con menos urgencias y menos desgaste para todos. Quiero remarcar algo muy importante: no vienen a controlar personas ni a juzgar el esfuerzo individual, sino a revisar el sistema y construir junto a nosotros soluciones prácticas de trabajo. Gracias por abrir cada estación con transparencia.`;

  const resumenWhatsAppBienvenida =
    `*¡Bienvenido ${primerNombre} y equipo de ${empresa} a Mejora Continua!*\n\n` +
    `Ya dejamos listo el *Protocolo de Onboarding & Plan de Primeros 30 Días* (${idBlueprint}) en modalidad *${modalidad}*.\n\n` +
    `• *Foco Días 1-15:* ${config.hitos30Dias[1].tituloHito}\n` +
    `• *Regla de Oro:* Auditamos procesos y acuerdos (nunca a las personas)\n` +
    `• *Pre-vuelo Cero Burocracia:* Solo confirmarnos referente y horario del 1er Gemba Walk\n\n` +
    `Descargá el PDF adjunto con la agenda de 90 min, las 4 estaciones del recorrido 4D y el texto sugerido para presentar el inicio a tu equipo.\n` +
    `Seguimos en contacto directo y en mejoraok.com.`;

  return {
    idBlueprint,
    fechaEmision,
    fechaInicio,
    directivo,
    empresa,
    cargo,
    sponsorInterno,
    modalidad,
    arquetipo,
    arquetipoLabel: config.label,
    mensajeAfirmacionColeman,
    reglaDeOroGemba,
    agendaKickoff90Min,
    recorridoGemba4D: config.estacionesGemba4D,
    hitosPrimeros30Dias: config.hitos30Dias,
    requisitosCeroBurocracia,
    comunicadoInternoEquipo,
    resumenWhatsAppBienvenida,
  };
}
