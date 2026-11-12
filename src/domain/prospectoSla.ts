// src/domain/prospectoSla.ts
// LÓGICA DE DOMINIO PURA: AUDITORÍA DE SLA DE 48 HORAS PARA PROSPECTOS (Service Blueprint)
// Cero I/O, sin dependencias externas ni efectos secundarios.

import { EstadoProspectoV2 } from "./prospectoStateMachine";

export const SLA_ATENCION_HORAS = 48;
export const SLA_UMBRAL_ALERTA_HORAS = 24;

export type EstadoSlaSemaforo = "en_tiempo" | "proximo_vencer" | "vencido";

export type ArquetipoProspecto = "saturado" | "esceptico" | "orden_para_crecer" | "indefinido";

export interface ProspectoBaseSla {
  prospecto_id: string;
  email: string;
  nombre: string;
  telefono: string | null;
  empresa: string | null;
  estado: EstadoProspectoV2;
  origen_utm: string | null;
  pieza_id_atribucion: string;
  perfil_detectado_id: string | null;
  fecha_captura: string;
  fecha_actualizacion: string;
  sla_limite_calificacion: string;
}

export interface ProspectoSlaCalculado extends ProspectoBaseSla {
  horas_transcurridas: number;
  horas_restantes: number;
  estado_sla: EstadoSlaSemaforo;
  atendido_en_sla: boolean | null; // null si sigue en CAPTURADO
}

export interface MetricasSlaResumen {
  total_capturados: number;
  pendientes_atencion: number;
  en_tiempo: number;
  proximo_vencer: number;
  vencidos: number;
  calificados_en_sla: number;
  calificados_fuera_sla: number;
  cumplimiento_pct: number;
  tiempo_promedio_atencion_horas: number;
  prospectos: ProspectoSlaCalculado[];
}

/**
 * Calcula la fecha y hora límite de vencimiento del SLA (48 horas corridas desde la captura).
 */
export function calcularVencimientoSLA(fechaCaptura: Date = new Date(), horas: number = SLA_ATENCION_HORAS): string {
  return new Date(fechaCaptura.getTime() + horas * 3_600_000).toISOString();
}

/**
 * Determina el estado del semáforo de SLA dado el tiempo de captura, el tiempo actual y el límite.
 */
export function determinarEstadoSLA(
  fechaCaptura: string | Date,
  ahora: Date = new Date(),
  limiteHoras: number = SLA_ATENCION_HORAS
): {
  estado: EstadoSlaSemaforo;
  horas_transcurridas: number;
  horas_restantes: number;
} {
  const tCaptura = typeof fechaCaptura === "string" ? new Date(fechaCaptura).getTime() : fechaCaptura.getTime();
  const tAhora = ahora.getTime();
  const msTranscurridos = Math.max(0, tAhora - tCaptura);
  const horasTranscurridas = Math.round((msTranscurridos / 3_600_000) * 10) / 10;
  const horasRestantes = Math.round((limiteHoras - horasTranscurridas) * 10) / 10;

  let estado: EstadoSlaSemaforo;
  if (horasTranscurridas < SLA_UMBRAL_ALERTA_HORAS) {
    estado = "en_tiempo"; // 🟢 < 24h
  } else if (horasTranscurridas < limiteHoras) {
    estado = "proximo_vencer"; // 🟡 24h - 48h
  } else {
    estado = "vencido"; // 🔴 >= 48h
  }

  return {
    estado,
    horas_transcurridas: horasTranscurridas,
    horas_restantes: horasRestantes,
  };
}

/**
 * Infiere el arquetipo B2B en base al texto de un mensaje o comentario entrante
 */
export function inferirArquetipoMensaje(texto: string): ArquetipoProspecto {
  if (!texto) return "orden_para_crecer";
  // Normalizar acentos y pasar a minúsculas
  const t = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const palabrasSaturado = ["tiempo", "desborde", "horas", "operativo", "saturado", "no llego", "apagar incendios", "bombero", "todo yo", "delegar", "asfixia"];
  for (const p of palabrasSaturado) {
    if (t.includes(p)) return "saturado";
  }

  const palabrasEsceptico = ["duda", "funciona", "costo", "precio", "esceptico", "garantia", "cuanto sale", "cobran", "experiencia", "humo"];
  for (const p of palabrasEsceptico) {
    if (t.includes(p)) return "esceptico";
  }

  return "orden_para_crecer";
}

/**
 * Computa las métricas de SLA y el estado de semáforo para un conjunto de prospectos.
 */
export function calcularMetricasSla(
  prospectos: ProspectoBaseSla[],
  ahora: Date = new Date()
): MetricasSlaResumen {
  let enTiempo = 0;
  let proximoVencer = 0;
  let vencidos = 0;
  let calificadosEnSla = 0;
  let calificadosFueraSla = 0;
  let pendientesAtencion = 0;

  const tiemposAtencionHoras: number[] = [];

  const listaCalculada: ProspectoSlaCalculado[] = prospectos.map((p) => {
    const tCaptura = new Date(p.fecha_captura).getTime();
    const tActualizacion = new Date(p.fecha_actualizacion).getTime();
    const esPendiente = p.estado === "CAPTURADO";

    if (esPendiente) {
      pendientesAtencion++;
      const { estado, horas_transcurridas, horas_restantes } = determinarEstadoSLA(p.fecha_captura, ahora);
      if (estado === "en_tiempo") enTiempo++;
      else if (estado === "proximo_vencer") proximoVencer++;
      else vencidos++;

      return {
        ...p,
        horas_transcurridas,
        horas_restantes,
        estado_sla: estado,
        atendido_en_sla: null,
      };
    } else {
      // Ya avanzó de CAPTURADO a CALIFICADO, DESCARTADO, etc.
      const msAtencion = Math.max(0, tActualizacion - tCaptura);
      const horasAtencion = Math.round((msAtencion / 3_600_000) * 10) / 10;
      tiemposAtencionHoras.push(horasAtencion);

      const atendidoEnSla = horasAtencion <= SLA_ATENCION_HORAS;
      if (atendidoEnSla) {
        calificadosEnSla++;
      } else {
        calificadosFueraSla++;
      }

      return {
        ...p,
        horas_transcurridas: horasAtencion,
        horas_restantes: Math.round((SLA_ATENCION_HORAS - horasAtencion) * 10) / 10,
        estado_sla: atendidoEnSla ? "en_tiempo" : "vencido",
        atendido_en_sla: atendidoEnSla,
      };
    }
  });

  const totalAtendidos = calificadosEnSla + calificadosFueraSla;
  const tiempoPromedioAtencion =
    tiemposAtencionHoras.length > 0
      ? Math.round((tiemposAtencionHoras.reduce((acc, h) => acc + h, 0) / tiemposAtencionHoras.length) * 10) / 10
      : 0;

  // Tasa de cumplimiento: (leads en tiempo + calificados en tiempo) / total
  const totalCasos = listaCalculada.length;
  const casosExitosos = enTiempo + calificadosEnSla;
  const cumplimientoPct =
    totalCasos > 0 ? Math.round((casosExitosos / totalCasos) * 1000) / 10 : 100;

  return {
    total_capturados: totalCasos,
    pendientes_atencion: pendientesAtencion,
    en_tiempo: enTiempo,
    proximo_vencer: proximoVencer,
    vencidos: vencidos + calificadosFueraSla,
    calificados_en_sla: calificadosEnSla,
    calificados_fuera_sla: calificadosFueraSla,
    cumplimiento_pct: cumplimientoPct,
    tiempo_promedio_atencion_horas: tiempoPromedioAtencion,
    prospectos: listaCalculada,
  };
}
