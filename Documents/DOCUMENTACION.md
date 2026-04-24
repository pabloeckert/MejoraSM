# 📚 DOCUMENTACIÓN UNIFICADA — MejoraSM (EDA)

**Proyecto:** MejoraSocialMedia — Estrategia Digital Autónoma para MejoraOK
**Versión:** 3.0
**Última actualización:** 24 de abril de 2026
**Repositorio:** https://github.com/pabloeckert/MejoraSM
**Producción:** https://util.mejoraok.com/MejoraSM/
**Stack:** React + Supabase (Edge Functions + PostgreSQL + pgvector) + Chrome Extension

---

> **📌 INSTRUCCIÓN DE MANTENIMIENTO:**
> Cuando el usuario diga **"documentar"**, actualizar este archivo con los trabajos realizados desde la última actualización:
> 1. Agregar entradas al [Registro de Avances](#14-registro-de-avances) con fecha y detalle.
> 2. Actualizar el [Estado Actual](#4-estado-actual) según corresponda.
> 3. Mover tareas completadas de [Plan por Etapas](#10-plan-por-etapas) a ✅.
> 4. Ajustar [Pendientes y Bloqueadores](#11-pendientes-y-bloqueadores) si cambiaron.
> 5. Si corresponde, actualizar la sección de [Arquitectura](#5-arquitectura-técnica) o [Stack](#2-stack-tecnológico).
> 6. Hacer commit y push al repo.
>
> **Este es el documento fuente único. No editar archivos en `docs/` (legacy, solo lectura).**

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
10. [Plan por Etapas](#10-plan-por-etapas)
11. [Pendientes y Bloqueadores](#11-pendientes-y-bloqueadores)
12. [Proveedores de IA](#12-proveedores-de-ia)
13. [Deployment](#13-deployment)
14. [Registro de Avances](#14-registro-de-avances)
15. [Decisiones Técnicas](#15-decisiones-técnicas)
16. [Costos](#16-costos)
17. [Buyer Personas](#17-buyer-personas)

---

## 1. VISIÓN GENERAL

**Objetivo:** Sistema completo de gestión estratégica de contenidos en Instagram mediante múltiples agentes de IA. Procesa la identidad de marca, debate estrategias y ejecuta publicaciones automáticas aprendiendo de los resultados.

**Para:** MejoraOK / Mejora Continua — servicios de claridad estratégica para emprendedores, líderes y profesionales argentinos.

**Dos vertientes:**
1. **Extensión Chrome (MejoraINSSIST)** — herramienta de asistencia directa en Instagram (v1.1.0 ✅)
2. **Sistema EDA** — backend multi-agente con dashboard web (código listo, deploy pendiente)

### Flujo de Alto Nivel

```
Usuario propone tema → Frontend
  → orchestrator invoca 3 agentes (Estratega → Creativo → Crítico)
  → Propuesta estructurada (hook/body/cta/hashtags)
  → Usuario aprueba → Calendario → Publicación automática
  → Monitor KPIs → Bucle de aprendizaje → Mejora continua
```

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología | Estado |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | ✅ |
| UI | shadcn/ui + Tailwind CSS | ✅ |
| Backend | Supabase Edge Functions (Deno) | ✅ Código listo |
| Base de datos | Supabase PostgreSQL + pgvector | ✅ Schema ejecutado |
| Storage | Supabase Storage (bucket `vault`) | ✅ Configurado |
| IA Principal | Groq (Llama 4 Scout 8B) | 🔲 Falta API key |
| IA Análisis | DeepSeek V3.2 | 🔲 Falta API key |
| IA Backup | Google Gemini 1.5 Flash | 🔲 Falta API key |
| Embeddings | HuggingFace (all-MiniLM-L6-v2) | 🔲 Falta API key |
| Extensión | Chrome Extension Manifest V3 | ✅ Migrada |
| Deploy | GitHub Actions → FTP (Hostinger) | ✅ Automático |
| Tests | Vitest (21 tests) | ✅ |
| CI/CD | GitHub Actions | ✅ |

**Costo total estimado: $0/mes** (todo en free tier)

---

## 3. ESTRUCTURA DEL PROYECTO

```
mejorasocialmedia/
├── src/                          ← Frontend React
│   ├── pages/
│   │   ├── Dashboard.tsx         ← KPIs principales
│   │   ├── Boveda.tsx            ← Bóveda de Conocimiento
│   │   ├── MesaDialogo.tsx       ← Mesa de Diálogo multi-agente
│   │   ├── Laboratorio.tsx       ← Laboratorio de Contenido
│   │   ├── Configuracion.tsx     ← Configuración de agentes
│   │   ├── Index.tsx             ← Landing (redirect → Dashboard)
│   │   └── NotFound.tsx          ← 404
│   ├── services/
│   │   ├── ai.ts                 ← Cliente Edge Functions
│   │   └── supabase.ts           ← CRUD completo
│   ├── hooks/
│   │   ├── useVault.ts           ← Upload + list + process + search docs
│   │   ├── useDialogue.ts        ← Sesiones, mensajes, start, continue
│   │   ├── useProposals.ts       ← List, pending, approve, reject, schedule
│   │   ├── useMetrics.ts         ← Calendario, métricas, reglas de éxito
│   │   ├── use-mobile.tsx        ← Detección de dispositivo
│   │   └── use-toast.ts          ← Notificaciones
│   ├── components/
│   │   ├── layout/               ← AppLayout, AppSidebar
│   │   └── ui/                   ← shadcn components (50+)
│   ├── test/                     ← Tests Vitest (21 tests)
│   └── lib/utils.ts
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
│   ├── img/                      ← Assets visuales
│   ├── js/                       ← Librerías externas
│   ├── landing/                  ← Landing page
│   ├── manifest.json             ← Manifest V3
│   └── _locales/                 ← i18n (es/en/pt_BR)
├── Documents/                    ← 📚 DOCUMENTACIÓN UNIFICADA (este archivo)
├── docs/                         ← ⚠️ LEGACY — solo lectura, no editar
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
| Manifest V3 | ✅ | Migrada (23/04/2026) |
| Landing page | ✅ | En subdominio |

### ✅ FASE 2: Backend EDA — CÓDIGO LISTO (sin deploy)

| Componente | Estado | Descripción |
|---|---|---|
| Schema SQL | ✅ | 9 tablas con pgvector + RLS + función de búsqueda |
| ai-gateway | ✅ | Router Groq/DeepSeek/Gemini/HF con fallback |
| orchestrator | ✅ | Mesa de Diálogo multi-agente (3 agentes) |
| vault-process | ✅ | Procesa docs → chunks → embeddings → RAG |
| Service layer | ✅ | Cliente API + CRUD completo (frontend) |
| Hooks React | ✅ | useVault, useDialogue, useProposals, useMetrics |
| Páginas conectadas | ✅ | Dashboard, Bóveda, Mesa, Configuración a datos reales |
| Tests Vitest | ✅ | 21 tests pasando |
| Deploy infra | ✅ | GitHub Actions → FTP automático |

### 🔲 ETAPAS 3-6: PENDIENTES

| Etapa | Descripción | Estado |
|---|---|---|
| ETAPA 1 | Activar Backend (secrets + deploy functions) | 🔄 En progreso |
| ETAPA 2 | Conectar y probar end-to-end | 🔲 Pendiente |
| ETAPA 3 | Publicador y Calendario | 🔲 Pendiente |
| ETAPA 4 | Monitor de KPIs | 🔲 Pendiente |
| ETAPA 5 | Bucle de Aprendizaje | 🔲 Pendiente |
| ETAPA 6 | Polish, Auth y Escala | 🔲 Pendiente |

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

### Flujo de Carga de la Extensión Chrome

```
1. Instagram carga
2. Chrome inyecta content scripts en orden:
   a. emoji-regex.min.js     (dependencia)
   b. ig-cs.js               (core INSSIST — patches, interceptors)
   c. buyer-personas.js      (window.MejoraOK.BuyerPersonas)
   d. hashtags-db.js         (window.MejoraOK.HashtagPacks)
   e. sales-replies.js       (window.MejoraOK.SalesReplies)
   f. mejora-injector.js     (inyector principal)
3. mejora-injector.js espera a que los datos estén cargados
4. Crea botón flotante 🎯 y panel oculto
5. MutationObserver vigila cambios en el DOM
```

---

## 6. BASE DE DATOS

### Tablas Principales

| Tabla | Propósito | Relaciones |
|---|---|---|
| `documents` | PDFs/Docs de la marca | → doc_chunks |
| `doc_chunks` | Fragmentos con embeddings (384 dims) | ← documents |
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

### Configuración de Agentes (pre-seeded)

| Agente | Proveedor | Modelo | Temperatura | Rol |
|---|---|---|---|---|
| Estratega | Groq | llama-4-scout-8b-instruct | 0.8 | Propone tema, ángulo, estrategia |
| Creativo | Groq | llama-4-scout-8b-instruct | 0.9 | Redacta copy, hook, CTA, hashtags |
| Crítico | DeepSeek | deepseek-chat | 0.3 | Evalúa contra docs de marca |

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
| `/` | Dashboard | ✅ UI + datos | KPIs principales, aprobaciones pendientes, calendario |
| `/boveda` | Bóveda | ✅ UI + datos | Upload, búsqueda, eliminación, estado de procesamiento |
| `/mesa` | Mesa de Diálogo | ✅ UI + datos | Crear sesión con topic, dar feedback, ver estado |
| `/laboratorio` | Laboratorio | ✅ UI | Generador de contenido |
| `/configuracion` | Configuración | ✅ UI + datos | Selectores de proveedor/modelo/temperatura por agente |

### Services

| Archivo | Función |
|---|---|
| `src/services/ai.ts` | callAI, generateEmbeddings, startDialogue, continueDialogue, searchVault |
| `src/services/supabase.ts` | documentsApi, dialogueApi, proposalsApi, calendarApi, metricsApi |

### Hooks

| Hook | Función | Estado |
|---|---|---|
| `useVault.ts` | Upload + list + process + search docs | ✅ |
| `useDialogue.ts` | Start + continue + list sessions | ✅ |
| `useProposals.ts` | List + pending + approve + reject + schedule | ✅ |
| `useMetrics.ts` | KPIs + calendario + reglas de éxito | ✅ |

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

### Manifest V3 ✅

Migrada el 23/04/2026. Cambios: `action` reemplaza `browser_action`, `service_worker` reemplaza background persistente, CSP en formato objeto, `host_permissions` separados de `permissions`. Polyfill `chrome.browserAction → chrome.action` en bg.js.

---

## 10. PLAN POR ETAPAS

### ETAPA 0: Consolidación y Documentación ✅ (23/04/2026)
- [x] Consolidar documentación en `Documents/DOCUMENTACION.md`
- [x] Analizar estado real vs documentado
- [x] Crear plan por etapas con dependencias y estimaciones
- [x] Unificar documentación dispersa en documento único (24/04)

### ETAPA 1: Activar Backend 🔄 EN PROGRESO
**Dependencia:** Acceso a Supabase dashboard
**Tiempo estimado:** 1-2 horas

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 1.1 | Ejecutar SQL schema en Supabase | ✅ (23/04 22:35) | 9 tablas + RLS + vector search |
| 1.2 | Verificar bucket `vault` en Storage | ⏳ | Debe existir (creado por schema) |
| 1.3 | Configurar API keys en Secrets | 🔲 | Groq, DeepSeek, Gemini |
| 1.4 | Deploy Edge Functions (3 funciones) | 🔲 | ai-gateway, orchestrator, vault-process |
| 1.5 | Health check completo | 🔲 | Verificar tablas + functions + storage |

**Guía de setup:** `Documents/SUPABASE_SETUP.md`

### ETAPA 2: Conectar y Probar End-to-End
**Dependencia:** ETAPA 1 completa
**Tiempo estimado:** 2-3 horas

| # | Tarea | Notas |
|---|---|---|
| 2.1 | Probar Bóveda end-to-end | Subir doc → procesar → buscar (RAG) |
| 2.2 | Probar Mesa de Diálogo end-to-end | Tema → debate multi-agente → propuesta |
| 2.3 | Probar Dashboard con datos reales | Stats dinámicos desde Supabase |
| 2.4 | Probar Configuración de agentes | Cambiar proveedor/modelo/temperatura |
| 2.5 | Manejo de errores y loading states | UX robusta ante fallos de API |
| 2.6 | Test de integración completo | Flujo completo: doc → debate → propuesta → calendario |

### ETAPA 3: Publicador y Calendario
**Dependencia:** ETAPA 2 completa
**Tiempo estimado:** 3-4 horas

| # | Tarea | Notas |
|---|---|---|
| 3.1 | CRUD de calendario editorial | Supabase directo |
| 3.2 | Cron job de publicación | Edge Function scheduled |
| 3.3 | Instagram Graph API | Requiere credenciales Meta |
| 3.4 | Sistema de aprobación previa | Cola → approve/reject |
| 3.5 | Soporte multi-formato | Imagen, carrusel, video |

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
| 5.4 | Gestor de interacciones | Likes, follows automáticos |

### ETAPA 6: Polish, Auth y Escala
**Dependencia:** ETAPA 5 completa (o paralela)
**Tiempo estimado:** 2-3 horas

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 6.1 | Migrar extensión a Manifest V3 | ✅ | Completado 23/04 |
| 6.2 | Activar `strictNullChecks` | ✅ | Completado 23/04 |
| 6.3 | Tests Vitest (21 tests) | ✅ | Completado 23/04 |
| 6.4 | Limpiar archivos legacy extensión | ✅ | Completado 23/04 |
| 6.5 | Quitar lovable-tagger | ✅ | Completado 23/04 |
| 6.6 | Actualizar browserslist | ✅ | Completado 23/04 |
| 6.7 | Auth: Login + proteger rutas | 🔲 | Supabase Auth |
| 6.8 | Dark/light theme extensión | 🔲 | Baja prioridad |
| 6.9 | Fuzzy matching buyer persona | 🔲 | Baja prioridad |
| 6.10 | Analytics de uso extensión | 🔲 | Para bucle de aprendizaje |

### Timeline Consolidado

```
ETAPA 0  → ✅ 23/04 (Consolidación)
ETAPA 1  → 🔄 En progreso (schema ✅, pendientes secrets + deploy)
ETAPA 2  → Inmediatamente después de ETAPA 1
ETAPA 3  → Semana siguiente
ETAPA 4  → +1 semana
ETAPA 5  → +1 semana
ETAPA 6  → Parcialmente ✅ (limpieza hecha, auth/temas pendientes)
Total:   → ~4-5 semanas desde ETAPA 1
```

---

## 11. PENDIENTES Y BLOQUEADORES

### 🔴 Bloqueadores Activos

| ID | Descripción | Estado | Acción |
|---|---|---|---|
| B1 | API keys no configuradas en Supabase | ⏳ Pablo | ETAPA 1.3 — Settings → Edge Functions → Secrets |
| B2 | Edge Functions no deployadas | ⏳ Pablo | ETAPA 1.4 — `supabase functions deploy` |
| B3 | Bucket `vault` sin verificar | ⏳ Pablo | ETAPA 1.2 — Storage → verificar existe |

### 🟡 Pendientes Alta Prioridad

- Conectar frontend a backend real (probar end-to-end)
- Probar Mesa de Diálogo con IA real
- Probar Bóveda con documentos reales

### 🟢 Pendientes Baja Prioridad

- Dark/light theme en extensión
- Fuzzy matching en buyer persona
- Analytics de uso de la extensión
- Auth (login/register)

### 🔮 Fases Futuras (post-MVP)

| Fase | Descripción | Dependencias |
|---|---|---|
| Generador Multiformato | IA genera carruseles, infografías | API de imágenes |
| Gestor de Interacciones | Auto-likes, auto-follows | Instagram API |
| Bucle de Aprendizaje Avanzado | Reglas automáticas, sugerencias | KPIs + métricas |

---

## 12. PROVEEDORES DE IA

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
Embeddings: HF / all-MiniLM-L6-v2 (384 dims)
```

### Prompts de los Agentes

**Estratega:** Propone tema, ángulo, objetivo y contexto del nicho. Responde con: TEMA, ÁNGULO, OBJETIVO, CONTEXTO.

**Creativo:** Redacta copy completo. Responde con: HOOK, COPY, CTA, HASHTAGS, SUGERENCIA VISUAL.

**Crítico:** Evalúa contra docs de marca. Responde con: VEREDICTO (APROBADO/REVISAR), PUNTUACIÓN (1-10 en Hook/Copy/CTA/Hashtags/Estrategia), FEEDBACK, versión corregida si REVISAR.

---

## 13. DEPLOYMENT

### Frontend (automático)

- **CI/CD:** GitHub Actions → FTP a Hostinger en cada push a `main`
- **Workflow:** `.github/workflows/deploy.yml`
- **Producción:** https://util.mejoraok.com/MejoraSM/
- **Build:** `npm install --legacy-peer-deps && npm run build`

### Backend (Supabase)

```bash
# Schema SQL — ✅ Ejecutado (23/04 22:35)
# Edge Functions — ⏳ Pendiente deploy
supabase functions deploy ai-gateway
supabase functions deploy orchestrator
supabase functions deploy vault-process

# Secrets — ⏳ Pendiente configurar
supabase secrets set GROQ_API_KEY=xxx
supabase secrets set DEEPSEEK_API_KEY=xxx
supabase secrets set GEMINI_API_KEY=xxx
```

### Instalación Local

```bash
git clone https://github.com/pabloeckert/MejoraSM.git
cd MejoraSM
npm install --legacy-peer-deps
npm run dev          # Servidor local
npm run build        # Build de producción
npm run test         # Tests con Vitest (21 tests)
```

### Variables de Entorno (.env)

```env
VITE_SUPABASE_URL=https://exnjyxwmxknvzploeaex.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
```

---

## 14. REGISTRO DE AVANCES

### 22/04/2026 — Día 1 (Sesión principal)

- ✅ Análisis completo del repo INSSIST original
- ✅ Extensión Chrome v1.1.0 funcional (botón flotante, caption helper, hashtag packs, quick replies)
- ✅ Schema SQL completo (9 tablas + pgvector + RLS)
- ✅ Edge Functions: ai-gateway, orchestrator, vault-process
- ✅ Service layer frontend (ai.ts + supabase.ts)
- ✅ Deploy automático configurado (GitHub Actions → FTP)
- ✅ 3 bloqueadores resueltos (FTP, npm ci, secret scanning)
- ✅ Documentación generada (14 archivos en docs/)

### 23/04/2026 — Consolidación + Optimización

**Documentación:**
- ✅ Análisis de estado real vs documentación
- ✅ Documentación unificada en `Documents/DOCUMENTACION.md`
- ✅ Plan por etapas (ETAPA 0-6) con dependencias y estimaciones
- ✅ Identificación de bloqueadores activos

**Frontend — Hooks React creados:**
- ✅ `src/hooks/useVault.ts` — upload, list, delete documentos
- ✅ `src/hooks/useDialogue.ts` — sesiones, mensajes, start, continue
- ✅ `src/hooks/useProposals.ts` — list, pending, approve, reject, schedule
- ✅ `src/hooks/useMetrics.ts` — calendario, métricas, reglas de éxito

**Frontend — Páginas conectadas a datos reales:**
- ✅ Dashboard — stats dinámicos, aprobaciones pendientes, calendario
- ✅ Bóveda — upload real, búsqueda, eliminación, estado de procesamiento
- ✅ Mesa de Diálogo — crear sesión con topic, dar feedback, ver estado
- ✅ Configuración — selectores de proveedor/modelo/temperatura por agente

**Limpieza técnica:**
- ✅ Eliminados 4 archivos legacy de extensión
- ✅ README.md actualizado
- ✅ .gitignore protegido (.env, .openclaw/)
- ✅ Dependencias actualizadas

**Seguridad:**
- ✅ .env protegido en .gitignore

### 23/04/2026 — ETAPA 6: Limpieza Técnica ✅ COMPLETADA

- ✅ 6.1 — Migración extensión a Manifest V3
- ✅ 6.2 — `strictNullChecks` activado
- ✅ 6.3 — Tests Vitest (21 tests pasando)
- ✅ 6.4 — Archivos legacy eliminados
- ✅ 6.5 — `lovable-tagger` removido
- ✅ 6.6 — Browserslist actualizado
- ✅ Guía de setup Supabase creada (`Documents/SUPABASE_SETUP.md`)
- ✅ Build de producción verificado (3.21s, sin errores)

### 23/04/2026 — ETAPA 1: Activar Backend (en progreso)

- ✅ 1.1 — SQL schema ejecutado en Supabase SQL Editor (Success, 22:35)
- ⏳ 1.2 — Verificar bucket `vault` en Storage
- 🔲 1.3 — Configurar API key secrets (Groq, DeepSeek, Gemini)
- 🔲 1.4 — Deploy Edge Functions
- 🔲 1.5 — Health check

### 24/04/2026 — Consolidación de Documentación

- ✅ Análisis completo de 18 archivos de documentación dispersos
- ✅ Eliminación de duplicación masiva (PROYECTO-MAESTRO.md ≈ DOCUMENTACION.md)
- ✅ Documentación consolidada en documento único (`Documents/DOCUMENTACION.md`)
- ✅ Instrucción "documentar" integrada con flujo de actualización
- ✅ Optimización de plan por etapas (re-numeración lógica)
- ✅ Limpieza de datos sensibles (credenciales removidas de logs)
- ✅ docs/ marcado como legacy (solo lectura)

---

## 15. DECISIONES TÉCNICAS

| Decisión | Elección | Razón |
|---|---|---|
| Backend | Supabase Edge Functions | Gratis, integrado, sin servidor |
| Framework | React (Lovable) | Ya existía, ecosistema grande |
| IA principal | Groq (Llama 4 Scout 8B) | Rápido, free tier generoso |
| IA análisis | DeepSeek V3.2 | Bueno en lógica |
| Embeddings | HF Sentence Transformers | Gratis, 384 dims |
| DB | PostgreSQL + pgvector | RAG nativo en Supabase |
| Auth | Sin auth (personal) | Simplifica MVP, activar después |
| Deploy frontend | GitHub Actions → FTP | Automático en push |
| Extensión | Manifest V3 | Chrome elimina MV2 |
| Documentación | Document único en Documents/ | Eliminar dispersión |

---

## 16. COSTOS

| Servicio | Free Tier | Uso estimado | Costo |
|---|---|---|---|
| Supabase | 500K func, 500MB DB, 1GB storage | Bajo | $0 |
| Groq | 30 req/min | ~100 req/día | $0 |
| DeepSeek | Free tier | ~30 req/día | $0 |
| Gemini | 60 req/min, 1M tokens/min | Backup | $0 |
| HF Embeddings | Rate limit generoso | ~20 req/día | $0 |
| Hostinger | Plan existente | Landing | Ya pagado |
| **Total** | | | **$0/mes** |

---

## 17. BUYER PERSONAS

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

*Este documento reemplaza toda la documentación previa en `docs/` (legacy, solo lectura).*
*Última actualización: 24/04/2026*
*Cuando el usuario diga "documentar", actualizar este archivo con los trabajos realizados.*
