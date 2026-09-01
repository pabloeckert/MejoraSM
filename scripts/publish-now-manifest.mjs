// scripts/publish-now-manifest.mjs
//
// Escribe content/work/publish-now.json — el estado que el EDA lee para
// mostrar el preview de "Publicar ahora" y saber si ya se publicó.
//
// Uso: node scripts/publish-now-manifest.mjs <phase> <nonce> [mensaje]
//   phase: preparing | prepared | publishing | published | error
//   nonce: el mismo string que el EDA pasó como input del workflow_dispatch
//          (para que el EDA distinga su corrida de una anterior)

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WORK_DIR = path.join(ROOT, "content/work");
const MANIFEST = path.join(WORK_DIR, "publish-now.json");
const PN_BRIEFS = path.join(WORK_DIR, "publish-now-briefs.json");
const PN_RENDERS = path.join(WORK_DIR, "publish-now-renders.json");

const [phase, nonce, message = ""] = process.argv.slice(2);

if (!phase || !nonce) {
  console.error("Uso: node scripts/publish-now-manifest.mjs <phase> <nonce> [mensaje]");
  process.exit(1);
}

async function readJson(p) {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(WORK_DIR, { recursive: true });

  const prev = (await readJson(MANIFEST)) || {};
  const manifest = {
    ...prev,
    nonce,
    phase,
    error: phase === "error" ? message || "Error desconocido" : null,
    updatedAt: new Date().toISOString(),
  };

  // Al terminar "prepare", sumamos lo que hace falta para el preview.
  if (phase === "prepared") {
    const briefs = await readJson(PN_BRIEFS);
    const renders = await readJson(PN_RENDERS);
    const b = Array.isArray(briefs) ? briefs[0] : null;
    const r = Array.isArray(renders) ? renders[0] : null;
    manifest.oferta = b?.oferta || prev.oferta || null;
    manifest.headline = b?.headline || "";
    manifest.subtext = b?.subtext || "";
    manifest.kicker = b?.kicker || null;
    manifest.captionFeed = b?.caption_feed || "";
    manifest.imagePath = r?.outputPath || null;
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`[publish-now-manifest] ${phase} (nonce ${nonce})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
