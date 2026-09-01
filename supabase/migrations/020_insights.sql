-- Migration: Fase A del plan de continuación (rediseño 2026-08-31) —
-- Motor de insights con IA para el Dashboard.
--
-- Cierra el punto 3 del brief de rediseño del 2026-08-16, que hasta ahora
-- eran 6 tarjetas de texto fijo (SEED_INSIGHTS, hardcodeadas en Dashboard.tsx,
-- congeladas desde el 2026-08-07). Ahora la Edge Function `insights` toma esas
-- 6 semillas + las métricas reales de las últimas semanas + la retro de Pablo
-- ("Útil"/"No aplica") y le pide a Claude CONTRASTARLAS: confirmar, refinar o
-- reemplazar cada una con evidencia real, nunca inventar sin dato detrás
-- (mismo principio que ya rige NO_SOURCE_KPIS).
--
--  - insights_cache: una fila por semana (week_start UNIQUE) con el array de
--    insights ya contrastados. No se regenera en cada carga del Dashboard —
--    solo la primera vez que se pide esa semana, o vía el cron semanal.
--  - insight_feedback: la retro de Pablo por insight. Se lee al generar la
--    semana siguiente para bajar la prioridad de lo que marcó "no aplica".
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/020_insights.sql`
-- (con -f, no inline) o el SQL Editor del dashboard — NO con `supabase db push`
-- (ver CLAUDE.md "Bug conocido del CLI").

CREATE TABLE IF NOT EXISTS insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,   -- lunes de la semana ISO (UTC)
  insights JSONB NOT NULL,            -- [{ id, title, body, evidence, confidence, status }]
  model TEXT,                         -- qué modelo generó (anthropic/groq)
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insight_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id TEXT NOT NULL,           -- el id estable del insight (ej. "reel-retencion")
  week_start DATE NOT NULL,
  useful BOOLEAN NOT NULL,            -- true = "Útil", false = "No aplica"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (insight_id, week_start)     -- una retro por insight por semana; el upsert la pisa
);

CREATE INDEX IF NOT EXISTS idx_insight_feedback_recent ON insight_feedback (created_at DESC);

ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_feedback ENABLE ROW LEVEL SECURITY;

-- Mismo criterio de acceso abierto que el resto del schema post-019.
DROP POLICY IF EXISTS "Allow all" ON insights_cache;
CREATE POLICY "Allow all" ON insights_cache FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all" ON insight_feedback;
CREATE POLICY "Allow all" ON insight_feedback FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE insights_cache IS
  'Fase A del plan de continuación (2026-08-31): insights del Dashboard contrastados contra métricas reales por la Edge Function insights, uno por semana. Reemplaza el SEED_INSIGHTS estático.';
COMMENT ON TABLE insight_feedback IS
  'Retro de Pablo ("Útil"/"No aplica") por insight y por semana. Se lee al generar la semana siguiente.';
