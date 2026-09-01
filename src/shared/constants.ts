// PM4 (auditoría 2026-08-31): estas listas estaban duplicadas a mano en
// PipelineBadge, Hub, ProposalDetailDialog, generate-brief.mjs y
// render-scheduled-posts.mjs. Si el backend cambiaba
// AUTO_PUBLISH_FORMATS, el badge más importante del producto ("Se publica
// solo") empezaba a mentir. Esta es la fuente única para el frontend.
//
// El backend (Edge Functions Deno, scripts Node ESM) no puede importar de
// src/, así que mantiene su propia copia — pero al menos el frontend queda
// consistente consigo mismo. Ver supabase/functions/orchestrator/index.ts
// (AUTO_PUBLISH_FORMATS / OFERTAS) para el espejo del lado servidor.

// Formatos que el pipeline agenda y publica solos apenas el Crítico aprueba.
export const AUTONOMOUS_FORMATS = ["post", "carrusel"] as const;
export type AutonomousFormat = (typeof AUTONOMOUS_FORMATS)[number];

export function isAutonomousFormat(format?: string | null): boolean {
  return (AUTONOMOUS_FORMATS as readonly string[]).includes(format || "");
}

// Formatos reales que produce el pipeline (proposals.format). No incluye
// "reel"/"story" (legacy del CHECK constraint) ni "video" (no permitido por
// proposals_format_check todavía).
export const PIPELINE_FORMATS = [
  { value: "post", label: "Post Feed" },
  { value: "carrusel", label: "Carrusel" },
  { value: "historia", label: "Story" },
] as const;

// Las 6 dimensiones del servicio (content/inbox/<dimension>/). "sociales" NO
// participa de la auto-agenda del orchestrator (es contenido anclado a
// eventos reales de equipo), pero sí del selector de dimensión al agendar a
// mano y del pipeline de Stories.
export const DIMENSIONES = [
  { key: "personal", label: "Personal", title: "Liderazgo y foco" },
  { key: "organizacional", label: "Organizacional", title: "Equipo y cultura" },
  { key: "comercial", label: "Comercial", title: "Ventas y negociación" },
  { key: "empresarial", label: "Empresarial", title: "Modelo de negocio" },
  { key: "profesionalizacion", label: "Profesionalización", title: "Nivel integrador" },
  { key: "sociales", label: "Sociales", title: "Equipo, alianzas y celebraciones" },
] as const;

// Las que el orchestrator rota en la auto-agenda (sin "sociales").
export const AUTO_AGENDA_DIMENSIONES = DIMENSIONES.filter((d) => d.key !== "sociales").map((d) => d.key);

export const dimensionLabel = (key?: string | null) =>
  DIMENSIONES.find((d) => d.key === key)?.label ?? key ?? "";

// Fase C (2026-08-31): tipos de documento de la Bóveda / "Manual de Identidad
// de Marca". vault-process propone la categoría al procesar (LLM); el humano
// la corrige desde /boveda. Espejo del lado servidor: DOC_CATEGORIES en
// supabase/functions/vault-process/index.ts.
export const DOC_CATEGORIES = [
  { key: "manual", label: "Manual y criterio" },
  { key: "buyer_persona", label: "Buyer personas" },
  { key: "tono", label: "Tono y voz" },
  { key: "ejemplo", label: "Ejemplos de piezas" },
  { key: "otro", label: "Otros" },
] as const;

export const docCategoryLabel = (key?: string | null) =>
  DOC_CATEGORIES.find((c) => c.key === key)?.label ?? "Sin clasificar";
