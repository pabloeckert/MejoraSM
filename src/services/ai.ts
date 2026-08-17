// src/services/ai.ts
// Cliente para las Edge Functions de Supabase

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[ai.ts] Variables de entorno de Supabase no configuradas. Las funciones de IA no funcionarán.");
}

// Las Edge Functions ahora exigen el JWT del usuario autenticado (ver
// supabase/functions/_shared/auth.ts) — el anon key solo, sin sesión, ya no
// alcanza. `apikey` sigue siendo el anon key (lo exige el gateway de
// Supabase); `Authorization` lleva el access_token real de la sesión.
async function buildHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    apikey: SUPABASE_ANON_KEY ?? "",
  };
}

// ═══════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse<T>(res: Response, fallbackMsg: string): Promise<T> {
  if (!res.ok) {
    let errorMsg = fallbackMsg;
    try {
      const err = await res.json();
      errorMsg = err.error || err.message || fallbackMsg;
    } catch {
      errorMsg = `${fallbackMsg} (HTTP ${res.status})`;
    }

    // Mensajes amigables según código de error
    if (res.status === 401 || res.status === 403) {
      errorMsg = "No tenés permisos para esta acción. Verificá la configuración.";
    } else if (res.status === 429) {
      errorMsg = "Demasiadas requests. Esperá un momento e intentá de nuevo.";
    } else if (res.status >= 500) {
      errorMsg = "El servidor no está disponible. Intentá de nuevo en unos minutos.";
    }

    throw new ApiError(errorMsg, res.status);
  }
  return res.json();
}

// ═══════════════════════════════════════
// ORCHESTRATOR (Mesa de Diálogo)
// ═══════════════════════════════════════

export interface DialogueResult {
  sessionId: string;
  estrategia: string;
  contenido: string;
  evaluacion: { aprobado: boolean; feedback: string };
  proposal: { hook: string; body: string; cta: string; hashtags: string[]; format: string };
  aprobado: boolean;
}

export interface ContinueResult {
  contenido: string;
  evaluacion: { aprobado: boolean; feedback: string };
  aprobado: boolean;
}

export async function startDialogue(topic: string): Promise<DialogueResult> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator`, {
    method: "POST",
    headers: await buildHeaders(),
    body: JSON.stringify({ action: "start", topic }),
  });
  return handleResponse(res, "Error iniciando el diálogo con los agentes");
}

export async function continueDialogue(sessionId: string, feedback: string): Promise<ContinueResult> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator`, {
    method: "POST",
    headers: await buildHeaders(),
    body: JSON.stringify({ action: "continue", sessionId, feedback }),
  });
  return handleResponse(res, "Error continuando el diálogo");
}

// ═══════════════════════════════════════
// VAULT (Bóveda de Conocimiento)
// ═══════════════════════════════════════

export interface ProcessResult {
  documentId: string;
  chunksCreated: number;
  totalTokens: number;
  withEmbeddings: boolean;
}

export async function processDocument(documentId: string): Promise<ProcessResult> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/vault-process`, {
    method: "POST",
    headers: await buildHeaders(),
    body: JSON.stringify({ action: "process", documentId }),
  });
  return handleResponse(res, "Error procesando el documento");
}

// ═══════════════════════════════════════
// COPILOT (Copiloto Reflexivo — Fase 4 del plan estratégico 2026-08-16)
// ═══════════════════════════════════════

export interface CopilotAdvice {
  advice_date: string;
  content: string;
  evidence: Record<string, unknown>;
  cached: boolean;
}

export interface CopilotChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function getCopilotAdvice(): Promise<CopilotAdvice> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/copilot`, {
    method: "POST",
    headers: await buildHeaders(),
    body: JSON.stringify({ action: "advice" }),
  });
  return handleResponse(res, "Error generando el consejo del día");
}

export async function sendCopilotMessage(
  question: string,
  history: CopilotChatMessage[]
): Promise<{ answer: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/copilot`, {
    method: "POST",
    headers: await buildHeaders(),
    body: JSON.stringify({ action: "chat", question, history }),
  });
  return handleResponse(res, "Error consultando al copiloto");
}

// ═══════════════════════════════════════
// CLASSIFY PHOTO (sugerencia de dimensión — Taller de la Oferta, 2026-08-17)
// ═══════════════════════════════════════

export interface DimensionSuggestion {
  dimension: string;
  reason: string;
}

export async function suggestPhotoDimension(imageBase64: string, mimeType: string): Promise<DimensionSuggestion> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/classify-photo`, {
    method: "POST",
    headers: await buildHeaders(),
    body: JSON.stringify({ action: "suggest", imageBase64, mimeType }),
  });
  return handleResponse(res, "Error sugiriendo la dimensión de la foto");
}
