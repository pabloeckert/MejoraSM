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

// Las 6 dimensiones del servicio (content/inbox/<dimension>/). "networking_y_autoridad"
// proyecta prueba social directiva C-Level ("mirá con quiénes trabajan").
export const DIMENSIONES = [
  { key: "personal", label: "Personal", title: "Liderazgo y foco" },
  { key: "organizacional", label: "Organizacional", title: "Equipo y cultura" },
  { key: "comercial", label: "Comercial", title: "Ventas y negociación" },
  { key: "empresarial", label: "Empresarial", title: "Modelo de negocio" },
  { key: "profesionalizacion", label: "Profesionalización", title: "Nivel integrador" },
  { key: "networking_y_autoridad", label: "Networking y Autoridad Empresarial", title: "Prueba social C-Level y visitas directivas" },
  { key: "sociales", label: "Sociales (Networking C-Level)", title: "Prueba social y alianzas directivas" },
] as const;

// Las que el orchestrator rota en la auto-agenda (sin "sociales" ni eventos ad-hoc).
export const AUTO_AGENDA_DIMENSIONES = DIMENSIONES
  .filter((d) => d.key !== "sociales" && d.key !== "networking_y_autoridad")
  .map((d) => d.key);

export const dimensionLabel = (key?: string | null) => {
  if (key === "sociales") return "Networking y Autoridad Empresarial";
  return DIMENSIONES.find((d) => d.key === key)?.label ?? key ?? "";
};

// Arquitectura de 4 Capas Canónicas de la Bóveda de Conocimiento (RAG Vault 2026)
export const DOC_CATEGORIES = [
  { key: "constitucion", label: "1. Constitución (Manuales, Tono, Manifiesto, Reglas Irreductibles)" },
  { key: "autoridad", label: "2. Autoridad (Libros en PDF, Marcos Teóricos, Estrategia)" },
  { key: "experiencia", label: "3. Experiencia (Transcripciones STT, Notas de Consultoría, Casos Reales)" },
  { key: "networking_y_autoridad", label: "4. Networking y Autoridad (Galería C-Level, Reuniones y Plantas)" },
  // Categorías de compatibilidad hacia atrás
  { key: "biblioteca_gestion", label: "Biblioteca de Gestión (Libros)" },
  { key: "manual", label: "Manual y criterio" },
  { key: "buyer_persona", label: "Buyer personas" },
  { key: "tono", label: "Tono y voz" },
  { key: "ejemplo", label: "Ejemplos de piezas" },
  { key: "otro", label: "Otros" },
] as const;

export const docCategoryLabel = (key?: string | null) =>
  DOC_CATEGORIES.find((c) => c.key === key)?.label ?? "Sin clasificar";

