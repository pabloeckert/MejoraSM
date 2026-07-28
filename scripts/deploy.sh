#!/bin/bash
# ============================================
# Script de Deploy — MejoraSM Edge Functions
# Ejecutar: bash scripts/deploy.sh
# ============================================

set -e

# Antes tenía un PROJECT_REF hardcodeado ("exnjyxwmxknvzploeaex") que no
# coincidía con supabase/config.toml ("hsglmdarztrshihmzfph") — riesgo real
# de deployar al proyecto Supabase equivocado. Ahora se lee directo del
# config.toml, que es la fuente de verdad del repo. Si en algún momento
# el proyecto real difiere de config.toml, corregir ahí, no acá.
PROJECT_REF="$(grep -E '^project_id' "$(dirname "$0")/../supabase/config.toml" | sed -E 's/project_id = "(.*)"/\1/')"
if [ -z "$PROJECT_REF" ]; then
  echo "❌ No se pudo leer project_id de supabase/config.toml"
  exit 1
fi

echo "🚀 Deploy de Edge Functions — MejoraSM"
echo "======================================="

# 1. Verificar login
echo ""
echo "1. Verificando login en Supabase..."
if ! npx supabase projects list &>/dev/null 2>&1; then
  echo "❌ No estás logueado. Ejecutá:"
  echo "   npx supabase login"
  echo "   (te dará un token, pegalo acá)"
  exit 1
fi
echo "✅ Login OK"

# 2. Link al proyecto
echo ""
echo "2. Linkeando al proyecto $PROJECT_REF..."
npx supabase link --project-ref "$PROJECT_REF" 2>/dev/null || echo "Ya linkeado"

# 3. Deploy Edge Functions
echo ""
echo "3. Deployando Edge Functions..."

FUNCTIONS=("ai-gateway" "orchestrator" "vault-process" "metrics-collector" "rule-engine")

for fn in "${FUNCTIONS[@]}"; do
  echo "  → $fn..."
  if npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" 2>&1; then
    echo "  ✅ $fn — deploy OK"
  else
    echo "  ❌ $fn — deploy FALLO"
  fi
done

echo ""
echo "======================================="

# 4. Verificar endpoints
echo ""
echo "4. Verificando endpoints..."
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

for fn in "${FUNCTIONS[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "$SUPABASE_URL/functions/v1/$fn" \
    -H "apikey: dummy" 2>/dev/null)
  if [ "$status" = "401" ] || [ "$status" = "405" ]; then
    echo "  ✅ $fn — endpoint activo (HTTP $status)"
  elif [ "$status" = "404" ]; then
    echo "  ❌ $fn — NO encontrado (HTTP 404)"
  else
    echo "  ⚠️  $fn — HTTP $status (verificar manualmente)"
  fi
done

# 5. Verificar secrets
echo ""
echo "5. Verificando secrets configurados..."
echo "  (Los secrets no se pueden verificar desde CLI por seguridad)"
echo "  Verificar manualmente en: https://supabase.com/dashboard/project/$PROJECT_REF/settings/edge-functions"
echo ""
echo "  Secrets necesarios:"
echo "    - GROQ_API_KEY"
echo "    - DEEPSEEK_API_KEY"
echo "    - HF_API_KEY"

echo ""
echo "======================================="
echo "✅ Deploy completo!"
echo ""
echo "Próximos pasos:"
echo "  1. Verificar secrets en el dashboard"
echo "  2. Ejecutar health check: bash scripts/health-check.sh ANON_KEY"
echo "  3. Probar el sistema en https://util.mejoraok.com/MejoraSM/"
