// supabase/functions/recycle/index.ts
// Fase 3 del plan de publicación 2026 — Reciclado de contenido.
//
// Lo que rindió bien hace tiempo se puede volver a publicar con el hook y el
// CTA refrescados. El sistema no reinventa el ángulo — lo mantiene, solo lo
// vuelve a decir con otras palabras y actualiza el llamado a la acción.
//
// Acciones:
//   { action: "candidates" }                  → piezas publicadas hace >90d
//                                               con engagement sobre la mediana
//   { action: "refresh", proposalId }         → hook/cta refrescados (no inserta)
//   { action: "schedule", proposalId, hook, body, cta, hashtags }
//                                             → inserta una propuesta nueva
//                                               status=pending, metadata.recycled_from

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { logRun } from "../_shared/runLog.ts";

const MIN_AGE_DAYS = 90;

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

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function callLLM(system: string, user: string, maxTokens = 700): Promise<string> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
      });
      if (r.ok) return ((await r.json()).content?.[0]?.text ?? "").trim();
      console.warn(`[recycle] Anthropic ${r.status}, fallback a Groq`);
    } catch (e) {
      console.warn(`[recycle] Anthropic falló (${errMsg(e)}), fallback a Groq`);
    }
  }
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) throw new Error("Sin ANTHROPIC_API_KEY ni GROQ_API_KEY");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  return ((await r.json()).choices?.[0]?.message?.content ?? "").trim();
}

async function getBrandContext(query: string): Promise<string> {
  try {
    const hfKey = Deno.env.get("HF_API_KEY");
    if (!hfKey) throw new Error("no HF");
    const er = await fetch(
      "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: [query], options: { wait_for_model: true } }),
      }
    );
    const emb = (await er.json())?.[0];
    if (!Array.isArray(emb)) throw new Error("no emb");
    const { data } = await supabase.rpc("match_documents", { query_embedding: emb, match_count: 4 });
    return (data ?? []).map((c: { content: string }) => c.content).join("\n---\n").slice(0, 2800);
  } catch {
    const { data } = await supabase.from("doc_chunks").select("content").limit(4);
    return (data ?? []).map((c: { content: string }) => c.content).join("\n---\n").slice(0, 2800);
  }
}

interface ProposalRow {
  id: string;
  format: string;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  hashtags: string[] | null;
  oferta: string | null;
  dimension: string | null;
  buyer_persona: string | null;
  published_at: string | null;
}

async function candidates() {
  const cutoff = new Date(Date.now() - MIN_AGE_DAYS * 86_400_000).toISOString();

  // Todas las métricas medidas, para sacar la mediana de engagement.
  const { data: allMetrics } = await supabase.from("metrics").select("proposal_id, engagement_rate, reach");
  const rates = (allMetrics ?? [])
    .map((m: { engagement_rate: number | null }) => m.engagement_rate ?? 0)
    .filter((r: number) => r > 0)
    .sort((a: number, b: number) => a - b);
  const median = rates.length ? rates[Math.floor(rates.length / 2)] : 0;

  // Mejor engagement por propuesta.
  const bestByProposal = new Map<string, { engagement: number; reach: number }>();
  for (const m of allMetrics ?? []) {
    const cur = bestByProposal.get(m.proposal_id);
    const e = m.engagement_rate ?? 0;
    if (!cur || e > cur.engagement) bestByProposal.set(m.proposal_id, { engagement: e, reach: m.reach ?? 0 });
  }

  const { data: published } = await supabase
    .from("proposals")
    .select("id, format, title, hook, body, cta, hashtags, oferta, dimension, buyer_persona, published_at, metadata")
    .eq("status", "published")
    .eq("is_test", false)
    .lt("published_at", cutoff)
    .in("format", ["post", "carrusel"]);

  // Las que ya se reciclaron una vez (por metadata.recycled_from).
  const { data: recycledRows } = await supabase
    .from("proposals")
    .select("metadata")
    .not("metadata->>recycled_from", "is", null);
  const alreadyRecycled = new Set(
    (recycledRows ?? []).map((r: { metadata: { recycled_from?: string } }) => r.metadata?.recycled_from).filter(Boolean)
  );

  const list = (published ?? [])
    .filter((p: ProposalRow & { metadata: unknown }) => !alreadyRecycled.has(p.id))
    .map((p: ProposalRow) => {
      const best = bestByProposal.get(p.id);
      return {
        id: p.id,
        title: p.title,
        hook: p.hook,
        format: p.format,
        oferta: p.oferta,
        published_at: p.published_at,
        engagement: best?.engagement ?? null,
        reach: best?.reach ?? null,
        aboveMedian: (best?.engagement ?? 0) >= median && (best?.engagement ?? 0) > 0,
      };
    })
    // Con engagement medido y sobre la mediana primero; después, por reach.
    .sort((a, b) => Number(b.aboveMedian) - Number(a.aboveMedian) || (b.reach ?? 0) - (a.reach ?? 0));

  return { median, count: list.length, candidates: list };
}

async function refresh(proposalId: string) {
  const { data: p, error } = await supabase
    .from("proposals")
    .select("id, format, hook, body, cta, hashtags, oferta, buyer_persona")
    .eq("id", proposalId)
    .single();
  if (error || !p) throw new Error("No se encontró la propuesta original");

  const ctx = await getBrandContext(`${p.hook ?? ""} ${p.oferta ?? ""}`);
  const system =
    "Sos el Creativo de Mejora Continua. Te doy una pieza que ya se publicó y rindió bien. Tu trabajo NO es " +
    "reinventar el ángulo — es volver a decir lo mismo con otras palabras (hook nuevo, mismo mensaje) y " +
    "actualizar el CTA al texto de marca vigente. Mantené el tono argentino, directo, sin vender de una. " +
    "Devolvés SOLO este JSON, sin texto extra:\n" +
    '{"hook":"...","body":"...","cta":"...","hashtags":["#..."]}\n' +
    "El body puede quedar casi igual si ya funciona; el hook tiene que ser claramente distinto al original.\n\n" +
    "Criterio de marca:\n" + ctx;
  const user =
    `Formato: ${p.format}\nHook original: ${p.hook}\nCuerpo original: ${p.body}\nCTA original: ${p.cta}\n` +
    `Hashtags: ${(p.hashtags ?? []).join(" ")}`;
  const out = await callLLM(system, user, 800);
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("El modelo no devolvió un JSON válido — probá de nuevo");
  const parsed = JSON.parse(m[0]) as { hook?: string; body?: string; cta?: string; hashtags?: string[] };
  return {
    original: { hook: p.hook, body: p.body, cta: p.cta, hashtags: p.hashtags },
    refreshed: {
      hook: parsed.hook ?? p.hook,
      body: parsed.body ?? p.body,
      cta: parsed.cta ?? p.cta,
      hashtags: Array.isArray(parsed.hashtags) && parsed.hashtags.length ? parsed.hashtags : p.hashtags,
    },
  };
}

async function schedule(body: {
  proposalId: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
}) {
  const { data: p, error } = await supabase
    .from("proposals")
    .select("format, oferta, dimension, buyer_persona, title")
    .eq("id", body.proposalId)
    .single();
  if (error || !p) throw new Error("No se encontró la propuesta original");
  if (!body.hook?.trim() || !body.body?.trim()) throw new Error("Falta el hook o el cuerpo");

  const { data: inserted, error: insErr } = await supabase
    .from("proposals")
    .insert({
      format: p.format,
      title: p.title ? `${p.title} (reciclado)` : "Contenido reciclado",
      hook: body.hook.trim(),
      body: body.body.trim(),
      cta: (body.cta ?? "").trim(),
      hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
      oferta: p.oferta,
      dimension: p.dimension,
      buyer_persona: p.buyer_persona,
      status: "pending",
      is_test: false,
      metadata: { recycled_from: body.proposalId },
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  return { newProposalId: inserted.id };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (!auth.ok) return unauthorizedResponse(auth, corsHeaders);

  const startedAt = Date.now();
  let action: string | undefined;
  try {
    const body = await req.json();
    ({ action } = body);

    let result: unknown;
    if (action === "candidates") result = await candidates();
    else if (action === "refresh") result = await refresh(body.proposalId);
    else if (action === "schedule") result = await schedule(body);
    else throw new Error("Acción no válida");

    await logRun({ source: "recycle", step: action, status: "success", durationMs: Date.now() - startedAt });
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    await logRun({ source: "recycle", step: action || "unknown", status: "error", durationMs: Date.now() - startedAt, error: errMsg(e) });
    return new Response(JSON.stringify({ error: errMsg(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
