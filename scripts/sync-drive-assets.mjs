// scripts/sync-drive-assets.mjs
// Sincronización e ingesta automatizada de assets visuales desde Google Drive hacia MejoraSM.
//
// Uso:
//   node scripts/sync-drive-assets.mjs                (sincronización normal)
//   node scripts/sync-drive-assets.mjs --dry-run      (simular sin descargar ni guardar)
//   node scripts/sync-drive-assets.mjs --force        (reprocesar archivos ya registrados)
//   node scripts/sync-drive-assets.mjs --mock         (modo prueba / simulación de archivo)
//
// Variables de entorno:
//   GOOGLE_DRIVE_ASSETS_FOLDER_ID  (default: "1VAIMCt3nuGg57IUg7hVjgKUoDS7yYMPy")
//   GOOGLE_DRIVE_API_KEY           (opcional, clave pública para Drive v3 API)
//   SUPABASE_URL                   (o VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY      (o VITE_SUPABASE_PUBLISHABLE_KEY)

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

try {
  process.loadEnvFile(path.join(REPO_ROOT, ".env"));
} catch {
  // .env no presente o no legible
}

const FOLDER_ID =
  process.env.GOOGLE_DRIVE_ASSETS_FOLDER_ID || "1VAIMCt3nuGg57IUg7hVjgKUoDS7yYMPy";
const GOOGLE_API_KEY =
  process.env.GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_API_KEY || "";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://hsglmdarztrshihmzfph.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

const MANIFEST_PATH = path.join(REPO_ROOT, "content", "log", "drive-sync-manifest.json");
const INBOX_ROOT = path.join(REPO_ROOT, "content", "inbox");

const VALID_DIMENSIONS = new Set([
  "personal",
  "organizacional",
  "comercial",
  "empresarial",
  "profesionalizacion",
  "sociales",
]);

const IMG_EXT_REGEX = /\.(jpe?g|png|webp)$/i;

const isDryRun = process.argv.includes("--dry-run");
const isForce = process.argv.includes("--force");
const isMock = process.argv.includes("--mock");

// Cargar o inicializar el manifiesto de sincronización
async function loadManifest() {
  try {
    const data = await fs.readFile(MANIFEST_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return {
      folderId: FOLDER_ID,
      lastSync: null,
      processedFiles: {},
    };
  }
}

// Guardar manifiesto
async function saveManifest(manifest) {
  if (isDryRun) return;
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  manifest.lastSync = new Date().toISOString();
  manifest.folderId = FOLDER_ID;
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

// Clasificar imagen mediante Edge Function classify-photo
async function classifyPhotoWithAI(buffer, mimeType) {
  if (!SUPABASE_KEY) {
    return {
      dimension: "empresarial",
      reason: "Clasificación por defecto (sin clave de Supabase en entorno)",
      situation: "Taller/Equipo",
      operationalTitle: "Caso Operativo de Trinchera",
      trenchPain: "Fricción en la ejecución diaria y desalineación entre áreas.",
    };
  }

  try {
    const base64 = buffer.toString("base64");
    const res = await fetch(`${SUPABASE_URL}/functions/v1/classify-photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        action: "suggest",
        imageBase64: base64,
        mimeType: mimeType || "image/jpeg",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.dimension && VALID_DIMENSIONS.has(data.dimension)) {
        return {
          dimension: data.dimension,
          reason: data.reason || "Clasificado exitosamente por IA",
          situation: data.situation || "Taller/Equipo",
          operationalTitle: data.operationalTitle || `Caso Operativo en ${data.dimension.toUpperCase()}`,
          trenchPain: data.trenchPain || (data.reason || "Fricción operativa en procesos y alineación de equipos."),
        };
      }
    }
    console.warn(`[sync-drive] classify-photo respondió status ${res.status}, usando fallback.`);
  } catch (err) {
    console.warn(`[sync-drive] Error invocando classify-photo: ${err.message}`);
  }

  return {
    dimension: "empresarial",
    reason: "Fallback a Empresarial (modelo de negocio/operaciones)",
    situation: "Taller/Equipo",
    operationalTitle: "Caso Operativo en EMPRESARIAL",
    trenchPain: "Fricción operativa en procesos y alineación de equipos.",
  };
}

// Normalizar nombres de archivo para el filesystem
function sanitizeFilename(name) {
  const extMatch = name.match(/\.[a-z0-9]+$/i);
  const ext = (extMatch ? extMatch[0] : ".jpg").toLowerCase();
  const base = name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 35) || "drive-asset";
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${stamp}-${rnd}-${base}${ext}`;
}

// Listar archivos desde Google Drive
async function listDriveFiles() {
  if (isMock) {
    console.log("[sync-drive] Modo MOCK activado. Generando item simulado de prueba.");
    return [
      {
        id: `mock-${Date.now()}`,
        name: "caso-taller-mandos-medios.png",
        mimeType: "image/png",
        size: 1024,
        isMock: true,
      },
    ];
  }

  if (!GOOGLE_API_KEY) {
    console.log(`[sync-drive] No se configuró GOOGLE_DRIVE_API_KEY.`);
    console.log(`[sync-drive] Carpeta objetivo: ${FOLDER_ID}`);
    console.log(`[sync-drive] Para conectar con Drive API v3, definí GOOGLE_DRIVE_API_KEY en .env.`);
    return [];
  }

  const query = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime)&key=${GOOGLE_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const allFiles = data.files || [];
  return allFiles.filter(
    (f) =>
      IMG_EXT_REGEX.test(f.name) ||
      (f.mimeType && f.mimeType.startsWith("image/"))
  );
}

// Descargar archivo desde Google Drive
async function downloadDriveFile(file) {
  if (file.isMock) {
    // Generar un PNG mínimo transparente de 1x1 píxel para pruebas
    return Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
  }

  let downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  if (GOOGLE_API_KEY) {
    downloadUrl += `&key=${GOOGLE_API_KEY}`;
  } else {
    downloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
  }

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Error al descargar archivo ${file.name} (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Función principal
async function main() {
  console.log(`=== Ingesta de Assets desde Google Drive (MejoraSM) ===`);
  console.log(`Carpeta ID: ${FOLDER_ID}`);
  console.log(`Modo: ${isDryRun ? "DRY RUN (Solo lectura)" : isForce ? "FORCE (Reprocesar)" : "NORMAL"}`);

  const manifest = await loadManifest();
  const files = await listDriveFiles();

  console.log(`Archivos encontrados en Google Drive: ${files.length}`);

  const toProcess = files.filter(
    (f) => isForce || !manifest.processedFiles[f.id]
  );

  console.log(`Archivos nuevos pendientes de procesar: ${toProcess.length}`);

  if (toProcess.length === 0) {
    console.log("✓ No hay archivos nuevos para sincronizar.");
    return;
  }

  let syncedCount = 0;

  for (const file of toProcess) {
    console.log(`\nProcesando: ${file.name} (ID: ${file.id})...`);

    if (isDryRun) {
      console.log(`  [DRY RUN] Se descargaría y clasificaría con IA.`);
      continue;
    }

    try {
      const buffer = await downloadDriveFile(file);
      console.log(`  ✓ Descargado (${(buffer.length / 1024).toFixed(1)} KB).`);

      console.log(`  Mirando imagen con classify-photo (IA)...`);
      const { dimension, reason, situation, operationalTitle, trenchPain } = await classifyPhotoWithAI(buffer, file.mimeType);
      console.log(`  ✓ Dimensión sugerida: ${dimension.toUpperCase()} [${situation}] — "${operationalTitle}"`);
      console.log(`  ✓ Dolor de trinchera: "${trenchPain}"`);

      const filename = sanitizeFilename(file.name);
      const targetDir = path.join(INBOX_ROOT, dimension);
      await fs.mkdir(targetDir, { recursive: true });

      const targetPath = path.join(targetDir, filename);
      await fs.writeFile(targetPath, buffer);
      console.log(`  ✓ Guardado en content/inbox/${dimension}/${filename}`);

      // Companion metadata JSON
      const meta = {
        filename,
        originalName: file.name,
        dimension,
        situation,
        operationalTitle,
        trenchPain,
        reason,
        uploadedAt: new Date().toISOString(),
        source: "google_drive",
      };
      await fs.writeFile(
        path.join(targetDir, `${filename}.json`),
        JSON.stringify(meta, null, 2),
        "utf8"
      );

      // Registrar en manifiesto
      manifest.processedFiles[file.id] = {
        id: file.id,
        name: file.name,
        size: buffer.length,
        mimeType: file.mimeType || "image/jpeg",
        dimension,
        situation,
        operationalTitle,
        trenchPain,
        classifyReason: reason,
        savedPath: `content/inbox/${dimension}/${filename}`,
        processedAt: new Date().toISOString(),
      };

      syncedCount++;
    } catch (err) {
      console.error(`  ❌ Error procesando ${file.name}: ${err.message}`);
    }
  }

  await saveManifest(manifest);

  console.log(`\n=== Sincronización finalizada ===`);
  console.log(`Total archivos procesados e incorporados al inbox: ${syncedCount}`);
}

main().catch((err) => {
  console.error("❌ Error general en sincronización:", err);
  process.exit(1);
});
