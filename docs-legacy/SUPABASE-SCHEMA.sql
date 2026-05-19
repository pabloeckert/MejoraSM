-- ============================================
-- MejoraSM — Supabase Schema (Ejecutar en SQL Editor)
-- ============================================
-- Ir a: https://supabase.com/dashboard/project/exnjyxwmxknvzploeaex/sql/new
-- Pegar todo este archivo y ejecutar
-- ============================================

-- 1. Tabla de documentos (Bóveda de Conocimiento)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT, -- 'pdf', 'docx', 'txt', 'manual', 'buyer-persona', 'tone-voice'
  content TEXT, -- texto extraído del archivo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de diálogos (Mesa de Diálogo multi-agente)
CREATE TABLE IF NOT EXISTS dialogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'archived'
  topic TEXT, -- tema del post que se está generando
  target_audience TEXT, -- audiencia objetivo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de mensajes del diálogo (pasos de cada agente)
CREATE TABLE IF NOT EXISTS dialog_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dialog_id UUID REFERENCES dialogs(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'estratega', 'creativo', 'critico', 'user'
  content TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}', -- datos extra: tokens usados, modelo, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de contenidos generados
CREATE TABLE IF NOT EXISTS contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dialog_id UUID REFERENCES dialogs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  caption TEXT, -- texto del post
  hashtags TEXT[], -- array de hashtags
  hook TEXT, -- gancho del post
  cta TEXT, -- call to action
  image_url TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'published', 'rejected'
  platform TEXT DEFAULT 'instagram',
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de configuración de agentes
CREATE TABLE IF NOT EXISTS agent_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, -- 'estratega', 'creativo', 'critico'
  provider TEXT NOT NULL, -- 'groq', 'ollama', 'deepseek', 'gemini'
  model TEXT NOT NULL,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_name)
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialog_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuario solo ve sus propios datos
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own dialogs" ON dialogs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dialogs" ON dialogs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dialogs" ON dialogs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dialogs" ON dialogs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own dialog messages" ON dialog_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM dialogs WHERE dialogs.id = dialog_messages.dialog_id AND dialogs.user_id = auth.uid())
);
CREATE POLICY "Users can insert own dialog messages" ON dialog_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM dialogs WHERE dialogs.id = dialog_messages.dialog_id AND dialogs.user_id = auth.uid())
);

CREATE POLICY "Users can view own contents" ON contents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contents" ON contents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contents" ON contents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contents" ON contents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own agent config" ON agent_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agent config" ON agent_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agent config" ON agent_config FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Storage bucket para documentos
-- ============================================
-- Crear bucket manualmente en:
-- https://supabase.com/dashboard/project/exnjyxwmxknvzploeaex/storage/buckets
-- Nombre: documents
-- Public: NO (privado)
