-- Migration: RLS real basada en autenticación (reemplaza "Allow all")
--
-- Antes: todas las políticas eran `USING (true) WITH CHECK (true)` — con la
-- anon key (pública por diseño, va en el bundle del frontend) cualquiera en
-- internet podía leer/escribir/borrar TODO en cada tabla y en el bucket
-- 'vault'. Esta migración reemplaza eso por: solo usuarios autenticados
-- (Supabase Auth) cuyo email esté en app_admins tienen acceso. El resto
-- (anon, o autenticado pero no admin) no ve ni puede tocar nada.
--
-- Las Edge Functions siguen funcionando igual: usan SUPABASE_SERVICE_ROLE_KEY,
-- que bypasea RLS por diseño de Postgres/Supabase — no dependen de estas
-- políticas.
--
-- Ejecutar en Supabase SQL Editor, o vía `supabase db push`.

-- ═══════════════════════════════════════════
-- TABLA DE ADMINS + FUNCIÓN DE CHEQUEO
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_admins (
  email TEXT PRIMARY KEY
);

ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;
-- Sin políticas para anon/authenticated a propósito: nadie puede leer esta
-- tabla directo. Solo la función is_app_admin() (SECURITY DEFINER) y el
-- service role la consultan.

INSERT INTO app_admins (email) VALUES ('pablo@mejoraok.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_admins
    WHERE email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ═══════════════════════════════════════════
-- REEMPLAZAR "Allow all" EN LAS 9 TABLAS
-- ═══════════════════════════════════════════

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'documents', 'doc_chunks', 'agent_config', 'dialogue_sessions',
    'dialogue_messages', 'proposals', 'calendar_events', 'metrics', 'success_rules'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Admin full access" ON %I FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin())',
      t
    );
  END LOOP;
END $$;

-- ═══════════════════════════════════════════
-- STORAGE: bucket 'vault' — mismo criterio
-- ═══════════════════════════════════════════

DROP POLICY IF EXISTS "Allow vault upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow vault read" ON storage.objects;
DROP POLICY IF EXISTS "Allow vault delete" ON storage.objects;
DROP POLICY IF EXISTS "Admin vault upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin vault read" ON storage.objects;
DROP POLICY IF EXISTS "Admin vault delete" ON storage.objects;

CREATE POLICY "Admin vault upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'vault' AND is_app_admin());

CREATE POLICY "Admin vault read" ON storage.objects
  FOR SELECT USING (bucket_id = 'vault' AND is_app_admin());

CREATE POLICY "Admin vault delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'vault' AND is_app_admin());

-- ═══════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════

SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname = 'public';
