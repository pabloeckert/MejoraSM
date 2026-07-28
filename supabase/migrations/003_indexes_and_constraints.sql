-- DEPRECADA — NO EJECUTAR.
-- Duplicado de 003_indexes_constraints.sql con valores de constraints
-- distintos (ej. dialogue_sessions_status_check difiere). Se detectó la
-- divergencia el 2026-07-28; 003_indexes_constraints.sql queda como versión
-- canónica (usa DO-blocks idempotentes con chequeo de pg_constraint, más
-- seguro de re-correr). 004_reconcile_status_constraints.sql deja los
-- constraints en el estado final acordado sin importar cuál de las dos
-- se haya corrido antes en la base real.
--
-- Migration: Índices y constraints adicionales
-- Fecha: 2026-04-29
-- Ejecutar en Supabase SQL Editor

-- ═══════════════════════════════════════════
-- ÍNDICES PARA QUERIES FRECUENTES
-- ═══════════════════════════════════════════

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

-- Doc chunks
CREATE INDEX IF NOT EXISTS idx_doc_chunks_document_id ON doc_chunks(document_id);

-- Dialogue sessions
CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_status ON dialogue_sessions(status);
CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_created_at ON dialogue_sessions(created_at DESC);

-- Dialogue messages
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_session_id ON dialogue_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_turn ON dialogue_messages(session_id, turn);

-- Proposals
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_session_id ON proposals(session_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

-- Calendar events
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);

-- Metrics
CREATE INDEX IF NOT EXISTS idx_metrics_proposal_id ON metrics(proposal_id);
CREATE INDEX IF NOT EXISTS idx_metrics_measured_at ON metrics(measured_at DESC);

-- Success rules
CREATE INDEX IF NOT EXISTS idx_success_rules_confidence ON success_rules(confidence DESC);

-- ═══════════════════════════════════════════
-- AJUSTAR IVFFLAT PARA DATASETS PEQUEÑOS
-- ═══════════════════════════════════════════

-- Para <1000 rows, lists=10 es más óptimo que lists=100
-- Nota: requiere recrear el índice (DROP + CREATE)
-- Solo ejecutar si la tabla doc_chunks tiene menos de 1000 rows

-- DROP INDEX IF EXISTS idx_doc_chunks_embedding;
-- CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding
--   ON doc_chunks USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 10);

-- ═══════════════════════════════════════════
-- CHECK CONSTRAINTS PARA ENUMS
-- ═══════════════════════════════════════════

-- Dialogue sessions status
ALTER TABLE dialogue_sessions DROP CONSTRAINT IF EXISTS chk_dialogue_sessions_status;
ALTER TABLE dialogue_sessions ADD CONSTRAINT chk_dialogue_sessions_status
  CHECK (status IN ('active', 'approved', 'needs_review', 'completed', 'archived'));

-- Proposals status
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS chk_proposals_status;
ALTER TABLE proposals ADD CONSTRAINT chk_proposals_status
  CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled', 'published'));

-- Proposals format
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS chk_proposals_format;
ALTER TABLE proposals ADD CONSTRAINT chk_proposals_format
  CHECK (format IN ('post', 'carrusel', 'historia', 'reel', 'story'));

-- Calendar events status
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS chk_calendar_events_status;
ALTER TABLE calendar_events ADD CONSTRAINT chk_calendar_events_status
  CHECK (status IN ('scheduled', 'published', 'cancelled', 'draft'));

-- Success rules type
ALTER TABLE success_rules DROP CONSTRAINT IF EXISTS chk_success_rules_type;
ALTER TABLE success_rules ADD CONSTRAINT chk_success_rules_type
  CHECK (rule_type IN ('hook', 'format', 'timing', 'hashtag', 'tone', 'persona', 'general'));

-- Verificar
SELECT 'Índices creados' AS status;
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
