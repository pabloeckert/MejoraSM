// scripts/publish-scheduled-posts.mjs
// Segundo paso del publicador autónomo de posts de feed del EDA — mismo
// principio que publish-story.mjs: lee lo que ya renderizó
// render-scheduled-posts.mjs (y que ya está commiteado, así
// raw.githubusercontent.com puede servirlo) y lo publica vía Zernio.
//
// Uso: node scripts/publish-scheduled-posts.mjs
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAW_BASE_URL,
//      ZERNIO_API_KEY, ZERNIO_INSTAGRAM_ACCOUNT_ID, ZERNIO_FACEBOOK_ACCOUNT_ID

import { readFile } from "node:fs/promises";
import path from "node:path";
import { publishPost } from "./lib/zernio.mjs";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "content/work/scheduled-posts.json");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function restHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function markPublished(proposalId, zernioPostId) {
  const now = new Date().toISOString();
  await fetch(`${SUPABASE_URL}/rest/v1/proposals?id=eq.${proposalId}`, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ status: "published", published_at: now, zernio_post_id: zernioPostId }),
  });
  await fetch(`${SUPABASE_URL}/rest/v1/calendar_events?proposal_id=eq.${proposalId}`, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ status: "published" }),
  });
}

async function markError(proposalId, errorMessage) {
  await fetch(`${SUPABASE_URL}/rest/v1/proposals?id=eq.${proposalId}`, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({
      metadata: { last_publish_error: errorMessage, last_publish_attempt: new Date().toISOString() },
    }),
  });
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.");
    process.exit(1);
  }
  const rawBaseUrl = process.env.RAW_BASE_URL;
  if (!rawBaseUrl) {
    console.error("Falta RAW_BASE_URL en el entorno.");
    process.exit(1);
  }

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  if (manifest.length === 0) {
    console.log("Nada para publicar (manifiesto vacío).");
    return;
  }

  let failures = 0;

  for (const entry of manifest) {
    // outputPaths: 1 elemento para un post simple, varios para un carrusel
    // (PLAN_AUTONOMIA.md Fase 7) — publishPost/createPostAndPoll ya aceptan
    // un array de URLs.
    const imageUrls = entry.outputPaths.map((p) => `${rawBaseUrl}/${p}`);
    try {
      const result = await publishPost(imageUrls.length === 1 ? imageUrls[0] : imageUrls, entry.caption);
      if (!result.success) {
        failures++;
        await markError(entry.proposalId, result.error || "Fallo desconocido publicando en Zernio");
        console.error(`Propuesta ${entry.proposalId}: error publicando — ${result.error}`);
        continue;
      }
      await markPublished(entry.proposalId, result.postId);
      console.log(`Propuesta ${entry.proposalId}: publicada (Zernio post ${result.postId}).`);
    } catch (e) {
      failures++;
      await markError(entry.proposalId, e.message);
      console.error(`Propuesta ${entry.proposalId}: excepción — ${e.message}`);
    }
  }

  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
