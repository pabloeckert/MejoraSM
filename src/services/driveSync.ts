// src/services/driveSync.ts
// Sincronización e ingesta automatizada de assets visuales desde Google Drive hacia MejoraSM desde UI (Cero CLI).

import { github } from "@/services/github";
import { suggestPhotoDimension, type PhotoClassification } from "@/services/ai";

export const GOOGLE_DRIVE_ASSETS_FOLDER_ID = "1VAIMCt3nuGg57IUg7hVjgKUoDS7yYMPy";
const STORAGE_KEY_API_KEY = "mejorasm_google_drive_api_key";
const MANIFEST_PATH = "content/log/drive-sync-manifest.json";

const IMG_EXT_REGEX = /\.(jpe?g|png|webp)$/i;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  isMock?: boolean;
}

export interface DriveSyncProgress {
  status: string;
  current: number;
  total: number;
}

export interface DriveSyncResult {
  scanned: number;
  synced: number;
  skipped: number;
  skippedByHash?: number;
  errors: string[];
  files: Array<{
    id: string;
    name: string;
    dimension: string;
    situation: string;
    operationalTitle: string;
    trenchPain: string;
    path: string;
    sha256?: string;
  }>;
}

export interface DriveSyncOptions {
  apiKey?: string;
  force?: boolean;
  useMockIfNoKey?: boolean;
  onProgress?: (progress: DriveSyncProgress) => void;
}

interface SyncManifest {
  folderId: string;
  lastSync: string | null;
  processedHashes?: Record<string, string>; // sha256 -> file_id
  processedFiles: Record<
    string,
    {
      id: string;
      name: string;
      size: number;
      mimeType: string;
      dimension: string;
      situation?: string;
      operationalTitle?: string;
      trenchPain?: string;
      classifyReason: string;
      savedPath: string;
      sha256?: string;
      processedAt: string;
    }
  >;
}

export function getStoredDriveApiKey(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem(STORAGE_KEY_API_KEY) ||
    (import.meta.env.VITE_GOOGLE_DRIVE_API_KEY as string) ||
    ""
  );
}

export function setStoredDriveApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (!key.trim()) {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
  }
}

function sanitizeFilename(name: string): string {
  const extMatch = name.match(/\.[a-z0-9]+$/i);
  const ext = (extMatch ? extMatch[0] : ".jpg").toLowerCase();
  const base =
    name
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 35) || "drive-asset";
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${stamp}-${rnd}-${base}${ext}`;
}

// Genera un mockup PNG de 1x1 píxel en DataURL con semilla para pruebas
function createTransparentMockDataUrl(seed?: string): string {
  const baseMock = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return seed ? `${baseMock}#mock-${encodeURIComponent(seed)}` : baseMock;
}

/**
 * Calcula el hash SHA-256 de forma agnóstica para navegador y Node.js (Web Cryptography API estándar).
 */
export async function computeSha256Hex(data: string | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === "string") {
    const encoder = new TextEncoder();
    buffer = encoder.encode(data).buffer;
  } else {
    buffer = data;
  }

  // 1. Web Cryptography API estándar (Navegadores y Node.js moderno)
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // 2. Fallback determinístico sin dependencias
  let hash = 0;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash << 5) - hash + bytes[i];
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, "0");
}

// Lista archivos desde Google Drive v3 API
async function listDriveFiles(apiKey: string, folderId: string): Promise<DriveFileItem[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime)&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive API (${res.status}): ${errorText.slice(0, 150)}`);
  }

  const data = (await res.json()) as { files?: DriveFileItem[] };
  const allFiles = data.files || [];
  return allFiles.filter(
    (f) => IMG_EXT_REGEX.test(f.name) || (f.mimeType && f.mimeType.startsWith("image/"))
  );
}

// Descarga archivo como Data URL
async function downloadDriveFileDataUrl(file: DriveFileItem, apiKey: string): Promise<string> {
  if (file.isMock) {
    return createTransparentMockDataUrl(file.id);
  }

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`;
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Error al descargar ${file.name} (${res.status})`);
  }

  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Error leyendo blob descargado"));
    reader.readAsDataURL(blob);
  });
}

// Mocks representativos para pruebas sin API Key
function getMockDriveFiles(): DriveFileItem[] {
  const stamp = Date.now();
  return [
    {
      id: `drive-mock-taller-${stamp}`,
      name: "taller-mandos-medios-produccion.jpg",
      mimeType: "image/jpeg",
      size: 45200,
      isMock: true,
    },
    {
      id: `drive-mock-consultoria-${stamp + 1}`,
      name: "consultoria-1a1-diagnostico-financiero.jpg",
      mimeType: "image/jpeg",
      size: 38100,
      isMock: true,
    },
    {
      id: `drive-mock-pizarra-${stamp + 2}`,
      name: "pizarra-mapa-procesos-logistica.png",
      mimeType: "image/png",
      size: 61400,
      isMock: true,
    },
  ];
}

export async function syncGoogleDriveAssets(options: DriveSyncOptions = {}): Promise<DriveSyncResult> {
  const apiKey = (options.apiKey || getStoredDriveApiKey()).trim();
  const force = !!options.force;
  const onProgress = options.onProgress || (() => {});

  onProgress({ status: "Leyendo manifiesto del repositorio…", current: 0, total: 0 });

  // 1. Cargar manifiesto existente
  let manifest: SyncManifest;
  try {
    const remote = await github.getJsonFile<SyncManifest>(MANIFEST_PATH);
    manifest = remote || {
      folderId: GOOGLE_DRIVE_ASSETS_FOLDER_ID,
      lastSync: null,
      processedFiles: {},
    };
  } catch {
    manifest = {
      folderId: GOOGLE_DRIVE_ASSETS_FOLDER_ID,
      lastSync: null,
      processedFiles: {},
    };
  }

  // 2. Obtener lista de archivos
  let files: DriveFileItem[] = [];
  if (apiKey) {
    onProgress({ status: "Consultando Google Drive v3 API…", current: 0, total: 0 });
    try {
      files = await listDriveFiles(apiKey, GOOGLE_DRIVE_ASSETS_FOLDER_ID);
    } catch (err) {
      if (options.useMockIfNoKey) {
        onProgress({
          status: "Google Drive API con error; cargando fotos modelo de trinchera…",
          current: 0,
          total: 3,
        });
        files = getMockDriveFiles();
      } else {
        throw err;
      }
    }
  } else {
    if (options.useMockIfNoKey) {
      onProgress({
        status: "Sin API key configurada; preparando fotos modelo de trinchera para prueba…",
        current: 0,
        total: 3,
      });
      files = getMockDriveFiles();
    } else {
      throw new Error(
        "Falta configurar la Google Drive API Key. Ingresala en la ventana de sincronización."
      );
    }
  }

  const toProcess = files.filter((f) => force || !manifest.processedFiles[f.id]);
  const result: DriveSyncResult = {
    scanned: files.length,
    synced: 0,
    skipped: files.length - toProcess.length,
    errors: [],
    files: [],
  };

  if (toProcess.length === 0) {
    onProgress({ status: "✓ No hay fotos nuevas pendientes en Google Drive.", current: 0, total: 0 });
    return result;
  }

  // 3. Procesar e ingerir cada foto nueva
  for (let i = 0; i < toProcess.length; i++) {
    const file = toProcess[i];
    onProgress({
      status: `Descargando [${i + 1}/${toProcess.length}]: ${file.name}…`,
      current: i + 1,
      total: toProcess.length,
    });

    try {
      const dataUrl = await downloadDriveFileDataUrl(file, apiKey);
      const sha256 = await computeSha256Hex(dataUrl);

      if (!manifest.processedHashes) {
        manifest.processedHashes = {};
      }

      // Deduplicación estricta por contenido (hashing SHA-256 defensivo - DDIA)
      if (manifest.processedHashes[sha256]) {
        const idPrevio = manifest.processedHashes[sha256];
        result.skipped++;
        result.skippedByHash = (result.skippedByHash || 0) + 1;
        onProgress({
          status: `Omitiendo duplicado idéntico por SHA-256 [${i + 1}/${toProcess.length}]: ${file.name} (ya existe como #${idPrevio.slice(0, 8)}…)`,
          current: i + 1,
          total: toProcess.length,
        });
        continue;
      }

      const base64 = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;

      onProgress({
        status: `Clasificando con IA de visión [${i + 1}/${toProcess.length}]: ${file.name}…`,
        current: i + 1,
        total: toProcess.length,
      });

      let classification: PhotoClassification;
      try {
        classification = await suggestPhotoDimension(base64, file.mimeType || "image/jpeg");
      } catch {
        // Fallback robusto según nombre o situación
        const isPizarra = /pizarra|mapa|flujo|esquema/i.test(file.name);
        const is1a1 = /1a1|diagnostico|lider|entrevista/i.test(file.name);
        const situation = isPizarra ? "Pizarra/Esquema" : is1a1 ? "Consultoría 1 a 1" : "Taller/Equipo";
        classification = {
          dimension: isPizarra ? "organizacional" : is1a1 ? "empresarial" : "personal",
          reason: "Clasificación automática inferida por contexto operativo",
          situation,
          operationalTitle: isPizarra
            ? "Mapeo de Flujo de Valor y Desperdicios"
            : is1a1
              ? "Diagnóstico de Rentabilidad y Margen"
              : "Desalineación de Objetivos en Mandos Medios",
          trenchPain:
            "El equipo opera apagando incendios cotidianos sin reglas claras de coordinación interáreas.",
        };
      }

      const filename = sanitizeFilename(file.name);
      const targetDim = classification.dimension;

      onProgress({
        status: `Guardando en content/inbox/${targetDim}/ [${i + 1}/${toProcess.length}]…`,
        current: i + 1,
        total: toProcess.length,
      });

      // Guardar imagen en el repo vía función repo
      await github.commitPhoto(targetDim, filename, dataUrl);

      // Guardar metadatos enriquecidos con trazabilidad SHA-256
      const meta = {
        filename,
        originalName: file.name,
        dimension: targetDim,
        situation: classification.situation,
        operationalTitle: classification.operationalTitle,
        trenchPain: classification.trenchPain,
        reason: classification.reason,
        sha256,
        uploadedAt: new Date().toISOString(),
        source: "google_drive",
      };

      await github.putJsonFile(
        `content/inbox/${targetDim}/${filename}.json`,
        meta,
        `metadata drive asset: ${filename}`
      );

      // Registrar en manifiesto con ID y Hash SHA-256
      manifest.processedHashes[sha256] = file.id;
      manifest.processedFiles[file.id] = {
        id: file.id,
        name: file.name,
        size: file.size || 1024,
        mimeType: file.mimeType || "image/jpeg",
        dimension: targetDim,
        situation: classification.situation,
        operationalTitle: classification.operationalTitle,
        trenchPain: classification.trenchPain,
        classifyReason: classification.reason,
        savedPath: `content/inbox/${targetDim}/${filename}`,
        sha256,
        processedAt: new Date().toISOString(),
      };

      result.synced++;
      result.files.push({
        id: file.id,
        name: file.name,
        dimension: targetDim,
        situation: classification.situation,
        operationalTitle: classification.operationalTitle,
        trenchPain: classification.trenchPain,
        path: `content/inbox/${targetDim}/${filename}`,
        sha256,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${file.name}: ${msg}`);
    }
  }

  // 4. Guardar manifiesto actualizado
  manifest.lastSync = new Date().toISOString();
  try {
    await github.putJsonFile(MANIFEST_PATH, manifest, "actualizar drive-sync-manifest.json");
  } catch (err) {
    console.warn("No se pudo actualizar el manifest en remoto:", err);
  }

  onProgress({
    status: `✓ Sincronización completada: ${result.synced} fotos procesadas.`,
    current: toProcess.length,
    total: toProcess.length,
  });

  return result;
}
