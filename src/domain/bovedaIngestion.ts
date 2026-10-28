// src/domain/bovedaIngestion.ts
// INGESTA HETEROGÉNEA Y VALIDADOR DTO PARA BÓVEDA RAG (2026)
// Respeta Clean Architecture, Tipado Estricto y Directivas Zero-Trust.

import * as fs from "node:fs";
import * as path from "node:path";
import {
  DimensionMC,
  FaseComercial,
  FichaBovedaDTO,
} from "./types";

export const CAPAS_BOVEDA_MAP = {
  "01_constitucion": "constitucion",
  "02_autoridad": "autoridad",
  "03_experiencia": "experiencia",
  "04_networking": "networking_y_autoridad",
} as const;

export type CarpetaBovedaKey = keyof typeof CAPAS_BOVEDA_MAP;

const DIMENSIONES_VALIDAS: Set<DimensionMC> = new Set([
  "personal",
  "organizacional",
  "comercial",
  "empresarial",
  "profesionalizacion",
  "networking_y_autoridad",
]);

const FASES_COMERCIALES_VALIDAS: Set<FaseComercial> = new Set([
  "tofu_atraccion",
  "mofu_educacion",
  "bofu_conversion",
]);

const TIPOS_ACTIVO_VALIDOS: Set<FichaBovedaDTO["tipo_activo"]> = new Set([
  "texto_markdown",
  "pdf_referencia",
  "audio_transcripcion",
  "imagen_con_texto",
]);


/**
 * Validador formal en memoria de contratos FichaBovedaDTO.
 * Rechaza atajos, valores incompletos o tipos incompatibles.
 */
export function validateFichaBoveda(raw: unknown): FichaBovedaDTO {
  if (!raw || typeof raw !== "object") {
    throw new Error("Payload inválido: FichaBovedaDTO debe ser un objeto.");
  }

  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.id !== "string" || candidate.id.trim() === "") {
    throw new Error("Validación fallida: 'id' es obligatorio y no puede estar vacío.");
  }

  const origen = candidate.origen_carpeta as FichaBovedaDTO["origen_carpeta"];
  const origenValido = Object.values(CAPAS_BOVEDA_MAP);
  if (!origenValido.includes(origen)) {
    throw new Error(
      `Validación fallida: 'origen_carpeta' inválido. Debe ser uno de: ${origenValido.join(", ")}.`
    );
  }

  const dimension = candidate.dimension as DimensionMC;
  if (!DIMENSIONES_VALIDAS.has(dimension)) {
    throw new Error(
      `Validación fallida: 'dimension' inválida. Debe ser una de: ${Array.from(DIMENSIONES_VALIDAS).join(", ")}.`
    );
  }

  const tipoActivo = candidate.tipo_activo as FichaBovedaDTO["tipo_activo"];
  if (!TIPOS_ACTIVO_VALIDOS.has(tipoActivo)) {
    throw new Error(
      `Validación fallida: 'tipo_activo' inválido. Debe ser uno de: ${Array.from(TIPOS_ACTIVO_VALIDOS).join(", ")}.`
    );
  }

  if (typeof candidate.titulo !== "string" || candidate.titulo.trim() === "") {
    throw new Error("Validación fallida: 'titulo' es obligatorio.");
  }

  if (typeof candidate.contenido_raw !== "string") {
    throw new Error("Validación fallida: 'contenido_raw' debe ser un string.");
  }

  const fase = candidate.fase_comercial_sugerida as FaseComercial;
  if (!FASES_COMERCIALES_VALIDAS.has(fase)) {
    throw new Error(
      `Validación fallida: 'fase_comercial_sugerida' inválida. Debe ser una de: ${Array.from(FASES_COMERCIALES_VALIDAS).join(", ")}.`
    );
  }

  let multimedia: FichaBovedaDTO["metadatos_multimedia"] | undefined;
  if (candidate.metadatos_multimedia && typeof candidate.metadatos_multimedia === "object") {
    const meta = candidate.metadatos_multimedia as Record<string, unknown>;
    if (typeof meta.ruta_archivo_local !== "string" || !meta.ruta_archivo_local) {
      throw new Error("Validación fallida: 'metadatos_multimedia.ruta_archivo_local' es obligatoria.");
    }
    if (!Array.isArray(meta.personas_presentes)) {
      throw new Error("Validación fallida: 'metadatos_multimedia.personas_presentes' debe ser un array.");
    }
    if (
      meta.orientacion_original !== "horizontal" &&
      meta.orientacion_original !== "vertical" &&
      meta.orientacion_original !== "cuadrada"
    ) {
      throw new Error("Validación fallida: 'orientacion_original' debe ser horizontal, vertical o cuadrada.");
    }

    const res = meta.resolucion as Record<string, unknown> | undefined;
    multimedia = {
      ruta_archivo_local: meta.ruta_archivo_local,
      personas_presentes: meta.personas_presentes.map(String),
      orientacion_original: meta.orientacion_original,
      resolucion: res ? {
        ancho: Number(res.ancho) || 0,
        alto: Number(res.alto) || 0,
      } : undefined,
      locacion: typeof meta.locacion === "string" ? meta.locacion : undefined,
    };
  }

  return {
    id: candidate.id.trim(),
    origen_carpeta: origen,
    dimension,
    tipo_activo: tipoActivo,
    titulo: candidate.titulo.trim(),
    contenido_raw: candidate.contenido_raw.trim(),
    metadatos_multimedia: multimedia,
    fase_comercial_sugerida: fase,
    creado_el: typeof candidate.creado_el === "string" ? candidate.creado_el : new Date().toISOString(),
  };
}

/**
 * Parsea un archivo Markdown y extrae título y contenido para conformar una FichaBovedaDTO canónica.
 */
export function parseMarkdownFileToFicha(
  filePath: string,
  origenCarpeta: FichaBovedaDTO["origen_carpeta"],
  defaultDimension: DimensionMC = "organizacional",
  defaultFase: FaseComercial = "tofu_atraccion"
): FichaBovedaDTO {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  // Extraer primer H1 si existe
  const lines = content.split("\n");
  let titulo = baseName.replace(/_/g, " ");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      titulo = trimmed.replace(/^#\s+/, "").trim();
      break;
    }
  }

  // Generar ID único basado en el nombre y capa
  const id = `BOV-${origenCarpeta.toUpperCase().slice(0, 3)}-${baseName.toUpperCase().slice(0, 16)}`;

  return validateFichaBoveda({
    id,
    origen_carpeta: origenCarpeta,
    dimension: defaultDimension,
    tipo_activo: "texto_markdown",
    titulo,
    contenido_raw: content,
    fase_comercial_sugerida: defaultFase,
    creado_el: new Date().toISOString(),
  });
}

/**
 * Escanea recursivamente el almacenamiento de la Bóveda en content/boveda/
 * procesando las 4 capas canónicas de conocimiento.
 */
export async function ingestBovedaDirectory(bovedaBasePath: string): Promise<FichaBovedaDTO[]> {
  const results: FichaBovedaDTO[] = [];

  for (const [folderName, canonicalOrigen] of Object.entries(CAPAS_BOVEDA_MAP)) {
    const targetDir = path.join(bovedaBasePath, folderName);
    if (!fs.existsSync(targetDir)) {
      continue;
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const fullPath = path.join(targetDir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();

      if (ext === ".json") {
        try {
          const rawJson = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          // Si el JSON no tiene origen_carpeta explícito, asociar según la carpeta física
          if (!rawJson.origen_carpeta) {
            rawJson.origen_carpeta = canonicalOrigen;
          }
          const valid = validateFichaBoveda(rawJson);
          results.push(valid);
        } catch (err: unknown) {
          console.warn(`[bovedaIngestion] Advertencia al procesar JSON en ${entry.name}: ${(err as Error)?.message}`);
        }
      } else if (ext === ".md") {
        let dimension: DimensionMC = "organizacional";
        let fase: FaseComercial = "tofu_atraccion";

        if (canonicalOrigen === "constitucion") {
          dimension = "profesionalizacion";
          fase = "mofu_educacion";
        } else if (canonicalOrigen === "autoridad") {
          dimension = "organizacional";
          fase = "tofu_atraccion";
        } else if (canonicalOrigen === "experiencia") {
          dimension = "empresarial";
          fase = "bofu_conversion";
        } else if (canonicalOrigen === "networking_y_autoridad") {
          dimension = "networking_y_autoridad";
          fase = "mofu_educacion";
        }

        const ficha = parseMarkdownFileToFicha(fullPath, canonicalOrigen, dimension, fase);
        results.push(ficha);
      }
    }
  }

  return results;
}
