-- Migration: persistir clicks de Zernio Analytics en metrics
--
-- GET /v1/analytics de Zernio ya devuelve "clicks" en el objeto analytics
-- (confirmado contra el spec real, ver CLAUDE.md "Métricas vía Zernio
-- Analytics") pero supabase/functions/metrics-collector/index.ts lo
-- descartaba al mapear la respuesta (interface ZernioMetrics no lo incluía)
-- y metrics no tenía columna para guardarlo. Este cambio solo agrega la
-- columna — el mapeo se corrige aparte en el código de la función.
--
-- Nullable, sin DEFAULT a propósito: las filas ya existentes en metrics
-- quedan en NULL (nunca se recolectó ese dato para ellas), no en 0 (que
-- significaría "se midió y dio cero clics").
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/009_metrics_clicks.sql`
-- (con -f, no `"$(cat ...)"` inline — el comentario -- de esta cabecera
-- rompe el modo inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (roto, ver CLAUDE.md "Bug conocido del CLI").

ALTER TABLE metrics
  ADD COLUMN IF NOT EXISTS clicks INTEGER;

COMMENT ON COLUMN metrics.clicks IS
  'Clics al link, desde el campo "clicks" de GET /v1/analytics (Zernio). NULL = nunca recolectado para este post (no confundir con 0 clics reales, que sí es un valor medido). Agregado 2026-08-07 — antes la API ya lo devolvía pero metrics-collector lo descartaba al mapear.';
