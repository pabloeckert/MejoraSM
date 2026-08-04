-- Migration: clasificación de dimensión + buyer persona en el backlog de
-- contenido (proposals) — solo schema y tipo, sin conectar clasificación
-- automática por IA todavía (orchestrator no se toca en esta migración).
--
-- dimension: columna nueva. Se puede exponer en UI y filtros públicos del
-- dashboard.
--
-- buyer_persona: la columna YA EXISTÍA desde 001_initial_schema.sql como
-- TEXT libre, sin restricción, y sin que ningún código la escriba hoy
-- (confirmado: ni orchestrator ni el frontend la tocan, siempre NULL en
-- cualquier fila real) — acá solo se le agrega la restricción a los 8
-- perfiles del manual de marca. NUNCA se renderiza en el contenido público
-- ni en el copy generado — es solo para filtrado interno en el
-- dashboard/monitoreo.
--
-- Ejecutar vía `supabase db query --linked "$(cat supabase/migrations/008_dimension_buyer_persona.sql)"`
-- o el SQL Editor del dashboard — NO con `supabase db push` (roto, ver
-- CLAUDE.md "Bug conocido del CLI").

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS dimension TEXT;

ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_dimension_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_dimension_check
  CHECK (dimension IN ('personal', 'organizacional', 'comercial', 'empresarial'));

ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_buyer_persona_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_buyer_persona_check
  CHECK (buyer_persona IN (
    'emprendedor_saturado',
    'lider_necesita_validacion',
    'profesional_independiente',
    'equipo_desalineado',
    'empresario_mal_asesorado',
    'nueva_generacion',
    'vendedor_sin_resultados',
    'necesita_orden_para_crecer'
  ));

COMMENT ON COLUMN proposals.dimension IS
  'Dimensión del Manual de Marca (personal | organizacional | comercial | empresarial). Se puede exponer en UI y filtros públicos del dashboard. Sin clasificación automática conectada todavía — ningún proceso la completa.';
COMMENT ON COLUMN proposals.buyer_persona IS
  'Perfil del manual de marca, restringido a los 8 perfiles canónicos. NUNCA se renderiza en contenido público ni en el copy generado — solo para filtrado interno en el dashboard/monitoreo. Columna preexistente (001); acá se le agrega la restricción. Ningún proceso la completa todavía.';
