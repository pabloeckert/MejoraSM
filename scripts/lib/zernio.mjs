// scripts/lib/zernio.mjs
// Publicación directa a Zernio (zernio.com), que a su vez publica en Instagram
// y Facebook por vos. Reemplaza la integración directa con la Graph API de Meta:
// mismo resultado, sin crear una app en developers.facebook.com.
//
// Env: ZERNIO_API_KEY, ZERNIO_INSTAGRAM_ACCOUNT_ID, ZERNIO_FACEBOOK_ACCOUNT_ID
// (alcanza con tener configurada una de las dos cuentas; la otra es opcional)

const ZERNIO_API_URL = "https://zernio.com/api/v1/posts";

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

  try {
    const res = await fetch(ZERNIO_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // El caption no se ve en Stories (ni en IG ni en FB) — se manda igual
      // porque no molesta y queda como referencia en el dashboard de Zernio.
      body: JSON.stringify({
        content: caption,
        mediaItems: [{ type: "image", url: imageUrl }],
        platforms,
        publishNow: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: JSON.stringify(data).slice(0, 300) };
    }

    // data.post.platforms trae el resultado por plataforma (instagram/facebook
    // pueden fallar independientemente aunque la llamada general sea 200 OK)
    const perPlatform = data.post?.platforms || [];
    const failed = perPlatform.filter((p) => p.status !== "published");

    return {
      success: failed.length === 0,
      postId: data.post?._id,
      platforms: perPlatform,
      error: failed.length > 0 ? JSON.stringify(failed).slice(0, 300) : undefined,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
