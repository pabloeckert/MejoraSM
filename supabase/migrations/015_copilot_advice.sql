-- Migration: Fase 4 del plan estratégico 2026-08-16 — Copiloto reflexivo
--
-- "Consejo diario": una sola fila real por día con una lectura en lenguaje
-- natural de los datos propios (metrics, success_rules, run_log), generada
-- por la Edge Function copilot y cacheada acá — no se regenera en cada
-- carga del Dashboard, solo la primera vez que se pide ese día. advice_date
-- UNIQUE es la idempotencia real: dos pedidos el mismo día devuelven la
-- misma fila, no llaman al LLM dos veces.
--
-- El chat del copiloto ("chat sobre datos propios") NO tiene tabla propia
-- a propósito: es stateless — el frontend mantiene el historial de la
-- conversación en memoria (React state) y lo manda completo en cada
-- request, la Edge Function no persiste nada de eso. Menos peso de schema
-- para una función que es un asistente liviano de consulta, no un registro
-- editorial como Mesa de Diálogo (que sí necesita persistir sesiones/turnos
-- porque de ahí salen propuestas reales que se autoagendan).
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/015_copilot_advice.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

CREATE TABLE IF NOT EXISTS copilot_advice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advice_date DATE NOT NULL UNIQUE,
  content TEXT NOT NULL,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE copilot_advice ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON copilot_advice;
CREATE POLICY "Admin full access" ON copilot_advice
  FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

COMMENT ON TABLE copilot_advice IS
  'Fase 4 del plan estratégico 2026-08-16 (Copiloto reflexivo): un "consejo del día" en lenguaje natural por fecha, generado y cacheado por la Edge Function copilot a partir de metrics/success_rules/run_log reales. No confundir con el chat del copiloto, que es stateless y no tiene tabla propia.';
