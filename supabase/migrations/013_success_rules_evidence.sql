-- Migration: Fase 2 del plan estratégico 2026-08-16 — evidence real en
-- success_rules
--
-- Bug encontrado al implementar la inyección de reglas aprendidas en los
-- prompts de orchestrator (cerrar el loop de aprendizaje): RuleCandidate
-- en rule-engine/index.ts siempre calculó un campo "evidence" (ej. "4
-- posts con engagement promedio de 16.8%") y lo devolvía en la respuesta
-- de la API, pero saveRules() nunca lo escribía en la base — la columna
-- ni siquiera existía en success_rules (solo rule_type, condition,
-- action, confidence, times_applied, success_rate). orchestrator no podía
-- citar evidencia real al inyectar una regla en el prompt del Estratega/
-- Creativo sin esto.
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/013_success_rules_evidence.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

ALTER TABLE success_rules
  ADD COLUMN IF NOT EXISTS evidence TEXT;

COMMENT ON COLUMN success_rules.evidence IS
  'Evidencia numérica textual de la regla (ej. "4 posts con engagement promedio de 16.8%") — rule-engine ya la calculaba pero nunca la persistía. Fase 2 del plan estratégico 2026-08-16.';
