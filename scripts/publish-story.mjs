// scripts/publish-story.mjs
// Publica las stories renderizadas (ya commiteadas al repo) vía Zernio —
// un solo POST por story publica en Instagram y Facebook al mismo tiempo.
//
// Uso: node scripts/publish-story.mjs
// Env: ZERNIO_API_KEY, ZERNIO_INSTAGRAM_ACCOUNT_ID, ZERNIO_FACEBOOK_ACCOUNT_ID, RAW_BASE_URL

import { readFile } from "node:fs/promises";
import path from "node:path";
import { publishStory } from "./lib/zernio.mjs";
import { logRun, startTimer } from "./lib/run-log.mjs";

const ROOT = process.cwd();
const WORK_DIR = path.join(ROOT, "content/work");
const DELAY_MS = 5000; // pausa entre publicaciones, prudente aunque Zernio maneja rate limits solo

// "Publicar ahora" (2026-09-01) — lee su propio renders file. Ver generate-brief.mjs.
const PUBLISH_NOW = process.env.PUBLISH_NOW === "1";
const RENDERS_FILE = PUBLISH_NOW ? "publish-now-renders.json" : "renders.json";
const RUN_SOURCE = PUBLISH_NOW ? "publish-now" : "daily-story";

const RAW_BASE_URL = process.env.RAW_BASE_URL;
if (!RAW_BASE_URL) {
  console.error("Falta RAW_BASE_URL en el entorno.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const renders = JSON.parse(await readFile(path.join(WORK_DIR, RENDERS_FILE), "utf8"));
  let failures = 0;

  for (let i = 0; i < renders.length; i++) {
    const r = renders[i];
    const imageUrl = `${RAW_BASE_URL}/${r.outputPath}`;
    console.log(`\nPublicando ${i + 1}/${renders.length}: ${r.headline}`);

    const result = await publishStory(imageUrl, r.caption_feed);
    console.log("  Resultado:", JSON.stringify(result));

    if (!result.success) failures++;

    if (i < renders.length - 1) await sleep(DELAY_MS);
  }

  if (failures > 0) {
    console.error(`\n${failures} publicación(es) fallaron — revisar arriba. Recordá: Instagram falla solo ~10% de las veces por su cuenta, no siempre es un bug nuestro.`);
    await logRun({ source: RUN_SOURCE, step: "publish-story", status: "error", durationMs: elapsed(), error: `${failures} publicación(es) fallaron`, metadata: { total: renders.length, failures } });
    process.exit(1);
  }
  console.log("\nTodas las stories publicadas en Instagram y Facebook.");
  await logRun({ source: RUN_SOURCE, step: "publish-story", status: "success", durationMs: elapsed(), metadata: { total: renders.length } });
}

const elapsed = startTimer();
main().catch(async (e) => {
  console.error(e);
  await logRun({ source: RUN_SOURCE, step: "publish-story", status: "error", durationMs: elapsed(), error: String(e?.message || e) });
  process.exit(1);
});
