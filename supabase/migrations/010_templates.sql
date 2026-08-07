-- Migration: estructura de plantillas de contenido (sin motor de render)
--
-- Solo el CRUD estructural pedido en el rediseño de Propuestas
-- (listar/crear/editar) — el motor de render que efectivamente use estas
-- plantillas para generar piezas viene después, no en esta migración. El
-- concepto se conecta a futuro con templates/post-template.html y
-- templates/story-template.html (los templates HTML reales que ya usa
-- Playwright para renderizar) — hoy son dos cosas separadas a propósito.
--
-- format usa el mismo universo real de valores que orchestrator produce
-- (post | carrusel | historia) — no reel/story (legacy del constraint de
-- proposals, sin ningún caller real) ni video (ni siquiera está permitido
-- por proposals_format_check).
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/010_templates.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  format TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_format_check;
ALTER TABLE templates ADD CONSTRAINT templates_format_check
  CHECK (format IN ('post', 'carrusel', 'historia'));

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON templates;
CREATE POLICY "Admin full access" ON templates
  FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

COMMENT ON TABLE templates IS
  'Plantillas de pieza reutilizables, solo estructura (nombre/formato/notas) — sin motor de render todavía. CRUD real desde /propuestas.';
