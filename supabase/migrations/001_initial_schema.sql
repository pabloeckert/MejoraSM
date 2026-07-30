-- Migration: Sistema EDA - Tablas principales
-- Fecha: 2026-04-22

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════
-- BÓVEDA DE CONOCIMIENTO
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  content TEXT,
  word_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  token_count INT,
  embedding vector(384),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice de búsqueda vectorial
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding
  ON doc_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ═══════════════════════════════════════════
-- AGENTES
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_config (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'groq',
  model TEXT NOT NULL,
  system_prompt TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INT DEFAULT 2048,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración por defecto
INSERT INTO agent_config (id, provider, model, system_prompt, temperature) VALUES
  ('estratega', 'groq', 'llama-4-scout-8b-instruct',
   'Sos el Agente Estratega de MejoraOK. Tu trabajo es proponer temas, ángulos y estrategias de contenido para Instagram. Siempre basate en los documentos de la marca y los buyer personas. Sé directo, argentino, sin vueltas.',
   0.8),
  ('creativo', 'groq', 'llama-4-scout-8b-instruct',
   'Sos el Agente Creativo de MejoraOK. Tu trabajo es redactar copys, hooks, CTAs y sugerir dirección visual. Tono argentino, directo, emocional. Cada copy debe conectar con un buyer persona específico.',
   0.9),
  ('critico', 'deepseek', 'deepseek-chat',
   'Sos el Agente Crítico de MejoraOK. Tu trabajo es evaluar el contenido contra los documentos de marca. Aprobás solo si cumple el criterio comercial. Rechazás con razón específica. Sos el guardián de la calidad.',
   0.3)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════
-- MESA DE DIÁLOGO
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dialogue_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT,
  buyer_persona TEXT,
  status TEXT DEFAULT 'active',
  final_proposal TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dialogue_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dialogue_sessions(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  content TEXT NOT NULL,
  turn INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- PROPUESTAS DE CONTENIDO
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dialogue_sessions(id),
  format TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  hook TEXT,
  cta TEXT,
  buyer_persona TEXT,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  instagram_post_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- CALENDARIO EDITORIAL
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  time_slot TEXT,
  format TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- MÉTRICAS Y APRENDIZAJE
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id),
  post_id TEXT,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  reach INT DEFAULT 0,
  impressions INT DEFAULT 0,
  engagement_rate REAL GENERATED ALWAYS AS (
    CASE WHEN impressions > 0
    THEN (likes + comments + shares + saves)::REAL / impressions * 100
    ELSE 0 END
  ) STORED,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS success_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL,
  condition JSONB NOT NULL,
  action JSONB NOT NULL,
  confidence REAL DEFAULT 0.5,
  times_applied INT DEFAULT 0,
  success_rate REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════

-- Por ahora permitir acceso público (proyecto personal)
-- En producción, activar RLS con auth

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogue_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_rules ENABLE ROW LEVEL SECURITY;

-- Políticas temporales (acceso total sin auth)
CREATE POLICY "Allow all" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON doc_chunks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON agent_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON dialogue_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON dialogue_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON success_rules FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- STORAGE BUCKET
-- ═══════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow vault upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'vault');

CREATE POLICY "Allow vault read" ON storage.objects
  FOR SELECT USING (bucket_id = 'vault');

CREATE POLICY "Allow vault delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'vault');

-- ═══════════════════════════════════════════
-- FUNCIÓN DE BÚSQUEDA VECTORIAL (RAG)
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
  match_count INT DEFAULT 5,
  similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    (1 - (dc.embedding <=> query_embedding))::REAL AS similarity
  FROM doc_chunks dc
  WHERE (1 - (dc.embedding <=> query_embedding))::REAL > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
