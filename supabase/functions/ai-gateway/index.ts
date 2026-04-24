// supabase/functions/ai-gateway/index.ts
// Gateway universal de IA — conecta con Groq, DeepSeek, Gemini, HF
// Uso: POST /ai-gateway { provider, model, messages, system?, temperature?, max_tokens? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = [
  "https://util.mejoraok.com",
  "http://localhost:8080",
  "http://localhost:5173",
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
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada");

  const model = req.model || "meta-llama/llama-4-scout-17b-16e-instruct";
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
    throw new Error(`Groq error ${res.status}: ${err}`);
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
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY no configurada");

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
    throw new Error(`DeepSeek error ${res.status}: ${err}`);
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
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

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
    throw new Error(`Gemini error ${res.status}: ${err}`);
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

  if (!res.ok) throw new Error(`HF Embeddings error: ${await res.text()}`);
  return await res.json();
}

// ═══════════════════════════════════════
// ROUTER
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
      throw new Error(`Proveedor no soportado: ${req.provider}`);
  }
}

// Fallback: si el proveedor principal falla, intenta el siguiente
async function withFallback(req: AIRequest): Promise<AIResponse> {
  const providers: AIRequest["provider"][] = ["groq", "gemini", "deepseek"];
  const startIdx = providers.indexOf(req.provider);

  for (let i = 0; i < providers.length; i++) {
    const idx = (startIdx + i) % providers.length;
    try {
      return await routeRequest({ ...req, provider: providers[idx] });
    } catch (e) {
      console.warn(`[${providers[idx]}] falló: ${e.message}`);
      if (i === providers.length - 1) throw e;
    }
  }
  throw new Error("Todos los proveedores fallaron");
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

  try {
    const body = await req.json();

    // Endpoint de embeddings
    if (body.action === "embed") {
      const embeddings = await callEmbeddings(body.texts);
      return new Response(JSON.stringify({ embeddings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat completion
    const aiReq = body as AIRequest;
    if (!aiReq.provider || !aiReq.messages) {
      throw new Error("Faltan campos: provider, messages");
    }

    const result = await withFallback(aiReq);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
