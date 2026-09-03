// scripts/publish-reel.mjs
// Publica el reel armado por render-reel.mjs (el MP4 vive en content/work/ del
// runner, NO en el repo) en Instagram y Facebook vía Zernio. Corre en el mismo
// job que render-reel.mjs. Sube el MP4 con upload-direct y publica.
//
// Uso: node scripts/publish-reel.mjs
// Env: ZERNIO_API_KEY, ZERNIO_INSTAGRAM_ACCOUNT_ID, ZERNIO_FACEBOOK_ACCOUNT_ID

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { publishReel } from "./lib/zernio.mjs";
import { logRun, startTimer } from "./lib/run-log.mjs";

const ROOT = process.cwd();
const REEL_MANIFEST = path.join(ROOT, "content/work/reel.json");

const elapsed = startTimer();

async function main() {
  if (!existsSync(REEL_MANIFEST)) {
    console.log("No hay content/work/reel.json — nada que publicar.");
    await logRun({ source: "reel", step: "publish-reel", status: "skipped", durationMs: elapsed(), metadata: { reason: "sin manifiesto" } });
    return;
  }
  const manifest = JSON.parse(await readFile(REEL_MANIFEST, "utf8"));
  if (manifest.skip || !manifest.video) {
    console.log(`Nada que publicar (${manifest.reason || "manifiesto vacío"}).`);
    await logRun({ source: "reel", step: "publish-reel", status: "skipped", durationMs: elapsed(), metadata: { reason: manifest.reason || "vacío" } });
    return;
  }

  const videoPath = path.join(ROOT, manifest.video);
  if (!existsSync(videoPath)) {
    throw new Error(`El video ${manifest.video} no existe en el repo.`);
  }

  console.log(`Publicando reel: ${manifest.headline}`);
  const result = await publishReel(videoPath, manifest.caption || "");
  console.log("Resultado:", JSON.stringify(result));

  if (!result.success) {
    await logRun({ source: "reel", step: "publish-reel", status: "error", durationMs: elapsed(), error: result.error || "fallo desconocido" });
    process.exit(1);
  }
  await logRun({ source: "reel", step: "publish-reel", status: "success", durationMs: elapsed(), metadata: { postId: result.postId, oferta: manifest.oferta } });
  console.log("Reel publicado en Instagram y Facebook.");
}

main().catch(async (e) => {
  console.error(e);
  await logRun({ source: "reel", step: "publish-reel", status: "error", durationMs: elapsed(), error: String(e?.message || e) });
  process.exit(1);
});
