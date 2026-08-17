// supabase/functions/classify-photo/index.ts
// Sugerencia de dimensión por IA — Taller de la Oferta, 2026-08-17.
// Pablo y Sindy respondieron explícitamente "el sistema propone" a la
// pregunta de quién decide la dimensión de cada foto — hasta ahora la
// elegía a mano quien subía la foto. Esta función mira la foto real (Claude
// con visión) y sugiere una de las 6 dimensiones, con el motivo — el humano
// sigue confirmando o corrigiendo antes de que se guarde, nunca se decide
// sola.
//
// Uso: POST /classify-photo { action: "suggest", imageBase64, mimeType }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Mismas 6 dimensiones y mismo texto de contexto que scripts/generate-brief.mjs
// (OFERTAS) — si se edita una de las dos listas, hay que editar la otra.
const DIMENSIONES: { key: string; nombre: string; contexto: string }[] = [
  { key: "personal", nombre: "Personal", contexto: "Liderazgo, gestión emocional, creencias, objetivos personales de quien lidera." },
  { key: "organizacional", nombre: "Organizacional", contexto: "Cultura, roles, procesos internos, comunicación, liderazgo de equipos." },
  { key: "comercial", nombre: "Comercial", contexto: "Ventas, pricing, fidelización, negociación, marketing." },
  { key: "empresarial", nombre: "Empresarial", contexto: "Modelo de negocio, finanzas, escalabilidad, calidad, transformación digital." },
  { key: "profesionalizacion", nombre: "Profesionalización", contexto: "Nivel integrador de las 4 anteriores — formación, métricas, procesos replicables." },
  { key: "sociales", nombre: "Sociales", contexto: "La cara humana y social de la marca, NO una dimensión de servicio: encuentros de equipo, alianzas, invitaciones, After Office, celebraciones." },
];

const VALID_KEYS = new Set(DIMENSIONES.map((d) => d.key));

interface SuggestResult {
  dimension: string;
  reason: string;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

async function suggestDimension(imageBase64: string, mimeType: string): Promise<SuggestResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");

  const listado = DIMENSIONES.map((d) => `- ${d.key} ("${d.nombre}"): ${d.contexto}`).join("\n");
  const system = `Sos un clasificador de fotos para el contenido de MejoraOK (consultora de management). Mirá la foto y elegí UNA de estas 6 dimensiones — la que mejor describe lo que se ve:

${listado}

Respondé ÚNICAMENTE con JSON válido, sin nada antes ni después:
{"dimension": "<key exacta de la lista>", "reason": "<1 frase corta explicando por qué, en español>"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 300,
      system,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
            { type: "text", text: "¿Qué dimensión es esta foto?" },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as AnthropicResponse;
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error("Anthropic: respuesta sin contenido");

  const cleaned = textBlock.text.trim().replace(/^```json\s*|^```\s*|```$/g, "").trim();
  let parsed: SuggestResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No se pudo interpretar la respuesta del clasificador");
    parsed = JSON.parse(match[0]);
  }

  if (!VALID_KEYS.has(parsed.dimension)) {
    throw new Error(`Dimensión sugerida inválida: "${parsed.dimension}"`);
  }

  return parsed;
}

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
    const body = (await req.json()) as Record<string, unknown>;
    action = body.action as string | undefined;

    if (action !== "suggest") {
      throw new Error("Acción no válida. Usa 'suggest'");
    }
    const imageBase64 = body.imageBase64 as string | undefined;
    const mimeType = (body.mimeType as string | undefined) || "image/jpeg";
    if (!imageBase64) throw new Error("Campos requeridos faltantes: imageBase64");

    const result = await suggestDimension(imageBase64, mimeType);

    await logRun({
      source: "classify-photo",
      step: "suggest",
      status: "success",
      durationMs: Date.now() - startedAt,
      metadata: { dimension: result.dimension },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = errorMessage(e);
    await logRun({
      source: "classify-photo",
      step: action || "unknown",
      status: "error",
      durationMs: Date.now() - startedAt,
      error: msg,
    });
    const status = msg.includes("Campos requeridos") || msg.includes("Acción no válida") ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
