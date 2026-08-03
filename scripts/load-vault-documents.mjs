// scripts/load-vault-documents.mjs
// Carga masiva de los 18 documentos reales de identidad de marca (repo
// externo MejoraIdentidad, ya en disco) a la Bóveda del EDA. No genera
// contenido nuevo — sigue el mismo camino que un upload manual desde
// /boveda: storage (bucket "vault") + fila en `documents` +
// supabase/functions/vault-process (chunks + embeddings).
//
// A diferencia de un upload manual, el texto se extrae acá con mammoth
// (.docx real) antes de mandarlo. vault-process solo sabe leer texto
// plano/.md — para cualquier otro tipo hace `fileData.text()` a secas,
// que sobre un .docx real devuelve bytes binarios ilegibles, no texto.
// Al mandar `content` ya resuelto en el insert, vault-process detecta que
// el documento ya tiene contenido y se salta la descarga+extracción rota,
// yendo directo a chunking + embeddings — mismo resultado final, mismo
// código de "process" que usa un documento subido a mano.
//
// Lista de 18 confirmada con Pablo (2026-08-03): el conteo original que
// se pidió ("9 en 01_ESTRUCTURAL") no coincidía con el disco real (esa
// carpeta tiene 6) — los otros 3 ("Criterio Medular", "Identidad Visual",
// "Valores") viven un nivel arriba, en la raíz de 01_DOCUMENTOS/, y
// "Perfiles Comerciales" vive en 02_PARTICULAR/ (no dentro de
// buyer_personas/). Quedan afuera a propósito: landing_mejoraok_contenido
// (no es identidad de marca, es un proyecto puntual) y
// 00_MANUAL_DE_MARCA/Manual_de_Marca_Mejora_Continua.pdf (versión
// compilada de estos mismos documentos — subirlo duplicaría contenido).
//
// Todos los 18 existen como .docx en disco, así que no hace falta fallback
// a .pdf (no se agregó parser de PDF).
//
// Uso:
//   node scripts/load-vault-documents.mjs             (dry-run por default)
//   node scripts/load-vault-documents.mjs --dry-run
//   node scripts/load-vault-documents.mjs --apply
// Env (solo hace falta para --apply, o para detectar duplicados en dry-run):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import mammoth from "mammoth";

const SOURCE_ROOT =
  "C:\\temp\\MejoraIdentidad\\MejoraIdentidad-main\\MejoraContinua-Marca\\01_DOCUMENTOS";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const DOCUMENTS = [
  { rel: "00_CRITERIO_MEDULAR.docx", title: "Criterio Medular" },
  { rel: "00_IDENTIDAD_VISUAL.docx", title: "Identidad Visual" },
  { rel: "00_VALORES.docx", title: "Valores" },
  { rel: "01_ESTRUCTURAL/arquitectura_de_contenido.docx", title: "Arquitectura de Contenido" },
  { rel: "01_ESTRUCTURAL/manifiesto.docx", title: "Manifiesto" },
  { rel: "01_ESTRUCTURAL/modalidades_de_acompanamiento.docx", title: "Modalidades de Acompañamiento" },
  { rel: "01_ESTRUCTURAL/segmentacion_y_publico.docx", title: "Segmentación y Público" },
  { rel: "01_ESTRUCTURAL/servicios_y_areas_de_impacto.docx", title: "Servicios y Áreas de Impacto" },
  { rel: "01_ESTRUCTURAL/tono_y_voz.docx", title: "Tono y Voz" },
  { rel: "02_PARTICULAR/perfiles_comerciales.docx", title: "Perfiles Comerciales" },
  { rel: "02_PARTICULAR/buyer_personas/01_emprendedor_saturado.docx", title: "Buyer Persona: El Emprendedor Saturado" },
  { rel: "02_PARTICULAR/buyer_personas/02_lider_que_necesita_validacion.docx", title: "Buyer Persona: La Líder que Necesita Validación" },
  { rel: "02_PARTICULAR/buyer_personas/03_profesional_independiente.docx", title: "Buyer Persona: El Profesional Independiente" },
  { rel: "02_PARTICULAR/buyer_personas/04_equipo_desalineado.docx", title: "Buyer Persona: El Equipo Desalineado" },
  { rel: "02_PARTICULAR/buyer_personas/05_empresario_mal_asesorado.docx", title: "Buyer Persona: El Empresario Mal Asesorado" },
  { rel: "02_PARTICULAR/buyer_personas/06_nueva_generacion.docx", title: "Buyer Persona: La Nueva Generación" },
  { rel: "02_PARTICULAR/buyer_personas/07_vendedor_sin_resultados.docx", title: "Buyer Persona: El Vendedor sin Resultados" },
  { rel: "02_PARTICULAR/buyer_personas/08_el_que_necesita_orden_para_crecer.docx", title: "Buyer Persona: El que Necesita Orden para Crecer" },
];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function restHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function extractText(absPath) {
  const buffer = await readFile(absPath);
  const { value, messages } = await mammoth.extractRawText({ buffer });
  return { text: value.trim(), warnings: messages.filter((m) => m.type === "warning").length };
}

async function findExistingByTitle(title) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?title=eq.${encodeURIComponent(title)}&select=id`,
    { headers: restHeaders() }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

async function uploadToStorage(fileName, buffer) {
  const filePath = `${Date.now()}-${fileName}`;
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/vault/${encodeURIComponent(filePath)}`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": DOCX_MIME,
      },
      body: buffer,
    }
  );
  if (!res.ok) throw new Error(`Error subiendo a storage: ${res.status} ${await res.text()}`);
  return filePath;
}

async function insertDocument({ title, filePath, content, wordCount }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: "POST",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ title, file_path: filePath, file_type: DOCX_MIME, content, word_count: wordCount }),
  });
  if (!res.ok) throw new Error(`Error insertando documento: ${res.status} ${await res.text()}`);
  const [doc] = await res.json();
  return doc;
}

async function triggerVaultProcess(documentId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/vault-process`, {
    method: "POST",
    headers: restHeaders(),
    body: JSON.stringify({ action: "process", documentId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`vault-process falló (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  const apply = process.argv.includes("--apply");

  if (apply && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno — necesarios para --apply.");
    process.exit(1);
  }

  console.log(apply ? "Modo: --apply (sube de verdad)\n" : "Modo: --dry-run (no toca nada)\n");
  console.log(`Documentos a procesar: ${DOCUMENTS.length}\n`);

  const results = [];

  for (const doc of DOCUMENTS) {
    const absPath = path.join(SOURCE_ROOT, doc.rel);
    const row = { title: doc.title, rel: doc.rel };

    if (!existsSync(absPath)) {
      row.status = "FALTA EL ARCHIVO";
      results.push(row);
      continue;
    }

    const existing = await findExistingByTitle(doc.title);
    if (existing) {
      row.status = "YA EXISTE EN LA BÓVEDA";
      row.documentId = existing.id;
      results.push(row);
      continue;
    }

    try {
      const { text, warnings } = await extractText(absPath);
      row.warnings = warnings;
      if (!text) {
        row.status = "SIN TEXTO EXTRAÍDO";
        results.push(row);
        continue;
      }
      row.wordCount = text.split(/\s+/).filter(Boolean).length;
      row.status = "OK";
      row.textPreview = text.slice(0, 90).replace(/\s+/g, " ");

      if (apply) {
        const buffer = await readFile(absPath);
        const filePath = await uploadToStorage(path.basename(doc.rel), buffer);
        const inserted = await insertDocument({
          title: doc.title,
          filePath,
          content: text,
          wordCount: row.wordCount,
        });
        const processed = await triggerVaultProcess(inserted.id);
        row.documentId = inserted.id;
        row.chunks = processed.chunksCreated;
        row.embeddings = processed.withEmbeddings;
        row.status = "SUBIDO";
      }
    } catch (e) {
      row.status = `ERROR: ${e.message}`;
    }

    results.push(row);
  }

  console.log("=== Resultado ===");
  for (const r of results) {
    const parts = [`[${r.status}]`, r.title, `(${r.rel})`];
    if (r.wordCount) parts.push(`— ${r.wordCount} palabras`);
    if (r.warnings) parts.push(`, ${r.warnings} warning(s) de mammoth`);
    console.log(parts.join(" "));
    if (r.textPreview) console.log(`    "${r.textPreview}..."`);
    if (r.documentId && apply) console.log(`    documentId=${r.documentId} chunks=${r.chunks} embeddings=${r.embeddings}`);
    else if (r.documentId) console.log(`    documentId existente=${r.documentId}`);
  }

  const problems = results.filter((r) => r.status.startsWith("ERROR") || r.status === "FALTA EL ARCHIVO" || r.status === "SIN TEXTO EXTRAÍDO");
  console.log("");
  if (problems.length > 0) {
    console.log(`${problems.length} documento(s) con problemas — revisar arriba.`);
    process.exitCode = 1;
  } else {
    console.log(`${apply ? "Subida" : "Detección"} completa: ${results.length}/${DOCUMENTS.length} documentos listos.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
