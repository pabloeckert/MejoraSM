// scripts/publish-story.mjs
// Publica las stories renderizadas (ya commiteadas al repo) DIRECTO a Meta,
// sin pasar por Supabase. Una por una, con pausa entre publicaciones.
//
// Uso: node scripts/publish-story.mjs
// Env: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID,
//      FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID, RAW_BASE_URL
// (RAW_BASE_URL = https://raw.githubusercontent.com/<owner>/<repo>/<branch>)

import { readFile } from "node:fs/promises";
import path from "node:path";
import { publishInstagramStory, publishFacebookPhoto } from "./lib/meta.mjs";

const ROOT = process.cwd();
const WORK_DIR = path.join(ROOT, "content/work");
const DELAY_MS = 8000; // amable con el rate limit de Meta

const RAW_BASE_URL = process.env.RAW_BASE_URL;
if (!RAW_BASE_URL) {
  console.error("Falta RAW_BASE_URL en el entorno.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const renders = JSON.parse(await readFile(path.join(WORK_DIR, "renders.json"), "utf8"));
  let failures = 0;

  for (let i = 0; i < renders.length; i++) {
    const r = renders[i];
    const imageUrl = `${RAW_BASE_URL}/${r.outputPath}`;
    console.log(`\nPublicando ${i + 1}/${renders.length}: ${r.headline}`);

    const instagram = await publishInstagramStory(imageUrl);
    const facebook = await publishFacebookPhoto(imageUrl, r.caption_feed);
    console.log("  Instagram:", JSON.stringify(instagram));
    console.log("  Facebook: ", JSON.stringify(facebook));

    if (!instagram.success || !facebook.success) failures++;

    if (i < renders.length - 1) await sleep(DELAY_MS);
  }

  if (failures > 0) {
    console.error(`\n${failures} publicación(es) con al menos una plataforma fallada — revisar arriba.`);
    process.exit(1);
  }
  console.log("\nTodas las stories publicadas en Instagram y Facebook.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
