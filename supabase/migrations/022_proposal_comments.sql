-- 022_proposal_comments.sql
-- Fase E del plan de continuación (2026-08-31) — parte que NO depende de la
-- puerta de acceso.
--
-- Comentarios anclados a una propuesta, para que Pablo y Sindy discutan una
-- pieza dentro del sistema en vez de por afuera. El "rol de revisor" real
-- (acceso read-only por persona) necesita la puerta de acceso primero — eso
-- queda para cuando Pablo lo decida. Esta tabla y su UI sirven igual sin la
-- puerta: cualquiera que entre puede comentar firmando con su nombre.
--
-- `author` es texto libre (no hay auth por persona todavía) — el frontend lo
-- recuerda en localStorage. Cuando exista la puerta, se puede migrar a un
-- identificador real sin perder los comentarios viejos.

CREATE TABLE IF NOT EXISTS proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  author TEXT NOT NULL DEFAULT 'anónimo',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal
  ON proposal_comments (proposal_id, created_at);

ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;

-- Mismo criterio de acceso abierto que el resto del schema post-019
-- (uso personal, decisión de Pablo del 2026-08-25).
DROP POLICY IF EXISTS "Allow all" ON proposal_comments;
CREATE POLICY "Allow all" ON proposal_comments FOR ALL USING (true) WITH CHECK (true);
