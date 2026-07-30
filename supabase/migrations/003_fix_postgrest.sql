-- Fix: Forzar reconocimiento de tablas por PostgREST
-- Ejecutar esto en el SQL Editor de Supabase si las tablas no son reconocidas
-- Problema: PGRST205 - Could not find the table in the schema cache

-- 1. Asegurar que las tablas existen y tienen los permisos correctos
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'documents', 'doc_chunks', 'agent_config',
    'dialogue_sessions', 'dialogue_messages',
    'proposals', 'calendar_events', 'metrics', 'success_rules'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Verificar que la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      -- Otorgar permisos explícitos a anon y authenticated
      EXECUTE format('GRANT ALL ON %I TO anon', tbl);
      EXECUTE format('GRANT ALL ON %I TO authenticated', tbl);
      EXECUTE format('GRANT ALL ON %I TO service_role', tbl);
      RAISE NOTICE 'Tabla %: permisos otorgados', tbl;
    ELSE
      RAISE WARNING 'Tabla % NO EXISTE', tbl;
    END IF;
  END LOOP;
END $$;

-- 2. Asegurar permisos en el schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 3. Permisos en storage
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;

-- 4. Forzar reload del schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- 5. Verificar que las tablas son visibles
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 6. Verificar permisos
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;

-- Si después de ejecutar esto PostgREST sigue sin ver las tablas,
-- reiniciar el proyecto desde el dashboard:
-- Project Settings → General → Pause project → Resume project
