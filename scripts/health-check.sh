#!/bin/bash
# ============================================
# Health Check — MejoraSM
# Ejecutar: bash scripts/health-check.sh ANON_KEY
# ============================================

PROJECT_REF="exnjyxwmxknvzploeaex"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo "🏥 Health Check — MejoraSM"
echo "=========================="

# Necesita la anon key como argumento o variable de entorno
ANON_KEY="${1:-$VITE_SUPABASE_PUBLISHABLE_KEY}"

if [ -z "$ANON_KEY" ]; then
  echo ""
  echo "Uso: bash scripts/health-check.sh TU_ANON_KEY"
  echo "O:   VITE_SUPABASE_PUBLISHABLE_KEY=xxx bash scripts/health-check.sh"
  exit 1
fi

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local result="$2"  # ok, fail, warn
  local detail="$3"
  
  if [ "$result" = "ok" ]; then
    echo "  ✅ $name${detail:+ — $detail}"
    ((PASS++))
  elif [ "$result" = "fail" ]; then
    echo "  ❌ $name${detail:+ — $detail}"
    ((FAIL++))
  else
    echo "  ⚠️  $name${detail:+ — $detail}"
    ((WARN++))
  fi
}

echo ""
echo "─── 1. Conexión a Supabase ───"
code=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" -H "apikey: $ANON_KEY")
if [ "$code" = "200" ]; then
  check "Conexión REST" "ok" "HTTP $code"
else
  check "Conexión REST" "fail" "HTTP $code"
fi

echo ""
echo "─── 2. Tablas ───"
TABLES="documents doc_chunks agent_config dialogue_sessions dialogue_messages proposals calendar_events metrics success_rules"
for table in $TABLES; do
  resp=$(curl -s "$SUPABASE_URL/rest/v1/${table}?select=id&limit=1" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" 2>/dev/null)
  if echo "$resp" | grep -q "PGRST205"; then
    check "Tabla '$table'" "fail" "NO RECONOCIDA por PostgREST"
  elif echo "$resp" | grep -q "\["; then
    check "Tabla '$table'" "ok"
  else
    check "Tabla '$table'" "warn" "${resp:0:60}"
  fi
done

echo ""
echo "─── 3. Edge Functions ───"
for fn in ai-gateway orchestrator vault-process publisher metrics-collector rule-engine health; do
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    "$SUPABASE_URL/functions/v1/$fn" \
    -H "apikey: $ANON_KEY" 2>/dev/null)
  case "$code" in
    401|405|400) check "Function '$fn'" "ok" "Activo (HTTP $code)" ;;
    404)         check "Function '$fn'" "fail" "NO deployada" ;;
    *)           check "Function '$fn'" "warn" "HTTP $code" ;;
  esac
done

echo ""
echo "─── 3b. Health Endpoint (deep check) ───"
resp=$(curl -s "$SUPABASE_URL/functions/v1/health" \
  -X GET \
  -H "apikey: $ANON_KEY" 2>/dev/null)
if echo "$resp" | grep -q '"status":"healthy"'; then
  check "Health endpoint" "ok" "Sistema saludable"
elif echo "$resp" | grep -q '"status":"degraded"'; then
  check "Health endpoint" "warn" "Degradado — verificar checks individuales"
elif echo "$resp" | grep -q '"status":"unhealthy"'; then
  check "Health endpoint" "fail" "Sistema no saludable"
else
  check "Health endpoint" "warn" "No disponible (deploying?)"
fi

echo ""
echo "─── 4. Storage ───"
resp=$(curl -s "$SUPABASE_URL/storage/v1/bucket" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" 2>/dev/null)
if echo "$resp" | grep -q "vault"; then
  check "Bucket 'vault'" "ok"
else
  check "Bucket 'vault'" "fail" "No encontrado"
fi

echo ""
echo "─── 5. Función SQL match_documents ───"
resp=$(curl -s "$SUPABASE_URL/rest/v1/rpc/match_documents" \
  -X POST \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query_embedding": [0.1, 0.2], "match_count": 1}' 2>/dev/null)
if echo "$resp" | grep -q "dimension"; then
  check "match_documents()" "warn" "Función existe, dimensión incorrecta (esperado: 384)"
elif echo "$resp" | grep -q "error\|Error"; then
  check "match_documents()" "warn" "${resp:0:60}"
else
  check "match_documents()" "ok"
fi

echo ""
echo "─── 6. Agentes pre-seed ───"
resp=$(curl -s "$SUPABASE_URL/rest/v1/agent_config?select=id" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" 2>/dev/null)
if echo "$resp" | grep -q "estratega" && echo "$resp" | grep -q "creativo" && echo "$resp" | grep -q "critico"; then
  check "3 agentes (estratega, creativo, critico)" "ok"
elif echo "$resp" | grep -q "\["; then
  check "Agentes pre-seed" "warn" "Respuesta: ${resp:0:60}"
else
  check "Agentes pre-seed" "fail" "No encontrados"
fi

echo ""
echo "─── 7. PostgREST Schema Cache ───"
resp=$(curl -s "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" 2>/dev/null)
if echo "$resp" | grep -q "documents"; then
  check "Schema cache" "ok" "PostgREST reconoce las tablas"
else
  check "Schema cache" "fail" "PostgREST NO reconoce las tablas — reiniciar proyecto"
fi

echo ""
echo "=========================="
echo "📊 Resumen: ✅ $PASS pasaron | ❌ $FAIL fallaron | ⚠️  $WARN advertencias"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "🔴 Hay $FAIL problemas que requieren atención."
  echo ""
  echo "Acciones sugeridas:"
  echo "  • Si PostgREST no reconoce tablas: reiniciar proyecto en Supabase Dashboard"
  echo "  • Si Edge Functions fallan: bash scripts/deploy.sh"
  echo "  • Si faltan API keys: configurar en Supabase Dashboard → Edge Functions → Secrets"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo "🟡 Hay $WARN advertencias. El sistema debería funcionar pero verificar."
  exit 0
else
  echo "🟢 ¡Todo perfecto! El sistema está listo para usar."
  exit 0
fi
