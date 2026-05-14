// supabase/functions/health/index.ts
// Health check endpoint — verifica conectividad con DB y proveedores de IA
// Uso: GET /health | POST /health { checks?: ["db", "groq", "deepseek"] }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, logger } from "../_shared/utils.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface CheckResult {
  status: "ok" | "error" | "degraded";
  latency_ms?: number;
  detail?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  checks: Record<string, CheckResult>;
  uptime_hint: string;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { error } = await supabase
      .from("agent_config")
      .select("id")
      .limit(1)
      .single();

    const latency_ms = Date.now() - start;

    if (error && error.code !== "PGRST116") {
      return { status: "error", latency_ms, detail: error.message };
    }
    return { status: "ok", latency_ms };
  } catch (e: unknown) {
    return {
      status: "error",
      latency_ms: Date.now() - start,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkGroq(): Promise<CheckResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) return { status: "error", detail: "GROQ_API_KEY no configurada" };

  const start = Date.now();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    const latency_ms = Date.now() - start;
    if (!res.ok) return { status: "error", latency_ms, detail: `HTTP ${res.status}` };
    return { status: "ok", latency_ms };
  } catch (e: unknown) {
    return {
      status: "error",
      latency_ms: Date.now() - start,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkDeepSeek(): Promise<CheckResult> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) return { status: "error", detail: "DEEPSEEK_API_KEY no configurada" };

  const start = Date.now();
  try {
    const res = await fetch("https://api.deepseek.com/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    const latency_ms = Date.now() - start;
    if (!res.ok) return { status: "error", latency_ms, detail: `HTTP ${res.status}` };
    return { status: "ok", latency_ms };
  } catch (e: unknown) {
    return {
      status: "error",
      latency_ms: Date.now() - start,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkHuggingFace(): Promise<CheckResult> {
  const apiKey = Deno.env.get("HF_API_KEY");
  if (!apiKey) return { status: "degraded", detail: "HF_API_KEY no configurada (RAG sin embeddings)" };

  const start = Date.now();
  try {
    const res = await fetch(
      "https://api-inference.huggingface.com/models/sentence-transformers/all-MiniLM-L6-v2",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    const latency_ms = Date.now() - start;
    if (res.status === 503) return { status: "degraded", latency_ms, detail: "Modelo cargando (normal en free tier)" };
    if (!res.ok) return { status: "error", latency_ms, detail: `HTTP ${res.status}` };
    return { status: "ok", latency_ms };
  } catch (e: unknown) {
    return {
      status: "error",
      latency_ms: Date.now() - start,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const checks: Record<string, CheckResult> = {};

    // Siempre verificar DB
    checks.database = await checkDatabase();

    // Verificar proveedores de IA en paralelo
    const [groq, deepseek, huggingface] = await Promise.all([
      checkGroq(),
      checkDeepSeek(),
      checkHuggingFace(),
    ]);

    checks.groq = groq;
    checks.deepseek = deepseek;
    checks.huggingface = huggingface;

    // Determinar status global
    const statuses = Object.values(checks).map((c) => c.status);
    const hasError = statuses.some((s) => s === "error");
    const hasDegraded = statuses.some((s) => s === "degraded");
    const dbOk = checks.database.status === "ok";

    let globalStatus: HealthResponse["status"];
    if (!dbOk || (hasError && checks.groq.status === "error" && checks.deepseek.status === "error")) {
      globalStatus = "unhealthy";
    } else if (hasError || hasDegraded) {
      globalStatus = "degraded";
    } else {
      globalStatus = "healthy";
    }

    const response: HealthResponse = {
      status: globalStatus,
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      checks,
      uptime_hint: `Check took ${Date.now() - startTime}ms`,
    };

    logger.info("health", "Health check completed", { status: globalStatus });

    const httpStatus = globalStatus === "unhealthy" ? 503 : 200;

    return new Response(JSON.stringify(response, null, 2), {
      status: httpStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("health", "Health check failed", { error: msg });
    return new Response(
      JSON.stringify({ status: "unhealthy", error: msg, timestamp: new Date().toISOString() }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
