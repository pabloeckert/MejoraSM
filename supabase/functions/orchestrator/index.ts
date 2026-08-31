// supabase/functions/orchestrator/index.ts
// Mesa de Diálogo Multi-Agente — orquesta el debate entre Estratega, Creativo y Crítico
// Uso: POST /orchestrator { action: 'start'|'continue', topic?, sessionId?, feedback? }

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
          model: model || "openai/gpt-oss-120b",
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
    case "anthropic": {
      // Misma API (Messages, no chat completions) y mismo ANTHROPIC_API_KEY
      // que scripts/lib/claude.mjs usa para Stories.
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");
      const nonSystemMessages = allMessages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
      const systemMsg = allMessages.find((m) => m.role === "system");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "claude-sonnet-5",
          max_tokens: 2048,
          system: systemMsg?.content,
          messages: nonSystemMessages,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      const textBlock = data.content?.find((b: any) => b.type === "text");
      if (!textBlock?.text) throw new Error("Anthropic: respuesta sin contenido");
      return textBlock.text;
    }
    default:
      throw new Error(`Proveedor no soportado: ${provider}`);
  }
}

// Ruteo de modelo — 2026-08-05, reemplaza la dependencia de agent_config
// (provider/model editables en /configuracion, que ahora se ignoran para
// esto; agent_config.temperature y .system_prompt se siguen usando).
// Mismo criterio que la skill optimo-de-uso: mínima potencia suficiente,
// Sonnet por default, Opus solo cuando la tarea objetivamente lo justifica.
//
// La única tarea de los 3 agentes con "razonamiento con muchas variables
// cruzadas" real es el Crítico re-evaluando en una ronda de "continue":
// tiene que ponderar a la vez el rechazo anterior, el feedback nuevo del
// Creativo y el criterio de marca — más variables que una primera
// evaluación (que ya es directa: contenido nuevo contra el manual). Por
// eso es el único caso que escala a Opus. Estratega y Creativo — trabajo
// de propuesta/redacción, no de arbitraje — siempre Sonnet, en cualquier
// ronda.
function pickModel(agent: "estratega" | "creativo" | "critico", isReevaluation: boolean): string {
  if (agent === "critico" && isReevaluation) return "claude-opus-5";
  return "claude-sonnet-5";
}

async function callAgent(
  agent: "estratega" | "creativo" | "critico",
  isReevaluation: boolean,
  temperature: number,
  system: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const model = pickModel(agent, isReevaluation);
  try {
    return await withRetry(() => callAI("anthropic", model, system, messages, temperature));
  } catch (e: any) {
    console.warn(`[orchestrator] Anthropic (${model}) falló (${e.message}), fallback a Groq`);
    return await withRetry(() =>
      callAI("groq", "openai/gpt-oss-120b", system, messages, temperature)
    );
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
      "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
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

// ═══════════════════════════════════════
// LOOP DE APRENDIZAJE — Fase 2 del plan estratégico 2026-08-16
//
// rule-engine ya generaba success_rules desde el 2026-08-02 (cron diario),
// pero nada las leía al generar contenido nuevo — el sistema medía y
// concluía, pero no cambiaba su comportamiento. Esto cierra ese loop: el
// Estratega y el Creativo reciben las reglas aprendidas (confidence >= 0.6)
// como contexto adicional, con la evidencia numérica real, no como una
// orden ciega — el Crítico sigue siendo la autoridad final sobre marca.
// ═══════════════════════════════════════

const LEARNED_RULES_MIN_CONFIDENCE = 0.6;

async function getLearnedRulesBlock(): Promise<string> {
  const { data: rules } = await supabase
    .from("success_rules")
    .select("rule_type, condition, action, confidence, evidence")
    .gte("confidence", LEARNED_RULES_MIN_CONFIDENCE)
    .order("confidence", { ascending: false })
    .limit(10);

  if (!rules?.length) return "";

  const lines = rules.map((r) => {
    const reason = r.action?.reason || JSON.stringify(r.action);
    const pct = Math.round((r.confidence ?? 0) * 100);
    return `- [${r.rule_type}] ${reason} (confianza ${pct}%, evidencia real: ${r.evidence})`;
  });

  return `\n\nLO QUE YA APRENDIMOS DE NUESTROS PROPIOS DATOS (rule-engine, confianza >= ${Math.round(LEARNED_RULES_MIN_CONFIDENCE * 100)}%):\n${lines.join("\n")}\nUsá esto como contexto real de qué funcionó antes con este público — no es una orden ciega, el criterio de marca sigue siendo lo primero.`;
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
// "Sociales" (agregada 2026-08-17, Taller de la Oferta) NO participa de esta
// rotación a propósito: es contenido anclado a eventos reales de equipo (After
// Office, alianzas, celebraciones), no un tema de estrategia que el Estratega
// deba poder elegir en automático — dejarla afuera evita que Mesa de Diálogo
// invente un "somos un gran equipo" genérico sin ningún evento real detrás.
// Sí participa del pipeline de Stories (generate-brief.mjs), que arma el copy
// a partir de la foto real, con contexto real.
const OFERTAS = ["personal", "organizacional", "comercial", "empresarial", "profesionalizacion"];
// Espaciado entre posts de feed autogenerados, para no saturar el feed con
// varias corridas seguidas de Mesa de Diálogo el mismo día. Ajustable acá
// sin tocar el resto del pipeline.
const POST_SPACING_HOURS = 24;

// B4 (auditoría 2026-08-31): pickNextSlot devolvía max(now, lastSlot + 24h) sin
// fijar hora del día, así que si la primera cadena arrancó a las 03:38 UTC,
// todo post autónomo salía ~00:38 ART — justo cuando la audiencia B2B no está.
// Ahora se apunta a bloques horarios reales (≈ 09/13/20 ART = 12/16/23 UTC,
// coherente con "audiencia online 11–23h" de los insights del Dashboard), y si
// rule-engine aprendió una regla de timing con confianza alta, se prioriza esa.
const PREFERRED_UTC_HOURS = [12, 16, 23];
const ROLLING_WINDOW_DAYS = 30;

async function getLearnedTimingHour(): Promise<number | null> {
  const { data } = await supabase
    .from("success_rules")
    .select("condition, confidence")
    .eq("rule_type", "timing")
    .gte("confidence", LEARNED_RULES_MIN_CONFIDENCE)
    .order("confidence", { ascending: false })
    .limit(1);
  const h = data?.[0]?.condition?.hour;
  return typeof h === "number" && h >= 0 && h <= 23 ? h : null;
}

// Adelanta `from` hasta la próxima ocurrencia de una hora preferida (UTC),
// minutos/segundos en 0. Si la hora actual ya es preferida y todavía no pasó,
// la usa; si no, la próxima del día o la primera del día siguiente.
function snapToPreferredHour(from: Date, hoursUtc: number[]): Date {
  const hours = [...new Set(hoursUtc)].sort((a, b) => a - b);
  const d = new Date(from);
  d.setUTCMinutes(0, 0, 0);
  if (from.getUTCMinutes() > 0 || from.getUTCSeconds() > 0) d.setUTCHours(d.getUTCHours() + 1);
  const next = hours.find((h) => h >= d.getUTCHours());
  if (next !== undefined) {
    d.setUTCHours(next);
  } else {
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(hours[0]);
  }
  return d;
}

async function pickNextOferta(): Promise<string> {
  const since = new Date(Date.now() - ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("proposals")
    .select("oferta")
    .in("format", AUTO_PUBLISH_FORMATS)
    .in("status", ["scheduled", "published"])
    .eq("is_test", false)
    .gte("created_at", since)
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
  const earliest = new Date(Math.max(now, lastSlot + spacingMs));

  const learnedHour = await getLearnedTimingHour();
  const hours = learnedHour !== null ? [learnedHour] : PREFERRED_UTC_HOURS;
  return snapToPreferredHour(earliest, hours).toISOString();
}

// ═══════════════════════════════════════
// AGENTES
// ═══════════════════════════════════════

async function runEstratega(
  topic: string,
  contextDocs: string,
  history: string,
  learnedRules: string
): Promise<string> {
  const config = await getAgentConfig("estratega");
  const system = `${config.system_prompt}

DOCUMENTOS DE MARCA:
${contextDocs}
${learnedRules}

${history ? `HISTORIAL DEL DEBATE:\n${history}` : ""}

INSTRUCCIONES:
Proponé un ángulo de contenido para Instagram sobre: "${topic}"
Incluí:
1. Ángulo/propuesta (por qué debería publicar esto)
2. 3 hooks en tono argentino directo
3. Buyer persona objetivo
4. Formato recomendado (post, carrusel, historia)
5. Momento ideal de publicación`;

  return callAgent("estratega", false, config.temperature, system, [
    { role: "user", content: `Tema: ${topic}` },
  ]);
}

// Detecta el formato recomendado a partir del texto de la Estrategia (o del
// feedback en una revisión) — misma heurística que ya usaba extractProposal,
// factorizada acá para poder avisarle al Creativo ANTES de que escriba, no
// solo para clasificar después.
function detectFormat(text: string): "carrusel" | "historia" | "post" {
  const lower = text.toLowerCase();
  if (lower.includes("carrusel")) return "carrusel";
  if (lower.includes("historia")) return "historia";
  return "post";
}

// Instrucciones de formato de BODY, específicas por tipo de pieza —
// hallazgo real 2026-08-20: sin esto, el Creativo escribía un guión con
// encabezados "**Slide 1 (Portada):**" pensado para que un diseñador
// humano lo interprete, y el renderer automático (que no tiene un humano
// en el medio) lo mostraba literal, encabezados incluidos, en la pieza
// publicada de verdad. Le pedimos texto ya listo para el renderer, no una
// nota de producción.
function bodyFormatInstructions(format: "carrusel" | "historia" | "post"): string {
  if (format === "carrusel") {
    return `BODY: escribí el copy como una lista de líneas cortas, una por renglón, separadas por un salto de línea — cada línea es lo que va a aparecer sola en un slide del carrusel (3 a 4 líneas en total). NUNCA uses encabezados tipo "Slide 1", "Portada", numeración ni notas de diseño — cada línea tiene que poder mostrarse tal cual, sin editar, en una imagen. Cada línea, una idea sola, máximo ~15 palabras.`;
  }
  return `BODY: [copy completo del post, en prosa corrida — sin encabezados de slide ni numeración, es un solo texto]`;
}

async function runCreativo(
  estrategia: string,
  contextDocs: string,
  history: string,
  isReevaluation = false,
  learnedRules = "",
  format: "carrusel" | "historia" | "post" = "post"
): Promise<string> {
  const config = await getAgentConfig("creativo");
  const system = `${config.system_prompt}

DOCUMENTOS DE MARCA:
${contextDocs}
${learnedRules}

${history ? `HISTORIAL DEL DEBATE:\n${history}` : ""}

INSTRUCCIONES:
Basándote en la estrategia del Agente Estratega, redactá el contenido completo. El formato de esta pieza es "${format}".

Formato de salida:
HOOK: [hook principal]
${bodyFormatInstructions(format)}
CTA: [call to action]
HASHTAGS: [5-10 hashtags relevantes]
NOTAS VISUALES: [qué imagen/video necesitás — esto es solo para referencia interna, nunca aparece en la pieza publicada]`;

  return callAgent("creativo", isReevaluation, config.temperature, system, [
    { role: "user", content: estrategia },
  ]);
}

async function runCritico(
  contenido: string,
  contextDocs: string,
  history: string,
  isReevaluation = false
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

  const response = await callAgent("critico", isReevaluation, config.temperature, system, [
    { role: "user", content: contenido },
  ]);

  const feedback = response || "Sin feedback del agente crítico";
  const aprobado = feedback.toUpperCase().includes("DECISION: APROBADO");
  return { aprobado, feedback };
}

// ═══════════════════════════════════════
// FLUJO PRINCIPAL
// ═══════════════════════════════════════

// B5 (auditoría 2026-08-31): reconstruir el DialogueResult desde una fila de
// sesión ya terminada, sin volver a correr el debate — todos los campos ya
// viven en metadata + final_proposal.
function resultFromSession(session: Record<string, any>) {
  const m = session.metadata || {};
  return {
    sessionId: session.id,
    estrategia: m.estrategia ?? "",
    contenido: session.final_proposal ?? "",
    evaluacion: m.evaluacion ?? { aprobado: false, feedback: "" },
    proposal: m.proposal ?? null,
    aprobado: m.evaluacion?.aprobado ?? false,
    proposalId: m.proposalId ?? null,
    autoPublished: m.autoPublished ?? false,
    scheduledAt: m.scheduledAt ?? null,
    oferta: m.oferta ?? null,
  };
}

// Ventana amplia para detectar un debate del mismo tema todavía CORRIENDO
// (retry-storm). Ventana corta para uno ya TERMINADO: cubre el retry automático
// de react-query (~150s después del start) sin bloquear una re-corrida
// deliberada del mismo tema más tarde.
const DEDUPE_ACTIVE_WINDOW_MS = 15 * 60 * 1000;
const DEDUPE_DONE_WINDOW_MS = 4 * 60 * 1000;

async function startSession(topic: string) {
  // B5 (auditoría 2026-08-31): el timeout del cliente (150s) + el retry
  // automático de react-query dispara un 2º "start" con el mismo topic mientras
  // el 1º sigue corriendo server-side → 2º debate → 2º post autoagendado (mismo
  // patrón de los duplicados de carrusel ya documentados). Antes de arrancar,
  // buscamos una sesión reciente con el mismo topic:
  //  - si ya terminó hace poco: devolvemos su resultado, sin re-debatir.
  //  - si sigue activa: esperamos a que termine y devolvemos eso; si no termina,
  //    tiramos un error claro en vez de arrancar el duplicado.
  const { data: recent } = await supabase
    .from("dialogue_sessions")
    .select("*")
    .eq("topic", topic)
    .gte("created_at", new Date(Date.now() - DEDUPE_ACTIVE_WINDOW_MS).toISOString())
    .neq("status", "error")
    .order("created_at", { ascending: false })
    .limit(1);

  const prior = recent?.[0];
  const priorAgeMs = prior ? Date.now() - new Date(prior.created_at).getTime() : Infinity;
  if (
    prior &&
    (prior.status === "approved" || prior.status === "needs_review") &&
    priorAgeMs < DEDUPE_DONE_WINDOW_MS
  ) {
    return resultFromSession(prior);
  }
  if (prior && prior.status === "active") {
    let priorFailed = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const { data: check } = await supabase
        .from("dialogue_sessions")
        .select("*")
        .eq("id", prior.id)
        .single();
      if (check && check.status !== "active") {
        if (check.status === "error") {
          priorFailed = true;
          break;
        }
        return resultFromSession(check);
      }
    }
    // El original sigue corriendo: NO arrancamos otro debate (sería el
    // duplicado). Salvo que el original ya haya fallado.
    if (!priorFailed) {
      throw new Error(
        "Ya hay un debate corriendo sobre este mismo tema — esperá un momento y miralo en la lista de sesiones."
      );
    }
  }

  // 1. Crear sesión
  const { data: session, error: sessionError } = await supabase
    .from("dialogue_sessions")
    .insert({ topic, status: "active" })
    .select()
    .single();

  if (sessionError) throw new Error(`Error creando sesión: ${sessionError.message}`);
  if (!session) throw new Error("No se pudo crear la sesión");

  try {
    return await runDebate(session, topic);
  } catch (e: unknown) {
    // Hallazgo real de auditoría 2026-08-25: si el debate de 3 agentes
    // falla a mitad de camino (Anthropic y Groq caídos a la vez, timeout,
    // etc.), la sesión quedaba en "active" para siempre — indistinguible
    // en la UI de una sesión que sigue en curso ahora mismo. Sin este
    // catch, quien vuelve a mirar la pantalla más tarde no tiene forma de
    // saber que se rompió, y no hay ningún botón de "reintentar" posible
    // porque técnicamente "sigue activa".
    const message = e instanceof Error ? e.message : String(e);
    await supabase
      .from("dialogue_sessions")
      .update({ status: "error", metadata: { error: message.slice(0, 500) }, updated_at: new Date().toISOString() })
      .eq("id", session.id);
    throw e;
  }
}

async function runDebate(session: { id: string }, topic: string) {
  // 2. Obtener contexto de la bóveda + lo que ya aprendimos de datos reales
  // (Fase 2 del plan estratégico 2026-08-16 — cierra el loop de
  // aprendizaje: rule-engine generaba reglas que nadie leía al generar).
  const contextDocs = await getContextDocs(topic);
  const learnedRules = await getLearnedRulesBlock();

  // 3. Ejecutar los 3 agentes secuencialmente
  const history: string[] = [];

  // Estratega propone (Sonnet, fallback a Groq — ver pickModel/callAgent)
  const estrategia = await runEstratega(topic, contextDocs, "", learnedRules);
  history.push(`## Agente Estratega:\n${estrategia}`);
  await saveMessage(session.id, "estratega", estrategia, 1);

  // El formato ya se puede leer de la Estrategia (punto 4 de su estructura)
  // antes de que el Creativo escriba — así el Creativo sabe si tiene que
  // redactar para carrusel (líneas cortas por slide) o para post (prosa
  // corrida), en vez de decidirlo solo después de escribir.
  const format = detectFormat(estrategia);

  // Creativo redacta (Sonnet, primera pasada)
  const contenido = await runCreativo(estrategia, contextDocs, history.join("\n"), false, learnedRules, format);
  history.push(`## Agente Creativo:\n${contenido}`);
  await saveMessage(session.id, "creativo", contenido, 2);

  // Crítico evalúa (Sonnet, primera pasada — no es reevaluación)
  const evaluacion = await runCritico(contenido, contextDocs, history.join("\n"), false);
  await saveMessage(session.id, "critico", evaluacion.feedback, 3);

  // 4. Extraer propuesta estructurada
  const proposal = extractProposal(contenido, estrategia);

  // 5. Crear propuesta si fue aprobada — autoagendada si es un formato con
  // pipeline autónomo (ver AUTO-AGENDA arriba), pending si no.
  let proposalId: string | null = null;
  // scheduledAt/oferta/autoPublished van en la respuesta Y en el metadata
  // de la sesión, para que tanto el toast inmediato como la vista
  // histórica de la sesión puedan avisar "esto ya se agendó solo" —
  // hallazgo real de auditoría 2026-08-25: antes la única forma de
  // enterarse era adivinar que había que ir a /propuestas o /calendario.
  let scheduledAt: string | null = null;
  let oferta: string | null = null;
  const autoPublished = evaluacion.aprobado && AUTO_PUBLISH_FORMATS.includes(proposal.format || "post");
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
      oferta = insert.oferta as string;
      scheduledAt = insert.scheduled_at as string;
    } else {
      insert.status = "pending";
    }

    const { data: insertedProposal } = await supabase.from("proposals").insert(insert).select("id").single();
    proposalId = insertedProposal?.id ?? null;
  }

  // 6. Actualizar sesión (después de crear la propuesta, para poder
  // guardar el proposalId/autoPublished en el metadata también)
  await supabase
    .from("dialogue_sessions")
    .update({
      status: evaluacion.aprobado ? "approved" : "needs_review",
      final_proposal: contenido,
      metadata: {
        estrategia,
        evaluacion,
        proposal,
        proposalId,
        autoPublished,
        scheduledAt,
        oferta,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  return {
    sessionId: session.id,
    estrategia,
    contenido,
    evaluacion,
    proposal,
    aprobado: evaluacion.aprobado,
    proposalId,
    autoPublished,
    scheduledAt,
    oferta,
  };
}

function extractProposal(contenido: string, estrategia: string) {
  // Parse simple del contenido generado
  const hook = contenido.match(/HOOK:\s*(.+)/i)?.[1]?.trim() || "";
  const body = contenido.match(/BODY:\s*([\s\S]+?)(?=CTA:|HASHTAGS:|NOTAS VISUALES:|$)/i)?.[1]?.trim() || contenido;
  const cta = contenido.match(/CTA:\s*(.+)/i)?.[1]?.trim() || "";
  const hashtagsStr = contenido.match(/HASHTAGS:\s*(.+)/i)?.[1]?.trim() || "";
  const hashtags = hashtagsStr.split(/[,\s]+/).filter((h) => h.startsWith("#"));

  const format = detectFormat(estrategia);

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
  const learnedRules = await getLearnedRulesBlock();
  const nextTurn = (messages?.length || 0) + 1;

  // El feedback del usuario se agrega al historial
  const fullHistory = `${history}\n\n## Usuario:\n${feedback}`;

  // El formato ya se decidió en la primera ronda (queda guardado en
  // session.metadata.proposal.format) — una revisión no cambia de formato,
  // así que se reusa en vez de volver a adivinarlo del feedback puntual.
  const format = (session?.metadata as { proposal?: { format?: "carrusel" | "historia" | "post" } })?.proposal?.format || detectFormat(feedback);

  // Re-ejecutar Creativo con feedback (Sonnet igual — reescribir copy no
  // cambia de naturaleza por ser una revisión)
  const contenido = await runCreativo(
    feedback,
    contextDocs,
    fullHistory,
    true,
    learnedRules,
    format
  );
  await saveMessage(sessionId, "creativo", contenido, nextTurn);

  // Re-ejecutar Crítico — acá sí escala a Opus (isReevaluation=true): tiene
  // que ponderar el rechazo anterior + el feedback nuevo + el criterio de
  // marca a la vez, ver pickModel() más arriba.
  const evaluacion = await runCritico(
    contenido,
    contextDocs,
    `${fullHistory}\n\n## Creativo (revisión):\n${contenido}`,
    true
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

  const startedAt = Date.now();
  let action: string | undefined;

  try {
    const body = await req.json();
    ({ action } = body);
    const { topic, sessionId, feedback } = body;

    let result: { sessionId?: string; proposalId?: string | null; aprobado?: boolean } | undefined;

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

    await logRun({
      source: "orchestrator",
      step: action,
      status: "success",
      proposalId: result?.proposalId ?? null,
      durationMs: Date.now() - startedAt,
      metadata: { sessionId: result?.sessionId ?? sessionId, aprobado: result?.aprobado },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    await logRun({
      source: "orchestrator",
      step: action || "unknown",
      status: "error",
      durationMs: Date.now() - startedAt,
      error: e.message,
    });
    const status = e.message?.includes("Campos requeridos") ? 400 : 500;
    return new Response(JSON.stringify({ error: e.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
