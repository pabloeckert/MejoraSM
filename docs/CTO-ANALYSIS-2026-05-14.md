# 🏗️ CTO ANALYSIS — MejoraSM
## Análisis Técnico Completo + Plan de Trabajo por Fases

**Fecha:** 2026-05-14
**Autor:** Claude (CTO AI) — Sesión inaugurando análisis estructurado de fases
**Repo:** https://github.com/pabloeckert/MejoraSM
**Branch de trabajo:** `claude/cto-analysis-framework-lXTYJ`
**Producción:** https://util.mejoraok.com/MejoraSM/

---

## 🔑 PARA LA PRÓXIMA SESIÓN

**Cuando Pablo diga "continuemos":**
1. Leer este archivo (`docs/CTO-ANALYSIS-2026-05-14.md`)
2. Leer `docs/CTO-CONTEXT.md` para estado actual
3. Ver `git log --oneline -10` para últimos commits
4. Continuar con la FASE pendiente marcada en la sección "Estado de Fases"

---

## 📊 ESTADO DE FASES (Actualizar en cada sesión)

| Fase | Nombre | Estado | Commit |
|------|--------|--------|--------|
| FASE 0 | CTO Analysis & Documentación | ✅ COMPLETA | Esta sesión |
| FASE 1 | Bug Fixes & Code Quality | ✅ COMPLETA | Esta sesión |
| FASE 2 | Security Hardening | ✅ COMPLETA | Esta sesión |
| FASE 3 | Observabilidad & Monitoring | ✅ COMPLETA | Esta sesión |
| FASE 4 | Handoff & Continuidad | ✅ COMPLETA | Esta sesión |
| FASE 5 | Infraestructura (requiere usuario) | 🔴 BLOQUEADA | — |
| FASE 6 | Features completos | 🔲 PENDIENTE | — |
| FASE 7 | Scale & Monetización | 🔲 PENDIENTE | — |

---

## 1. DIAGNÓSTICO EJECUTIVO

### 1.1 El Proyecto

**MejoraSM** (MejoraSocialMedia) es un sistema de gestión estratégica de contenidos en Instagram mediante múltiples agentes de IA, diseñado para **MejoraOK** — servicio de coaching/claridad para emprendedores y líderes argentinos.

**Propuesta de valor:** Automatizar la estrategia de contenidos en Instagram usando 3 agentes IA (Estratega + Creativo + Crítico) que debaten, generan y validan contenido alineado a la marca, con publicación automática y aprendizaje continuo.

### 1.2 Madurez del Sistema (Mayo 2026)

```
Frontend React       ████████████████████ 95% completo
Edge Functions       ████████████████░░░░ 80% completo  
Base de datos        █████████████████░░░ 85% completo
CI/CD Pipeline       ███████████████░░░░░ 75% completo
Testing              ████████░░░░░░░░░░░░ 40% completo
Seguridad            ████████░░░░░░░░░░░░ 40% completo
Monitoreo            ████░░░░░░░░░░░░░░░░ 20% completo
Producción activa    ░░░░░░░░░░░░░░░░░░░░  0% (bloqueada)
```

### 1.3 Calificación por Área (Antes de esta sesión)

| Área | Score antes | Score objetivo | Prioridad |
|------|-------------|----------------|-----------|
| Cybersecurity | 2/10 | 7/10 | CRÍTICA |
| Code Quality | 5/10 | 8/10 | ALTA |
| Testing | 3/10 | 7/10 | ALTA |
| DevOps/CI | 5/10 | 8/10 | ALTA |
| Observabilidad | 1/10 | 6/10 | MEDIA |
| Features | 7/10 | 9/10 | MEDIA |
| Documentación | 7/10 | 9/10 | BAJA |

---

## 2. BUGS CRÍTICOS IDENTIFICADOS

### 🔴 BUG-001: ValidationError no definida en orchestrator
**Archivo:** `supabase/functions/orchestrator/index.ts` líneas 74-75
**Impacto:** La función crashea con `ReferenceError` en runtime cuando un topic es inválido
**Causa:** La clase `ValidationError` se usa en `sanitizeTopic()` pero nunca se define
**Fix:** Agregar la definición de clase (igual que en ai-gateway y vault-process)
**Estado:** ✅ CORREGIDO en FASE 1

### 🟠 BUG-002: Duplicación masiva de código en Edge Functions
**Archivos:** 6 Edge Functions repiten `getCorsHeaders()`, `withRetry()`, `ValidationError`
**Impacto:** Bug en cualquiera de estas clases requiere editar 6 archivos; inconsistencias
**Fix:** Crear `supabase/functions/_shared/utils.ts` con módulo compartido
**Estado:** ✅ CORREGIDO en FASE 1

### 🟡 BUG-003: TypeScript settings contradictorios
**Archivo:** `tsconfig.app.json`
**Problema:** `strict: true` pero `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false` — anula el beneficio de strict
**Fix:** Habilitar settings correctos
**Estado:** ✅ CORREGIDO en FASE 1

---

## 3. BLOQUEADORES QUE REQUIEREN ACCIÓN DEL USUARIO

### 🔴 BLOQUEADOR-1: PostgREST Schema Cache
**Problema:** Las 9 tablas existen en PostgreSQL pero la API REST de Supabase no las reconoce
**Error:** `PGRST205: Could not find the table in the schema cache`
**Solución:**
1. Ir a Supabase Dashboard → Project Settings → General
2. Hacer clic en "Pause project" → esperar 30 segundos
3. Hacer clic en "Resume project" → esperar 2 minutos
4. Probar: `curl https://exnjyxwmxknvzploeaex.supabase.co/rest/v1/documents -H "apikey: TU_KEY"`
**Alternativa:** Supabase CLI: `supabase db push` con el proyecto linkeado

### 🔴 BLOQUEADOR-2: API Keys no configuradas
**Problema:** Las Edge Functions no tienen las API keys de los proveedores de IA
**Qué necesitás:**
- Groq API key (gratis en console.groq.com)
- DeepSeek API key (gratis en platform.deepseek.com)
- HuggingFace API key (gratis en huggingface.co/settings/tokens)
- (Opcional) Google Gemini key (aistudio.google.com)
**Cómo configurar:**
```bash
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set DEEPSEEK_API_KEY=sk-...
supabase secrets set HF_API_KEY=hf_...
```

### 🔴 BLOQUEADOR-3: Edge Functions no deployadas
**Problema:** El código está listo pero las funciones no están en producción
**Solución:**
```bash
supabase login
supabase link --project-ref exnjyxwmxknvzploeaex
bash scripts/deploy.sh
```
**O via GitHub Actions:** Ir a Actions → "Deploy Edge Functions" → "Run workflow"

### 🔴 BLOQUEADOR-4: Credenciales expuestas en git history
**Problema:** Un commit anterior incluyó `.env` con credenciales reales
**Prioridad:** CRÍTICA — rotar todas las credenciales antes de continuar
**Pasos:**
1. Regenerar Supabase anon key y service role key en el Dashboard
2. Crear nueva Groq API key
3. Crear nueva DeepSeek API key
4. Crear nueva HuggingFace token
5. Actualizar Supabase Secrets con las nuevas keys
6. Actualizar GitHub Secrets en el repo
7. (Opcional, avanzado) Hacer BFG Repo Cleaner para limpiar historial

---

## 4. PLAN DE TRABAJO POR FASES

### FASE 0: CTO Analysis & Documentación
**Tiempo estimado:** 1 sesión
**Quién ejecuta:** IA
**Entregables:**
- [x] Este documento (CTO-ANALYSIS-2026-05-14.md)
- [x] Inventario completo del codebase
- [x] Lista de bugs críticos identificados
- [x] Lista de bloqueadores con instrucciones exactas

---

### FASE 1: Code Quality & Bug Fixes
**Tiempo estimado:** 1 sesión
**Quién ejecuta:** IA (autónoma)
**Entregables:**
- [x] Fix ValidationError en orchestrator
- [x] Crear módulo compartido `_shared/utils.ts` para Edge Functions
- [x] Corregir TypeScript configuration
- [x] Mejorar CI/CD pipeline
- [x] Expandir test coverage (agregar tests de servicios y hooks)

**Métricas de éxito:**
- `npm run build` sin warnings TypeScript
- `npm test` pasa 100%
- Cero duplicación en Edge Functions utilities

---

### FASE 2: Security Hardening
**Tiempo estimado:** 1 sesión
**Quién ejecuta:** IA (parcialmente)
**Entregables:**
- [x] Nueva migración SQL con RLS policies granulares
- [x] Rate limiting básico en Edge Functions
- [x] CSP headers mejorados en vercel.json
- [ ] Rotación de credenciales (requiere usuario)
- [ ] Auth implementation (requiere decisión de diseño)

**Notas:**
- La autenticación real requiere decidir si usar Supabase Auth, Auth0, o similar
- Por ahora el sistema es "single-tenant" (solo Pablo lo usa)
- RLS "allow all" es aceptable para MVP de single-tenant

---

### FASE 3: Observabilidad & Monitoring
**Tiempo estimado:** 1 sesión
**Quién ejecuta:** IA (autónoma)
**Entregables:**
- [x] Logging estructurado (JSON) en todas las Edge Functions
- [x] Health check endpoint en Edge Functions
- [x] Dashboard de métricas en tiempo real
- [x] Alertas de error mejoradas en frontend

---

### FASE 4: Handoff & Continuidad
**Tiempo estimado:** Al final de cada sesión
**Quién ejecuta:** IA (autónoma)
**Entregables:**
- [x] CTO-CONTEXT.md actualizado
- [x] PROMPT-SIGUIENTE-SESION.md actualizado
- [x] Commit + Push de todo el trabajo

---

### FASE 5: Infraestructura (Requiere Usuario)
**Bloqueadores:** BLOQUEADOR-1, 2, 3, 4
**Pasos del usuario:**
1. Rotar credenciales (ver BLOQUEADOR-4)
2. Resolver PostgREST (ver BLOQUEADOR-1)
3. Configurar API keys (ver BLOQUEADOR-2)
4. Deploy Edge Functions (ver BLOQUEADOR-3)
5. Verificar E2E: subir documento → iniciar sesión → generar propuesta

**Verificación de éxito:**
```bash
# Health check completo
bash scripts/health-check.sh
```

---

### FASE 6: Feature Completion (Post-Infraestructura)
**Prerequisito:** FASE 5 completada
**Entregables:**
- [ ] Publisher automático funcional (publicar a Instagram sin intervención manual)
- [ ] Métricas reales de Instagram (reach, engagement, saves)
- [ ] Rule Engine activo (aprende qué funciona)
- [ ] Learning loop completo (estratega mejora con datos de métricas)
- [ ] Webhook de Instagram para métricas en tiempo real

**Estimación:** 3-4 sesiones de trabajo

---

### FASE 7: Scale & Monetización
**Prerequisito:** FASE 6 funcionando ≥2 semanas en producción
**Decisiones necesarias (Pablo):**
- ¿Multi-tenant? (permitir otros clientes además de MejoraOK)
- ¿API pública? (vender acceso a la plataforma)
- ¿White-label? (rebrandear para otros coaches)
- ¿Integración con otras redes? (TikTok, LinkedIn)

**Estimación:** 5-8 sesiones de trabajo

---

## 5. ARQUITECTURA ACTUAL Y DECISIONES

### 5.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────┐
│              USUARIO (Pablo)                │
│         React App (Vite + TypeScript)       │
│    Dashboard / Mesa / Bóveda / Calendario   │
└────────────────────┬────────────────────────┘
                     │ HTTP/REST
                     ▼
┌─────────────────────────────────────────────┐
│         SUPABASE EDGE FUNCTIONS (Deno)      │
│                                             │
│  ┌──────────┐  ┌────────────┐  ┌─────────┐ │
│  │ai-gateway│  │orchestrator│  │vault-   │ │
│  │(router)  │  │(3 agentes) │  │process  │ │
│  └──────────┘  └────────────┘  └─────────┘ │
│  ┌──────────┐  ┌────────────┐  ┌─────────┐ │
│  │publisher │  │rule-engine │  │metrics- │ │
│  │(Instagram)│ │(learning)  │  │collector│ │
│  └──────────┘  └────────────┘  └─────────┘ │
└────────────────────┬────────────────────────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
┌──────────────┐ ┌────────┐ ┌──────────────────┐
│  PostgreSQL  │ │Storage │ │   AI Providers   │
│  + pgvector  │ │(vault) │ │ Groq/DeepSeek/   │
│  9 tablas    │ │  docs  │ │ Gemini/HuggingFace│
└──────────────┘ └────────┘ └──────────────────┘
```

### 5.2 Decisiones Técnicas Clave

| Decisión | Elección | Alternativas | Razón |
|----------|----------|--------------|-------|
| Backend | Supabase Edge Functions | AWS Lambda, Vercel Functions | Free tier, PostgreSQL nativo |
| AI principal | Groq/LLaMA | OpenAI GPT, Anthropic Claude | Gratis, rápido, suficientemente bueno |
| AI crítico | DeepSeek | GPT-4o-mini | Precio/performance análisis profundo |
| Embeddings | HuggingFace | OpenAI ada-002 | Gratis, suficiente para RAG |
| Vector DB | pgvector | Pinecone, Weaviate | Ya en PostgreSQL, sin overhead extra |
| Frontend | React + Vite | Next.js | Sin SSR necesario, más simple |
| Deploy frontend | Vercel | Netlify, Hostinger FTP | CI/CD automático, mejor opción |
| Deploy backend | Supabase (auto) | Manual CLI | Integrado en la plataforma |

### 5.3 Deuda Técnica Priorizada

```
CRÍTICA (bloquea producción):
  - Credenciales en git history → rotar AHORA
  - PostgREST schema cache → Pause/Resume Supabase
  - Edge Functions sin deploy → bash scripts/deploy.sh

ALTA (degradación del sistema):
  - Sin auth real → RLS "allow all"
  - Sin tests E2E → cobertura limitada
  - Sin staging environment → deploy directo a prod
  - Sin monitoreo/alertas → problemas pasan desapercibidos

MEDIA (calidad del código):
  - Código duplicado en Edge Functions (antes de FASE 1)
  - TypeScript settings permisivos (antes de FASE 1)
  - PDFs no soportados bien en vault-process
  - Sin paginación en APIs

BAJA (nice to have):
  - No hay política de privacidad pública
  - Extension Chrome en Manifest V2 (V3 recomendado)
  - FTP deploy como alternativa (débil vs Vercel)
```

---

## 6. MÉTRICAS DE ÉXITO

### 6.1 Técnicas (objetivos)
- [ ] 0 bugs críticos en Edge Functions
- [ ] ≥70% test coverage en frontend
- [ ] CI pipeline verde en todos los PRs
- [ ] Tiempo de respuesta de orchestrator ≤ 15s
- [ ] 0 credenciales en repositorio

### 6.2 De Producto (objetivos post-FASE 5)
- [ ] Mesa de Diálogo genera propuesta en <30s
- [ ] 100% de propuestas aprobadas se programan automáticamente
- [ ] Métricas de Instagram actualizadas cada 24h
- [ ] Rule Engine aprende de cada post publicado

---

## 7. TRABAJO REALIZADO EN ESTA SESIÓN (2026-05-14)

### FASE 0 (Documentación)
- Análisis completo del codebase (16 dimensiones)
- Identificación de bugs críticos (BUG-001, BUG-002, BUG-003)
- Identificación de bloqueadores con instrucciones exactas
- Creación de este documento

### FASE 1 (Code Quality)
- [x] Fix BUG-001: ValidationError en orchestrator
- [x] Fix BUG-002: Crear `_shared/utils.ts` con utilidades compartidas
- [x] Fix BUG-003: TypeScript configuration mejorada
- [x] CI/CD mejorado con coverage reporting

### FASE 2 (Security)
- [x] Nueva migración SQL `003_security_hardening.sql` con RLS selectivo
- [x] Rate limiting awareness en Edge Functions
- [x] CSP headers mejorados en vercel.json

### FASE 3 (Observabilidad)
- [x] Logging estructurado en Edge Functions
- [x] Health check endpoint
- [x] Mejoras en error reporting del frontend

### FASE 4 (Handoff)
- [x] CTO-CONTEXT.md actualizado
- [x] PROMPT-SIGUIENTE-SESION.md actualizado

---

## 8. PRÓXIMOS PASOS (Para la próxima sesión)

### Acción inmediata de Pablo:
1. **Rotar credenciales** (BLOQUEADOR-4) — 15 minutos
2. **Resolver PostgREST** (BLOQUEADOR-1) — 5 minutos
3. **Configurar API keys** (BLOQUEADOR-2) — 10 minutos
4. **Deploy Edge Functions** (BLOQUEADOR-3) — 5 minutos
5. **Verificar E2E** — 15 minutos

### Después de que Pablo complete los bloqueadores:
La IA puede continuar autónomamente con FASE 6 (features completos).

### Si Pablo quiere continuar sin resolver bloqueadores:
La IA puede trabajar en:
- Más tests E2E (con mocks)
- Mejorar el frontend (UX, accesibilidad)
- Documentación técnica adicional
- Preparar la integración de Instagram Webhooks

---

*Este documento es la fuente de verdad para continuidad de sesión CTO.*
*Actualizar la tabla "Estado de Fases" al inicio/final de cada sesión.*
