-- Migration: Índices de performance + ajuste IVFFlat
-- Ejecutar en SQL Editor de Supabase DESPUÉS de 001_initial_schema.sql

-- ═══════════════════════════════════════════
-- COLUMNAS FALTANTES
-- ═══════════════════════════════════════════

-- metadata en proposals (para tracking de errores de publicación)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE proposals ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- ÍNDICES PARA QUERIES FRECUENTES
-- ═══════════════════════════════════════════

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

-- Doc chunks
CREATE INDEX IF NOT EXISTS idx_doc_chunks_document_id ON doc_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_created_at ON doc_chunks(created_at DESC);

-- Dialogue sessions
CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_status ON dialogue_sessions(status);
CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_created_at ON dialogue_sessions(created_at DESC);

-- Dialogue messages
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_session_id ON dialogue_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_session_turn ON dialogue_messages(session_id, turn);

-- Proposals
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_session_id ON proposals(session_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

-- Calendar events
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

-- Metrics
CREATE INDEX IF NOT EXISTS idx_metrics_proposal_id ON metrics(proposal_id);
CREATE INDEX IF NOT EXISTS idx_metrics_measured_at ON metrics(measured_at DESC);

-- Success rules
CREATE INDEX IF NOT EXISTS idx_success_rules_confidence ON success_rules(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_success_rules_type ON success_rules(rule_type);

-- ═══════════════════════════════════════════
-- AJUSTAR IVFFLAT PARA DATASETS PEQUEÑOS
-- ═══════════════════════════════════════════

-- IVFFlat con lists=100 requiere ~10K+ rows para ser eficiente.
-- Para un proyecto nuevo con <1000 documentos, lists=10 es más apropiado.
-- Nota: esto requiere eliminar y recrear el índice.

-- DROP INDEX IF EXISTS idx_doc_chunks_embedding;
-- CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding
--   ON doc_chunks USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 10);

-- Descomentar arriba cuando se quiera ajustar.
-- Para datasets muy pequeños (<100 rows), el seq scan puede ser más rápido que IVFFlat.

-- ═══════════════════════════════════════════
-- CHECK CONSTRAINTS PARA VALORES VÁLIDOS
-- ═══════════════════════════════════════════

-- Status de dialogue_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dialogue_sessions_status_check'
  ) THEN
    ALTER TABLE dialogue_sessions
      ADD CONSTRAINT dialogue_sessions_status_check
      CHECK (status IN ('active', 'approved', 'needs_review', 'closed'));
  END IF;
END $$;

-- Status de proposals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_status_check'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled', 'published'));
  END IF;
END $$;

-- Format de proposals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_format_check'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_format_check
      CHECK (format IN ('post', 'carrusel', 'historia', 'reel', 'story'));
  END IF;
END $$;

-- Status de calendar_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_status_check'
  ) THEN
    ALTER TABLE calendar_events
      ADD CONSTRAINT calendar_events_status_check
      CHECK (status IN ('scheduled', 'published', 'cancelled'));
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════

-- Listar índices creados
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
