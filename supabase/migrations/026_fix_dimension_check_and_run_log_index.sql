-- Migration 026 — dos fixes reales encontrados en una relectura crítica del
-- schema completo (2026-09-08), ninguno de los dos rompe nada hoy pero los
-- dos eran bombas de tiempo o degradación silenciosa:
--
-- 1. proposals_dimension_check (de 008_dimension_buyer_persona.sql) solo
--    permitía 'personal' | 'organizacional' | 'comercial' | 'empresarial'
--    — pero el modelo de negocio pasó a 6 dimensiones desde el 2026-08-17
--    (ver "Taller de la Oferta" en CLAUDE.md): se agregaron
--    'profesionalizacion' y 'sociales'. Confirmado con grep que hoy nada
--    escribe proposals.dimension (siempre NULL en producción — el propio
--    comentario de 008 ya lo decía: "ningún proceso la completa todavía"),
--    así que el CHECK desactualizado nunca violó nada en la práctica. Pero
--    es una trampa real: el día que se conecte clasificación automática a
--    esta columna, un INSERT/UPDATE con dimension='profesionalizacion' o
--    'sociales' rompería con un error crudo de Postgres. src/shared/
--    constants.ts::DIMENSIONES ya conoce las 6 desde hace semanas —
--    src/pages/Hub.tsx, generate-brief.mjs y render-scheduled-posts.mjs ya
--    las usan todas para clasificar/renderizar contenido real.
--
-- 2. runLogApi.accountDisconnectedRecently() (src/services/supabase.ts,
--    usada por el banner rojo del Dashboard y por copilot) filtra
--    run_log por metadata->>'reason' = 'account-disconnected' + created_at
--    — sin ningún índice que cubra eso (el único índice existente es
--    (source, created_at DESC), y esta query no filtra por source). Cae a
--    seq-scan con extracción de JSON fila por fila. No rompe nada con el
--    volumen actual, se degrada con el tamaño de la tabla — un índice
--    parcial es prácticamente gratis (la mayoría de las filas no tienen
--    ese reason, así que el índice es chico).
--
-- Ejecutar vía `supabase db push --project-ref <ref> --yes` (ya no hace
-- falta el workaround de `db query -f`, ver deploy-migrations.yml fix del
-- 2026-09-08) o `supabase db query --linked -f supabase/migrations/026_*.sql`.

ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_dimension_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_dimension_check
  CHECK (dimension IN (
    'personal',
    'organizacional',
    'comercial',
    'empresarial',
    'profesionalizacion',
    'sociales'
  ));

COMMENT ON COLUMN proposals.dimension IS
  'Dimensión del Manual de Marca — las 6 reales (ver src/shared/constants.ts::DIMENSIONES): personal | organizacional | comercial | empresarial | profesionalizacion | sociales. Se puede exponer en UI y filtros públicos del dashboard.';

CREATE INDEX IF NOT EXISTS idx_run_log_disconnected_reason
  ON run_log ((metadata->>'reason'))
  WHERE metadata->>'reason' IS NOT NULL;
