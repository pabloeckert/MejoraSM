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

export const supabase = createClient(supabaseUrl ?? "", supabaseKey ?? "");

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

  delete: async (id: string) => {
    // Obtener path
    const { data: doc } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", id)
      .single();

    if (doc) {
      await supabase.storage.from("vault").remove([doc.file_path]);
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
  list: () =>
    supabase
      .from("proposals")
      .select("*, dialogue_sessions(topic)")
      .order("created_at", { ascending: false }),

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
    supabase
      .from("metrics")
      .select(
        "*, proposals(id, title, hook, format, status, zernio_post_id, oferta, rendered_image_path, is_test)"
      )
      .order("measured_at", { ascending: false }),

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
