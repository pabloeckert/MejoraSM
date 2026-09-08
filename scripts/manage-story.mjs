// scripts/manage-story.mjs
// Acciones manuales sobre un post ya existente en Zernio, disparadas desde
// .github/workflows/manage-story.yml (workflow_dispatch). NUNCA genera
// contenido nuevo ni llama a Claude — reintentar reusa la misma imagen y
// caption que ya están en content/log/historial.json.
//
// Uso: node scripts/manage-story.mjs <post_id> <platform> <reintentar|despublicar>
// Env: ZERNIO_API_KEY, ZERNIO_INSTAGRAM_ACCOUNT_ID, ZERNIO_FACEBOOK_ACCOUNT_ID,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (solo para logRun — nunca frena
//      el script si faltan, ver scripts/lib/run-log.mjs)

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createPostAndPoll, unpublishPost, UNPUBLISH_SOPORTADO } from "./lib/zernio.mjs";
import { logRun, startTimer } from "./lib/run-log.mjs";

const ROOT = process.cwd();
const HISTORIAL_PATH = path.join(ROOT, "content/log/historial.json");

const elapsed = startTimer();

const [, , postId, platform, action] = process.argv;

const ACCOUNT_ID_BY_PLATFORM = {
  instagram: process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID,
  facebook: process.env.ZERNIO_FACEBOOK_ACCOUNT_ID,
};

async function reintentar(apiKey) {
  const historial = JSON.parse(await readFile(HISTORIAL_PATH, "utf8"));
  const post = historial.posts.find((p) => p.id === postId);

  if (!post) {
    throw new Error(
      `No encontré el post "${postId}" en content/log/historial.json. Corré primero "Sync Story History" para actualizarlo, o confirmá el ID.`
    );
  }

  if (!post.imageUrl) {
    throw new Error(
      `El post "${postId}" (${post.date}) no tiene una imagen local en content/published/ — no puedo reintentar sin la imagen original.`
    );
  }

  const accountId = ACCOUNT_ID_BY_PLATFORM[platform];
  if (!accountId) {
    throw new Error(`Falta configurar la cuenta de Zernio para "${platform}".`);
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
    throw new Error(
      `Zernio marcó esto como contenido duplicado de las últimas 24hs (post existente: ${result.existingPostId}) — no se creó un post nuevo.`
    );
  }

  if (!result.success) {
    throw new Error("El reintento falló — revisar el resultado de arriba.");
  }

  console.log(
    result.reconciled
      ? `Reintento OK — resultó ser el mismo post de un intento anterior que sí había salido bien (${result.postId}), Zernio lo confirmó publicado en todas las plataformas.`
      : `Reintento OK — nuevo post: ${result.postId}`
  );
}

async function despublicar(apiKey) {
  if (!UNPUBLISH_SOPORTADO.includes(platform)) {
    throw new Error(
      `Zernio no soporta despublicar "${platform}" vía API (solo: ${UNPUBLISH_SOPORTADO.join(", ")}). Instagram/TikTok/Snapchat requieren borrado manual desde la app.`
    );
  }

  console.log(`Despublicando "${platform}" del post "${postId}"...`);
  const result = await unpublishPost(postId, platform, apiKey);
  console.log("Resultado:", JSON.stringify(result));

  if (!result.success) {
    throw new Error("La despublicación falló — revisar el resultado de arriba.");
  }

  console.log(result.alreadyGone ? "El post ya no estaba en la plataforma — objetivo cumplido." : "Despublicado OK.");
}

async function main() {
  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) {
    throw new Error("Falta ZERNIO_API_KEY en el entorno.");
  }

  if (!postId || !platform || !action) {
    throw new Error("Uso: node scripts/manage-story.mjs <post_id> <platform> <reintentar|despublicar>");
  }

  if (!["instagram", "facebook"].includes(platform)) {
    throw new Error(`Plataforma "${platform}" no soportada acá (instagram|facebook).`);
  }

  if (action !== "reintentar" && action !== "despublicar") {
    throw new Error(`Acción "${action}" no reconocida (reintentar|despublicar).`);
  }

  await (action === "reintentar" ? reintentar(apiKey) : despublicar(apiKey));
  await logRun({ source: "manage-story", step: action, status: "success", durationMs: elapsed(), metadata: { postId, platform } });
}

main().catch(async (e) => {
  // Mismo hallazgo real que manage-post.mjs (2026-09-08): este script no
  // tenía NINGÚN logRun — un reintento/despublicación fallido no dejaba
  // ningún rastro en Auditoría, a diferencia del resto del pipeline.
  console.error(e?.message || e);
  await logRun({ source: "manage-story", step: action || "unknown", status: "error", durationMs: elapsed(), error: String(e?.message || e), metadata: { postId: postId || null, platform: platform || null } });
  process.exit(1);
});
