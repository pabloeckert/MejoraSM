// supabase/functions/metrics-collector/index.ts
// Recolecta métricas de Instagram Insights y las guarda en la DB
// Uso: POST /metrics-collector { action: "collect", proposalId, postId }
// Cron: ejecutar cada 6 horas

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCorsHeaders,
  ValidationError,
  validateBody,
  httpError,
  logger,
} from "../_shared/utils.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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
    throw new Error("INSTAGRAM_ACCESS_TOKEN no configurado");
  }

  // Find proposals with instagram_post_id but no recent metrics
  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, instagram_post_id, title")
    .eq("status", "published")
    .not("instagram_post_id", "is", null);

  if (!proposals?.length) {
    return { message: "No hay posts publicados para recolectar métricas", count: 0 };
  }

  const results = [];
  for (const proposal of proposals) {
    try {
      const result = await collectMetrics(proposal.id, proposal.instagram_post_id);
      results.push({ ...result, title: proposal.title });
    } catch (e: any) {
      results.push({
        postId: proposal.instagram_post_id,
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
  } catch (e: unknown) {
    logger.error("metrics-collector", "Request failed", { error: e instanceof Error ? e.message : String(e) });
    return httpError(corsHeaders, e);
  }
});
