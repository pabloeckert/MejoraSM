# 🗺️ Plan de Trabajo — MejoraINSSIST + EDA

**Última actualización:** 22/04/2026

---

## Fase 1: Extensión Chrome ✅ COMPLETADA

**Objetivo:** Hacer funcional la extensión con los módulos custom de MejoraOK

| # | Tarea | Estado | Fecha |
|---|---|---|---|
| 1.1 | Analizar repo INSSIST original | ✅ | 22/04 |
| 1.2 | Identificar módulos custom existentes | ✅ | 22/04 |
| 1.3 | Fix content scripts (no inyectaban en IG) | ✅ | 22/04 |
| 1.4 | Crear mejora-injector.js (botón flotante + panel) | ✅ | 22/04 |
| 1.5 | Implementar Caption Helper en panel | ✅ | 22/04 |
| 1.6 | Implementar Hashtag Packs en panel | ✅ | 22/04 |
| 1.7 | Implementar Quick Replies en panel | ✅ | 22/04 |
| 1.8 | Auto-detección "/" en DMs | ✅ | 22/04 |
| 1.9 | Crear landing page | ✅ | 22/04 |
| 1.10 | Push a GitHub | ✅ | 22/04 |
| 1.11 | Deploy a subdominio (FTP bloqueado) | ⏳ Pendiente manual | — |

---

## Fase 2: Backend EDA — MVP 🔲 PENDIENTE

**Objetivo:** Servidor funcional con sistema multi-agente básico

### Sprint 2.1: Setup del Backend (semana 1)

| # | Tarea | Prioridad | Estimación |
|---|---|---|---|
| 2.1.1 | Elegir stack (Node.js vs Python) | Alta | 1 día |
| 2.1.2 | Setup del proyecto + estructura de carpetas | Alta | 0.5 días |
| 2.1.3 | Configurar Express/FastAPI + CORS | Alta | 0.5 días |
| 2.1.4 | Setup SQLite + schema inicial | Alta | 1 día |
| 2.1.5 | Deploy en Hostinger o VPS | Alta | 0.5 días |
| 2.1.6 | Health check endpoint | Media | 0.5 días |

### Sprint 2.2: Integración de IAs (semana 2)

| # | Tarea | Prioridad | Estimación |
|---|---|---|---|
| 2.2.1 | Conectar Ollama (local) — Llama 4 Scout | Alta | 1 día |
| 2.2.2 | Conectar Groq API — Llama 4 Scout 8B | Alta | 1 día |
| 2.2.3 | Conectar DeepSeek V3.2 | Media | 1 día |
| 2.2.4 | Conectar Gemini Flash (backup gratuito) | Media | 0.5 días |
| 2.2.5 | Abstraction layer — AI Provider interface | Alta | 1 día |
| 2.2.6 | Fallback chain (si un proveedor falla) | Media | 0.5 días |

### Sprint 2.3: Bóveda de Conocimiento (semana 3)

| # | Tarea | Prioridad | Estimación |
|---|---|---|---|
| 2.3.1 | Upload de PDFs/Docs vía API | Alta | 1 día |
| 2.3.2 | Extracción de texto (pdf-parse, mammoth) | Alta | 1 día |
| 2.3.3 | Chunking + embeddings | Alta | 1 día |
| 2.3.4 | RAG — Retrieval + contexto para agentes | Alta | 2 días |
| 2.3.5 | Endpoint de búsqueda semántica | Media | 1 día |

### Sprint 2.4: Mesa de Diálogo Multi-Agente (semana 4)

| # | Tarea | Prioridad | Estimación |
|---|---|---|---|
| 2.4.1 | Agente Estratega — propone temas/ángulos | Alta | 2 días |
| 2.4.2 | Agente Creativo — redacta copys | Alta | 2 días |
| 2.4.3 | Agente Crítico — aprueba/rechaza contra docs | Alta | 2 días |
| 2.4.4 | Orquestador — flujo de debate entre agentes | Alta | 2 días |
| 2.4.5 | Endpoint de generación de post | Alta | 1 día |

---

## Fase 3: Publicador y Calendario 🔲 PENDIENTE

**Objetivo:** Sistema de publicación autónoma

| # | Tarea | Prioridad | Estimación |
|---|---|---|---|
| 3.1 | Calendario editorial (CRUD) | Alta | 2 días |
| 3.2 | Cron job de publicación | Alta | 1 día |
| 3.3 | Integración con Instagram Graph API | Alta | 3 días |
| 3.4 | Sistema de aprobación previa | Alta | 2 días |
| 3.5 | Retry automático en fallos | Media | 1 día |
| 3.6 | Soporte multi-formato (imagen, carrusel, video) | Media | 3 días |

---

## Fase 4: Monitor de KPIs 🔲 PENDIENTE

**Objetivo:** Lectura y análisis de métricas de Instagram

| # | Tarea | Prioridad | Estimación |
|---|---|---|---|
| 4.1 | Conexión a Instagram Insights API | Alta | 2 días |
| 4.2 | Recolección periódica de métricas | Alta | 1 día |
| 4.3 | Almacenamiento de métricas históricas | Alta | 1 día |
| 4.4 | Análisis de rendimiento (DeepSeek) | Media | 2 días |
| 4.5 | Detección de patrones de éxito | Media | 2 días |
| 4.6 | Generación automática de reglas | Media | 2 días |

---

## Fase 5: Dashboard 🔲 PENDIENTE

**Objetivo:** Interfaz web de supervisión

| # | Tarea | Prioridad | Estimación |
|---|---|---|---|
| 5.1 | Setup del proyecto frontend | Alta | 1 día |
| 5.2 | Página Dashboard — KPIs principales | Alta | 2 días |
| 5.3 | Página Aprobación — cola de contenido | Alta | 2 días |
| 5.4 | Página Laboratorio — generador de propuestas | Media | 2 días |
| 5.5 | Página Calendario — vista editorial | Alta | 2 días |
| 5.6 | Página Bóveda — gestión de documentos | Media | 1 día |
| 5.7 | Página Configuración — agentes | Media | 1 día |
| 5.8 | WebSocket para updates en tiempo real | Media | 2 días |
| 5.9 | Deploy estático en subdominio | Alta | 0.5 días |

---

## Fase 6: Bucle de Aprendizaje 🔲 PENDIENTE

**Objetivo:** El sistema mejora automáticamente con el tiempo

| # | Tarea | Prioridad | Estimación |
|---|---|---|---|
| 6.1 | Tracking de métricas por post | Alta | 1 día |
| 6.2 | Correlación: contenido → rendimiento | Media | 2 días |
| 6.3 | Actualización de reglas de éxito | Media | 2 días |
| 6.4 | Sugerencias proactivas de temas | Baja | 2 días |
| 6.5 | Gestor de interacciones (likes, follows) | Baja | 3 días |

---

## Timeline estimado

```
Semana 1-4:   Fase 2 — Backend EDA MVP
Semana 5-6:   Fase 3 — Publicador y Calendario
Semana 7-8:   Fase 4 — Monitor de KPIs
Semana 9-11:  Fase 5 — Dashboard
Semana 12-14: Fase 6 — Bucle de Aprendizaje

Total estimado: ~14 semanas (3.5 meses)
```

---

## Priorización por impacto

```
ALTO IMPACTO (hacer primero):
  ✅ Extensión Chrome funcional
  🔲 Backend + IAs (Groq + Ollama)
  🔲 Bóveda de conocimiento
  🔲 Mesa de diálogo multi-agente
  🔲 Dashboard básico (KPIs + Aprobación)

MEDIO IMPACTO (hacer segundo):
  🔲 Publicador + calendario
  🔲 Monitor de KPIs
  🔲 Laboratorio de contenido

BAJO IMPACTO (hacer último):
  🔲 Generador multiformato
  🔲 Gestor de interacciones
  🔲 Bucle de aprendizaje automático
```
