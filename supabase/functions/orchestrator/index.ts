// supabase/functions/orchestrator/index.ts
// Mesa de Diálogo Multi-Agente — orquesta el debate entre Estratega, Creativo y Crítico
// Uso: POST /orchestrator { action: 'start'|'continue', topic?, sessionId?, feedback? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";

const ALLOWED_ORIGINS = [
  "https://mejorasm-*.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")
    ? origin
    : ALLOWED_ORIGINS[0];
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

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

function validateBody(body: any, required: string[]) {
  const missing = required.filter((k) => body[k] === undefined || body[k] === null);
  if (missing.length > 0) {
    throw new Error(`Campos requeridos faltantes: ${missing.join(", ")}`);
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 1000): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === maxRetries) throw e;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      console.warn(`[orchestrator] Retry ${i + 1}/${maxRetries} after ${Math.round(delay)}ms: ${e.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ═══════════════════════════════════════
// SANITIZACIÓN DE INPUT
// ═══════════════════════════════════════

function sanitizeText(text: string, maxLen = 5000): string {
  if (typeof text !== "string") return "";
  // Trim, limitar longitud, remover null bytes
  return text
    .trim()
    .slice(0, maxLen)
    .replace(/\0/g, "");
}

function sanitizeTopic(topic: string): string {
  const clean = sanitizeText(topic, 500);
  if (clean.length === 0) throw new ValidationError("El tema no puede estar vacío");
  if (clean.length < 3) throw new ValidationError("El tema es muy corto (mínimo 3 caracteres)");
  return clean;
}

async function callAI(
  provider: string,
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  temperature = 0.7
): Promise<string> {
  const allMessages = system
    ? [{ role: "system", content: system }, ...messages]
    : messages;

  switch (provider) {
    case "groq": {
      const apiKey = Deno.env.get("GROQ_API_KEY");
      if (!apiKey) throw new Error("GROQ_API_KEY no configurada");
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "llama-3.3-70b-versatile",
          messages: allMessages,
          temperature,
          max_tokens: 2048,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq error ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Groq: respuesta sin contenido");
      return content;
    }
    case "deepseek": {
      const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
      if (!apiKey) throw new Error("DEEPSEEK_API_KEY no configurada");
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "deepseek-chat",
          messages: allMessages,
          temperature,
          max_tokens: 2048,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`DeepSeek error ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("DeepSeek: respuesta sin contenido");
      return content;
    }
    case "gemini": {
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");
      const contents = allMessages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
      const systemMsg = allMessages.find((m) => m.role === "system");
      const body: any = {
        contents,
        generationConfig: { temperature, maxOutputTokens: 2048 },
      };
      if (systemMsg) {
        body.systemInstruction = { parts: [{ text: systemMsg.content }] };
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("Gemini: respuesta sin contenido");
      return content;
    }
    default:
      throw new Error(`Proveedor no soportado: ${provider}`);
  }
}

async function getAgentConfig(agentId: string) {
  const { data } = await supabase
    .from("agent_config")
    .select("*")
    .eq("id", agentId)
    .single();
  return data;
}

async function getContextDocs(query: string): Promise<string> {
  // Búsqueda vectorial real usando embeddings (llamada directa a HF)
  try {
    const hfKey = Deno.env.get("HF_API_KEY");
    if (!hfKey) throw new Error("HF_API_KEY no configurada");

    const embedRes = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: [query], options: { wait_for_model: true } }),
      }
    );

    if (!embedRes.ok) throw new Error(`HF error: ${embedRes.status}`);
    const embeddings = await embedRes.json();

    if (embeddings?.[0]) {
      const { data: chunks } = await supabase.rpc("match_documents", {
        query_embedding: embeddings[0],
        match_count: 5,
      });

      if (chunks?.length) {
        return chunks.map((c: any) => `### Fragmento relevante:\n${c.content}`).join("\n\n");
      }
    }
  } catch (e: any) {
    console.warn(`[orchestrator] Búsqueda vectorial falló: ${e.message}, usando fallback`);
  }

  // Fallback: últimos 5 documentos procesados
  const { data: docs } = await supabase
    .from("documents")
    .select("title, content")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!docs?.length) return "No hay documentos en la bóveda aún.";

  return docs.map((d) => `### ${d.title}\n${d.content?.slice(0, 1000)}`).join("\n\n");
}

async function saveMessage(
  sessionId: string,
  agent: string,
  content: string,
  turn: number
) {
  await supabase.from("dialogue_messages").insert({
    session_id: sessionId,
    agent,
    content,
    turn,
  });
}

// ═══════════════════════════════════════
// AUTO-AGENDA (posts de feed, PLAN_AUTONOMIA.md Fase 2)
//
// Objetivo de autonomía total: una propuesta aprobada por el Crítico no
// espera un click de "Aprobar"/"Agendar" — se agenda sola. El control
// humano pasa a ser posterior (cancelar en /propuestas mientras está
// "scheduled", o despublicar ya publicada vía manage-post.yml), no un gate
// previo. Aplica a "post" y "carrusel" (ambos con pipeline de publicación
// autónomo, ver PLAN_AUTONOMIA.md Fase 7) — "historia" todavía no tiene uno,
// así que esa queda en "pending" para gestión manual como antes.
// ═══════════════════════════════════════

const AUTO_PUBLISH_FORMATS = ["post", "carrusel"];
const OFERTAS = ["personal", "organizacional", "comercial", "empresarial", "profesionalizacion"];
// Espaciado entre posts de feed autogenerados, para no saturar el feed con
// varias corridas seguidas de Mesa de Diálogo el mismo día. Ajustable acá
// sin tocar el resto del pipeline.
const POST_SPACING_HOURS = 24;

async function pickNextOferta(): Promise<string> {
  const { data } = await supabase
    .from("proposals")
    .select("oferta")
    .in("format", AUTO_PUBLISH_FORMATS)
    .in("status", ["scheduled", "published"])
    .not("oferta", "is", null);

  const counts = Object.fromEntries(OFERTAS.map((o) => [o, 0]));
  for (const row of data || []) {
    if (row.oferta in counts) counts[row.oferta]++;
  }
  return OFERTAS.reduce((best, o) => (counts[o] < counts[best] ? o : best), OFERTAS[0]);
}

async function pickNextSlot(): Promise<string> {
  const { data } = await supabase
    .from("proposals")
    .select("scheduled_at")
    .in("format", AUTO_PUBLISH_FORMATS)
    .in("status", ["scheduled", "published"])
    .order("scheduled_at", { ascending: false })
    .limit(1);

  const now = Date.now();
  const lastSlot = data?.[0]?.scheduled_at ? new Date(data[0].scheduled_at).getTime() : 0;
  const spacingMs = POST_SPACING_HOURS * 60 * 60 * 1000;
  return new Date(Math.max(now, lastSlot + spacingMs)).toISOString();
}

// ═══════════════════════════════════════
// AGENTES
// ═══════════════════════════════════════

async function runEstratega(
  topic: string,
  contextDocs: string,
  history: string
): Promise<string> {
  const config = await getAgentConfig("estratega");
  const system = `${config.system_prompt}

DOCUMENTOS DE MARCA:
${contextDocs}

${history ? `HISTORIAL DEL DEBATE:\n${history}` : ""}

INSTRUCCIONES:
Proponé un ángulo de contenido para Instagram sobre: "${topic}"
Incluí:
1. Ángulo/propuesta (por qué debería publicar esto)
2. 3 hooks en tono argentino directo
3. Buyer persona objetivo
4. Formato recomendado (post, carrusel, historia)
5. Momento ideal de publicación`;

  return withRetry(() =>
    callAI(
      config.provider,
      config.model,
      system,
      [{ role: "user", content: `Tema: ${topic}` }],
      config.temperature
    )
  );
}

async function runCreativo(
  estrategia: string,
  contextDocs: string,
  history: string
): Promise<string> {
  const config = await getAgentConfig("creativo");
  const system = `${config.system_prompt}

DOCUMENTOS DE MARCA:
${contextDocs}

${history ? `HISTORIAL DEL DEBATE:\n${history}` : ""}

INSTRUCCIONES:
Basándote en la estrategia del Agente Estratega, redactá el contenido completo.

Formato de salida:
HOOK: [hook principal]
BODY: [copy completo del post]
CTA: [call to action]
HASHTAGS: [5-10 hashtags relevantes]
NOTAS VISUALES: [qué imagen/video necesitás]`;

  return withRetry(() =>
    callAI(
      config.provider,
      config.model,
      system,
      [{ role: "user", content: estrategia }],
      config.temperature
    )
  );
}

async function runCritico(
  contenido: string,
  contextDocs: string,
  history: string
): Promise<{ aprobado: boolean; feedback: string }> {
  const config = await getAgentConfig("critico");
  const system = `${config.system_prompt}

DOCUMENTOS DE MARCA (CRITERIO INNEGOCIABLE):
${contextDocs}

${history ? `HISTORIAL DEL DEBATE:\n${history}` : ""}

INSTRUCCIONES:
Evaluá este contenido contra los documentos de marca.
Respondé ÚNICAMENTE en este formato:

DECISION: APROBADO | RECHAZADO
RAZON: [explicación breve]
SUGERENCIAS: [si fue rechazado, qué cambiar]`;

  const response = await withRetry(() =>
    callAI(
      config.provider,
      config.model,
      system,
      [{ role: "user", content: contenido }],
      config.temperature
    )
  );

  const feedback = response || "Sin feedback del agente crítico";
  const aprobado = feedback.toUpperCase().includes("DECISION: APROBADO");
  return { aprobado, feedback };
}

// ═══════════════════════════════════════
// FLUJO PRINCIPAL
// ═══════════════════════════════════════

async function startSession(topic: string) {
  // 1. Crear sesión
  const { data: session, error: sessionError } = await supabase
    .from("dialogue_sessions")
    .insert({ topic, status: "active" })
    .select()
    .single();

  if (sessionError) throw new Error(`Error creando sesión: ${sessionError.message}`);
  if (!session) throw new Error("No se pudo crear la sesión");

  // 2. Obtener contexto de la bóveda
  const contextDocs = await getContextDocs(topic);

  // 3. Ejecutar los 3 agentes secuencialmente
  const history: string[] = [];

  // Estratega propone
  const estrategia = await runEstratega(topic, contextDocs, "");
  history.push(`## Agente Estratega:\n${estrategia}`);
  await saveMessage(session.id, "estratega", estrategia, 1);

  // Creativo redacta
  const contenido = await runCreativo(estrategia, contextDocs, history.join("\n"));
  history.push(`## Agente Creativo:\n${contenido}`);
  await saveMessage(session.id, "creativo", contenido, 2);

  // Crítico evalúa
  const evaluacion = await runCritico(contenido, contextDocs, history.join("\n"));
  await saveMessage(session.id, "critico", evaluacion.feedback, 3);

  // 4. Extraer propuesta estructurada
  const proposal = extractProposal(contenido, estrategia);

  // 5. Actualizar sesión
  await supabase
    .from("dialogue_sessions")
    .update({
      status: evaluacion.aprobado ? "approved" : "needs_review",
      final_proposal: contenido,
      metadata: {
        estrategia,
        evaluacion,
        proposal,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  // 6. Crear propuesta si fue aprobada — autoagendada si es un formato con
  // pipeline autónomo (ver AUTO-AGENDA arriba), pending si no.
  if (evaluacion.aprobado) {
    const format = proposal.format || "post";
    const insert: Record<string, unknown> = {
      session_id: session.id,
      format,
      title: proposal.hook || topic,
      body: proposal.body || contenido,
      hashtags: proposal.hashtags || [],
      hook: proposal.hook,
      cta: proposal.cta,
    };

    if (AUTO_PUBLISH_FORMATS.includes(format)) {
      insert.status = "scheduled";
      insert.oferta = await pickNextOferta();
      insert.scheduled_at = await pickNextSlot();
    } else {
      insert.status = "pending";
    }

    await supabase.from("proposals").insert(insert);
  }

  return {
    sessionId: session.id,
    estrategia,
    contenido,
    evaluacion,
    proposal,
    aprobado: evaluacion.aprobado,
  };
}

function extractProposal(contenido: string, estrategia: string) {
  // Parse simple del contenido generado
  const hook = contenido.match(/HOOK:\s*(.+)/i)?.[1]?.trim() || "";
  const body = contenido.match(/BODY:\s*([\s\S]+?)(?=CTA:|HASHTAGS:|NOTAS VISUALES:|$)/i)?.[1]?.trim() || contenido;
  const cta = contenido.match(/CTA:\s*(.+)/i)?.[1]?.trim() || "";
  const hashtagsStr = contenido.match(/HASHTAGS:\s*(.+)/i)?.[1]?.trim() || "";
  const hashtags = hashtagsStr.split(/[,\s]+/).filter((h) => h.startsWith("#"));

  // Detectar formato
  const format = estrategia.toLowerCase().includes("carrusel")
    ? "carrusel"
    : estrategia.toLowerCase().includes("historia")
    ? "historia"
    : "post";

  return { hook, body, cta, hashtags, format };
}

async function continueSession(sessionId: string, feedback: string) {
  // Buscar sesión
  const { data: session } = await supabase
    .from("dialogue_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  // Obtener historial previo
  const { data: messages } = await supabase
    .from("dialogue_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("turn", { ascending: true });

  const history = messages
    ?.map((m) => `## ${m.agent}:\n${m.content}`)
    .join("\n") || "";

  const contextDocs = await getContextDocs(session.topic);
  const nextTurn = (messages?.length || 0) + 1;

  // El feedback del usuario se agrega al historial
  const fullHistory = `${history}\n\n## Usuario:\n${feedback}`;

  // Re-ejecutar Creativo con feedback
  const contenido = await runCreativo(
    feedback,
    contextDocs,
    fullHistory
  );
  await saveMessage(sessionId, "creativo", contenido, nextTurn);

  // Re-ejecutar Crítico
  const evaluacion = await runCritico(
    contenido,
    contextDocs,
    `${fullHistory}\n\n## Creativo (revisión):\n${contenido}`
  );
  await saveMessage(sessionId, "critico", evaluacion.feedback, nextTurn + 1);

  return {
    contenido,
    evaluacion,
    aprobado: evaluacion.aprobado,
  };
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

  try {
    const body = await req.json();
    const { action, topic, sessionId, feedback } = body;

    let result;

    switch (action) {
      case "start":
        validateBody(body, ["topic"]);
        result = await startSession(topic);
        break;

      case "continue":
        validateBody(body, ["sessionId", "feedback"]);
        result = await continueSession(sessionId, feedback);
        break;

      default:
        throw new Error("Acción no válida. Usa 'start' o 'continue'");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const status = e.message?.includes("Campos requeridos") ? 400 : 500;
    return new Response(JSON.stringify({ error: e.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
