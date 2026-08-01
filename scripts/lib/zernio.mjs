// scripts/lib/zernio.mjs
// Publicación directa a Zernio (zernio.com), que a su vez publica en Instagram
// y Facebook por vos. Reemplaza la integración directa con la Graph API de Meta:
// mismo resultado, sin crear una app en developers.facebook.com.
//
// Env: ZERNIO_API_KEY, ZERNIO_INSTAGRAM_ACCOUNT_ID, ZERNIO_FACEBOOK_ACCOUNT_ID
// (alcanza con tener configurada una de las dos cuentas; la otra es opcional)

const ZERNIO_API_URL = "https://zernio.com/api/v1/posts";

// Instagram procesa el media de forma asíncrona (container de Meta): un
// status "processing"/"awaiting-finalize" recién creado es normal, no un
// fallo — se resuelve solo unos segundos después. Reconsultamos el post
// antes de darlo por perdido (docs.zernio.com: "Fetch the post back — its
// status tells you exactly where it is in the pipeline").
const POLL_ATTEMPTS = 4;
const POLL_DELAY_MS = 8000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPostPlatforms(postId, apiKey) {
  const res = await fetch(`${ZERNIO_API_URL}/${postId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.post?.platforms || null;
}

// Crea un post (POST /v1/posts) y reconsulta hasta POLL_ATTEMPTS veces antes
// de dar por perdida una plataforma que todavía no terminó de procesar.
// Compartido por publishStory() (todas las plataformas configuradas) y por
// el reintento manual de una sola plataforma (scripts/manage-story.mjs).
export async function createPostAndPoll({ apiKey, content, imageUrl, platforms }) {
  try {
    const res = await fetch(ZERNIO_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        mediaItems: [{ type: "image", url: imageUrl }],
        platforms,
        publishNow: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      // 409 = Zernio detectó contenido duplicado dentro de las últimas 24hs
      // y no creó un post nuevo — viene con existingPostId, útil para no
      // confundirlo con un fallo genérico.
      return {
        success: false,
        error: JSON.stringify(data).slice(0, 300),
        existingPostId: data.existingPostId,
      };
    }

    // data.post.platforms trae el resultado por plataforma (instagram/facebook
    // pueden fallar independientemente aunque la llamada general sea 200 OK)
    let perPlatform = data.post?.platforms || [];
    const postId = data.post?._id;

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      const pending = perPlatform.filter(
        (p) => p.status !== "published" && p.status !== "failed"
      );
      if (pending.length === 0) break;
      await sleep(POLL_DELAY_MS);
      const refreshed = postId ? await fetchPostPlatforms(postId, apiKey) : null;
      if (refreshed) perPlatform = refreshed;
    }

    const failed = perPlatform.filter((p) => p.status !== "published");

    return {
      success: failed.length === 0,
      postId,
      platforms: perPlatform,
      error: failed.length > 0 ? JSON.stringify(failed).slice(0, 300) : undefined,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function publishStory(imageUrl, caption = "") {
  const apiKey = process.env.ZERNIO_API_KEY;
  const igAccountId = process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID;
  const fbAccountId = process.env.ZERNIO_FACEBOOK_ACCOUNT_ID;

  if (!apiKey) {
    return { success: false, error: "Falta ZERNIO_API_KEY en el entorno." };
  }

  const platforms = [];
  if (igAccountId) {
    platforms.push({
      platform: "instagram",
      accountId: igAccountId,
      platformSpecificData: { contentType: "story" },
    });
  }
  if (fbAccountId) {
    platforms.push({
      platform: "facebook",
      accountId: fbAccountId,
      platformSpecificData: { contentType: "story" },
    });
  }

  if (platforms.length === 0) {
    return {
      success: false,
      error: "Falta configurar ZERNIO_INSTAGRAM_ACCOUNT_ID y/o ZERNIO_FACEBOOK_ACCOUNT_ID.",
    };
  }

  // El caption no se ve en Stories (ni en IG ni en FB) — se manda igual
  // porque no molesta y queda como referencia en el dashboard de Zernio.
  return createPostAndPoll({ apiKey, content: caption, imageUrl, platforms });
}

// Gemela de publishStory() para posts de feed (EDA, scripts/publish-scheduled-posts.mjs):
// mismo mecanismo (createPostAndPoll), único cambio real es contentType
// "post" en vez de "story". A diferencia de las Stories, acá el caption SÍ
// se ve en el feed — se manda el copy completo de la propuesta, no un texto
// de referencia interno.
export async function publishPost(imageUrl, caption = "") {
  const apiKey = process.env.ZERNIO_API_KEY;
  const igAccountId = process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID;
  const fbAccountId = process.env.ZERNIO_FACEBOOK_ACCOUNT_ID;

  if (!apiKey) {
    return { success: false, error: "Falta ZERNIO_API_KEY en el entorno." };
  }

  const platforms = [];
  if (igAccountId) {
    platforms.push({
      platform: "instagram",
      accountId: igAccountId,
      platformSpecificData: { contentType: "post" },
    });
  }
  if (fbAccountId) {
    platforms.push({
      platform: "facebook",
      accountId: fbAccountId,
      platformSpecificData: { contentType: "post" },
    });
  }

  if (platforms.length === 0) {
    return {
      success: false,
      error: "Falta configurar ZERNIO_INSTAGRAM_ACCOUNT_ID y/o ZERNIO_FACEBOOK_ACCOUNT_ID.",
    };
  }

  return createPostAndPoll({ apiKey, content: caption, imageUrl, platforms });
}

// Plataformas que Zernio permite despublicar vía API (docs.zernio.com,
// endpoint POST /v1/posts/{id}/unpublish). Instagram, TikTok y Snapchat NO
// están soportados — hay que verificarlo ahí antes de llamar, no asumir.
export const UNPUBLISH_SOPORTADO = [
  "threads", "facebook", "twitter", "linkedin", "youtube",
  "pinterest", "reddit", "bluesky", "googlebusiness", "telegram",
];

export async function unpublishPost(postId, platform, apiKey) {
  if (!UNPUBLISH_SOPORTADO.includes(platform)) {
    return {
      success: false,
      error: `Zernio no soporta despublicar "${platform}" vía API (solo: ${UNPUBLISH_SOPORTADO.join(", ")}). Instagram/TikTok/Snapchat requieren borrado manual.`,
    };
  }

  try {
    const res = await fetch(`${ZERNIO_API_URL}/${postId}/unpublish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ platform }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: JSON.stringify(data).slice(0, 300) };
    }
    return { success: true, message: data.message };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
