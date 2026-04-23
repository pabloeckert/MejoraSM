# 📚 DOCUMENTACIÓN UNIFICADA — MejoraSocialMedia (EDA)

**Proyecto:** MejoraSocialMedia — Estrategia Digital Autónoma para MejoraOK
**Versión:** 2.0
**Última actualización:** 23 de abril de 2026
**Repositorio:** https://github.com/pabloeckert/MejoraSM
**Producción:** https://util.mejoraok.com/MejoraSM/
**Stack:** React + Supabase (Edge Functions + PostgreSQL + pgvector) + Chrome Extension

---

> **📌 INSTRUCCIÓN DE MANTENIMIENTO:**
> Cuando el usuario diga **"documentar"**, actualizar este archivo con los trabajos realizados desde la última actualización, agregando entradas al [Registro de Avances](#17-registro-de-avances) y ajustando el [Estado Actual](#4-estado-actual) según corresponda.

---

## 📌 ÍNDICE

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Estado Actual](#4-estado-actual)
5. [Arquitectura Técnica](#5-arquitectura-técnica)
6. [Base de Datos](#6-base-de-datos)
7. [Edge Functions (Backend)](#7-edge-functions-backend)
8. [Frontend (React)](#8-frontend-react)
9. [Extensión Chrome](#9-extensión-chrome)
10. [Proveedores de IA](#10-proveedores-de-ia)
11. [Deployment](#11-deployment)
12. [Buyer Personas](#12-buyer-personas)
13. [Plan por Etapas](#13-plan-por-etapas)
14. [Pendientes y Bloqueadores](#14-pendientes-y-bloqueadores)
15. [Decisiones Técnicas](#15-decisiones-técnicas)
16. [Costos](#16-costos)
17. [Registro de Avances](#17-registro-de-avances)

---

## 1. VISIÓN GENERAL

**Objetivo:** Sistema completo de gestión estratégica de contenidos en Instagram mediante múltiples agentes de IA. Procesa la identidad de marca, debate estrategias y ejecuta publicaciones automáticas aprendiendo de los resultados.

**Para:** MejoraOK / Mejora Continua — servicios de claridad estratégica para emprendedores, líderes y profesionales argentinos.

**Dos vertientes:**
1. **Extensión Chrome (MejoraINSSIST)** — herramienta de asistencia directa en Instagram (v1.1.0 ✅)
2. **Sistema EDA** — backend multi-agente con dashboard web (código listo, deploy pendiente)

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología | Estado |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | ✅ Lovable |
| UI | shadcn/ui + Tailwind CSS | ✅ |
| Backend | Supabase Edge Functions (Deno) | ✅ Código listo |
| Base de datos | Supabase PostgreSQL + pgvector | ✅ Migración SQL lista |
| Storage | Supabase Storage | ✅ Configurado |
| IA Principal | Groq (Llama 4 Scout 8B) | 🔲 Falta API key |
| IA Análisis | DeepSeek V3.2 | 🔲 Falta API key |
| IA Backup | Google Gemini 1.5 Flash | 🔲 Falta API key |
| Embeddings | HuggingFace (all-MiniLM-L6-v2) | 🔲 Falta API key |
| Extensión | Chrome Extension Manifest V2 | ⚠️ MV2 deprecado |
| Deploy | GitHub Actions → FTP (Hostinger) | ✅ Automático |
| Auth | Supabase Auth (opcional) | 🔲 Futuro |

**Costo total estimado: $0/mes** (todo en free tier)

---

## 3. ESTRUCTURA DEL PROYECTO

```
mejorasocialmedia/
├── src/                          ← Frontend React (Lovable)
│   ├── pages/
│   │   ├── Dashboard.tsx         ← KPIs principales
│   │   ├── Boveda.tsx            ← Bóveda de Conocimiento
│   │   ├── MesaDialogo.tsx       ← Mesa de Diálogo multi-agente
│   │   ├── Laboratorio.tsx       ← Laboratorio de Contenido
│   │   ├── Configuracion.tsx     ← Configuración de agentes
│   │   ├── Index.tsx             ← Landing
│   │   └── NotFound.tsx          ← 404
│   ├── services/
│   │   ├── ai.ts                 ← Cliente Edge Functions
│   │   └── supabase.ts           ← CRUD completo
│   ├── components/
│   │   ├── layout/               ← AppLayout, AppSidebar
│   │   └── ui/                   ← shadcn components (50+)
│   └── hooks/                    ← use-mobile, use-toast
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql ← 9 tablas + RLS + vector search
│   └── functions/
│       ├── ai-gateway/           ← Router universal de IA
│       ├── orchestrator/         ← Mesa de Diálogo multi-agente
│       └── vault-process/        ← Bóveda RAG
├── extension/                    ← Extensión Chrome MejoraINSSIST
│   ├── app/                      ← Scripts (bg.js, ig-cs.js, mejora-injector.js)
│   ├── data/                     ← Buyer personas, hashtags, replies
│   ├── manifest.json             ← Manifest V2
│   └── landing/                  ← Landing page
├── docs/                         ← Documentación legacy (14 archivos)
├── Documents/                    ← Documentación unificada (este archivo)
├── .github/workflows/deploy.yml  ← CI/CD automático
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

---

## 4. ESTADO ACTUAL

### ✅ FASE 1: Extensión Chrome — COMPLETADA (v1.1.0)

| Componente | Estado | Descripción |
|---|---|---|
| Botón flotante 🎯 | ✅ | Aparece en todas las páginas de Instagram |
| Caption Helper | ✅ | Detecta buyer persona, sugiere hooks/CTA/tags |
| Hashtag Packs | ✅ | 6 packs × 3 niveles (low/medium/high) |
| Quick Replies | ✅ | 24 respuestas de ventas por DM |
| Auto-detección DM | ✅ | Al escribir `/` abre panel de replies |
| 8 Buyer Personas | ✅ | Perfiles psicográficos argentinos |
| Core INSSIST | ✅ | Post Later, Dark/Wide/Zen, multi-cuenta |
| Landing page | ✅ | En subdominio |

### ✅ FASE 2: Backend EDA — CÓDIGO LISTO (sin deploy)

| Componente | Estado | Descripción |
|---|---|---|
| Schema SQL | ✅ | 9 tablas con pgvector + RLS + función de búsqueda |
| ai-gateway | ✅ | Router Groq/DeepSeek/Gemini/HF con fallback |
| orchestrator | ✅ | Mesa de Diálogo multi-agente (3 agentes) |
| vault-process | ✅ | Procesa docs → chunks → embeddings → RAG |
| Service layer | ✅ | Cliente API + CRUD completo (frontend) |
| Deploy infra | ✅ | GitHub Actions → FTP automático |

### 🔲 FASES 3-6: PENDIENTES

| Fase | Descripción | Estado |
|---|---|---|
| Fase 3 | Publicador y Calendario | 🔲 Pendiente |
| Fase 4 | Monitor de KPIs | 🔲 Pendiente |
| Fase 5 | Dashboard Conectado (UI lista, falta backend) | 🔲 En curso |
| Fase 6 | Bucle de Aprendizaje | 🔲 Pendiente |

---

## 5. ARQUITECTURA TÉCNICA

```
┌──────────────────────────────────────────────────────────────┐
│                    CAPA 1: FRONTEND                          │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Dashboard │ │  Bóveda  │ │  Mesa de │ │Laboratorio│       │
│  │  (KPIs)  │ │   (Docs) │ │ Diálogo  │ │(Contenido)│       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       └─────────────┴────────────┴─────────────┘             │
│                         │ fetch() / supabase-js              │
└─────────────────────────┼────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                    CAPA 2: SUPABASE                          │
│                                                              │
│  Edge Functions (Deno serverless)                            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │  ai-gateway    │  │  orchestrator  │  │  vault-process ││
│  │  (Router IA)   │  │  (Multi-agente)│  │  (RAG)         ││
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘│
│          └───────────────────┼───────────────────┘          │
│                                                              │
│  PostgreSQL + pgvector + Storage                             │
│  ┌──────────────────────────────────────────────┐           │
│  │ documents │ chunks │ proposals │ metrics │ … │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                    CAPA 3: PROVEEDORES IA                    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Groq    │  │ DeepSeek │  │  Gemini  │  │    HF    │   │
│  │Estratega │  │ Crítico  │  │  Backup  │  │Embeddings│   │
│  │Creativo  │  │ Análisis │  │ MultiMod │  │   RAG    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    CAPA 4: EXTENSIÓN CHROME                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Caption       │  │ Hashtag      │  │ Quick        │      │
│  │ Helper        │  │ Packs        │  │ Replies      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│              mejora-injector.js (botón flotante + panel)     │
└──────────────────────────────────────────────────────────────┘
```

### Flujo de Generación de Contenido

```
1. Usuario propone tema → Frontend
2. Frontend → POST /orchestrator { action: "start", topic }
3. orchestrator invoca ai-gateway:
   a. Estratega (Groq) → propone ángulo + hooks + buyer persona
   b. Creativo (Groq) → redacta copy + CTA + hashtags
   c. Crítico (DeepSeek) → evalúa contra documentos RAG
4. Si aprobado → crea proposal + retorna al frontend
5. Frontend muestra propuesta → usuario aprueba/rechaza/edita
6. Si aprobado → se agenda en calendario
7. Publicador (futuro) → publica en Instagram
8. Monitor (futuro) → trackea métricas → genera reglas
```

---

## 6. BASE DE DATOS

### Tablas Principales

| Tabla | Propósito | Relaciones |
|---|---|---|
| `documents` | PDFs/Docs de la marca | → doc_chunks |
| `doc_chunks` | Fragmentos con embeddings | ← documents |
| `agent_config` | Config de los 3 agentes | standalone |
| `dialogue_sessions` | Sesiones de debate | → dialogue_messages, proposals |
| `dialogue_messages` | Mensajes del debate | ← dialogue_sessions |
| `proposals` | Contenido generado | ← dialogue_sessions, → metrics |
| `calendar_events` | Calendario editorial | ← proposals |
| `metrics` | KPIs de Instagram | ← proposals |
| `success_rules` | Reglas aprendidas | standalone |

### Storage

| Bucket | Contenido | Acceso |
|---|---|---|
| `vault` | Documentos subidos (PDFs, Docs) | Privado |

### Funciones SQL

| Función | Uso |
|---|---|
| `match_documents(embedding, count, threshold)` | Búsqueda vectorial para RAG |

---

## 7. EDGE FUNCTIONS (BACKEND)

### 7.1 ai-gateway

**Endpoint:** `/functions/v1/ai-gateway` | **Método:** POST

```json
// Chat completion
{ "provider": "groq|deepseek|gemini", "model": "llama-4-scout-8b-instruct",
  "messages": [{"role": "user", "content": "..."}], "system": "prompt", "temperature": 0.7 }

// Embeddings
{ "action": "embed", "texts": ["texto 1", "texto 2"] }
```

**Features:** Router multi-proveedor, fallback automático (Groq → Gemini → DeepSeek), rate limit handling.

### 7.2 orchestrator

**Endpoint:** `/functions/v1/orchestrator` | **Método:** POST

```json
// Iniciar sesión
{ "action": "start", "topic": "Cómo delegar sin perder control" }

// Continuar sesión
{ "action": "continue", "sessionId": "uuid", "feedback": "El hook no conecta" }
```

**Flujo:** Crea sesión → busca contexto (RAG) → Estratega → Creativo → Crítico → propuesta estructurada.

### 7.3 vault-process

**Endpoint:** `/functions/v1/vault-process` | **Método:** POST

```json
// Procesar documento
{ "action": "process", "documentId": "uuid" }

// Buscar (RAG)
{ "action": "search", "query": "tono de voz para emprendedores", "limit": 5 }
```

**Pipeline:** Descarga → extrae texto → chunking (~500 tokens, overlap 50) → embeddings (HF) → guarda en DB.

---

## 8. FRONTEND (REACT)

### Páginas

| Ruta | Página | Estado | Función |
|---|---|---|---|
| `/` | Dashboard | ✅ UI | KPIs principales |
| `/boveda` | Bóveda | ✅ UI | Upload + list docs |
| `/mesa` | Mesa de Diálogo | ✅ UI | Sesiones multi-agente |
| `/laboratorio` | Laboratorio | ✅ UI | Generador de contenido |
| `/configuracion` | Configuración | ✅ UI | Config de agentes |

### Services

| Archivo | Función |
|---|---|
| `src/services/ai.ts` | callAI, generateEmbeddings, startDialogue, continueDialogue, searchVault |
| `src/services/supabase.ts` | documentsApi, dialogueApi, proposalsApi, calendarApi, metricsApi |

### Pendiente (Hooks)

| Hook | Función |
|---|---|
| `useVault.ts` | Upload + list + process + search docs |
| `useDialogue.ts` | Start + continue + list sessions |
| `useProposals.ts` | List + approve + reject + schedule |
| `useMetrics.ts` | KPIs + success rules |

---

## 9. EXTENSIÓN CHROME

### Componentes

| Componente | Archivo | Descripción |
|---|---|---|
| Botón flotante | `mejora-injector.js` | FAB 🎯 + panel 3 tabs |
| Caption Helper | `mejora-injector.js` | Detecta persona, sugiere hooks |
| Hashtag Packs | `data/hashtags-db.js` | 6 packs × 3 niveles |
| Quick Replies | `data/sales-replies.js` | 24 respuestas DM |
| Buyer Personas | `data/buyer-personas.js` | 8 perfiles argentinos |
| Core INSSIST | `bg.js`, `ig-cs.js` | Funcionalidad base |

### ⚠️ Bloqueador: Manifest V2

Chrome elimina soporte para MV2. Necesita migrar a V3.

---

## 10. PROVEEDORES DE IA

| Proveedor | Modelo | Uso | Free Tier | API Key |
|---|---|---|---|---|
| Groq | Llama 4 Scout 8B | Estratega + Creativo | 30 req/min | 🔲 Pendiente |
| DeepSeek | V3.2 | Crítico + Análisis | Free tier | 🔲 Pendiente |
| Gemini | 1.5 Flash | Backup + Multimodal | 60 req/min | 🔲 Pendiente |
| HF | all-MiniLM-L6-v2 | Embeddings | Rate limit | 🔲 Pendiente |

### Configuración por defecto

```
Estratega:  Groq / llama-4-scout-8b-instruct / temp 0.8
Creativo:   Groq / llama-4-scout-8b-instruct / temp 0.9
Crítico:    DeepSeek / deepseek-chat / temp 0.3
```

---

## 11. DEPLOYMENT

### Frontend (automático)

- **CI/CD:** GitHub Actions → FTP a Hostinger en cada push a `main`
- **Workflow:** `.github/workflows/deploy.yml`
- **Producción:** https://util.mejoraok.com/MejoraSM/
- **Build:** `npm install --legacy-peer-deps && npm run build`

### Backend (manual — pendiente)

```bash
supabase functions deploy ai-gateway
supabase functions deploy orchestrator
supabase functions deploy vault-process
supabase secrets set GROQ_API_KEY=xxx
supabase secrets set DEEPSEEK_API_KEY=xxx
supabase secrets set GEMINI_API_KEY=xxx
supabase secrets set HF_API_KEY=xxx
```

### Base de datos (manual — pendiente)

Ejecutar `supabase/migrations/001_initial_schema.sql` en Supabase SQL Editor.

---

## 12. BUYER PERSONAS

| # | Perfil | Emoji | Dolor | Deseo |
|---|---|---|---|---|
| 1 | El Emprendedor Saturado | 🤯 | No sabe priorizar, apaga incendios | Claridad mental, control |
| 2 | La Líder que Necesita Validación | 👑 | Síndrome del impostor | Confianza, criterio externo |
| 3 | El Profesional Independiente | 📈 | Bueno pero invisible | Posicionamiento, marca personal |
| 4 | El Equipo Desalineado | 🔀 | Cada uno hace lo suyo | Alineación, roles claros |
| 5 | El Empresario Mal Asesorado | 🔍 | Rodeado de humo | Verdad, buen asesoramiento |
| 6 | La Nueva Generación | 🌱 | No lo valoran | Crecimiento, reconocimiento |
| 7 | El Vendedor sin Resultados | 💸 | Trabaja mucho, vende poco | Conversión, proceso de ventas |
| 8 | El que Necesita Orden | ⚡ | Creció rápido, desordenado | Sistema, procesos |

---

## 13. PLAN POR ETAPAS

### ETAPA 0: Consolidación y Seguridad ✅ (23/04/2026)
- [x] Consolidar documentación en `Documents/DOCUMENTACION.md`
- [x] Analizar estado real vs documentado
- [x] Crear plan por etapas

### ETAPA 1: Activar Backend (requiere Pablo)
**Dependencia:** Acceso a Supabase dashboard
**Tiempo estimado:** 1-2 horas

| # | Tarea | Responsable | Notas |
|---|---|---|---|
| 1.1 | Ejecutar SQL schema en Supabase | Pablo | Copiar `001_initial_schema.sql` en SQL Editor |
| 1.2 | Crear bucket `vault` en Storage | Pablo | Privado |
| 1.3 | Configurar API keys en Secrets | Pablo | Groq, DeepSeek, Gemini, HF |
| 1.4 | Deploy Edge Functions | Pablo/AI | `supabase functions deploy` |
| 1.5 | Verificar health check | Pablo/AI | Probar endpoints |

### ETAPA 2: Conectar Frontend
**Dependencia:** ETAPA 1 completa
**Tiempo estimado:** 2-3 horas

| # | Tarea | Notas |
|---|---|---|
| 2.1 | Crear hooks React (useVault, useDialogue, etc.) | Conectar UI a backend real |
| 2.2 | Probar Mesa de Diálogo end-to-end | Tema → debate → propuesta |
| 2.3 | Probar Bóveda de Conocimiento | Subir doc → procesar → buscar |
| 2.4 | Dashboard con datos reales | COUNT desde Supabase |
| 2.5 | Manejo de errores y loading states | UX robusta |

### ETAPA 3: Publicador y Calendario
**Dependencia:** ETAPA 2 completa
**Tiempo estimado:** 3-4 horas

| # | Tarea | Notas |
|---|---|---|
| 3.1 | CRUD de calendario editorial | Supabase directo |
| 3.2 | Cron job de publicación | Edge Function scheduled |
| 3.3 | Instagram Graph API | Requiere credenciales Meta |
| 3.4 | Sistema de aprobación previa | Cola → approve/reject |

### ETAPA 4: Monitor de KPIs
**Dependencia:** ETAPA 3 completa
**Tiempo estimado:** 2-3 horas

| # | Tarea | Notas |
|---|---|---|
| 4.1 | Instagram Insights API | Requiere Business Account |
| 4.2 | Recolección periódica de métricas | Cron → metrics table |
| 4.3 | Análisis con DeepSeek | Detección de patrones |
| 4.4 | Dashboard de KPIs real | Gráficos con datos reales |

### ETAPA 5: Bucle de Aprendizaje
**Dependencia:** ETAPA 4 completa
**Tiempo estimado:** 3-4 horas

| # | Tarea | Notas |
|---|---|---|
| 5.1 | Tracking de métricas por post | Correlación contenido → rendimiento |
| 5.2 | Reglas de éxito automáticas | success_rules table |
| 5.3 | Sugerencias proactivas | "Los posts con emoji en hook rinden 2x" |

### ETAPA 6: Limpieza Técnica (paralela)
**Sin dependencia, puede hacerse en cualquier momento**

| # | Tarea | Notas |
|---|---|---|
| 6.1 | Migrar extensión a Manifest V3 | Urgente: Chrome eliminará V2 |
| 6.2 | Activar `strictNullChecks` | Mejora calidad de tipos |
| 6.3 | Agregar tests reales (Vitest) | Configurado pero vacío |
| 6.4 | Limpiar archivos legacy de extensión | caption-helper.js, etc. |
| 6.5 | Quitar lovable-tagger de dependencias | Innecesario en producción |
| 6.6 | Actualizar browserslist | 10 meses desactualizado |

### Timeline Consolidado

```
ETAPA 0  → ✅ Hoy (23/04)
ETAPA 1  → Cuando Pablo tenga 1-2h disponibles
ETAPA 2  → Inmediatamente después de ETAPA 1
ETAPA 3  → Semana siguiente
ETAPA 4  → +1 semana
ETAPA 5  → +1 semana
ETAPA 6  → En paralelo, cuando haya tiempo
Total:   → ~4-5 semanas desde ETAPA 1
```

---

## 14. PENDIENTES Y BLOQUEADORES

### 🔴 Bloqueadores Activos

| ID | Descripción | Estado | Acción |
|---|---|---|---|
| B1 | API keys no configuradas en Supabase | ⏳ Pablo | ETAPA 1.3 |
| B2 | SQL schema no ejecutado | ⏳ Pablo | ETAPA 1.1 |
| B3 | Edge Functions no deployadas | ⏳ Pablo | ETAPA 1.4 |
| B4 | Manifest V2 deprecado | ⏳ Dev | ETAPA 6.1 |

### 🟡 Pendientes Alta Prioridad

- Conectar frontend a backend real (hooks React)
- Probar end-to-end Mesa de Diálogo
- Probar end-to-end Bóveda

### 🟢 Pendientes Baja Prioridad

- Dark/light theme en extensión
- Fuzzy matching en buyer persona
- Analytics de uso de la extensión
- Tests reales con Vitest

---

## 15. DECISIONES TÉCNICAS

| Decisión | Elección | Razón |
|---|---|---|
| Backend | Supabase Edge Functions | Gratis, integrado, sin servidor |
| Framework | React (Lovable) | Ya existía, ecosistema grande |
| IA principal | Groq (Llama 4 Scout 8B) | Rápido, free tier generoso |
| IA análisis | DeepSeek V3.2 | Bueno en lógica |
| Embeddings | HF Sentence Transformers | Gratis |
| DB | PostgreSQL + pgvector | RAG nativo en Supabase |
| Auth | Sin auth (personal) | Simplifica MVP |
| Deploy frontend | GitHub Actions → FTP | Automático en push |

---

## 16. COSTOS

| Servicio | Free Tier | Uso estimado | Costo |
|---|---|---|---|
| Supabase | 500K func, 500MB DB, 1GB storage | Bajo | $0 |
| Groq | 30 req/min | ~100 req/día | $0 |
| DeepSeek | Free tier | ~30 req/día | $0 |
| Gemini | 60 req/min, 1M tokens/min | Backup | $0 |
| HF Embeddings | Rate limit generoso | ~20 req/día | $0 |
| Lovable | Incluido | Continuo | $0 |
| Hostinger | Plan existente | Landing | Ya pagado |
| **Total** | | | **$0/mes** |

---

## 17. REGISTRO DE AVANCES

### 22/04/2026 — Día 1 (Sesión principal)

- ✅ Análisis completo del repo INSSIST original
- ✅ Extensión Chrome v1.1.0 funcional (botón flotante, caption helper, hashtag packs, quick replies)
- ✅ Schema SQL completo (9 tablas + pgvector + RLS)
- ✅ Edge Functions: ai-gateway, orchestrator, vault-process
- ✅ Service layer frontend (ai.ts + supabase.ts)
- ✅ Deploy automático configurado (GitHub Actions → FTP)
- ✅ 3 bloqueadores resueltos (FTP, npm ci, secret scanning)
- ✅ Documentación generada (14 archivos en docs/)

### 23/04/2026 — Consolidación

- ✅ Análisis de estado real vs documentación
- ✅ Documentación unificada en `Documents/DOCUMENTACION.md`
- ✅ Plan por etapas (ETAPA 0-6) con dependencias y estimaciones
- ✅ Identificación de 4 bloqueadores activos (todos requieren acceso a Supabase)

---

*Última actualización: 23/04/2026 — Este documento reemplaza toda la documentación previa en `docs/`.*
*Cuando el usuario diga "documentar", actualizar este archivo con los trabajos realizados.*
