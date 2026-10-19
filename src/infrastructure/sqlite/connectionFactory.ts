// src/infrastructure/sqlite/connectionFactory.ts
// FÁBRICA CENTRALIZADA Y SOBERANA DE CONEXIONES SQLITE (MejoraSM 2026)
// Motor: node:sqlite (DatabaseSync) nativo sin dependencias externas.
// Garantiza por contrato en CADA conexión:
//   - PRAGMA foreign_keys = ON
//   - PRAGMA busy_timeout configurado
//   - PRAGMA journal_mode = WAL (en conexiones de lectura/escritura)
//   - Soporte para conexiones readOnly nativas con aislamiento total

import { DatabaseSync } from "node:sqlite";
import { CREATE_TABLES_SQL } from "./schema";

export interface DatabaseConnectionOptions {
  readOnly?: boolean;
  busyTimeout?: number;
  skipInitSchema?: boolean;
}

export const DEFAULT_DB_PATH = "data/mejora_sm.db";
export const DEFAULT_BUSY_TIMEOUT_MS = 5000;
export const FAST_WRITE_BUSY_TIMEOUT_MS = 250;

/**
 * Crea una conexión SQLite centralizada y tipada.
 */
export function createDatabaseConnection(
  dbPath: string = DEFAULT_DB_PATH,
  options: DatabaseConnectionOptions = {}
): DatabaseSync {
  const isReadOnly = Boolean(options.readOnly);
  const busyTimeout = options.busyTimeout ?? (isReadOnly ? DEFAULT_BUSY_TIMEOUT_MS : DEFAULT_BUSY_TIMEOUT_MS);

  const db = new DatabaseSync(dbPath, {
    readOnly: isReadOnly,
  });

  // PRAGMA foreign_keys = ON es innegociable en todas las conexiones
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`PRAGMA busy_timeout = ${busyTimeout};`);

  if (!isReadOnly) {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");

    if (!options.skipInitSchema) {
      db.exec(CREATE_TABLES_SQL);
    }
  }

  return db;
}

/**
 * Conexión optimizada para lecturas concurrentes sin locks de escritura.
 */
export function createReadOnlyConnection(dbPath: string = DEFAULT_DB_PATH): DatabaseSync {
  return createDatabaseConnection(dbPath, { readOnly: true, busyTimeout: DEFAULT_BUSY_TIMEOUT_MS });
}

/**
 * Conexión de escritura de corta duración con busy_timeout <= 250ms.
 */
export function createShortWriteConnection(
  dbPath: string = DEFAULT_DB_PATH,
  busyTimeout: number = FAST_WRITE_BUSY_TIMEOUT_MS
): DatabaseSync {
  return createDatabaseConnection(dbPath, {
    readOnly: false,
    busyTimeout,
    skipInitSchema: true,
  });
}
