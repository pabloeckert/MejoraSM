-- 023_reclose_access_password.sql
-- Fase E del plan de continuación — VUELVE A CERRAR EL ACCESO. Pedido directo
-- de Pablo (2026-08-31): "un solo password usuario y contraseña y el mail de
-- registro para recupero si pierde contraseña o se olvida para blanqueo. un
-- rol read-only para Sindy No es necesario mas".
--
-- Revierte 019_open_access_personal_use.sql: el RLS "Allow all" vuelve a
-- "Admin full access" USING (is_app_admin()) en todas las tablas reales, y
-- el bucket 'vault' vuelve a admin-only. El frontend recupera el AuthGate +
-- login por email/contraseña (una sola cuenta compartida: la que ya existe
-- en app_admins), con blanqueo por email vía Supabase Auth.
--
-- NO es multi-usuario ni multi-rol: es UNA credencial compartida. app_admins
-- sigue teniendo un solo email. is_app_admin() ya existe (006), acá solo se
-- asegura idempotente.

-- ═══════════════════════════════════════════
-- FUNCIÓN DE CHEQUEO (idempotente, igual que 006)
-- ═══════════════════════════════════════════

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
-- CERRAR TODAS LAS TABLAS REALES (estado a 2026-08-31)
-- ═══════════════════════════════════════════

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'documents', 'doc_chunks', 'agent_config', 'dialogue_sessions',
    'dialogue_messages', 'proposals', 'metrics', 'success_rules',
    'templates', 'run_log', 'copilot_advice', 'historial_cache',
    'insights_cache', 'insight_feedback', 'proposal_comments'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Admin full access" ON %I FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin())',
      t
    );
  END LOOP;
END $$;

-- ═══════════════════════════════════════════
-- STORAGE: bucket 'vault' — admin-only
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

SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
