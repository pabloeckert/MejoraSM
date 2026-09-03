// supabase/functions/metrics-collector/index.ts
// Recolecta métricas desde la API de analíticas de Zernio y las guarda en la DB
// Uso: POST /metrics-collector { action: "collect", proposalId, postId }
// Cron: ejecutar cada 6 horas

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
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function validateBody(body: any, required: string[]) {
  const missing = required.filter((k) => body[k] === undefined || body[k] === null);
  if (missing.length > 0) {
    throw new Error(`Campos requeridos faltantes: ${missing.join(", ")}`);
  }
}

// ═══════════════════════════════════════
// ZERNIO ANALYTICS API
// ═══════════════════════════════════════
// docs.zernio.com — GET /v1/analytics?postId={id}
// Acepta tanto Zernio Post IDs como External Post IDs (auto-resuelve) — el
// zernio_post_id que ya guarda `proposals` sirve directo como postId, sin
// necesidad de resolverlo al media ID real de la plataforma (esa incógnita
// quedaba documentada como pendiente en la versión anterior de este archivo,
// que pegaba directo a graph.facebook.com/{postId}/insights).

interface ZernioMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  clicks: number;
}

const ZERNIO_ANALYTICS_URL = "https://zernio.com/api/v1/analytics";

// Después de este tiempo desde publicado, un 202 ("sync pendiente") de Zernio
// deja de ser algo transitorio — es una anomalía real de Zernio para ese post
// (documentada: 2 posts trabados >11 días, 2026-08-17). No es un bug nuestro,
// así que no debe seguir contando como error en run_log corrida tras corrida.
const STALE_ANALYTICS_DAYS = 7;

// getPostAnalytics devuelve las métricas, o "pending" cuando Zernio todavía no
// las tiene (202). El caller decide si un 202 es transitorio o ya stale según
// la antigüedad del post.
type AnalyticsResult = { ok: true; metrics: ZernioMetrics } | { ok: false; pending: true };

async function getPostAnalytics(postId: string, apiKey: string): Promise<AnalyticsResult> {
  const url = `${ZERNIO_ANALYTICS_URL}?postId=${encodeURIComponent(postId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (res.status === 402) {
    throw new Error(
      "Zernio Analytics error 402: el plan actual no incluye el add-on de Analytics (planes legacy lo necesitan aparte; viene incluido en los planes usage-based)."
    );
  }
  if (res.status === 424) {
    throw new Error(
      "Zernio Analytics error 424: el post falló en publicar en todas las plataformas — no hay analíticas disponibles para este postId."
    );
  }
  if (res.status === 202) {
    return { ok: false, pending: true };
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zernio Analytics error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const a = data.analytics || {};
  return {
    ok: true,
    metrics: {
      likes: a.likes ?? 0,
      comments: a.comments ?? 0,
      shares: a.shares ?? 0,
      saves: a.saves ?? 0,
      reach: a.reach ?? 0,
      impressions: a.impressions ?? 0,
      clicks: a.clicks ?? 0,
    },
  };
}

// ═══════════════════════════════════════
// PROCESAMIENTO
// ═══════════════════════════════════════

async function collectMetrics(proposalId: string, postId: string, publishedAt?: string | null) {
  const apiKey = Deno.env.get("ZERNIO_API_KEY");
  if (!apiKey) {
    throw new Error("ZERNIO_API_KEY no configurado. Configurar en Supabase Secrets.");
  }

  // 1. Get analytics from Zernio
  const analytics = await getPostAnalytics(postId, apiKey);
  if (!analytics.ok) {
    const ageDays = publishedAt ? (Date.now() - new Date(publishedAt).getTime()) / 86_400_000 : 0;
    const stale = ageDays >= STALE_ANALYTICS_DAYS;
    return {
      postId,
      pending: true,
      stale,
      note: stale
        ? `Zernio nunca sincronizó las métricas de este post (${Math.round(ageDays)} días publicado). Anomalía conocida de Zernio, no un fallo del pipeline — se deja de reintentar activamente.`
        : "Zernio todavía está sincronizando las métricas (202) — reintenta la próxima corrida.",
    };
  }
  const metrics = analytics.metrics;

  // 2. Save to DB
  const { data: existing } = await supabase
    .from("metrics")
    .select("id")
    .eq("proposal_id", proposalId)
    .eq("post_id", postId)
    .single();

  if (existing) {
    // Update existing
    await supabase
      .from("metrics")
      .update({
        ...metrics,
        measured_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Insert new
    await supabase.from("metrics").insert({
      proposal_id: proposalId,
      post_id: postId,
      ...metrics,
    });
  }

  return { postId, metrics, updated: !!existing };
}

async function collectAllPending() {
  const apiKey = Deno.env.get("ZERNIO_API_KEY");
  if (!apiKey) {
    // ZERNIO_API_KEY ya existe como secret de GitHub Actions (lo usan
    // scripts/lib/zernio.mjs para publicar), pero acá corre como Supabase
    // Edge Function — es un secret de Supabase aparte, todavía no
    // configurado ahí. No cortar el cron con un error: mientras no exista,
    // esto es un no-op esperado, no una falla. Apenas se configure
    // ZERNIO_API_KEY como secret de Supabase, esta misma corrida empieza a
    // servir sin tocar nada más.
    return {
      message: "ZERNIO_API_KEY no configurado en Supabase Secrets todavía — nada para recolectar.",
      count: 0,
      skipped: true,
    };
  }

  // zernio_post_id es lo que efectivamente llena el pipeline actual
  // (scripts/publish-scheduled-posts.mjs, vía Zernio) — instagram_post_id es
  // legacy del publisher viejo (Graph API directa) y ya no lo escribe nadie.
  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, zernio_post_id, title, published_at")
    .eq("status", "published")
    .not("zernio_post_id", "is", null);

  if (!proposals?.length) {
    return { message: "No hay posts publicados para recolectar métricas", count: 0 };
  }

  const results = [];
  let collected = 0;
  let pending = 0;
  let stale = 0;
  let errored = 0;
  for (const proposal of proposals) {
    try {
      const result = await collectMetrics(proposal.id, proposal.zernio_post_id, proposal.published_at);
      results.push({ ...result, title: proposal.title });
      if ("pending" in result && result.pending) {
        if (result.stale) stale++;
        else pending++;
      } else {
        collected++;
      }
    } catch (e: any) {
      errored++;
      results.push({
        postId: proposal.zernio_post_id,
        title: proposal.title,
        error: e.message,
      });
    }
  }

  // count = piezas realmente medidas. Un post en "202 pendiente" o "stale" no
  // es un error del pipeline — se informa aparte para que el run_log del cron
  // no quede en rojo permanente por una limitación de Zernio.
  return { count: collected, pending, stale, errored, results };
}

// (Había acá un `generateInsights()` con consejos hardcodeados — código
// muerto desde que existe la Edge Function `insights` real (Fase A del plan
// de continuación): ningún caller, ni frontend ni cron. Borrado 2026-09-03,
// dogma "lo que no se usa se borra".)

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

    let result: Record<string, unknown> | undefined;

    switch (action) {
      case "collect":
        validateBody(body, ["proposalId", "postId"]);
        result = await collectMetrics(body.proposalId, body.postId);
        break;

      case "collect-all":
        result = await collectAllPending();
        break;

      default:
        throw new Error("Acción no válida. Usa 'collect' o 'collect-all'");
    }

    await logRun({
      source: "metrics-collector",
      step: action,
      status: "success",
      proposalId: action === "collect" ? body.proposalId : null,
      durationMs: Date.now() - startedAt,
      metadata:
        action === "collect-all"
          ? { count: result?.count, pending: result?.pending, stale: result?.stale, errored: result?.errored }
          : {},
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    await logRun({
      source: "metrics-collector",
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
