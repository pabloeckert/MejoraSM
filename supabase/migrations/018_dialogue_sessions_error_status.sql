-- Hallazgo real de auditoría 2026-08-25: si el debate de 3 agentes falla a
-- mitad de camino (Anthropic y Groq caídos a la vez, timeout, etc.), la
-- sesión quedaba en 'active' para siempre — indistinguible en la UI de una
-- sesión que sigue en curso ahora mismo. orchestrator/index.ts va a marcar
-- 'error' explícitamente en ese caso; agregamos el valor al check
-- constraint real.
ALTER TABLE dialogue_sessions DROP CONSTRAINT IF EXISTS dialogue_sessions_status_check;
ALTER TABLE dialogue_sessions ADD CONSTRAINT dialogue_sessions_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'approved'::text, 'needs_review'::text, 'completed'::text, 'archived'::text, 'closed'::text, 'error'::text]));
