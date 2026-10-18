// scripts/migrate-v2.ts
// Migración aditiva del esquema V2 sobre data/mejora_sm.db (CREATE ... IF NOT EXISTS).
// Uso (vite-node resuelve los imports TS sin extensión):
//   npx vite-node scripts/migrate-v2.ts -- --dry-run
//   npx vite-node scripts/migrate-v2.ts
//   npx vite-node scripts/migrate-v2.ts -- --rollback data/backups/<archivo>.db
// Defensas: dry-run con diff [+]/[=], backup automático previo, integrity_check posterior.

import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import { CREATE_TABLES_SQL } from "../src/infrastructure/sqlite/schema";

const DB_PATH = path.resolve("data", "mejora_sm.db");
const BACKUP_DIR = path.resolve("data", "backups");
const OBJETOS_V2 = [
  ["table", "prospectos"],
  ["table", "prospecto_eventos_log"],
  ["table", "outbox_posts"],
  ["index", "idx_prospectos_email"],
  ["index", "idx_prospectos_estado_sla"],
  ["index", "idx_outbox_estado_reintento"],
  ["trigger", "trg_eventos_log_no_update"],
  ["trigger", "trg_eventos_log_no_delete"],
] as const;

function existentes(db: DatabaseSync): Set<string> {
  const filas = db.prepare("SELECT type, name FROM sqlite_master").all() as { type: string; name: string }[];
  return new Set(filas.map((f) => `${f.type}:${f.name}`));
}

function main(): void {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const rollbackIdx = args.indexOf("--rollback");
  if (rollbackIdx >= 0) {
    const backup = args[rollbackIdx + 1];
    if (!backup || !fs.existsSync(backup)) throw new Error(`Backup inexistente: ${backup}`);
    for (const ext of ["-wal", "-shm"]) fs.rmSync(DB_PATH + ext, { force: true });
    fs.copyFileSync(backup, DB_PATH);
    console.log(`[^] Rollback aplicado desde ${backup}`);
    return;
  }

  const dryRun = args.includes("--dry-run");
  if (!fs.existsSync(DB_PATH)) throw new Error(`No existe ${DB_PATH}`);

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA busy_timeout = 5000;");
  const antes = existentes(db);
  for (const [tipo, nombre] of OBJETOS_V2) {
    console.log(`${antes.has(`${tipo}:${nombre}`) ? "[=]" : "[+]"} ${tipo} ${nombre}`);
  }
  if (dryRun) {
    console.log("[dry-run] Sin cambios aplicados.");
    db.close();
    return;
  }

  db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backup = path.join(BACKUP_DIR, `mejora_sm.${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
  fs.copyFileSync(DB_PATH, backup);
  console.log(`[^] Backup: ${backup}`);

  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(CREATE_TABLES_SQL);
  const despues = existentes(db);
  const faltan = OBJETOS_V2.filter(([t, n]) => !despues.has(`${t}:${n}`));
  const integridad = (db.prepare("PRAGMA integrity_check;").get() as { integrity_check: string }).integrity_check;
  db.close();
  if (faltan.length > 0 || integridad !== "ok") {
    throw new Error(`Migración inválida. Faltan: ${JSON.stringify(faltan)} integrity_check=${integridad}. Rollback: --rollback ${backup}`);
  }
  console.log(`[~] Migración V2 aplicada. integrity_check=${integridad}`);
}

main();
