# Guía de Setup — Supabase para MejoraSM

**Para:** Pablo
**Fecha:** 2026-04-23

---

## 1. Crear el proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New Project**
2. Elegir nombre: `mejorasm` (o el que prefieras)
3. Setear contraseña de DB (guardarla)
4. Elegir región: `South America (São Paulo)` para baja latencia
5. Esperar ~2 minutos a que se cree

---

## 2. Ejecutar el schema SQL

1. Ir al **SQL Editor** en el dashboard de Supabase
2. Copiar y pegar el contenido completo de `supabase/migrations/001_initial_schema.sql`
3. Click en **Run**

Esto crea:
- **9 tablas:** `documents`, `doc_chunks`, `agent_config`, `dialogue_sessions`, `dialogue_messages`, `proposals`, `calendar_events`, `metrics`, `success_rules`
- **3 agentes** preconfigurados (estratega, creativo, crítico)
- **Storage bucket** `vault` para archivos
- **Función SQL** `match_documents` para búsqueda vectorial (RAG)
- **Políticas RLS** abiertas (temporal, proyecto personal)

### Verificar que anduvo

```sql
-- Ejecutar esto después del schema
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Debería mostrar las 9 tablas
```

---

## 3. Crear el Storage Bucket

El schema SQL ya crea el bucket `vault`, pero verificá:

1. Ir a **Storage** en el dashboard
2. Confirmar que existe el bucket `vault`
3. Si no existe, crearlo manualmente:
   - Nombre: `vault`
   - Público: **NO** (debe ser privado)
   - Tamaño máximo: 50MB (o el que necesites)

---

## 4. Configurar API Keys como Secrets

Los Edge Functions necesitan acceso a las API keys de los proveedores de IA.

Ir a **Project Settings → Edge Functions → Secrets** y agregar:

| Secret Name | Valor | Descripción |
|---|---|---|
| `GROQ_API_KEY` | `gsk_...` | API key de Groq (para Llama 4 Scout) |
| `DEEPSEEK_API_KEY` | `sk-...` | API key de DeepSeek (para agente crítico) |
| `GEMINI_API_KEY` | `AIza...` | API key de Google Gemini (opcional) |

> **Nota:** Pedime las API keys si no las tenés, o crealas en:
> - Groq: https://console.groq.com/keys
> - DeepSeek: https://platform.deepseek.com/api_keys
> - Gemini: https://aistudio.google.com/apikey

---

## 5. Deploy de Edge Functions

### Opción A: Desde CLI (recomendado)

```bash
# Instalar Supabase CLI (si no lo tenés)
npm install -g supabase

# Login
supabase login

# Link al proyecto (usá tu Project Ref del dashboard)
supabase link --project-ref TU_PROJECT_REF

# Deploy las 3 funciones
supabase functions deploy ai-gateway
supabase functions deploy orchestrator
supabase functions deploy vault-process
```

### Opción B: Desde el Dashboard

1. Ir a **Edge Functions** en el dashboard
2. Crear 3 funciones manualmente:
   - `ai-gateway` → copiar código de `supabase/functions/ai-gateway/index.ts`
   - `orchestrator` → copiar código de `supabase/functions/orchestrator/index.ts`
   - `vault-process` → copiar código de `supabase/functions/vault-process/index.ts`

---

## 6. Variables de entorno del frontend

Crear archivo `.env` en la raíz del proyecto (o `.env.local`):

```env
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_ANON_KEY
```

Encontrás estos valores en **Project Settings → API**:
- `URL`: Project URL
- `anon / public key`: API Key (anon, no service_role)

---

## 7. Health Check

Ejecutá este script para verificar que todo funciona:

```bash
# Reemplazar con tus valores
SUPABASE_URL="https://TU_PROJECT_REF.supabase.co"
SUPABASE_KEY="TU_ANON_KEY"

echo "=== Health Check MejoraSM ==="

# 1. Verificar conexión
echo -n "1. Conexión a Supabase... "
curl -s -o /dev/null -w "%{http_code}" \
  "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $SUPABASE_KEY" | grep -q "200" && echo "✅ OK" || echo "❌ FAIL"

# 2. Verificar tablas
echo -n "2. Tabla 'documents'... "
curl -s "$SUPABASE_URL/rest/v1/documents?select=count" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" | grep -q "\[\]" && echo "✅ OK" || echo "❌ FAIL"

echo -n "3. Tabla 'agent_config'... "
curl -s "$SUPABASE_URL/rest/v1/agent_config?select=id" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" | grep -q "estratega" && echo "✅ OK (3 agentes)" || echo "❌ FAIL"

echo -n "4. Tabla 'proposals'... "
curl -s -o /dev/null -w "%{http_code}" \
  "$SUPABASE_URL/rest/v1/proposals?select=count" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" | grep -q "200" && echo "✅ OK" || echo "❌ FAIL"

# 3. Verificar Edge Functions
echo -n "5. Edge Function 'ai-gateway'... "
curl -s -o /dev/null -w "%{http_code}" \
  "$SUPABASE_URL/functions/v1/ai-gateway" \
  -H "Authorization: Bearer $SUPABASE_KEY" | grep -qE "200|405" && echo "✅ OK" || echo "❌ FAIL"

echo -n "6. Edge Function 'orchestrator'... "
curl -s -o /dev/null -w "%{http_code}" \
  "$SUPABASE_URL/functions/v1/orchestrator" \
  -H "Authorization: Bearer $SUPABASE_KEY" | grep -qE "200|405" && echo "✅ OK" || echo "❌ FAIL"

echo -n "7. Edge Function 'vault-process'... "
curl -s -o /dev/null -w "%{http_code}" \
  "$SUPABASE_URL/functions/v1/vault-process" \
  -H "Authorization: Bearer $SUPABASE_KEY" | grep -qE "200|405" && echo "✅ OK" || echo "❌ FAIL"

# 4. Verificar Storage
echo -n "8. Storage bucket 'vault'... "
curl -s "$SUPABASE_URL/storage/v1/bucket" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" | grep -q "vault" && echo "✅ OK" || echo "❌ FAIL"

echo ""
echo "=== Si todo es ✅, estás listo para arrancar ==="
echo "Corré: npm run dev"
```

---

## 8. Troubleshooting

| Problema | Solución |
|---|---|
| "relation does not exist" | No ejecutaste el schema SQL completo |
| Edge Function 404 | No deployaste las funciones (paso 5) |
| Edge Function 500 | Faltan secrets (paso 4) |
| CORS errors | Verificar que las Edge Functions tengan los headers CORS |
| Storage upload fails | Verificar que el bucket `vault` existe y las políticas RLS |

---

## Resumen de archivos relevantes

```
supabase/
├── config.toml                    # Config de Supabase CLI
├── migrations/
│   └── 001_initial_schema.sql     # ← Ejecutar en SQL Editor
└── functions/
    ├── ai-gateway/index.ts        # Gateway para Groq/DeepSeek/Gemini
    ├── orchestrator/index.ts      # Mesa de Diálogo (multi-agente)
    └── vault-process/index.ts     # Procesamiento de documentos + RAG
```
