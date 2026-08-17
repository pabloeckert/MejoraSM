-- Migration: Fase 1 del plan estratégico 2026-08-16 — idempotencia dura
-- contra el duplicado de autoagendado
--
-- Contexto real (ver CLAUDE.md "Duplicado real de autoagendado —
-- investigación 2026-08-05"): la causa más probable identificada fue un
-- gap de idempotencia en publish-scheduled-posts.mjs (markPublished() no
-- chequeaba éxito del PATCH) — ya corregido en esa fecha con un chequeo de
-- res.ok + una función isStillScheduled() que re-consulta el status antes
-- de publicar cada entrada del manifiesto. Esta migración agrega una
-- segunda capa, a nivel de base, contra un problema relacionado pero
-- distinto: que dos propuestas terminen agendadas para la misma oferta,
-- misma fecha (día) y mismo formato — algo que el rotador de oferta y el
-- espaciado de 24h de orchestrator ya evita en el camino feliz, pero sin
-- ninguna garantía dura si dos sesiones de Mesa de Diálogo corrieran cerca
-- en el tiempo o si un agendado manual colisionara con uno automático.
--
-- Índice único parcial (solo aplica a status='scheduled' — una propuesta
-- puede pasar por rejected/published sin chocar con este constraint, y
-- claramente formatos sin pipeline autónomo como historia no agendan por
-- oferta+fecha de la misma forma). NULLs en oferta no colisionan entre sí
-- (comportamiento estándar de Postgres en índices únicos), consistente con
-- que oferta es nullable hasta que se agenda de verdad.
--
-- Verificado antes de aplicar: SELECT * FROM proposals WHERE
-- status='scheduled' devolvió 0 filas el 2026-08-16 — no hay riesgo de que
-- el índice falle por datos existentes.
--
-- Nota técnica real (encontrada al aplicar, no anticipada): Postgres NO
-- deja usar scheduled_at::date directo en un índice porque el cast
-- timestamptz→date depende del timezone de la sesión, así que no es
-- IMMUTABLE (error real: "42P17: functions in index expression must be
-- marked IMMUTABLE"). Se resuelve con una función wrapper que fija UTC
-- explícito — ahí el resultado ya no depende de ninguna sesión, es
-- genuinamente inmutable, no una mentira de volatilidad.
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/012_idempotencia_scheduling.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

CREATE OR REPLACE FUNCTION scheduled_day_utc(ts TIMESTAMPTZ)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$ SELECT (ts AT TIME ZONE 'UTC')::date $$;

DROP INDEX IF EXISTS idx_proposals_no_duplicate_schedule;

CREATE UNIQUE INDEX idx_proposals_no_duplicate_schedule
  ON proposals (oferta, scheduled_day_utc(scheduled_at), format)
  WHERE status = 'scheduled';

COMMENT ON INDEX idx_proposals_no_duplicate_schedule IS
  'Fase 1 del plan estratégico 2026-08-16: impide dos propuestas scheduled para la misma oferta+día+formato. Defensa a nivel de base, complementa el fix de idempotencia ya aplicado en publish-scheduled-posts.mjs el 2026-08-05.';
