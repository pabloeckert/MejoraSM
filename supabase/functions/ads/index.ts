// supabase/functions/ads/index.ts
// Fase 7 del plan de publicación 2026 — Ads de Facebook (solo lectura + consejo).
//
// El sistema publica orgánico y mide. Esto cruza el orgánico con la pauta:
//   - lee las campañas de Facebook Ads que haya en Zernio y su rendimiento
//   - detecta qué posts ORGÁNICOS recientes rindieron sobre la mediana y
//     valdría la pena promocionar (boost)
//   - arma un consejo en la voz de marca
//
// NUNCA crea ni modifica una campaña ni gasta plata — no llama a
// POST /v1/ads/boost ni a nada que cueste. Es puro diagnóstico y sugerencia;
// pautar de verdad lo hace Pablo desde el Business Manager.
//
// Hoy (2026-09-01) Zernio devuelve 0 campañas — no hay cuenta de ads
// conectada. La función responde "sin campañas" y solo muestra los
// candidatos a boost del orgánico. Se activa sola cuando haya pauta real.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { logRun } from "../_shared/runLog.ts";

const ZERNIO_API = "https://zernio.com/api/v1";
const BOOST_WINDOW_DAYS = 30;

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

async function zGet(path: string) {
  const key = Deno.env.get("ZERNIO_API_KEY");
  if (!key) throw new Error("ZERNIO_API_KEY no configurada");
  const res = await fetch(`${ZERNIO_API}${path}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Zernio GET ${path} → ${res.status}`);
  return res.json();
}

async function callLLM(system: string, user: string, maxTokens = 600): Promise<string> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
      });
      if (r.ok) return ((await r.json()).content?.[0]?.text ?? "").trim();
    } catch (e) {
      console.warn(`[ads] Anthropic falló (${errMsg(e)}), fallback a Groq`);
    }
  }
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) return "";
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!r.ok) return "";
  return ((await r.json()).choices?.[0]?.message?.content ?? "").trim();
}

// Zernio trae TODAS las cuentas de anuncios a las que el usuario de Facebook
// tiene acceso, no solo la de la marca. Al conectar (2026-09-03) aparecieron
// una campaña de un ad account "(Read-Only)" que ya no existe y un anuncio de
// Marketplace de un auto de 2024 del ad account personal de Pablo — basura.
// Filtramos: cuentas de solo lectura (no se puede pautar ahí) y campañas sin
// actividad en el último año (viejas/muertas). Cuando MC corra una campaña real
// desde una cuenta propia, pasa el filtro sin tocar nada.
const STALE_CAMPAIGN_DAYS = 365;

function isRelevantCampaign(c: Record<string, unknown>): boolean {
  const acct = String(c.platformAdAccountName ?? "");
  if (/read[\s-]*only/i.test(acct)) return false;
  const lastActivity = (c.latestAd ?? c.earliestAd) as string | undefined;
  if (lastActivity) {
    const age = (Date.now() - new Date(lastActivity).getTime()) / 86_400_000;
    if (Number.isFinite(age) && age > STALE_CAMPAIGN_DAYS) return false;
  }
  return true;
}

async function report() {
  // 1. Campañas de Facebook Ads reales de Mejora Continua (si hay).
  let campaigns: Array<Record<string, unknown>> = [];
  let campaignsError: string | null = null;
  try {
    const r = await zGet(`/ads/campaigns?platform=facebook&limit=50`);
    const raw = (r.campaigns ?? []) as Array<Record<string, unknown>>;
    campaigns = raw.filter(isRelevantCampaign);
    if (raw.length !== campaigns.length) {
      console.log(`[ads] ${raw.length - campaigns.length} campaña(s) filtradas (read-only o sin actividad >${STALE_CAMPAIGN_DAYS}d)`);
    }
  } catch (e) {
    campaignsError = errMsg(e);
  }

  // 2. Candidatos a boost: posts orgánicos publicados en la ventana, con
  // engagement sobre la mediana medida, que no estén ya marcados como boosteados.
  const since = new Date(Date.now() - BOOST_WINDOW_DAYS * 86_400_000).toISOString();
  const { data: metrics } = await supabase
    .from("metrics")
    .select("proposal_id, engagement_rate, reach, likes, comments, shares, proposals(title, hook, oferta, format, published_at, status, metadata)")
    .order("measured_at", { ascending: false });

  const rates = (metrics ?? [])
    .map((m: { engagement_rate: number | null }) => m.engagement_rate ?? 0)
    .filter((x: number) => x > 0)
    .sort((a: number, b: number) => a - b);
  const median = rates.length ? rates[Math.floor(rates.length / 2)] : 0;

  const seen = new Set<string>();
  const candidates = (metrics ?? [])
    .filter((m: { proposals?: { published_at?: string; status?: string; metadata?: { boosted?: boolean } } }) => {
      const p = m.proposals;
      return p && p.status === "published" && p.published_at && p.published_at >= since && !p.metadata?.boosted;
    })
    .filter((m: { proposal_id: string }) => {
      if (seen.has(m.proposal_id)) return false;
      seen.add(m.proposal_id);
      return true;
    })
    .filter((m: { engagement_rate: number | null }) => (m.engagement_rate ?? 0) > 0 && (m.engagement_rate ?? 0) >= median)
    .map((m: { engagement_rate: number | null; reach: number | null; proposals?: { title?: string; hook?: string; oferta?: string } }) => ({
      hook: m.proposals?.hook ?? m.proposals?.title ?? null,
      oferta: m.proposals?.oferta ?? null,
      engagement: m.engagement_rate,
      reach: m.reach,
    }))
    .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
    .slice(0, 5);

  // 3. Consejo.
  let advice = "";
  const hasData = campaigns.length > 0 || candidates.length > 0;
  if (hasData) {
    const system =
      "Sos el analista de pauta de Mejora Continua. Hablás claro, argentino, sin humo. " +
      "Con los datos REALES de abajo (nada inventado) das un párrafo corto: si hay campañas, qué está " +
      "rindiendo y qué no; si hay posts orgánicos fuertes, cuáles conviene promocionar y por qué. " +
      "Nunca das un número que no esté en los datos. No decidís gastos — sugerís.";
    const user = JSON.stringify({ campaigns: campaigns.slice(0, 10), boostCandidates: candidates, medianEngagement: median }, null, 1).slice(0, 4000);
    advice = await callLLM(system, user, 500);
  }

  return {
    hasAdsAccount: campaigns.length > 0 || (campaignsError === null),
    campaignsError,
    // Zernio devuelve las métricas anidadas en `c.metrics`, no al tope del
    // objeto — el mapeo viejo (`c.spend`/`c.impressions`/`c.clicks`) daba
    // siempre null aunque hubiera datos. Nombre de campaña: `c.campaignName`.
    campaigns: campaigns.map((c) => {
      const m = (c.metrics ?? {}) as Record<string, unknown>;
      return {
        name: c.campaignName ?? c.name ?? null,
        status: c.status ?? null,
        spend: m.spend ?? c.spend ?? null,
        impressions: m.impressions ?? c.impressions ?? null,
        clicks: m.clicks ?? c.clicks ?? null,
      };
    }),
    boostCandidates: candidates,
    medianEngagement: median,
    advice,
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (!auth.ok) return unauthorizedResponse(auth, corsHeaders);

  const startedAt = Date.now();
  let action: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    ({ action } = body);
    if (action !== "report") throw new Error("Acción no válida (solo 'report')");

    const result = await report();
    await logRun({ source: "ads", step: "report", status: "success", durationMs: Date.now() - startedAt });
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    await logRun({ source: "ads", step: action || "unknown", status: "error", durationMs: Date.now() - startedAt, error: errMsg(e) });
    return new Response(JSON.stringify({ error: errMsg(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
