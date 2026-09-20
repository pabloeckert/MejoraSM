-- 027_inbox_persona_id.sql
-- Persistencia de derivación a CRM central (contactos-api) en bandeja de conversaciones
-- y soporte de metadatos estructurados en la Bóveda de literatura.

ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS persona_id TEXT;
CREATE INDEX IF NOT EXISTS idx_inbox_items_persona_id ON inbox_items (persona_id) WHERE persona_id IS NOT NULL;
COMMENT ON COLUMN inbox_items.persona_id IS 'UUID del contacto unificado devuelto por contactos-api (persona_id)';

-- Soporte de metadatos estructurados para documentos de la Bóveda
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING gin(metadata);
COMMENT ON COLUMN documents.metadata IS 'Metadatos B2B: autor, titulo, categoria, tags, chunks_count, total_words';
