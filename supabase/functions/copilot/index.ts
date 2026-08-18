// supabase/functions/copilot/index.ts
// Copiloto Reflexivo — Fase 4 del plan estratégico 2026-08-16.
// Dos modos, ambos basados en datos propios reales (metrics, success_rules,
// run_log, proposals) — nunca en cifras inventadas:
//   - action: "advice"  → "consejo del día", generado una vez por día y
//     cacheado en copilot_advice (advice_date UNIQUE evita regenerarlo en
//     cada carga del Dashboard).
//   - action: "chat"    → pregunta libre sobre los datos propios, stateless
//     (el historial de la conversación lo manda el cliente, no se persiste
//     acá — ver comentario de cabecera de la migración 015).
//
// Uso: POST /copilot { action: "advice" } | { action: "chat", question, history? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { logRun } from "../_shared/runLog.ts";

const ALLOWED_ORIGINS = [
  "https://pabloeckert.github.io",
  "https://mejorasm-*.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app") ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function validateBody(body: Record<string, unknown>, required: string[]) {
  const missing = required.filter((k) => body[k] === undefined || body[k] === null);
  if (missing.length > 0) {
    throw new Error(`Campos requeridos faltantes: ${missing.join(", ")}`);
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 1000): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries) throw e;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      console.warn(`[copilot] Retry ${i + 1}/${maxRetries} after ${Math.round(delay)}ms: ${errorMessage(e)}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// Mismo par anthropic→groq que orchestrator/index.ts (callAgent), pero solo
// los dos proveedores que hacen falta acá — el copiloto no necesita elegir
// entre 4 proveedores como Mesa de Diálogo.
async function callAI(
  system: string,
  messages: { role: string; content: string }[],
  temperature = 0.7
): Promise<string> {
  try {
    return await withRetry(() => callAnthropic(system, messages, temperature));
  } catch (e) {
    console.warn(`[copilot] Anthropic falló (${errorMessage(e)}), fallback a Groq`);
    return await withRetry(() => callGroq(system, messages, temperature));
  }
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

async function callAnthropic(
  system: string,
  messages: { role: string; content: string }[],
  temperature: number
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system,
      messages,
      temperature,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as AnthropicResponse;
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error("Anthropic: respuesta sin contenido");
  return textBlock.text;
}

interface GroqResponse {
  choices?: { message?: { content?: string } }[];
}

async function callGroq(
  system: string,
  messages: { role: string; content: string }[],
  temperature: number
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "system", content: system }, ...messages],
      temperature,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as GroqResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq: respuesta sin contenido");
  return content;
}

// ═══════════════════════════════════════
// CONTEXTO DE MARCA (RAG) — misma búsqueda vectorial que orchestrator/
// vault-process, copiada acá en vez de compartida: mismo criterio ya
// establecido en el proyecto de una función por Edge Function, sin
// abstraer lógica de negocio en _shared/ (_shared/ solo tiene infra:
// auth.ts, runLog.ts).
// ═══════════════════════════════════════

interface DocChunkRow {
  content: string;
}

async function getContextDocs(query: string): Promise<string> {
  try {
    const hfKey = Deno.env.get("HF_API_KEY");
    if (!hfKey) throw new Error("HF_API_KEY no configurada");

    const embedRes = await fetch(
      "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: [query], options: { wait_for_model: true } }),
      }
    );
    if (!embedRes.ok) throw new Error(`HF error: ${embedRes.status}`);
    const embeddings = (await embedRes.json()) as number[][];

    if (embeddings?.[0]) {
      const { data: chunks } = await supabase.rpc("match_documents", {
        query_embedding: embeddings[0],
        match_count: 4,
      });
      const rows = chunks as DocChunkRow[] | null;
      if (rows?.length) {
        return rows.map((c) => `### Fragmento relevante:\n${c.content}`).join("\n\n");
      }
    }
  } catch (e) {
    console.warn(`[copilot] Búsqueda vectorial falló: ${errorMessage(e)}, usando fallback`);
  }

  const { data: docs } = await supabase
    .from("documents")
    .select("title, content")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!docs?.length) return "No hay documentos en la bóveda aún.";
  return docs.map((d) => `### ${d.title}\n${d.content?.slice(0, 800)}`).join("\n\n");
}

// ═══════════════════════════════════════
// DATOS PROPIOS REALES — la misma fuente para "advice" y "chat", para que
// las dos modalidades del copiloto nunca se contradigan entre sí sobre qué
// dice la data.
// ═══════════════════════════════════════

interface DataSummary {
  summaryText: string;
  evidence: Record<string, unknown>;
}

interface MetricRow {
  engagement_rate: number | null;
  likes: number | null;
  reach: number | null;
  impressions: number | null;
  proposals: { format: string | null; is_test: boolean | null } | null;
}

interface SuccessRuleRow {
  rule_type: string;
  action: { reason?: string } | null;
  confidence: number;
  evidence: string | null;
}

interface RunLogErrorRow {
  source: string;
  step: string;
  error: string | null;
  created_at: string;
}

async function gatherDataSummary(): Promise<DataSummary> {
  const now = new Date();
  const nowIso = now.toISOString();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysFromNowIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgoIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const [metricsRes, rulesRes, runLogErrorsRes, scheduledRes, publishedRes] = await Promise.all([
    supabase
      .from("metrics")
      .select("engagement_rate, likes, reach, impressions, proposals(format, is_test)")
      .order("measured_at", { ascending: false })
      .limit(30),
    supabase
      .from("success_rules")
      .select("rule_type, action, confidence, evidence")
      .gte("confidence", 0.6)
      .order("confidence", { ascending: false })
      .limit(5),
    supabase
      .from("run_log")
      .select("source, step, error, created_at")
      .eq("status", "error")
      .gte("created_at", fortyEightHoursAgoIso)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("proposals")
      .select("id")
      .eq("status", "scheduled")
      .gte("scheduled_at", nowIso)
      .lte("scheduled_at", sevenDaysFromNowIso),
    supabase
      .from("proposals")
      .select("id")
      .eq("status", "published")
      .gte("published_at", sevenDaysAgoIso),
  ]);

  const realMetrics = ((metricsRes.data as MetricRow[] | null) || []).filter((m) => !m.proposals?.is_test);
  const avgEngagement =
    realMetrics.length > 0
      ? realMetrics.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / realMetrics.length
      : null;

  const rules = (rulesRes.data as SuccessRuleRow[] | null) || [];
  const runLogErrors = (runLogErrorsRes.data as RunLogErrorRow[] | null) || [];
  const scheduledCount = scheduledRes.data?.length || 0;
  const publishedCount = publishedRes.data?.length || 0;

  const evidence = {
    realMetricsCount: realMetrics.length,
    avgEngagement,
    learnedRulesCount: rules.length,
    runLogErrorsLast48h: runLogErrors.length,
    scheduledNext7Days: scheduledCount,
    publishedLast7Days: publishedCount,
  };

  const lines = [
    `Métricas reales disponibles: ${realMetrics.length} (filas de prueba excluidas).`,
    avgEngagement !== null
      ? `Engagement promedio real: ${Math.round(avgEngagement * 100) / 100}%.`
      : "Todavía no hay métricas reales para calcular un promedio.",
    rules.length > 0
      ? `Reglas aprendidas con confianza >= 60%: ${rules
          .map((r) => r.action?.reason || `${r.rule_type} (${r.evidence || "sin evidencia registrada"})`)
          .join(" | ")}`
      : "Todavía no hay reglas aprendidas con confianza suficiente (rule-engine necesita al menos 5 métricas reales para producir algo).",
    runLogErrors.length > 0
      ? `${runLogErrors.length} error(es) real(es) en el pipeline en las últimas 48hs: ${runLogErrors
          .slice(0, 3)
          .map((e) => `${e.source}/${e.step}`)
          .join(", ")}.`
      : "Sin errores registrados en el pipeline en las últimas 48hs (run_log).",
    `${scheduledCount} pieza(s) agendada(s) para los próximos 7 días. ${publishedCount} publicada(s) en los últimos 7 días.`,
  ];

  return { summaryText: lines.join("\n"), evidence };
}

// ═══════════════════════════════════════
// CONSEJO DEL DÍA
// ═══════════════════════════════════════

const ADVICE_SYSTEM_PROMPT = `Sos el Copiloto Reflexivo de MejoraOK — el asistente que ayuda a Pablo a interpretar sus propios datos de contenido (métricas, reglas aprendidas, salud del pipeline) y a pensar mejor sus próximos pasos. Tono argentino, directo, cercano, como alguien de confianza que conoce el negocio — nunca un reporte corporativo genérico. Regla innegociable: nunca inventes una cifra ni un dato que no te haya dado el usuario en el contexto — si la evidencia real es insuficiente para un consejo con sustancia, decilo con franqueza en vez de rellenar con genérico.`;

interface AdviceResult {
  advice_date: string;
  content: string;
  evidence: Record<string, unknown>;
  cached: boolean;
}

async function getOrGenerateAdvice(): Promise<AdviceResult> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("copilot_advice")
    .select("advice_date, content, evidence")
    .eq("advice_date", today)
    .maybeSingle();

  if (existing) {
    return { ...existing, cached: true };
  }

  const { summaryText, evidence } = await gatherDataSummary();
  const contextDocs = await getContextDocs("consejo estratégico de contenido basado en resultados reales");

  const userText = `DATOS REALES DE HOY:\n${summaryText}\n\nDOCUMENTOS DE MARCA:\n${contextDocs}\n\nEscribí un "consejo del día" breve (2 a 4 frases) para Pablo, basado ÚNICAMENTE en los datos reales de arriba. Si son insuficientes para un consejo con sustancia real, decilo con franqueza en vez de rellenar con algo genérico.`;

  const content = await callAI(ADVICE_SYSTEM_PROMPT, [{ role: "user", content: userText }], 0.7);

  const { data: inserted, error: insertError } = await supabase
    .from("copilot_advice")
    .insert({ advice_date: today, content, evidence })
    .select("advice_date, content, evidence")
    .single();

  if (insertError) {
    // 23505 = unique_violation — otra request en simultáneo ya generó el
    // consejo de hoy (advice_date es UNIQUE). No es un error real, es la
    // idempotencia funcionando: se devuelve la fila que ya quedó guardada.
    if (insertError.code === "23505") {
      const { data: existingRace } = await supabase
        .from("copilot_advice")
        .select("advice_date, content, evidence")
        .eq("advice_date", today)
        .single();
      if (existingRace) return { ...existingRace, cached: true };
    }
    throw new Error(`Error guardando el consejo del día: ${insertError.message}`);
  }

  return { ...inserted, cached: false };
}

// ═══════════════════════════════════════
// CHAT SOBRE DATOS PROPIOS
// ═══════════════════════════════════════

const CHAT_SYSTEM_PROMPT = `Sos el Copiloto Reflexivo de MejoraOK — el asistente que ayuda a Pablo a interpretar sus propios datos de contenido y a pensar mejor sus próximos pasos. Tono argentino, directo, cercano — como charlar con alguien de confianza que conoce el negocio, no un informe. Regla innegociable: nunca inventes una cifra ni un dato que no esté en el contexto que te dan — si la pregunta pide algo que los datos no cubren, decilo explícitamente. Respuesta breve y concreta: esto es un chat, no un informe largo.`;

async function runChat(question: string, history: { role: string; content: string }[]): Promise<string> {
  const { summaryText } = await gatherDataSummary();
  const contextDocs = await getContextDocs(question);

  const system = `${CHAT_SYSTEM_PROMPT}

DATOS REALES DE HOY:
${summaryText}

DOCUMENTOS DE MARCA:
${contextDocs}`;

  const messages = [
    ...history.map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
    { role: "user", content: question },
  ];

  return callAI(system, messages, 0.6);
}

// ═══════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return unauthorizedResponse(auth, corsHeaders);

  const startedAt = Date.now();
  let action: string | undefined;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    action = body.action as string | undefined;

    let result: { cached?: boolean; answer?: string } | undefined;

    switch (action) {
      case "advice": {
        result = await getOrGenerateAdvice();
        break;
      }

      case "chat": {
        validateBody(body, ["question"]);
        const question = body.question as string;
        const history = Array.isArray(body.history)
          ? (body.history as { role: string; content: string }[]).slice(-10)
          : [];
        const answer = await runChat(question, history);
        result = { answer };
        break;
      }

      default:
        throw new Error("Acción no válida. Usa 'advice' o 'chat'");
    }

    await logRun({
      source: "copilot",
      step: action,
      status: "success",
      durationMs: Date.now() - startedAt,
      metadata: action === "advice" ? { cached: result?.cached } : {},
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = errorMessage(e);
    await logRun({
      source: "copilot",
      step: action || "unknown",
      status: "error",
      durationMs: Date.now() - startedAt,
      error: msg,
    });
    const status = msg.includes("Campos requeridos") ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
