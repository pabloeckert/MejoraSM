-- Migration: Fase 3 del plan estratégico 2026-08-16 — observabilidad real
--
-- Hoy "¿corrió la story de hoy?" se responde mirando commits o los logs de
-- GitHub Actions por separado de los de Supabase — no hay un solo lugar
-- donde ver qué pasó con una pieza en cualquier paso del pipeline (Edge
-- Functions o scripts de Actions). run_log es esa fuente única: cada
-- script y cada Edge Function real del pipeline escribe una fila por
-- corrida, éxito o error, sin excepción.
--
-- source = qué componente corrió (daily-story | publish-scheduled-posts |
-- sync-history | orchestrator | vault-process | metrics-collector |
-- rule-engine). step = el paso puntual dentro de ese componente (varios
-- scripts ya son un paso completo del pipeline por sí mismos — ej.
-- generate-brief.mjs ES el paso "generate-brief" — así que una fila por
-- corrida de script ya da granularidad real de paso).
--
-- proposal_id sin FK dura a propósito: el pipeline de Stories nunca usa
-- proposals (va directo por content/inbox → Zernio → historial.json), así
-- que una FK NOT NULL o con ON DELETE forzado no tendría sentido para esa
-- mitad del sistema. Se deja como UUID libre, NULL cuando no aplica.
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/014_run_log.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

CREATE TABLE IF NOT EXISTS run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  proposal_id UUID,
  duration_ms INTEGER,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE run_log DROP CONSTRAINT IF EXISTS run_log_status_check;
ALTER TABLE run_log ADD CONSTRAINT run_log_status_check
  CHECK (status IN ('success', 'error', 'skipped'));

CREATE INDEX IF NOT EXISTS idx_run_log_source_created ON run_log (source, created_at DESC);

ALTER TABLE run_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON run_log;
CREATE POLICY "Admin full access" ON run_log
  FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

COMMENT ON TABLE run_log IS
  'Observabilidad real (Fase 3 del plan estratégico 2026-08-16): una fila por corrida de cada script/Edge Function del pipeline, éxito o error. Escrita por scripts/lib/run-log.mjs (Node/Actions) y supabase/functions/_shared/runLog.ts (Deno/Edge Functions).';
