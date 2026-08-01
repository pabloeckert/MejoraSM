-- Migration: soporte para publicar posts de feed de forma autónoma
--
-- Hasta acá `proposals` no tenía forma de indicar de qué foto salía la
-- imagen del post (content/inbox/<oferta>/), ni dónde quedó la imagen ya
-- renderizada, ni el id del post en Zernio (el publisher viejo, basado en
-- la Graph API de Meta directa, usaba `instagram_post_id`, que se deja
-- como está por compatibilidad con datos históricos).
--
-- Ejecutar vía `supabase db query --linked "$(cat supabase/migrations/007_feed_posts_render.sql)"`
-- o el SQL Editor del dashboard — NO con `supabase db push` (roto, ver
-- CLAUDE.md "Bug conocido del CLI").

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS oferta TEXT,
  ADD COLUMN IF NOT EXISTS rendered_image_path TEXT,
  ADD COLUMN IF NOT EXISTS zernio_post_id TEXT;

COMMENT ON COLUMN proposals.oferta IS
  'Carpeta de content/inbox/ de donde sale la foto del post (personal | organizacional | comercial | empresarial | profesionalizacion). La elige el operador al agendar la propuesta.';
COMMENT ON COLUMN proposals.rendered_image_path IS
  'Ruta relativa al repo de la imagen ya renderizada (content/published/post-...). La completa scripts/render-scheduled-posts.mjs.';
COMMENT ON COLUMN proposals.zernio_post_id IS
  'Id del post en Zernio, devuelto al publicar vía scripts/publish-scheduled-posts.mjs. Distinto de instagram_post_id (legacy, del publisher viejo con la Graph API directa).';
