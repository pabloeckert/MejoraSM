#!/bin/bash
# ============================================
# Fix PostgREST Schema Cache — MejoraSM
# Ejecutar: bash scripts/fix-postgrest.sh
# ============================================

set -e

PROJECT_REF="${SUPABASE_PROJECT_REF:-exnjyxwmxknvzploeaex}"

echo "🔧 Fix PostgREST Schema Cache"
echo "=============================="
echo "Project: $PROJECT_REF"
echo ""

echo "El problema: las tablas existen en PostgreSQL pero PostgREST no las ve."
echo "Error típico: PGRST205 - Could not find the table in the schema cache"
echo ""

# Método 1: Intentar con Supabase CLI
echo "Método 1: Intentando via Supabase CLI..."
echo ""

if npx supabase --version &>/dev/null; then
  echo "  Linkeando al proyecto..."
  npx supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true

  echo "  Ejecutando NOTIFY pgrst reload..."
  npx supabase db execute --project-ref "$PROJECT_REF" \
    "NOTIFY pgrst, 'reload schema'; SELECT pg_notify('pgrst', 'reload schema');" \
    2>/dev/null && echo "  ✅ NOTIFY enviado" || echo "  ⚠️  No se pudo ejecutar via CLI"
else
  echo "  ❌ Supabase CLI no disponible"
fi

echo ""
echo "Método 2: Acción manual requerida"
echo "  Si el método 1 no funcionó, hacer esto:"
echo ""
echo "  1. Ir a https://supabase.com/dashboard/project/$PROJECT_REF/settings/general"
echo "  2. Buscar 'Restart project' o 'Pause project' → 'Resume project'"
echo "  3. Esperar 2-3 minutos"
echo "  4. Verificar en SQL Editor:"
echo "     SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
echo "  5. Probar la API:"
echo "     curl '$PROJECT_REF.supabase.co/rest/v1/documents?select=id&limit=1' \\"
echo "       -H 'apikey: TU_ANON_KEY'"
echo ""
echo "Método 3: Re-ejecutar el schema"
echo "  Si nada funciona, re-ejecutar el schema completo:"
echo "  1. Ir al SQL Editor en el dashboard"
echo "  2. Ejecutar: supabase/migrations/001_initial_schema.sql"
echo "  3. Luego ejecutar: supabase/migrations/001_fix_policies.sql"
echo ""
echo "=============================="
