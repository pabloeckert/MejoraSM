# 📋 PROYECTO MAESTRO — MejoraSocialMedia (EDA)
## Estrategia Digital Autónoma para MejoraOK

**Versión:** 2.0
**Última actualización:** 22 de abril de 2026
**Repositorio:** https://github.com/pabloeckert/mejorasocialmedia

---

## 📌 ÍNDICE

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Estado Actual por Fase](#4-estado-actual-por-fase)
5. [Arquitectura Técnica](#5-arquitectura-técnica)
6. [Base de Datos](#6-base-de-datos)
7. [Edge Functions (Backend)](#7-edge-functions-backend)
8. [Frontend (React)](#8-frontend-react)
9. [Extensión Chrome](#9-extensión-chrome)
10. [Proveedores de IA](#10-proveedores-de-ia)
11. [Deployment](#11-deployment)
12. [Buyer Personas](#12-buyer-personas)
13. [Roadmap y Timeline](#13-roadmap-y-timeline)
14. [Decisiones Técnicas](#14-decisiones-técnicas)
15. [Blockers y Riesgos](#15-blockers-y-riesgos)
16. [Costos](#16-costos)
17. [Registro de Avances](#17-registro-de-avances)

---

## 1. VISIÓN GENERAL

**Objetivo:** Sistema completo de gestión estratégica de contenidos en Instagram mediante múltiples agentes de IA. Procesa la identidad de marca localmente, debate estrategias y ejecuta publicaciones automáticas aprendiendo de los resultados.

**Para:** MejoraOK / Mejora Continua — servicios de claridad estratégica para emprendedores, líderes y profesionales argentinos.

**Dos vertientes:**
1. **Extensión Chrome** (MejoraINSSIST) — herramienta de asistencia directa en Instagram
2. **Sistema EDA** — backend multi-agente con dashboard web

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
│   │   ├── ai.ts                 ← Cliente Edge Functions ✅ NUEVO
│   │   └── supabase.ts           ← CRUD completo ✅ NUEVO
│   ├── components/
│   │   ├── layout/               ← AppLayout, AppSidebar
│   │   └── ui/                   ← shadcn components
│   └── hooks/                    ← (pendiente crear)
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql ← 9 tablas + RLS + vector search ✅ NUEVO
│   └── functions/
│       ├── ai-gateway/           ← Router universal de IA ✅ NUEVO
│       ├── orchestrator/         ← Mesa de Diálogo multi-agente ✅ NUEVO
│       └── vault-process/        ← Bóveda RAG ✅ NUEVO
├── extension/                    ← Extensión Chrome MejoraINSSIST
│   ├── app/                      ← Scripts (bg.js, ig-cs.js, mejora-injector.js)
│   ├── data/                     ← Buyer personas, hashtags, replies
│   ├── manifest.json             ← Manifest V2
│   └── landing/                  ← Landing page
├── backend/                      ← Placeholder (Fase 2 servidores)
├── dashboard/                    ← Placeholder (Fase 5 standalone)
├── docs/                         ← Documentación del proyecto
│   ├── PROYECTO-MAESTRO.md       ← ESTE DOCUMENTO
│   ├── ARQUITECTURA.md           ← Diagramas de arquitectura
│   ├── SPEC-EDA.md               ← Especificación original
│   ├── PLAN-DE-TRABAJO.md        ← Roadmap por fases
│   ├── DESARROLLO.md             ← Plan técnico detallado
│   ├── PENDIENTES.md             ← Blockers y tareas
│   ├── ESTADO-ACTUAL.md          ← Snapshot del proyecto
│   ├── IA-GRATUITA.md            ← Catálogo de proveedores IA
│   └── DEPLOY.md                 ← Guías de deployment
├── supabase/config.toml          ← Config Supabase
├── package.json                  ← Dependencias React
├── tailwind.config.ts            ← Config Tailwind
├── vite.config.ts                ← Config Vite
└── README.md                     ← README raíz
```

---

## 4. ESTADO ACTUAL POR FASE

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

**⚠️ Issue:** Manifest V2 deprecado por Chrome. Necesita migrar a V3 (bloqueador B2).

### ✅ FASE 2: Backend EDA — CÓDIGO LISTO (sin deploy)

| Componente | Estado | Descripción |
|---|---|---|
| Schema SQL | ✅ | 9 tablas con pgvector + RLS + función de búsqueda |
| ai-gateway | ✅ | Router Groq/DeepSeek/Gemini/HF con fallback |
| orchestrator | ✅ | Mesa de Diálogo multi-agente (3 agentes) |
| vault-process | ✅ | Procesa docs → chunks → embeddings → RAG |
| Service layer frontend | ✅ | Cliente API + CRUD completo |

**🔲 Pendiente:** Ejecutar migración SQL en Supabase + configurar API keys

### 🔲 FASE 3: Publicador y Calendario — PENDIENTE
### 🔲 FASE 4: Monitor de KPIs — PENDIENTE
### 🔲 FASE 5: Dashboard Conectado — EN CURSO (UI lista, falta backend)
### 🔲 FASE 6: Bucle de Aprendizaje — PENDIENTE

---

## 5. ARQUITECTURA TÉCNICA

### Visión General

```
┌────────────────────────────────────────────────────────────┐
│                    CAPA 1: FRONTEND                        │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Dashboard   │  │    Bóveda    │  │    Mesa de   │    │
│  │   (KPIs)      │  │  (Documentos)│  │   Diálogo    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │             │
│  ┌──────────────┐  ┌──────────────┐                      │
│  │  Laboratorio  │  │  Configurac. │                      │
│  │  (Contenido)  │  │  (Agentes)   │                      │
│  └──────┬───────┘  └──────┬───────┘                      │
│         └─────────┬───────┘                               │
│                   │ fetch() / supabase-js                 │
└───────────────────┼───────────────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────────────┐
│                    CAPA 2: SUPABASE                        │
│                                                            │
│  Edge Functions (Deno serverless)                         │
│  ┌────────────────┐  ┌────────────────┐                  │
│  │  ai-gateway    │  │  orchestrator  │                  │
│  │  (Router IA)   │  │  (Multi-agente)│                  │
│  └───────┬────────┘  └───────┬────────┘                  │
│          │                   │                            │
│  ┌────────────────┐  ┌────────────────┐                  │
│  │  vault-process │  │  publish       │  ← FUTURO        │
│  │  (RAG)         │  │  (Calendario)  │                  │
│  └───────┬────────┘  └───────┬────────┘                  │
│          │                   │                            │
│  PostgreSQL + pgvector + Storage                         │
│  ┌────────────────────────────────────────┐              │
│  │  documents │ chunks │ proposals │ ...  │              │
│  └────────────────────────────────────────┘              │
└───────────────────┬───────────────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────────────┐
│                    CAPA 3: PROVEEDORES IA                  │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  Groq    │  │ DeepSeek │  │  Gemini  │  │   HF    │  │
│  │ Estratega│  │ Crítico  │  │  Backup  │  │Embedding│  │
│  │ Creativo │  │ Análisis │  │ MultiMod │  │  RAG    │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                    CAPA 4: EXTENSIÓN CHROME                │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Caption       │  │ Hashtag      │  │ Quick        │   │
│  │ Helper        │  │ Packs        │  │ Replies      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│         │                    │                  │          │
│  ┌──────────────────────────────────────────────┐        │
│  │           mejora-injector.js                 │        │
│  │         (Botón flotante + Panel)             │        │
│  └──────────────────────────────────────────────┘        │
└───────────────────────────────────────────────────────────┘
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

| Tabla | Propiedad | Relaciones |
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

**Endpoint:** `/functions/v1/ai-gateway`
**Método:** POST

**Chat completion:**
```json
{
  "provider": "groq|deepseek|gemini",
  "model": "llama-4-scout-8b-instruct",
  "messages": [{"role": "user", "content": "..."}],
  "system": "prompt del sistema",
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**Embeddings:**
```json
{
  "action": "embed",
  "texts": ["texto 1", "texto 2"]
}
```

**Features:**
- Router multi-proveedor
- Fallback automático (Groq → Gemini → DeepSeek)
- Rate limit handling

### 7.2 orchestrator

**Endpoint:** `/functions/v1/orchestrator`
**Método:** POST

**Iniciar sesión:**
```json
{
  "action": "start",
  "topic": "Cómo delegar sin perder control"
}
```

**Continuar sesión:**
```json
{
  "action": "continue",
  "sessionId": "uuid",
  "feedback": "El hook no conecta, hace más emocional"
}
```

**Flujo interno:**
1. Crea sesión en DB
2. Busca contexto en la bóveda (RAG)
3. Ejecuta Estratega → guarda mensaje
4. Ejecuta Creativo → guarda mensaje
5. Ejecuta Crítico → guarda mensaje
6. Extrae propuesta estructurada (hook/body/cta/hashtags)
7. Si aprobado → crea registro en proposals
8. Retorna todo el debate + propuesta

### 7.3 vault-process

**Endpoint:** `/functions/v1/vault-process`
**Método:** POST

**Procesar documento:**
```json
{
  "action": "process",
  "documentId": "uuid"
}
```

**Buscar (RAG):**
```json
{
  "action": "search",
  "query": "tono de voz para emprendedores",
  "limit": 5
}
```

**Pipeline de procesamiento:**
1. Descarga archivo del storage
2. Extrae texto
3. Chunking (~500 tokens, overlap 50)
4. Genera embeddings (HF all-MiniLM-L6-v2)
5. Guarda chunks con vectores en DB

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

### Services (conectados al backend)

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

### Buyer Personas

1. 🤯 El Emprendedor Saturado — "No doy más, estoy en mil cosas"
2. 👑 La Líder que Necesita Validación — "¿Estaré liderando bien?"
3. 📈 El Profesional Independiente — "Soy bueno pero no lo saben"
4. 🔀 El Equipo Desalineado — "Cada uno hace lo suyo"
5. 🔍 El Empresario Mal Asesorado — "Estoy rodeado de humo"
6. 🌱 La Nueva Generación — "No me valoran, quiero crecer"
7. 💸 El Vendedor sin Resultados — "Trabajo mucho, no vendo"
8. ⚡ El que Necesita Orden — "Crecí rápido, ahora estoy desordenado"

### Bloqueador: Manifest V2

Chrome elimina soporte para MV2. La extensión no se carga en Chrome moderno.
**Solución:** Migrar a MV3 o usar flag temporal.

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

### Frontend (Lovable)

- Deploy automático vía Lovable
- URL: [ver en Lovable dashboard]
- Branch: `main`

### Backend (Supabase Edge Functions)

```bash
# Deploy functions
supabase functions deploy ai-gateway
supabase functions deploy orchestrator
supabase functions deploy vault-process

# Set secrets
supabase secrets set GROQ_API_KEY=xxx
supabase secrets set DEEPSEEK_API_KEY=xxx
supabase secrets set GEMINI_API_KEY=xxx
supabase secrets set HF_API_KEY=xxx
```

### Base de datos

```bash
# Ejecutar migración
supabase db push
# O copiar/pegar supabase/migrations/001_initial_schema.sql en SQL Editor
```

### Landing Page (Extensión)

- Subdominio: `util.mejoraok.com/MejoraSM`
- Hostinger FTP: `185.212.70.250`
- Deploy manual vía File Manager (FTP bloqueado desde servidor)

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

## 13. ROADMAP Y TIMELINE

### Fase 1: Extensión Chrome ✅ COMPLETADA (22/04/2026)
- [x] Análisis repo INSSIST original
- [x] Fix content scripts
- [x] Crear mejora-injector.js (botón flotante + panel)
- [x] Caption Helper, Hashtag Packs, Quick Replies
- [x] Auto-detección "/" en DMs
- [x] Landing page
- [x] Push a GitHub

### Fase 2: Backend EDA ✅ CÓDIGO LISTO (22/04/2026)
- [x] Schema SQL (9 tablas + pgvector + RLS)
- [x] ai-gateway (router universal de IA)
- [x] orchestrator (Mesa de Diálogo multi-agente)
- [x] vault-process (Bóveda RAG)
- [x] Service layer frontend
- [ ] Ejecutar migración SQL en Supabase
- [ ] Configurar API keys (Groq, DeepSeek, Gemini, HF)
- [ ] Deploy Edge Functions

### Fase 3: Publicador y Calendario 🔲 PENDIENTE
- [ ] Calendario editorial (CRUD)
- [ ] Cron job de publicación
- [ ] Instagram Graph API
- [ ] Sistema de aprobación previa

### Fase 4: Monitor de KPIs 🔲 PENDIENTE
- [ ] Instagram Insights API
- [ ] Recolección periódica de métricas
- [ ] Análisis con DeepSeek
- [ ] Detección de patrones

### Fase 5: Dashboard Conectado 🔲 EN CURSO
- [x] UI completa (5 páginas)
- [ ] Conectar con backend
- [ ] Hooks React (useVault, useDialogue, etc.)
- [ ] Real-time updates

### Fase 6: Bucle de Aprendizaje 🔲 PENDIENTE
- [ ] Tracking de métricas por post
- [ ] Correlación contenido → rendimiento
- [ ] Reglas de éxito automáticas
- [ ] Sugerencias proactivas

### Timeline estimado

```
Semana 1 (actual): ✅ Extensión + Backend código
Semana 2:          Deploy backend + conectar frontend
Semana 3:          Publicador + Calendario
Semana 4:          KPIs + Monitor
Semana 5-6:        Bucle de aprendizaje
Total:             ~6 semanas (1.5 meses)
```

---

## 14. DECISIONES TÉCNICAS

| Decisión | Elección | Razón |
|---|---|---|
| Backend | Supabase Edge Functions | Gratis, integrado con DB, sin servidor separado |
| Framework frontend | React (Lovable) | Ya existía, ecosistema grande |
| IA principal | Groq (Llama 4 Scout 8B) | Más rápido, free tier generoso |
| IA análisis | DeepSeek V3.2 | Bueno en lógica y razonamiento |
| Embeddings | HF Sentence Transformers | Gratis, buena calidad |
| DB | PostgreSQL + pgvector | Integrado en Supabase, RAG nativo |
| Auth | Sin auth (personal) | Simplifica, activar después si se necesita |
| Lenguaje backend | TypeScript (Deno) | Consistencia con frontend, Edge Functions |

---

## 15. BLOCKERS Y RIESGOS

### Bloqueadores Activos

| ID | Descripción | Prioridad | Estado |
|---|---|---|---|
| B1 | Deploy FTP falla desde servidor | Alta | Pendiente (deploy manual) |
| B2 | Manifest V2 deprecado por Chrome | Media | Pendiente (migrar a V3) |
| B3 | API keys no configuradas | Alta | 🔲 En progreso |
| B4 | Migración SQL no ejecutada | Alta | Pendiente |

### Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Instagram bloquea extensión | Baja | Alto | Solo DOM injection, no scraping |
| Rate limits de IA | Media | Medio | Fallback chain, cache |
| Chrome elimina MV2 | Alta | Medio | Migrar a V3 proactivamente |
| Costo de APIs se dispara | Baja | Medio | Monitoreo, límites por día |
| Supabase free tier agotado | Baja | Bajo | Upgrade si necesario ($25/mes) |

---

## 16. COSTOS

| Servicio | Free Tier | Uso mensual estimado | Costo |
|---|---|---|---|
| Supabase | 500K func, 500MB DB, 1GB storage | Bajo | $0 |
| Groq | 30 req/min | ~100 req/día | $0 |
| DeepSeek | Free tier | ~30 req/día | $0 |
| Gemini | 60 req/min, 1M tokens/min | Backup only | $0 |
| HF Embeddings | Rate limit generoso | ~20 req/día | $0 |
| Lovable | Incluido en plan | Continuo | $0 |
| Hostinger | Plan existente | Landing + futuro | Ya pagado |
| **Total** | | | **$0/mes** |

---

## 17. REGISTRO DE AVANCES

### 22/04/2026 — Día 1

**Mañana:**
- ✅ Análisis completo del repo INSSIST original
- ✅ Lectura de todos los documentos del proyecto
- ✅ Clonado y análisis de código de la extensión

**Extensión Chrome:**
- ✅ Verificación de sintaxis (todos los archivos OK)
- ✅ Identificación de blocker MV2
- ✅ Unificación de repos (MejoraINSSIST → mejorasocialmedia)

**Sistema EDA:**
- ✅ Decisión arquitectónica: Supabase Edge Functions
- ✅ Schema SQL completo (9 tablas + pgvector + RLS + vector search)
- ✅ Edge Function: ai-gateway (router multi-proveedor con fallback)
- ✅ Edge Function: orchestrator (Mesa de Diálogo 3 agentes)
- ✅ Edge Function: vault-process (RAG completo)
- ✅ Service layer frontend (ai.ts + supabase.ts)
- ✅ Documento maestro unificado (este documento)

**Próximos pasos inmediatos:**
1. Configurar API keys en Supabase Secrets
2. Ejecutar migración SQL
3. Deploy Edge Functions
4. Conectar frontend con backend
5. Probar Mesa de Diálogo end-to-end

---

*Documento maestro del proyecto MejoraSocialMedia. Actualizar con cada avance significativo.*
