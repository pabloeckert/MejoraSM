-- 025_content_experiments.sql
-- Fase 4 del plan de publicación 2026 — Loop de aprendizaje activo.
--
-- Hasta ahora rule-engine analizaba el horario de publicación de forma
-- OBSERVACIONAL: miraba a qué hora salió cada post y su engagement. Pero
-- pickNextSlot tendía a mandar todo al mismo bloque horario, así que no
-- había con qué comparar. Esto registra un experimento controlado por
-- pieza autoagendada (qué variante de un parámetro le tocó), para que la
-- comparación sea real: misma marca, mismo pipeline, distinta hora.
--
-- Arranca con 'timing' (12/16/23 UTC en rotación). El campo `dimension`
-- deja lugar para 'hook_style' u otros más adelante sin otra migración.

CREATE TABLE IF NOT EXISTS content_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,              -- 'timing' | 'hook_style' | ...
  variant TEXT NOT NULL,                -- timing: hora UTC como texto ('12')
  hypothesis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  measured_engagement NUMERIC,          -- lo llena rule-engine cuando hay métrica
  measured_at TIMESTAMPTZ
);

ALTER TABLE content_experiments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON content_experiments;
CREATE POLICY "Admin full access" ON content_experiments FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

CREATE INDEX IF NOT EXISTS idx_content_experiments_dim ON content_experiments (dimension, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_experiments_open ON content_experiments (dimension) WHERE measured_engagement IS NULL;
