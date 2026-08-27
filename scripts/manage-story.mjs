// scripts/manage-story.mjs
// Acciones manuales sobre un post ya existente en Zernio, disparadas desde
// .github/workflows/manage-story.yml (workflow_dispatch). NUNCA genera
// contenido nuevo ni llama a Claude — reintentar reusa la misma imagen y
// caption que ya están en content/log/historial.json.
//
// Uso: node scripts/manage-story.mjs <post_id> <platform> <reintentar|despublicar>
// Env: ZERNIO_API_KEY, ZERNIO_INSTAGRAM_ACCOUNT_ID, ZERNIO_FACEBOOK_ACCOUNT_ID

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createPostAndPoll, unpublishPost, UNPUBLISH_SOPORTADO } from "./lib/zernio.mjs";

const ROOT = process.cwd();
const HISTORIAL_PATH = path.join(ROOT, "content/log/historial.json");

const [, , postId, platform, action] = process.argv;

const ACCOUNT_ID_BY_PLATFORM = {
  instagram: process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID,
  facebook: process.env.ZERNIO_FACEBOOK_ACCOUNT_ID,
};

async function reintentar(apiKey) {
  const historial = JSON.parse(await readFile(HISTORIAL_PATH, "utf8"));
  const post = historial.posts.find((p) => p.id === postId);

  if (!post) {
    console.error(
      `No encontré el post "${postId}" en content/log/historial.json. Corré primero "Sync Story History" para actualizarlo, o confirmá el ID.`
    );
    process.exit(1);
  }

  if (!post.imageUrl) {
    console.error(
      `El post "${postId}" (${post.date}) no tiene una imagen local en content/published/ — no puedo reintentar sin la imagen original.`
    );
    process.exit(1);
  }

  const accountId = ACCOUNT_ID_BY_PLATFORM[platform];
  if (!accountId) {
    console.error(`Falta configurar la cuenta de Zernio para "${platform}".`);
    process.exit(1);
  }

  console.log(`Reintentando "${platform}" para el post del ${post.date} (${post.imageUrl})...`);

  const result = await createPostAndPoll({
    apiKey,
    content: post.content,
    imageUrl: post.imageUrl,
    // Mismo platformSpecificData que usa publish-story.mjs para todas las
    // stories — no es un dato que varíe por post, así que no hace falta
    // leerlo de Zernio.
    platforms: [{ platform, accountId, platformSpecificData: { contentType: "story" } }],
  });

  console.log("Resultado:", JSON.stringify(result));

  if (result.existingPostId) {
    console.error(
      `Zernio marcó esto como contenido duplicado de las últimas 24hs (post existente: ${result.existingPostId}) — no se creó un post nuevo.`
    );
    process.exit(1);
  }

  if (!result.success) {
    console.error("El reintento falló — revisar el resultado de arriba.");
    process.exit(1);
  }

  console.log(
    result.reconciled
      ? `Reintento OK — resultó ser el mismo post de un intento anterior que sí había salido bien (${result.postId}), Zernio lo confirmó publicado en todas las plataformas.`
      : `Reintento OK — nuevo post: ${result.postId}`
  );
}

async function despublicar(apiKey) {
  if (!UNPUBLISH_SOPORTADO.includes(platform)) {
    console.error(
      `Zernio no soporta despublicar "${platform}" vía API (solo: ${UNPUBLISH_SOPORTADO.join(", ")}). Instagram/TikTok/Snapchat requieren borrado manual desde la app.`
    );
    process.exit(1);
  }

  console.log(`Despublicando "${platform}" del post "${postId}"...`);
  const result = await unpublishPost(postId, platform, apiKey);
  console.log("Resultado:", JSON.stringify(result));

  if (!result.success) {
    console.error("La despublicación falló — revisar el resultado de arriba.");
    process.exit(1);
  }

  console.log("Despublicado OK.");
}

async function main() {
  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) {
    console.error("Falta ZERNIO_API_KEY en el entorno.");
    process.exit(1);
  }

  if (!postId || !platform || !action) {
    console.error("Uso: node scripts/manage-story.mjs <post_id> <platform> <reintentar|despublicar>");
    process.exit(1);
  }

  if (!["instagram", "facebook"].includes(platform)) {
    console.error(`Plataforma "${platform}" no soportada acá (instagram|facebook).`);
    process.exit(1);
  }

  if (action === "reintentar") return reintentar(apiKey);
  if (action === "despublicar") return despublicar(apiKey);

  console.error(`Acción "${action}" no reconocida (reintentar|despublicar).`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
