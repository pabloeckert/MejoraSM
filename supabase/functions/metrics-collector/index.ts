// supabase/functions/metrics-collector/index.ts
// Recolecta métricas de Instagram Insights y las guarda en la DB
// Uso: POST /metrics-collector { action: "collect", proposalId, postId }
// Cron: ejecutar cada 6 horas

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
// INSTAGRAM INSIGHTS API
// ═══════════════════════════════════════

interface InstagramMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
}

async function getPostInsights(postId: string, accessToken: string): Promise<InstagramMetrics> {
  // Instagram Graph API — Get insights for a media object
  // https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights
  const fields = "likes,comments,shares,saved,reach,impressions";
  const url = `https://graph.facebook.com/v19.0/${postId}/insights?metric=${fields}&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Instagram API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const metrics: InstagramMetrics = {
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    reach: 0,
    impressions: 0,
  };

  // Parse insights response
  for (const insight of data.data || []) {
    const value = insight.values?.[0]?.value ?? 0;
    switch (insight.name) {
      case "likes":
        metrics.likes = value;
        break;
      case "comments":
        metrics.comments = value;
        break;
      case "shares":
        metrics.shares = value;
        break;
      case "saved":
        metrics.saves = value;
        break;
      case "reach":
        metrics.reach = value;
        break;
      case "impressions":
        metrics.impressions = value;
        break;
    }
  }

  return metrics;
}

async function getAccountInsights(accountId: string, accessToken: string) {
  // Get account-level metrics (last 7 days)
  const since = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const until = Math.floor(Date.now() / 1000);
  const url = `https://graph.facebook.com/v19.0/${accountId}/insights?metric=impressions,reach,follower_count&period=day&since=${since}&until=${until}&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Instagram Account Insights error ${res.status}: ${err.slice(0, 200)}`);
  }

  return await res.json();
}

// ═══════════════════════════════════════
// PROCESAMIENTO
// ═══════════════════════════════════════

// NOTA (pendiente real, no resuelto en este pase): postId acá es
// zernio_post_id (el id que Zernio le da al post), no necesariamente el
// media id real de Instagram que pide la Graph API en /{media-id}/insights.
// sync-history.mjs nunca confirmó que Zernio devuelva ese id real en su
// respuesta — solo platformPostUrl. Hasta no verificar el schema real de
// Zernio con un post publicado, esta llamada puede fallar aunque
// INSTAGRAM_ACCESS_TOKEN ya esté configurado; no es algo que se pueda
// resolver sin pegarle a la API real con datos en vivo.
async function collectMetrics(proposalId: string, postId: string) {
  const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
  if (!accessToken) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN no configurado. Configurar en Supabase Secrets.");
  }

  // 1. Get insights from Instagram
  const metrics = await getPostInsights(postId, accessToken);

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
  const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
  if (!accessToken) {
    // Recolectar métricas reales requiere un token de Instagram Graph API
    // (Meta for Developers) que todavía no se configuró — es un trámite de
    // Pablo, no algo que se resuelva con código. No cortar el cron con un
    // error: mientras no exista el token, esto es un no-op esperado, no una
    // falla. Apenas se configure INSTAGRAM_ACCESS_TOKEN como secret, esta
    // misma corrida empieza a servir sin tocar nada más.
    return {
      message: "INSTAGRAM_ACCESS_TOKEN no configurado todavía — nada para recolectar.",
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
