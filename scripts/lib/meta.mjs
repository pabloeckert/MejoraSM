// scripts/lib/meta.mjs
// Publicación directa a la Graph API de Meta, sin pasar por Supabase.
//   - Instagram: Story (media_type=STORIES) vía contenedor + media_publish
//   - Facebook: foto en la Página (/{page-id}/photos)
//
// Env: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID,
//      FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID

const GRAPH = "https://graph.facebook.com/v25.0";

// La API de Stories no acepta caption: el texto va compuesto dentro de la imagen.
export async function publishInstagramStory(imageUrl) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!token || !accountId) {
    return { success: false, error: "Instagram no configurado (INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_BUSINESS_ACCOUNT_ID)" };
  }

  try {
    const containerRes = await fetch(`${GRAPH}/${accountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "STORIES", image_url: imageUrl, access_token: token }),
    });
    if (!containerRes.ok) {
      return { success: false, error: `container: ${(await containerRes.text()).slice(0, 200)}` };
    }
    const { id: creationId } = await containerRes.json();

    const publishRes = await fetch(`${GRAPH}/${accountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    });
    if (!publishRes.ok) {
      return { success: false, error: `publish: ${(await publishRes.text()).slice(0, 200)}` };
    }
    const { id } = await publishRes.json();
    return { success: true, postId: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function publishFacebookPhoto(imageUrl, message = "") {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!token || !pageId) {
    return { success: false, error: "Facebook no configurado (FACEBOOK_PAGE_ACCESS_TOKEN / FACEBOOK_PAGE_ID)" };
  }

  try {
    const res = await fetch(`${GRAPH}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imageUrl, message, access_token: token }),
    });
    if (!res.ok) {
      return { success: false, error: `${(await res.text()).slice(0, 200)}` };
    }
    const data = await res.json();
    return { success: true, postId: data.post_id || data.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
