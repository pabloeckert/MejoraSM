-- 004_security_hardening.sql
-- Security hardening: índices de performance + RLS mejorado para single-tenant
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- ═══════════════════════════════════════════════════
-- 1. ÍNDICES PARA PERFORMANCE (queries frecuentes)
-- ═══════════════════════════════════════════════════

-- Sesiones de diálogo por status (Dashboard, Laboratorio)
CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_status
  ON dialogue_sessions(status);

-- Sesiones por fecha de creación (listado cronológico)
CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_created_at
  ON dialogue_sessions(created_at DESC);

-- Mensajes por sesión (Mesa de Diálogo)
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_session_turn
  ON dialogue_messages(session_id, turn ASC);

-- Propuestas por status (Laboratorio, Propuestas)
CREATE INDEX IF NOT EXISTS idx_proposals_status
  ON proposals(status);

-- Propuestas por fecha de creación
CREATE INDEX IF NOT EXISTS idx_proposals_created_at
  ON proposals(created_at DESC);

-- Eventos de calendario por fecha
CREATE INDEX IF NOT EXISTS idx_calendar_events_date
  ON calendar_events(date ASC);

-- Métricas por propuesta
CREATE INDEX IF NOT EXISTS idx_metrics_proposal_id
  ON metrics(proposal_id);

-- Documentos por fecha (Bóveda)
CREATE INDEX IF NOT EXISTS idx_documents_created_at
  ON documents(created_at DESC);

-- Chunks por documento (RAG processing)
CREATE INDEX IF NOT EXISTS idx_doc_chunks_document_id
  ON doc_chunks(document_id, chunk_index ASC);

-- Reglas de éxito por tipo y confianza (Rule Engine)
CREATE INDEX IF NOT EXISTS idx_success_rules_type_confidence
  ON success_rules(rule_type, confidence DESC);

-- ═══════════════════════════════════════════════════
-- 2. CONSTRAINTS DE VALIDACIÓN
-- ═══════════════════════════════════════════════════

-- Asegurar que el status de sesiones sea válido
ALTER TABLE dialogue_sessions
  DROP CONSTRAINT IF EXISTS chk_dialogue_sessions_status,
  ADD CONSTRAINT chk_dialogue_sessions_status
    CHECK (status IN ('active', 'approved', 'rejected', 'needs_review'));

-- Asegurar que el status de propuestas sea válido
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS chk_proposals_status,
  ADD CONSTRAINT chk_proposals_status
    CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled', 'published'));

-- Asegurar que el formato de propuestas sea válido
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS chk_proposals_format,
  ADD CONSTRAINT chk_proposals_format
    CHECK (format IN ('post', 'carrusel', 'historia', 'reel'));

-- Asegurar confianza de reglas entre 0 y 1
ALTER TABLE success_rules
  DROP CONSTRAINT IF EXISTS chk_success_rules_confidence,
  ADD CONSTRAINT chk_success_rules_confidence
    CHECK (confidence >= 0 AND confidence <= 1);

-- ═══════════════════════════════════════════════════
-- 3. RLS — Sistema single-tenant (sin auth por ahora)
-- Mantener políticas permisivas hasta implementar auth
-- TODO FASE 6: reemplazar con políticas basadas en auth.uid()
-- ═══════════════════════════════════════════════════

-- Las políticas "Allow all" son intencionales para MVP single-tenant
-- (solo Pablo usa el sistema, desde su red/sesión)
-- Las Edge Functions usan service_role_key que bypassa RLS de todas formas

-- Asegurar que RLS está habilitado en todas las tablas
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogue_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_rules ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════
-- 4. AUDITORÍA — Timestamps automáticos
-- ═══════════════════════════════════════════════════

-- Función para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en proposals
DROP TRIGGER IF EXISTS set_proposals_updated_at ON proposals;
CREATE TRIGGER set_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger en dialogue_sessions
DROP TRIGGER IF EXISTS set_dialogue_sessions_updated_at ON dialogue_sessions;
CREATE TRIGGER set_dialogue_sessions_updated_at
  BEFORE UPDATE ON dialogue_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger en agent_config
DROP TRIGGER IF EXISTS set_agent_config_updated_at ON agent_config;
CREATE TRIGGER set_agent_config_updated_at
  BEFORE UPDATE ON agent_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════
-- 5. VERIFICACIÓN
-- ═══════════════════════════════════════════════════

-- Verificar índices creados
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
