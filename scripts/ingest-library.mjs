// scripts/ingest-library.mjs
// Módulo de Ingesta de Literatura de Gestión y Libros a la Bóveda B2B.
// Soporta formatos: .pdf, .docx, .md, .txt
//
// Funcionalidades:
// 1. Escaneo recursivo / directo de 'content/biblioteca/'
// 2. Extracción limpia de texto por formato:
//    - .pdf: pdf-parse (PDFParse engine)
//    - .docx: mammoth (extractRawText)
//    - .md / .txt: lectura utf-8 limpia
// 3. Chunking semántico: 800 - 1200 palabras con solapamiento (~100-150 palabras)
// 4. Extracción de metadatos: { autor, titulo, categoria: "biblioteca_gestion", tags }
// 5. Preparación de payloads para inserción en 'documents' (y 'doc_chunks') de Supabase
// 6. Modo --dry-run (por defecto) y modo --apply para ejecución real.
//
// Uso:
//   node scripts/ingest-library.mjs             (dry-run informativo por defecto)
//   node scripts/ingest-library.mjs --dry-run
//   node scripts/ingest-library.mjs --apply

import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const LIBRARY_DIR = path.join(REPO_ROOT, "content", "biblioteca");

// Configuración de Chunking Semántico B2B
const MIN_CHUNK_WORDS = 800;
const TARGET_CHUNK_WORDS = 1000;
const MAX_CHUNK_WORDS = 1200;
const OVERLAP_WORDS = 120;

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".md", ".txt"]);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function parseCliArgs() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const isDryRun = args.includes("--dry-run") || !isApply;
  const fileFilterArg = args.find((a) => a.startsWith("--file="));
  const fileFilter = fileFilterArg ? fileFilterArg.split("=")[1] : null;

  return { isApply, isDryRun, fileFilter };
}

/**
 * Limpia el texto crudo eliminando saltos de página redundantes,
 * encabezados de paginación y excesos de espacios.
 */
function cleanText(raw) {
  if (!raw) return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Eliminar marcadores comunes de paginación PDF (ej: "-- 1 of 42 --")
    .replace(/\n\s*--\s*\d+\s*of\s*\d+\s*--\s*\n/gi, "\n\n")
    // Eliminar números de página aislados
    .replace(/\n\s*\d+\s*\n/g, "\n\n")
    // Reducir espacios horizontales redundantes
    .replace(/[ \t]+/g, " ")
    // Normalizar múltiples saltos de línea (máximo 2 consecutivos)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extrae texto según la extensión del archivo
 */
async function extractRawText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".txt" || ext === ".md") {
    const raw = await readFile(filePath, "utf-8");
    return cleanText(raw);
  }

  if (ext === ".docx") {
    const buffer = await readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return cleanText(result.value);
  }

  if (ext === ".pdf") {
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    return cleanText(textResult.text || "");
  }

  throw new Error(`Extensión no soportada: ${ext}`);
}

/**
 * Extrae metadatos del contenido (frontmatter YAML o encabezados) o del nombre de archivo.
 */
function extractMetadata(filePath, content) {
  let autor = "Autor no especificado";
  let titulo = path.basename(filePath, path.extname(filePath));
  let tags = ["gestion", "estrategia", "operaciones"];

  let cleanBody = content;
  // 1. Detección de Frontmatter YAML en archivos .md / .txt
  const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    cleanBody = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "").trim();
    const yamlBody = yamlMatch[1];
    const autorM = yamlBody.match(/^autor:\s*["']?(.*?)["']?$/m) || yamlBody.match(/^author:\s*["']?(.*?)["']?$/m);
    const tituloM = yamlBody.match(/^t[ií]tulo:\s*["']?(.*?)["']?$/m) || yamlBody.match(/^title:\s*["']?(.*?)["']?$/m);
    const tagsM = yamlBody.match(/^tags:\s*\[(.*?)\]/m) || yamlBody.match(/^tags:\s*(.*)$/m);

    if (autorM) autor = autorM[1].trim();
    if (tituloM) titulo = tituloM[1].trim();
    if (tagsM) {
      tags = tagsM[1]
        .split(",")
        .map((t) => t.replace(/["'\[\]]/g, "").trim())
        .filter(Boolean);
    }
  } else {
    // 2. Detección por convención de nombre de archivo: "Autor - Titulo.ext" o "Autor_-_Titulo.ext"
    const baseName = path.basename(filePath, path.extname(filePath));
    const normalizedName = baseName.replace(/_/g, " ").replace(/\s+/g, " ");

    const hyphenSplit = normalizedName.split(" - ");
    if (hyphenSplit.length >= 2) {
      autor = hyphenSplit[0].trim();
      titulo = hyphenSplit.slice(1).join(" - ").trim();
    } else {
      titulo = normalizedName;
    }

    // Detección de encabezado de título en las primeras líneas
    const firstLines = content.slice(0, 1000).split("\n");
    for (const line of firstLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const h1Match = trimmed.match(/^#\s+(.+)$/);
      if (h1Match && !yamlMatch) {
        titulo = h1Match[1].trim();
      }
      const authorMatch = trimmed.match(/\b(?:autor|author):\s*(.+)$/i);
      if (authorMatch && autor === "Autor no especificado") {
        autor = authorMatch[1].replace(/[*_]/g, "").trim();
      }
    }
  }

  // Tags automáticos inferidos por temática
  const lowerText = content.slice(0, 5000).toLowerCase();
  const inferredTags = new Set(tags);
  if (lowerText.includes("mejora continua") || lowerText.includes("kaizen")) inferredTags.add("mejora_continua");
  if (lowerText.includes("pyme") || lowerText.includes("empresa")) inferredTags.add("pymes");
  if (lowerText.includes("liderazgo") || lowerText.includes("delegar")) inferredTags.add("liderazgo");
  if (lowerText.includes("procesos") || lowerText.includes("cuello de botella")) inferredTags.add("procesos");
  if (lowerText.includes("ventas") || lowerText.includes("comercial")) inferredTags.add("comercial");

  return {
    autor,
    titulo,
    categoria: "biblioteca_gestion",
    tags: Array.from(inferredTags),
    cleanBody,
  };
}

/**
 * Divide el texto en fragmentos semánticos respetando párrafos y oraciones.
 * Rango objetivo: 800 - 1200 palabras con solapamiento contextual.
 */
function createSemanticChunks(text) {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const totalWords = text.split(/\s+/).filter(Boolean).length;

  // Si el texto completo es menor al máximo por chunk, devolver un solo chunk
  if (totalWords <= MAX_CHUNK_WORDS) {
    return [
      {
        chunkIndex: 0,
        wordCount: totalWords,
        content: text,
      },
    ];
  }

  const chunks = [];
  let currentWords = [];
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const pWords = paragraphs[i].split(/\s+/).filter(Boolean);

    // Si un solo párrafo excede MAX_CHUNK_WORDS, subdividirlo por oraciones
    if (pWords.length > MAX_CHUNK_WORDS) {
      const sentences = paragraphs[i].match(/[^.!?]+[.!?]+|\S+/g) || [paragraphs[i]];
      for (const sent of sentences) {
        const sWords = sent.trim().split(/\s+/).filter(Boolean);
        if (currentWords.length + sWords.length > TARGET_CHUNK_WORDS && currentWords.length >= MIN_CHUNK_WORDS) {
          const chunkText = currentWords.join(" ");
          chunks.push({
            chunkIndex: chunkIndex++,
            wordCount: currentWords.length,
            content: chunkText,
          });

          // Extraer palabras de solapamiento
          const overlap = currentWords.slice(-OVERLAP_WORDS);
          currentWords = [...overlap, ...sWords];
        } else {
          currentWords.push(...sWords);
        }
      }
      continue;
    }

    if (currentWords.length + pWords.length > TARGET_CHUNK_WORDS && currentWords.length >= MIN_CHUNK_WORDS) {
      const chunkText = currentWords.join(" ");
      chunks.push({
        chunkIndex: chunkIndex++,
        wordCount: currentWords.length,
        content: chunkText,
      });

      // Solapamiento semántico
      const overlap = currentWords.slice(-OVERLAP_WORDS);
      currentWords = [...overlap, ...pWords];
    } else {
      currentWords.push(...pWords);
    }
  }

  // Último chunk restante
  if (currentWords.length > 0) {
    chunks.push({
      chunkIndex: chunkIndex++,
      wordCount: currentWords.length,
      content: currentWords.join(" "),
    });
  }

  return chunks;
}

/**
 * Prepara la estructura de datos lista para insertar en 'documents'
 */
function prepareDocumentInsert(filePath, content, metadata, chunks) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".md": "text/markdown",
    ".txt": "text/plain",
  };

  const totalWords = content.split(/\s+/).filter(Boolean).length;
  const relativePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");

  return {
    title: metadata.titulo,
    file_path: relativePath,
    file_type: mimeTypes[ext] || "text/plain",
    content: content,
    word_count: totalWords,
    category: metadata.categoria,
    processing_status: "ready",
    metadata: {
      autor: metadata.autor,
      titulo: metadata.titulo,
      categoria: metadata.categoria,
      tags: metadata.tags,
      chunks_count: chunks.length,
      total_words: totalWords,
    },
    chunks: chunks.map((c) => ({
      chunk_index: c.chunkIndex,
      word_count: c.wordCount,
      content: c.content,
    })),
  };
}

/**
 * Ejecuta inserción real en la tabla documents de Supabase
 */
async function insertIntoBoveda(docPayload) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error(
      "Para ejecutar --apply se requieren las variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const endpoint = `${SUPABASE_URL}/rest/v1/documents`;
  const insertBody = {
    title: docPayload.title,
    file_path: docPayload.file_path,
    file_type: docPayload.file_type,
    content: docPayload.content,
    word_count: docPayload.word_count,
    category: docPayload.category,
    processing_status: docPayload.processing_status,
    metadata: docPayload.metadata,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(insertBody),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error en inserción REST Supabase (${res.status}): ${errorText}`);
  }

  const inserted = await res.json();
  const docId = inserted[0]?.id;

  // Insertar chunks si la tabla doc_chunks está disponible
  if (docId && docPayload.chunks?.length > 0) {
    const chunksEndpoint = `${SUPABASE_URL}/rest/v1/doc_chunks`;
    const chunkRows = docPayload.chunks.map((c) => ({
      document_id: docId,
      chunk_index: c.chunk_index,
      content: c.content,
      token_count: Math.round(c.word_count * 1.3),
    }));

    const chunkRes = await fetch(chunksEndpoint, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunkRows),
    });

    if (!chunkRes.ok) {
      console.warn(`[ingest-library] Advertencia: no se pudieron insertar chunks en doc_chunks: ${await chunkRes.text()}`);
    }
  }

  return docId;
}

// ═══════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════

async function main() {
  const { isApply, isDryRun, fileFilter } = parseCliArgs();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("📚 MEJORASM · INGESTA DE LITERATURA DE GESTIÓN (BÓVEDA B2B)");
  console.log(`Modo: ${isApply ? "🚀 APLICAR INSERCIONES (--apply)" : "🔍 VERIFICACIÓN PREVIA (--dry-run)"}`);
  console.log(`Directorio biblioteca: ${LIBRARY_DIR}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (!existsSync(LIBRARY_DIR)) {
    console.error(`❌ El directorio ${LIBRARY_DIR} no existe.`);
    process.exit(1);
  }

  const dirEntries = await readdir(LIBRARY_DIR, { withFileTypes: true });
  const files = [];

  for (const entry of dirEntries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        if (!fileFilter || entry.name.includes(fileFilter)) {
          files.push(path.join(LIBRARY_DIR, entry.name));
        }
      }
    }
  }

  if (files.length === 0) {
    console.log("ℹ️ No se encontraron archivos de literatura en 'content/biblioteca/'.");
    console.log("Formatos soportados: .pdf, .docx, .md, .txt\n");
    return;
  }

  console.log(`Encontrados ${files.length} archivo(s) para procesamiento:\n`);

  let totalDocsProcessed = 0;
  let grandTotalWords = 0;
  let grandTotalChunks = 0;

  for (const file of files) {
    const fileName = path.basename(file);
    const fileStats = await stat(file);
    const fileSizeKb = (fileStats.size / 1024).toFixed(1);

    console.log(`---------------------------------------------------------------`);
    console.log(`📄 Archivo: ${fileName} (${fileSizeKb} KB)`);

    try {
      const rawContent = await extractRawText(file);
      const totalWords = rawContent.split(/\s+/).filter(Boolean).length;

      if (totalWords === 0) {
        console.warn(`⚠️ Advertencia: No se pudo extraer texto o el archivo está vacío.`);
        continue;
      }

      const metadata = extractMetadata(file, rawContent);
      const effectiveContent = metadata.cleanBody || rawContent;
      const chunks = createSemanticChunks(effectiveContent);
      const payload = prepareDocumentInsert(file, effectiveContent, metadata, chunks);

      totalDocsProcessed++;
      grandTotalWords += totalWords;
      grandTotalChunks += chunks.length;

      console.log(`   🏷️  Título: "${metadata.titulo}"`);
      console.log(`   ✍️  Autor: ${metadata.autor}`);
      console.log(`   📂 Categoría: ${metadata.categoria}`);
      console.log(`   🏷️  Tags: [${metadata.tags.join(", ")}]`);
      console.log(`   📊 Palabras totales: ${totalWords.toLocaleString()}`);
      console.log(`   🧩 Chunks generados: ${chunks.length} (Rango semántico: 800-1200 palabras)`);

      chunks.forEach((ch) => {
        console.log(`      • Chunk ${ch.chunkIndex + 1}: ${ch.wordCount} palabras | Preview: "${ch.content.slice(0, 70)}…"`);
      });

      if (isApply) {
        console.log(`   ⏳ Insertando en tabla 'documents' de la Bóveda...`);
        const docId = await insertIntoBoveda(payload);
        console.log(`   ✅ Insertado exitosamente con ID: ${docId}`);
      }
    } catch (err) {
      console.error(`   ❌ Error procesando ${fileName}:`, err.message);
    }
  }

  console.log(`\n===============================================================`);
  console.log(`📊 RESUMEN DE PROCESAMIENTO:`);
  console.log(`   • Documentos procesados: ${totalDocsProcessed}`);
  console.log(`   • Palabras extraídas: ${grandTotalWords.toLocaleString()}`);
  console.log(`   • Chunks semánticos: ${grandTotalChunks}`);
  if (isDryRun) {
    console.log(`\n💡 Verificación completada en modo DRY-RUN. Ninguna fila fue modificada.`);
    console.log(`   Para realizar la inserción real en la base de datos de producción:`);
    console.log(`   node scripts/ingest-library.mjs --apply`);
  }
  console.log(`===============================================================\n`);
}

main().catch((err) => {
  console.error("Fallo crítico en ingest-library:", err);
  process.exit(1);
});
