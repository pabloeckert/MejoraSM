-- Hallazgo real de auditoría 2026-08-25: hasta ahora el badge de estado en
-- /boveda (Boveda.tsx) infería "Procesado" solo de que `documents.content`
-- existiera. Eso deja tres casos reales indistinguibles de "todo bien":
-- 1. La extracción de texto falló (o extrajo basura de un binario) pero
--    igual guardó algo en `content` antes del error siguiente.
-- 2. El chunking/insert de doc_chunks falló DESPUÉS de guardar `content`
--    (documento "fantasma": content lleno, 0 chunks reales).
-- 3. Los embeddings fallaron (HF caído/rate-limited) — quedan chunks
--    guardados SIN vector, invisibles para match_documents (RAG), sin que
--    la UI lo muestre.
-- Esta columna la escribe supabase/functions/vault-process/index.ts en
-- cada paso real del proceso, para que la UI lea el estado real en vez de
-- inferirlo.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (processing_status IN ('pending', 'extracting', 'chunking', 'embedding', 'ready', 'ready_no_search', 'error'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Backfill de los documentos ya existentes: si tienen content, asumimos
-- que llegaron a procesarse bien en su momento (no hay forma real de saber
-- retroactivamente si tuvieron embeddings — se marcan 'ready', el peor
-- caso es que alguno en realidad esté en 'ready_no_search' y no se note,
-- que es exactamente el estado que ya tenían ANTES de esta migración, sin
-- retroceso real).
UPDATE documents SET processing_status = 'ready' WHERE content IS NOT NULL AND processing_status = 'pending';
