# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan de cierre del proyecto — `MEJORASM.md` y `PLAN_AUTONOMIA.md`

`MEJORASM.md` (raíz del repo): informe técnico y roadmap priorizado que mide cada pieza del repo contra la fórmula ya probada de Stories (generar con IA → renderizar → publicar solo → trackear). `CLAUDE.md` y `EDA.md` documentan cómo funciona lo que ya existe; `MEJORASM.md` documentaba qué faltaba y en qué orden (edición 2026-07-30).

`PLAN_AUTONOMIA.md` (raíz del repo, agregado 2026-08-02): plan de ejecución **bloqueado** con checklist por fase para cerrar exactamente lo que `MEJORASM.md` dejó pendiente, hacia un objetivo más estricto que el original — **autonomía total, sin gate de aprobación humana previo a publicar** (el control pasa a ser posterior: cancelar/despublicar, no aprobar antes). Léelo antes de tocar el flujo de Propuestas/publicación — sus 7 fases ya están todas implementadas y deployadas (detalle en la sección siguiente); el propio archivo tiene el estado fase por fase, actualizado a medida que se cierra cada una. Sus "reglas de bloqueo" dicen que el alcance no se reabre por conversación suelta, solo editando ese archivo.

## Estado del EDA — actualizado 2026-08-02

El EDA está **reactivado y funcional de punta a punta**. Informe técnico completo (arquitectura, pantallas, Edge Functions, modelo de datos, seguridad): **`EDA.md`** en la raíz del repo — léelo antes de tocar `src/` o `supabase/`.

Resumen de lo resuelto el 2026-07-30 (el schema llevaba desde el 2026-07-28 sin aplicarse contra la base real — ver detalle en `EDA.md` sección 9):

- Schema completo (`001` a `006`) corrido a mano contra `hsglmdarztrshihmzfph`, evitando el CLI de Supabase (sigue roto, ver "Bug conocido del CLI" más abajo).
- RLS real activo — confirmado, no es un supuesto.
- Dos bugs de producción encontrados y corregidos: URL de HuggingFace mal escrita (rompía embeddings/RAG) y mismatch de tipos en `match_documents` (rompía la búsqueda RAG).
- El acceso admin (RLS y Edge Functions) se controla hoy por una sola fuente de verdad, la tabla `app_admins`. **Confirmado en vivo (2026-07-30, `SELECT email FROM app_admins`):** la tabla real solo tiene `pabloeckert@gmail.com` — el email ficticio `pablo@mejoraok.com` que había sembrado una sesión anterior de Claude Code como placeholder **no está** en la tabla, pese a que la migración `006_real_rls_and_auth.sql` lo siembra por default; alguien ya lo sacó a mano contra la base real en algún momento posterior. No confiar en ese email ficticio ni enviarle nada si aparece en algún archivo del repo — la tabla real es la que manda.

**Bug conocido del CLI (sigue sin resolverse):** `supabase db push` / `deploy-migrations.yml` fallan siempre con un error opaco del motor "Effect" del CLI (no es un problema del SQL — ver [issue #5091](https://github.com/supabase/cli/issues/5091) y [issue #4363](https://github.com/supabase/supabase/issues/4363), ninguno concluyente). Workaround encontrado y verificado: `supabase db query --linked "<SQL>"` ejecuta contra la base real sin pasar por ese motor — usarlo (o el SQL Editor del dashboard) para cualquier cambio de schema futuro, no `db push`.

**Otras cosas pendientes, menor prioridad:**
- CI (`ci.yml`) sigue en rojo — 68 errores de lint preexistentes (`@typescript-eslint/no-explicit-any` mayormente), sin relación con el EDA. No bloquea nada (no hay branch protection en `main`) pero conviene limpiarlo en algún momento.

### Overhaul de autonomía — 2026-08-02 (`PLAN_AUTONOMIA.md`)

Pablo pidió pasar de "autonomía con gate humano" (aprobar/agendar antes de publicar) a **autonomía total**: una propuesta aprobada por el Crítico se agenda y publica sola; el control humano es posterior (cancelar antes de que salga, o despublicar/corregir después). Las 7 fases de `PLAN_AUTONOMIA.md` están implementadas y deployadas:

- **Posts de feed sin gate**: `orchestrator` agenda solo una propuesta con `format` `post` o `carrusel` (elige oferta por rotación de menor uso + un horario espaciado 24h del último) — ya no pasa por "Aprobar"/"Agendar". Solo `historia` sigue sin pipeline y queda en `pending` para gestión manual. `Propuestas.tsx` es ahora el monitor: botón "Cancelar" en Programadas, y `scripts/manage-post.mjs` + `.github/workflows/manage-post.yml` (mismo patrón que `manage-story.yml`, pero contra `proposals` de Supabase en vez de `historial.json`) para reintentar/despublicar algo ya publicado.
- **Cron real para `rule-engine`/`metrics-collector`**: `.github/workflows/rule-engine-cron.yml` (diario) y `metrics-collector-cron.yml` (cada 6h) — antes ninguna de las dos tenía disparador. Probados en vivo con `workflow_dispatch` (HTTP 200 reales).
- **Dashboard cubre posts de feed**: `sync-history.mjs` ya no adivina la imagen de un post por fecha (podía pisarse entre varios posts el mismo día) — usa `proposals.rendered_image_path` directo. El monitor de reversión (cancelar/despublicar) también aparece ahí para posts de feed.
- **Calendario Editorial** (`src/pages/Calendario.tsx`) pasó a ser **de solo lectura** sobre `proposals.scheduled_at` — se sacó el diálogo "Nuevo evento", que escribía en `calendar_events` sin relación real con lo que se publicaba. Agendar/cancelar de verdad vive en `/propuestas`.
- **Biblioteca Paso 3**: se mergeó la rama `biblioteca-de-contenido` (tenía un commit + un stash con la subida de fotos sin terminar de integrar) — subida real de fotos a `content/inbox/<dimensión>/` vía API de GitHub ya integrada y deployada (detalle en la sección de hub/biblioteca/dashboard más abajo).
- **Carruseles**: `render-scheduled-posts.mjs` genera hasta 4 slides para `format='carrusel'` (hook + cuerpo dividido en oraciones + cta, una foto por slide si hay disponibles) y `publish-scheduled-posts.mjs`/`scripts/lib/zernio.mjs` mandan `mediaItems` múltiples a Zernio.

De paso se encontraron y corrigieron dos bugs reales preexistentes (no relacionados con el overhaul en sí):
- Mesa de Diálogo estaba **rota desde antes** — los 3 agentes tenían configurado un modelo de Groq (`meta-llama/llama-4-scout-17b-16e-instruct`) que ya no existe. Corregido a `llama-3.3-70b-versatile` en `orchestrator`/`ai-gateway` y en la tabla `agent_config` real.
- `metrics-collector` filtraba por `instagram_post_id` (columna legacy que ya no escribe nadie) en vez de `zernio_post_id` (lo que llena el pipeline actual) — nunca iba a encontrar nada.

**Pendiente, todo bloqueado por necesitar acción directa de Pablo (no algo resoluble sin su sesión/credenciales):**
- Borrar la función `publisher` — bloqueado por el clasificador de seguridad del entorno (acción destructiva en producción), igual que antes.
- Verificar en vivo el circuito completo (auto-agenda → render → publish real vía Zernio) — dispararlo por API está bloqueado por el mismo clasificador (publica contenido real sin revisión previa). Hay que disparar un tema real desde Mesa de Diálogo en la app.
- Probar el commit real de una foto en Biblioteca — necesita el PAT de Pablo en su propio navegador.
- `metrics-collector` no va a traer datos reales hasta que exista el secret de Supabase `INSTAGRAM_ACCESS_TOKEN` (trámite de Meta for Developers, no de código) — sin él, el cron corre pero es un no-op explícito.

## Qué es este repo

Un solo producto: **MejoraSM**, para la marca MejoraOK. Cinco piezas; solo la primera usa Supabase, las demás son estáticas o corren por GitHub Actions:

1. **EDA (Estratega Digital Autónoma)** — SaaS de gestión de contenido con IA: `src/` (React) + `supabase/` (Edge Functions + Postgres). Informe técnico completo en **`EDA.md`** (raíz del repo). Requiere login (Supabase Auth) — ver sección de auth abajo.
2. **Sistema de story diaria autónoma** — `scripts/` (Node/ESM), corre por GitHub Actions. Lee fotos de `content/inbox/<oferta>/`, genera el copy llamando directo a la API de Anthropic, renderiza la pieza de marca y publica en Instagram/Facebook vía Zernio.
3. **Hub de contenido** — `hub/index.html`, página estática para subir fotos a `content/inbox/<oferta>/` sin tocar git a mano.
4. **Biblioteca de contenido** — `biblioteca/`, página estática (sin build) para cargar, etiquetar y organizar el contenido que alimenta el sistema de stories. En desarrollo (ver sección propia abajo).
5. **Dashboard / Monitor de stories** — `dashboard/index.html`, panel de solo lectura sobre lo publicado/programado por el sistema de stories.

`hub/`, `biblioteca/`, `dashboard/` y el build del EDA se despliegan juntos como un único sitio de GitHub Pages (ver Deploy).

(Nota histórica: hubo un producto separado, una extensión de Chrome llamada MejoraInstaStories/MejoraINSSIST, que vivió en `extension/` y en varios duplicados en la raíz. Se discontinuó y se eliminó del repo por completo — quedó superada por el sistema de story diaria + hub descriptos arriba.)

## Comandos principales

```bash
npm run dev           # Vite dev server, app EDA (React), puerto 8080
npm run build          # Build de producción (dist/)
npm run preview        # Sirve el build de dist/ localmente
npm run lint           # ESLint (*.ts/*.tsx)
npm test               # Vitest (src/**/*.{test,spec}.{ts,tsx}, jsdom)
npm run test:watch     # Vitest en modo watch
```

Si `npm test` falla con `Cannot find package '@vitejs/plugin-react-swc'`, es que `node_modules` no tiene las devDependencies instaladas (falta `npm ci`/`npm install`) — no es un problema del código.

`.github/workflows/ci.yml` corre `npm ci --legacy-peer-deps`, lint, test y build en cada push/PR a `main` — usar `--legacy-peer-deps` si `npm ci` falla localmente por peer deps.

## Autenticación y seguridad (EDA)

Hasta 2026-07-28 el EDA no tenía ningún control de acceso: RLS con políticas `"Allow all" USING (true)`, cero login en el frontend, y las Edge Functions no validaban quién las llamaba — cualquiera con la anon key (pública en el bundle) tenía acceso total a los datos y podía disparar publicaciones reales a Instagram vía `publisher`. Esto se corrigió:

- **Frontend**: `src/components/AuthGate.tsx` envuelve las rutas en `src/App.tsx` — sin sesión de Supabase Auth, se muestra `src/pages/Login.tsx` (email/password, con alta de cuenta) en vez de la app. Sign-out en `AppSidebar.tsx`.
- **RLS**: `supabase/migrations/006_real_rls_and_auth.sql` reemplaza las 9 políticas "Allow all" por `is_app_admin()` — una función que valida el email del JWT contra la tabla `app_admins` (hoy, confirmado en vivo: solo `pabloeckert@gmail.com`, ver nota arriba). Mismo criterio para el bucket `vault` en Storage. Para dar acceso a alguien más, insertar su email en `app_admins` (no hay UI para esto todavía — usar `supabase db query --linked "INSERT INTO app_admins (email) VALUES ('...') ON CONFLICT (email) DO NOTHING;"`).
- **Edge Functions**: `supabase/functions/_shared/auth.ts` (`requireAuth`) — cada una de las 6 funciones exige un JWT válido de un email presente en `app_admins` (consultada con el service role, la misma tabla que usa `is_app_admin()` para el RLS), o la propia `SUPABASE_SERVICE_ROLE_KEY` como Bearer token para llamadas servidor-a-servidor (cron, otra función). Sin esto, responden 401/403. Hasta el 2026-07-30 esto se validaba contra un secret aparte `ADMIN_EMAILS` (con un default hardcodeado a `pablo@mejoraok.com` si no estaba seteado) — una auditoría externa marcó que eso creaba listas de admins que podían desincronizarse, así que se sacaron los dos y quedó `app_admins` como única fuente. Dar acceso a alguien nuevo hoy es un solo INSERT en esa tabla, ya no hace falta tocar también un secret.
- **`src/services/ai.ts`** arma el header `Authorization` en cada llamada con el `access_token` real de la sesión (`supabase.auth.getSession()`), no con la anon key pelada como antes. `src/services/supabase.ts` no necesitó cambios: al compartir el mismo `VITE_SUPABASE_URL`, su cliente lee la misma sesión persistida en `localStorage` que usa `src/integrations/supabase/client.ts`.

**Confirmado (2026-07-30):** el schema y `006_real_rls_and_auth.sql` ya están aplicados contra la base real — el RLS de admin está vigente en producción, no es un supuesto. Detalle de cómo se aplicó en `EDA.md` sección 9.

## Arquitectura: EDA (`src/` + `supabase/`)

Frontend Vite + React 18 + TypeScript + shadcn/ui + Tailwind + React Router (`HashRouter` — necesario para el subpath de GitHub Pages, ver Deploy) + TanStack Query. Alias `@` → `src/` (definido en `vite.config.ts`, `tsconfig.json` y `components.json`).

Páginas (`src/pages/`) y su rol:
- `Login` — email/password contra Supabase Auth, gatea todo lo demás (ver arriba)
- `Dashboard` — KPIs principales
- `Boveda` — bóveda de documentos de marca (RAG)
- `MesaDialogo` — mesa de diálogo multi-agente (debate Estratega/Creativo/Crítico)
- `Laboratorio` — laboratorio de contenido
- `Calendario` — de solo lectura desde el overhaul del 2026-08-02: refleja `proposals.scheduled_at`, no agenda nada (eso vive en Propuestas)
- `Propuestas` — desde el overhaul del 2026-08-02, monitor de lo que se agenda/publica solo (cancelar antes de publicar); solo `format='historia'` sigue con aprobación manual real
- `Configuracion` — configuración de agentes de IA

Hooks custom en `src/hooks/` (`useVault`, `useDialogue`, `useProposals`, `useMetrics`) llaman a `src/services/ai.ts` (invoca Edge Functions) y `src/services/supabase.ts` (CRUD directo). El cliente Supabase vive en `src/integrations/supabase/client.ts` y usa `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`). `src/components/ui/` es el set estándar de shadcn sin modificar; la UI propia está en `src/components/layout/` (AppSidebar, AppLayout).

Backend en `supabase/functions/` (Deno, Edge Functions), cada una con su propia allowlist de CORS (`util.mejoraok.com`, `mejorasm.vercel.app`, localhost) y con el guard de `_shared/auth.ts` (ver arriba):
- `ai-gateway` — gateway universal de IA (Groq, DeepSeek, Gemini, HuggingFace)
- `orchestrator` — orquesta el debate multi-agente (Estratega → Creativo → Crítico)
- `vault-process` — extrae texto/chunks/embeddings de documentos para RAG
- `rule-engine` — analiza métricas y genera reglas de éxito (cron diario real desde 2026-08-02, `.github/workflows/rule-engine-cron.yml`)
- `metrics-collector` — recolecta métricas de Instagram Insights (cron real cada 6h desde 2026-08-02, `.github/workflows/metrics-collector-cron.yml` — hoy es un no-op explícito porque falta el secret `INSTAGRAM_ACCESS_TOKEN`)

Se deployan con `.github/workflows/deploy-functions.yml` (push a `supabase/functions/**`, o manual con función específica) — usa `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF` como secrets del repo.

**No hay Edge Function `publisher`** (se retiró el 2026-07-30 — publicaba directo a la Graph API de Meta, nunca configurada ni invocada por nada). La publicación de posts de feed ya aprobados/agendados en `/propuestas` corre en GitHub Actions, no en Supabase — ver "Arquitectura: publicación autónoma de posts de feed (EDA)" más abajo. **Pendiente:** la función sigue `ACTIVE` en el proyecto real (`hsglmdarztrshihmzfph`) porque borrarla remoto quedó bloqueado por el clasificador de seguridad del entorno (acción destructiva sobre producción) — falta correr `supabase functions delete publisher --project-ref hsglmdarztrshihmzfph` a mano.

`supabase/migrations/`: schema SQL + pgvector, en orden `001` a `007` (nombres ya renumerados para que el orden alfabético coincida con el de ejecución real): `001_initial_schema.sql` → `002_policies_fix.sql` → `003_fix_postgrest.sql` → `004_indexes_constraints.sql` → `005_reconcile_status_constraints.sql` → `006_real_rls_and_auth.sql` (reemplaza el RLS abierto, ver sección de auth) → `007_feed_posts_render.sql` (agrega `oferta`/`rendered_image_path`/`zernio_post_id` a `proposals`, ver sección de publicación autónoma). Ya aplicadas contra la base real (2026-07-30) — ver "Bug conocido del CLI" arriba para cómo (no fue `supabase db push`, que sigue roto).

`scripts/deploy.sh` lee el `PROJECT_REF` de `supabase/config.toml` (antes tenía uno hardcodeado que no coincidía — corregido 2026-07-28).

## Arquitectura: publicación autónoma de posts de feed (EDA)

Mismo patrón que la story diaria (ver sección siguiente) aplicado al módulo de Propuestas del EDA. Agregado 2026-07-30 (porque antes una propuesta agendada no se publicaba nunca) y **rediseñado 2026-08-02** para sacar el gate de aprobación humana previa (ver "Overhaul de autonomía" arriba) — hoy una propuesta con `format` `post` o `carrusel` que el Crítico aprueba en Mesa de Diálogo pasa a `scheduled` **sola**, sin que nadie apriete "Aprobar"/"Agendar":

```
Mesa de Diálogo (Estratega → Creativo → Crítico) aprueba una propuesta
  → orchestrator la inserta en `proposals` YA con status='scheduled'
    (elige oferta por rotación de menor uso + scheduled_at espaciado 24h
    del último — ver AUTO-AGENDA en supabase/functions/orchestrator/index.ts)
  → .github/workflows/publish-scheduled-posts.yml (cron cada 15 min)
    → scripts/render-scheduled-posts.mjs
        - lee proposals vía REST de Supabase (status=scheduled, scheduled_at
          vencido, format in (post, carrusel))
        - post: 1 imagen con content/inbox/<proposals.oferta>/ + templates/post-template.html
          (1080x1080, fallback a variante solo-texto si no hay foto)
        - carrusel: hasta 4 slides (hook + cuerpo dividido en oraciones + cta),
          reusando el mismo template por slide, una foto distinta por slide si hay
        - guarda content/work/scheduled-posts.json (manifiesto, outputPaths es
          siempre un array — 1 elemento en post, varios en carrusel)
    → commit + push de las imágenes renderizadas (necesario para que
      raw.githubusercontent.com las sirva ANTES de publicarlas — mismo
      motivo por el que daily-story.yml también commitea antes de publicar)
    → scripts/publish-scheduled-posts.mjs
        - lee el manifiesto, publica vía scripts/lib/zernio.mjs
          (publishPost(), gemela de publishStory() con contentType "post" —
          acepta un array de imageUrl para carrusel, createPostAndPoll arma
          varios mediaItems)
        - marca la propuesta como publicada en Supabase (REST PATCH)
```

`proposals.oferta` (columna en `007_feed_posts_render.sql`) la elige `orchestrator` automáticamente — determina de qué carpeta de `content/inbox/` sale la foto. Corre en GitHub Actions y no como Edge Function de Supabase porque necesita Playwright para renderizar la imagen, que no puede correr en el runtime Deno sandboxed de las Edge Functions — la misma razón por la que la story diaria tampoco vive ahí.

**Monitor de reversión** (control humano posterior, no gate previo): mientras está `scheduled`, botón "Cancelar" en `/propuestas` (pestaña Programadas). Ya publicada: `.github/workflows/manage-post.yml` (`scripts/manage-post.mjs`, workflow_dispatch con `proposal_id` + plataforma + `reintentar`/`despublicar`, exige tipear `CONFIRMO`) — Instagram no soporta despublicar por API (limitación de Meta), Facebook sí.

**Fuera de alcance de este pipeline:** `format='historia'` — sin pipeline de publicación autónomo todavía, queda en `pending` para gestión manual en `/propuestas` igual que antes del overhaul.

## Arquitectura: story diaria autónoma (`scripts/`, `content/`, `templates/`)

Flujo (disparado por `.github/workflows/daily-story.yml`, cron diario + `workflow_dispatch` manual):

```
content/inbox/<oferta>/*.jpg  → scripts/generate-brief.mjs (Claude, vía scripts/lib/claude.mjs)
                               → content/work/briefs.json
                               → scripts/render-story.mjs (Playwright + templates/story-template.html)
                               → scripts/publish-story.mjs (scripts/lib/zernio.mjs → Instagram + Facebook)
                               → foto usada se mueve a content/used/<oferta>/
```

`content/inbox/` y `content/used/` tienen 5 subcarpetas, una por dimensión del Manual de Marca: `personal`, `organizacional`, `comercial`, `empresarial`, `profesionalizacion`. `generate-brief.mjs` orienta el copy según la carpeta de origen de la foto — la identidad de marca se trae en vivo en cada corrida desde el repo externo [MejoraIdentidad](https://github.com/pabloeckert/MejoraIdentidad) (`SKILL.md`), sin copia local en este repo. Videos en `inbox/` se detectan pero no se procesan todavía (se avisan en el log, no se pierden).

`generate-brief.mjs` frena sin generar nada si ya existe un `story-{hoy}-*.jpg` en `content/published/` — como mucho una corrida real por día, para no duplicar posts si el workflow se re-corre (pasó el 21/07). Reintentos de una plataforma puntual se hacen contra el post ya existente en Zernio, no re-corriendo el workflow completo.

`content/published/` guarda las imágenes ya renderizadas y publicadas (el workflow las commitea para que sean accesibles vía `raw.githubusercontent.com`, que es lo que consume la Graph API de Meta).

Gestión de posts ya publicados, todo por `workflow_dispatch` (no hay UI propia — el dashboard es de solo lectura):
- `.github/workflows/sync-history.yml` (`scripts/sync-history.mjs`, cron cada 6h) — trae el historial real desde Zernio a `content/log/historial.json`, la fuente que lee el dashboard. La imagen de cada post se deriva de `content/published/`, no de Zernio.
- `.github/workflows/manage-story.yml` (`scripts/manage-story.mjs`) — reintentar o despublicar un post existente por `post_id`. Nunca genera contenido nuevo ni llama a Claude; reintentar reusa la imagen/caption ya guardados en `historial.json`. Exige tipear literalmente `CONFIRMO` en el input o corta sin hacer nada.
- `.github/workflows/mark-manual.yml` (`scripts/mark-manual.mjs`) — registra en `content/log/acciones-manuales.json` que un post se gestionó a mano (ej. Instagram no soporta despublicar por API). No llama a Zernio ni usa sus secrets.

`ANTHROPIC_API_KEY` y las credenciales de Zernio (`ZERNIO_API_KEY`, `ZERNIO_FACEBOOK_ACCOUNT_ID`, `ZERNIO_INSTAGRAM_ACCOUNT_ID`) van como secrets del repo en GitHub Actions, no en `.env` local. Esta parte del repo no usa Supabase ni las Edge Functions del EDA — son dos caminos de publicación completamente separados.

## Arquitectura: hub, biblioteca, dashboard y EDA (GitHub Pages)

Las cuatro conviven en el **mismo sitio** de GitHub Pages (Pages en modo "workflow" solo sirve un artifact por sitio): `hub/` en la raíz, `dashboard/`, `biblioteca/` y el build del EDA (`dist/`) como subpaths (`/dashboard/`, `/biblioteca/`, `/app/`). Los cuatro workflows (`deploy-hub.yml`, `deploy-biblioteca.yml`, `deploy-dashboard.yml`, `deploy-eda.yml`) arman el mismo `_site/` combinado — cualquiera de los cuatro se dispara por push a su parte y republica el sitio entero (el EDA se buildea en los cuatro, ya que cualquiera puede disparar el republish). Si se edita la lógica de armado de `_site/` en uno, hay que replicarla en los otros tres o se pisan entre sí.

- **`hub/index.html`** — 5 tarjetas, una por oferta, que linkean directo a la UI de upload de GitHub (`github.com/.../upload/main/content/inbox/<oferta>`) para subir fotos a `content/inbox/<oferta>/` sin tocar git a mano. Dispara el flujo de story diaria en la próxima corrida del workflow. Deploy activo en **https://pabloeckert.github.io/MejoraSM/**.
- **`biblioteca/`** — interfaz para cargar, etiquetar y organizar el contenido que alimenta `content/inbox/`. Estado (ver `biblioteca/README.md`): Paso 1 (diseño) y Paso 2 (UI + interacción sobre datos de mentira en memoria, `seed-demo.js`) hechos; Paso 3 (persistencia real) **en curso, subida de fotos ya integrada y deployada (2026-08-02)** — `biblioteca/github.js` escribe al repo vía API de GitHub (PAT fine-grained guardado solo en `localStorage` del navegador, nunca commiteado). La lectura del repo público no necesita token; solo el commit (subir foto) lo usa. Todavía sin probar en vivo con un PAT real (necesita la sesión de navegador de Pablo). Pendiente, fuera de esta fase: persistir categorías/álbumes en JSON y el aprendizaje supervisado real.
- **`dashboard/index.html`** — monitor de solo lectura de las stories publicadas/programadas (lee `content/log/historial.json`). A pesar de que `dashboard/README.md` todavía dice "Pendiente (Fase 5)", ya está implementado y deployado — no confiar en ese README sin verificar `index.html`.
- **`src/` (EDA)** — deployado en `/app/` (**https://pabloeckert.github.io/MejoraSM/app/**). Requiere login (ver sección de auth). `vite.config.ts` usa `base: process.env.VITE_BASE_PATH || "/"` — en local/Vercel/Hostinger es `/`, en GitHub Pages es `/MejoraSM/app/` (seteado por los workflows de deploy).

## Deploy

- **`hub/` + `biblioteca/` + `dashboard/` + EDA (`/app/`)**: activo y confirmado en GitHub Pages, sitio combinado (ver sección de arriba). Es el único destino de deploy del EDA verificado end-to-end — se eligió porque no requiere credenciales nuevas (usa el mismo repo + Actions que ya existían) y es totalmente reversible.
- **EDA en Vercel/Hostinger**: **no confirmado, no usar sin decidirlo con Pablo.** `util.mejoraok.com` no resuelve DNS, `mejorasm.vercel.app` devuelve 404, y ningún workflow hace deploy FTP pese a que los secrets `FTP_HOST`/`FTP_USERNAME`/`FTP_PASSWORD` siguen en el repo (son residuo). `vercel.json` tiene config de build correcta por si en algún momento se conecta un proyecto Vercel real.
- **`supabase/functions/`**: `deploy-functions.yml` (push a `supabase/functions/**`, o manual).
- **`supabase/migrations/`**: `deploy-migrations.yml` existe (`supabase db push --linked --yes --debug`, manual) pero **sigue sin funcionar** por el bug del CLI — no usarlo. Para cambios de schema, usar `supabase db query --linked "<SQL>"` o el SQL Editor del dashboard (ver "Bug conocido del CLI" arriba). El schema actual ya está aplicado así contra la base real.
- **`publish-scheduled-posts.yml`** (posts de feed del EDA, cron cada 15 min + manual), **`metrics-collector-cron.yml`** (cada 6h) y **`rule-engine-cron.yml`** (diario): usan el secret de GitHub `SUPABASE_SERVICE_ROLE_KEY`, creado el 2026-08-02. Ojo si hay que regenerarlo: tiene que ser la API key nueva estilo `sb_secret_...` (Settings → API Keys del proyecto Supabase, no la legacy JWT de `service_role`) — la legacy JWT funciona contra PostgREST (`/rest/v1/...`, la usan los scripts) pero el gateway de Edge Functions (`/functions/v1/...`, lo usan los cron de arriba) la rechaza con 401. Reusa el secret `VITE_SUPABASE_URL` que ya existe como base URL.

## Variables de entorno

Definidas en `.env.example` (copiar a `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (frontend), `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `HF_API_KEY` (Edge Functions — se configuran como secrets en Supabase, no en `.env` local). El acceso admin ya no se gestiona por variable de entorno (ver sección de auth) — es un INSERT en la tabla `app_admins`.

## `backend/`

Stub vacío (solo `README.md`, sin código) para una fase futura del roadmap ("Fase 2", servidor multi-agente). No hay nada que correr ahí todavía.
