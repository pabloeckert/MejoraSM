// scripts/lib/claude.mjs
// Llamada directa a la API de Anthropic (Claude Sonnet 5) con soporte de visión.
// Reemplaza la dependencia del ai-gateway de Supabase: el flujo de stories habla
// directo con Anthropic, sin intermediarios.
//
// Fallback a Groq agregado 2026-08-17: la cuenta de Anthropic pegó contra su
// límite de uso ("You have reached your specified API usage limits. You will
// regain access on 2026-09-01") — confirmado real, `daily-story.yml` del
// 2026-08-17 falló por esto (ver run_log, source=daily-story). Solo cubre el
// caso SIN foto (Groq no tiene acá un modelo de visión verificado como
// confiable) — si hay foto y Anthropic falla, sigue fallando como antes en
// vez de arriesgar un fallback de visión sin probar.
//
// GROQ_MODEL actualizado 2026-08-18: Groq retiró "llama-3.3-70b-versatile"
// el 2026-08-16 (confirmado real — la corrida del cron de daily-story de ese
// día falló con 404 "model_not_found" pese a que GROQ_API_KEY ya estaba
// cargada y el fallback se activaba bien). Reemplazo oficial recomendado por
// Groq: "openai/gpt-oss-120b".

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "openai/gpt-oss-120b";

async function askAnthropic({ system, userText, image, maxTokens }) {
  const content = [];
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.media_type, data: image.base64 },
    });
  }
  content.push({ type: "text", text: userText });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic respondió ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

async function askGroqTextOnly({ system, userText, maxTokens }) {
  if (!GROQ_API_KEY) throw new Error("Falta GROQ_API_KEY en el entorno (fallback de Anthropic no disponible).");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userText },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq respondió ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function askClaude({ system, userText, image, maxTokens = 1024 }) {
  if (!ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY en el entorno.");

  try {
    return await askAnthropic({ system, userText, image, maxTokens });
  } catch (e) {
    if (image) throw e; // sin fallback de visión verificado — no arriesgar un resultado silenciosamente mal
    console.warn(`[claude.mjs] Anthropic falló (${e.message}), fallback a Groq (solo texto)`);
    return await askGroqTextOnly({ system, userText, maxTokens });
  }
}
