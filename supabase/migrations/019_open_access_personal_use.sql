-- Reversión deliberada y explícita del RLS real (006_real_rls_and_auth.sql)
-- a pedido directo de Pablo, 2026-08-25: "es para uso personal, saca el
-- login... que sea sin login" — confirmado después de explicarle el riesgo
-- real (el sitio queda en una URL pública de GitHub Pages, sin login
-- cualquiera con el link podría publicar en Instagram/Facebook real,
-- borrar datos, gastar créditos de IA, o leer la Bóveda de marca). Pablo
-- eligió explícitamente "quiero que quede sin login igual, entiendo el
-- riesgo" — es su sistema, su decisión sobre su propio riesgo.
--
-- Esto vuelve exactamente al estado "Allow all" anterior al 2026-07-28,
-- documentado en el propio 006_real_rls_and_auth.sql como el problema que
-- esa migración resolvía. Se deja como registro histórico explícito de que
-- esto fue una decisión consciente, no un descuido — si en el futuro hace
-- falta volver a cerrar el acceso, 006_real_rls_and_auth.sql tiene el SQL
-- exacto para reaplicar.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'documents', 'doc_chunks', 'agent_config', 'dialogue_sessions',
    'dialogue_messages', 'proposals', 'metrics', 'success_rules',
    'templates', 'run_log', 'copilot_advice', 'historial_cache'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Allow all" ON %I FOR ALL USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- Storage: bucket 'vault'
DROP POLICY IF EXISTS "Admin vault upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin vault read" ON storage.objects;
DROP POLICY IF EXISTS "Admin vault delete" ON storage.objects;

CREATE POLICY "Allow vault upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'vault');

CREATE POLICY "Allow vault read" ON storage.objects
  FOR SELECT USING (bucket_id = 'vault');

CREATE POLICY "Allow vault delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'vault');

-- Verificación
SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname = 'public';
