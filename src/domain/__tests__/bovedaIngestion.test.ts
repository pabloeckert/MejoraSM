// src/domain/__tests__/bovedaIngestion.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  validateFichaBoveda,
  ingestBovedaDirectory,
} from "../bovedaIngestion";
import { FichaBovedaDTO } from "../types";
import { SqliteBovedaRepository } from "../../infrastructure/sqlite/SqliteBovedaRepository";

describe("Subfase 1.2: Bóveda RAG en 4 Capas Canónicas y Validador DTO", () => {
  const testDbPath = path.join(process.cwd(), "data", "test_boveda_subfase_1_2.db");
  const bovedaBasePath = path.join(process.cwd(), "content", "boveda");

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore on Windows if lock takes a moment
      }
    }
  });

  it("rechaza DTOs incompletos o con invariantes inválidos", () => {
    expect(() => validateFichaBoveda(null)).toThrow("Payload inválido");
    expect(() => validateFichaBoveda({})).toThrow("'id' es obligatorio");

    expect(() =>
      validateFichaBoveda({
        id: "TEST-01",
        origen_carpeta: "carpeta_invalida",
      })
    ).toThrow("'origen_carpeta' inválido");

    expect(() =>
      validateFichaBoveda({
        id: "TEST-01",
        origen_carpeta: "autoridad",
        dimension: "dimension_invalida",
      })
    ).toThrow("'dimension' inválida");

    expect(() =>
      validateFichaBoveda({
        id: "TEST-01",
        origen_carpeta: "autoridad",
        dimension: "organizacional",
        tipo_activo: "formato_falso",
      })
    ).toThrow("'tipo_activo' inválido");
  });

  it("valida y canonicaliza un DTO completo con metadatos multimedia", () => {
    const raw: FichaBovedaDTO = {
      id: "BOV-2026-TEST-FULL",
      origen_carpeta: "networking_y_autoridad",
      dimension: "networking_y_autoridad",
      tipo_activo: "imagen_con_texto",
      titulo: "Reunión de Directorio C-Level",
      contenido_raw: "Debate sobre profesionalización directiva.",
      metadatos_multimedia: {
        ruta_archivo_local: "/content/boveda/04_networking/img1.jpg",
        personas_presentes: ["Pablo", "Director Invitado"],
        orientacion_original: "horizontal",
        resolucion: { ancho: 1920, alto: 1080 },
        locacion: "Bolsa de Comercio",
      },
      fase_comercial_sugerida: "mofu_educacion",
      creado_el: "2026-10-16T10:00:00.000Z",
    };

    const validated = validateFichaBoveda(raw);
    expect(validated.id).toBe("BOV-2026-TEST-FULL");
    expect(validated.metadatos_multimedia?.personas_presentes).toHaveLength(2);
    expect(validated.metadatos_multimedia?.orientacion_original).toBe("horizontal");
    expect(validated.metadatos_multimedia?.resolucion?.ancho).toBe(1920);
  });

  it("escanea e ingesta las 4 capas canónicas de content/boveda/ y persiste en SQLite", async () => {
    const fichas = await ingestBovedaDirectory(bovedaBasePath);

    // Debe contener al menos 1 ficha por cada una de las 4 capas
    expect(fichas.length).toBeGreaterThanOrEqual(4);

    const capasEncontradas = new Set(fichas.map((f) => f.origen_carpeta));
    expect(capasEncontradas.has("constitucion")).toBe(true);
    expect(capasEncontradas.has("autoridad")).toBe(true);
    expect(capasEncontradas.has("experiencia")).toBe(true);
    expect(capasEncontradas.has("networking_y_autoridad")).toBe(true);

    // Integración con persistencia SQLite
    const repo = new SqliteBovedaRepository(testDbPath);
    try {
      for (const ficha of fichas) {
        repo.insertarOActualizarFicha(ficha);
      }

      const recuperadas = repo.listarFichas();
      expect(recuperadas.length).toBe(fichas.length);

      // Buscar específicamente la ficha de networking con metadatos JSON
      const netFicha = repo.obtenerFichaPorId("BOV-2026-NET-001");
      expect(netFicha).not.toBeNull();
      expect(netFicha?.origen_carpeta).toBe("networking_y_autoridad");
      expect(netFicha?.metadatos_multimedia?.personas_presentes).toContain("Pablo (Director Mejora Continua)");
    } finally {
      repo.close();
    }
  });
});
