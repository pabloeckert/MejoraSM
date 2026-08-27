// scripts/manage-post.mjs
// Acciones manuales sobre un post de feed ya existente en Zernio, disparadas
// desde .github/workflows/manage-post.yml (workflow_dispatch). Mismo patrón
// que scripts/manage-story.mjs, pero la fuente es la tabla `proposals` de
// Supabase (no content/log/historial.json) — ahí vive rendered_image_path,
// zernio_post_id y el copy original de cada post de feed. Es el "monitor de
// reversión" para posts ya publicados (PLAN_AUTONOMIA.md Fase 2): Instagram
// no soporta despublicar vía API (ver UNPUBLISH_SOPORTADO en lib/zernio.mjs),
// así que ahí sigue haciendo falta borrar a mano desde la app.
//
// Uso: node scripts/manage-post.mjs <proposal_id> <platform> <reintentar|despublicar>
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ZERNIO_API_KEY,
//      ZERNIO_INSTAGRAM_ACCOUNT_ID, ZERNIO_FACEBOOK_ACCOUNT_ID

import { createPostAndPoll, unpublishPost, UNPUBLISH_SOPORTADO } from "./lib/zernio.mjs";

const [, , proposalId, platform, action] = process.argv;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ACCOUNT_ID_BY_PLATFORM = {
  instagram: process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID,
  facebook: process.env.ZERNIO_FACEBOOK_ACCOUNT_ID,
};

function buildCaption(proposal) {
  return [proposal.hook, "", proposal.body, "", proposal.cta, "", ...(proposal.hashtags || [])]
    .filter(Boolean)
    .join("\n");
}

function restHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function fetchProposal() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/proposals?id=eq.${proposalId}&select=*`,
    { headers: restHeaders() }
  );
  if (!res.ok) {
    throw new Error(`Error consultando la propuesta: ${res.status} ${await res.text()}`);
  }
  const rows = await res.json();
  return rows[0];
}

async function markRejected(reason) {
  await fetch(`${SUPABASE_URL}/rest/v1/proposals?id=eq.${proposalId}`, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ status: "rejected", rejection_reason: reason }),
  });
}

async function reintentar(apiKey, proposal) {
  if (!proposal.rendered_image_path) {
    console.error(
      `La propuesta "${proposalId}" no tiene rendered_image_path — no puedo reintentar sin la imagen ya renderizada.`
    );
    process.exit(1);
  }

  const accountId = ACCOUNT_ID_BY_PLATFORM[platform];
  if (!accountId) {
    console.error(`Falta configurar la cuenta de Zernio para "${platform}".`);
    process.exit(1);
  }

  const imageUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/main/${proposal.rendered_image_path}`;
  console.log(`Reintentando "${platform}" para la propuesta ${proposalId} (${imageUrl})...`);

  const result = await createPostAndPoll({
    apiKey,
    content: buildCaption(proposal),
    imageUrl,
    platforms: [{ platform, accountId, platformSpecificData: { contentType: "post" } }],
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

async function despublicar(apiKey, proposal) {
  if (!UNPUBLISH_SOPORTADO.includes(platform)) {
    console.error(
      `Zernio no soporta despublicar "${platform}" vía API (solo: ${UNPUBLISH_SOPORTADO.join(", ")}). Instagram requiere borrado manual desde la app.`
    );
    process.exit(1);
  }
  if (!proposal.zernio_post_id) {
    console.error(`La propuesta "${proposalId}" no tiene zernio_post_id — no está publicada o falta sincronizar.`);
    process.exit(1);
  }

  console.log(`Despublicando "${platform}" del post "${proposal.zernio_post_id}"...`);
  const result = await unpublishPost(proposal.zernio_post_id, platform, apiKey);
  console.log("Resultado:", JSON.stringify(result));

  if (!result.success) {
    console.error("La despublicación falló — revisar el resultado de arriba.");
    process.exit(1);
  }

  await markRejected(`Despublicada a mano en ${platform} (workflow manage-post)`);
  console.log("Despublicado OK, propuesta marcada como rechazada.");
}

async function main() {
  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) {
    console.error("Falta ZERNIO_API_KEY en el entorno.");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.");
    process.exit(1);
  }
  if (!proposalId || !platform || !action) {
    console.error("Uso: node scripts/manage-post.mjs <proposal_id> <platform> <reintentar|despublicar>");
    process.exit(1);
  }
  if (!["instagram", "facebook"].includes(platform)) {
    console.error(`Plataforma "${platform}" no soportada acá (instagram|facebook).`);
    process.exit(1);
  }

  const proposal = await fetchProposal();
  if (!proposal) {
    console.error(`No encontré la propuesta "${proposalId}" en Supabase.`);
    process.exit(1);
  }

  if (action === "reintentar") return reintentar(apiKey, proposal);
  if (action === "despublicar") return despublicar(apiKey, proposal);

  console.error(`Acción "${action}" no reconocida (reintentar|despublicar).`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
