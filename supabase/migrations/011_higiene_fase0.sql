-- Migration: Fase 0 del plan estratégico 2026-08-16 — higiene real
--
-- 1. calendar_events: tabla legacy confirmada vacía (0 filas, verificado
--    2026-08-16) y sin ningún caller real — Calendario.tsx lee
--    proposals.scheduled_at directo desde el rediseño del 2026-08-07.
--    Se dropea en vez de dejarla como deuda muerta.
--
-- 2. proposals.is_test: reemplaza el filtro por prefijo de UUID
--    (id::text LIKE '7e57da7a-%') que usaban Dashboard.tsx y
--    Calendario.tsx — una heurística de string, no una columna real.
--    Default false, backfill explícito por si quedara alguna fila vieja
--    con el prefijo histórico de pruebas de rule-engine (no debería haber
--    ninguna, ya se limpiaron el 2026-08-05, pero el UPDATE es inocuo si
--    no matchea nada).
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/011_higiene_fase0.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

DROP TABLE IF EXISTS calendar_events;

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

UPDATE proposals SET is_test = true WHERE id::text LIKE '7e57da7a-%' AND is_test = false;

COMMENT ON COLUMN proposals.is_test IS
  'Marca real de fila de prueba (ej. seeds de rule-engine) — reemplaza el filtro por prefijo de UUID que usaba el frontend. Default false. Fase 0 del plan estratégico 2026-08-16.';
