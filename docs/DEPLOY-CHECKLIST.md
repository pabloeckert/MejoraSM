# ✅ Deploy Checklist — MejoraSM

**Objetivo:** Llevar el sistema de "código listo" a "funcional para beta"
**Tiempo estimado:** 20-30 minutos

---

## Paso 1: Resolver PostgREST (5 min)

Las 9 tablas existen en PostgreSQL pero la API REST no las ve.

- [ ] Ir a https://supabase.com/dashboard/project/exnjyxwmxknvzploeaex/settings/general
- [ ] Click en **"Pause project"**
- [ ] Esperar 30 segundos
- [ ] Click en **"Resume project"**
- [ ] Esperar 2 minutos
- [ ] Verificar ejecutando en terminal:
  ```bash
  curl "https://exnjyxwmxknvzploeaex.supabase.co/rest/v1/documents?select=id&limit=1" \
    -H "apikey: TU_ANON_KEY"
  ```
  Si devuelve `[]` o un array → ✅ Funciona
  Si devuelve `PGRST205` → ❌ No funcionó, repetir o contactar soporte

---

## Paso 2: Obtener API Keys (10 min)

### Groq (GRATIS — recomendado para Estratega y Creativo)
- [ ] Ir a https://console.groq.com/keys
- [ ] Crear cuenta (si no tiene)
- [ ] Click "Create API Key"
- [ ] Copiar la key (empieza con `gsk_`)

### DeepSeek (GRATIS — para el Crítico)
- [ ] Ir a https://platform.deepseek.com/api_keys
- [ ] Crear cuenta
- [ ] Click "Create API Key"
- [ ] Copiar la key (empieza con `sk-`)

### HuggingFace (GRATIS — para embeddings RAG)
- [ ] Ir a https://huggingface.co/settings/tokens
- [ ] Crear cuenta
- [ ] Click "New token" → permiso "Read"
- [ ] Copiar el token (empieza con `hf_`)

---

## Paso 3: Configurar Secrets en Supabase (5 min)

### Opción A: Desde el Dashboard (más fácil)
- [ ] Ir a https://supabase.com/dashboard/project/exnjyxwmxknvzploeaex/settings/edge-functions
- [ ] Agregar cada secret:
  - `GROQ_API_KEY` = `gsk_...`
  - `DEEPSEEK_API_KEY` = `sk-...`
  - `HF_API_KEY` = `hf_...`

### Opción B: Desde terminal
```bash
npx supabase login
npx supabase link --project-ref exnjyxwmxknvzploeaex
npx supabase secrets set GROQ_API_KEY=gsk_...
npx supabase secrets set DEEPSEEK_API_KEY=sk-...
npx supabase secrets set HF_API_KEY=hf_...
```

---

## Paso 4: Deploy Edge Functions (5 min)

```bash
cd MejoraSM
bash scripts/deploy.sh
```

Esto deploya las 5 funciones:
- `ai-gateway` — Router universal de IA
- `orchestrator` — Mesa de Diálogo multi-agente
- `vault-process` — Procesamiento de documentos (RAG)
- `metrics-collector` — Recolector de métricas de Instagram
- `rule-engine` — Motor de reglas de éxito

---

## Paso 5: Ejecutar Migración SQL (2 min)

- [ ] Ir al SQL Editor en Supabase Dashboard
- [ ] Ejecutar el contenido de `supabase/migrations/003_indexes_and_constraints.sql`
- [ ] Verificar que no hay errores

---

## Paso 6: Verificar (3 min)

```bash
bash scripts/health-check.sh TU_ANON_KEY
```

Todo debería mostrar ✅.

---

## Paso 7: Probar el sistema

1. Ir a https://util.mejoraok.com/MejoraSM/
2. Debería aparecer el Onboarding Wizard
3. Subir un documento de prueba (.txt o .md)
4. Ir a Mesa de Diálogo → Crear sesión con un tema
5. Los 3 agentes deberían responder
6. Verificar que se crea una propuesta

---

## ⚠️ Si algo falla

| Problema | Solución |
|---|---|
| PostgREST sigue sin ver tablas | Contactar soporte Supabase |
| Edge Function devuelve 500 | Verificar que los secrets están configurados |
| "GROQ_API_KEY no configurada" | El secret no se guardó. Revisar en Settings → Edge Functions |
| Upload falla | Verificar que el bucket `vault` existe en Storage |
| Embeddings fallan | Normal — funciona con fallback (últimos docs sin vectores) |

---

## Lo que queda pendiente (no bloqueante para beta)

- Instagram Graph API → publicación automática
- Instagram Business Account → métricas reales
- Supabase Auth → login/register
- Política de privacidad → revisión legal

---

**¿Terminaste los pasos?** Decile al AI "ya hice los 6 pasos" y hace el health check completo.
