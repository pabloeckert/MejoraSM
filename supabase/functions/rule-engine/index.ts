// supabase/functions/rule-engine/index.ts
// Motor de reglas de éxito — analiza métricas y genera reglas automáticas
// Uso: POST /rule-engine { action: "analyze" | "suggest", topic? }
// Cron: ejecutar diariamente

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

// ═══════════════════════════════════════
// ANÁLISIS DE MÉTRICAS
// ═══════════════════════════════════════

interface RuleCandidate {
  rule_type: string;
  condition: Record<string, any>;
  action: Record<string, any>;
  confidence: number;
  evidence: string;
}

async function analyzeMetrics(): Promise<RuleCandidate[]> {
  // Get metrics with proposal details
  const { data: metrics } = await supabase
    .from("metrics")
    .select("*, proposals(title, format, hook, hashtags, body)")
    .order("measured_at", { ascending: false })
    .limit(100);

  if (!metrics?.length || metrics.length < 5) {
    return [];
  }

  const rules: RuleCandidate[] = [];
  const avgEngagement =
    metrics.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / metrics.length;

  // 1. Analyze by format
  const byFormat: Record<string, typeof metrics> = {};
  for (const m of metrics) {
    const format = m.proposals?.format || "post";
    if (!byFormat[format]) byFormat[format] = [];
    byFormat[format].push(m);
  }

  for (const [format, items] of Object.entries(byFormat)) {
    if (items.length < 2) continue;
    const avg = items.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / items.length;
    if (avg > avgEngagement * 1.3) {
      rules.push({
        rule_type: "format",
        condition: { format },
        action: { prefer: true, reason: `Formato ${format} rinde ${Math.round(avg * 100) / 100}% engagement vs ${Math.round(avgEngagement * 100) / 100}% promedio` },
        confidence: Math.min(0.9, 0.5 + (items.length / 20)),
        evidence: `${items.length} posts con engagement promedio de ${Math.round(avg * 100) / 100}%`,
      });
    }
  }

  // 2. Analyze hook patterns
  const highPerformers = metrics.filter((m) => (m.engagement_rate || 0) > avgEngagement * 1.2);
  const lowPerformers = metrics.filter((m) => (m.engagement_rate || 0) < avgEngagement * 0.8);

  if (highPerformers.length >= 2) {
    // Check for question hooks
    const questionHooks = highPerformers.filter((m) =>
      m.proposals?.hook?.includes("?") || m.proposals?.hook?.includes("¿")
    );
    if (questionHooks.length >= 2) {
      rules.push({
        rule_type: "hook",
        condition: { pattern: "question" },
        action: { prefer: true, reason: "Los hooks con pregunta rinden mejor" },
        confidence: Math.min(0.85, 0.5 + (questionHooks.length / 10)),
        evidence: `${questionHooks.length}/${highPerformers.length} posts de alto rendimiento usan hooks con pregunta`,
      });
    }

    // Check for emoji usage — antes no cubría Dingbats (✨✅❤️ quedaban sin
    // detectar, solo emojis del plano suplementario como 🚀). Fase 0 del
    // plan estratégico 2026-08-16, hallazgo ya documentado desde la
    // corrida real de rule-engine del 2026-08-05.
    const emojiPattern =
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;
    const emojiHooks = highPerformers.filter((m) => emojiPattern.test(m.proposals?.hook || ""));
    if (emojiHooks.length >= 2) {
      rules.push({
        rule_type: "hook",
        condition: { pattern: "emoji" },
        action: { prefer: true, reason: "Los hooks con emojis generan más engagement" },
        confidence: Math.min(0.8, 0.5 + (emojiHooks.length / 10)),
        evidence: `${emojiHooks.length}/${highPerformers.length} posts exitosos usan emojis en el hook`,
      });
    }
  }

  // 3. Analyze timing
  const byHour: Record<number, typeof metrics> = {};
  for (const m of metrics) {
    const hour = new Date(m.measured_at).getHours();
    if (!byHour[hour]) byHour[hour] = [];
    byHour[hour].push(m);
  }

  let bestHour = -1;
  let bestHourAvg = 0;
  for (const [hour, items] of Object.entries(byHour)) {
    if (items.length < 2) continue;
    const avg = items.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / items.length;
    if (avg > bestHourAvg) {
      bestHourAvg = avg;
      bestHour = parseInt(hour);
    }
  }

  if (bestHour >= 0 && bestHourAvg > avgEngagement * 1.2) {
    rules.push({
      rule_type: "timing",
      condition: { hour: bestHour },
      action: { prefer: true, reason: `Publicar a las ${bestHour}:00 hs rinde mejor` },
      confidence: Math.min(0.75, 0.4 + (byHour[bestHour]?.length || 0) / 10),
      evidence: `Posts a las ${bestHour}:00 hs tienen ${Math.round(bestHourAvg * 100) / 100}% engagement promedio`,
    });
  }

  // 4. Analyze hashtag count
  const withHashtags = metrics.filter((m) => (m.proposals?.hashtags?.length || 0) > 0);
  const withoutHashtags = metrics.filter((m) => !m.proposals?.hashtags?.length);
  if (withHashtags.length >= 3 && withoutHashtags.length >= 3) {
    const withAvg = withHashtags.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / withHashtags.length;
    const withoutAvg = withoutHashtags.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / withoutHashtags.length;
    if (withAvg > withoutAvg * 1.2) {
      rules.push({
        rule_type: "hashtag",
        condition: { min_count: 5 },
        action: { prefer: true, reason: "Usar hashtags mejora el engagement" },
        confidence: 0.7,
        evidence: `Con hashtags: ${Math.round(withAvg * 100) / 100}% vs Sin: ${Math.round(withoutAvg * 100) / 100}%`,
      });
    }
  }

  return rules;
}

async function saveRules(rules: RuleCandidate[]) {
  let saved = 0;
  for (const rule of rules) {
    // Check if similar rule exists
    const { data: existing } = await supabase
      .from("success_rules")
      .select("id, confidence, times_applied")
      .eq("rule_type", rule.rule_type)
      .eq("condition", JSON.stringify(rule.condition))
      .single();

    if (existing) {
      // Update confidence (weighted average)
      const newConfidence =
        (existing.confidence * existing.times_applied + rule.confidence) /
        (existing.times_applied + 1);
      await supabase
        .from("success_rules")
        .update({
          confidence: Math.min(0.95, newConfidence),
          action: rule.action,
          evidence: rule.evidence,
          times_applied: (existing.times_applied || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("success_rules").insert({
        rule_type: rule.rule_type,
        condition: rule.condition,
        action: rule.action,
        confidence: rule.confidence,
        evidence: rule.evidence,
        times_applied: 1,
      });
    }
    saved++;
  }
  return saved;
}

// ═══════════════════════════════════════
// SUGERENCIAS
// ═══════════════════════════════════════

async function getSuggestions(topic?: string) {
  // Get active rules sorted by confidence
  const { data: rules } = await supabase
    .from("success_rules")
    .select("*")
    .gte("confidence", 0.5)
    .order("confidence", { ascending: false })
    .limit(10);

  if (!rules?.length) {
    return {
      suggestions: [],
      message: "No hay reglas aprendidas todavía. Necesitás al menos 5 posts con métricas.",
    };
  }

  const suggestions = rules.map((r) => ({
    type: r.rule_type,
    suggestion: r.action?.reason || r.action?.prefer ? `Preferir: ${r.rule_type}` : `Evitar: ${r.rule_type}`,
    confidence: Math.round(r.confidence * 100) + "%",
    applied: r.times_applied || 0,
  }));

  return { suggestions, totalRules: rules.length };
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
    const body = await req.json().catch(() => ({}));
    ({ action } = body);

    let result: { rulesFound?: number; rulesSaved?: number } | undefined;

    switch (action) {
      case "analyze": {
        const rules = await analyzeMetrics();
        const saved = await saveRules(rules);
        result = {
          rulesFound: rules.length,
          rulesSaved: saved,
          rules: rules.map((r) => ({
            type: r.rule_type,
            condition: r.condition,
            action: r.action,
            confidence: Math.round(r.confidence * 100) + "%",
            evidence: r.evidence,
          })),
        };
        break;
      }

      case "suggest": {
        result = await getSuggestions(body.topic);
        break;
      }

      default:
        throw new Error("Acción no válida. Usa 'analyze' o 'suggest'");
    }

    await logRun({
      source: "rule-engine",
      step: action,
      status: "success",
      durationMs: Date.now() - startedAt,
      metadata: action === "analyze" ? { rulesFound: result?.rulesFound, rulesSaved: result?.rulesSaved } : {},
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    await logRun({
      source: "rule-engine",
      step: action || "unknown",
      status: "error",
      durationMs: Date.now() - startedAt,
      error: e.message,
    });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
