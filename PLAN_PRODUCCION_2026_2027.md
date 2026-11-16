# PLAN MAESTRO DE EVOLUCIÓN Y PUESTA EN PRODUCCIÓN — MejoraSM (2026–2027)

> **Documento Interno de Ingeniería, Producto y Operaciones (Runbook para Agente Autónomo)**  
> **Última auditoría empírica:** 16 de Noviembre de 2026  
> **Repositorio:** `c:\github\MejoraSM` (rama `main`, HEAD en `572c177` + Sprint S+24 sin commitear)  
> **Dominio objetivo:** `https://mejorasm.mejoraok.com/app/` (SPA) + Supabase (`hsglmdarztrshihmzfph`) + Zernio API + CRM `MejoraContactos` (`contactos-api`)

---

## 0. INSTRUCCIONES DE REANUDACIÓN PARA EL AGENTE AUTÓNOMO

Si retomás el trabajo en este repositorio para llevar **MejoraSM** hasta **producción real**, seguí este protocolo estricto:

1. **Verificá el estado vivo antes de asumir nada:**
   - Corré `git status`, `npx tsc -b`, `npm run lint` y `npm test`.
   - No asumas que el código documental (`README.md`, `AGENTS.md`, `INFORME_*`) coincide con el código ejecutable: **la única fuente de verdad es el código fuente actual y sus salidas de comando**.
2. **Respetá la Constitución Verbal y Visual de Mejora Continua (`AGENTS.md`):**
   - **Nunca a la persona:** el foco siempre es el sistema, el proceso o los acuerdos; jamás la capacidad del dueño o su equipo.
   - **Calidez con verdad:** franqueza respetuosa sin humo gurú ni motivación vacía.
   - **No se vende por precio:** cero descuentos ni "gratis" como gancho principal.
   - **Un solo marco:** 4 Dimensiones (*Personal, Organizacional, Comercial, Empresarial*) + *Profesionalización* + *Sociales*.
   - **Estética Suiza:** 80%+ blanco (`#FFFFFF`), Azul `#1A3D84`, Rojo `#E1061E`, Amarillo `#F7CC13`, barra tricolor institucional.
3. **Trabajá fase por fase (`F0 -> F5`) con commits atómicos verificados:**
   - Ninguna fase se marca completada sin `npx tsc -b`, `npm run lint` (0 errores), `npm test` (100% verde) y prueba de integración/UI real del flujo modificado.
4. **Seguridad y Secretos:**
   - Nunca commitees `.env`, tokens ni API keys reales. Cualquier clave sensible va en Supabase Secrets, GitHub Actions Secrets o variables locales fuera de control de versiones.

---

## 1. AUDITORÍA HONESTA DEL TRABAJO REALIZADO (S+1 A S+24)

### 1.1. Lo que SÍ se logró construir y tiene alto valor real
Entre los Sprints **S+1 y S+24** se edificó un núcleo rico de motores deterministas de consultoría B2B y herramientas de ingeniería:
- **Motores de Dominio Puros (`src/domain/`):** `gridGenerator.ts`, `steppsValidator.ts`, `framingEngine.ts`, `fatigaAudienceDetector.ts`, `prospectoSla.ts`, `prospectoStateMachine.ts`, `leadScoringEngine.ts`, `brandVoiceLinterEngine.ts`, `copyExperimentSimulator.ts`, `formatRecommender.ts`, `linkedinThreadEngine.ts`, `reelScriptEngine.ts`, `contentTransmutationEngine.ts`, `contentRoiEngine.ts`, `executiveDiagnosticEngine.ts`, `meetingDossierEngine.ts`, `scopeAgreementEngine.ts`, `customerSuccessEngine.ts`, `executiveOperationsMemoEngine.ts`, `pipelineCsvExporterEngine.ts` (RFC 4180 + anti-formula injection), `kickoffBlueprintEngine.ts`, `trenchCoyunturaEngine.ts`, `inactionCostEngine.ts`, `objectionMatrixEngine.ts`, `managementAutonomyEngine.ts`.
- **Generadores PDF 1.4 Vectoriales Nativos (`src/services/*PdfGenerator.ts`):** 8 generadores soberanos A4 y Carrusel LinkedIn (595.28×841.89 pt y 1080×1350 pt) con estética suiza y 0 dependencias externas pesadas.
- **Visión Local e Ingesta:** `localFaceDetector.ts` (detección facial YCbCr/RGB sin APIs externas), `driveSync.ts` con hashing SHA-256.
- **Infraestructura Local Resiliente:** servidor `node:http` (`src/interfaces/http/server.ts` + `router.ts` + `crmRoutes.ts`) con compresión `br/gzip`, rate limiter, SQLite WAL, patrón Outbox transaccional con leases, `daemonSupervisor.ts` y prueba de caos determinista (`src/test/chaos.test.ts`).
- **Base Cloud preexistente (Supabase + Scripts):** 28 migraciones SQL (`supabase/migrations/001..028`), 11 Edge Functions (`supabase/functions/`), plantillas HTML/Playwright (`templates/`) y scripts de automatización (`scripts/`).

### 1.2. Brechas Críticas Reales que Hoy Impiden Ir a Producción (Verificadas en Disco)

| Severidad | Hallazgo Verificado | Evidencia Exacta en el Repo | Impacto en Producción |
| :---: | :--- | :--- | :--- |
| **BLOQUEANTE P0** | **Autenticación desactivada en `App.tsx`** | `src/App.tsx` no envuelve las rutas con `<AuthGate>` (pese a existir `src/components/AuthGate.tsx`, `Login.tsx`, `ResetPassword.tsx` y `signOut()` en `AppSidebar.tsx`). | Cualquier persona en Internet que abra la URL desplegada accede sin contraseña al panel admin. |
| **BLOQUEANTE P0** | **19 Workflows de GitHub Actions eliminados** | El commit `55e8a64` (16-Oct-2026) borró `.github/workflows/*` (`ci.yml`, `deploy-site.yml`, `deploy-functions.yml`, `publish-scheduled-posts.yml`, `autopilot-cron.yml`, `inbox-sync-cron.yml`, `metrics-collector-cron.yml`, `manage-post.yml`, `publish-now.yml`, etc.). La carpeta `.github/workflows` **no existe**. | Los botones de `Monitor.tsx` y `PublishNowCard.tsx` (`github.triggerWorkflow(...)`) fallan con 404. No hay CI, ni deploy automático, ni crons de publicación/métricas/inbox. |
| **BLOQUEANTE P0** | **Esquizofrenia Arquitectónica (2 Backends desconectados)** | `TableroSemanal.tsx`, `useProposals.ts` y `localSMService.ts` operan sobre `localStorage` + `http://127.0.0.1:4002` (SQLite), mientras `MesaDialogo.tsx`, `Conversaciones.tsx`, `Monitor.tsx`, `Boveda.tsx` y `scripts/` esperan Supabase + Edge Functions. `.env` local ni siquiera tiene `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`. | En hosting estático (GitHub Pages), `127.0.0.1:4002` no existe para el usuario remoto; y sin `.env` Supabase, `/conversaciones` muestra mocks (`LOCAL_MOCK_INBOX_ITEMS`) y la Mesa IA no funciona. |
| **BLOQUEANTE P0** | **68 errores ESLint + Bug Funcional `<OutboxDrawer />`** | `npm run lint` falla con 68 errores y 1 warning. En `src/pages/TableroSemanal.tsx`, `OutboxDrawer` (línea 21) y `outboxDrawerOpen` (atajo `[O]`) están declarados, **pero `<OutboxDrawer />` nunca se renderiza en JSX**. | Pipeline CI bloqueado si corre `npm run lint`, y la tecla `[O]` de supervisión Outbox no abre nada visualmente. |
| **ALTA P1** | **Sprint S+24 sin commitear** | `git status` muestra `managementAutonomyEngine.ts`, `managementAutonomyPdfGenerator.ts`, `ManagementAutonomyModal.tsx`, sus 3 `.test.*` y cambios en `Conversaciones.tsx` y `TableroSemanal.tsx` en working tree sin commit. | Riesgo de pérdida o divergencia respecto a `origin/main` (`572c177`). |
| **ALTA P1** | **Canal LinkedIn bloqueado en el despachador local** | `src/infrastructure/posting/zernioDispatcher.ts:93` lanza explícitamente error si `post.canal === 'linkedin'`, y `postingDaemon.ts` solo envía `mediaItems: [{ type: "image", url }]` con fallback estático `foto_default.jpg`. | Contradice la propuesta B2B de S+7/S+8/S+10 (carruseles PDF y Thought Leadership en LinkedIn). |
| **ALTA P1** | **Endpoint roto en panel de atribución en vivo** | `TableroSemanal.tsx:55` y `router.ts:539` apuntan a `http://127.0.0.1:4002/api/prospectos`, pero `src/interfaces/http/crmRoutes.ts` expone `/api/crm/prospectos` y `/api/crm/lead`. | El botón `"Probar Conversión Real"` golpea HTTP 404 contra el servidor local de MejoraSM. |
| **ALTA P1** | **Saturación de UI, Carga de Bundle y Flakiness en Tests** | `TableroSemanal.tsx` acumula 11 botones en cabecera; `Conversaciones.tsx` acumula 9-11 botones por tarjeta (`ThreadCard`) e importa de forma síncrona múltiples modales pesados (~154 kB chunk), causando timeout/retry flaky bajo carga paralela en `Conversaciones.test.tsx:56` (`501/502` tests en suite completa bajo carga; `17/17` aislado). Además, `/mesa` y `/citas` no están en `AppSidebar.tsx`, y `Dashboard.tsx`, `Propuestas.tsx` (`RecycleTab`) y `Auditoria.tsx` no tienen ruta activa en `App.tsx`. | Alta fricción cognitiva para el operador, duplicación de captura entre modales, tests frágiles en CI y pérdida de acceso visual a módulos críticos (Copiloto, Salud Token Meta, Ads, Insights). |
| **MEDIA P2** | **Modelos IA de Edge Functions y Reels básicos** | Edge Functions (`orchestrator`, `inbox`, `copilot`, `ads`, `recycle`) fijan `claude-sonnet-5`/`claude-opus-5`/`openai/gpt-oss-120b` y tienen `gemini` apagado en `pickModel()`. `scripts/render-reel.mjs` produce solo videos mudos Ken Burns de 9s sin subtítulos ni integración con `TeleprompterStudio`. | Oportunidad perdida en video corto B2B con subtítulos automáticos y en aprovechamiento de Gemini 3.8 para razonamiento estructurado. |

---

## 2. ACTUALIZACIÓN ESTRATÉGICA A TENDENCIAS 2026–2027 (B2B SOCIAL & AGENTIC AI)

Para que MejoraSM no salga a producción con un playbook de 2024, el producto y su motor de contenidos deben alinearse con los cambios estructurales reales de 2026–2027 en LinkedIn, Instagram/Meta, Search y Agentic Go-To-Market:

1. **Del Alcance Viral al "Depth Score" y Anti-AI-Slop (LinkedIn & Meta 2026–2027):**
   - **Realidad del algoritmo:** Los clasificadores semánticos y OCR de LinkedIn penalizan el *"AI slop"* (listas genéricas sin postura ni experiencia verificable), el *engagement bait* (*"Comentá PDF"*, hashtag-stuffing) y los enlaces salientes en el cuerpo del post. Priorizan **Saves (Guardados)**, **Dwell Time (tiempo de lectura)** y **Topical Authority** sostenida.
   - **Acción en MejoraSM:**
     - Incorporar un **Anti-AI-Slop & Specificity Gate** en `orchestrator` y `brandVoiceLinterEngine.ts`: exigir al menos 1 evidencia concreta de trinchera (dato operativo, caso de la Bóveda `03_experiencia`, o mecanismo accionable) y penalizar frases cliché LLM o engagement bait.
     - Diseñar carruseles PDF document-post optimizados para **OCR e indexación semántica** y para ser **guardados** por directores PyME.

2. **Founder-Led Media & Personal Profiles > Company Pages:**
   - **Realidad:** Las páginas corporativas promedian ~2–4% de alcance orgánico; la confianza B2B se construye desde perfiles personales de referentes/fundadores (ej. Pablo Eckert) con voz humana y criterio técnico.
   - **Acción en MejoraSM:** Habilitar publicación real vía Zernio hacia cuenta personal de LinkedIn (`ZERNIO_LINKEDIN_ACCOUNT_ID`) y distinguir en `MesaDialogo` / `TableroSemanal` entre **Voz Institucional (`mejoraok`)** y **Voz Founder-Led (Pablo)**.

3. **Zero-Click Content + Dark Social + GEO/AEO Social Search:**
   - **Realidad:** LinkedIn, Instagram y TikTok actúan como buscadores y fuentes de respuesta IA (**GEO / Answer Engine Optimization**). Los compradores leen todo dentro del feed (*Zero-Click*) y convierten en canales privados (*Dark Social*: DM / WhatsApp), no en formularios web fríos.
   - **Acción en MejoraSM:** Mantener enlace externo fuera del cuerpo del post; acompañar cada pieza con **palabras clave semánticas naturales** en caption + subtítulos + láminas, y orientar el CTA hacia micro-conversiones por DM o WhatsApp con autodiagnóstico 4D trazable.

4. **Video Corto "No-Sound Ready" (Subtítulos Quemados + Hook en 3s):**
   - **Realidad:** El consumo móvil en feeds B2B ocurre mayormente sin sonido en los primeros segundos. Clips auténticos estilo talking-head o pizarra comentada superan a renders corporativos fríos.
   - **Acción en MejoraSM:** Evolucionar `scripts/render-reel.mjs` y `TeleprompterStudio` para soportar generación de subtítulos `.srt`/`.ass` sincronizados y quemado (`burn-in` vía `ffmpeg`) con tipografía institucional `Bw Modelica` + hook visual en `[00:00-00:03]`.

5. **Agentic Workflows & WhatsApp CRM Bidireccional (Human-in-the-Loop):**
   - **Realidad:** Las respuestas lentas o genéricas destruyen conversión. La frontera 2026–2027 une señales sociales -> RAG sobre la Bóveda -> calificación automática -> borrador contextual -> **aprobación humana en 1 clic** -> registro trazable en CRM con contexto completo (documento PDF adjunto, dolor, objeción).
   - **Acción en MejoraSM:** Unificar la ficha de cada lead en `/conversaciones` con un **Expediente Vivo de Prospecto** sincronizado con `MejoraContactos` (`contactos-api`), manteniendo siempre el control humano antes de enviar mensajes externos.

---

## 3. ARQUITECTURA OBJETIVO PARA PRODUCCIÓN (DECISIÓN ÚNICA Y CLARA)

Para terminar con la dualidad actual, la arquitectura recomendada de producción es **Cloud-First Unificada con Fallback Local Transparente**:

- **Frontend SPA (`mejorasm.mejoraok.com/app/`):** React + Vite protegido obligatoriamente por `<AuthGate>` (Supabase Auth compartido con `app_admins`). En `npm run dev` local mantiene bypass controlado para desarrollo rápido si corresponde, nunca en builds de producción (`import.meta.env.PROD`).
- **Base de Datos y Estado Operativo Canónico:** **Supabase PostgreSQL + RLS (`is_app_admin()`)** como única fuente de verdad para `proposals`, `dialogue_sessions`, `inbox_items`, `metrics`, `success_rules`, `documents`, `doc_chunks`, `content_experiments`, `run_log`.
  - *Rol de SQLite Local (`src/interfaces/http/server.ts`):* Pasa a ser explícitamente un **Adaptador/Mirror de Desarrollo Offline o Daemon Runner local**, nunca una base divergente invisible para la web de producción. Se debe mostrar un badge inequívoco en UI (`Modo Cloud Producción` vs `Modo Local SQLite` vs `Modo Demo Offline`) para garantizar **cero falsos positivos**.
- **Orquestación IA y RAG:** Supabase Edge Functions actualizadas con router multi-modelo soportando **Gemini (incluyendo perfil High Reasoning)** + **Anthropic** + **Groq** mediante Structured Outputs (`JSON`), timeouts acotados y trazabilidad completa en `run_log`.
- **Pipeline Visual & Distribución Multicanal:** GitHub Actions (`.github/workflows/`) restaurados + `scripts/*` ejecutando Playwright (`templates/`) + `ffmpeg` (Reels subtitulados) + `Zernio API` (Instagram, Facebook, LinkedIn Feed/Carrusel, WhatsApp).
- **CRM de Destino:** `src/services/contactosService.ts` enviando leads enriquecidos a `contactos-api` con SLA, scoring, arquetipo e historial del diagnóstico/argumentario aplicado.

---

## 4. PLAN REVISADO DE EJECUCIÓN HACIA PRODUCCIÓN (`F0` A `F5`)

### FASE F0 — Cierre de S+24, Higiene Total y Corrección de Bugs P0 *(Estimado: 1–2 sesiones)*
**Objetivo:** Dejar el repositorio limpio, con 0 errores de Lint/TS y sin bugs silenciosos antes de conectar producción.
- [ ] **F0.1 — Commitear Sprint S+24 y sincronizar informes:** Revisar y commitear `managementAutonomy*` + actualizaciones en `INFORME_*` (o consolidar aquí) tras validar sus tests.
- [ ] **F0.2 — Cero errores ESLint (`npm run lint` = 0 errors, 0 warnings):** Limpiar los 68 errores actuales (imports sin usar en modales, eliminar `any` explícitos en `router.ts`, `Monitor.tsx`, `Configuracion.tsx`, `ProposalDetailDialog.tsx`, manejar `catch` vacíos).
- [ ] **F0.3 — Reparar `<OutboxDrawer />` en `TableroSemanal.tsx`:** Montar `<OutboxDrawer isOpen={outboxDrawerOpen} onClose={() => setOutboxDrawerOpen(false)} />` y agregar botón visible + atajo `[O]` funcional.
- [ ] **F0.4 — Restaurar `<AuthGate>` y Rutas Completas en `App.tsx` + `AppSidebar.tsx`:**
  - Envolver rutas privadas con `<AuthGate>` cuando `!DEV` (o flag explícito).
  - Incorporar `/mesa` (`MesaDialogo`), `/citas` (`CitasStudio`), `/tablero-ejecutivo` (rescatar `Dashboard.tsx` / Copiloto / Salud Token Meta / Insights / Ads), `/reciclado` (`RecycleTab`) y `/auditoria` (`Auditoria.tsx`) con navegación clara en `AppSidebar.tsx`.
- [ ] **F0.5 — Corregir rutas CRM y transparencia de modo Offline/Demo:**
  - Corregir `NUCLEO_API_URL` en `TableroSemanal.tsx` y `router.ts` hacia `/api/crm/prospectos` o variable de entorno `VITE_CRM_API_URL`.
  - Agregar banner visible en `Conversaciones.tsx` y `TableroSemanal.tsx` cuando se muestran mocks (`LOCAL_MOCK_INBOX_ITEMS` o `localStorage` sin Supabase conectado).

### FASE F1 — Rediseño UX "Progressive Disclosure" & Expediente Consultivo Unificado *(Estimado: 1–2 sesiones)*
**Objetivo:** Eliminar la fatiga cognitiva de 11 botones planos por pantalla y conectar los 12+ motores de consultoría B2B entre sí.
- [ ] **F1.1 — Crear contexto compartido `ProspectContext` / Estado de Caso B2B:** Si el operador abre Diagnóstico A4 para un lead de `/conversaciones`, ese nombre, empresa, dolor, facturación estimada y arquetipo quedan precargados si luego abre Costo de Inacción, Objeciones, Propuesta B2B o Kickoff 30D.
- [ ] **F1.2 — Refactorizar `Conversaciones.tsx` (`ThreadCard`) con `React.lazy`:** Cargar los modales consultivos bajo demanda (`lazy()` + `Suspense`) para aligerar el chunk de `/conversaciones` (eliminar flakiness por timeout en CI/`Conversaciones.test.tsx`) y reemplazar los 9 botones horizontales de herramientas por 3 acciones directas (**Redactar / IA**, **Enviar a CRM**, **Abrir Toolkit Consultivo ▾**) agrupado en un Dropdown/Drawer ordenado por etapa comercial:
  1. *Evaluar & Cuantificar:* Diagnóstico A4 · Calculadora Costo Inacción · Caso de Éxito de Pares
  2. *Preparar & Destrabar:* Dossier Reunión 1 a 1 · Matriz Objeciones (Voss/Maister)
  3. *Cerrar & Implantar:* Acuerdo Propuesta B2B · Onboarding Kickoff 30D · Autonomía Mandos TRM
- [ ] **F1.3 — Refactorizar `TableroSemanal.tsx` (Cabecera):** Agrupar herramientas ejecutivas (*Memo Socios Grove*, *Exportar CSV/Sheets*, *Auditar Tono MC*, *Radar Coyuntura*, *Calculadoras/Matrices*) bajo un menú **"Centro Ejecutivo ▾"** dejando visibles solo las acciones de flujo diario (*Aprobar Lote*, *Cola Outbox*, *Cargar/Descargar Semana*).
- [ ] **F1.4 — Rescatar y unificar KPIs Operativos:** Evitar fragmentación entre `Dashboard.tsx` y `Monitor.tsx`; asegurar que el **aviso de vencimiento de token Meta (~60 días)**, el **Copiloto diario**, los **Insights** y los **Ads** sean visibles en la navegación real.

### FASE F2 — Unificación de Persistencia (Supabase Cloud + Local Mirror) y Soporte Multi-Canal Real *(Estimado: 2 sesiones)*
**Objetivo:** Que aprobar/agendar/editar una propuesta en `TableroSemanal` dispare el flujo real hacia publicación en Supabase + Zernio (IG, FB y **LinkedIn**).
- [ ] **F2.1 — Adaptador Dual Transparente en `proposalsService` / `useProposals.ts`:**
  - Cuando Supabase esté configurado y autenticado: leer y mutar `proposals` en Supabase PostgreSQL (con backup/cache optimista en React Query).
  - Cuando corra en modo Local Soberano (`VITE_USE_LOCAL_BACKEND=true`): hablar con `server.ts` (`127.0.0.1:4002`) y SQLite Outbox.
  - Sincronizar el esquema canónico de 3/4 pasos (`PropuestaMejoraSMDTO`) con la tabla `proposals` (migración `029_*` si hace falta almacenar `borradores`, `tratamiento_visual` o `stepps_score`).
- [ ] **F2.2 — Habilitar LinkedIn & Carruseles PDF en Todo el Pipeline:**
  - Levantar el bloqueo de `'linkedin'` en `src/infrastructure/posting/zernioDispatcher.ts` y agregar mapeo en `postingDaemon.ts`.
  - Soportar `mediaItems` múltiples (arrays de imágenes para carrusel IG/FB o documento PDF / carrusel en LinkedIn según soporte de Zernio API `/v1/posts` y `/v1/media/upload-direct`).
  - Incorporar soporte explícito de perfil **Founder-Led vs Company Page** y validación Zero-Click en `publish-scheduled-posts.mjs`.
- [ ] **F2.3 — Validación de `contactos-api` (MejoraCRM):** Confirmar contrato HTTP en producción con `https://tzatuvxatsduuslxqdtm.supabase.co/functions/v1/contactos-api`, clave `VITE_CONTACTOS_API_KEY` si la requiere, y registrar evento en `inbox_items` + métricas atribuidas reales en `Monitor.tsx`.

### FASE F3 — Actualización IA 2026–2027 (Gemini + Anti-AI-Slop + Video Subtitulado) *(Estimado: 1–2 sesiones)*
**Objetivo:** Llevar la calidad de contenido y automatización al estándar real 2026–2027.
- [ ] **F3.1 — Actualizar `callAI` y `pickModel` en Edge Functions (`orchestrator`, `inbox`, `copilot`, `recycle`, `ads`):**
  - Configurar proveedor **Gemini** moderno (configurable por env/tabla `agent_config`, p. ej. modelos Gemini vigentes vía `GEMINI_API_KEY` + fallback a Anthropic/Groq) con soporte de salida JSON estructurada.
  - Inyectar automáticamente las reglas aprendidas (`success_rules`) y los documentos de la Bóveda (`doc_chunks`) en `orchestrator` e `inbox`.
- [ ] **F3.2 — Anti-AI-Slop & Specificity Gate (2026–2027):**
  - Añadir a `brandVoiceLinterEngine.ts` y al prompt del agente Crítico validación anti-slop (detectar muletillas genéricas LLM, *engagement bait* como *"Comentá X"*, exceso >3 hashtags, links en cuerpo de LinkedIn) y puntaje de **Guardabilidad / Profundidad (Save-Worthiness)**.
- [ ] **F3.3 — Pipeline de Video Corto "No-Sound Ready":**
  - Extender `scripts/render-reel.mjs` y `reelScriptEngine.ts` para generar archivo de subtítulos `.srt`/`.ass` con las líneas cronometradas y quemar subtítulos legibles (`Bw Modelica` / caja de alto contraste `#1A3D84` / `#FFFFFF`) mediante `ffmpeg`, cumpliendo consumo mobile sin audio y social search (GEO).

### FASE F4 — Restauración de CI/CD & Automatización en GitHub Actions y Supabase *(Estimado: 1 sesión)*
**Objetivo:** Reconstruir la columna vertebral automatizada que se borró en el commit `55e8a64`.
- [ ] **F4.1 — Crear `.github/workflows/ci.yml`:** En cada push/PR a `main`: `npx tsc -b`, `npm run lint`, `npm test`, `npm run chaos` y `npm run build` (con `VITE_BASE_PATH=/app/`).
- [ ] **F4.2 — Crear `.github/workflows/deploy-site.yml`:** Build con secrets reales (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_CONTACTOS_API_URL`, `VITE_BASE_PATH=/app/`) y deploy a GitHub Pages (`mejorasm.mejoraok.com/app/`), integrando también `scripts/deploy.sh` o `deploy-functions.yml` y `deploy-migrations.yml` para Supabase.
- [ ] **F4.3 — Restaurar Workflows Operativos Limpios (o Crons Serverless):**
  - `publish-scheduled-posts.yml` (cada 15-30 min: render Playwright + commit imagen + dispatch Zernio).
  - `autopilot-cron.yml` (Lun/Mié/Vie con email de veto Resend y flag de activación controlada).
  - `inbox-sync-cron.yml` (cada 3h: llama Edge Function `inbox`).
  - `metrics-collector-cron.yml` & `rule-engine-cron.yml` (cada 6h / diario: métricas + aprendizaje).
  - `sync-history.yml`, `manage-post.yml`, `manage-story.yml`, `mark-manual.yml`, `publish-now.yml`, `reel.yml` (reestableciendo el contrato exacto con `Monitor.tsx` y `PublishNowCard.tsx`).

### FASE F5 — Certificación E2E Pre-Producción y Go-Live *(Estimado: 1 sesión)*
**Objetivo:** Certificar con evidencia real cada componente antes de dar el alta operativa.
- [ ] **F5.1 — Verificación de Secretos e Infraestructura Externa (Checklist Humano + Agente):**
  - Supabase Secrets configurados: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `HF_API_KEY`, `ZERNIO_API_KEY`, `GITHUB_TOKEN` (fine-grained con `Contents: R/W` + `Actions: R/W`).
  - GitHub Secrets configurados: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ZERNIO_API_KEY`, `ZERNIO_INSTAGRAM_ACCOUNT_ID`, `ZERNIO_FACEBOOK_ACCOUNT_ID`, `ZERNIO_LINKEDIN_ACCOUNT_ID`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`.
  - Usuario admin verificado en tabla `app_admins` de Supabase Auth.
  - Cuentas conectadas y activas en Zernio (IG Business, FB Page, LinkedIn Perfil/Página).
- [ ] **F5.2 — Suite de Certificación Completa + Smoke Test E2E en Browser (Playwright):**
  - `npx tsc -b` (0 errores)
  - `npm run lint` (0 errores, 0 warnings)
  - `npm test` (100% suites verdes)
  - `npm run chaos` (1.000 ciclos, 0 duplicados, 0 huérfanos)
  - `npm run build` (build de producción limpio con `VITE_BASE_PATH=/app/`)
  - Recorrido Playwright real sobre todas las rutas con login (`AuthGate`), generación en `MesaDialogo`, revisión/aprobación en `TableroSemanal`, consulta de `OutboxDrawer` / `Monitor`, flujo de leads en `Conversaciones` -> CRM y validación visual responsive (desktop 1440px + mobile 390px).
- [ ] **F5.3 — Prueba Controlada en Producción Real (Canary):**
  - Sincronización real de Inbox y Métricas en `run_log` sin errores.
  - Despacho controlado de 1 pieza aprobada en canal real (verificando ID devuelto por Zernio y actualización a `published` en Supabase sin duplicados).

---

## 5. MATRIZ DE CHECKLIST GO-LIVE (DEFINICIÓN DE HECHO DE PRODUCCIÓN)

MejoraSM se considera **EN PRODUCCIÓN COMPLETA** únicamente cuando se cumplan las 10 condiciones simultáneamente:
1. Acceso web en `https://mejorasm.mejoraok.com/app/` protegido por `<AuthGate>` y usuario en `app_admins`.
2. Cero warnings de variables faltantes en consola de producción; `.env` de producción y Secrets de GitHub/Supabase sincronizados.
3. `npm run lint`, `npx tsc -b`, `npm test`, `npm run chaos` y `npm run build` pasando al 100% en CI (`.github/workflows/ci.yml`).
4. Navegación completa y coherente en `AppSidebar` (desktop + mobile) incluyendo Tablero, Mesa de Diálogo, Conversaciones, Bóveda, Subir Material, Calendario, Monitor, Copiloto/Dashboard y Citas.
5. UX simplificada: Toolkit Consultivo agrupado por etapa con Expediente compartido de prospecto y `<OutboxDrawer />` operativo.
6. Persistencia unificada sin silencios ni falsos positivos: cualquier estado offline/demo está rotulado claramente.
7. Edge Functions activas y probadas con Gemini / Anthropic / Groq + RAG vectorial de la Bóveda + Anti-AI-Slop Gate.
8. Publicación automatizada funcionando extremo a extremo para Instagram, Facebook y **LinkedIn** (feed + carruseles), más Reels con subtítulos quemados.
9. Flujo Conversaciones -> Lead Scoring -> `contactos-api` (MejoraCRM) -> Auditoría SLA 48h validado con un lead de prueba real marcado `is_test` o limpiado tras validar.
10. Monitoreo operativo sin regresiones durante 48 horas de crons (inbox, métricas, publicación programada y alerta preventiva de tokens Meta).

---

## 6. ANEXO TÉCNICO ACCIONABLE (MAPA EXACTO PARA ARRANCAR `F0` Y `F2`)

### 6.1. Inventario Exacto de Deuda ESLint Detectada (68 errores + 1 warning)
Para dejar `npm run lint` en 0 errores en `F0.2`:
- **Imports/variables sin usar (`@typescript-eslint/no-unused-vars`):**
  - `src/components/CustomerSuccessSection.tsx` (`TrendingUp`, `ArquetipoCaso`)
  - `src/components/ExecutiveDiagnosticModal.tsx` (`ArrowRight`)
  - `src/components/ExecutiveMemoModal.tsx` (`Building2`, `Layers`, `ArrowRight`, `Briefcase`, `Users`)
  - `src/components/FormatRecommenderCard.tsx` (`canonicalTipoFormato`)
  - `src/components/InactionCostModal.tsx` (`TrendingDown`, `Layers`, `ArrowRight`)
  - `src/components/LeadScoringBadge.tsx` (`Badge`, `ShieldAlert`)
  - `src/components/LinkedInThreadPreview.tsx` (`Download`, `ChevronDown`, `ChevronUp`, `LinkedInComment`, `index`)
  - `src/components/ManagementAutonomyModal.tsx` (`Layers`, `Clock`, `ShieldCheck`, `ChevronRight`, `TrendingUp`)
  - `src/components/MeetingDossierModal.tsx` (`Building2`)
  - `src/components/ObjectionMatrixModal.tsx` (`PhoneCall`, `ChevronRight`)
  - `src/components/OutboxDrawer.tsx` (`Send`, `ExternalLink`)
  - `src/components/ReactiveHookModal.tsx` (`Layers`, `Video`, `ArrowRight`, `HelpCircle`, `TrendingUp`)
  - `src/components/ScopeAgreementModal.tsx` (`Briefcase`)
  - `src/components/SlaAuditSection.tsx` (`Share2`, `Sparkles`, `ProspectoSlaCalculado`)
  - `src/components/TeleprompterStudio.tsx` (`Maximize2`, `Minimize2`, `Volume2`, `ChevronRight`, `themeMode`, `setThemeMode`)
  - `src/domain/executiveDiagnosticEngine.ts` (`i`), `fatigaAudienceDetector.ts` (`maxSemana`), `prospectoSla.ts` (`totalAtendidos`), `src/hooks/useDialogue.ts` (`mode`)
  - `src/infrastructure/imaging/localFaceDetector.ts` (`count`) y `__tests__/localFaceDetector.test.ts` (`detectFacesLocally`, `TargetAspectRatio`)
  - `src/services/executiveDiagnosticPdfGenerator.ts` (`col3W`), `inactionCostPdfGenerator.ts` (`wrapText`), `meetingDossierPdfGenerator.ts` (`lineY` -> `const`, `colObj2W`)
  - `src/pages/TableroSemanal.tsx` (`OutboxDrawer`, `outboxDrawerOpen` — **se resuelve montando el componente en F0.3**)
- **Tipos `any` / bloques vacíos / hooks (`no-explicit-any`, `no-empty`, `react-hooks/exhaustive-deps`):**
  - `src/interfaces/http/router.ts` (líneas 608, 628)
  - `src/pages/Configuracion.tsx` (líneas 88 `no-empty`, 100 `any`)
  - `src/pages/Monitor.tsx` (líneas 94, 114 `any`, 134 `no-empty`)
  - `src/components/ProposalDetailDialog.tsx` (líneas 516 `useEffect` deps, 764 y 1058 `any`)

### 6.2. Mapeo de Esquema Supabase `proposals` -> `PropuestaMejoraSMDTO` (para `F2.1`)
Segun `src/integrations/supabase/types.ts`, la tabla `proposals` ya contiene:
- Campos directos: `id`, `title`, `hook`, `body`, `cta`, `hashtags`, `format`, `status` (`pending` | `scheduled` | `published` | `rejected`), `scheduled_at`, `published_at`, `rejection_reason`, `rendered_image_path`, `zernio_post_id`, `oferta`, `dimension`, `buyer_persona`, `is_test`, `session_id`, `metadata` (`Json | null`).
- Estrategia sin fricción: Alojar en `proposals.metadata` los campos estructurados del modelo canónico (`propuesta_id`, `canal_destino`, `borrador_seleccionado`, `borradores`, `tratamiento_visual`, `stepps_evaluacion`, `utm_url`) para no romper `render-scheduled-posts.mjs` ni `orchestrator/index.ts`, manteniendo un único adaptador en `useProposals.ts`.

### 6.3. Contratos Externos a Preservar en `F4` (`.github/workflows/`)
- `Monitor.tsx` dispara `manage-post.yml` (`proposal_id`, `platform`, `action`, `confirmacion`), `manage-story.yml` (`post_id`, `platform`, `action`, `confirmacion`) y `mark-manual.yml` (`post_id`, `platform`) vía Edge Function `repo`.
- `PublishNowCard.tsx` dispara `publish-now.yml` y lee/pollea `content/work/publish-now.json`.
- `scripts/deploy.sh` referencia `project_id` de `supabase/config.toml` (`hsglmdarztrshihmzfph`) y las 11 funciones (`orchestrator`, `vault-process`, `metrics-collector`, `rule-engine`, `copilot`, `classify-photo`, `insights`, `repo`, `inbox`, `recycle`, `ads`).
