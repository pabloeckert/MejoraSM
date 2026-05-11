# 🧠 CTO CONTEXT — Session Handoff Document

**Última actualización:** 2026-05-12
**Objetivo:** Este documento permite que cualquier sesión de IA continúe exactamente donde quedó. Leerlo al inicio de cada sesión.

---

## ⚡ Quick Start para la próxima sesión

Cuando Pablo diga **"continuemos"**, hacer esto:

1. Leer este archivo (`Documents/CTO-CONTEXT.md`)
2. Leer `Documents/DOCUMENTACION.md` (estado general)
3. Revisar `git log --oneline -20` para ver últimos commits
4. Preguntar a Pablo: "¿En qué seguimos? ¿Algo específico o sigo con lo pendiente?"

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
- **Deploy:** GitHub Actions → Hostinger (FTP)

---

## 📊 Estado Actual (Mayo 2026)

### ✅ Lo que FUNCIONA
- Frontend React completo (7 páginas: Dashboard, Bóveda, Mesa de Diálogo, Laboratorio, Configuración, Calendario, Propuestas)
- UI con shadcn/ui + Tailwind (profesional, responsive)
- 50+ componentes UI
- Schema PostgreSQL ejecutado (9 tablas + pgvector + RLS)
- Edge Functions escritas (ai-gateway, orchestrator, vault-process, publisher, rule-engine, metrics-collector)
- Extensión Chrome MejoraINSSIST v1.1.0 (Manifest V3, i18n es/en/pt_BR)
- CI con GitHub Actions (lint + test + build)
- 21 tests con Vitest
- ErrorBoundary y Onboarding implementados

### 🔴 BLOQUEADORES ACTIVOS
1. **PostgREST no reconoce tablas** — Necesita Pause/Resume en Supabase Dashboard
2. **API keys no configuradas** — Groq, DeepSeek, HuggingFace sin keys
3. **Edge Functions no deployadas** — Requiere `bash scripts/deploy.sh`

### 🟠 Deuda Técnica Conocida
- `.env` con credenciales reales commiteado (S1 - CRÍTICO)
- RLS con políticas "Allow all" sin autenticación
- `getContextDocs()` no hace búsqueda vectorial real
- Deploy vía FTP (débil, sin staging)
- Sin monitoreo ni alertas
- Sin política de privacidad
- Tests solo frontend, sin E2E

---

## 🏗️ Arquitectura

```
Frontend (React + Vite)
  ↓ llama a
Edge Functions (Supabase/Deno)
  ↓ usa
PostgreSQL + pgvector (Supabase)
  ↓ consulta
IA Providers (Groq, DeepSeek, Gemini, HuggingFace)
```

### Flujo de Contenido
```
Usuario propone tema → Frontend
  → orchestrator invoca 3 agentes (Estratega → Creativo → Crítico)
  → Propuesta estructurada (hook/body/cta/hashtags)
  → Usuario aprueba → Calendario → Publicación automática
  → Monitor KPIs → Bucle de aprendizaje → Mejora continua
```

### 3 Agentes de IA
| Agente | Provider | Modelo | Rol |
|---|---|---|---|
| Estratega | Groq | llama-4-scout-8b | Propone temas y estrategias |
| Creativo | Groq | llama-4-scout-8b | Redacta copys, hooks, CTAs |
| Crítico | DeepSeek | deepseek-chat | Evalúa calidad contra marca |

### Páginas del Frontend
| Ruta | Componente | Función |
|---|---|---|
| `/` | Dashboard | KPIs principales |
| `/boveda` | Boveda | Bóveda de Conocimiento (RAG) |
| `/mesa` | MesaDialogo | Mesa de Diálogo multi-agente |
| `/laboratorio` | Laboratorio | Laboratorio de Contenido |
| `/configuracion` | Configuracion | Config de agentes |
| `/calendario` | Calendario | Calendario editorial |
| `/propuestas` | Propuestas | Gestión de propuestas |

### Tablas PostgreSQL
- `documents` — Documentos de la bóveda
- `doc_chunks` — Chunks con embeddings vector(384)
- `agent_config` — Configuración de agentes
- `dialogue_sessions` — Sesiones de diálogo
- `dialogue_messages` — Mensajes de agentes
- `proposals` — Propuestas de contenido
- `calendar_events` — Calendario editorial
- `metrics` — Métricas de Instagram
- `success_rules` — Reglas aprendidas

### Hooks React
- `useVault` — Upload, list, process, search documentos
- `useDialogue` — Sesiones, mensajes, start, continue
- `useProposals` — List, pending, approve, reject, schedule
- `useMetrics` — Calendario, métricas, reglas de éxito

---

## 📁 Estructura del Repo

```
MejoraSM/
├── src/                    ← Frontend React
│   ├── pages/              ← 7 páginas
│   ├── services/           ← ai.ts (Edge Functions), supabase.ts (CRUD)
│   ├── hooks/              ← 5 hooks custom
│   ├── components/
│   │   ├── layout/         ← AppLayout, AppSidebar
│   │   └── ui/             ← 50+ shadcn components
│   └── test/               ← 21 tests Vitest
├── supabase/
│   ├── functions/          ← 6 Edge Functions (Deno)
│   │   ├── ai-gateway/     ← Router universal de IA
│   │   ├── orchestrator/   ← Mesa de Diálogo multi-agente
│   │   ├── vault-process/  ← Bóveda RAG
│   │   ├── publisher/      ← Publicación automática
│   │   ├── rule-engine/    ← Motor de reglas
│   │   └── metrics-collector/ ← Recolección de KPIs
│   └── migrations/         ← SQL schema
├── extension/              ← Chrome Extension MejoraINSSIST
├── Documents/              ← Documentación unificada
├── docs/                   ← Legacy (solo lectura)
├── .github/workflows/      ← CI (lint + test + build)
└── scripts/                ← Scripts de deploy
```

---

## 🎯 Próximos Pasos Sugeridos

### Prioridad 1: Desbloquear Producción
- [ ] Resolver PostgREST (Pause/Resume Supabase)
- [ ] Configurar API keys (Groq, DeepSeek, HuggingFace)
- [ ] Deployar Edge Functions
- [ ] Verificar que la app funcione end-to-end

### Prioridad 2: Seguridad
- [ ] Rotar credenciales expuestas en `.env`
- [ ] Implementar autenticación real (no "Allow all")
- [ ] Agregar política de privacidad

### Prioridad 3: Calidad
- [ ] Tests E2E
- [ ] Staging environment
- [ ] Monitoreo y alertas
- [ ] Health checks en Edge Functions

### Prioridad 4: Features
- [ ] Publicación automática real (publisher)
- [ ] Motor de reglas activo
- [ ] Métricas reales de Instagram
- [ ] Bucle de aprendizaje completo

---

## 💡 Decisiones Técnicas Clave

1. **Supabase como backend** — Serverless, PostgreSQL nativo, Edge Functions en Deno
2. **Multi-IA** — Groq (rápido/barato), DeepSeek (análisis), Gemini (backup), HuggingFace (embeddings)
3. **Extensión Chrome separada** — Independiente del sistema EDA, asiste directo en Instagram
4. **Deploy FTP** — Simple pero débil. Considerar migrar a Vercel/Netlify
5. **pgvector para RAG** — Búsqueda semántica en documentos de marca

---

## 🔐 Variables de Entorno Necesarias

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=AI...
HUGGINGFACE_API_KEY=hf_...
```

---

## 📝 Registro de Sesiones CTO

| Fecha | Evento | Notas |
|---|---|---|
| 2026-05-12 | Primera sesión CTO | Onboarding, exploración del repo, creación de documentación |

---

**Este documento es la fuente de verdad para la continuidad de sesión. Actualizarlo después de cada sesión significativa.**
