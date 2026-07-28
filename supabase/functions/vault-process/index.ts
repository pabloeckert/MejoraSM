// supabase/functions/vault-process/index.ts
// Procesa documentos: extrae texto, crea chunks, genera embeddings
// Uso: POST /vault-process { documentId } | { action: "search", query, limit }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";

const ALLOWED_ORIGINS = [
  "https://util.mejoraok.com",
  "https://mejorasm.vercel.app",
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
// EMBEDDINGS (llamada directa a HF)
// ═══════════════════════════════════════

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const hfKey = Deno.env.get("HF_API_KEY");
  if (!hfKey) throw new Error("HF_API_KEY no configurada");

  const res = await withRetry(async () => {
    const r = await fetch(
      "https://api-inference.huggingface.com/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
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

async function processDocument(documentId: string) {
  validateUUID(documentId, "documentId");

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
    // Descargar del storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("vault")
      .download(doc.file_path);

    if (downloadError) throw new Error(`Error descargando archivo: ${downloadError.message}`);
    if (!fileData) throw new Error(`No se pudo descargar el archivo: ${doc.file_path}`);

    // Extraer texto según tipo
    try {
      if (doc.file_type === "text/plain" || doc.file_path.endsWith(".txt") || doc.file_path.endsWith(".md")) {
        content = await fileData.text();
      } else {
        // Para PDF/DOC: intentar extraer texto (limitado sin librería especializada)
        content = await fileData.text();
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

  // 3. Chunking
  const chunks = chunkText(content);
  if (chunks.length === 0) throw new Error("El documento no generó chunks de texto");

  // 4. Generar embeddings (opcional — si HF falla, guardar sin vectores)
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

  try {
    const { action, documentId, query, limit } = await req.json();

    let result;

    switch (action) {
      case "process":
        validateBody({ documentId }, ["documentId"]);
        result = await processDocument(documentId);
        break;

      case "search":
        validateBody({ query }, ["query"]);
        const results = await searchDocs(query, limit || 5);
        result = { results };
        break;

      default:
        throw new ValidationError("Acción no válida. Usa 'process' o 'search'");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const status = e instanceof ValidationError ? 400 : 500;
    return new Response(JSON.stringify({ error: e.message, type: e.name }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
