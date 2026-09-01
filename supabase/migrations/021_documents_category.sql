-- 021_documents_category.sql
-- Fase C del plan de continuación (2026-08-31) — "Manual de Identidad de Marca".
--
-- La Bóveda hasta ahora era una lista plana de documentos sin ningún tipo.
-- El brief de rediseño (2026-08-16) pide organizarlos por categoría y que el
-- sistema clasifique el tipo de cada documento al subirlo (manual / buyer
-- persona / tono de voz / ejemplo). vault-process hace la clasificación con
-- un llamado corto al LLM después de extraer el texto; el humano puede
-- corregirla desde la UI.
--
-- Sin CHECK constraint a propósito: la lista de categorías puede crecer y no
-- queremos una migración nueva cada vez. La UI ofrece un set fijo.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN documents.category IS
  'Tipo de documento de marca: manual | buyer_persona | tono | ejemplo | otro. Lo propone vault-process (LLM) al procesar; editable desde /boveda.';

-- Índice para la vista agrupada por categoría de /boveda.
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents (category);
