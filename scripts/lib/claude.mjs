// scripts/lib/claude.mjs
// Llamada directa a la API de Anthropic (Claude Sonnet 5) con soporte de visión.
// Reemplaza la dependencia del ai-gateway de Supabase: el flujo de stories habla
// directo con Anthropic, sin intermediarios.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

export async function askClaude({ system, userText, image, maxTokens = 1024 }) {
  if (!ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY en el entorno.");

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
