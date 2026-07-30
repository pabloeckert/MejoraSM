-- Migration: Reconciliar constraints divergentes entre las dos versiones
-- de "003" que convivieron en el repo (003_indexes_and_constraints.sql vs
-- 003_indexes_constraints.sql). No se sabe con certeza cuál de las dos se
-- corrió contra la base real en algún momento, así que esta migración deja
-- los constraints en un estado final único e idempotente (DROP IF EXISTS +
-- ADD), usando la UNIÓN de los valores permitidos por ambas versiones —
-- así nunca rompe filas existentes sin importar el historial real de la base.
-- Ejecutar en Supabase SQL Editor, o vía `supabase db push`.

-- dialogue_sessions.status
-- Versión A permitía: active, approved, needs_review, completed, archived
-- Versión B permitía: active, approved, needs_review, closed
ALTER TABLE dialogue_sessions DROP CONSTRAINT IF EXISTS chk_dialogue_sessions_status;
ALTER TABLE dialogue_sessions DROP CONSTRAINT IF EXISTS dialogue_sessions_status_check;
ALTER TABLE dialogue_sessions ADD CONSTRAINT dialogue_sessions_status_check
  CHECK (status IN ('active', 'approved', 'needs_review', 'completed', 'archived', 'closed'));

-- proposals.status (idéntico en ambas versiones, se deja explícito igual)
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS chk_proposals_status;
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled', 'published'));

-- proposals.format (idéntico en ambas versiones)
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS chk_proposals_format;
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_format_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_format_check
  CHECK (format IN ('post', 'carrusel', 'historia', 'reel', 'story'));

-- calendar_events.status
-- Versión A permitía: scheduled, published, cancelled, draft
-- Versión B permitía: scheduled, published, cancelled
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS chk_calendar_events_status;
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_status_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_status_check
  CHECK (status IN ('scheduled', 'published', 'cancelled', 'draft'));

-- success_rules.rule_type (solo estaba en versión A, se agrega si falta)
ALTER TABLE success_rules DROP CONSTRAINT IF EXISTS chk_success_rules_type;
ALTER TABLE success_rules ADD CONSTRAINT chk_success_rules_type
  CHECK (rule_type IN ('hook', 'format', 'timing', 'hashtag', 'tone', 'persona', 'general'));

-- metadata en proposals (columna de la versión B, por si nunca se corrió)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE proposals ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Verificación
SELECT conname, conrelid::regclass AS tabla, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conname IN (
  'dialogue_sessions_status_check',
  'proposals_status_check',
  'proposals_format_check',
  'calendar_events_status_check',
  'chk_success_rules_type'
);
