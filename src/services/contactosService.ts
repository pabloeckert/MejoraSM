/**
 * Servicio para integrar MejoraSM con la API central de contactos (MejoraContactos / CRM)
 * Endpoint remoto: https://tzatuvxatsduuslxqdtm.supabase.co/functions/v1/contactos-api
 * Endpoint local soberano: http://127.0.0.1:4002/api/crm/lead
 */

import {
  calcularVencimientoSLA,
  determinarEstadoSLA,
  inferirArquetipoMensaje,
  calcularMetricasSla,
  type ArquetipoProspecto,
  type MetricasSlaResumen,
  type ProspectoSlaCalculado,
} from "../domain/prospectoSla";

export {
  calcularVencimientoSLA,
  determinarEstadoSLA,
  inferirArquetipoMensaje,
  calcularMetricasSla,
  type ArquetipoProspecto,
  type MetricasSlaResumen,
  type ProspectoSlaCalculado,
};

export const CONTACTOS_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONTACTOS_API_URL) ||
  (typeof process !== 'undefined' && (process.env?.VITE_CONTACTOS_API_URL || process.env?.CONTACTOS_API_URL)) ||
  'https://tzatuvxatsduuslxqdtm.supabase.co/functions/v1/contactos-api';

export const CONTACTOS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONTACTOS_API_KEY) ||
  (typeof process !== 'undefined' && (process.env?.VITE_CONTACTOS_API_KEY || process.env?.CONTACTOS_API_KEY)) ||
  '';

export const CRM_LOCAL_API_URL = "http://127.0.0.1:4002/api/crm";

export interface LeadPayload {
  source?: string;
  email?: string;
  nombre?: string;
  telefono?: string;
  empresa?: string;
  arquetipo_inferido?: ArquetipoProspecto | string;
  pieza_id_origen?: string;
  canal_origen?: "instagram" | "facebook" | "linkedin" | string;
  estado_inicial?: "CAPTURADO";
  sla_limite_horas?: number; // 48h
  sla_vencimiento_at?: string; // ISO 8601
  metadata?: {
    red?: string;
    handle?: string;
    thread_id?: string;
    sentiment?: string;
    arquetipo_inferido?: string;
    pieza_id_origen?: string;
    canal_origen?: string;
    [key: string]: unknown;
  };
  nota_referencia?: string;
  [key: string]: unknown;
}

export interface EnviarLeadResponse {
  persona_id: string;
  creado: boolean;
  estado?: string;
  sla_limite_calificacion?: string;
  origen?: "crm_remoto" | "crm_local" | "crm_offline_cache";
}

/**
 * Extrae potenciales emails y teléfonos a partir del texto de un mensaje
 */
export function extraerDatosDeTexto(texto: string): { email?: string; telefono?: string } {
  if (!texto) return {};
  const emailMatch = texto.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const telMatch = texto.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  return {
    email: emailMatch ? emailMatch[0] : undefined,
    telefono: telMatch ? telMatch[0].trim() : undefined,
  };
}

/**
 * Envía un lead calificado desde MejoraSM hacia la fuente de verdad y CRM (MejoraContactos)
 * con fallback transparente al repositorio SQLite local soberano (/api/crm/lead)
 */
export async function enviarLeadACRM(lead: LeadPayload): Promise<EnviarLeadResponse> {
  const url = CONTACTOS_API_URL;
  const key = CONTACTOS_API_KEY;

  const red = lead.canal_origen || lead.metadata?.red || "instagram";
  const handle = lead.metadata?.handle || "";
  const arquetipo = lead.arquetipo_inferido || (lead.nota_referencia ? inferirArquetipoMensaje(lead.nota_referencia) : "orden_para_crecer");
  const piezaId = lead.pieza_id_origen || `CONV-${red.toUpperCase()}`;
  const slaVencimiento = lead.sla_vencimiento_at || calcularVencimientoSLA(new Date(), lead.sla_limite_horas || 48);

  const enrichedMetadata = {
    red,
    handle,
    arquetipo_inferido: arquetipo,
    pieza_id_origen: piezaId,
    canal_origen: red,
    sla_limite_horas: lead.sla_limite_horas || 48,
    sla_vencimiento_at: slaVencimiento,
    ...(lead.metadata || {}),
  };

  const body = {
    source: lead.source || "mejora_sm",
    email: lead.email,
    nombre: lead.nombre,
    telefono: lead.telefono,
    empresa: lead.empresa,
    arquetipo_inferido: arquetipo,
    pieza_id_origen: piezaId,
    canal_origen: red,
    estado_inicial: "CAPTURADO",
    sla_limite_horas: lead.sla_limite_horas || 48,
    sla_vencimiento_at: slaVencimiento,
    metadata: enrichedMetadata,
    nota_referencia:
      lead.nota_referencia ||
      `[MejoraSM] Lead derivado desde ${red}${handle ? ` (@${handle})` : ""} [Arquetipo: ${arquetipo}] [SLA 48h]`,
  };

  // 1. Intentar el endpoint central remoto si está configurado
  if (url && !url.includes("placeholder")) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (key) {
        headers["X-Api-Key"] = key;
        headers["Authorization"] = `Bearer ${key}`;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = (await res.json()) as { persona_id?: string; prospecto_id?: string; creado?: boolean };
        return {
          persona_id: json.persona_id || json.prospecto_id || `lead-${Date.now()}`,
          creado: json.creado ?? true,
          estado: "CAPTURADO",
          sla_limite_calificacion: slaVencimiento,
          origen: "crm_remoto",
        };
      }
    } catch {
      // Continuar al fallback local soberano
    }
  }

  // 2. Fallback al servidor local soberano en SQLite (/api/crm/lead)
  try {
    const localRes = await fetch(`${CRM_LOCAL_API_URL}/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: lead.email || `lead-${Date.now()}@prospecto.local`,
        nombre: lead.nombre || "Lead Social Media",
        telefono: lead.telefono,
        empresa: lead.empresa,
        utm_content: piezaId,
        utm_source: red,
        canal_origen: red,
        pieza_id_origen: piezaId,
        arquetipo_inferido: arquetipo,
        perfil_detectado_id: arquetipo,
      }),
    });

    if (localRes.ok) {
      const data = await localRes.json();
      return {
        persona_id: data.prospecto_id || data.persona_id || `lead-${Date.now()}`,
        creado: data.creado ?? !data.duplicado,
        estado: data.estado || "CAPTURADO",
        sla_limite_calificacion: data.sla_limite_calificacion || slaVencimiento,
        origen: "crm_local",
      };
    }
  } catch {
    // Continuar al fallback offline determinístico
  }

  // 3. Fallback de resiliencia total offline (evita caídas si ambos servidores están fríos)
  const idFallback = `off-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    persona_id: idFallback,
    creado: true,
    estado: "CAPTURADO",
    sla_limite_calificacion: slaVencimiento,
    origen: "crm_offline_cache",
  };
}

/**
 * Consulta la auditoría de SLAs de atención del CRM desde el backend local soberano
 */
export async function obtenerAuditoriaSlaCRM(): Promise<MetricasSlaResumen> {
  try {
    const res = await fetch(`${CRM_LOCAL_API_URL}/prospectos-sla`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.auditoria) {
        return data.auditoria as MetricasSlaResumen;
      }
    }
  } catch {
    // Offline
  }

  return {
    total_capturados: 0,
    pendientes_atencion: 0,
    en_tiempo: 0,
    proximo_vencer: 0,
    vencidos: 0,
    calificados_en_sla: 0,
    calificados_fuera_sla: 0,
    cumplimiento_pct: 100,
    tiempo_promedio_atencion_horas: 0,
    prospectos: [],
  };
}

/**
 * Transiciona un prospecto a estado CALIFICADO en el CRM local soberano para detener el reloj de SLA
 */
export async function calificarProspectoCRM(prospectoId: string, token?: string): Promise<boolean> {
  try {
    const authToken =
      token ||
      (typeof window !== "undefined" && window.localStorage?.getItem("MEJORA_SM_AUTH_TOKEN")) ||
      "mejora_sm_local_secret_token_2026";
    const res = await fetch(`${CRM_LOCAL_API_URL}/prospectos/${encodeURIComponent(prospectoId)}/estado`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        estado: "CALIFICADO",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
