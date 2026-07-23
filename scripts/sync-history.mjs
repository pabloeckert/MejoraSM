// scripts/sync-history.mjs
// Sincroniza el historial real de posts desde Zernio (GET /v1/posts, paginado)
// y lo vuelca a content/log/historial.json — público, sin la API key adentro,
// solo los datos de cada post: fecha, plataforma, status, URL real y caption.
//
// La imagen de cada story no se le pide a Zernio (nunca nos devuelve un campo
// de media confirmado en la documentación) — se deriva de nuestro propio
// content/published/story-{fecha}-1.jpg, que ya existe en el repo desde que
// se publicó.
//
// Uso: node scripts/sync-history.mjs
// Env: ZERNIO_API_KEY, ZERNIO_INSTAGRAM_ACCOUNT_ID, ZERNIO_FACEBOOK_ACCOUNT_ID, RAW_BASE_URL
// Salida: content/log/historial.json

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLISHED_DIR = path.join(ROOT, "content/published");
const LOG_DIR = path.join(ROOT, "content/log");
const ZERNIO_API_URL = "https://zernio.com/api/v1/posts";
const PAGE_LIMIT = 100;

const RAW_BASE_URL = process.env.RAW_BASE_URL;
if (!RAW_BASE_URL) {
  console.error("Falta RAW_BASE_URL en el entorno.");
  process.exit(1);
}

async function fetchAllPostsForAccount(accountId, apiKey) {
  const posts = [];
  let page = 1;
  while (true) {
    const url = `${ZERNIO_API_URL}?accountId=${accountId}&page=${page}&limit=${PAGE_LIMIT}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) {
      console.warn(`Aviso: Zernio respondió ${res.status} para accountId=${accountId} página ${page} — corto acá.`);
      break;
    }
    const data = await res.json();
    posts.push(...(data.posts || []));
    const pagination = data.pagination || {};
    if (!pagination.pages || page >= pagination.pages) break;
    page++;
  }
  return posts;
}

// El status por plataforma y su URL real pueden venir anidados en cada
// elemento de platforms (visto en producción) o, si Zernio no los repite ahí,
// caer al platformPostUrl del post entero como aproximación.
function platformEntry(p, post) {
  return {
    platform: p.platform,
    status: p.status,
    url: p.platformPostUrl || post.platformPostUrl || null,
  };
}

function findLocalImage(date) {
  const filename = `story-${date}-1.jpg`;
  if (!existsSync(path.join(PUBLISHED_DIR, filename))) return null;
  return `${RAW_BASE_URL}/content/published/${filename}`;
}

async function main() {
  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) {
    console.error("Falta ZERNIO_API_KEY en el entorno.");
    process.exit(1);
  }

  const accountIds = [
    process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID,
    process.env.ZERNIO_FACEBOOK_ACCOUNT_ID,
  ].filter(Boolean);

  if (accountIds.length === 0) {
    console.error("Falta configurar ZERNIO_INSTAGRAM_ACCOUNT_ID y/o ZERNIO_FACEBOOK_ACCOUNT_ID.");
    process.exit(1);
  }

  const byId = new Map();
  for (const accountId of accountIds) {
    const posts = await fetchAllPostsForAccount(accountId, apiKey);
    for (const post of posts) byId.set(post._id, post);
  }

  const entries = [...byId.values()].map((post) => {
    const date = (post.scheduledFor || post.createdAt || "").slice(0, 10);
    return {
      id: post._id,
      date,
      status: post.status,
      content: post.content || "",
      imageUrl: findLocalImage(date),
      platforms: (post.platforms || []).map((p) => platformEntry(p, post)),
    };
  });

  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  await mkdir(LOG_DIR, { recursive: true });
  await writeFile(
    path.join(LOG_DIR, "historial.json"),
    JSON.stringify({ syncedAt: new Date().toISOString(), posts: entries }, null, 2)
  );

  console.log(`Historial sincronizado: ${entries.length} post(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
