# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del EDA — actualizado 2026-07-30

El EDA está **reactivado y funcional de punta a punta**. Informe técnico completo (arquitectura, pantallas, Edge Functions, modelo de datos, seguridad): **`EDA.md`** en la raíz del repo — léelo antes de tocar `src/` o `supabase/`.

Resumen de lo resuelto el 2026-07-30 (el schema llevaba desde el 2026-07-28 sin aplicarse contra la base real — ver detalle en `EDA.md` sección 9):

- Schema completo (`001` a `006`) corrido a mano contra `hsglmdarztrshihmzfph`, evitando el CLI de Supabase (sigue roto, ver "Bug conocido del CLI" más abajo).
- RLS real activo — confirmado, no es un supuesto.
- Dos bugs de producción encontrados y corregidos: URL de HuggingFace mal escrita (rompía embeddings/RAG) y mismatch de tipos en `match_documents` (rompía la búsqueda RAG).
- `ADMIN_EMAILS` incluye la cuenta real del operador, `pabloeckert@gmail.com`. **`pablo@mejoraok.com` es una cuenta ficticia** que inventó una sesión anterior de Claude Code como placeholder — quedó en la allowlist por compatibilidad, pero no es una cuenta real, no confiar en ella ni enviarle nada.

**Bug conocido del CLI (sigue sin resolverse):** `supabase db push` / `deploy-migrations.yml` fallan siempre con un error opaco del motor "Effect" del CLI (no es un problema del SQL — ver [issue #5091](https://github.com/supabase/cli/issues/5091) y [issue #4363](https://github.com/supabase/supabase/issues/4363), ninguno concluyente). Workaround encontrado y verificado: `supabase db query --linked "<SQL>"` ejecuta contra la base real sin pasar por ese motor — usarlo (o el SQL Editor del dashboard) para cualquier cambio de schema futuro, no `db push`.

**Otras cosas pendientes, menor prioridad:**
- CI (`ci.yml`) sigue en rojo — 75 errores de lint preexistentes (`@typescript-eslint/no-explicit-any` mayormente), sin relación con el EDA. No bloquea nada (no hay branch protection en `main`) pero conviene limpiarlo en algún momento.
- La rama `biblioteca-de-contenido` tiene el Paso 3 de Pablo sin commitear (`biblioteca/app.js`, `biblioteca/styles.css`) — se dejó tal cual, sin tocar.

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
npm run lint           # ESLint (*.ts/*.tsx)
npm test               # Vitest (src/**/*.{test,spec}.{ts,tsx}, jsdom)
```

Si `npm test` falla con `Cannot find package '@vitejs/plugin-react-swc'`, es que `node_modules` no tiene las devDependencies instaladas (falta `npm ci`/`npm install`) — no es un problema del código.

`.github/workflows/ci.yml` corre `npm ci --legacy-peer-deps`, lint, test y build en cada push/PR a `main` — usar `--legacy-peer-deps` si `npm ci` falla localmente por peer deps.

## Autenticación y seguridad (EDA)

Hasta 2026-07-28 el EDA no tenía ningún control de acceso: RLS con políticas `"Allow all" USING (true)`, cero login en el frontend, y las Edge Functions no validaban quién las llamaba — cualquiera con la anon key (pública en el bundle) tenía acceso total a los datos y podía disparar publicaciones reales a Instagram vía `publisher`. Esto se corrigió:

- **Frontend**: `src/components/AuthGate.tsx` envuelve las rutas en `src/App.tsx` — sin sesión de Supabase Auth, se muestra `src/pages/Login.tsx` (email/password, con alta de cuenta) en vez de la app. Sign-out en `AppSidebar.tsx`.
- **RLS**: `supabase/migrations/006_real_rls_and_auth.sql` reemplaza las 9 políticas "Allow all" por `is_app_admin()` — una función que valida el email del JWT contra la tabla `app_admins` (hoy: `pablo@mejoraok.com` [ficticio, ver arriba] y `pabloeckert@gmail.com` [real]). Mismo criterio para el bucket `vault` en Storage. Para dar acceso a alguien más, insertar su email en `app_admins` (no hay UI para esto todavía — usar `supabase db query --linked "INSERT INTO app_admins (email) VALUES ('...') ON CONFLICT (email) DO NOTHING;"`).
- **Edge Functions**: `supabase/functions/_shared/auth.ts` (`requireAuth`) — cada una de las 6 funciones exige un JWT válido de un email en `ADMIN_EMAILS` (secret de Supabase, hoy incluye `pablo@mejoraok.com,pabloeckert@gmail.com`; default hardcodeado si el secret no está seteado: `pablo@mejoraok.com`), o la propia `SUPABASE_SERVICE_ROLE_KEY` como Bearer token para llamadas servidor-a-servidor (cron, otra función). Sin esto, responden 401/403.
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
- `Calendario` — calendario editorial
- `Propuestas` — cola de aprobación de propuestas de contenido
- `Configuracion` — configuración de agentes de IA

Hooks custom en `src/hooks/` (`useVault`, `useDialogue`, `useProposals`, `useMetrics`) llaman a `src/services/ai.ts` (invoca Edge Functions) y `src/services/supabase.ts` (CRUD directo). El cliente Supabase vive en `src/integrations/supabase/client.ts` y usa `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`). `src/components/ui/` es el set estándar de shadcn sin modificar; la UI propia está en `src/components/layout/` (AppSidebar, AppLayout).

Backend en `supabase/functions/` (Deno, Edge Functions), cada una con su propia allowlist de CORS (`util.mejoraok.com`, `mejorasm.vercel.app`, localhost) y con el guard de `_shared/auth.ts` (ver arriba):
- `ai-gateway` — gateway universal de IA (Groq, DeepSeek, Gemini, HuggingFace)
- `orchestrator` — orquesta el debate multi-agente (Estratega → Creativo → Crítico)
- `vault-process` — extrae texto/chunks/embeddings de documentos para RAG
- `publisher` — publica contenido programado en Instagram
- `rule-engine` — analiza métricas y genera reglas de éxito
- `metrics-collector` — recolecta métricas de Instagram Insights (pensado para cron cada 6h)

Se deployan con `.github/workflows/deploy-functions.yml` (push a `supabase/functions/**`, o manual con función específica) — usa `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF` como secrets del repo.

`supabase/migrations/`: schema SQL + pgvector, en orden `001` a `006` (nombres ya renumerados para que el orden alfabético coincida con el de ejecución real): `001_initial_schema.sql` → `002_policies_fix.sql` → `003_fix_postgrest.sql` → `004_indexes_constraints.sql` → `005_reconcile_status_constraints.sql` → `006_real_rls_and_auth.sql` (reemplaza el RLS abierto, ver sección de auth). Ya aplicadas contra la base real (2026-07-30) — ver "Bug conocido del CLI" arriba para cómo (no fue `supabase db push`, que sigue roto).

`scripts/deploy.sh` lee el `PROJECT_REF` de `supabase/config.toml` (antes tenía uno hardcodeado que no coincidía — corregido 2026-07-28).

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
- **`biblioteca/`** — interfaz para cargar, etiquetar y organizar el contenido que alimenta `content/inbox/`. Estado (ver `biblioteca/README.md`): Paso 1 (diseño) y Paso 2 (UI + interacción sobre datos de mentira en memoria, `seed-demo.js`) hechos; Paso 3 (persistencia real) en curso — `biblioteca/github.js` escribe al repo vía API de GitHub (PAT fine-grained guardado solo en `localStorage` del navegador, nunca commiteado). La lectura del repo público no necesita token; solo el commit (subir foto, guardar JSON) lo usa.
- **`dashboard/index.html`** — monitor de solo lectura de las stories publicadas/programadas (lee `content/log/historial.json`). A pesar de que `dashboard/README.md` todavía dice "Pendiente (Fase 5)", ya está implementado y deployado — no confiar en ese README sin verificar `index.html`.
- **`src/` (EDA)** — deployado en `/app/` (**https://pabloeckert.github.io/MejoraSM/app/**). Requiere login (ver sección de auth). `vite.config.ts` usa `base: process.env.VITE_BASE_PATH || "/"` — en local/Vercel/Hostinger es `/`, en GitHub Pages es `/MejoraSM/app/` (seteado por los workflows de deploy).

## Deploy

- **`hub/` + `biblioteca/` + `dashboard/` + EDA (`/app/`)**: activo y confirmado en GitHub Pages, sitio combinado (ver sección de arriba). Es el único destino de deploy del EDA verificado end-to-end — se eligió porque no requiere credenciales nuevas (usa el mismo repo + Actions que ya existían) y es totalmente reversible.
- **EDA en Vercel/Hostinger**: **no confirmado, no usar sin decidirlo con Pablo.** `util.mejoraok.com` no resuelve DNS, `mejorasm.vercel.app` devuelve 404, y ningún workflow hace deploy FTP pese a que los secrets `FTP_HOST`/`FTP_USERNAME`/`FTP_PASSWORD` siguen en el repo (son residuo). `vercel.json` tiene config de build correcta por si en algún momento se conecta un proyecto Vercel real.
- **`supabase/functions/`**: `deploy-functions.yml` (push a `supabase/functions/**`, o manual).
- **`supabase/migrations/`**: `deploy-migrations.yml` existe (`supabase db push --linked --yes --debug`, manual) pero **sigue sin funcionar** por el bug del CLI — no usarlo. Para cambios de schema, usar `supabase db query --linked "<SQL>"` o el SQL Editor del dashboard (ver "Bug conocido del CLI" arriba). El schema actual ya está aplicado así contra la base real.

## Variables de entorno

Definidas en `.env.example` (copiar a `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (frontend), `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `HF_API_KEY` (Edge Functions — se configuran como secrets en Supabase, no en `.env` local). `ADMIN_EMAILS` (Supabase secret) — lista de emails con acceso, coma-separada; hoy seteado a `pablo@mejoraok.com,pabloeckert@gmail.com`. Sin setear, cae a `pablo@mejoraok.com` únicamente (cuenta ficticia, ver arriba).

## `backend/`

Stub vacío (solo `README.md`, sin código) para una fase futura del roadmap ("Fase 2", servidor multi-agente). No hay nada que correr ahí todavía.
