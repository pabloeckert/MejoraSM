// supabase/functions/metrics-collector/index.ts
// Recolecta métricas desde la API de analíticas de Zernio y las guarda en la DB
// Uso: POST /metrics-collector { action: "collect", proposalId, postId }
// Cron: ejecutar cada 6 horas

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";

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
}

const ZERNIO_ANALYTICS_URL = "https://zernio.com/api/v1/analytics";

async function getPostAnalytics(postId: string, apiKey: string): Promise<ZernioMetrics> {
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
    throw new Error(
      "Zernio Analytics: sync pendiente (202) — todavía no terminó de sincronizar las métricas desde la plataforma, reintentar en la próxima corrida."
    );
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zernio Analytics error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const a = data.analytics || {};
  return {
    likes: a.likes ?? 0,
    comments: a.comments ?? 0,
    shares: a.shares ?? 0,
    saves: a.saves ?? 0,
    reach: a.reach ?? 0,
    impressions: a.impressions ?? 0,
  };
}

// ═══════════════════════════════════════
// PROCESAMIENTO
// ═══════════════════════════════════════

async function collectMetrics(proposalId: string, postId: string) {
  const apiKey = Deno.env.get("ZERNIO_API_KEY");
  if (!apiKey) {
    throw new Error("ZERNIO_API_KEY no configurado. Configurar en Supabase Secrets.");
  }

  // 1. Get analytics from Zernio
  const metrics = await getPostAnalytics(postId, apiKey);

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
    .select("id, zernio_post_id, title")
    .eq("status", "published")
    .not("zernio_post_id", "is", null);

  if (!proposals?.length) {
    return { message: "No hay posts publicados para recolectar métricas", count: 0 };
  }

  const results = [];
  for (const proposal of proposals) {
    try {
      const result = await collectMetrics(proposal.id, proposal.zernio_post_id);
      results.push({ ...result, title: proposal.title });
    } catch (e: any) {
      results.push({
        postId: proposal.zernio_post_id,
        title: proposal.title,
        error: e.message,
      });
    }
  }

  return { count: results.length, results };
}

async function generateInsights() {
  // Analyze metrics and generate insights
  const { data: metrics } = await supabase
    .from("metrics")
    .select("*, proposals(title, format, hook, hashtags)")
    .order("measured_at", { ascending: false })
    .limit(50);

  if (!metrics?.length) {
    return { insights: [], message: "No hay suficientes métricas para generar insights" };
  }

  // Calculate averages
  const avgEngagement =
    metrics.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / metrics.length;

  const topPost = metrics.reduce((best, m) =>
    (m.engagement_rate || 0) > (best.engagement_rate || 0) ? m : best
  );

  // Group by format
  const byFormat: Record<string, typeof metrics> = {};
  for (const m of metrics) {
    const format = m.proposals?.format || "post";
    if (!byFormat[format]) byFormat[format] = [];
    byFormat[format].push(m);
  }

  const formatStats = Object.entries(byFormat).map(([format, items]) => ({
    format,
    count: items.length,
    avgEngagement:
      items.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / items.length,
  }));

  return {
    totalPosts: metrics.length,
    avgEngagement: Math.round(avgEngagement * 100) / 100,
    topPost: {
      title: topPost.proposals?.title,
      engagement: topPost.engagement_rate,
      likes: topPost.likes,
      reach: topPost.reach,
    },
    formatStats,
    insights: [
      avgEngagement > 3
        ? "✅ Engagement rate por encima del promedio (3%). Seguir con la misma estrategia."
        : "⚠️ Engagement rate bajo el promedio. Probar hooks más emocionales o cambiar horario.",
      formatStats.length > 1
        ? `📊 El formato "${formatStats.sort((a, b) => b.avgEngagement - a.avgEngagement)[0]?.format}" tiene mejor rendimiento.`
        : "📊 Necesitás más variedad de formatos para comparar rendimiento.",
    ],
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
    const { action } = body;

    let result;

    switch (action) {
      case "collect":
        validateBody(body, ["proposalId", "postId"]);
        result = await collectMetrics(body.proposalId, body.postId);
        break;

      case "collect-all":
        result = await collectAllPending();
        break;

      case "insights":
        result = await generateInsights();
        break;

      default:
        throw new Error("Acción no válida. Usa 'collect', 'collect-all' o 'insights'");
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
