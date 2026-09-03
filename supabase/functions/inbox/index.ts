// supabase/functions/inbox/index.ts
// Fase 1 del plan de publicación 2026 — Bandeja de conversaciones.
//
// Trae comentarios y DMs de Instagram + Facebook desde Zernio, los clasifica
// por sentimiento (LLM) y los guarda en inbox_items. También redacta una
// respuesta sugerida en la voz de marca (draft) y la envía cuando Pablo/
// Sindy dan el OK (reply) — nunca automático.
//
// Acciones:
//   { action: "sync" }                       → cron / botón "Actualizar"
//   { action: "draft", itemId }              → respuesta sugerida (no envía)
//   { action: "reply", itemId, message }     → manda a Zernio + marca respondido

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { logRun } from "../_shared/runLog.ts";

const ZERNIO_API = "https://zernio.com/api/v1";
// IDs de cuenta de Zernio (no son secretos — identifican la cuenta, no autentican).
const ACCOUNTS = [
  { platform: "instagram", id: "6a56405a3ecd8aa344faecae" },
  { platform: "facebook", id: "6a5640333ecd8aa344fadb4b" },
];
const RECENT_POSTS_FOR_COMMENTS = 6; // los comentarios solo se pueden traer de posts recientes
const DM_CONVERSATIONS = 30;

const ALLOWED_ORIGINS = [
  "https://pabloeckert.github.io",
  "https://mejorasm.mejoraok.com",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function zHeaders() {
  const key = Deno.env.get("ZERNIO_API_KEY");
  if (!key) throw new Error("ZERNIO_API_KEY no configurada");
  return { Authorization: `Bearer ${key}` };
}

async function zGet(path: string) {
  const res = await fetch(`${ZERNIO_API}${path}`, { headers: zHeaders() });
  if (!res.ok) throw new Error(`Zernio GET ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function zPost(path: string, body: unknown) {
  const res = await fetch(`${ZERNIO_API}${path}`, {
    method: "POST",
    headers: { ...zHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Zernio POST ${path} → ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

// ═══════════════════════════════════════
// LLM — sentimiento + draft
// ═══════════════════════════════════════

async function callLLM(system: string, user: string, maxTokens = 400): Promise<string> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
      });
      if (r.ok) return ((await r.json()).content?.[0]?.text ?? "").trim();
      console.warn(`[inbox] Anthropic ${r.status}, fallback a Groq`);
    } catch (e) {
      console.warn(`[inbox] Anthropic falló (${errMsg(e)}), fallback a Groq`);
    }
  }
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) throw new Error("Sin ANTHROPIC_API_KEY ni GROQ_API_KEY");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  return ((await r.json()).choices?.[0]?.message?.content ?? "").trim();
}

const VALID_SENT = ["positivo", "neutral", "negativo", "pregunta"];

async function classifyBatch(items: { id: string; text: string }[]): Promise<Record<string, { s: string; n: string }>> {
  if (items.length === 0) return {};
  const system =
    "Clasificás mensajes/comentarios que la gente le deja a una marca de consultoría empresarial (Mejora Continua). " +
    "Devolvés SOLO un array JSON, un objeto por mensaje: [{\"n\":1,\"s\":\"pregunta\",\"nota\":\"pide info de precios\"}, ...]\n" +
    "s ∈ {positivo, neutral, negativo, pregunta}. " +
    "'pregunta' = pide info o espera respuesta (aunque el tono sea neutro). " +
    "'negativo' = queja, reclamo, enojo. 'positivo' = elogio, agradecimiento, interés genuino. " +
    "'neutral' = spam, publicidad ajena, saludos vacíos, cosas que no requieren acción.\n" +
    "nota = 3 a 6 palabras sobre qué quiere. Sin texto fuera del array JSON.";
  const user = items.map((i, idx) => `${idx + 1}. ${(i.text || "(sin texto)").slice(0, 400).replace(/\s+/g, " ")}`).join("\n");
  const out = await callLLM(system, user, 60 + items.length * 40);
  const map: Record<string, { s: string; n: string }> = {};

  const jsonMatch = out.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const arr = JSON.parse(jsonMatch[0]) as Array<{ n?: number; s?: string; nota?: string }>;
      for (const row of arr) {
        const item = items[Number(row.n) - 1];
        const s = String(row.s || "").toLowerCase().trim();
        if (item && VALID_SENT.includes(s)) map[item.id] = { s, n: String(row.nota || "").trim().slice(0, 120) };
      }
    } catch {
      /* cae al parser de líneas abajo */
    }
  }
  if (Object.keys(map).length === 0) {
    // Fallback tolerante: "1 ... pregunta ... nota" en cualquier separador.
    for (const line of out.split("\n")) {
      const m = line.match(/(\d{1,3})\D+(positivo|neutral|negativo|pregunta)\D+(.+)/i);
      if (!m) continue;
      const item = items[Number(m[1]) - 1];
      if (item) map[item.id] = { s: m[2].toLowerCase(), n: m[3].replace(/["\]}]+$/, "").trim().slice(0, 120) };
    }
  }
  return map;
}

async function getBrandContext(query: string): Promise<string> {
  // RAG simple contra el Manual de Marca (mismos chunks que usa orchestrator).
  try {
    const hfKey = Deno.env.get("HF_API_KEY");
    if (!hfKey) throw new Error("no HF");
    const er = await fetch(
      "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: [query], options: { wait_for_model: true } }),
      }
    );
    const emb = (await er.json())?.[0];
    if (!Array.isArray(emb)) throw new Error("no emb");
    const { data } = await supabase.rpc("match_documents", { query_embedding: emb, match_count: 4 });
    return (data ?? []).map((c: { content: string }) => c.content).join("\n---\n").slice(0, 3000);
  } catch {
    const { data } = await supabase.from("doc_chunks").select("content").limit(4);
    return (data ?? []).map((c: { content: string }) => c.content).join("\n---\n").slice(0, 3000);
  }
}

// ═══════════════════════════════════════
// SYNC
// ═══════════════════════════════════════

interface RawItem {
  kind: "comment" | "dm";
  platform: string;
  account_id: string;
  thread_id: string;
  external_id: string;
  author_name: string | null;
  author_username: string | null;
  author_is_follower: boolean | null;
  text: string;
  attachment_url: string | null;
  direction: "incoming" | "outgoing";
  item_time: string | null;
}

async function collectDMs(): Promise<RawItem[]> {
  const items: RawItem[] = [];
  for (const acc of ACCOUNTS) {
    let convos: Array<Record<string, unknown>> = [];
    try {
      const r = await zGet(`/inbox/conversations?accountId=${acc.id}&limit=${DM_CONVERSATIONS}`);
      convos = (r.data ?? []) as Array<Record<string, unknown>>;
    } catch (e) {
      console.warn(`[inbox] conversaciones ${acc.platform}: ${errMsg(e)}`);
      continue;
    }
    for (const c of convos) {
      // Traemos los últimos mensajes reales del hilo (no solo lastMessage).
      let msgs: Array<Record<string, unknown>> = [];
      try {
        const mr = await zGet(`/inbox/conversations/${c.id}/messages?accountId=${acc.id}`);
        msgs = (mr.messages ?? []).slice(-8) as Array<Record<string, unknown>>;
      } catch {
        msgs = [{ id: `${c.id}-last`, message: c.lastMessage, direction: "incoming", createdAt: c.updatedTime }];
      }
      const igp = (c.instagramProfile ?? null) as { isFollower?: boolean } | null;
      for (const m of msgs) {
        const att = (m.attachments as Array<{ url?: string }> | undefined)?.[0]?.url ?? null;
        const dir = m.direction === "outgoing" ? "outgoing" : "incoming";
        items.push({
          kind: "dm",
          platform: acc.platform,
          account_id: acc.id,
          thread_id: String(c.id),
          external_id: String(m.id ?? `${c.id}-${m.createdAt}`),
          author_name: (c.participantName as string) ?? null,
          author_username: (c.participantUsername as string) ?? null,
          author_is_follower: igp?.isFollower ?? null,
          text: (m.message as string) || (att ? "[adjunto]" : ""),
          attachment_url: att,
          direction: dir,
          item_time: (m.createdAt as string) ?? (c.updatedTime as string) ?? null,
        });
      }
    }
  }
  return items;
}

async function collectComments(): Promise<RawItem[]> {
  const items: RawItem[] = [];
  for (const acc of ACCOUNTS) {
    let posts: Array<Record<string, unknown>> = [];
    try {
      const r = await zGet(`/posts?accountId=${acc.id}&page=1&limit=${RECENT_POSTS_FOR_COMMENTS}`);
      posts = (r.posts ?? []) as Array<Record<string, unknown>>;
    } catch (e) {
      console.warn(`[inbox] posts ${acc.platform}: ${errMsg(e)}`);
      continue;
    }
    for (const p of posts) {
      if (p.status !== "published") continue;
      let comments: Array<Record<string, unknown>> = [];
      try {
        const cr = await zGet(`/inbox/comments/${p._id}?accountId=${acc.id}`);
        comments = (cr.comments ?? []) as Array<Record<string, unknown>>;
      } catch {
        continue; // posts viejos devuelven "Platform error 100" — normal, se saltean
      }
      for (const cm of comments) {
        const isOurs = cm.isOwnComment === true || cm.fromPage === true;
        items.push({
          kind: "comment",
          platform: acc.platform,
          account_id: acc.id,
          thread_id: String(p._id),
          external_id: String(cm.id ?? cm.commentId ?? ""),
          author_name: (cm.authorName as string) ?? (cm.from as { name?: string })?.name ?? null,
          author_username: (cm.authorUsername as string) ?? (cm.username as string) ?? null,
          author_is_follower: null,
          text: (cm.text as string) || (cm.message as string) || "",
          attachment_url: null,
          direction: isOurs ? "outgoing" : "incoming",
          item_time: (cm.createdTime as string) ?? (cm.timestamp as string) ?? null,
        });
      }
    }
  }
  return items.filter((i) => i.external_id);
}

async function sync() {
  const [dms, comments] = await Promise.all([collectDMs(), collectComments()]);
  const all = [...dms, ...comments];

  // Upsert todo (ignora duplicados por el UNIQUE).
  let upserted = 0;
  for (const it of all) {
    const { error } = await supabase.from("inbox_items").upsert(
      {
        kind: it.kind,
        platform: it.platform,
        account_id: it.account_id,
        thread_id: it.thread_id,
        external_id: it.external_id,
        author_name: it.author_name,
        author_username: it.author_username,
        author_is_follower: it.author_is_follower,
        text: it.text,
        attachment_url: it.attachment_url,
        direction: it.direction,
        item_time: it.item_time,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "kind,platform,external_id", ignoreDuplicates: false }
    );
    if (!error) upserted++;
  }

  // Clasificar sentimiento: todos los entrantes con texto que todavía no
  // tienen etiqueta (no solo los de esta corrida — así los que fallaron
  // antes se reintentan). Tope de 90 por corrida para no comerse el
  // presupuesto de LLM.
  const { data: pending } = await supabase
    .from("inbox_items")
    .select("id, text")
    .eq("direction", "incoming")
    .is("sentiment", null)
    .not("text", "is", null)
    .neq("text", "")
    .order("item_time", { ascending: false })
    .limit(90);
  const toClassify = (pending ?? []).filter((r: { text: string | null }) => (r.text ?? "").trim().length > 0);

  let classified = 0;
  for (let i = 0; i < toClassify.length; i += 10) {
    const batch = toClassify.slice(i, i + 10) as { id: string; text: string }[];
    try {
      let res = await classifyBatch(batch);
      // Un batch que no arrancó nada (JSON roto por un item raro del lote —
      // spam multilínea, adjuntos, auto-respuestas de otras marcas) falla los
      // 10 juntos y, como el set es determinístico, falla en cada corrida.
      // Reintento uno por uno: un solo objeto JSON es trivial de parsear.
      const faltan = batch.filter((b) => !res[b.id]);
      if (faltan.length === batch.length && batch.length > 1) {
        console.warn(`[inbox] batch de ${batch.length} sin clasificar — reintento item por item`);
        res = {};
        for (const item of faltan) {
          const solo = await classifyBatch([item]);
          Object.assign(res, solo);
        }
      }
      for (const [id, v] of Object.entries(res)) {
        await supabase.from("inbox_items").update({ sentiment: v.s, sentiment_note: v.n }).eq("id", id);
        classified++;
      }
    } catch (e) {
      console.warn(`[inbox] clasificación falló: ${errMsg(e)}`);
    }
  }

  await supabase.from("inbox_sync_state").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", 1);
  return { pulled: all.length, upserted, classified };
}

// ═══════════════════════════════════════
// DRAFT / REPLY
// ═══════════════════════════════════════

async function draft(itemId: string) {
  const { data: item, error } = await supabase.from("inbox_items").select("*").eq("id", itemId).single();
  if (error || !item) throw new Error("No se encontró el mensaje");
  const ctx = await getBrandContext(item.text || "");
  const system =
    "Sos quien responde comentarios y mensajes de Mejora Continua en redes. Voz: argentina, directa, cálida sin ser " +
    "empalagosa. Nunca vendés de una — clarificás y ofrecés ayuda si corresponde. Nunca prometés resultados mágicos ni " +
    "generás urgencia falsa. Señalás la falta de estructura, nunca atacás a la persona. Respondé corto (1-3 frases), " +
    "listo para publicar tal cual. Sin comillas, sin firma.\n\nCriterio de marca:\n" + ctx;
  const user = `${item.kind === "comment" ? "Comentario" : "Mensaje directo"} de ${item.author_name || "alguien"} (${item.platform}):\n"${item.text}"\n\nRedactá la respuesta.`;
  const reply = await callLLM(system, user, 300);
  return { draft: reply };
}

async function reply(itemId: string, message: string) {
  const { data: item, error } = await supabase.from("inbox_items").select("*").eq("id", itemId).single();
  if (error || !item) throw new Error("No se encontró el mensaje");
  if (!message?.trim()) throw new Error("La respuesta está vacía");

  if (item.kind === "comment") {
    await zPost(`/inbox/comments/${item.thread_id}`, { accountId: item.account_id, commentId: item.external_id, message });
  } else {
    await zPost(`/inbox/conversations/${item.thread_id}/messages`, { accountId: item.account_id, message });
  }

  const now = new Date().toISOString();
  await supabase.from("inbox_items").update({ replied_at: now }).eq("id", itemId);
  // Guardar nuestra respuesta como fila outgoing para que se vea el hilo.
  await supabase.from("inbox_items").insert({
    kind: item.kind,
    platform: item.platform,
    account_id: item.account_id,
    thread_id: item.thread_id,
    external_id: `reply-${itemId}-${Date.now()}`,
    author_name: "Mejora Continua",
    text: message,
    direction: "outgoing",
    item_time: now,
  });
  return { ok: true };
}

// ═══════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (!auth.ok) return unauthorizedResponse(auth, corsHeaders);

  const startedAt = Date.now();
  let action: string | undefined;
  try {
    const body = await req.json();
    ({ action } = body);

    let result: unknown;
    if (action === "sync") result = await sync();
    else if (action === "draft") result = await draft(body.itemId);
    else if (action === "reply") result = await reply(body.itemId, body.message);
    else throw new Error("Acción no válida");

    await logRun({ source: "inbox", step: action, status: "success", durationMs: Date.now() - startedAt, metadata: result as Record<string, unknown> });
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const message = errMsg(e);
    await logRun({ source: "inbox", step: action || "unknown", status: "error", durationMs: Date.now() - startedAt, error: message });
    if (action === "sync") {
      await supabase.from("inbox_sync_state").update({ last_error: message }).eq("id", 1);
    }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
