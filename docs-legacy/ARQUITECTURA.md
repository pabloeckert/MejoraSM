# 🏗️ Arquitectura del Sistema

## Visión general

El sistema completo MejoraINSSIST + EDA tiene tres capas:

```
┌─────────────────────────────────────────────────────────┐
│                    CAPA 1: EXTENSIÓN                     │
│              Chrome Extension (Instagram)                │
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │
│  │ Caption    │  │ Hashtag   │  │ Quick Replies     │   │
│  │ Helper     │  │ Packs     │  │ (DM)              │   │
│  └─────┬─────┘  └─────┬─────┘  └─────────┬─────────┘   │
│        │              │                   │             │
│        └──────────────┼───────────────────┘             │
│                       │                                 │
│              ┌────────▼────────┐                        │
│              │ mejora-injector │                        │
│              │ (botón flotante │                        │
│              │  + panel UI)    │                        │
│              └────────┬────────┘                        │
│                       │ API calls (futuro)              │
└───────────────────────┼─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                    CAPA 2: BACKEND                       │
│             Server EDA (Node.js/Python)                  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Agente       │  │ Agente       │  │ Agente       │  │
│  │ Estratega    │  │ Creativo     │  │ Crítico      │  │
│  │ (Ollama)     │  │ (Groq)       │  │ (RAG/Docs)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         └─────────────────┼─────────────────┘           │
│                    ┌──────▼──────┐                       │
│                    │    Mesa     │                       │
│                    │  Diálogo    │                       │
│                    │ Multi-Agente│                       │
│                    └──────┬──────┘                       │
│                           │                             │
│  ┌────────────────────────┼────────────────────────┐    │
│  │                        │                        │    │
│  │  ┌─────────────┐  ┌───▼────────┐  ┌─────────┐ │    │
│  │  │  Bóveda     │  │ Publicador │  │ Monitor │ │    │
│  │  │ Conocimiento│  │ Calendar   │  │ KPIs    │ │    │
│  │  │  (RAG)      │  │ Autónomo   │  │ IG      │ │    │
│  │  └─────────────┘  └────────────┘  └────┬────┘ │    │
│  │                                        │      │    │
│  │  ┌─────────────────────────────────────▼────┐ │    │
│  │  │         Bucle de Aprendizaje             │ │    │
│  │  │   (reglas dinámicas, sugerencias)        │ │    │
│  │  └──────────────────────────────────────────┘ │    │
│  └───────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   CAPA 3: DASHBOARD                      │
│          util.mejoraok.com/MejoraSM                      │
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │
│  │ KPIs      │  │ Cola de   │  │ Laboratorio de    │   │
│  │ Dashboard │  │ Aprobación│  │ Contenido         │   │
│  └───────────┘  └───────────┘  └───────────────────┘   │
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │
│  │ Calendar  │  │ Config    │  │ Buyer Personas    │   │
│  │ Editorial │  │ Agentes   │  │ Manager           │   │
│  └───────────┘  └───────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Capa 1: Extensión Chrome

### Arquitectura de la extensión

```
MejoraINSSIST/
├── manifest.json              ← Configuración de la extensión
├── app/
│   ├── bg.js                  ← Background script (core INSSIST)
│   ├── ig-cs.js               ← Content script Instagram (core)
│   ├── fb-cs.js               ← Content script Facebook (core)
│   ├── mejora-injector.js     ← INYECTOR MEJORAOK (nuevo)
│   ├── nj.js                  ← Script inyectado base
│   ├── ig-nj.js               ← Script inyectado IG
│   ├── fb-nj.js               ← Script inyectado FB
│   ├── caption-helper.js      ← [legacy] Helper de captions
│   ├── hashtag-packs.js       ← [legacy] Panel de hashtags
│   └── sales-quick-replies.js ← [legacy] Quick replies
├── data/
│   ├── buyer-personas.js      ← 8 perfiles psicográficos
│   ├── hashtags-db.js         ← Packs de hashtags
│   └── sales-replies.js       ← 24 respuestas rápidas
├── js/                        ← Librerías externas
├── img/                       ← Assets visuales
├── _locales/                  ← i18n (es/en/pt_BR)
├── inssist.html               ← Popup de la extensión
└── viewer.html                ← Visor de imágenes
```

### Flujo de carga (content scripts)

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

### MejoraInjector — Módulos internos

```
MejoraInjector
├── _injectStyles()          ← CSS global inyectado
├── _createFAB()             ← Botón flotante
├── _createPanel()           ← Panel con 3 tabs
├── _renderTab()             ← Router de tabs
│   ├── _renderCaptionTab()  ← Caption Helper
│   ├── _renderHashtagsTab() ← Hashtag Packs
│   └── _renderRepliesTab()  ← Quick Replies
├── _initCaptionWatcher()    ← Auto-refresh al escribir
├── _initDMWatcher()         ← Auto-abrir con "/"
├── _insertIntoDM()          ← Insertar texto en DM
├── _copyToClipboard()       ← Utilidad clipboard
├── _toast()                 ← Notificación flotante
└── _escapeAttr()            ← Sanitización HTML
```

---

## Capa 2: Backend EDA (Futuro)

### Stack propuesto

```
Runtime:    Node.js 20+ o Python 3.11+
Framework:  Express.js o FastAPI
Database:   SQLite (inicio) → PostgreSQL (escala)
Cache:      Redis (opcional)
Queue:      Bull/BullMQ (Node) o Celery (Python)
Storage:    Local filesystem → S3-compatible
```

### Módulos del backend

```
eda-backend/
├── src/
│   ├── agents/
│   │   ├── strategist.js     ← Agente Estratega (Ollama)
│   │   ├── creative.js       ← Agente Creativo (Groq)
│   │   ├── critic.js         ← Agente Crítico (RAG)
│   │   └── orchestrator.js   ← Orquestador multi-agente
│   ├── knowledge/
│   │   ├── vault.js          ← Bóveda de documentos
│   │   ├── rag.js            ← Retrieval Augmented Generation
│   │   └── embeddings.js     ← Vectorización de docs
│   ├── publisher/
│   │   ├── calendar.js       ← Calendario editorial
│   │   ├── scheduler.js      ← Cron de publicación
│   │   └── instagram.js      ← API de Instagram
│   ├── monitor/
│   │   ├── kpi.js            ← Recolección de métricas
│   │   ├── analytics.js      ← Análisis de rendimiento
│   │   └── rules.js          ← Reglas de aprendizaje
│   ├── interactions/
│   │   ├── responder.js      ← Respuestas automáticas
│   │   └── engager.js        ← Likes, follows, comentarios
│   └── api/
│       ├── routes.js         ← REST API endpoints
│       └── websocket.js      ← Real-time updates
├── data/
│   ├── personas.json         ← Buyer personas (sync con extensión)
│   ├── rules.json            ← Reglas de éxito aprendidas
│   └── metrics.db            ← Base de datos de métricas
└── config/
    ├── ollama.js              ← Config Ollama
    ├── groq.js                ← Config Groq
    ├── deepseek.js            ← Config DeepSeek
    └── instagram.js           ← Config Instagram API
```

---

## Capa 3: Dashboard (Futuro)

### Stack propuesto

```
Framework:  React 18+ o Vue 3
Styling:    Tailwind CSS
Charts:     Chart.js o Recharts
State:      Zustand o Pinia
Deploy:     Static → Hostinger
```

### Módulos del dashboard

```
eda-dashboard/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx      ← KPIs principales
│   │   ├── Approval.jsx       ← Cola de aprobación
│   │   ├── Laboratory.jsx     ← Laboratorio de contenido
│   │   ├── Calendar.jsx       ← Calendario editorial
│   │   ├── Knowledge.jsx      ← Bóveda de documentos
│   │   ├── Personas.jsx       ← Gestión de buyer personas
│   │   └── Settings.jsx       ← Configuración de agentes
│   ├── components/
│   │   ├── KPICard.jsx        ← Tarjeta de métrica
│   │   ├── PostPreview.jsx    ← Preview de post
│   │   ├── AgentChat.jsx      ← Chat con agentes IA
│   │   ├── Timeline.jsx       ← Línea de tiempo
│   │   └── ContentLab.jsx     ← Generador de propuestas
│   └── services/
│       ├── api.js             ← Cliente API backend
│       ├── ws.js              ← WebSocket client
│       └── auth.js            ← Autenticación
└── public/
    └── index.html             ← Entry point
```

---

## Diagrama de datos

```
Buyer Personas (data/buyer-personas.js)
    │
    ├──→ Caption Helper → detecta persona → sugiere hooks
    │
    ├──→ Hashtag Packs → sugiere pack → genera set balanceado
    │
    └──→ Quick Replies → filtra por contexto → inserta en DM

Documentos PDF/Doc (Bóveda — futuro)
    │
    └──→ RAG → embeddings → retrieve → contexto para agentes

Métricas de Instagram (futuro)
    │
    ├──→ Monitor KPIs → detecta patrones
    │
    └──→ Reglas de éxito → actualiza estrategia
```
