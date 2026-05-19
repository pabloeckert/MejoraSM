# 📋 PLAN OPTIMIZADO — MejoraSM (EDA)

**Proyecto:** MejoraSocialMedia — Estratega Digital Autónoma
**Fecha:** 29/04/2026
**Versión:** 1.0
**Basado en:** Análisis completo del codebase + ANALISIS-PROFUNDO.md + DOCUMENTACION.md v4.0

---

> **🎯 PROPÓSITO:** Este documento es el plan de trabajo definitivo. Cada etapa indica
> explícitamente qué puede hacer la IA ahora mismo y qué requiere acción del usuario.
> La regla es: **la IA avanza todo lo posible sin pedir permiso, y solo se detiene
> cuando necesita sí o sí una acción del usuario.**

---

## 📌 ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Análisis Consolidado Multidisciplinario](#2-análisis-consolidado)
3. [Diagrama de Dependencias](#3-diagrama-de-dependencias)
4. [ETAPA 0 — Seguridad y Limpieza](#etapa-0)
5. [ETAPA 1 — Activar Backend](#etapa-1)
6. [ETAPA 2 — Conectar y Probar E2E](#etapa-2)
7. [ETAPA 3 — UX, Polish y Onboarding](#etapa-3)
8. [ETAPA 4 — Publicador y Calendario](#etapa-4)
9. [ETAPA 5 — Monitor de KPIs](#etapa-5)
10. [ETAPA 6 — Bucle de Aprendizaje](#etapa-6)
11. [ETAPA 7 — Escala y Monetización](#etapa-7)
12. [Resumen de Bloqueadores por Etapa](#resumen-bloqueadores)
13. [Checklist de Verificación Final](#checklist-final)

---

## 1. RESUMEN EJECUTIVO

### Estado del Proyecto

| Componente | Estado | Detalle |
|---|---|---|
| Extensión Chrome v1.1.0 | ✅ COMPLETA | Manifest V3, funcional |
| Frontend React | ✅ COMPLETO | 5 páginas, 4 hooks, 21 tests |
| Schema SQL (9 tablas) | ✅ EJECUTADO | En Supabase, verificado vía SQL Editor |
| Edge Functions (3 funciones) | ✅ CÓDIGO LISTO | Sin deploy |
| API Keys (Groq/DeepSeek/HF) | ❌ SIN CONFIGURAR | Requiere usuario |
| PostgREST schema cache | ❌ BLOQUEADO | Tablas existen pero API no las ve |
| Deploy Edge Functions | ❌ PENDIENTE | Requiere Supabase CLI login |
| RLS Policies | ⚠️ ABIERTAS | "Allow all" — temporal |

### Puntuación Consolidada por Área

| Área | Score | Estado | Prioridad de Mejora |
|---|---|---|---|
| **Cybersecurity** | ⭐ (1/5) | 🔴 CRÍTICO | ETAPA 0 — INMEDIATO |
| **DevOps** | ⭐⭐ (2/5) | 🟠 Deficiente | ETAPA 1 |
| **SRE** | ⭐⭐ (2/5) | 🟠 Sin monitoreo | ETAPA 1-2 |
| **QA** | ⭐⭐ (2/5) | 🟠 Solo frontend | ETAPA 2-3 |
| **Backend** | ⭐⭐⭐ (3/5) | 🟡 Funcional, sin validación | ETAPA 2 |
| **Software Arch** | ⭐⭐⭐ (3/5) | 🟡 Buena base, falta abstracción | ETAPA 3 |
| **Data Engineer** | ⭐⭐⭐ (3/5) | 🟡 Schema sólido | ETAPA 5 |
| **ML Engineer** | ⭐⭐⭐ (3/5) | 🟡 RAG completo, chunking fijo | ETAPA 6 |
| **DBA** | ⭐⭐⭐ (3/5) | 🟡 Normalizado, faltan índices | ETAPA 1 |
| **Product/UX** | ⭐⭐⭐ (3/5) | 🟡 Sin onboarding ni validación | ETAPA 3 |
| **Frontend** | ⭐⭐⭐⭐ (4/5) | 🟢 Moderno, falta error handling | ETAPA 2-3 |
| **UI Design** | ⭐⭐⭐⭐ (4/5) | 🟢 Profesional | ETAPA 3 |
| **Cloud Arch** | ⭐⭐⭐⭐ (4/5) | 🟢 Serverless correcto | — |
| **Legal** | ⭐ (1/5) | 🔴 Sin privacidad ni ToS | ETAPA 7 |

---

## 2. ANÁLISIS CONSOLIDADO MULTIDISCIPLINARIO

### 2.1 Software Architect

**Diagnóstico:** Arquitectura de 3 capas bien definida (Frontend → Edge Functions → DB/Proveedores). Separación correcta entre ai-gateway (router), orchestrator (flujo multi-agente) y vault-process (RAG). Supabase como BaaS reduce complejidad operacional.

**Problemas detectados:**
- **Dependencia HTTP interna:** orchestrator hace `fetch()` directo a Groq en vez de pasar por ai-gateway. Correcto para performance, pero crea duplicación de lógica de llamada IA.
- **Sin patrón de retry:** Si Groq falla, el fallback es lineal sin backoff exponencial.
- **Sin circuit breaker:** Un proveedor caído puede causar timeouts en cascada.
- **Acoplamiento fuerte:** `supabase.ts` mezcla lógica de negocio con acceso a datos — no hay capa de repositorio.

**Recomendaciones inmediatas (ETAPA 2):**
1. Agregar retry con exponential backoff en ai-gateway y orchestrator.
2. Implementar validación con Zod en body de requests de Edge Functions.
3. Crear logging estructurado (JSON) en Edge Functions.

### 2.2 Cloud Architect

**Diagnóstico:** Stack 100% serverless correcto para MVP. Supabase unifica DB + Auth + Storage + Functions + Realtime. Costo $0/mes en free tier.

**Problemas detectados:**
- **FTP deployment:** Protocolo obsoleto, sin TLS garantizado, sin rollback.
- **Sin staging:** Deploy directo a producción en cada push a `main`.
- **`dangerous-clean-slate: true`** en FTP: borra todo el directorio remoto antes de subir.
- **Vendor lock-in:** Edge Functions usan APIs específicas de Supabase (Deno, service role key).

**Recomendaciones:**
- ETAPA 1: Agregar health check post-deploy en GitHub Actions workflow.
- ETAPA 7: Evaluar migración frontend a Vercel/Cloudflare Pages.

### 2.3 Backend Developer

**Diagnóstico:** Edge Functions bien estructuradas con CORS handling y validación básica de inputs. Chunking inteligente con overlap para RAG. Vector search con pgvector nativo.

**Problemas detectados:**
- **Sin validación de esquema:** No usa Zod ni ningún validador para body de requests.
- **Sin rate limiting:** Cualquier request es procesada sin límite.
- **Error handling genérico:** Todos los errores retornan 500 sin diferenciación.
- **`extractProposal()` es frágil:** Usa regex para parsear output de IA — puede fallar con variaciones del modelo.
- **orchestrator hardcodea Groq:** Aunque `agent_config` tiene `provider`, el `callAI()` del orchestrator siempre usa Groq.

**Problema crítico en orchestrator:**
```typescript
// orchestrator/index.ts línea ~50
async function callAI(...) {
  const apiKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("DEEPSEEK_API_KEY");
  // ↑ IGNORA el parámetro 'provider' — siempre usa Groq
  // Debería respetar config.provider y usar el proveedor correcto
}
```

**Fix necesario (ETAPA 2):** Reescribir `callAI()` en orchestrator para respetar el proveedor configurado en `agent_config`, similar al router de ai-gateway.

### 2.4 Frontend Developer

**Diagnóstico:** Stack moderno (React 18 + TypeScript + Vite). shadcn/ui proporciona componentes accesibles. Code splitting configurado. Hooks personalizados bien estructurados. TanStack Query para cache.

**Problemas detectados:**
- **Sin error boundary global:** Cada página maneja errores individualmente.
- **Loading states inconsistentes:** Algunos usan Loader2, otros no tienen.
- **Configuración en localStorage:** `Configuracion.tsx` no sincroniza con DB.
- **Sin optimistic updates.**
- **Laboratorio.tsx es placeholder vacío.**

### 2.5 DevOps Engineer

**Diagnóstico:** GitHub Actions CI/CD configurado. Deploy automático en push a `main`.

**Problemas críticos:**
- **FTP deployment sin TLS.**
- **Sin staging environment.**
- **Sin health checks post-deploy.**
- **Sin notificaciones de deploy.**
- **`dangerous-clean-slate: true`** — riesgoso.

### 2.6 SRE

**Diagnóstico:** Sin monitoreo, sin alertas, sin SLOs, sin disaster recovery plan.

**Acciones (ETAPA 1):**
- Implementar health endpoint que verifique DB + Functions + Storage.
- Configurar logging en Supabase observability.
- Definir SLO básico (99% uptime para MVP).

### 2.7 Cybersecurity Architect — 🔴 CRÍTICO

**Hallazgos de seguridad:**

| # | Severidad | Hallazgo | Estado Actual |
|---|---|---|---|
| S1 | 🔴 CRÍTICO | `.env` con credenciales reales commiteado | ⚠️ Verificar si sigue en historial git |
| S2 | 🔴 CRÍTICO | `docs/DEPLOY.md` con FTP password | Legacy (solo lectura), pero visible en repo |
| S3 | 🟠 ALTO | RLS con políticas "Allow all" | Temporalmente aceptable para MVP personal |
| S4 | 🟡 MEDIO | CORS ya restringido en código | ✅ Corregido (ALLOWED_ORIGINS) |
| S5 | 🟡 MEDIO | Sin CSP headers en frontend | Mejorable |
| S6 | 🟡 MEDIO | Dependencias con `^` (no pinned) | Riesgo de supply chain |

**Nota importante:** El CORS ya fue corregido en el código actual — las Edge Functions usan `ALLOWED_ORIGINS` con dominios específicos en lugar de `*`. Esto reduce la severidad de S4.

### 2.8 DBA

**Diagnóstico:** Schema normalizado con foreign keys, CASCADE deletes, RLS habilitado, IVFFlat index para pgvector.

**Faltantes:**
- **Sin índices** en columnas de filtro frecuente: `status`, `session_id`, `proposal_id`, `created_at`.
- **IVFFlat con `lists=100`** asume 10K+ rows — subóptimo para datasets pequeños (<1000 rows usar `lists=10`).
- **Sin CHECK constraints** para valores de enum (status, format).

**Fix (ETAPA 1):** Crear índices y ajustar IVFFlat.

### 2.9 ML Engineer

**Diagnóstico:** Pipeline RAG completo: chunking → embeddings → vector search → contexto. Multi-agente con roles diferenciados. Fallback automático entre proveedores.

**Problemas:**
- **Chunking fijo (~500 tokens):** No adapta al contenido.
- **Sin re-ranking:** Búsqueda vectorial devuelve N más similares sin re-ordenar.
- **`extractProposal()` con regex:** Fragil, debería usar JSON mode o structured output.

### 2.10 QA

**Diagnóstico:** 21 tests Vitest para frontend. Sin tests de Edge Functions, sin tests de integración, sin E2E.

**Acciones (ETAPA 2-3):**
- Crear tests para Edge Functions.
- Tests de integración: upload → process → search.
- Coverage report.

### 2.11 Product Manager / UX

**Diagnóstico:** Visión clara, 8 buyer personas definidos. Sin validación de mercado real. Sin onboarding. Sin flujo de primera vez.

**Acciones (ETAPA 3):**
- Onboarding wizard (3 pasos).
- Confirmación en acciones destructivas.
- Empty states con CTAs.
- Tooltips en configuración.

### 2.12 Legal & Compliance

**Riesgos:**
- Sin política de privacidad.
- Sin términos de uso.
- Extensión inyecta código en Instagram (riesgo ToS).
- Sin mecanismo de eliminación de datos.

**Acción (ETAPA 7):** Crear política de privacidad + ToS.

---

## 3. DIAGRAMA DE DEPENDENCIAS

```
ETAPA 0 (Seguridad) ─────────────────────────────────┐
    │                                                  │
    ▼                                                  │
ETAPA 1 (Activar Backend) ◄── BLOQUEA todo lo demás   │
    │                                                  │
    ├─── [USUARIO] Resolver PostgREST                  │
    ├─── [USUARIO] Configurar API keys                 │
    ├─── [USUARIO] Deploy Edge Functions               │
    │                                                  │
    ▼                                                  │
ETAPA 2 (Conectar E2E)                                │
    │                                                  │
    ├─── [AI] Fix orchestrator callAI()                │
    ├─── [AI] Validación Zod en Edge Functions         │
    ├─── [AI] Retry + backoff                          │
    │                                                  │
    ▼                                                  │
ETAPA 3 (UX/Polish)                                    │
    │                                                  │
    ├─── [AI] Onboarding wizard                        │
    ├─── [AI] Error boundaries                         │
    ├─── [AI] Loading skeletons                        │
    │                                                  │
    ▼                                                  │
ETAPA 4 (Publicador) ◄── REQUIERE Instagram API       │
    │                                                  │
    ├─── [AI] CRUD calendario                          │
    ├─── [AI] Sistema de aprobación                    │
    ├─── [USUARIO] Meta Business Account               │
    │                                                  │
    ▼                                                  │
ETAPA 5 (KPIs) ◄── REQUIERE Instagram Business        │
    │                                                  │
    ├─── [USUARIO] Instagram Insights API setup        │
    │                                                  │
    ▼                                                  │
ETAPA 6 (Aprendizaje)                                  │
    │                                                  │
    ▼                                                  │
ETAPA 7 (Escala) ◄── REQUIERE decisiones de negocio   │
```

**Leyenda:**
- `[AI]` = La IA puede hacerlo ahora sin intervención del usuario
- `[USUARIO]` = Requiere acción del usuario (no se puede avanzar sin esto)

---

## ETAPA 0 — Seguridad y Limpieza 🔴

**Prioridad:** CRÍTICA — Ejecutar antes que cualquier otra cosa
**Tiempo estimado:** 1 día
**Dependencias:** Ninguna

---

### 0.1 — Eliminar credenciales del historial git

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🧑 USUARIO |
| **Por qué no puede hacerlo la IA** | Requiere acceso al historial de git y force push al repo remoto. La IA no tiene permisos para hacer force push ni modificar el historial de git público. |

**Acciones:**
1. Instalar BFG Repo Cleaner: `brew install bfg` (macOS) o descargar jar
2. Ejecutar: `java -jar bfg.jar --delete-files .env` en el repo
3. Ejecutar: `git reflog expire --expire=now --all && git gc --prune=now --aggressive`
4. Force push: `git push --force`
5. **ROTAR** todas las credenciales en Supabase Dashboard:
   - Project Settings → API → Regenerar `anon` key
   - Project Settings → API → Regenerar `service_role` key
   - Si FTP password fue expuesta → cambiar en Hostinger

**Alternativa (más simple):** Si el repo es privado y solo Pablo tiene acceso, puede simplemente rotar las credenciales sin limpiar el historial. El `.env` ya está en `.gitignore`.

---

### 0.2 — Eliminar credenciales FTP de docs/DEPLOY.md

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI + 🧑 USUARIO |
| **Qué hace la IA** | Reescribir `docs/DEPLOY.md` eliminando cualquier credencial |
| **Qué hace el usuario** | Verificar que no quedan credenciales, rotar si es necesario |

**La IA puede hacer:**
```bash
# Buscar credenciales en docs/
grep -rn "password\|ftp\|secret\|key\|token" docs/ --include="*.md"
# Si encuentra, editar el archivo reemplazando con PLACEHOLDER
```

**Verificación:** El archivo `docs/DEPLOY.md` es legacy (solo lectura según DOCUMENTACION.md), pero sigue visible en el repo público. Debe sanitizarse.

---

### 0.3 — Agregar CSP headers al frontend

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos a modificar** | `index.html`, `vite.config.ts` |

**Cambios específicos:**

En `index.html`, agregar meta tag:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://exnjyxwmxknvzploeaex.supabase.co https://api.groq.com https://api.deepseek.com https://api-inference.huggingface.com https://generativelanguage.googleapis.com;
  img-src 'self' data: blob: https:;
">
```

---

### 0.4 — Verificar que .env no está en el repo actual

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Verificación** | Comprobar que `.env` está en `.gitignore` y no existe como archivo tracked |

```bash
git ls-files | grep -i "\.env"
# Si devuelve algo → el archivo está tracked, hay que removerlo
git rm --cached .env
```

---

### 0.5 — Revisar dependencias con versiones no pinned

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivo** | `package.json` |

**Análisis:** El `package.json` actual usa `^` para todas las dependencias (ej: `"react": "^18.3.1"`). Esto significa que `npm install` puede instalar versiones diferentes en diferentes momentos, lo cual es un riesgo de supply chain.

**Decisión:** Para MVP, mantener `^` es aceptable. En ETAPA 7, generar `package-lock.json` con hashes verificados y considerar pinning versiones críticas.

---

### ETAPA 0 — Resumen de Ejecución

| # | Tarea | Quién | Archivos | Tiempo |
|---|---|---|---|---|
| 0.1 | Eliminar .env del historial git + rotar credenciales | 🧑 USUARIO | .git history | 30 min |
| 0.2 | Sanitizar docs/DEPLOY.md | 🤖 AI | `docs/DEPLOY.md` | 10 min |
| 0.3 | Agregar CSP headers | 🤖 AI | `index.html` | 15 min |
| 0.4 | Verificar .env no tracked | 🤖 AI | `.gitignore` | 5 min |
| 0.5 | Auditar dependencias | 🤖 AI | `package.json` | 10 min |

**Total tiempo AI:** ~40 min (ejecutable inmediatamente)
**Total tiempo usuario:** ~30 min (rotar credenciales)
**Bloqueador:** ETAPA 0.1 requiere usuario para rotar credenciales. Las demás tareas son ejecutables por la IA.

---

## ETAPA 1 — Activar Backend 🔄

**Prioridad:** ALTA — Bloquea todo el sistema funcional
**Tiempo estimado:** 1-2 días
**Dependencias:** ETAPA 0 completa (credenciales rotadas)

> **⚠️ ESTA ETAPA ES LA MÁS CRÍTICA. Sin ella, ninguna funcionalidad del backend opera.**
> **La IA puede preparar todo el código, pero el deploy y la configuración de secrets
> requieren al usuario.**

---

### 1.1 — Resolver PostgREST Schema Cache

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🧑 USUARIO |
| **Por qué no puede hacerlo la IA** | Requiere acceso al dashboard de Supabase y/o CLI autenticada |

**Acciones a probar (en orden):**

1. **Reiniciar proyecto Supabase:**
   - Ir a Project Settings → General → "Pause project"
   - Esperar 30 segundos
   - "Resume project"
   - Esperar 2 minutos
   - Probar: `curl https://exnjyxwmxknvzploeaex.supabase.co/rest/v1/documents?select=id&limit=1 -H "apikey: ANON_KEY"`

2. **Si no funciona, usar Supabase CLI:**
   ```bash
   npx supabase login
   npx supabase link --project-ref exnjyxwmxknvzploeaex
   npx supabase db push
   ```

3. **Si no funciona, eliminar y recrear tablas vía CLI:**
   ```bash
   npx supabase db reset
   # Esto ejecuta todas las migraciones desde cero
   ```

4. **Si nada funciona:** Contactar soporte de Supabase. Es un bug del proyecto.

**Verificación:** El health check (`scripts/health-check.sh`) debe mostrar ✅ en las 9 tablas.

---

### 1.2 — Configurar API Keys como Secrets

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🧑 USUARIO |
| **Por qué no puede hacerlo la IA** | Requiere acceso al dashboard de Supabase y a las cuentas de proveedores IA |

**Acciones:**

1. **Obtener API keys:**
   - Groq: https://console.groq.com/keys → Crear API key
   - DeepSeek: https://platform.deepseek.com/api_keys → Crear API key
   - HuggingFace: https://huggingface.co/settings/tokens → Crear token (Read permission)
   - Gemini (opcional): https://aistudio.google.com/apikey → Crear API key

2. **Configurar en Supabase:**
   - Ir a Project Settings → Edge Functions → Secrets
   - Agregar:
     - `GROQ_API_KEY` = `gsk_...`
     - `DEEPSEEK_API_KEY` = `sk-...`
     - `HF_API_KEY` = `hf_...`
     - `GEMINI_API_KEY` = `AIza...` (opcional)

**Alternativa via CLI:**
```bash
npx supabase secrets set GROQ_API_KEY=gsk_... --project-ref exnjyxwmxknvzploeaex
npx supabase secrets set DEEPSEEK_API_KEY=sk-... --project-ref exnjyxwmxknvzploeaex
npx supabase secrets set HF_API_KEY=hf_... --project-ref exnjyxwmxknvzploeaex
```

---

### 1.3 — Deploy Edge Functions

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🧑 USUARIO (ejecuta CLI) + 🤖 AI (prepara código) |
| **Por qué la IA no puede deployar** | Requiere `supabase login` autenticado y acceso al proyecto |

**Código que la IA puede preparar antes del deploy:**

1. **Mejorar ai-gateway** — Agregar validación Zod:
   - Archivo: `supabase/functions/ai-gateway/index.ts`
   - Agregar validación de body con Zod-like checks
   - Mejorar error messages

2. **Mejorar orchestrator** — Fix `callAI()` para respetar proveedor:
   - Archivo: `supabase/functions/orchestrator/index.ts`
   - El `callAI()` actual siempre usa Groq ignorando el `provider` de `agent_config`
   - Fix: hacer routing correcto según el proveedor configurado

3. **Mejorar vault-process** — Mejorar error handling:
   - Archivo: `supabase/functions/vault-process/index.ts`
   - Agregar validación de documentId (UUID format)
   - Mejorar logging

**Deploy (ejecuta el usuario):**
```bash
bash scripts/deploy.sh
# O manualmente:
npx supabase functions deploy ai-gateway --project-ref exnjyxwmxknvzploeaex
npx supabase functions deploy orchestrator --project-ref exnjyxwmxknvzploeaex
npx supabase functions deploy vault-process --project-ref exnjyxwmxknvzploeaex
```

---

### 1.4 — Crear Índices en DB

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🧑 USUARIO (ejecuta SQL) + 🤖 AI (prepara SQL) |

**SQL que la IA prepara (el usuario ejecuta en SQL Editor):**

```sql
-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_document_id ON doc_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_status ON dialogue_sessions(status);
CREATE INDEX IF NOT EXISTS idx_dialogue_sessions_created_at ON dialogue_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_session_id ON dialogue_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_messages_turn ON dialogue_messages(session_id, turn);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_session_id ON proposals(session_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_metrics_proposal_id ON metrics(proposal_id);
CREATE INDEX IF NOT EXISTS idx_metrics_measured_at ON metrics(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_success_rules_confidence ON success_rules(confidence DESC);

-- Ajustar IVFFlat para datasets pequeños (<1000 rows)
-- Nota: esto requiere recrear el índice
DROP INDEX IF EXISTS idx_doc_chunks_embedding;
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding
  ON doc_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);  -- 10 para <1000 rows, 100 para 10K+
```

---

### 1.5 — Health Check Post-Deploy

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI (mejorar script) + 🧑 USUARIO (ejecutar) |

**La IA mejora `scripts/health-check.sh`:**
- Agregar verificación de secrets configurados
- Agregar verificación de respuesta real de Edge Functions (POST con body)
- Agregar timestamp y resumen final

**El usuario ejecuta:**
```bash
bash scripts/health-check.sh ANON_KEY
```

---

### ETAPA 1 — Resumen de Ejecución

| # | Tarea | Quién | Archivos | Tiempo |
|---|---|---|---|---|
| 1.1 | Resolver PostgREST cache | 🧑 USUARIO | Supabase Dashboard | 15-60 min |
| 1.2 | Configurar API keys | 🧑 USUARIO | Supabase Dashboard | 15 min |
| 1.3a | Mejorar Edge Functions (código) | 🤖 AI | 3 archivos index.ts | 1 hora |
| 1.3b | Deploy Edge Functions | 🧑 USUARIO | CLI | 10 min |
| 1.4 | Crear índices DB | 🧑 USUARIO | SQL Editor | 10 min |
| 1.5 | Health check | 🧑 USUARIO | CLI | 5 min |

**Total tiempo AI:** ~1 hora (mejoras de código)
**Total tiempo usuario:** ~1-1.5 horas (config + deploy)
**⚠️ BLOQUEADOR:** Sin resolver 1.1 + 1.2 + 1.3b, nada del backend funciona.

---

## ETAPA 2 — Conectar y Probar End-to-End

**Prioridad:** ALTA
**Tiempo estimado:** 2-3 días
**Dependencias:** ETAPA 1 completa (backend activo)

> **A partir de aquí, la IA puede hacer la mayor parte del trabajo.**
> **Solo se detiene si encuentra un error que requiere configuración del usuario.**

---

### 2.1 — Fix orchestrator.callAI() para respetar proveedor

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivo** | `supabase/functions/orchestrator/index.ts` |

**Problema actual:**
```typescript
// Línea ~50: siempre usa Groq, ignora el provider de agent_config
async function callAI(provider, model, system, messages, temperature) {
  const apiKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("DEEPSEEK_API_KEY");
  // ↑ No importa qué provider se pase, siempre llama a Groq
}
```

**Fix:** Reescribir `callAI()` para hacer routing correcto:
```typescript
async function callAI(provider: string, model: string, system: string, 
                       messages: {role: string; content: string}[], temperature = 0.7): Promise<string> {
  const allMessages = system ? [{ role: "system", content: system }, ...messages] : messages;
  
  switch (provider) {
    case "groq": {
      const apiKey = Deno.env.get("GROQ_API_KEY");
      if (!apiKey) throw new Error("GROQ_API_KEY no configurada");
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model || "meta-llama/llama-4-scout-17b-16e-instruct", messages: allMessages, temperature, max_tokens: 2048 }),
      });
      if (!res.ok) throw new Error(`Groq error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    }
    case "deepseek": {
      const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
      if (!apiKey) throw new Error("DEEPSEEK_API_KEY no configurada");
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model || "deepseek-chat", messages: allMessages, temperature, max_tokens: 2048 }),
      });
      if (!res.ok) throw new Error(`DeepSeek error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    }
    case "gemini": {
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");
      const contents = allMessages.filter(m => m.role !== "system").map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const systemMsg = allMessages.find(m => m.role === "system");
      const body: any = { contents, generationConfig: { temperature, maxOutputTokens: 2048 } };
      if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    default:
      throw new Error(`Proveedor no soportado: ${provider}`);
  }
}
```

**Después de este fix, hacer deploy de la función actualizada.**

---

### 2.2 — Agregar retry con exponential backoff

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | `supabase/functions/ai-gateway/index.ts`, `supabase/functions/orchestrator/index.ts` |

**Implementación:**
```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 1000): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries) throw e;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      console.warn(`Retry ${i + 1}/${maxRetries} after ${Math.round(delay)}ms: ${e.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}
```

Aplicar en `withFallback()` de ai-gateway y en `callAI()` de orchestrator.

---

### 2.3 — Agregar validación Zod en Edge Functions

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | Los 3 `index.ts` de Edge Functions |

**Implementación:** Agregar validación inline (sin dependencia externa, ya que Edge Functions usan Deno):

```typescript
function validateBody(body: any, required: string[]) {
  const missing = required.filter(k => body[k] === undefined || body[k] === null);
  if (missing.length > 0) {
    throw new Error(`Campos requeridos faltantes: ${missing.join(", ")}`);
  }
}
```

Aplicar al inicio de cada handler.

---

### 2.4 — Mejorar error handling en Edge Functions

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | Los 3 `index.ts` de Edge Functions |

**Cambios:**
- Diferenciar errores de validación (400) vs errores de proveedor IA (502) vs errores internos (500)
- Agregar structured logging con JSON
- Agregar request ID para trazabilidad

---

### 2.5 — Probar Bóveda end-to-end

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI (prepara tests) + 🧑 USUARIO (ejecuta manualmente) |

**Flujo a probar:**
1. Subir un archivo `.txt` o `.md` desde el frontend
2. Verificar que se crea registro en `documents`
3. Verificar que `vault-process` procesa el archivo
4. Verificar que se crean chunks en `doc_chunks`
5. Verificar que se generan embeddings
6. Hacer búsqueda semántica y verificar resultados relevantes

**Posibles fallos:**
- HF_API_KEY no configurada → embeddings no se generan (funciona con fallback)
- PostgREST cache → documento no se crea (depende de ETAPA 1.1)
- Storage bucket sin permisos → upload falla

---

### 2.6 — Probar Mesa de Diálogo end-to-end

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI (prepara) + 🧑 USUARIO (ejecuta) |

**Flujo a probar:**
1. Crear sesión con topic desde frontend
2. Verificar que se ejecutan los 3 agentes secuencialmente
3. Verificar que se guardan mensajes en `dialogue_messages`
4. Verificar que se crea propuesta si el crítico aprueba
5. Dar feedback y verificar `continueSession()`

---

### 2.7 — Conectar Configuración a tabla agent_config

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivo** | `src/pages/Configuracion.tsx` |

**Cambio:** Reemplazar localStorage por lectura/escritura directa a la tabla `agent_config` de Supabase.

---

### 2.8 — Implementar error handling global en frontend

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | `src/App.tsx`, nuevo `src/components/ErrorBoundary.tsx` |

**Implementación:**
- Crear componente `ErrorBoundary` con fallback UI
- Envolver las rutas en `App.tsx`
- Agregar toast notifications para errores de API

---

### 2.9 — Tests de integración

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | `src/test/integration/` (nuevo) |

**Tests a crear:**
- `vault.test.ts` — upload → process → search flow
- `dialogue.test.ts` — start → continue → proposal flow
- `api.test.ts` — verificar que los servicios retornan datos válidos

---

### ETAPA 2 — Resumen de Ejecución

| # | Tarea | Quién | Tiempo |
|---|---|---|---|
| 2.1 | Fix orchestrator.callAI() | 🤖 AI | 30 min |
| 2.2 | Retry + backoff | 🤖 AI | 30 min |
| 2.3 | Validación Zod | 🤖 AI | 30 min |
| 2.4 | Error handling | 🤖 AI | 30 min |
| 2.5 | Test Bóveda E2E | 🤖 AI + 🧑 | 1 hora |
| 2.6 | Test Mesa E2E | 🤖 AI + 🧑 | 1 hora |
| 2.7 | Conectar Configuración | 🤖 AI | 30 min |
| 2.8 | Error boundary frontend | 🤖 AI | 30 min |
| 2.9 | Tests de integración | 🤖 AI | 1 hora |

**Total tiempo AI:** ~5.5 horas
**Total tiempo usuario:** ~2 horas (testing manual)
**⚠️ Posible bloqueador:** Si Edge Functions fallan por falta de API keys → requiere ETAPA 1.2.

---

## ETAPA 3 — UX, Polish y Onboarding

**Prioridad:** MEDIA-ALTA
**Tiempo estimado:** 3-4 días
**Dependencias:** ETAPA 2 completa (backend funcional)

> **Esta etapa es 100% ejecutable por la IA. No requiere intervención del usuario.**

---

### 3.1 — Onboarding Wizard (3 pasos)

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | Nuevo `src/components/Onboarding.tsx`, `src/App.tsx` |

**Pasos del wizard:**
1. **Bienvenida:** "Tu Estratega Digital está listo. Empecemos subiendo tus documentos de marca."
2. **Subir documentos:** Drag & drop con CTA "Subir mi primer documento"
3. **Primer diálogo:** "Ahora probemos la Mesa de Diálogo. Escribí un tema."

**Implementación:**
- Detectar si el usuario no tiene documentos → mostrar wizard
- Guardar estado en localStorage (`onboarding_completed`)
- Componente modal con pasos

---

### 3.2 — Confirmación en acciones destructivas

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | `src/pages/Boveda.tsx` |

**Cambio:** Antes de eliminar un documento, mostrar AlertDialog de confirmación:
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" size="sm">Eliminar</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acción no se puede deshacer. Se eliminará "{doc.title}" 
        y todos sus fragmentos procesados.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={() => deleteDoc(doc.id)}>Eliminar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 3.3 — Loading skeletons consistentes

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | `src/pages/*.tsx`, `src/components/Skeleton*.tsx` (nuevo) |

**Implementación:**
- Crear componentes de skeleton reutilizables: `SkeletonCard`, `SkeletonTable`, `SkeletonList`
- Reemplazar `Loader2` spinner por skeletons en todas las páginas
- Usar componente `Skeleton` de shadcn/ui (ya existe en `src/components/ui/skeleton.tsx`)

---

### 3.4 — Error Boundary global

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | `src/components/ErrorBoundary.tsx` (nuevo), `src/App.tsx` |

**Implementación:**
```tsx
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <h2 className="text-xl font-semibold mb-2">Algo salió mal</h2>
          <p className="text-muted-foreground mb-4">Ocurrió un error inesperado.</p>
          <button onClick={() => this.setState({ hasError: false })} 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

### 3.5 — Empty states con CTAs

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | `src/pages/Boveda.tsx`, `src/pages/MesaDialogo.tsx`, `src/pages/Dashboard.tsx` |

**Cambios:**
- Bóveda vacía → "Subí tu primer documento de marca para que los agentes aprendan tu tono." + botón "Subir documento"
- Mesa sin sesiones → "Creá tu primera sesión de diálogo para generar contenido." + botón "Nueva sesión"
- Dashboard sin datos → "Empezá subiendo documentos y creando tu primera propuesta."

---

### 3.6 — Tooltips en Configuración

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI |
| **Archivo** | `src/pages/Configuracion.tsx` |

**Cambios:**
- Tooltips para temperatura: "Menos temperatura = respuestas más predecibles. Más temperatura = respuestas más creativas."
- Tooltips para modelos: "Llama 4 Scout: rápido y gratuito. DeepSeek: mejor en análisis lógico."
- Tooltips para proveedor: "Groq: más rápido. DeepSeek: más profundo. Gemini: multimodal."

---

### 3.7 — Laboratorio funcional

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivo** | `src/pages/Laboratorio.tsx` |

**Implementación:** Convertir el placeholder en una página funcional:
- Subir imagen/descripción
- IA genera 3 propuestas de copy (usando el agente Creativo)
- Usuario puede elegir, editar y aprobar
- Guardar como propuesta en la DB

---

### 3.8 — Responsive design verification

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | Todos los `src/pages/*.tsx` |

**Verificar:** Que todas las páginas funcionen correctamente en:
- Desktop (1920px, 1440px, 1280px)
- Tablet (768px)
- Mobile (375px, 320px)

---

### ETAPA 3 — Resumen de Ejecución

| # | Tarea | Quién | Tiempo |
|---|---|---|---|
| 3.1 | Onboarding wizard | 🤖 AI | 2 horas |
| 3.2 | Confirmación destructivas | 🤖 AI | 30 min |
| 3.3 | Loading skeletons | 🤖 AI | 1 hora |
| 3.4 | Error boundary | 🤖 AI | 30 min |
| 3.5 | Empty states con CTAs | 🤖 AI | 1 hora |
| 3.6 | Tooltips configuración | 🤖 AI | 30 min |
| 3.7 | Laboratorio funcional | 🤖 AI | 2 horas |
| 3.8 | Responsive verification | 🤖 AI | 1 hora |

**Total tiempo AI:** ~8.5 horas
**Total tiempo usuario:** 0 (todo ejecutable por IA)
**✅ Sin bloqueadores de usuario en esta etapa.**

---

## ETAPA 4 — Publicador y Calendario

**Prioridad:** MEDIA
**Tiempo estimado:** 1 semana
**Dependencias:** ETAPA 3 completa

> **⚠️ La publicación automática en Instagram requiere Meta Business Account
> y Instagram Graph API. Esto es un bloqueador externo que requiere al usuario.**

---

### 4.1 — CRUD de calendario editorial

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | `src/pages/Calendario.tsx` (nuevo), `src/hooks/useCalendar.ts` (nuevo) |

**Implementación:**
- Vista de calendario mensual/semanal
- Drag & drop para mover eventos
- Integración con tabla `calendar_events`
- Botón "Agendar propuesta" desde la vista de propuestas

---

### 4.2 — Sistema de aprobación previa

| Aspecto | Detalle |
|---|---|
| **Responsable** | 🤖 AI |
| **Archivos** | `src/pages/Propuestas.tsx` (nuevo o integrar en Dashboard) |

**Implementación:**
- Cola de propuestas pendientes (status = "pending")
- Vista previa del contenido completo
- Botones: Aprobar, Rechazar (con razón), Editar
- Al aprobar → agendar en calendario
- Al rechazar → guardar razón para aprendizaje futuro

---

### 4.3 — Cron job de publicación

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI (código) + 🧑 USUARIO (configurar cron) |

**Código:** Nueva Edge Function `publisher/index.ts`
- Busca eventos de calendario cuyo `date` es ahora
- Publica el contenido en Instagram vía Graph API
- Actualiza estado a "published"
- Guarda `instagram_post_id`

**Configuración del cron (usuario):**
- Supabase Dashboard → Edge Functions → Schedules
- Configurar para ejecutar cada 15 minutos

---

### 4.4 — Instagram Graph API

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🧑 USUARIO |
| **Por qué** | Requiere Meta Business Account, Instagram Business Account, y Facebook App |

**Pasos para el usuario:**
1. Crear Facebook App en https://developers.facebook.com/
2. Configurar Instagram Graph API
3. Obtener access token de larga duración
4. Configurar como secret en Supabase: `INSTAGRAM_ACCESS_TOKEN`
5. Configurar `INSTAGRAM_BUSINESS_ACCOUNT_ID`

**Sin esto, el publicador NO puede publicar automáticamente.**

---

### ETAPA 4 — Resumen de Ejecución

| # | Tarea | Quién | Tiempo |
|---|---|---|---|
| 4.1 | CRUD calendario | 🤖 AI | 4 horas |
| 4.2 | Sistema aprobación | 🤖 AI | 3 horas |
| 4.3a | Publisher function (código) | 🤖 AI | 3 horas |
| 4.3b | Configurar cron | 🧑 USUARIO | 15 min |
| 4.4 | Instagram Graph API setup | 🧑 USUARIO | 1-2 horas |

**Total tiempo AI:** ~10 horas
**Total tiempo usuario:** ~2 horas
**⚠️ Bloqueador:** Sin Instagram Graph API (4.4), el publicador no publica. El calendario y aprobación funcionan sin esto.

---

## ETAPA 5 — Monitor de KPIs

**Prioridad:** MEDIA
**Tiempo estimado:** 1 semana
**Dependencias:** ETAPA 4 completa + Instagram Business Account

> **⚠️ Requiere Instagram Business Account conectado.**

---

### 5.1 — Instagram Insights API

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI (código) + 🧑 USUARIO (configurar acceso) |

**Implementación:** Nueva Edge Function `metrics-collector/index.ts`
- Consulta Instagram Insights API para cada post publicado
- Recolecta: likes, comments, shares, saves, reach, impressions
- Guarda en tabla `metrics`

---

### 5.2 — Dashboard con datos reales

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI |
| **Archivo** | `src/pages/Dashboard.tsx` |

**Cambios:**
- Reemplazar datos hardcodeados por queries reales a `metrics`
- Agregar gráficos con Recharts (ya instalado):
  - Engagement rate por post
  - Mejores horarios de publicación
  - Top posts por engagement
  - Tendencia semanal/mensual

---

### 5.3 — Análisis de rendimiento con IA

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI |
| **Archivo** | Nuevo `src/pages/Analisis.tsx` o integrar en Dashboard |

**Implementación:**
- DeepSeek analiza patrones en métricas
- Genera insights automáticos: "Los posts con hook pregunta rinden 2x mejor"
- Sugiere optimizaciones de horario, formato, tono

---

### ETAPA 5 — Resumen de Ejecución

| # | Tarea | Quién | Tiempo |
|---|---|---|---|
| 5.1a | Metrics collector (código) | 🤖 AI | 4 horas |
| 5.1b | Configurar Instagram Insights | 🧑 USUARIO | 1 hora |
| 5.2 | Dashboard con datos reales | 🤖 AI | 4 horas |
| 5.3 | Análisis IA de rendimiento | 🤖 AI | 3 horas |

**Total tiempo AI:** ~11 horas
**Total tiempo usuario:** ~1 hora
**⚠️ Bloqueador:** Sin Instagram Business Account, no hay datos de métricas.

---

## ETAPA 6 — Bucle de Aprendizaje

**Prioridad:** MEDIA-BAJA
**Tiempo estimado:** 1-2 semanas
**Dependencias:** ETAPA 5 completa (con datos de métricas)

> **100% ejecutable por la IA. No requiere intervención del usuario.**

---

### 6.1 — Tracking de métricas por post

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI |
| **Implementación** | Correlacionar contenido (hook, CTA, hashtags, formato, horario) con rendimiento |

---

### 6.2 — Reglas de éxito automáticas

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI |
| **Archivo** | Nuevo `supabase/functions/rule-engine/index.ts` |

**Implementación:**
- Analizar N posts con métricas
- Generar reglas: "Si hook incluye pregunta Y formato=carrusel → engagement +40%"
- Guardar en tabla `success_rules` con confidence score
- Aplicar reglas en futuras generaciones de contenido

---

### 6.3 — Sugerencias proactivas

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI |
| **Implementación** | Los agentes consultan `success_rules` antes de generar contenido |

---

### 6.4 — Gestor de interacciones

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🧑 USUARIO (decisión de negocio) + 🤖 AI (implementación) |
| **Nota** | Baja prioridad. Auto-likes y auto-follows pueden violar ToS de Instagram. |

---

### ETAPA 6 — Resumen de Ejecución

| # | Tarea | Quién | Tiempo |
|---|---|---|---|
| 6.1 | Tracking por post | 🤖 AI | 4 horas |
| 6.2 | Rule engine | 🤖 AI | 6 horas |
| 6.3 | Sugerencias proactivas | 🤖 AI | 3 horas |
| 6.4 | Gestor interacciones | 🤖 AI + 🧑 | 8 horas |

**Total tiempo AI:** ~21 horas
**Total tiempo usuario:** 0 (excepto decisión sobre 6.4)

---

## ETAPA 7 — Escala y Monetización

**Prioridad:** POST-MVP
**Tiempo estimado:** 2+ semanas
**Dependencias:** ETAPA 6 completa o paralela

---

### 7.1 — Supabase Auth

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI + 🧑 USUARIO (configurar providers) |

**Implementación:**
- Agregar login/register con email + password
- Proteger rutas con `ProtectedRoute`
- Actualizar RLS policies para usar `auth.uid()`
- Configurar providers (email, Google) en Supabase Dashboard

---

### 7.2 — Definir modelo de negocio

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🧑 USUARIO |
| **Decisiones:** | ¿Freemium? ¿Suscripción? ¿Qué features son premium? |

---

### 7.3 — Analytics de uso

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI |
| **Implementación** | Mixpanel/Amplitude free tier para tracking de uso |

---

### 7.4 — Landing page optimizada

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI |
| **Implementación** | SEO + meta tags + structured data + conversión |

---

### 7.5 — Programa de beta testers

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🧑 USUARIO |
| **Acción** | Reclutar 5-10 emprendedores argentinos para testing |

---

### 7.6 — Documentar design system

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI |
| **Archivo** | `docs/DESIGN-SYSTEM.md` (nuevo) |

---

### 7.7 — Política de privacidad y ToS

| Aspecto | Detalle |
|---|---|
| **Responsável** | 🤖 AI (draft) + 🧑 USUARIO (revisión legal) |

---

### ETAPA 7 — Resumen de Ejecución

| # | Tarea | Quién | Tiempo |
|---|---|---|---|
| 7.1 | Supabase Auth | 🤖 AI + 🧑 | 6 horas AI + 1 hora usuario |
| 7.2 | Modelo de negocio | 🧑 USUARIO | Variable |
| 7.3 | Analytics | 🤖 AI | 2 horas |
| 7.4 | Landing optimizada | 🤖 AI | 4 horas |
| 7.5 | Beta testers | 🧑 USUARIO | Variable |
| 7.6 | Design system | 🤖 AI | 3 horas |
| 7.7 | Privacidad + ToS | 🤖 AI + 🧑 | 2 horas AI + revisión |

---

## RESUMEN DE BLOQUEADORES POR ETAPA

| Etapa | ¿Puede avanzar la IA sola? | Bloqueadores de usuario |
|---|---|---|
| **ETAPA 0** | ⚠️ Parcialmente | 0.1: Rotar credenciales, limpiar git history |
| **ETAPA 1** | ❌ NO | 1.1: PostgREST cache, 1.2: API keys, 1.3b: Deploy functions |
| **ETAPA 2** | ⚠️ Parcialmente | Testing manual requiere backend activo (ETAPA 1) |
| **ETAPA 3** | ✅ SÍ | Ninguno — 100% ejecutable por IA |
| **ETAPA 4** | ⚠️ Parcialmente | 4.3b: Cron config, 4.4: Instagram Graph API |
| **ETAPA 5** | ⚠️ Parcialmente | 5.1b: Instagram Business Account |
| **ETAPA 6** | ✅ SÍ | Ninguno (si hay datos de métricas) |
| **ETAPA 7** | ⚠️ Parcialmente | 7.1: Auth providers, 7.2: Modelo negocio, 7.5: Beta testers |

### 🚨 FLUJO RECOMENDADO — "Sigue hasta que necesites que haga algo yo"

```
1. IA ejecuta ETAPA 0.2-0.5 (sanitizar docs, CSP, verificar .env) ← 40 min
   ↓
2. ⛔ BLOQUEO → Usuario: rotar credenciales (ETAPA 0.1)
   ↓
3. IA ejecuta ETAPA 1.3a (mejorar Edge Functions) ← 1 hora
   ↓
4. ⛔ BLOQUEO → Usuario: resolver PostgREST + configurar API keys + deploy
   ↓
5. IA ejecuta ETAPA 2 completa (fix + tests + error handling) ← 5.5 horas
   ↓
6. ⛔ BLOQUEO → Usuario: testing manual E2E
   ↓
7. IA ejecuta ETAPA 3 completa (UX + Polish) ← 8.5 horas ← SIN BLOQUEO
   ↓
8. IA ejecuta ETAPA 4.1-4.2 (calendario + aprobación) ← 7 horas
   ↓
9. ⛔ BLOQUEO → Usuario: Instagram Graph API setup
   ↓
10. ...continúa según disponibilidad del usuario
```

**La IA puede ejecutar ~22.5 horas de trabajo de código antes de necesitar
que el usuario haga algo.** El primer bloqueo real es ETAPA 1.1 (PostgREST).

---

## CHECKLIST DE VERIFICACIÓN FINAL

### ¿El sistema está "MVP funcional"?

- [ ] ETAPA 0: Credenciales rotadas, .env no en repo, CSP headers
- [ ] ETAPA 1: PostgREST reconoce tablas, API keys configuradas, Functions deployadas
- [ ] ETAPA 2: Orchestrator respeta proveedor, retry funciona, Bóveda E2E OK, Mesa E2E OK
- [ ] ETAPA 3: Onboarding funciona, errores manejados, empty states con CTAs
- [ ] Tests pasando (`npm test`)
- [ ] Health check completo (`scripts/health-check.sh` todo ✅)
- [ ] Deploy automático funciona (push → build → FTP)

### ¿El sistema está "completo"?

- [ ] ETAPA 4: Calendario funcional, publicador automático con Instagram API
- [ ] ETAPA 5: Dashboard con métricas reales, análisis IA
- [ ] ETAPA 6: Reglas de éxito automáticas, sugerencias proactivas
- [ ] ETAPA 7: Auth, analytics, landing optimizada, beta testers

---

## ANEXO: ARCHIVOS ESPECÍFICOS A MODIFICAR/CREAR POR ETAPA

### ETAPA 0
| Archivo | Acción | Descripción |
|---|---|---|
| `docs/DEPLOY.md` | MODIFICAR | Eliminar credenciales FTP |
| `index.html` | MODIFICAR | Agregar CSP meta tag |
| `.env` | VERIFICAR | Confirmar que no está tracked en git |

### ETAPA 1
| Archivo | Acción | Descripción |
|---|---|---|
| `supabase/functions/ai-gateway/index.ts` | MODIFICAR | Mejoras pre-deploy |
| `supabase/functions/orchestrator/index.ts` | MODIFICAR | Fix callAI() routing |
| `supabase/functions/vault-process/index.ts` | MODIFICAR | Mejoras error handling |
| `scripts/health-check.sh` | MODIFICAR | Agregar más verificaciones |
| `scripts/deploy.sh` | MODIFICAR | Agregar health check post-deploy |
| SQL (en SQL Editor) | EJECUTAR | Crear índices |

### ETAPA 2
| Archivo | Acción | Descripción |
|---|---|---|
| `supabase/functions/orchestrator/index.ts` | MODIFICAR | Fix callAI() para multi-proveedor |
| `supabase/functions/ai-gateway/index.ts` | MODIFICAR | Retry + backoff |
| `supabase/functions/vault-process/index.ts` | MODIFICAR | Validación + logging |
| `src/pages/Configuracion.tsx` | MODIFICAR | Conectar a agent_config DB |
| `src/components/ErrorBoundary.tsx` | NUEVO | Error boundary global |
| `src/App.tsx` | MODIFICAR | Envolver rutas con ErrorBoundary |
| `src/test/integration/vault.test.ts` | NUEVO | Tests integración Bóveda |
| `src/test/integration/dialogue.test.ts` | NUEVO | Tests integración Mesa |

### ETAPA 3
| Archivo | Acción | Descripción |
|---|---|---|
| `src/components/Onboarding.tsx` | NUEVO | Wizard de 3 pasos |
| `src/components/Skeleton*.tsx` | NUEVO | Skeletons reutilizables |
| `src/pages/Boveda.tsx` | MODIFICAR | Confirmación delete + empty states |
| `src/pages/MesaDialogo.tsx` | MODIFICAR | Empty states con CTAs |
| `src/pages/Dashboard.tsx` | MODIFICAR | Empty states |
| `src/pages/Configuracion.tsx` | MODIFICAR | Tooltips explicativos |
| `src/pages/Laboratorio.tsx` | MODIFICAR | Convertir de placeholder a funcional |

### ETAPA 4
| Archivo | Acción | Descripción |
|---|---|---|
| `src/pages/Calendario.tsx` | NUEVO | Vista de calendario |
| `src/hooks/useCalendar.ts` | NUEVO | Hook para calendario |
| `src/pages/Propuestas.tsx` | NUEVO | Cola de aprobación |
| `supabase/functions/publisher/index.ts` | NUEVO | Publicador automático |
| `supabase/migrations/003_indexes.sql` | NUEVO | Índices adicionales |

### ETAPA 5
| Archivo | Acción | Descripción |
|---|---|---|
| `supabase/functions/metrics-collector/index.ts` | NUEVO | Recolector de métricas |
| `src/pages/Dashboard.tsx` | MODIFICAR | Gráficos con datos reales |
| `src/pages/Analisis.tsx` | NUEVO | Análisis IA de rendimiento |

### ETAPA 6
| Archivo | Acción | Descripción |
|---|---|---|
| `supabase/functions/rule-engine/index.ts` | NUEVO | Motor de reglas de éxito |
| `src/pages/Insights.tsx` | NUEVO | Sugerencias proactivas |

### ETAPA 7
| Archivo | Acción | Descripción |
|---|---|---|
| `src/components/auth/` | NUEVO | Componentes de autenticación |
| `src/App.tsx` | MODIFICAR | Rutas protegidas |
| `docs/DESIGN-SYSTEM.md` | NUEVO | Documentación design system |
| `docs/PRIVACY-POLICY.md` | NUEVO | Política de privacidad |
| `docs/TERMS-OF-SERVICE.md` | NUEVO | Términos de uso |

---

*Documento generado el 29/04/2026 — MejoraSM v4.0*
*Basado en análisis completo del codebase y documento ANALISIS-PROFUNDO.md*
