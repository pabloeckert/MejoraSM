# 🚀 Prompt para Siguiente Sesión — MejoraSM

**Repo:** https://github.com/pabloeckert/MejoraSM
**Branch:** `claude/cto-analysis-framework-lXTYJ`
**Producción:** https://util.mejoraok.com/MejoraSM/
**Actualizado:** 2026-05-14

---

## ▶️ Para continuar, decile esto a Claude:

---

Continuemos con **MejoraSM** — sistema de contenidos Instagram con IA para MejoraOK.

**Repo:** https://github.com/pabloeckert/MejoraSM
**Branch de trabajo:** `claude/cto-analysis-framework-lXTYJ`

Leé estos dos archivos para ponerte al día:
1. `Documents/CTO-CONTEXT.md` — estado actual y próximos pasos
2. `Documents/CTO-ANALYSIS-2026-05-14.md` — análisis completo y plan por fases

---

## 📍 Estado al 2026-05-14

### ✅ FASE 0-3 completadas (código pusheado):
- BUG CRÍTICO corregido: `ValidationError` no definida en orchestrator (ReferenceError en runtime)
- `supabase/functions/_shared/utils.ts`: módulo compartido (getCorsHeaders, ValidationError, withRetry, logger, httpError)
- Todas las Edge Functions usan el módulo compartido — ~150 líneas de duplicación eliminadas
- Logging estructurado JSON en todos los handlers (visible en Supabase Logs)
- `supabase/migrations/004_security_hardening.sql`: 10 índices, constraints de validación, triggers de updated_at
- `supabase/functions/health/index.ts`: health check endpoint (verifica DB + Groq + DeepSeek + HuggingFace en paralelo)
- `vercel.json`: HSTS, X-XSS-Protection, CSP mejorada
- CI/CD: test coverage automático, cancelación de runs duplicados, corre en branches `claude/**`
- 49 tests pasando

### 🔴 Bloqueadores que Pablo debe resolver antes de continuar:

```bash
# 1. CRÍTICO: Rotar credenciales (hay keys en git history)
#    → Supabase Dashboard: regenerar anon key + service role key
#    → Regenerar: Groq, DeepSeek, HuggingFace API keys

# 2. Resolver PostgREST schema cache (BLOQUEADOR PRINCIPAL)
#    → Supabase Dashboard → Project Settings → General → Pause → Resume
#    → Esperar 2 min y verificar

# 3. Configurar API keys en Edge Functions
supabase login
supabase link --project-ref exnjyxwmxknvzploeaex
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set DEEPSEEK_API_KEY=sk-...
supabase secrets set HF_API_KEY=hf_...

# 4. Ejecutar migración de seguridad
#    → SQL Editor en Supabase → copiar/pegar supabase/migrations/004_security_hardening.sql

# 5. Deploy Edge Functions
bash scripts/deploy.sh

# 6. Verificar todo
bash scripts/health-check.sh TU_ANON_KEY
```

### 🎯 Próxima FASE (FASE 6 — post-infraestructura):
- Publisher automático funcional (Instagram Graph API)
- Métricas reales (reach, engagement, saves)
- Rule Engine activo (aprende de cada post publicado)
- Learning loop completo

---

## 🔧 Info técnica

- **Supabase Project ID:** `exnjyxwmxknvzploeaex`
- **9 tablas:** documents, doc_chunks, agent_config, dialogue_sessions, dialogue_messages, proposals, calendar_events, metrics, success_rules
- **7 Edge Functions:** ai-gateway, orchestrator, vault-process, publisher, rule-engine, metrics-collector, health
- **Tests:** 49 tests pasando (Vitest)
- **Build:** `npm install --legacy-peer-deps && npm run build`
- **Tests:** `npm test`
- **Coverage:** `npm run test:coverage`

## Reglas de sesión
- NO tocar `docs/` (legacy, solo lectura)
- Documentación activa: `Documents/`
- Al final de cada sesión: commit + push a `claude/cto-analysis-framework-lXTYJ`
- Actualizar `Documents/CTO-CONTEXT.md` con lo hecho en la sesión
