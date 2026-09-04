// scripts/lib/zernio.mjs
// Publicación directa a Zernio (zernio.com), que a su vez publica en Instagram
// y Facebook por vos. Reemplaza la integración directa con la Graph API de Meta:
// mismo resultado, sin crear una app en developers.facebook.com.
//
// Env: ZERNIO_API_KEY, ZERNIO_INSTAGRAM_ACCOUNT_ID, ZERNIO_FACEBOOK_ACCOUNT_ID
// (alcanza con tener configurada una de las dos cuentas; la otra es opcional)

import { readFile } from "node:fs/promises";
import path from "node:path";

const ZERNIO_API_URL = "https://zernio.com/api/v1/posts";
const ZERNIO_UPLOAD_URL = "https://zernio.com/api/v1/media/upload-direct";

// Instagram procesa el media de forma asíncrona (container de Meta): un
// status "processing"/"awaiting-finalize" recién creado es normal, no un
// fallo — se resuelve solo unos segundos después. Reconsultamos el post
// antes de darlo por perdido (docs.zernio.com: "Fetch the post back — its
// status tells you exactly where it is in the pipeline").
//
// Hallazgo real 2026-08-27, ronda de pruebas end-to-end: con 4 intentos x
// 8s (32s totales), un post real de prueba se marcó "failed" en este script
// pese a que Instagram terminó de procesarlo poco después — confirmado
// contra el historial real de Zernio minutos más tarde (published, con URL
// real). El corte de 32s era demasiado corto para el caso real observado.
// Subido a 8 intentos x 10s (80s totales) — sigue acotado (no cuelga el
// job para siempre) pero le da más margen real a Meta antes de rendirse.
const POLL_ATTEMPTS = 8;
const POLL_DELAY_MS = 10000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Todas las llamadas a Zernio con un tope de tiempo — sin esto, una conexión
// colgada bloquea la corrida de GitHub Actions hasta el límite de 6h del job.
// 45s alcanza de sobra: la parte lenta (Meta procesando el media) se maneja
// aparte con el poll de fetchPostPlatforms, no dentro de una sola request.
const ZERNIO_FETCH_TIMEOUT_MS = 45000;
const zfetch = (url, init = {}) =>
  fetch(url, { ...init, signal: AbortSignal.timeout(ZERNIO_FETCH_TIMEOUT_MS) });

// Parsea el body como JSON sin tirar si Zernio devuelve HTML (502/504 de gateway,
// página de error) — así el error real (status HTTP) sobrevive en vez de
// convertirse en "Unexpected token '<'".
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function fetchPostPlatforms(postId, apiKey) {
  let res;
  try {
    res = await zfetch(`${ZERNIO_API_URL}/${postId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    return null; // blip de red durante el poll — se reintenta en la vuelta siguiente
  }
  if (!res.ok) return null;
  const data = await safeJson(res);
  return data.post?.platforms || null;
}

// Crea un post (POST /v1/posts) y reconsulta hasta POLL_ATTEMPTS veces antes
// de dar por perdida una plataforma que todavía no terminó de procesar.
// Compartido por publishStory() (todas las plataformas configuradas) y por
// el reintento manual de una sola plataforma (scripts/manage-story.mjs).
// imageUrl acepta una sola URL (post/story) o un array de URLs (carrusel —
// Zernio las publica en el orden del array, ver publishPost()).
export async function createPostAndPoll({ apiKey, content, imageUrl, platforms }) {
  try {
    const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
    const res = await zfetch(ZERNIO_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        mediaItems: urls.map((url) => ({ type: "image", url })),
        platforms,
        publishNow: true,
      }),
    });

    const data = await safeJson(res);
    if (!res.ok) {
      // 409 = Zernio detectó contenido duplicado dentro de las últimas 24hs
      // y no creó un post nuevo — viene con existingPostId.
      //
      // Hallazgo real 2026-08-27, mismo caso que motivó subir el polling de
      // arriba: si el intento ANTERIOR se declaró "failed" acá por un
      // timeout de polling corto, pero en realidad terminó publicando bien
      // unos segundos después, un reintento choca con este 409 — y hasta
      // ahora eso se reportaba como un fallo más, escondiendo que la pieza
      // real ya está publicada de verdad. Antes de devolver error, se
      // reconsulta el post existente — si ya está publicado en todas las
      // plataformas pedidas, se lo trata como éxito real (self-healing),
      // en vez de dejar a quien reintenta creyendo que no salió nada.
      if (data.existingPostId) {
        const existing = await fetchPostPlatforms(data.existingPostId, apiKey);
        if (existing && existing.every((p) => p.status === "published")) {
          return { success: true, postId: data.existingPostId, platforms: existing, reconciled: true };
        }
      }
      return {
        success: false,
        // Mismo hallazgo que el corte de abajo: 300 caracteres es
        // demasiado poco para un error real de la API — se sube a 2000
        // (igual se corta algo si Zernio devuelve un payload gigante, pero
        // ya no pierde el mensaje real por un límite arbitrario chico).
        error: JSON.stringify(data).slice(0, 2000),
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

    // Hallazgo real 2026-08-26/27: acá se truncaba JSON.stringify(failed) a
    // 300 caracteres, pero cada elemento de failed trae el objeto accountId
    // COMPLETO (incluida la URL larga de la foto de perfil de Instagram) —
    // eso solo ya come los 300 caracteres, y el campo real que explica el
    // fallo (status/error/reason de Zernio) nunca sobrevivía al corte.
    // Ahora se arma un resumen chico por plataforma, sin el accountId.
    const failedSummary = failed.map((p) => ({
      platform: p.platform,
      status: p.status,
      error: p.error ?? p.errorMessage ?? p.reason ?? p.message ?? null,
    }));

    return {
      success: failed.length === 0,
      postId,
      platforms: perPlatform,
      error: failed.length > 0 ? JSON.stringify(failedSummary) : undefined,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Fase 6 del plan de publicación 2026 — Reels armados de fotos.
// Sube un archivo local (video mp4) a Zernio y devuelve su URL pública.
// POST /v1/media/upload-direct acepta multipart hasta 25MB — un reel de
// ~10s en 1080x1920 H.264 pesa 2-5MB, sobra.
export async function uploadMedia(filePath, apiKey, contentType = "video/mp4") {
  const buf = await readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buf], { type: contentType }), path.basename(filePath));
  form.append("contentType", contentType);
  const res = await fetch(ZERNIO_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    // El upload de video puede tardar — tope más holgado que el resto.
    signal: AbortSignal.timeout(120000),
  });
  const data = await safeJson(res);
  if (!res.ok || !data.url) {
    throw new Error(`Zernio upload-direct ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  }
  return data.url;
}

// Publica un reel (video vertical) en Instagram y Facebook. En Instagram, un
// mediaItem de tipo "video" sin contentType "story" se publica como Reel
// automáticamente (openapi: "Default posts become Reels or feed depending on
// media"). shareToFeed=true → aparece también en el perfil.
export async function publishReel(videoPath, caption = "") {
  const apiKey = process.env.ZERNIO_API_KEY;
  const igAccountId = process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID;
  const fbAccountId = process.env.ZERNIO_FACEBOOK_ACCOUNT_ID;

  if (!apiKey) return { success: false, error: "Falta ZERNIO_API_KEY en el entorno." };

  let videoUrl;
  try {
    videoUrl = await uploadMedia(videoPath, apiKey, "video/mp4");
  } catch (e) {
    return { success: false, error: e.message };
  }

  const platforms = [];
  if (igAccountId) {
    platforms.push({
      platform: "instagram",
      accountId: igAccountId,
      platformSpecificData: { shareToFeed: true },
    });
  }
  if (fbAccountId) {
    platforms.push({ platform: "facebook", accountId: fbAccountId });
  }
  if (platforms.length === 0) {
    return { success: false, error: "Falta configurar ZERNIO_INSTAGRAM_ACCOUNT_ID y/o ZERNIO_FACEBOOK_ACCOUNT_ID." };
  }

  return createPostAndPollVideo({ apiKey, content: caption, videoUrl, platforms });
}

// Igual que createPostAndPoll pero con un mediaItem de video. Se deja aparte
// para no meterle un branch más a la función de imágenes, que ya es densa.
async function createPostAndPollVideo({ apiKey, content, videoUrl, platforms }) {
  try {
    const res = await zfetch(ZERNIO_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        mediaItems: [{ type: "video", url: videoUrl }],
        platforms,
        publishNow: true,
      }),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      if (data.existingPostId) {
        const existing = await fetchPostPlatforms(data.existingPostId, apiKey);
        if (existing && existing.every((p) => p.status === "published")) {
          return { success: true, postId: data.existingPostId, platforms: existing, reconciled: true };
        }
      }
      return { success: false, error: JSON.stringify(data).slice(0, 2000), existingPostId: data.existingPostId };
    }

    let perPlatform = data.post?.platforms || [];
    const postId = data.post?._id;
    // El procesamiento de video tarda más que el de imagen — se le da más margen.
    for (let attempt = 0; attempt < POLL_ATTEMPTS * 2; attempt++) {
      const pending = perPlatform.filter((p) => p.status !== "published" && p.status !== "failed");
      if (pending.length === 0) break;
      await sleep(POLL_DELAY_MS);
      const refreshed = postId ? await fetchPostPlatforms(postId, apiKey) : null;
      if (refreshed) perPlatform = refreshed;
    }

    const failed = perPlatform.filter((p) => p.status !== "published");
    const failedSummary = failed.map((p) => ({
      platform: p.platform,
      status: p.status,
      error: p.error ?? p.errorMessage ?? p.reason ?? p.message ?? null,
    }));
    return {
      success: failed.length === 0,
      postId,
      platforms: perPlatform,
      error: failed.length > 0 ? JSON.stringify(failedSummary) : undefined,
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
// de referencia interno. imageUrl puede ser un array (carrusel) — createPostAndPoll
// ya soporta ambos casos.
export async function publishPost(imageUrl, caption = "") {
  const apiKey = process.env.ZERNIO_API_KEY;
  const igAccountId = process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID;
  const fbAccountId = process.env.ZERNIO_FACEBOOK_ACCOUNT_ID;
  // Fase 5 del plan de publicación 2026 — LinkedIn. Queda desactivado hasta
  // que Pablo conecte la cuenta de LinkedIn en Zernio y cargue este secret;
  // apenas exista, los posts de feed salen también a LinkedIn sin tocar nada
  // más. LinkedIn no tiene "stories", así que publishStory() no lo incluye.
  const liAccountId = process.env.ZERNIO_LINKEDIN_ACCOUNT_ID;

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
  if (liAccountId) {
    platforms.push({
      platform: "linkedin",
      accountId: liAccountId,
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
    const res = await zfetch(`${ZERNIO_API_URL}/${postId}/unpublish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ platform }),
    });

    const data = await safeJson(res);
    if (!res.ok) {
      const errStr = JSON.stringify(data);
      // Si el post ya no existe en la plataforma (Pablo lo borró a mano, o
      // Meta lo bajó), el objetivo —que no esté visible— ya está cumplido.
      // No es un fallo: se trata como éxito para que el Monitor lo marque
      // resuelto en vez de dejar un rojo que asusta.
      if (/no longer exists|was deleted|does not exist|not visible|removed by (facebook|instagram|meta)|unsupported get request/i.test(errStr)) {
        return { success: true, alreadyGone: true, message: "El post ya no existe en la plataforma — nada que despublicar." };
      }
      return { success: false, error: errStr.slice(0, 2000) };
    }
    return { success: true, message: data.message };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
