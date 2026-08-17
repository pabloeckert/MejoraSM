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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const [, , postId, platform] = process.argv;

// Fix de raíz del "Failed to fetch" del Monitor (2026-08-17): cachea las
// acciones manuales en historial_cache también, sin pisar posts (que solo
// escribe sync-history.mjs). Nunca rompe el registro real si falla.
async function syncToSupabase(acciones) {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/historial_cache?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ id: 1, acciones_manuales: acciones, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      console.warn(`Aviso: no se pudo cachear la acción manual en Supabase (${res.status} ${await res.text()}).`);
    }
  } catch (e) {
    console.warn(`Aviso: no se pudo cachear la acción manual en Supabase (${e.message}).`);
  }
}

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
  await syncToSupabase(acciones);
  console.log(`Marcado como gestionado a mano: ${postId} (${platform}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
