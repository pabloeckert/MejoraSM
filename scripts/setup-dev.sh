#!/bin/bash
# ============================================
# Setup de Desarrollo — MejoraSM
# Ejecutar: bash scripts/setup-dev.sh
# ============================================

set -e

echo "⚙️  Setup de Desarrollo — MejoraSM"
echo "=================================="
echo ""

# 1. Verificar Node.js
echo "1. Verificando Node.js..."
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v)
  echo "  ✅ Node.js $NODE_VERSION"
  
  # Verificar versión mínima (18+)
  MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
  if [ "$MAJOR" -lt 18 ]; then
    echo "  ⚠️  Se recomienda Node.js 18+ (tenés v$MAJOR)"
  fi
else
  echo "  ❌ Node.js no encontrado. Instalar desde https://nodejs.org"
  exit 1
fi

# 2. Verificar npm
echo ""
echo "2. Verificando npm..."
if command -v npm &>/dev/null; then
  echo "  ✅ npm $(npm -v)"
else
  echo "  ❌ npm no encontrado"
  exit 1
fi

# 3. Instalar dependencias
echo ""
echo "3. Instalando dependencias..."
npm install --legacy-peer-deps
echo "  ✅ Dependencias instaladas"

# 4. Verificar .env
echo ""
echo "4. Verificando variables de entorno..."
if [ -f .env ]; then
  echo "  ✅ .env existe"
  
  # Verificar que las variables estén seteadas
  MISSING=0
  for var in VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY; do
    if grep -q "^${var}=tu-" .env || grep -q "^${var}=$" .env || ! grep -q "^${var}=" .env; then
      echo "  ⚠️  $var no está configurada en .env"
      ((MISSING++))
    fi
  done
  
  if [ "$MISSING" -eq 0 ]; then
    echo "  ✅ Variables básicas configuradas"
  else
    echo "  ⚠️  $MISSING variables pendientes (la app no conectará a Supabase)"
  fi
else
  echo "  ⚠️  .env no existe. Creando desde .env.example..."
  cp .env.example .env
  echo "  📝 Editá .env con tus credenciales reales"
fi

# 5. Verificar Supabase CLI (opcional)
echo ""
echo "5. Verificando Supabase CLI..."
if command -v supabase &>/dev/null || npx supabase --version &>/dev/null 2>&1; then
  echo "  ✅ Supabase CLI disponible"
else
  echo "  ℹ️  Supabase CLI no instalado (opcional, necesario para deploy)"
  echo "     Instalar: npm install -g supabase"
fi

# 6. Ejecutar lint
echo ""
echo "6. Ejecutando linter..."
if npm run lint --if-present 2>/dev/null; then
  echo "  ✅ Lint OK"
else
  echo "  ⚠️  Lint tiene warnings (no bloqueante)"
fi

# 7. Ejecutar tests
echo ""
echo "7. Ejecutando tests..."
if npm test 2>/dev/null; then
  echo "  ✅ Tests OK"
else
  echo "  ⚠️  Algunos tests fallaron"
fi

# 8. Build de prueba
echo ""
echo "8. Build de prueba..."
if npm run build 2>/dev/null; then
  echo "  ✅ Build OK"
else
  echo "  ❌ Build falló — revisar errores arriba"
fi

echo ""
echo "=================================="
echo "✅ Setup completo!"
echo ""
echo "Próximos pasos:"
echo "  1. Editar .env con credenciales reales"
echo "  2. npm run dev — servidor de desarrollo"
echo "  3. Abrir http://localhost:5173"
echo ""
echo "Comandos útiles:"
echo "  npm run dev          — Servidor local"
echo "  npm run build        — Build producción"
echo "  npm test             — Tests"
echo "  npm run lint         — Linter"
echo ""
