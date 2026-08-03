// supabase/functions/ai-gateway/index.ts
// Gateway universal de IA — conecta con Groq, DeepSeek, Gemini, HF
// Uso: POST /ai-gateway { provider, model, messages, system?, temperature?, max_tokens? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

// ═══════════════════════════════════════
// VALIDACIÓN
// ═══════════════════════════════════════

function validateBody(body: any, required: string[]) {
  const missing = required.filter((k) => body[k] === undefined || body[k] === null);
  if (missing.length > 0) {
    throw new ValidationError(`Campos requeridos faltantes: ${missing.join(", ")}`);
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

class ProviderError extends Error {
  provider: string;
  status: number;
  constructor(provider: string, status: number, message: string) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = status;
  }
}

// ═══════════════════════════════════════
// RETRY CON EXPONENTIAL BACKOFF
// ═══════════════════════════════════════

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 1000): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      // No reintentar errores de validación
      if (e instanceof ValidationError) throw e;
      if (i === maxRetries) throw e;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      console.warn(`[ai-gateway] Retry ${i + 1}/${maxRetries} after ${Math.round(delay)}ms: ${e.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

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

  const model = req.model || "llama-3.3-70b-versatile";
  const messages = req.system
    ? [{ role: "system", content: req.system }, ...req.messages]
    : req.messages;

  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
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
    }
  );

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

  const res = await fetch(
    "https://api.deepseek.com/v1/chat/completions",
    {
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
    }
  );

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

  const systemInstruction = req.system
    ? { systemInstruction: { parts: [{ text: req.system }] } }
    : {};

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...systemInstruction,
        generationConfig: {
          temperature: req.temperature ?? 0.7,
          maxOutputTokens: req.max_tokens ?? 2048,
        },
      }),
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
  const res = await fetch(
    "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
    }
  );

  if (!res.ok) throw new ProviderError("hf", res.status, `HF Embeddings error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return await res.json();
}

// ═══════════════════════════════════════
// ROUTER CON FALLBACK
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
  const startIdx = providers.indexOf(req.provider);
  const errors: string[] = [];

  for (let i = 0; i < providers.length; i++) {
    const idx = (startIdx + i) % providers.length;
    try {
      return await withRetry(() => routeRequest({ ...req, provider: providers[idx] }), 1, 800);
    } catch (e: any) {
      errors.push(`${providers[idx]}: ${e.message}`);
      console.warn(`[ai-gateway] ${providers[idx]} falló: ${e.message}`);
    }
  }
  throw new Error(`Todos los proveedores fallaron:\n${errors.join("\n")}`);
}

// ═══════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return unauthorizedResponse(auth, corsHeaders);

  try {
    const body = await req.json();

    // Endpoint de embeddings
    if (body.action === "embed") {
      validateBody(body, ["texts"]);
      const embeddings = await callEmbeddings(body.texts);
      return new Response(JSON.stringify({ embeddings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat completion
    validateBody(body, ["provider", "messages"]);
    const aiReq = body as AIRequest;
    const result = await withFallback(aiReq);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    // Diferenciar tipos de error para HTTP status code apropiado
    let status = 500;
    if (e instanceof ValidationError) status = 400;
    else if (e instanceof ProviderError) status = e.status >= 500 ? 502 : e.status;

    return new Response(JSON.stringify({ error: e.message, type: e.name }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
