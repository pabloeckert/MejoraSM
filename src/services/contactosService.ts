/**
 * Servicio para integrar MejoraSM con la API central de contactos (MejoraContactos / CRM)
 * Endpoint: https://tzatuvxatsduuslxqdtm.supabase.co/functions/v1/contactos-api
 */

export const CONTACTOS_API_URL =
  import.meta.env.VITE_CONTACTOS_API_URL ||
  'https://tzatuvxatsduuslxqdtm.supabase.co/functions/v1/contactos-api';

export const CONTACTOS_API_KEY =
  import.meta.env.VITE_CONTACTOS_API_KEY ||
  'b06fb0a66d0db70562e0c11c7f7399614976b3fa31e30181f479a7b5a80ce398';

export interface LeadPayload {
  source?: string;
  email?: string;
  nombre?: string;
  telefono?: string;
  metadata?: {
    red?: string;
    thread_id?: string;
    sentiment?: string;
    [key: string]: unknown;
  };
  nota_referencia?: string;
  [key: string]: unknown;
}

export interface EnviarLeadResponse {
  persona_id: string;
  creado: boolean;
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
 * Envía un lead calificado desde MejoraSM hacia la fuente de verdad y CRM
 */
export async function enviarLeadACRM(lead: LeadPayload): Promise<EnviarLeadResponse> {
  const url = CONTACTOS_API_URL;
  const key = CONTACTOS_API_KEY;

  const body = {
    source: lead.source || 'mejora_sm',
    email: lead.email,
    nombre: lead.nombre,
    telefono: lead.telefono,
    metadata: lead.metadata || { red: 'instagram' },
    nota_referencia:
      lead.nota_referencia ||
      `[MejoraSM] Lead derivado desde ${lead.metadata?.red || 'redes'}`,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error enviando lead a CRM (${res.status}): ${errorText}`);
  }

  return (await res.json()) as EnviarLeadResponse;
}
