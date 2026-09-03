// supabase/functions/vault-process/index.ts
// Procesa documentos: extrae texto, crea chunks, genera embeddings
// Uso: POST /vault-process { documentId } | { action: "search", query, limit }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import mammoth from "npm:mammoth@1.8.0";
import { getDocumentProxy, extractText } from "npm:unpdf@1.4.0";
import { Buffer } from "node:buffer";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { logRun } from "../_shared/runLog.ts";

// Límite de tamaño de archivo — hallazgo real de auditoría 2026-08-25: sin
// esto, un PDF/DOCX grande podía agotar memoria/tiempo del runtime de Deno
// y fallar como "documento fantasma" (contenido a medias, sin aviso claro).
// 20MB es holgado para un manual de marca en texto, corto para video/fotos
// (que no deberían subirse acá de todas formas).
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_ORIGINS = [
  "https://pabloeckert.github.io",
  "https://mejorasm.mejoraok.com",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
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

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ═══════════════════════════════════════
// VALIDACIÓN
// ═══════════════════════════════════════

function validateBody(body: any, required: string[]) {
  const missing = required.filter((k) => body[k] === undefined || body[k] === null);
  if (missing.length > 0) {
    throw new ValidationError(`Campos requeridos faltantes: ${missing.join(", ")}`);
  }
}

function validateUUID(value: string, fieldName: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`${fieldName} debe ser un UUID válido, recibido: ${value}`);
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
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
      if (e instanceof ValidationError) throw e;
      if (i === maxRetries) throw e;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      console.warn(`[vault-process] Retry ${i + 1}/${maxRetries} after ${Math.round(delay)}ms: ${e.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ═══════════════════════════════════════
// CHUNKING
// ═══════════════════════════════════════

function chunkText(text: string, maxTokens = 500, overlap = 50): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.length / 4); // ~4 chars per token

    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));

      // Overlap: mantener las últimas oraciones
      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const sTokens = Math.ceil(currentChunk[i].length / 4);
        if (overlapTokens + sTokens > overlap) break;
        overlapSentences.unshift(currentChunk[i]);
        overlapTokens += sTokens;
      }

      currentChunk = overlapSentences;
      currentTokens = overlapTokens;
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

// ═══════════════════════════════════════
// CLASIFICACIÓN DE TIPO DE DOCUMENTO — Fase C (2026-08-31)
//
// El brief de rediseño pide que la Bóveda ("Manual de Identidad de Marca")
// organice los documentos por tipo y que el sistema lo proponga solo. Un
// llamado corto al LLM (mismo par anthropic→groq que el resto del stack)
// sobre el título + los primeros ~2500 chars del texto ya extraído.
// ═══════════════════════════════════════

const DOC_CATEGORIES = ["manual", "buyer_persona", "tono", "ejemplo", "otro"] as const;
type DocCategory = (typeof DOC_CATEGORIES)[number];

async function callLLM(system: string, user: string): Promise<string> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 64,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (r.ok) {
        const data = await r.json();
        return (data.content?.[0]?.text ?? "").trim();
      }
      console.warn(`[vault-process] Anthropic clasificación ${r.status}, fallback a Groq`);
    } catch (e: any) {
      console.warn(`[vault-process] Anthropic clasificación falló (${e.message}), fallback a Groq`);
    }
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) throw new Error("Sin ANTHROPIC_API_KEY ni GROQ_API_KEY para clasificar");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      max_tokens: 64,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Groq clasificación error ${r.status}`);
  const data = await r.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

async function classifyDocument(title: string, content: string): Promise<DocCategory> {
  const system =
    "Clasificás documentos de identidad de marca en UNA de estas categorías, respondiendo SOLO con la palabra exacta:\n" +
    "- manual: manual de marca, guía de estilo, criterio medular, arquitectura de contenido, valores, lineamientos generales\n" +
    "- buyer_persona: descripción de un público / cliente ideal / arquetipo de audiencia\n" +
    "- tono: guía de tono y voz, cómo se escribe, qué decir y qué no\n" +
    "- ejemplo: una pieza de ejemplo, un post modelo, un caso concreto de contenido ya hecho\n" +
    "- otro: no encaja claramente en las anteriores\n" +
    "Respondé únicamente con: manual, buyer_persona, tono, ejemplo u otro.";
  const user = `TÍTULO: ${title}\n\nTEXTO (recorte):\n${content.slice(0, 2500)}`;

  try {
    // Normaliza espacios a "_" antes de sacar cualquier otro carácter — si
    // el LLM responde "buyer persona" (espacio) en vez de "buyer_persona"
    // (el formato exacto pedido), la versión anterior lo perdía en
    // silencio: el espacio se descartaba junto con la puntuación y
    // "buyerpersona" nunca matcheaba contra "buyer_persona", cayendo
    // siempre a "otro" sin ningún aviso.
    const raw = (await callLLM(system, user))
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z_]/g, "");
    const match = DOC_CATEGORIES.find((c) => raw === c || raw.includes(c));
    return match ?? "otro";
  } catch (e: any) {
    console.warn(`[vault-process] Clasificación falló, category=otro: ${e.message}`);
    return "otro";
  }
}

// ═══════════════════════════════════════
// EMBEDDINGS (llamada directa a HF)
// ═══════════════════════════════════════

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const hfKey = Deno.env.get("HF_API_KEY");
  if (!hfKey) throw new Error("HF_API_KEY no configurada");

  const res = await withRetry(async () => {
    const r = await fetch(
      "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
      }
    );
    if (!r.ok) throw new Error(`HF Embeddings error ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error("HF: respuesta no es array");
    return data;
  }, 2, 1500);

  return res;
}

// ═══════════════════════════════════════
// PROCESAMIENTO PRINCIPAL
// ═══════════════════════════════════════

async function setStatus(documentId: string, processing_status: string, processing_error: string | null = null) {
  await supabase.from("documents").update({ processing_status, processing_error }).eq("id", documentId);
}

async function processDocument(documentId: string) {
  validateUUID(documentId, "documentId");

  try {
    return await processDocumentInner(documentId);
  } catch (e: unknown) {
    // Sin este catch, un error a mitad de camino dejaba `processing_status`
    // en el último valor intermedio ("extracting"/"chunking"/"embedding")
    // para siempre — indistinguible en la UI de "sigue procesando ahora
    // mismo". Hallazgo real de auditoría 2026-08-25.
    const message = e instanceof Error ? e.message : String(e);
    await setStatus(documentId, "error", message.slice(0, 500));
    throw e;
  }
}

async function processDocumentInner(documentId: string) {
  // 1. Obtener documento
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docError) throw new Error(`Error obteniendo documento: ${docError.message}`);
  if (!doc) throw new Error(`Documento no encontrado: ${documentId}`);

  // 2. Obtener contenido (si ya está procesado) o descargar del storage
  let content = doc.content;

  if (!content) {
    await setStatus(documentId, "extracting");
    // Descargar del storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("vault")
      .download(doc.file_path);

    if (downloadError) throw new Error(`Error descargando archivo: ${downloadError.message}`);
    if (!fileData) throw new Error(`No se pudo descargar el archivo: ${doc.file_path}`);

    if (fileData.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `El archivo pesa ${(fileData.size / 1024 / 1024).toFixed(1)}MB, el máximo soportado es ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`
      );
    }

    // Extraer texto según tipo real. Hallazgo real de auditoría 2026-08-25:
    // hasta ahora PDF/DOC/DOCX caían al mismo `fileData.text()` que texto
    // plano, lo que sobre bytes binarios reales produce basura ilegible
    // que se guardaba, troceaba y embebía como si fuera texto real, sin
    // ningún error — un documento de marca "fantasma", indistinguible en
    // la UI de uno que funciona. `scripts/load-vault-documents.mjs` ya
    // había resuelto esto con `mammoth` para su propio camino de carga
    // masiva (Node) — acá se agrega el equivalente real para el camino
    // normal de /boveda (Deno Edge Function): `mammoth` para DOCX,
    // `unpdf` (PDF.js empaquetado para runtimes serverless/edge, sin
    // dependencias de Node) para PDF.
    const isPdf = doc.file_type === "application/pdf" || doc.file_path.endsWith(".pdf");
    const isDocx =
      doc.file_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      doc.file_path.endsWith(".docx");
    const isPlainText =
      doc.file_type === "text/plain" || doc.file_path.endsWith(".txt") || doc.file_path.endsWith(".md");

    try {
      if (isPlainText) {
        content = await fileData.text();
      } else if (isPdf) {
        const buffer = new Uint8Array(await fileData.arrayBuffer());
        const pdf = await getDocumentProxy(buffer);
        const { text } = await extractText(pdf, { mergePages: true });
        content = text;
      } else if (isDocx) {
        // La build de mammoth que resuelve `npm:mammoth` en Deno es la de
        // Node, que espera `{ buffer: Buffer }` — la clave `arrayBuffer`
        // solo existe en su build de navegador (mammoth.browser.js), que
        // acá no se está usando. Confirmado real: sin este cambio, fallaba
        // con "Could not find file in options" (probado 2026-08-25).
        const arrayBuffer = await fileData.arrayBuffer();
        const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
        content = result.value;
      } else if (doc.file_path.endsWith(".doc")) {
        // .doc legacy (binario pre-2007) no tiene extractor confiable
        // disponible para Deno/edge — mammoth solo soporta .docx (XML).
        // Fallar con un mensaje claro es mejor que guardar basura binaria.
        throw new Error(".doc (Word 97-2003) no está soportado — convertí el archivo a .docx o .pdf y volvé a subirlo");
      } else {
        throw new Error(`Tipo de archivo no soportado: ${doc.file_type || doc.file_path}`);
      }
    } catch (e: any) {
      throw new Error(`Error extrayendo texto del archivo: ${e.message}`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error("El archivo está vacío o no se pudo extraer texto");
    }

    // Guardar contenido extraído
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        content,
        word_count: content.split(/\s+/).length,
      })
      .eq("id", documentId);

    if (updateError) throw new Error(`Error guardando contenido: ${updateError.message}`);
  }

  // 2b. Clasificar el tipo de documento (Fase C 2026-08-31) — solo si no
  // tiene categoría todavía (el humano pudo haberla fijado a mano desde la
  // UI, en cuyo caso se respeta). No frena el procesamiento si falla.
  if (!doc.category) {
    const category = await classifyDocument(doc.title || doc.file_path, content);
    await supabase.from("documents").update({ category }).eq("id", documentId);
  }

  // 3. Chunking
  await setStatus(documentId, "chunking");
  const chunks = chunkText(content);
  if (chunks.length === 0) throw new Error("El documento no generó chunks de texto");

  // 4. Generar embeddings (opcional — si HF falla, guardar sin vectores)
  await setStatus(documentId, "embedding");
  let embeddings: number[][] | null = null;
  try {
    embeddings = await generateEmbeddings(chunks);
  } catch (e: any) {
    console.warn(`[vault-process] Embeddings fallaron: ${e.message}. Guardando chunks sin vectores.`);
  }

  // 5. Eliminar chunks anteriores (si se reprocesa)
  await supabase.from("doc_chunks").delete().eq("document_id", documentId);

  // 6. Guardar chunks (con o sin embeddings)
  const chunkRecords = chunks.map((chunk, i) => ({
    document_id: documentId,
    chunk_index: i,
    content: chunk,
    token_count: Math.ceil(chunk.length / 4),
    ...(embeddings ? { embedding: embeddings[i] } : {}),
  }));

  const { error: insertError } = await supabase.from("doc_chunks").insert(chunkRecords);
  if (insertError) throw new Error(`Error guardando chunks: ${insertError.message}`);

  // Sin embeddings, el documento no es un error (tiene contenido real y
  // chunks reales) pero tampoco es buscable por RAG — estado propio para
  // que la UI lo distinga, en vez de mostrarlo como "Procesado" sin más
  // (hallazgo real de auditoría: quedaba invisible para match_documents
  // sin que nadie se enterara).
  await setStatus(documentId, embeddings ? "ready" : "ready_no_search");

  return {
    documentId,
    chunksCreated: chunks.length,
    totalTokens: chunkRecords.reduce((sum, c) => sum + (c.token_count || 0), 0),
    withEmbeddings: !!embeddings,
  };
}

// ═══════════════════════════════════════
// BÚSQUEDA SEMÁNTICA (RAG)
// ═══════════════════════════════════════

function sanitizeText(text: string, maxLen = 5000): string {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, maxLen).replace(/\0/g, "");
}

async function searchDocs(query: string, limit = 5): Promise<string[]> {
  const cleanQuery = sanitizeText(query, 1000);
  if (!cleanQuery || cleanQuery.length === 0) throw new ValidationError("Query de búsqueda vacía");
  if (cleanQuery.length < 2) throw new ValidationError("Query muy corta (mínimo 2 caracteres)");
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);

  // Intentar búsqueda vectorial
  try {
    const [queryEmbedding] = await generateEmbeddings([query]);

    const { data: chunks, error: rpcError } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: safeLimit,
    });

    if (rpcError) throw new Error(`RPC error: ${rpcError.message}`);
    if (chunks?.length) return chunks.map((c: any) => c.content);
  } catch (e: any) {
    if (e instanceof ValidationError) throw e;
    console.warn(`[vault-process] Búsqueda vectorial falló: ${e.message}. Usando fallback.`);
  }

  // Fallback: últimos chunks por fecha
  const { data: chunks } = await supabase
    .from("doc_chunks")
    .select("content")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  return chunks?.map((c: any) => c.content) || [];
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
    const body = await req.json();
    ({ action } = body);
    const { documentId, query, limit } = body;

    let result: { chunksCreated?: number } | undefined;

    switch (action) {
      case "process":
        validateBody({ documentId }, ["documentId"]);
        result = await processDocument(documentId);
        break;

      case "search": {
        validateBody({ query }, ["query"]);
        const results = await searchDocs(query, limit || 5);
        result = { results };
        break;
      }

      default:
        throw new ValidationError("Acción no válida. Usa 'process' o 'search'");
    }

    await logRun({
      source: "vault-process",
      step: action,
      status: "success",
      durationMs: Date.now() - startedAt,
      metadata: action === "process" ? { documentId, chunksCreated: result?.chunksCreated } : {},
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    await logRun({
      source: "vault-process",
      step: action || "unknown",
      status: "error",
      durationMs: Date.now() - startedAt,
      error: e.message,
    });
    const status = e instanceof ValidationError ? 400 : 500;
    return new Response(JSON.stringify({ error: e.message, type: e.name }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
