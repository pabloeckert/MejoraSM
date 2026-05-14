// supabase/functions/publisher/index.ts
// Publicador automático — publica contenido programado en Instagram
// Uso: POST /publisher { action: "publish" } o invocado por cron
// Requiere: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCorsHeaders,
  ValidationError,
  httpError,
  logger,
} from "../_shared/utils.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ═══════════════════════════════════════
// INSTAGRAM GRAPH API
// ═══════════════════════════════════════

interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

async function publishToInstagram(
  caption: string,
  imageUrl?: string
): Promise<PublishResult> {
  const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
  const accountId = Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID");

  if (!accessToken || !accountId) {
    return {
      success: false,
      error: "Instagram API no configurada (INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID)",
    };
  }

  try {
    // Paso 1: Crear media container
    const mediaBody: Record<string, string> = {
      caption,
      access_token: accessToken,
    };

    if (imageUrl) {
      mediaBody.image_url = imageUrl;
    }

    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mediaBody),
      }
    );

    if (!mediaRes.ok) {
      const err = await mediaRes.text();
      return { success: false, error: `Error creando media: ${err.slice(0, 200)}` };
    }

    const mediaData = await mediaRes.json();
    const containerId = mediaData.id;

    // Paso 2: Publicar el container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishRes.ok) {
      const err = await publishRes.text();
      return { success: false, error: `Error publicando: ${err.slice(0, 200)}` };
    }

    const publishData = await publishRes.json();
    return { success: true, postId: publishData.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════
// PUBLICADOR PRINCIPAL
// ═══════════════════════════════════════

async function publishScheduled() {
  const now = new Date().toISOString();

  // Buscar propuestas programadas cuya fecha ya pasó
  const { data: pending, error: queryError } = await supabase
    .from("proposals")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(5);

  if (queryError) throw new Error(`Error consultando propuestas: ${queryError.message}`);
  if (!pending || pending.length === 0) {
    return { message: "No hay propuestas pendientes de publicación", published: 0 };
  }

  const results = [];

  for (const proposal of pending) {
    // Construir caption
    const caption = [
      proposal.hook,
      "",
      proposal.body,
      "",
      proposal.cta,
      "",
      ...(proposal.hashtags || []),
    ]
      .filter(Boolean)
      .join("\n");

    // Publicar
    const result = await publishToInstagram(caption);

    if (result.success) {
      // Actualizar estado
      await supabase
        .from("proposals")
        .update({
          status: "published",
          published_at: now,
          instagram_post_id: result.postId,
        })
        .eq("id", proposal.id);

      // Actualizar evento de calendario vinculado
      if (proposal.id) {
        await supabase
          .from("calendar_events")
          .update({ status: "published" })
          .eq("proposal_id", proposal.id);
      }

      results.push({ id: proposal.id, status: "published", postId: result.postId });
    } else {
      // Marcar error pero no cambiar status (reintentar después)
      await supabase
        .from("proposals")
        .update({
          metadata: {
            last_publish_error: result.error,
            last_publish_attempt: now,
          },
        })
        .eq("id", proposal.id);

      results.push({ id: proposal.id, status: "error", error: result.error });
    }
  }

  return {
    message: `Procesadas ${results.length} propuestas`,
    published: results.filter((r) => r.status === "published").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  };
}

// ═══════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "publish";

    let result;

    switch (action) {
      case "publish":
        result = await publishScheduled();
        break;

      default:
        throw new Error(`Acción no válida: ${action}. Usa 'publish'`);
      }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    logger.error("publisher", "Request failed", { error: e instanceof Error ? e.message : String(e) });
    return httpError(corsHeaders, e);
  }
});
