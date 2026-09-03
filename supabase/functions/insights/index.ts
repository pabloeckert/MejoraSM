// supabase/functions/insights/index.ts
// Fase A del plan de continuación (rediseño 2026-08-31) — Motor de insights
// con IA para el Dashboard. Cierra el punto 3 del brief del 2026-08-16.
//
// Toma 6 insights semilla (validados con datos reales en agosto) + las
// métricas reales de las últimas semanas + la retro de Pablo ("Útil"/"No
// aplica") y le pide a Claude CONTRASTAR cada uno: confirmar, refinar o
// reemplazar con evidencia real. Regla innegociable, igual que el copiloto:
// nunca inventar una cifra que no esté en el contexto.
//
// Uso:
//   POST /insights { action: "get" }        → insights de la semana (cacheados o generados)
//   POST /insights { action: "feedback", insightId, weekStart, useful }
//   POST /insights { action: "get", force: true }  → regenera aunque haya caché (usado por el cron)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { logRun } from "../_shared/runLog.ts";

const ALLOWED_ORIGINS = [
  "https://pabloeckert.github.io",
  "https://mejorasm.mejoraok.com",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function validateBody(body: Record<string, unknown>, required: string[]) {
  const missing = required.filter((k) => body[k] === undefined || body[k] === null);
  if (missing.length > 0) throw new Error(`Campos requeridos faltantes: ${missing.join(", ")}`);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 1000): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries) throw e;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      console.warn(`[insights] Retry ${i + 1}/${maxRetries} en ${Math.round(delay)}ms: ${errorMessage(e)}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ── LLM: mismo par anthropic→groq que copilot/orchestrator ────────────────
interface AnthropicResponse { content?: { type: string; text?: string }[]; }
interface GroqResponse { choices?: { message?: { content?: string } }[]; }

async function callAnthropic(system: string, user: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as AnthropicResponse;
  const text = data.content?.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Anthropic: respuesta sin contenido");
  return text;
}

async function callGroq(system: string, user: string): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as GroqResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq: respuesta sin contenido");
  return content;
}

async function callAI(system: string, user: string): Promise<{ text: string; model: string }> {
  try {
    return { text: await withRetry(() => callAnthropic(system, user)), model: "anthropic" };
  } catch (e) {
    console.warn(`[insights] Anthropic falló (${errorMessage(e)}), fallback a Groq`);
    return { text: await withRetry(() => callGroq(system, user)), model: "groq" };
  }
}

// ── RAG de marca (mismo patrón que copilot) ───────────────────────────────
interface DocChunkRow { content: string; }
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
    if (!embedRes.ok) throw new Error(`HF ${embedRes.status}`);
    const embeddings = (await embedRes.json()) as number[][];
    if (embeddings?.[0]) {
      const { data: chunks } = await supabase.rpc("match_documents", { query_embedding: embeddings[0], match_count: 4 });
      const rows = chunks as DocChunkRow[] | null;
      if (rows?.length) return rows.map((c) => `### Fragmento relevante:\n${c.content}`).join("\n\n");
    }
  } catch (e) {
    console.warn(`[insights] RAG falló: ${errorMessage(e)}, fallback`);
  }
  const { data: docs } = await supabase.from("documents").select("title, content").order("created_at", { ascending: false }).limit(3);
  if (!docs?.length) return "No hay documentos en la bóveda aún.";
  return docs.map((d) => `### ${d.title}\n${d.content?.slice(0, 800)}`).join("\n\n");
}

// ── Semillas: las 6 validadas con datos reales de agosto 2026 ─────────────
// (copia de SEED_INSIGHTS de src/pages/Dashboard.tsx — el frontend mantiene
// la suya como fallback de render, esta función es autosuficiente).
const SEED_INSIGHTS = [
  { id: "reel-retencion", title: "El Reel gana alcance, pero se pierde el mensaje", body: "Reel es el formato con mejor alcance (461 promedio) y mejor engagement (3.26% ER), pero el tiempo promedio de reproducción es de apenas ~6.9 segundos y casi nadie lo mira completo.", evidence: "44 Reels analizados en el año — reach medio 461, ER medio 3.26%, ~6.9s de reproducción, 0.81 full views promedio." },
  { id: "hook-primera-persona", title: "El gancho directo en primera persona convierte mejor que cualquier Reel", body: "Los posts estáticos o carousel con gancho directo en primera persona sobre liderazgo y decisiones dieron el engagement más alto del período — el mejor conversor de audiencia ya instalada.", evidence: "\"WhatsApp no es decoración...\" ER 27.9% · \"Equivocarse no te resta liderazgo...\" ER 22.0%." },
  { id: "testimonios-series", title: "Testimonios con nombre y series \"Parte 1/2/3\" generan la señal más fuerte", body: "Concentran los guardados y compartidos más altos del año — en una cuenta B2B esa es la señal de intención más fuerte, más que el like.", evidence: "Serie sobre negociación: reach 520 / 436 / 237 en publicaciones consecutivas." },
  { id: "geo-nea-paraguay", title: "La audiencia está concentrada en NEA + Paraguay, no dispersa a nivel nacional", body: "Posadas es la ciudad top en ambas redes, seguida de Encarnación y el resto del NEA argentino y Paraguay.", evidence: "Posadas 30.9% (Facebook) / 45.7% (Instagram) · Paraguay 19.7-20.2% del total." },
  { id: "meseta-horaria", title: "No hay un horario mágico único — la audiencia está online de 11h a 23h todos los días", body: "Conviene testear franja de mediodía (lunes a miércoles) contra tarde-noche en vez de fijarse en un solo bloque horario.", evidence: "Meseta amplia 11h-23h todos los días, con pico puntual lunes 21h (IconSquare)." },
  { id: "facebook-sin-pulso", title: "Facebook va al mismo nivel de detalle que Instagram, pero hoy no tiene pulso propio", body: "El bajo rendimiento de Facebook es por falta de trabajo puesto ahí, no por el canal en sí.", evidence: "Ventana jul-ago 2026: 0 visitas, 0 interacciones y 0 clics en casi todos los días. ER del año 1.28% vs. 2.44% de Instagram." },
];

// ── Datos reales de las últimas N semanas ────────────────────────────────
interface MetricRow {
  engagement_rate: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  impressions: number | null;
  clicks: number | null;
  measured_at: string;
  proposals: { format: string | null; hook: string | null; oferta: string | null; is_test: boolean | null; published_at: string | null } | null;
}

const WEEKS_BACK = 6;

function round(n: number, d = 1) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

async function gatherRealData(): Promise<{ text: string; evidence: Record<string, unknown> }> {
  const sinceIso = new Date(Date.now() - WEEKS_BACK * 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("metrics")
    .select("engagement_rate, likes, comments, shares, saves, reach, impressions, clicks, measured_at, proposals(format, hook, oferta, is_test, published_at)")
    .gte("measured_at", sinceIso)
    .order("measured_at", { ascending: false })
    .limit(200);

  const rows = ((data as MetricRow[] | null) || []).filter((m) => !m.proposals?.is_test);

  if (rows.length === 0) {
    return {
      text: `No hay ninguna métrica real de las últimas ${WEEKS_BACK} semanas (fuera de filas de prueba). No hay dato nuevo para contrastar las semillas.`,
      evidence: { realMetricsLast6Weeks: 0 },
    };
  }

  const byFormat: Record<string, MetricRow[]> = {};
  for (const m of rows) {
    const f = m.proposals?.format || "post";
    (byFormat[f] ??= []).push(m);
  }
  const eng = rows.map((m) => m.engagement_rate ?? 0);
  const avgEng = eng.reduce((a, b) => a + b, 0) / eng.length;
  const totalSaves = rows.reduce((a, m) => a + (m.saves ?? 0), 0);
  const totalShares = rows.reduce((a, m) => a + (m.shares ?? 0), 0);
  const totalComments = rows.reduce((a, m) => a + (m.comments ?? 0), 0);
  const avgReach = rows.reduce((a, m) => a + (m.reach ?? 0), 0) / rows.length;

  const byHour: Record<number, number[]> = {};
  for (const m of rows) {
    const when = m.proposals?.published_at || m.measured_at;
    const h = new Date(when).getUTCHours();
    (byHour[h] ??= []).push(m.engagement_rate ?? 0);
  }
  const hourLines = Object.entries(byHour)
    .map(([h, e]) => `${h}:00 UTC → ER medio ${round(e.reduce((a, b) => a + b, 0) / e.length, 2)}% (${e.length} piezas)`)
    .join(" · ");

  const formatLines = Object.entries(byFormat)
    .map(([f, items]) => {
      const e = items.map((m) => m.engagement_rate ?? 0);
      const r = items.map((m) => m.reach ?? 0);
      return `${f}: ${items.length} piezas, ER medio ${round(e.reduce((a, b) => a + b, 0) / e.length, 2)}%, reach medio ${round(r.reduce((a, b) => a + b, 0) / r.length, 0)}`;
    })
    .join(" · ");

  const topPieces = [...rows]
    .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0))
    .slice(0, 5)
    .map((m) => `"${(m.proposals?.hook || "sin hook").slice(0, 60)}" (${m.proposals?.format || "post"}, ${m.proposals?.oferta || "?"}) — ER ${round(m.engagement_rate ?? 0, 2)}%`)
    .join("\n");

  const text = `MÉTRICAS REALES DE LAS ÚLTIMAS ${WEEKS_BACK} SEMANAS (${rows.length} piezas, filas de prueba excluidas):
- ER promedio general: ${round(avgEng, 2)}%
- Reach promedio: ${round(avgReach, 0)}
- Totales del período: ${totalSaves} guardados, ${totalShares} compartidos, ${totalComments} comentarios
- Por formato: ${formatLines}
- Por hora de publicación: ${hourLines || "sin dato de hora"}
- Top 5 piezas por engagement:
${topPieces}`;

  const evidence = {
    realMetricsLast6Weeks: rows.length,
    avgEngagement: round(avgEng, 2),
    avgReach: round(avgReach, 0),
    totalSaves,
    totalShares,
    formats: Object.fromEntries(Object.entries(byFormat).map(([k, v]) => [k, v.length])),
  };
  return { text, evidence };
}

async function recentFeedbackNote(): Promise<string> {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("insight_feedback")
    .select("insight_id, useful, week_start")
    .gte("week_start", since)
    .order("created_at", { ascending: false });
  const rows = (data as { insight_id: string; useful: boolean }[] | null) || [];
  if (rows.length === 0) return "";
  const notUseful = [...new Set(rows.filter((r) => !r.useful).map((r) => r.insight_id))];
  const useful = [...new Set(rows.filter((r) => r.useful).map((r) => r.insight_id))];
  const parts: string[] = [];
  if (notUseful.length) parts.push(`Pablo marcó "No aplica" a: ${notUseful.join(", ")} — bajales la prioridad o reemplazalos si no hay evidencia nueva que los sostenga.`);
  if (useful.length) parts.push(`Pablo marcó "Útil" a: ${useful.join(", ")} — mantené el foco ahí.`);
  return parts.length ? `\nRETRO DE PABLO (últimas 8 semanas):\n${parts.join("\n")}` : "";
}

// ── Generación ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sos el motor de insights de MejoraOK — analizás el rendimiento real del contenido de Pablo en Instagram y Facebook y le devolvés lecturas accionables. Tono argentino, directo, concreto. Regla innegociable: cada afirmación numérica tiene que venir de los datos reales que te doy — NUNCA inventes una cifra. Si un insight semilla no se puede confirmar ni refutar porque no hay dato nuevo, mantenelo con status "seed_unchanged" y decilo. Si los datos nuevos lo contradicen, reemplazalo. Si lo matizan, refinalo.

Respondé ÚNICAMENTE con un array JSON válido (sin markdown, sin \`\`\`), de 4 a 7 objetos, cada uno:
{
  "id": "<id estable — reusá el de la semilla si es la misma, o inventá un slug corto si es nuevo>",
  "title": "<una línea, afirmación clara>",
  "body": "<2-3 frases, la lectura y qué hacer>",
  "evidence": "<la cita textual al dato real que lo sostiene>",
  "confidence": <0-100, entero>,
  "status": "seed_unchanged" | "refined" | "updated" | "new"
}
Ordená de mayor a menor confianza.`;

interface GeneratedInsight {
  id: string;
  title: string;
  body: string;
  evidence: string;
  confidence: number;
  status: string;
}

function parseInsights(raw: string): GeneratedInsight[] {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  const arr = JSON.parse(text) as GeneratedInsight[];
  if (!Array.isArray(arr)) throw new Error("La respuesta no es un array");
  return arr
    .filter((x) => x && x.title && x.body)
    .map((x) => ({
      id: String(x.id || x.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
      title: String(x.title),
      body: String(x.body),
      evidence: String(x.evidence || ""),
      // Hallazgo real 2026-09-03: `Number(x.confidence) || 50` trata un 0
      // legítimo del LLM (valor documentado como válido en el prompt, "0-100
      // entero" — el propio Math.max(0, ...) de acá muestra que el código sí
      // pretendía permitirlo) como si faltara el dato, y lo reemplaza en
      // silencio por 50 — falseando "sin ninguna confianza" como "confianza
      // media". Number.isFinite() distingue un 0 real de un valor faltante o
      // no numérico (undefined/NaN), que sí caen al default de 50.
      confidence: Math.max(0, Math.min(100, Math.round(Number.isFinite(Number(x.confidence)) ? Number(x.confidence) : 50))),
      status: ["seed_unchanged", "refined", "updated", "new"].includes(x.status) ? x.status : "refined",
    }));
}

function weekStartUtc(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x.toISOString().slice(0, 10);
}

async function getOrGenerate(force: boolean) {
  const week = weekStartUtc();

  if (!force) {
    const { data: cached } = await supabase
      .from("insights_cache")
      .select("week_start, insights, model, generated_at")
      .eq("week_start", week)
      .maybeSingle();
    if (cached) return { ...cached, cached: true };
  }

  const [{ text: dataText, evidence }, feedbackNote, brandCtx] = await Promise.all([
    gatherRealData(),
    recentFeedbackNote(),
    getContextDocs("qué formato y qué tono de contenido funciona mejor para el público de Mejora Continua"),
  ]);

  const user = `INSIGHTS SEMILLA (validados con datos reales en agosto 2026, tu punto de partida):
${SEED_INSIGHTS.map((s) => `[${s.id}] ${s.title}\n  ${s.body}\n  Evidencia original: ${s.evidence}`).join("\n\n")}

${dataText}
${feedbackNote}

CONTEXTO DE MARCA:
${brandCtx}

Contrastá cada insight semilla contra los datos reales de arriba y devolvé el array JSON.`;

  const { text: raw, model } = await callAI(SYSTEM_PROMPT, user);
  let insights: GeneratedInsight[];
  try {
    insights = parseInsights(raw);
  } catch (e) {
    // Si el parseo falla, no rompemos el Dashboard: devolvemos las semillas
    // marcadas como tales y logueamos el error.
    console.warn(`[insights] parseo falló: ${errorMessage(e)} — devolviendo semillas`);
    insights = SEED_INSIGHTS.map((s) => ({ ...s, confidence: 50, status: "seed_unchanged" }));
  }
  if (insights.length === 0) {
    insights = SEED_INSIGHTS.map((s) => ({ ...s, confidence: 50, status: "seed_unchanged" }));
  }

  const { data: saved, error } = await supabase
    .from("insights_cache")
    .upsert({ week_start: week, insights, model, generated_at: new Date().toISOString() }, { onConflict: "week_start" })
    .select("week_start, insights, model, generated_at")
    .single();

  if (error) throw new Error(`Error guardando insights: ${error.message}`);
  return { ...saved, cached: false, evidence };
}

async function recordFeedback(insightId: string, weekStart: string, useful: boolean) {
  const { error } = await supabase
    .from("insight_feedback")
    .upsert({ insight_id: insightId, week_start: weekStart, useful, created_at: new Date().toISOString() }, { onConflict: "insight_id,week_start" });
  if (error) throw new Error(`Error guardando la retro: ${error.message}`);
  return { ok: true };
}

// ── Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (!auth.ok) return unauthorizedResponse(auth, corsHeaders);

  const startedAt = Date.now();
  let action: string | undefined;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    action = body.action as string | undefined;

    let result: unknown;
    switch (action) {
      case "get":
        result = await getOrGenerate(body.force === true);
        break;
      case "feedback":
        validateBody(body, ["insightId", "weekStart", "useful"]);
        result = await recordFeedback(body.insightId as string, body.weekStart as string, body.useful === true);
        break;
      default:
        throw new Error("Acción no válida. Usa 'get' o 'feedback'");
    }

    await logRun({
      source: "insights",
      step: action,
      status: "success",
      durationMs: Date.now() - startedAt,
      metadata: action === "get" ? { cached: (result as { cached?: boolean }).cached } : {},
    });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = errorMessage(e);
    await logRun({ source: "insights", step: action || "unknown", status: "error", durationMs: Date.now() - startedAt, error: msg });
    const status = msg.includes("Campos requeridos") || msg.includes("no válida") ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
