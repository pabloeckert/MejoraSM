// src/services/supabase.ts
// Cliente de Supabase para queries directas (CRUD)

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "[supabase] Variables de entorno no configuradas.\n" +
    "Creá un archivo .env con:\n" +
    "  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\n" +
    "  VITE_SUPABASE_PUBLISHABLE_KEY=tu-anon-key\n" +
    "En Vercel: Settings → Environment Variables"
  );
}

// createClient() valida el formato de la URL de forma síncrona al importar
// el módulo — con "" (caso sin .env) tira "supabaseUrl is required." y
// rompe cualquier test/build que importe este archivo, no solo las
// pantallas que de verdad necesitan la conexión real. El placeholder
// mantiene el formato válido para no crashear en frío; el error real de
// red al llamar la API sigue avisando fuerte igual, y el console.error de
// arriba ya deja explícito qué falta configurar.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-anon-key"
);

// PostgREST devuelve como máximo 1000 filas por default (db-max-rows), sin
// error ni aviso — simplemente falta el resto. Hallazgo real de auditoría
// 2026-08-25: `proposals`/`metrics` todavía no llegan a ese volumen, pero
// tanto el Dashboard (KPIs agregados reales) como la exportación de
// Auditoría (pensada como fuente de verdad completa) necesitan el set
// entero, no una muestra silenciosa. Este helper pagina con `.range()`
// hasta agotar resultados reales.
const PAGE_SIZE = 1000;
async function fetchAllPages<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { data: all, error: null };
}

// ═══════════════════════════════════════
// DOCUMENTOS (Bóveda)
// ═══════════════════════════════════════

export const documentsApi = {
  list: () =>
    supabase.from("documents").select("*").order("created_at", { ascending: false }),

  get: (id: string) =>
    supabase.from("documents").select("*").eq("id", id).single(),

  upload: async (file: File) => {
    const filePath = `${Date.now()}-${file.name}`;

    // Subir a storage
    const { error: uploadError } = await supabase.storage
      .from("vault")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    // Crear registro
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({
        title: file.name,
        file_path: filePath,
        file_type: file.type,
      })
      .select()
      .single();
    if (dbError) throw dbError;

    return doc;
  },

  // Fase C (2026-08-31): corregir a mano la categoría que propuso vault-process.
  setCategory: (id: string, category: string) =>
    supabase.from("documents").update({ category }).eq("id", id),

  delete: async (id: string) => {
    // Obtener path
    const { data: doc } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", id)
      .single();

    // B31 (auditoría 2026-08-31): antes el remove de storage no se chequeaba
    // y la fila se borraba igual → archivo huérfano en el bucket. Ahora, si
    // el remove falla, no se borra la fila (queda consistente para reintentar).
    if (doc?.file_path) {
      const { error: storageError } = await supabase.storage.from("vault").remove([doc.file_path]);
      if (storageError) throw new Error(`No se pudo borrar el archivo del storage: ${storageError.message}`);
    }

    return supabase.from("documents").delete().eq("id", id);
  },
};

// ═══════════════════════════════════════
// SESIONES DE DIÁLOGO
// ═══════════════════════════════════════

export const dialogueApi = {
  listSessions: () =>
    supabase
      .from("dialogue_sessions")
      .select("*")
      .order("created_at", { ascending: false }),

  getSession: (id: string) =>
    supabase
      .from("dialogue_sessions")
      .select("*, dialogue_messages(*)")
      .eq("id", id)
      .single(),

  getMessages: (sessionId: string) =>
    supabase
      .from("dialogue_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("turn", { ascending: true }),
};

// ═══════════════════════════════════════
// PROPUESTAS
// ═══════════════════════════════════════

export const proposalsApi = {
  // Pagina de a 1000 filas reales — sin esto, pasado ese volumen faltaban
  // propuestas en silencio tanto acá como en el export de Auditoría.
  list: () =>
    fetchAllPages<Record<string, unknown>>((from, to) =>
      supabase
        .from("proposals")
        .select("*, dialogue_sessions(topic)")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),

  approve: (id: string) =>
    supabase.from("proposals").update({ status: "approved" }).eq("id", id),

  reject: (id: string, reason: string) =>
    supabase
      .from("proposals")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", id),

  schedule: (id: string, date: string, oferta: string) =>
    supabase
      .from("proposals")
      .update({ status: "scheduled", scheduled_at: date, oferta })
      .eq("id", id),

  // Monitor de reversión (PLAN_AUTONOMIA.md Fase 2): cancela una propuesta
  // todavía no publicada (autoagendada o programada a mano) antes de que el
  // cron de publish-scheduled-posts.yml la levante. Para una ya publicada,
  // la reversión es scripts/manage-post.mjs (workflow_dispatch), no esto.
  cancel: (id: string) =>
    supabase
      .from("proposals")
      .update({ status: "rejected", rejection_reason: "Cancelada antes de publicar" })
      .eq("id", id),

  // Recuperar una propuesta rechazada/cancelada (B2, auditoría 2026-08-31).
  // Vuelve a `pending` y limpia scheduled_at/rejection_reason — desde ahí se
  // puede volver a aprobar/agendar. No toca `published` (no hay reactivación
  // de algo que ya salió).
  reactivate: (id: string) =>
    supabase
      .from("proposals")
      .update({ status: "pending", scheduled_at: null, rejection_reason: null })
      .eq("id", id)
      .neq("status", "published"),

  pending: () =>
    supabase
      .from("proposals")
      .select("*, dialogue_sessions(topic)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),

  // Modal de detalle (rediseño 2026-08-07) — acciones reales, solo válidas
  // mientras la pieza no esté published (se valida también en la UI, esto
  // es la capa de datos).
  edit: (
    id: string,
    fields: Partial<{ title: string; hook: string; body: string; cta: string; hashtags: string[] }>
  ) => supabase.from("proposals").update(fields).eq("id", id),

  remove: (id: string) => supabase.from("proposals").delete().eq("id", id),

  reschedule: (id: string, date: string) =>
    supabase.from("proposals").update({ scheduled_at: date }).eq("id", id),

  // Valores reales que produce el pipeline (post | carrusel | historia) —
  // no reel/story (legacy del CHECK constraint, sin caller real) ni video
  // (ni siquiera permitido por proposals_format_check).
  convertFormat: (id: string, format: string) =>
    supabase.from("proposals").update({ format }).eq("id", id),
};

// ═══════════════════════════════════════
// PLANTILLAS (estructura, sin motor de render — ver migración 010)
// ═══════════════════════════════════════

export const templatesApi = {
  list: () => supabase.from("templates").select("*").order("created_at", { ascending: false }),

  create: (fields: { name: string; format: string; notes?: string }) =>
    supabase.from("templates").insert(fields).select().single(),

  update: (id: string, fields: Partial<{ name: string; format: string; notes: string }>) =>
    supabase
      .from("templates")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id),

  remove: (id: string) => supabase.from("templates").delete().eq("id", id),
};

// calendarApi (tabla calendar_events) se retiró en la Fase 0 del plan
// estratégico 2026-08-16 — legacy confirmada vacía y sin caller real desde
// el rediseño de Calendario del 2026-08-07 (lee proposals.scheduled_at).

// ═══════════════════════════════════════
// MÉTRICAS
// ═══════════════════════════════════════

export const metricsApi = {
  latest: () =>
    supabase
      .from("metrics")
      .select("*, proposals(title, format)")
      .order("measured_at", { ascending: false })
      .limit(30),

  // Dashboard (rediseño 2026-08-07): a diferencia de latest() no tiene
  // límite — el Dashboard necesita el set completo para calcular KPIs
  // agregados reales (sumas/promedios), no solo una muestra reciente.
  // Trae los campos de proposals necesarios para el ranking de piezas,
  // el desglose por red y el filtro de filas de prueba (is_test real,
  // Fase 0 del plan estratégico 2026-08-16 — antes se inferían del prefijo
  // de UUID de la propuesta).
  all: () =>
    fetchAllPages<Record<string, unknown>>((from, to) =>
      supabase
        .from("metrics")
        .select(
          "*, proposals(id, title, hook, format, status, zernio_post_id, oferta, rendered_image_path, is_test)"
        )
        .order("measured_at", { ascending: false })
        .range(from, to)
    ),

  byProposal: (proposalId: string) =>
    supabase
      .from("metrics")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("measured_at", { ascending: false }),

  successRules: () =>
    supabase
      .from("success_rules")
      .select("*")
      .order("confidence", { ascending: false }),
};

// ═══════════════════════════════════════
// OBSERVABILIDAD (run_log, Fase 3) — usada por Auditoría (Fase 6)
// ═══════════════════════════════════════

export const runLogApi = {
  // Paginado real (B27, auditoría 2026-08-31): run_log es la tabla de mayor
  // volumen (una fila por paso de cada cron/script/función). Con .limit(500)
  // pelado, una "auditoría completa" no veía más allá de ~2-3 semanas.
  all: () =>
    fetchAllPages<Record<string, unknown>>((from, to) =>
      supabase
        .from("run_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),

  // Vista de observabilidad en /auditoria (F11) — últimas N corridas, sin
  // paginar, para mostrar en pantalla.
  recent: (limit = 200) =>
    supabase
      .from("run_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
};

// ═══════════════════════════════════════
// HISTORIAL (caché real, Fase 5+ fix 2026-08-17) — reemplaza el fetch
// directo a raw.githubusercontent.com del Monitor, que tiene caídas reales
// y documentadas. Escrito por sync-history.mjs/mark-manual.mjs.
// ═══════════════════════════════════════

export const historialApi = {
  get: () =>
    supabase
      .from("historial_cache")
      .select("synced_at, posts, acciones_manuales")
      .eq("id", 1)
      .maybeSingle(),

  // Hallazgo real 2026-08-27 (Pablo: "no sincroniza correctamente, no
  // esta dando informacion real ni publicado... ni en zernio"): apareció
  // un post real en el historial sin ninguna fila de `proposals` que lo
  // respalde — historial_cache lo trae porque sync-history.mjs solo
  // refleja lo que Zernio devuelve, y no hay forma de sacar del Monitor
  // algo que Zernio sigue reportando aunque ya no sea real (borrado a
  // mano en la red, o un dato viejo de Zernio). Esto borra la fila SOLO
  // de esta caché de lectura — no toca Zernio ni Instagram/Facebook, para
  // eso están los botones de despublicar. Lee-modifica-escribe el array
  // completo porque PostgREST no tiene un operador nativo para sacar un
  // elemento de un jsonb array por condición.
  removePost: async (postId: string) => {
    const { data, error } = await supabase.from("historial_cache").select("posts").eq("id", 1).maybeSingle();
    if (error) throw error;
    const posts = ((data?.posts as { id: string }[] | null) || []).filter((p) => p.id !== postId);
    return supabase
      .from("historial_cache")
      .update({ posts, updated_at: new Date().toISOString() })
      .eq("id", 1);
  },
};
