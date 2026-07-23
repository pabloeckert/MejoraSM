// scripts/mark-manual.mjs
// Registra que una acción sobre un post se hizo A MANO (típicamente: borrar
// una story de Instagram desde la app, porque Zernio no puede despublicar
// Instagram por API — limitación de Meta, no nuestra). NO llama a Zernio,
// no usa ZERNIO_API_KEY — es solo un registro propio en
// content/log/acciones-manuales.json, cero riesgo real.
//
// Uso: node scripts/mark-manual.mjs <post_id> <platform>
// Salida: content/log/acciones-manuales.json

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LOG_DIR = path.join(ROOT, "content/log");
const ACCIONES_PATH = path.join(LOG_DIR, "acciones-manuales.json");

const [, , postId, platform] = process.argv;

async function main() {
  if (!postId || !platform) {
    console.error("Uso: node scripts/mark-manual.mjs <post_id> <platform>");
    process.exit(1);
  }

  await mkdir(LOG_DIR, { recursive: true });
  let acciones = existsSync(ACCIONES_PATH)
    ? JSON.parse(await readFile(ACCIONES_PATH, "utf8"))
    : [];

  acciones = acciones.filter((a) => !(a.postId === postId && a.platform === platform));
  acciones.push({
    postId,
    platform,
    marcadoManualEn: new Date().toISOString().slice(0, 10),
  });

  await writeFile(ACCIONES_PATH, JSON.stringify(acciones, null, 2));
  console.log(`Marcado como gestionado a mano: ${postId} (${platform}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
