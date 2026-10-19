// src/infrastructure/sqlite/walMaintenance.ts
// MANTENIMIENTO Y CONTROL DE WAL EN SQLITE (MejoraSM 2026)
// Criterio Zero-Trust Principal SRE:
// 1. Operación continua: EXCLUSIVAMENTE PRAGMA wal_checkpoint(PASSIVE).
//    Garantiza 0 bloqueo para lectores y escritores concurrentes.
// 2. Ventana de mantenimiento ociosa: PRAGMA wal_checkpoint(TRUNCATE).
//    Trunca el archivo -wal a 0 bytes liberando espacio físico sin interrumpir el servicio.

import { DatabaseSync } from "node:sqlite";

export type WalCheckpointMode = "PASSIVE" | "FULL" | "RESTART" | "TRUNCATE";

export interface WalCheckpointResult {
  busy: number;
  log: number;
  checkpointed: number;
  mode: WalCheckpointMode;
  timestamp: string;
}

/**
 * Ejecuta un checkpoint de WAL en la base de datos.
 * Por defecto ejecuta 'PASSIVE' para no bloquear transacciones en vuelo.
 */
export function ejecutarWalCheckpoint(
  db: DatabaseSync,
  mode: WalCheckpointMode = "PASSIVE"
): WalCheckpointResult {
  const validModes: WalCheckpointMode[] = ["PASSIVE", "FULL", "RESTART", "TRUNCATE"];
  if (!validModes.includes(mode)) {
    throw new Error(`Modo de checkpoint inválido: '${mode}'. Permitidos: ${validModes.join(", ")}`);
  }

  const stmt = db.prepare(`PRAGMA wal_checkpoint(${mode});`);
  const row = stmt.get() as { busy?: number; log?: number; checkpointed?: number } | undefined;

  return {
    busy: Number(row?.busy ?? 0),
    log: Number(row?.log ?? 0),
    checkpointed: Number(row?.checkpointed ?? 0),
    mode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Checkpoint pasivo continuo para régimen de alta concurrencia.
 */
export function checkpointOperacionContinua(db: DatabaseSync): WalCheckpointResult {
  return ejecutarWalCheckpoint(db, "PASSIVE");
}

/**
 * Checkpoint con truncado para ventanas ociosas o cierre ordenado del sistema.
 */
export function checkpointVentanaOciosa(db: DatabaseSync): WalCheckpointResult {
  return ejecutarWalCheckpoint(db, "TRUNCATE");
}
