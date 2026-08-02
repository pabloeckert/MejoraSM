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

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LOG_DIR = path.join(ROOT, "content/log");
const LOCAL_BRIEFS_PATH = path.join(LOG_DIR, "local-briefs.json");
const ZERNIO_API_URL = "https://zernio.com/api/v1/posts";
const PAGE_LIMIT = 100;

const RAW_BASE_URL = process.env.RAW_BASE_URL;
if (!RAW_BASE_URL) {
  console.error("Falta RAW_BASE_URL en el entorno.");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Prueba primero el patrón de Stories (story-{fecha}-1.jpg) y, si no existe,
// el de posts de feed (post-{fecha}-N.jpg, N de render-scheduled-posts.mjs
// según cuántas propuestas se rendericen ese día) — antes solo probaba el
// primero, así que cada post de feed publicado quedaba sin imagen local.
async function localImageFor(date) {
  const storyPath = `content/published/story-${date}-1.jpg`;
  if (existsSync(path.join(ROOT, storyPath))) {
    return { imageUrl: `${RAW_BASE_URL}/${storyPath}`, outputPath: storyPath };
  }
  for (let n = 1; n <= 5; n++) {
    const postPath = `content/published/post-${date}-${n}.jpg`;
    if (existsSync(path.join(ROOT, postPath))) {
      return { imageUrl: `${RAW_BASE_URL}/${postPath}`, outputPath: postPath };
    }
  }
  return { imageUrl: null, outputPath: null };
}

// Posts de feed no pasan por render-story.mjs, así que nunca están en
// local-briefs.json — su headline/oferta/id de propuesta salen directo de
// `proposals` en Supabase, matcheando por zernio_post_id (lo que
// scripts/publish-scheduled-posts.mjs guarda al publicar).
async function loadFeedProposals() {
  if (!SUPABASE_URL || !SERVICE_KEY) return new Map();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/proposals?zernio_post_id=not.is.null&select=id,zernio_post_id,hook,title,oferta,rendered_image_path`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) {
    console.warn(`Aviso: no pude traer proposals de Supabase (${res.status}) — posts de feed quedan sin headline/oferta.`);
    return new Map();
  }
  const rows = await res.json();
  return new Map(rows.map((r) => [r.zernio_post_id, r]));
}

// Zernio nunca recibe el headline ni la oferta (son solo para el prompt de
// Claude) — vienen de content/log/local-briefs.json, que render-story.mjs
// mantiene de forma permanente (a diferencia de renders.json, que se pisa
// cada día). Posts de antes de que existiera ese log quedan sin estos datos.
async function loadLocalBriefs() {
  if (!existsSync(LOCAL_BRIEFS_PATH)) return new Map();
  const entries = JSON.parse(await readFile(LOCAL_BRIEFS_PATH, "utf8"));
  return new Map(entries.map((e) => [e.outputPath, e]));
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

  const localBriefs = await loadLocalBriefs();
  const feedProposals = await loadFeedProposals();

  const entries = await Promise.all(
    [...byId.values()].map(async (post) => {
      const date = (post.scheduledFor || post.createdAt || "").slice(0, 10);
      const feedProposal = feedProposals.get(post._id);
      // Un post de feed sabe exactamente qué imagen es la suya
      // (proposals.rendered_image_path) — no hace falta adivinar por fecha
      // como con Stories, que es una aproximación (varios posts el mismo
      // día podían pisarse la imagen entre sí antes de este fix).
      const { imageUrl, outputPath } = feedProposal?.rendered_image_path
        ? { imageUrl: `${RAW_BASE_URL}/${feedProposal.rendered_image_path}`, outputPath: feedProposal.rendered_image_path }
        : await localImageFor(date);
      const brief = !feedProposal && outputPath ? localBriefs.get(outputPath) : undefined;
      return {
        id: post._id,
        date,
        status: post.status,
        content: post.content || "",
        kind: feedProposal ? "post" : "story",
        proposalId: feedProposal?.id || null,
        headline: feedProposal?.hook || feedProposal?.title || brief?.headline || null,
        kicker: brief?.kicker || null,
        oferta: feedProposal?.oferta || brief?.oferta || null,
        imageUrl,
        platforms: (post.platforms || []).map((p) => platformEntry(p, post)),
      };
    })
  );

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
