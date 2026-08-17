-- Migration: causa raíz real del "Failed to fetch" del Monitor (2026-08-17)
--
-- El Monitor (y el Dashboard, para el desglose por red) leían
-- content/log/historial.json directo de raw.githubusercontent.com. Ese
-- servicio tiene caídas reales y documentadas — confirmado en vivo el
-- 2026-08-17 (githubstatus.com: "Partially Degraded Service" mientras
-- Pablo reportaba el error) y confirmado por investigación de mercado:
-- 257 incidentes de GitHub entre mayo 2025 y abril 2026, 48 outages
-- mayores. No es un caso raro, es un punto de falla real y recurrente.
--
-- Fix de raíz: sync-history.mjs (ya corre cada 6hs) ahora ADEMÁS de
-- escribir el JSON al repo (que sigue sirviendo al dashboard/index.html
-- estático, sin login, que no puede autenticarse contra Supabase) escribe
-- una fila cacheada acá — el Monitor del EDA (que ya requiere login) lee
-- de Supabase directo, mucho más confiable que un CDN de contenido
-- estático de un tercero.
--
-- Fila única (singleton, id fijo) — se pisa entera en cada sync, no hay
-- historial de historiales, solo el último estado sincronizado.
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/016_historial_cache.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

CREATE TABLE IF NOT EXISTS historial_cache (
  id INTEGER PRIMARY KEY DEFAULT 1,
  -- Nullable a propósito: mark-manual.mjs puede correr antes de que
  -- sync-history.mjs haya sincronizado por primera vez (caso raro pero
  -- real, ej. una instalación nueva) — no debe fallar por eso.
  synced_at TIMESTAMPTZ,
  posts JSONB NOT NULL DEFAULT '[]',
  acciones_manuales JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT historial_cache_singleton CHECK (id = 1)
);

ALTER TABLE historial_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON historial_cache;
CREATE POLICY "Admin full access" ON historial_cache
  FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

COMMENT ON TABLE historial_cache IS
  'Caché real del historial sincronizado desde Zernio (fix de raíz del "Failed to fetch" del Monitor, 2026-08-17) — fila única, escrita por sync-history.mjs (posts) y mark-manual.mjs (acciones_manuales), leída por /monitor del EDA en vez de raw.githubusercontent.com. content/log/historial.json en el repo sigue existiendo en paralelo, para el dashboard/index.html estático que no tiene sesión de Supabase.';
