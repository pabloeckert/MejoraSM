// src/infrastructure/sqlite/__tests__/walMaintenance.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  ejecutarWalCheckpoint,
  checkpointOperacionContinua,
  checkpointVentanaOciosa,
} from "../walMaintenance";
import { CREATE_TABLES_V2_SQL } from "../schema";

describe("Fase 3: Mantenimiento WAL (PASSIVE continua vs TRUNCATE ociosa)", () => {
  let tmpDir: string;
  let dbPath: string;
  let db: DatabaseSync;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wal-test-"));
    dbPath = path.join(tmpDir, "test.db");
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(CREATE_TABLES_V2_SQL);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("operación continua: checkpointOperacionContinua ejecuta PASSIVE sin bloquear", () => {
    // Escribir datos para generar páginas en el archivo WAL
    db.exec("INSERT INTO prospectos (prospecto_id, email, nombre, pieza_id_atribucion, fecha_captura, fecha_actualizacion, sla_limite_calificacion) VALUES ('P1', 'p1@test.com', 'N1', 'A1', '2026-10-19T10:00:00.000Z', '2026-10-19T10:00:00.000Z', '2026-10-19T12:00:00.000Z');");

    const res = checkpointOperacionContinua(db);
    expect(res.mode).toBe("PASSIVE");
    expect(typeof res.busy).toBe("number");
    expect(typeof res.log).toBe("number");
    expect(typeof res.checkpointed).toBe("number");
  });

  it("ventana ociosa: checkpointVentanaOciosa ejecuta TRUNCATE y reduce el WAL", () => {
    // Escribir lote de registros
    for (let i = 0; i < 20; i++) {
      db.exec(`INSERT INTO prospectos (prospecto_id, email, nombre, pieza_id_atribucion, fecha_captura, fecha_actualizacion, sla_limite_calificacion) VALUES ('P_${i}', 'p_${i}@test.com', 'N_${i}', 'A1', '2026-10-19T10:00:00.000Z', '2026-10-19T10:00:00.000Z', '2026-10-19T12:00:00.000Z');`);
    }

    const res = checkpointVentanaOciosa(db);
    expect(res.mode).toBe("TRUNCATE");
    expect(res.busy).toBe(0);
  });

  it("rechaza modos de checkpoint no reconocidos", () => {
    expect(() => ejecutarWalCheckpoint(db, "INVENTADO" as any)).toThrow(/inválido/);
  });
});
