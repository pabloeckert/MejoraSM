# 🧠 CTO CONTEXT — Session Handoff Document

**Última actualización:** 2026-05-14
**Objetivo:** Este documento permite que cualquier sesión de IA continúe exactamente donde quedó. Leerlo al inicio de cada sesión.

---

## ⚡ Quick Start para la próxima sesión

Cuando Pablo diga **"continuemos"**:

1. Leer este archivo (`Documents/CTO-CONTEXT.md`)
2. Leer `Documents/CTO-ANALYSIS-2026-05-14.md` para el plan completo por fases
3. Ver `git log --oneline -10` para últimos commits
4. Continuar desde la sección "Próximos pasos"

---

## 👤 Sobre Pablo

- **Nombre:** Pablo Eckert
- **Rol:** Fundador de MejoraOK
- **Ubicación:** Argentina (GMT-3)
- **Estilo:** Directo, sin vueltas. Quiere resultados, no explicaciones largas.
- **Habla:** Español argentino. Usar "vos" y tono cercano pero profesional.
- **GitHub:** pabloeckert

## 🏢 Sobre el Proyecto

**MejoraSM** (MejoraSocialMedia) — Sistema de gestión estratégica de contenidos en Instagram mediante múltiples agentes de IA.

- **Cliente:** MejoraOK (https://mejoraok.com)
- **Producción:** https://util.mejoraok.com/MejoraSM/
- **Repo:** https://github.com/pabloeckert/MejoraSM
- **Branch de trabajo:** `claude/cto-analysis-framework-lXTYJ`

---

## 📊 Estado Actual (2026-05-14)

### ✅ Lo que FUNCIONA (código listo)
- Frontend React completo (7 páginas: Dashboard, Bóveda, Mesa de Diálogo, Laboratorio, Configuración, Calendario, Propuestas)
- UI con shadcn/ui + Tailwind (profesional, responsive)
- 50+ componentes UI, 49 tests pasando
- Schema PostgreSQL (9 tablas + pgvector + RLS)
- 7 Edge Functions: ai-gateway, orchestrator, vault-process, publisher, rule-engine, metrics-collector, **health** (nueva)
- Módulo compartido `supabase/functions/_shared/utils.ts` con todas las utilidades
- Extensión Chrome MejoraINSSIST v1.1.0 (Manifest V3)
- CI con GitHub Actions (lint + test + coverage + build)
- Logging estructurado JSON en todas las Edge Functions
- Migración de seguridad `004_security_hardening.sql` (índices, constraints, triggers)
- CSP headers mejorados en vercel.json

### 🔴 BLOQUEADORES (requieren acción de Pablo)

| # | Bloqueador | Solución | Tiempo |
|---|-----------|----------|--------|
| B1 | PostgREST no reconoce tablas | Pause/Resume Supabase Dashboard | 5 min |
| B2 | API keys no configuradas (Groq, DeepSeek, HF) | `supabase secrets set KEY=value` | 10 min |
| B3 | Edge Functions no deployadas | `bash scripts/deploy.sh` o GitHub Actions | 5 min |
| B4 | Credenciales en git history | Rotar todas las keys | 15 min |

**Instrucciones detalladas:** Ver `Documents/CTO-ANALYSIS-2026-05-14.md` sección "Bloqueadores"

### 🟠 Deuda Técnica Conocida
- Sin auth real (RLS "allow all" — intencional para MVP single-tenant)
- Sin tests E2E (solo unit + integration)
- Sin staging environment (deploy directo a prod)
- Sin monitoreo/alertas activo (health endpoint creado pero no deployado)
- PDFs no soportados completamente en vault-process

---

## 🏗️ Arquitectura

```
Frontend (React + Vite + TypeScript)
  ↓
Edge Functions (Supabase/Deno) — 7 funciones
  ├── ai-gateway      → Router universal de IA (Groq/DeepSeek/Gemini/HF)
  ├── orchestrator    → Mesa de Diálogo multi-agente
  ├── vault-process   → Bóveda RAG (embeddings + búsqueda vectorial)
  ├── publisher       → Publicación automática en Instagram
  ├── rule-engine     → Motor de reglas de éxito
  ├── metrics-collector → Métricas de Instagram
  └── health          → Health check de todos los servicios [NUEVO]
  ↓
PostgreSQL + pgvector (Supabase) — 9 tablas
  ↓
AI Providers: Groq (LLaMA), DeepSeek, Gemini, HuggingFace
```

### 3 Agentes de IA
| Agente | Provider | Modelo | Rol |
|--------|----------|--------|-----|
| Estratega | Groq | llama-4-scout-17b | Propone temas y estrategias |
| Creativo | Groq | llama-4-scout-17b | Redacta copys, hooks, CTAs |
| Crítico | DeepSeek | deepseek-chat | Evalúa calidad contra marca |

---

## 📁 Estructura del Repo

```
MejoraSM/
├── src/                    ← Frontend React
│   ├── pages/              ← 7 páginas
│   ├── services/           ← supabase.ts (CRUD), ai.ts (Edge Functions)
│   ├── hooks/              ← useVault, useDialogue, useProposals, useMetrics
│   └── test/               ← 49 tests (Vitest)
├── supabase/
│   ├── functions/
│   │   ├── _shared/        ← utils.ts compartido [NUEVO]
│   │   ├── ai-gateway/     ← Router universal de IA
│   │   ├── orchestrator/   ← Mesa de Diálogo
│   │   ├── vault-process/  ← Bóveda RAG
│   │   ├── publisher/      ← Publicador Instagram
│   │   ├── rule-engine/    ← Motor de reglas
│   │   ├── metrics-collector/ ← KPIs
│   │   └── health/         ← Health check [NUEVO]
│   └── migrations/         ← 001-004 SQL
├── Documents/
│   ├── CTO-CONTEXT.md      ← Este archivo (handoff de sesión)
│   ├── CTO-ANALYSIS-2026-05-14.md ← Análisis completo + plan por fases
│   └── ...otros docs
├── .github/workflows/
│   ├── ci.yml              ← CI (lint + test + coverage + build)
│   └── deploy-functions.yml ← Deploy Edge Functions
├── scripts/
│   ├── deploy.sh           ← Deploy manual Edge Functions
│   ├── health-check.sh     ← Health check completo [MEJORADO]
│   └── setup-dev.sh        ← Setup de desarrollo
└── vercel.json             ← Config Vercel con CSP mejorado [MEJORADO]
```

---

## 🎯 Próximos Pasos

### Para Pablo (bloqueadores a resolver):
1. **Rotar credenciales** — B4 (15 min) → CRÍTICO antes de todo
2. **Resolver PostgREST** — B1 (5 min) → Pause/Resume en Dashboard
3. **Configurar API keys** — B2 (10 min) → Groq, DeepSeek, HuggingFace
4. **Deploy Edge Functions** — B3 (5 min) → bash scripts/deploy.sh
5. **Verificar E2E** → bash scripts/health-check.sh

### Para la IA en la próxima sesión (después de B1-B4):
- Continuar con **FASE 6** del CTO-ANALYSIS: features completos
  - Publisher automático funcional
  - Métricas reales de Instagram
  - Rule Engine activo
  - Learning loop completo

---

## 💡 Decisiones Técnicas Clave

| Decisión | Elección | Razón |
|----------|----------|-------|
| Backend | Supabase Edge Functions | Free tier, PostgreSQL nativo |
| AI principal | Groq/LLaMA | Gratis, rápido, buena calidad |
| AI crítico | DeepSeek | Precio/performance análisis profundo |
| Embeddings | HuggingFace | Gratis, suficiente para RAG |
| Vector DB | pgvector | Ya en PostgreSQL, sin overhead |
| Frontend | React + Vite | Sin SSR necesario |
| Deploy frontend | Vercel | CI/CD automático, CDN |
| Utilidades compartidas | `_shared/utils.ts` | DRY, bug fix en un solo lugar |

---

## 🔐 Variables de Entorno

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://exnjyxwmxknvzploeaex.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

### Edge Functions (Supabase Secrets)
```
SUPABASE_SERVICE_ROLE_KEY=eyJ... (auto-inyectada)
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...
HF_API_KEY=hf_...
GEMINI_API_KEY=AI... (opcional)
INSTAGRAM_ACCESS_TOKEN=... (para publisher)
INSTAGRAM_BUSINESS_ACCOUNT_ID=... (para publisher)
```

### GitHub Secrets (para CI/CD)
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF=exnjyxwmxknvzploeaex
SUPABASE_ANON_KEY
```

---

## 📝 Registro de Sesiones CTO

| Fecha | Trabajo | Commit |
|-------|---------|--------|
| 2026-05-12 | Primera sesión CTO: onboarding, seguridad, deploy workflow, scripts | `f972e40` |
| 2026-05-14 | **Esta sesión**: análisis CTO completo, FASE 0-3 implementadas | `08c50f9` |

### Detalle — 2026-05-14

**FASE 0 — Análisis:**
- `Documents/CTO-ANALYSIS-2026-05-14.md`: análisis completo (bugs, bloqueadores, plan por fases)

**FASE 1 — Code Quality:**
- BUG CRÍTICO corregido: `ValidationError` no definida en orchestrator (ReferenceError en runtime)
- `supabase/functions/_shared/utils.ts`: módulo compartido (~150 líneas de duplicación eliminadas)
- Las 6 Edge Functions refactorizadas para usar `_shared/utils.ts`
- Logging estructurado JSON en todos los handlers
- CI mejorado: cobertura de tests, branches claude/**, concurrency group

**FASE 2 — Security:**
- `supabase/migrations/004_security_hardening.sql`: 10 índices de performance, constraints de validación, triggers de updated_at
- `vercel.json`: HSTS, X-XSS-Protection, CSP mejorada (restringe connect-src a dominios conocidos)
- `supabase/functions/health/index.ts`: health check endpoint (DB + Groq + DeepSeek + HuggingFace en paralelo)
- Deploy workflow actualizado para incluir función `health`
- `scripts/health-check.sh` mejorado con check del endpoint `/health`

---

**Este documento es la fuente de verdad para la continuidad de sesión. Actualizarlo al final de cada sesión.**
