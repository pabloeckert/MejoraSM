// supabase/functions/vault-process/index.ts
// Procesa documentos: extrae texto, crea chunks, genera embeddings
// Uso: POST /vault-process { documentId }
// Trigger: después de upload a storage bucket 'vault'

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

      // Overlap: mantener las últimas oriciones
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

  const res = await fetch(
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HF Embeddings error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("HF: respuesta no es array");
  return data;
}

// ═══════════════════════════════════════
// PROCESAMIENTO PRINCIPAL
// ═══════════════════════════════════════

async function processDocument(documentId: string) {
  // 1. Obtener documento
  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (!doc) throw new Error("Documento no encontrado");

  // 2. Obtener contenido (si ya está procesado) o descargar del storage
  let content = doc.content;

  if (!content) {
    // Descargar del storage
    const { data: fileData } = await supabase.storage
      .from("vault")
      .download(doc.file_path);

    if (!fileData) throw new Error("No se pudo descargar el archivo");

    // Extraer texto según tipo
    if (doc.file_type === "text/plain" || doc.file_path.endsWith(".txt")) {
      content = await fileData.text();
    } else if (doc.file_path.endsWith(".md")) {
      content = await fileData.text();
    } else {
      // Para PDF/DOC: usar texto del archivo (limitado)
      // TODO: integrar pdf-parse o mammoth
      content = await fileData.text();
    }

    // Guardar contenido extraído
    await supabase
      .from("documents")
      .update({
        content,
        word_count: content.split(/\s+/).length,
      })
      .eq("id", documentId);
  }

  // 3. Chunking
  const chunks = chunkText(content);

  // 4. Generar embeddings
  const embeddings = await generateEmbeddings(chunks);

  // 5. Guardar chunks con embeddings
  const chunkRecords = chunks.map((chunk, i) => ({
    document_id: documentId,
    chunk_index: i,
    content: chunk,
    token_count: Math.ceil(chunk.length / 4),
    embedding: embeddings[i],
  }));

  const { error } = await supabase.from("doc_chunks").insert(chunkRecords);
  if (error) throw new Error(`Error guardando chunks: ${error.message}`);

  return {
    documentId,
    chunksCreated: chunks.length,
    totalTokens: chunkRecords.reduce((sum, c) => sum + (c.token_count || 0), 0),
  };
}

// ═══════════════════════════════════════
// BÚSQUEDA SEMÁNTICA (RAG)
// ═══════════════════════════════════════

async function searchDocs(query: string, limit = 5): Promise<string[]> {
  // 1. Embedding de la query
  const [queryEmbedding] = await generateEmbeddings([query]);

  // 2. Búsqueda vectorial
  const { data: chunks } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: limit,
  });

  if (!chunks?.length) return [];

  return chunks.map((c: any) => c.content);
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
    const { action, documentId, query, limit } = await req.json();

    let result;

    switch (action) {
      case "process":
        if (!documentId) throw new Error("Falta 'documentId'");
        result = await processDocument(documentId);
        break;

      case "search":
        if (!query) throw new Error("Falta 'query'");
        const results = await searchDocs(query, limit || 5);
        result = { results };
        break;

      default:
        throw new Error("Acción no válida. Usa 'process' o 'search'");
    }

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
