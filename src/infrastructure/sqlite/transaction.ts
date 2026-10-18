// src/infrastructure/sqlite/transaction.ts
// TRANSACCIONES BEGIN IMMEDIATE: el write-lock se adquiere al abrir la transacción
// (respetando busy_timeout) en lugar de al primer INSERT/UPDATE, eliminando el
// SQLITE_BUSY por upgrade de lock típico de las transacciones DEFERRED.

import type { DatabaseSync } from "node:sqlite";

export function withImmediateTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE;");
  try {
    const result = fn();
    db.exec("COMMIT;");
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK;");
    } catch (rollbackErr) {
      console.warn("[sqlite] ROLLBACK falló tras error original:", (rollbackErr as Error).message);
    }
    throw err;
  }
}
