# 📋 ANÁLISIS PROFUNDO MULTIDISCIPLINARIO — MejoraSM

**Proyecto:** MejoraSocialMedia — Estratega Digital Autónoma (EDA)
**Fecha:** 24/04/2026
**Repositorio:** https://github.com/pabloeckert/MejoraSM
**Producción:** https://util.mejoraok.com/MejoraSM/

---

> **📌 INSTRUCCIÓN DE MANTENIMIENTO:**
> Cuando el usuario diga **"documentar"**, actualizar `docs/DOCUMENTACION.md` con los trabajos realizados desde la última actualización.

---

## 🔴 HALLAZGOS CRÍTICOS (RESUMEN EJECUTIVO)

| # | Severidad | Hallazgo | Área |
|---|---|---|---|
| 1 | 🔴 CRÍTICO | `.env` con credenciales reales commiteado al repo | Seguridad |
| 2 | 🔴 CRÍTICO | `docs/DEPLOY.md` contiene FTP password en texto plano | Seguridad |
| 3 | 🔴 CRÍTICO | PostgREST no reconoce tablas (bloqueador funcional) | Backend |
| 4 | 🟠 ALTO | Edge Functions sin deploy + sin API keys | Backend |
| 5 | 🟠 ALTO | RLS con políticas "Allow all" (sin autenticación) | Seguridad |
| 6 | 🟡 MEDIO | Documentación duplicada entre `docs/` y `docs/` | Documentación |
| 7 | 🟡 MEDIO | Laboratorio.tsx es solo placeholder sin funcionalidad | Frontend |
| 8 | 🟡 MEDIO | Configuración se guarda en localStorage, no en DB | Frontend |

---

## 1. ANÁLISIS TÉCNICO TRANSVERSAL

### 1.1 Software Architect

**Evaluación general:** ⭐⭐⭐ (3/5)

**Fortalezas:**
- Arquitectura de capas clara: Frontend → Edge Functions → DB → Proveedores IA
- Separación correcta: ai-gateway (router), orchestrator (flujo), vault-process (RAG)
- Supabase como BaaS reduce complejidad operacional significativamente
- Patrón de fallback en ai-gateway (Groq → Gemini → DeepSeek)

**Debilidades:**
- **Dependencia circular:** orchestrator llama a ai-gateway internamente vía HTTP, creando latencia innecesaria. Podría importar directamente.
- **Sin patrón de retry:** Si un proveedor falla, el fallback es lineal sin backoff exponencial
- **Sin circuit breaker:** No hay protección contra cascada de fallos
- **Acoplamiento fuerte entre frontend y schema de DB:** Los hooks dependen de nombres exactos de tablas/columnas
- **Sin abstracción de repositorio:** `supabase.ts` mezcla lógica de negocio con acceso a datos

**Recomendaciones:**
1. Implementar patrón Repository para desacoplar servicios de Supabase
2. Agregar retry con exponential backoff en ai-gateway
3. Implementar circuit breaker para proveedores IA
4. Crear DTOs (Data Transfer Objects) para estabilizar contratos entre capas

### 1.2 Cloud Architect

**Evaluación:** ⭐⭐⭐⭐ (4/5)

**Fortalezas:**
- Stack 100% serverless: zero gestión de servidores
- Supabase como plataforma unificada (DB + Auth + Storage + Functions + Realtime)
- Costo $0/mes en free tier — excelente para MVP
- CDN automático via Hostinger para assets estáticos

**Debilidades:**
- **Vendor lock-in a Supabase:** Las Edge Functions usan APIs específicas de Supabase (Deno runtime, service role key)
- **Sin multi-región:** Todo en una región (São Paulo)
- **Sin CDN para Edge Functions:** Cada request pasa por la región del proyecto
- **FTP deployment:** Protocolo obsoleto, sin TLS garantizado, sin rollback automático

**Recomendaciones:**
1. Evaluar migración a Vercel/Cloudflare Pages para el frontend (mejor DX, preview deployments)
2. Mantener Supabase para backend pero abstraer el acceso
3. Implementar health checks y alertas automáticas
4. Migrar deploy de FTP a SSH/SFTP o direct integration

### 1.3 Backend Developer

**Evaluación:** ⭐⭐⭐ (3/5)

**Fortalezas:**
- Edge Functions bien estructuradas con CORS handling
- Validación de inputs en endpoints
- Chunking inteligente con overlap para RAG
- Vector search con pgvector nativo

**Debilidades:**
- **Sin validación de esquema:** No usa Zod ni ningún validador para el body de requests
- **Sin rate limiting:** Cualquier usuario puede hacer miles de requests
- **Sin logging estructurado:** Solo `console.warn` en fallback
- **Error handling genérico:** Todos los errores retornan 500 sin diferenciación
- **Sin tests de Edge Functions:** Solo tests del frontend
- **extractProposal() es frágil:** Usa regex para parsear output de IA — puede fallar con variaciones

**Código problemático:**
```typescript
// orchestrator/index.ts — getContextDocs no hace búsqueda vectorial real
async function getContextDocs(query: string): Promise<string> {
  // Por ahora: devuelve los últimos 5 documentos procesados
  // TODO: búsqueda vectorial real ← ESTO ES UN PROBLEMA
  const { data: docs } = await supabase
    .from("documents")
    .select("title, content")
    .order("created_at", { ascending: false })
    .limit(5);
  // ...
}
```

**Recomendaciones:**
1. Implementar validación con Zod en todos los endpoints
2. Agregar rate limiting (Supabase tiene built-in)
3. Implementar logging estructurado (Deno tiene `console.log` con JSON)
4. Crear tests para Edge Functions con `deno test`
5. Corregir `getContextDocs` para usar búsqueda vectorial real

### 1.4 Frontend Developer

**Evaluación:** ⭐⭐⭐⭐ (4/5)

**Fortalezas:**
- React 18 + TypeScript + Vite = stack moderno y rápido
- shadcn/ui = componentes accesibles y consistentes
- Code splitting configurado (react-vendor, ui-vendor, chart-vendor, query-vendor)
- Hooks personalizados bien estructurados (useVault, useDialogue, useProposals, useMetrics)
- TanStack Query para cache y sincronización

**Debilidades:**
- **Sin manejo de estados de error global:** Cada página maneja errores individualmente
- **Sin loading skeletons consistentes:** Algunos usan Loader2, otros no tienen loading state
- **Configuración se pierde:** `Configuracion.tsx` guarda en localStorage, no se sincroniza con DB
- **Sin optimistic updates:** Las mutaciones esperan respuesta del servidor
- **Sin PWA support:** No hay service worker, ni manifest de app, ni offline support
- **Laboratorio.tsx es un placeholder vacío**

**Recomendaciones:**
1. Implementar error boundary global con React Error Boundary
2. Crear componente de loading skeleton reutilizable
3. Conectar Configuración a la tabla `agent_config` de Supabase
4. Agregar optimistic updates en mutaciones
5. Implementar PWA básica (manifest + service worker)

### 1.5 iOS Developer / Android Developer

**Evaluación:** N/A — No aplica directamente

**Observación:** El proyecto es web-based. Si se quisiera una app móvil:
- **Opción recomendada:** PWA (Progressive Web App) — ya tiene React, solo necesita service worker + manifest
- **Opción futura:** React Native o Expo — reutilizar lógica de hooks y servicios
- **La extensión Chrome** no tiene equivalente móvil — Instagram móvil no soporta extensiones

### 1.6 DevOps Engineer

**Evaluación:** ⭐⭐ (2/5)

**Fortalezas:**
- GitHub Actions CI/CD configurado
- Deploy automático en push a `main`
- Build con variables de entorno via secrets

**Debilidades:**
- **FTP deployment:** Protocolo inseguro, sin TLS, sin rollback
- **Sin staging environment:** Deploy directo a producción
- **Sin health checks post-deploy:** No verifica que el deploy fue exitoso
- **Sin notificaciones de deploy:** No hay Slack/Discord/email notification
- **Sin versionado de releases:** No tags, no changelog automático
- **`dangerous-clean-slate: true`:** Borra todo el directorio remoto antes de subir — riesgoso

**Recomendaciones:**
1. Agregar step de health check post-deploy en el workflow
2. Implementar deploy a staging antes de producción
3. Migrar de FTP a Vercel/Cloudflare Pages/Netlify
4. Agregar notificaciones de deploy (Discord webhook)
5. Crear workflow de PR con preview deployments

### 1.7 Site Reliability Engineer (SRE)

**Evaluación:** ⭐⭐ (2/5)

**Fortalezas:**
- Supabase maneja la infraestructura del backend (auto-scaling, backups)
- Free tier con límites claros

**Debilidades:**
- **Sin monitoreo:** No hay métricas de uptime, latencia, errores
- **Sin alertas:** Si el sistema cae, nadie se entera
- **Sin SLOs definidos:** No hay objetivos de disponibilidad
- **Sin disaster recovery plan:** ¿Qué pasa si Supabase tiene un outage?
- **Sin logging centralizado:** Los logs de Edge Functions se pierden

**Recomendaciones:**
1. Configurar Supabase observability (logs, metrics dashboard)
2. Definir SLO básico (99% uptime para MVP)
3. Implementar health check endpoint que verifique DB + Functions
4. Crear runbook para incidentes comunes
5. Configurar alertas en Supabase (uso de recursos, errores)

### 1.8 Cybersecurity Architect

**Evaluación:** ⭐ (1/5) — CRÍTICO

**🚨 HALLAZGOS DE SEGURIDAD:**

| # | Severidad | Hallazgo | Archivo |
|---|---|---|---|
| S1 | 🔴 CRÍTICO | `.env` con credenciales reales de Supabase commiteado | `.env` |
| S2 | 🔴 CRÍTICO | FTP password en texto plano en docs | `docs/DEPLOY.md` |
| S3 | 🔴 ALTO | Supabase anon key expuesta en repo público | `.env` |
| S4 | 🟠 ALTO | RLS con políticas "Allow all" sin autenticación | `001_initial_schema.sql` |
| S5 | 🟠 ALTO | `CORS_ALLOW_ALL_ORIGINS = true` en Edge Functions | Todos los functions |
| S6 | 🟡 MEDIO | Sin CSRF protection en frontend | General |
| S7 | 🟡 MEDIO | Sin Content Security Policy en frontend | `index.html` |
| S8 | 🟡 MEDIO | Dependencias con versiones no pinned (`^`) | `package.json` |

**Acciones inmediatas requeridas:**
1. **ROTAR** todas las credenciales expuestas (Supabase anon key, FTP password)
2. **ELIMINAR** `.env` del historial de git (no solo del .gitignore)
3. **ELIMINAR** credenciales FTP de `docs/DEPLOY.md`
4. **RESTRINGIR** CORS a dominios específicos
5. **ACTIVAR** RLS con políticas basadas en auth
6. **AGREGAR** CSP headers al frontend

### 1.9 Data Engineer

**Evaluación:** ⭐⭐⭐ (3/5)

**Fortalezas:**
- Schema SQL bien diseñado con relaciones claras
- pgvector para embeddings (384 dims) — buena elección
- Función `match_documents` para búsqueda vectorial
- engagement_rate calculado automáticamente (GENERATED ALWAYS AS)

**Debilidades:**
- **Sin ETL pipeline:** Los datos de métricas se recolectan manualmente
- **Sin data validation a nivel de DB:** Solo CHECK constraints básicos
- **Sin particionamiento:** `metrics` puede crecer indefinidamente
- **Sin backup automatizado más allá de Supabase default**
- **IVFFlat index con `lists = 100`:** Asume 10K+ rows, puede ser subóptimo para datasets pequeños

**Recomendaciones:**
1. Implementar cron de recolección de métricas (Edge Function scheduled)
2. Agregar CHECK constraints más estrictos (status values, format values)
3. Considerar HNSW index en lugar de IVFFlat para mejor performance
4. Implementar particionamiento por fecha en `metrics` cuando crezca
5. Crear vistas materializadas para dashboards

### 1.10 Machine Learning Engineer

**Evaluación:** ⭐⭐⭐ (3/5)

**Fortalezas:**
- Pipeline RAG completo: chunking → embeddings → vector search → contexto
- Multi-agente con roles diferenciados (estratega, creativo, crítico)
- Fallback automático entre proveedores IA
- Temperaturas diferenciadas por agente (0.3 crítico, 0.9 creativo)

**Debilidades:**
- **Sin evaluación de calidad de embeddings:** No se mide si el RAG realmente mejora las respuestas
- **Chunking fijo (~500 tokens):** No adapta al contenido (un PDF técnico vs un copy corto)
- **Sin re-ranking:** La búsqueda vectorial devuelve los N más similares sin re-ordenar
- **Sin feedback loop:** No se usa el feedback del usuario para mejorar prompts
- **extractProposal() con regex:** Fragil, debería usar structured output o JSON mode

**Recomendaciones:**
1. Implementar evaluación de RAG (precision@k, recall@k)
2. Hacer chunking adaptativo basado en estructura del documento
3. Agregar re-ranking con cross-encoder
4. Implementar prompt versioning y A/B testing
5. Usar structured output (JSON mode) en lugar de regex parsing

### 1.11 QA Automation Engineer

**Evaluación:** ⭐⭐ (2/5)

**Fortalezas:**
- Vitest configurado con 21 tests
- Testing Library para componentes React
- jsdom como entorno de test

**Debilidades:**
- **Sin tests de Edge Functions:** El backend no tiene tests
- **Sin tests de integración:** No hay tests que verifiquen el flujo completo
- **Sin tests E2E:** No hay Playwright/Cypress
- **Cobertura desconocida:** No hay reporte de cobertura
- **Sin tests de regresión visual:** No hay screenshot comparison

**Recomendaciones:**
1. Crear tests para Edge Functions con `deno test`
2. Implementar tests de integración con Supabase local
3. Agregar Playwright para E2E tests
4. Configurar coverage report con Vitest
5. Crear test suite para el flujo completo: upload → process → search

### 1.12 Database Administrator (DBA)

**Evaluación:** ⭐⭐⭐ (3/5)

**Fortalezas:**
- Schema normalizado con foreign keys
- CASCADE deletes en relaciones padre-hijo
- RLS habilitado (aunque con políticas abiertas)
- Índice IVFFlat para búsqueda vectorial
- TIMESTAMPTZ para timestamps con timezone

**Debilidades:**
- **Sin índices en columnas frecuentemente consultadas:** `status`, `session_id`, `proposal_id`
- **Sin connection pooling configurado:** Supabase tiene PgBouncer pero no se explicita
- **Sin vacuum strategy:** pgvector puede fragmentarse
- **Sin monitoring de queries lentas**
- **`text` vs `varchar`:** Usa `text` everywhere, lo cual es correcto en PostgreSQL pero no tiene constraints de longitud

**Recomendaciones:**
1. Crear índices en columnas de filtro frecuente (`status`, `session_id`, `created_at`)
2. Configurar connection pooling en Supabase
3. Implementar pg_cron para vacuum automático
4. Crear vistas para queries complejas frecuentes
5. Agregar constraints de CHECK para valores de enum (status, format)

---

## 2. ANÁLISIS DE PRODUCTO Y GESTIÓN

### 2.1 Product Manager

**Evaluación:** ⭐⭐⭐ (3/5)

**Fortalezas:**
- Visión clara: "Estratega Digital Autónoma" — sistema que aprende y ejecuta solo
- Buyer personas bien definidos (8 perfiles argentinos)
- Roadmap por etapas con dependencias claras
- MVP bien acotado: extensión + backend + dashboard

**Debilidades:**
- **Sin métricas de éxito del producto:** ¿Qué define que el MVP fue exitoso?
- **Sin validación de mercado:** No hay evidencia de que los 8 buyer personas necesiten esto
- **Feature creep latente:** El scope original incluye "gestor de interacciones automáticas", "generador multiformato", etc.
- **Sin pricing strategy:** ¿Es gratis? ¿Freemium? ¿Suscripción?
- **Sin análisis competitivo:** ¿Qué hace Hootsuite, Buffer, Later que esto no?

**Recomendaciones:**
1. Definir métricas de éxito: "10 usuarios activos en 30 días post-lanzamiento"
2. Validar con 3-5 emprendedores argentinos antes de construir más
3. Recortar scope: MVP = extensión + 1 agente funcional (no 3)
4. Investigar competencia y definir diferenciador claro
5. Definir modelo de negocio antes de construir features avanzadas

### 2.2 Product Owner

**Evaluación:** ⭐⭐⭐ (3/5)

**Fortalezas:**
- Backlog organizado por etapas (0-6)
- Priorización por impacto (alto/medio/bajo)
- Criterios de aceptación implícitos en las tareas

**Debilidades:**
- **Sin user stories formales:** Las tareas son técnicas, no centradas en usuario
- **Sin Definition of Done:** ¿Cuándo se considera "completada" una tarea?
- **Sin sprint planning:** No hay iteraciones definidas
- **Sin retrospectivas:** No hay proceso de mejora continua
- **Dependencia de una sola persona (Pablo):** Sin distribución de trabajo

**Recomendaciones:**
1. Convertir tareas técnicas en user stories: "Como emprendedor, quiero..."
2. Definir DoD: tests pasando, documentado, deployado, revisado
3. Implementar sprints de 1 semana con planning y retro
4. Crear acceptance criteria explícitos para cada story

### 2.3 Scrum Master / Agile Coach

**Evaluación:** ⭐⭐ (2/5)

**Observación:** No hay proceso ágil implementado. El trabajo es secuencial (waterfall disfrazado).

**Fortalezas:**
- Documentación como fuente de verdad
- Registro de avances con fechas

**Debilidades:**
- Sin ceremonies (daily, planning, review, retro)
- Sin timeboxing
- Sin velocity tracking
- Sin burndown/burnup charts

**Recomendaciones:**
1. Implementar sprints de 1 semana mínimo
2. Hacer daily async (actualizar estado en un canal)
3. Hacer review al final de cada sprint (demo)
4. Hacer retro para identificar mejoras de proceso

### 2.4 UX Researcher

**Evaluación:** ⭐⭐ (2/5)

**Fortalezas:**
- 8 buyer personas con dolores y deseos definidos
- Tono argentino directo — muestra conocimiento del mercado

**Debilidades:**
- **Sin investigación de usuarios real:** Los buyer personas son asumidos, no validados
- **Sin user interviews:** No hay evidencia de conversaciones con usuarios reales
- **Sin user testing:** Nadie probó el producto excepto el desarrollador
- **Sin journey maps:** No hay mapas de experiencia del usuario
- **Sin análisis de tareas:** ¿Qué tareas críticas realiza el usuario?

**Recomendaciones:**
1. Entrevistar a 5 emprendedores argentinos reales
2. Hacer user testing con la extensión Chrome (observar uso real)
3. Crear journey maps para los 3 buyer personas principales
4. Implementar analytics para entender comportamiento real

### 2.5 UX Designer

**Evaluación:** ⭐⭐⭐ (3/5)

**Fortalezas:**
- shadcn/ui proporciona consistencia visual automáticamente
- Navegación lateral clara con rutas definidas
- Empty states diseñados (Bóveda vacía, Mesa sin sesiones)
- Responsive (sm:grid-cols-2, lg:grid-cols-4)

**Debilidades:**
- **Sin flujo de onboarding:** El usuario llega y no sabe qué hacer primero
- **Sin guía contextual:** No hay tooltips ni tours
- **Feedback insuficiente:** "Los mensajes de los agentes aparecerán aquí cuando el backend esté conectado"
- **Sin confirmación de acciones destructivas:** Delete de documentos no pide confirmación
- **Configuración confusa:** Sliders de temperatura sin contexto de qué significan

**Recomendaciones:**
1. Crear onboarding wizard (3 pasos: subir docs → configurar agentes → primer diálogo)
2. Agregar tooltips en configuración de agentes
3. Implementar confirmación en acciones destructivas
4. Crear guía interactiva para nuevos usuarios

### 2.6 UI Designer

**Evaluación:** ⭐⭐⭐⭐ (4/5)

**Fortalezas:**
- Dark theme profesional y moderno
- Iconografía consistente (Lucide icons)
- Jerarquía visual clara (títulos bold, subtítulos muted)
- Cards con hover states
- Badges para estados

**Debilidades:**
- **Sin design system documentado:** No hay tokens de diseño formales
- **Sin responsive testing:** Solo clases Tailwind, no se verificó en dispositivos reales
- **Sin animaciones/transiciones:** UX estática
- **Sin microinteracciones:** No hay feedback visual en acciones

**Recomendaciones:**
1. Documentar design system (colores, espaciado, tipografía)
2. Testear en dispositivos reales (mobile, tablet)
3. Agregar transiciones sutiles en cards y botones
4. Implementar skeleton loaders consistentes

### 2.7 UX Writer

**Evaluación:** ⭐⭐⭐ (3/5)

**Fortalezas:**
- Copy en español argentino directo
- Tono profesional pero accesible
- Placeholders útiles ("Ej: Cómo delegar sin perder control...")

**Debilidades:**
- **Sin microcopy consistente:** Algunos mensajes son formales, otros coloquiales
- **Sin error messages útiles:** "Error al subir: {message}" — poco accionable
- **Sin empty states con CTA:** "No hay documentos aún" debería sugerir "Subir documento"
- **Sin tooltips explicativos**

**Recomendaciones:**
1. Crear guía de tono y voz para toda la app
2. Reescribir error messages con acciones concretas
3. Mejorar empty states con CTAs claros
4. Agregar tooltips en features avanzadas

### 2.8 Localization Manager

**Evaluación:** ⭐⭐⭐ (3/5)

**Fortalezas:**
- Extensión Chrome con i18n (es/en/pt_BR)
- Frontend en español argentino (mercado objetivo)

**Debilidades:**
- **Sin i18n en frontend:** Hardcoded en español
- **Sin soporte para otros mercados:** Solo Argentina
- **Fechas hardcodeadas:** `toLocaleDateString("es-AR")` — no configurable

**Recomendaciones:**
1. Para MVP, mantener solo español (priorizar features)
2. Implementar react-i18n cuando se expanda a otros mercados
3. Hacer las fechas configurables por locale

### 2.9 Delivery Manager

**Evaluación:** ⭐⭐ (2/5)

**Fortalezas:**
- Deploy automático en push a `main`
- Documentación como fuente de verdad

**Debilidades:**
- Sin proceso de QA pre-deploy
- Sin staging environment
- Sin feature flags
- Sin rollback strategy
- Sin release notes

**Recomendaciones:**
1. Implementar PR reviews antes de merge a main
2. Crear environment de staging
3. Agregar feature flags para features experimentales
4. Crear workflow de release con changelog automático

---

## 3. ANÁLISIS COMERCIAL Y CRECIMIENTO

### 3.1 Growth Manager

**Evaluación:** ⭐⭐ (2/5)

**Fortalezas:**
- Producto con potencial viral (extensión Chrome compartible)
- Nicho claro: emprendedores argentinos
- Costo $0 permite escalar sin fricción

**Debilidades:**
- **Sin estrategia de adquisición:** ¿Cómo llegan los usuarios?
- **Sin funnel definido:** ¿Install → Activate → Retain?
- **Sin métricas de growth:** No hay tracking de installs, DAU, retention
- **Sin referral mechanism**
- **Sin contenido de marketing**

**Recomendaciones:**
1. Crear funnel: Landing → Install → Onboard → Activate → Retain
2. Implementar analytics básico (Mixpanel/Amplitude free tier)
3. Crear contenido de valor (blog, reels) que muestre la extensión
4. Implementar referral program simple ("compartí y desbloqueá features")

### 3.2 ASO Specialist (App Store Optimization)

**Evaluación:** ⭐⭐⭐ (3/5) — Para Chrome Web Store

**Fortalezas:**
- Nombre descriptivo: "MejoraINSSIST — Instagram Assistant"
- Descripción clara con keywords relevantes
- Iconos en múltiples resoluciones

**Debilidades:**
- **Sin keywords research:** No se optimizó para búsqueda en Chrome Web Store
- **Sin screenshots de la extensión:** Chrome Web Store requiere screenshots
- **Sin video demo**
- **Sin reviews/ratings strategy**

**Recomendaciones:**
1. Investigar keywords populares en Chrome Web Store para Instagram tools
2. Crear screenshots profesionales (mínimo 3)
3. Agregar video demo de 30 segundos
4. Implementar prompt de review post-uso

### 3.3 Performance Marketing Manager

**Evaluación:** N/A — Prematuro

**Observación:** No hay presupuesto para marketing pagado en fase MVP.

**Recomendación:** Cuando haya product-market fit, considerar:
- Instagram Ads (irónico pero efectivo para este público)
- Google Ads para keywords "herramienta Instagram emprendedores"
- Partnerships con coaches de negocios argentinos

### 3.4 SEO Specialist

**Evaluación:** ⭐⭐ (2/5)

**Fortalezas:**
- Landing page en subdominio propio
- robots.txt configurado

**Debilidades:**
- **Sin meta tags en landing:** No hay og:image, og:description
- **Sin structured data**
- **Sin sitemap**
- **Contenido mínimo en landing**

**Recomendaciones:**
1. Agregar meta tags completos en landing page
2. Crear sitemap.xml
3. Implementar structured data (SoftwareApplication schema)
4. Crear blog con contenido de valor para SEO

### 3.5 Business Development Manager

**Evaluación:** ⭐⭐ (2/5)

**Oportunidades:**
- Partnerships con coaches de negocios argentinos
- Integración con herramientas existentes (Notion, Trello)
- White-label para agencias de marketing
- Marketplace de templates de contenido

**Recomendaciones:**
1. Identificar 5 potenciales partners estratégicos
2. Crear programa de beta testers con emprendedores
3. Explorar integración con herramientas populares del ecosistema

### 3.6 Account Manager / Content Manager / Community Manager

**Evaluación:** N/A — Prematuro

**Observación:** Estos roles aplican post-lanzamiento cuando haya usuarios activos.

---

## 4. ANÁLISIS DE OPERACIONES, LEGAL Y ANÁLISIS

### 4.1 Business Intelligence Analyst

**Evaluación:** ⭐⭐ (2/5)

**Fortalezas:**
- Dashboard con métricas básicas (documentos, diálogos, propuestas, calendario)
- Tabla de métricas con engagement_rate calculado

**Debilidades:**
- **Sin datos reales:** Todo muestra 0 o "pendiente"
- **Sin KPIs definidos:** ¿Qué métricas importan para el negocio?
- **Sin reporting automático**
- **Sin cohort analysis**

**Recomendaciones para post-MVP:**
1. Definir North Star Metric (ej: "posts generados por usuario por semana")
2. Implementar dashboard con datos reales
3. Crear reporte semanal automático
4. Implementar cohort analysis (retención por semana de registro)

### 4.2 Data Scientist

**Evaluación:** ⭐⭐ (2/5)

**Oportunidades:**
- Análisis de sentimiento de comentarios de Instagram
- Predicción de engagement basado en contenido
- Clustering de buyer personas por comportamiento
- Optimización de horarios de publicación

**Recomendaciones para post-MVP:**
1. Implementar análisis de sentimiento con HF RoBERTa
2. Crear modelo predictivo de engagement
3. Implementar A/B testing de hooks y CTAs

### 4.3 Legal & Compliance Officer

**Evaluación:** ⭐ (1/5)

**🚨 RIESGOS LEGALES:**

| Riesgo | Severidad | Descripción |
|---|---|---|
| Instagram ToS | 🔴 ALTO | La extensión inyecta código en Instagram — puede violar Términos de Servicio |
| GDPR/LGPD | 🟠 ALTO | No hay política de privacidad, no se informa qué datos se recopilan |
| API usage | 🟡 MEDIO | El uso de APIs de IA puede tener restricciones de uso comercial |
| Derechos de autor | 🟡 MEDIO | El contenido generado por IA — ¿quién tiene los derechos? |

**Recomendaciones:**
1. Revisar Instagram ToS respecto a extensiones y automatización
2. Crear política de privacidad y términos de uso
3. Informar al usuario qué datos se recopilan y cómo se usan
4. Definir propiedad del contenido generado por IA

### 4.4 Data Protection Officer (DPO)

**Evaluación:** ⭐ (1/5)

**Hallazgos:**
- No hay política de privacidad
- No hay consentimiento informado para procesamiento de datos
- Los documentos de la "Bóveda" se procesan y almacenan sin encriptación adicional
- No hay mecanismo de eliminación de datos (derecho al olvido)
- No hay registro de actividades de tratamiento

**Recomendaciones:**
1. Crear política de privacidad básica
2. Implementar consentimiento en la extensión
3. Agregar función de "eliminar todos mis datos"
4. Documentar qué datos se procesan y por cuánto tiempo

### 4.5 Customer Success Manager

**Evaluación:** N/A — Prematuro

**Recomendación para post-lanzamiento:**
1. Implementar onboarding automatizado
2. Crear base de conocimiento/FAQ
3. Implementar chat de soporte (Intercom free tier)
4. Medir NPS (Net Promoter Score)

### 4.6 Technical Support (Tier 1, 2 & 3)

**Evaluación:** N/A — Prematuro

**Recomendación:**
1. Crear FAQ con problemas comunes
2. Implementar logging de errores para diagnóstico
3. Crear canal de soporte (Discord/Telegram)

### 4.7 Revenue Operations (RevOps)

**Evaluación:** N/A — Prematuro

**Observación:** No hay modelo de negocio definido.

**Preguntas a responder:**
- ¿Es gratis? ¿Freemium? ¿Suscripción?
- ¿Qué features son premium?
- ¿Cuál es el precio objetivo?
- ¿Cuál es el CAC (Customer Acquisition Cost) aceptable?

---

## 5. PLAN OPTIMIZADO POR ETAPAS

### ETAPA 0: Seguridad y Limpieza (INMEDIATO — 1 día)
**Prioridad:** 🔴 CRÍTICO

| # | Tarea | Responsable | Tiempo |
|---|---|---|---|
| 0.1 | Rotar credenciales expuestas (Supabase, FTP) | Pablo | 30 min |
| 0.2 | Eliminar `.env` del historial de git (git filter-branch) | Pablo | 30 min |
| 0.3 | Eliminar credenciales FTP de `docs/DEPLOY.md` | Pablo | 15 min |
| 0.4 | Restringir CORS a dominios específicos | Dev | 30 min |
| 0.5 | Agregar CSP headers al frontend | Dev | 30 min |
| 0.6 | Revisar y restringir RLS policies | Dev | 1 hora |

### ETAPA 1: Activar Backend (1-2 días)
**Dependencia:** ETAPA 0 completa

| # | Tarea | Estado | Notas |
|---|---|---|---|
| 1.1 | Resolver PostgREST schema cache | ❌ | Reiniciar proyecto Supabase o usar CLI |
| 1.2 | Configurar API keys (Groq, DeepSeek, HF) | 🔲 | En Supabase Secrets |
| 1.3 | Deploy Edge Functions (3 funciones) | 🔲 | `supabase functions deploy` |
| 1.4 | Health check end-to-end | 🔲 | Verificar tablas + functions + storage |
| 1.5 | Crear índices en DB (status, session_id) | 🔲 | Performance |

### ETAPA 2: Conectar y Probar (2-3 días)
**Dependencia:** ETAPA 1 completa

| # | Tarea | Notas |
|---|---|---|
| 2.1 | Corregir `getContextDocs()` para usar búsqueda vectorial real | Fix crítico |
| 2.2 | Probar Bóveda end-to-end (upload → process → search) | |
| 2.3 | Probar Mesa de Diálogo end-to-end (tema → debate → propuesta) | |
| 2.4 | Conectar Configuración a tabla `agent_config` | |
| 2.5 | Implementar error handling global | |
| 2.6 | Tests de integración | |

### ETAPA 3: UX y Polish (3-4 días)
**Dependencia:** ETAPA 2 completa

| # | Tarea | Notas |
|---|---|---|
| 3.1 | Onboarding wizard (3 pasos) | UX crítico |
| 3.2 | Confirmación en acciones destructivas | |
| 3.3 | Loading skeletons consistentes | |
| 3.4 | Error boundary global | |
| 3.5 | Mejorar empty states con CTAs | |
| 3.6 | Laboratorio funcional (subir media → propuestas) | |

### ETAPA 4: Publicador y Calendario (1 semana)
**Dependencia:** ETAPA 3 completa

| # | Tarea | Notas |
|---|---|---|
| 4.1 | CRUD de calendario editorial | |
| 4.2 | Sistema de aprobación previa | |
| 4.3 | Cron job de publicación (Edge Function) | |
| 4.4 | Instagram Graph API (requiere Meta credentials) | Dependencia externa |

### ETAPA 5: Monitor de KPIs (1 semana)
**Dependencia:** ETAPA 4 completa

| # | Tarea | Notas |
|---|---|---|
| 5.1 | Instagram Insights API | Requiere Business Account |
| 5.2 | Recolección periódica de métricas | |
| 5.3 | Dashboard con datos reales | |
| 5.4 | Análisis de rendimiento con IA | |

### ETAPA 6: Bucle de Aprendizaje (1-2 semanas)
**Dependencia:** ETAPA 5 completa

| # | Tarea | Notas |
|---|---|---|
| 6.1 | Tracking de métricas por post | |
| 6.2 | Reglas de éxito automáticas | |
| 6.3 | Sugerencias proactivas | |
| 6.4 | Gestor de interacciones | Baja prioridad |

### ETAPA 7: Escala y Monetización (post-MVP)
**Dependencia:** ETAPA 6 completa o paralela

| # | Tarea | Notas |
|---|---|---|
| 7.1 | Supabase Auth (login/register) | |
| 7.2 | Definir modelo de negocio | |
| 7.3 | Implementar analytics (Mixpanel) | |
| 7.4 | Crear landing page optimizada | |
| 7.5 | Programa de beta testers | |
| 7.6 | Documentar design system | |

---

## 6. TIMELINE CONSOLIDADO

```
ETAPA 0  → 1 día (seguridad) — INMEDIATO
ETAPA 1  → 1-2 días (activar backend)
ETAPA 2  → 2-3 días (conectar y probar)
ETAPA 3  → 3-4 días (UX y polish)
ETAPA 4  → 1 semana (publicador)
ETAPA 5  → 1 semana (KPIs)
ETAPA 6  → 1-2 semanas (aprendizaje)
ETAPA 7  → post-MVP (escala)

Total MVP funcional: ~3-4 semanas desde ETAPA 0
Total sistema completo: ~6-8 semanas desde ETAPA 0
```

---

## 7. DOCUMENTACIÓN CONSOLIDADA

Toda la documentación del proyecto reside en `docs/DOCUMENTACION.md`.
Los archivos en `docs/` son LEGACY (solo lectura).

**Instrucción:** Cuando el usuario diga **"documentar"**, actualizar `docs/DOCUMENTACION.md` con los trabajos realizados.

---

*Análisis generado el 24/04/2026 — MejoraSM v3.1*
