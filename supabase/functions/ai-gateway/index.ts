// supabase/functions/ai-gateway/index.ts
// Gateway universal de IA — conecta con Groq, DeepSeek, Gemini, HF
// Uso: POST /ai-gateway { provider, model, messages, system?, temperature?, max_tokens? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  getCorsHeaders,
  ValidationError,
  ProviderError,
  validateBody,
  withRetry,
  httpError,
  logger,
} from "../_shared/utils.ts";

// ═══════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════

interface AIRequest {
  provider: "groq" | "deepseek" | "gemini" | "hf";
  model?: string;
  messages: { role: string; content: string }[];
  system?: string;
  temperature?: number;
  max_tokens?: number;
}

interface AIResponse {
  content: string;
  provider: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

// ═══════════════════════════════════════
// PROVEEDORES
// ═══════════════════════════════════════

async function callGroq(req: AIRequest): Promise<AIResponse> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new ProviderError("groq", 503, "GROQ_API_KEY no configurada");

  const model = req.model || "meta-llama/llama-4-scout-17b-16e-instruct";
  const messages = req.system
    ? [{ role: "system", content: req.system }, ...req.messages]
    : req.messages;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.max_tokens ?? 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new ProviderError("groq", res.status, `Groq error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    provider: "groq",
    model,
    usage: data.usage,
  };
}

async function callDeepSeek(req: AIRequest): Promise<AIResponse> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new ProviderError("deepseek", 503, "DEEPSEEK_API_KEY no configurada");

  const model = req.model || "deepseek-chat";
  const messages = req.system
    ? [{ role: "system", content: req.system }, ...req.messages]
    : req.messages;

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.max_tokens ?? 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new ProviderError("deepseek", res.status, `DeepSeek error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    provider: "deepseek",
    model,
    usage: data.usage,
  };
}

async function callGemini(req: AIRequest): Promise<AIResponse> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new ProviderError("gemini", 503, "GEMINI_API_KEY no configurada");

  const model = req.model || "gemini-1.5-flash";
  const contents = req.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: req.temperature ?? 0.7,
      maxOutputTokens: req.max_tokens ?? 2048,
    },
  };
  if (req.system) {
    body.systemInstruction = { parts: [{ text: req.system }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new ProviderError("gemini", res.status, `Gemini error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    provider: "gemini",
    model,
  };
}

// ═══════════════════════════════════════
// EMBEDDINGS (HuggingFace)
// ═══════════════════════════════════════

async function callEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = Deno.env.get("HF_API_KEY");
  if (!apiKey) throw new ProviderError("hf", 503, "HF_API_KEY no configurada");
  const model = "sentence-transformers/all-MiniLM-L6-v2";

  const res = await fetch(
    `https://api-inference.huggingface.com/pipeline/feature-extraction/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new ProviderError("hf", res.status, `HF Embeddings error ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

// ═══════════════════════════════════════
// ROUTER CON FALLBACK AUTOMÁTICO
// ═══════════════════════════════════════

async function routeRequest(req: AIRequest): Promise<AIResponse> {
  switch (req.provider) {
    case "groq":
      return callGroq(req);
    case "deepseek":
      return callDeepSeek(req);
    case "gemini":
      return callGemini(req);
    default:
      throw new ValidationError(`Proveedor no soportado: ${req.provider}`);
  }
}

async function withFallback(req: AIRequest): Promise<AIResponse> {
  const providers: AIRequest["provider"][] = ["groq", "gemini", "deepseek"];
  const startIdx = Math.max(providers.indexOf(req.provider), 0);
  const errors: string[] = [];

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[(startIdx + i) % providers.length];
    try {
      return await withRetry(() => routeRequest({ ...req, provider }), 1, 800, `ai-gateway/${provider}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${provider}: ${msg}`);
      logger.warn("ai-gateway", `Provider ${provider} failed`, { provider, error: msg });
    }
  }
  throw new Error(`Todos los proveedores fallaron:\n${errors.join("\n")}`);
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
    const body = await req.json() as Record<string, unknown>;

    // Endpoint de embeddings
    if (body.action === "embed") {
      validateBody(body, ["texts"]);
      logger.info("ai-gateway", "Embedding request", { count: (body.texts as string[]).length });
      const embeddings = await callEmbeddings(body.texts as string[]);
      return new Response(JSON.stringify({ embeddings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat completion
    validateBody(body, ["provider", "messages"]);
    const aiReq = body as unknown as AIRequest;
    logger.info("ai-gateway", "Chat request", { provider: aiReq.provider, model: aiReq.model });
    const result = await withFallback(aiReq);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    logger.error("ai-gateway", "Request failed", { error: e instanceof Error ? e.message : String(e) });
    return httpError(corsHeaders, e);
  }
});
