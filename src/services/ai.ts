// src/services/ai.ts
// Cliente para las Edge Functions de Supabase

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[ai.ts] Variables de entorno de Supabase no configuradas. Las funciones de IA no funcionarán.");
}

// 2026-08-31: el EDA volvió a tener login (usuario/contraseña, una sola
// cuenta) — las Edge Functions exigen de nuevo el JWT real del usuario
// (ver supabase/functions/_shared/auth.ts). `Authorization` lleva el
// access_token de la sesión; `apikey` sigue siendo el anon key (lo exige
// el gateway de Supabase). Sin sesión no hay llamada válida — el AuthGate
// no deja llegar acá sin login.
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

// Hallazgo real de auditoría 2026-08-25: el debate de 3 agentes (Estratega
// → Creativo → Crítico, cada uno con reintentos y fallback Anthropic→Groq)
// podía tardar varios minutos sin que la UI diera ninguna indicación de
// cuánto ni forma de cancelar — un fetch colgado se veía igual que uno que
// sigue trabajando de verdad. 150s da margen real (peor caso: ~6 llamadas
// externas con backoff) sin dejar a alguien esperando indefinidamente.
const DIALOGUE_TIMEOUT_MS = 150_000;
// B14 (auditoría 2026-08-31): antes solo el debate tenía timeout — vault-process,
// classify-photo y el copiloto usaban fetch pelado y podían colgarse para
// siempre. classify-photo es el peor caso: bloquea el botón "Confirmar" del
// flujo de subida.
const VAULT_TIMEOUT_MS = 90_000;
const QUICK_TIMEOUT_MS = 45_000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiError(
        `Los agentes tardaron más de ${Math.round(timeoutMs / 1000)}s sin responder — probá de nuevo.`,
        408
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
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
  proposalId: string | null;
  // Si aprobado y el formato tiene pipeline autónomo (post/carrusel), la
  // propuesta ya quedó agendada sola en este mismo request — sin esto el
  // usuario no tiene forma de saber, desde Mesa de Diálogo, que ya se
  // programó una publicación real (hallazgo de auditoría 2026-08-25).
  autoPublished: boolean;
  scheduledAt: string | null;
  oferta: string | null;
  // Fase B (2026-08-31): si la sesión arrancó en "modo libre", el tema que
  // eligió el sistema.
  autoTopic?: string | null;
}

export interface ContinueResult {
  contenido: string;
  evaluacion: { aprobado: boolean; feedback: string };
  aprobado: boolean;
}

export async function startDialogue(topic: string, mode: "dirigido" | "auto" = "dirigido"): Promise<DialogueResult> {
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/orchestrator`,
    {
      method: "POST",
      headers: await buildHeaders(),
      body: JSON.stringify({ action: "start", topic, mode }),
    },
    DIALOGUE_TIMEOUT_MS
  );
  return handleResponse(res, "Error iniciando el diálogo con los agentes");
}

export async function continueDialogue(sessionId: string, feedback: string): Promise<ContinueResult> {
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/orchestrator`,
    {
      method: "POST",
      headers: await buildHeaders(),
      body: JSON.stringify({ action: "continue", sessionId, feedback }),
    },
    DIALOGUE_TIMEOUT_MS
  );
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
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/vault-process`,
    { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ action: "process", documentId }) },
    VAULT_TIMEOUT_MS
  );
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
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/copilot`,
    { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ action: "advice" }) },
    QUICK_TIMEOUT_MS
  );
  return handleResponse(res, "Error generando el consejo del día");
}

export async function sendCopilotMessage(
  question: string,
  history: CopilotChatMessage[]
): Promise<{ answer: string }> {
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/copilot`,
    { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ action: "chat", question, history }) },
    QUICK_TIMEOUT_MS
  );
  return handleResponse(res, "Error consultando al copiloto");
}

// ═══════════════════════════════════════
// CLASSIFY PHOTO (sugerencia de dimensión — Taller de la Oferta, 2026-08-17)
// ═══════════════════════════════════════

export interface DimensionSuggestion {
  dimension: string;
  reason: string;
}

// ═══════════════════════════════════════
// INSIGHTS (Fase A del plan de continuación 2026-08-31 — motor de insights
// del Dashboard, cierra el punto 3 del brief de rediseño)
// ═══════════════════════════════════════

export interface Insight {
  id: string;
  title: string;
  body: string;
  evidence: string;
  confidence: number;
  status: "seed_unchanged" | "refined" | "updated" | "new" | string;
}

export interface InsightsResult {
  week_start: string;
  insights: Insight[];
  model: string | null;
  generated_at: string;
  cached: boolean;
}

export async function getInsights(): Promise<InsightsResult> {
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/insights`,
    { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ action: "get" }) },
    VAULT_TIMEOUT_MS
  );
  return handleResponse(res, "Error generando los insights");
}

export async function sendInsightFeedback(insightId: string, weekStart: string, useful: boolean): Promise<{ ok: boolean }> {
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/insights`,
    { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ action: "feedback", insightId, weekStart, useful }) },
    QUICK_TIMEOUT_MS
  );
  return handleResponse(res, "Error guardando la valoración");
}

export async function suggestPhotoDimension(imageBase64: string, mimeType: string): Promise<DimensionSuggestion> {
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/classify-photo`,
    { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ action: "suggest", imageBase64, mimeType }) },
    QUICK_TIMEOUT_MS
  );
  return handleResponse(res, "Error sugiriendo la dimensión de la foto");
}

// ═══════════════════════════════════════
// INBOX (Bandeja de conversaciones — Fase 1 del plan de publicación 2026)
// ═══════════════════════════════════════

const INBOX_SYNC_TIMEOUT_MS = 120_000; // trae comentarios + DMs de 2 cuentas + clasifica

export async function syncInbox(): Promise<{ pulled: number; upserted: number; classified: number }> {
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/inbox`,
    { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ action: "sync" }) },
    INBOX_SYNC_TIMEOUT_MS
  );
  return handleResponse(res, "Error sincronizando la bandeja");
}

export async function draftInboxReply(itemId: string): Promise<{ draft: string }> {
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/inbox`,
    { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ action: "draft", itemId }) },
    QUICK_TIMEOUT_MS
  );
  return handleResponse(res, "Error redactando la respuesta sugerida");
}

export async function sendInboxReply(itemId: string, message: string): Promise<{ ok: boolean }> {
  const res = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/inbox`,
    { method: "POST", headers: await buildHeaders(), body: JSON.stringify({ action: "reply", itemId, message }) },
    QUICK_TIMEOUT_MS
  );
  return handleResponse(res, "Error enviando la respuesta");
}
