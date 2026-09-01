-- 024_inbox.sql
-- Fase 1 del plan de publicación 2026 — Bandeja de conversaciones.
--
-- El sistema publicaba y medía números, pero nunca veía lo que la gente
-- DICE. Zernio ya expone comentarios y DMs de Instagram y Facebook
-- (permisos otorgados: instagram_business_manage_comments/messages,
-- pages_manage_engagement/messaging). Esta tabla guarda lo que trae la
-- Edge Function `inbox`, con una etiqueta de sentimiento del LLM.
--
-- Un solo tipo de fila (`kind`) para comentario o DM. Las respuestas que
-- mandamos nosotros se guardan como filas con direction='outgoing'.

CREATE TABLE IF NOT EXISTS inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('comment', 'dm')),
  platform TEXT NOT NULL,            -- instagram | facebook
  account_id TEXT NOT NULL,          -- id de la cuenta en Zernio
  -- comment: el _id del post en Zernio ; dm: el id de la conversación
  thread_id TEXT NOT NULL,
  -- comment: el id del comentario ; dm: el id del mensaje
  external_id TEXT NOT NULL,
  author_name TEXT,
  author_username TEXT,
  author_is_follower BOOLEAN,
  text TEXT,
  attachment_url TEXT,
  direction TEXT NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming', 'outgoing')),
  sentiment TEXT CHECK (sentiment IN ('positivo', 'neutral', 'negativo', 'pregunta')),
  sentiment_note TEXT,
  item_time TIMESTAMPTZ,             -- cuándo pasó en la red
  replied_at TIMESTAMPTZ,            -- cuándo respondimos (en la fila del mensaje entrante)
  archived BOOLEAN NOT NULL DEFAULT false,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, platform, external_id)
);

ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON inbox_items;
CREATE POLICY "Admin full access" ON inbox_items FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

CREATE INDEX IF NOT EXISTS idx_inbox_items_time ON inbox_items (item_time DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_items_open
  ON inbox_items (replied_at, archived)
  WHERE direction = 'incoming';

-- Estado de sincronización (un solo registro) para saber "hasta cuándo
-- trajimos" y no re-clasificar todo cada vez.
CREATE TABLE IF NOT EXISTS inbox_sync_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_synced_at TIMESTAMPTZ,
  last_error TEXT
);
INSERT INTO inbox_sync_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE inbox_sync_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON inbox_sync_state;
CREATE POLICY "Admin full access" ON inbox_sync_state FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());
