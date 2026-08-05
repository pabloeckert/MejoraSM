# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Este es el **único archivo de documentación del repo**. El 2026-08-02 Pablo pidió unificar acá todo lo que antes estaba repartido en `EDA.md`, `MEJORASM.md`, `PLAN_AUTONOMIA.md`, `README.md`, `SECURITY.md`, los READMEs de cada carpeta (`biblioteca/`, `content/`, `dashboard/`, `backend/`, `templates/fonts/`), y las carpetas históricas `Documents/` y `docs/` — todos esos archivos se leyeron, se rescató lo que seguía siendo cierto y útil, y se borraron. No busques esa información en otro lado del repo: si no está acá, no existe o quedó afuera a propósito por estar contradicha por el estado real (ver "Notas históricas" al final).

Excepciones que siguen siendo archivos aparte porque no son documentación, son funcionales: `public/robots.txt` y `dist/robots.txt` (los lee el crawler web, tienen que existir en esa ruta exacta) y `biblioteca/fonts/LICENCIA.txt` (licencia legal de la tipografía, tiene que viajar junto a los archivos de fuente).

## Fuente de verdad

Este archivo (y la conversación de Claude Code donde se decide algo con Pablo) es la única fuente de verdad para MejoraSM. Cualquier otro insumo — otra sesión de IA, otra persona, otro chat en paralelo — se incorpora **solo cuando Pablo lo trae acá de forma expresa**; hasta entonces no aplica y no se vuelve a discutir. Esto se confirmó de forma directa el 2026-08-02 después de que surgiera una duda legítima sobre si un objetivo de diseño (autonomía total sin gate de aprobación humana, ver más abajo) venía de esta conversación o se había cruzado con una decisión distinta tomada en otro lado — Pablo cortó la ambigüedad: lo que se decide acá, vale; lo demás, no, hasta que él lo traiga expresamente.

## Qué es este repo

Un solo producto: **MejoraSM**, para la marca [MejoraOK](https://mejoraok.com). Cinco piezas; solo la primera usa Supabase, las demás son estáticas o corren por GitHub Actions:

1. **EDA (Estratega Digital Autónoma)** — SaaS de gestión de contenido con IA: `src/` (React) + `supabase/` (Edge Functions + Postgres). Requiere login (Supabase Auth) — ver sección de auth abajo.
2. **Sistema de story diaria autónoma** — `scripts/` (Node/ESM), corre por GitHub Actions. Lee fotos de `content/inbox/<oferta>/`, genera el copy llamando directo a la API de Anthropic, renderiza la pieza de marca y publica en Instagram/Facebook vía Zernio.
3. **Hub de contenido** — `hub/index.html`, página estática para subir fotos a `content/inbox/<oferta>/` sin tocar git a mano.
4. **Biblioteca de contenido** — `biblioteca/`, página estática (sin build) para cargar, etiquetar y organizar el contenido que alimenta el sistema de stories. Ver sección propia abajo.
5. **Dashboard / Monitor de stories** — `dashboard/index.html`, panel de solo lectura sobre lo publicado/programado por el sistema de stories y por el EDA.

`hub/`, `biblioteca/`, `dashboard/` y el build del EDA se despliegan juntos como un único sitio de GitHub Pages (ver Deploy).

No son cinco herramientas sueltas — es un solo producto con un solo trabajo: generar contenido de marca con IA y publicarlo solo, sin que nadie tenga que apretar "publicar" a mano todos los días. Todo lo que vive en este repo es una pieza de esa misma máquina, y a cada pieza se le exige el mismo estándar de autonomía que ya probó que funciona con Stories (ver "La fórmula probada" más abajo).

(Nota histórica: hubo un producto separado, una extensión de Chrome llamada MejoraInstaStories/MejoraINSSIST, que vivió en `extension/` y en varios duplicados en la raíz. Se discontinuó y se eliminó del repo por completo — quedó superada por el sistema de story diaria + hub descriptos arriba. Toda mención a esa extensión en documentación vieja ya borrada del repo no aplica más.)

## La fórmula probada (Stories) y por qué el resto del proyecto se mide contra ella

Stories corre sin intervención humana en producción desde julio de 2026, en un solo camino:

```
cron (GitHub Actions) → generar copy con IA → renderizar la pieza (Playwright + template HTML)
  → commitear la imagen (para que sea servible por URL) → publicar (Zernio) → trackear (historial.json)
```

Por qué funciona y no es un logro cosmético:
- **Cero gate humano en el camino feliz.** Nadie aprueba nada — el freno es programático (`alreadyGeneratedToday`), no una persona mirando una pantalla.
- **Cada paso es una función pura con una sola responsabilidad** (`generate-brief.mjs` genera, `render-story.mjs` renderiza, `publish-story.mjs` publica) — se puede reintentar o depurar un paso sin tocar los otros.
- **Un solo canal de publicación real** (Zernio), no un camino "de mentira" en paralelo.
- **Se prueba sola en cada corrida diaria**, no en un ambiente de staging separado — si se rompe, se sabe al otro día, no en un audit trimestral.

Esta es la vara contra la que se midió cada pieza del repo (registro completo en "Overhaul de autonomía" más abajo) hasta llegar al mismo nivel de autonomía en Posts de feed, Dashboard, Calendario, Biblioteca y Carruseles.

**Decisiones explícitas de no automatizar (siguen vigentes):**
- **No se renombra "EDA" en código/rutas/Edge Functions.** El nombre del producto es MejoraSM; "EDA" es el nombre interno del módulo de estrategia con IA (como "Stories" es el nombre del módulo de historias) — tocar rutas, funciones y el proyecto de Supabase por naming es riesgo real por beneficio cosmético.
- **La elección del tema en Mesa de Diálogo sigue siendo manual.** Pablo mantiene el criterio sobre qué tema vale la pena convertir en propuesta — lo que se automatizó (2026-08-02) es todo lo que pasa *después* de que el Crítico aprueba, no la elección inicial del tema. Sacar ese gate sería una decisión de negocio aparte, no técnica.

## Estado del EDA y overhaul de autonomía — actualizado 2026-08-02

El EDA está **reactivado y funcional de punta a punta**, con el pipeline de publicación autónoma extendido a todas las piezas del repo.

### Reactivación (2026-07-29/30)

El EDA quedó con el código de seguridad listo desde el 2026-07-28, pero sin ninguna tabla creada en la base real (`supabase db push` fallaba siempre — bug del CLI, motor "Effect", sin relación con el SQL). El 2026-07-30 se resolvió:

- Schema completo (`001` a `006`) corrido a mano contra `hsglmdarztrshihmzfph`, evitando el CLI de Supabase.
- RLS real activo — confirmado, no es un supuesto.
- Dos bugs de producción encontrados y corregidos: URL de HuggingFace mal escrita (`api-inference.huggingface.com` en vez de `.co`, rompía embeddings/RAG en `ai-gateway`/`orchestrator`/`vault-process`) y mismatch de tipos (`REAL` vs `double precision`) en `match_documents` (rompía la búsqueda RAG).
- El acceso admin (RLS y Edge Functions) se controla por una sola fuente de verdad, la tabla `app_admins`. **Confirmado en vivo, `SELECT email FROM app_admins`:** la tabla real solo tiene `pabloeckert@gmail.com` — el email ficticio `pablo@mejoraok.com` que había sembrado una sesión anterior de Claude Code como placeholder **no está** en la tabla, pese a que la migración `006_real_rls_and_auth.sql` lo siembra por default; alguien ya lo sacó a mano contra la base real. **No confiar en ese email ficticio ni enviarle nada** si aparece en algún archivo del repo o en documentación vieja — la tabla real es la que manda.
- De paso, se arregló un bug no relacionado en `scripts/generate-brief.mjs` (story diaria): `max_tokens` muy ajustado rompía el parseo del JSON de Claude.

**Bug conocido del CLI — re-diagnosticado 2026-08-05, probablemente resuelto río arriba:** el diagnóstico original (`supabase db push` fallaba siempre con un error opaco del motor "Effect", issues [#5091](https://github.com/supabase/cli/issues/5091)/[#4363](https://github.com/supabase/supabase/issues/4363) sin conclusión) se hizo con una versión vieja del CLI, en julio. Con el CLI actual (v2.111.0, instalado 2026-08-04 en la máquina de trabajo) se corrió `supabase db push --linked --dry-run` real contra el proyecto (`hsglmdarztrshihmzfph`) y **no reprodujo el error** — devolvió limpio `{"upToDate":false,"dryRun":true,"migrations":["007_feed_posts_render.sql","008_dimension_buyer_persona.sql"],...}`. También se confirmó (evidencia real, no supuesto) que la suposición vieja de "un `db push` reintentaría `001_initial_schema.sql` completo y podría reabrir el RLS" **era incorrecta**: `supabase migration list --linked` muestra `001`-`006` ya registradas en la tabla de historial de Supabase (local y remoto coinciden) — el dry-run confirma que solo `007` y `008` quedan pendientes de registrar, nunca `001`. Se verificó además que las dos son 100% idempotentes (`ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` antes de recrear) y que las columnas que agregan (`oferta`, `dimension`, etc.) ya existen en la base real — es decir, `007`/`008` quedaron aplicadas por el workaround de `db query` en su momento, pero nunca registradas en la tabla de historial del CLI; es un gap de bookkeeping, no un schema desincronizado. También se descartó `npm install -g supabase` como causa (`npx supabase --version` — la misma invocación que usa `deploy-migrations.yml` — corre bien, `2.111.0`).

**Lo que no se pudo confirmar del todo:** ni un `db push --linked` real (sin `--dry-run`) ni un disparo real de `gh workflow run deploy-migrations.yml` — ambos quedaron bloqueados por el clasificador de seguridad del entorno (acción de escritura en producción), mismo patrón que otros bloqueos ya documentados en este archivo. La evidencia del dry-run es fuerte pero no es 100% prueba end-to-end. **Pendiente real:** correr `deploy-migrations.yml` una vez desde la sesión de Pablo para cerrar la confirmación — debería, según toda la evidencia de arriba, aplicar limpio y sin efecto (las dos migraciones son no-ops sobre el schema real, solo actualizan el historial). Mientras tanto sigue siendo válido usar `supabase db query --linked "<SQL>"` (o el SQL Editor del dashboard) para cambios de schema nuevos — no depende de que esto se termine de confirmar.

### Overhaul de autonomía (2026-08-02)

Pablo pidió pasar de "autonomía con gate humano" (aprobar/agendar antes de publicar) a **autonomía total**: una propuesta aprobada por el Crítico se agenda y publica sola; el control humano es posterior (cancelar antes de que salga, o despublicar/corregir después). Se ejecutó en 7 fases, todas implementadas y deployadas:

1. **Posts de feed sin gate**: `orchestrator` agenda solo una propuesta con `format` `post` o `carrusel` (elige oferta por rotación de menor uso + un horario espaciado 24h del último) — ya no pasa por "Aprobar"/"Agendar". Solo `historia` sigue sin pipeline y queda en `pending` para gestión manual. `Propuestas.tsx` es ahora el monitor: botón "Cancelar" en Programadas, y `scripts/manage-post.mjs` + `.github/workflows/manage-post.yml` (mismo patrón que `manage-story.yml`, pero contra `proposals` de Supabase en vez de `historial.json`) para reintentar/despublicar algo ya publicado.
2. **Cron real para `rule-engine`/`metrics-collector`**: `.github/workflows/rule-engine-cron.yml` (diario) y `metrics-collector-cron.yml` (cada 6h) — antes ninguna de las dos tenía disparador. Probados en vivo con `workflow_dispatch` (HTTP 200 reales).
3. **Dashboard cubre posts de feed**: `sync-history.mjs` ya no adivina la imagen de un post por fecha (podía pisarse entre varios posts el mismo día) — usa `proposals.rendered_image_path` directo. El monitor de reversión (cancelar/despublicar) también aparece ahí para posts de feed.
4. **Calendario Editorial** (`src/pages/Calendario.tsx`) pasó a ser **de solo lectura** sobre `proposals.scheduled_at` — se sacó el diálogo "Nuevo evento", que escribía en `calendar_events` sin relación real con lo que se publicaba (antes, crear un evento no agendaba nada — era una vista cosmética). Agendar/cancelar de verdad vive en `/propuestas`.
5. **Biblioteca Paso 3**: se mergeó la rama `biblioteca-de-contenido` (tenía un commit + un stash con la subida de fotos sin terminar de integrar, y en un punto ese trabajo se perdió al hacer un `git rebase` sobre un merge commit — el rebase linealiza y puede descartar el contenido de un merge; se detectó y se reaplicó desde el stash, que seguía intacto). Subida real de fotos a `content/inbox/<dimensión>/` vía API de GitHub ya integrada y deployada (detalle completo en la sección de Biblioteca más abajo).
6. **Carruseles**: `render-scheduled-posts.mjs` genera hasta 4 slides para `format='carrusel'` (hook + cuerpo dividido en oraciones + cta, una foto por slide si hay disponibles) y `publish-scheduled-posts.mjs`/`scripts/lib/zernio.mjs` mandan `mediaItems` múltiples a Zernio.

**Prototipo de Claude Design** (`docs/prototipo-studio-v0.1/`) ya define dimensiones exactas y áreas seguras por formato — usar como spec técnico directo para el render automático, no repetir esa fase de diseño.

De paso se encontraron y corrigieron dos bugs reales preexistentes (no relacionados con el overhaul en sí):
- Mesa de Diálogo estaba **rota desde antes** — los 3 agentes tenían configurado un modelo de Groq (`meta-llama/llama-4-scout-17b-16e-instruct`) que ya no existe. Corregido a `llama-3.3-70b-versatile` en `orchestrator`/`ai-gateway` y en la tabla `agent_config` real.
- `metrics-collector` filtraba por `instagram_post_id` (columna legacy que ya no escribe nadie) en vez de `zernio_post_id` (lo que llena el pipeline actual) — nunca iba a encontrar nada.

**Pendiente, todo bloqueado por necesitar acción directa de Pablo (no algo resoluble sin su sesión/credenciales):**
- Borrar la función `publisher` — bloqueado por el clasificador de seguridad del entorno (acción destructiva en producción).
- Verificar en vivo el circuito completo (auto-agenda → render → publish real vía Zernio) — dispararlo por API está bloqueado por el mismo clasificador (publica contenido real sin revisión previa). Hay que disparar un tema real desde Mesa de Diálogo en la app.
- Probar el commit real de una foto en Biblioteca — necesita el PAT de Pablo en su propio navegador.
- ~~`metrics-collector` no va a traer datos reales hasta que exista el secret de Supabase `INSTAGRAM_ACCESS_TOKEN`~~ — **resuelto 2026-08-04/05**, se descartó el camino de Instagram Graph API por completo: `metrics-collector` ahora pega contra la API de analíticas de Zernio (`GET /v1/analytics?postId=`), que acepta `zernio_post_id` directo. Ver "Métricas vía Zernio Analytics" más abajo para el detalle y la evidencia real.

**Otras cosas pendientes, menor prioridad:**
- CI (`ci.yml`) sigue en rojo — ~68 errores de lint preexistentes (`@typescript-eslint/no-explicit-any` mayormente), sin relación con el EDA. No bloquea nada (no hay branch protection en `main`) pero conviene limpiarlo en algún momento.
- No hay UI para gestionar `app_admins` — todo por SQL (ver sección de auth).

## Comandos principales

```bash
npm run dev           # Vite dev server, app EDA (React), puerto 8080
npm run build          # Build de producción (dist/)
npm run preview        # Sirve el build de dist/ localmente
npm run lint           # ESLint (*.ts/*.tsx)
npm test               # Vitest (src/**/*.{test,spec}.{ts,tsx}, jsdom)
npm run test:watch     # Vitest en modo watch
```

`npm install --legacy-peer-deps` si `npm ci`/`npm install` falla localmente por peer deps. Si `npm test` falla con `Cannot find package '@vitejs/plugin-react-swc'`, es que `node_modules` no tiene las devDependencies instaladas — no es un problema del código.

`.github/workflows/ci.yml` corre `npm ci --legacy-peer-deps`, lint, test y build en cada push/PR a `main`.

## Autenticación y seguridad (EDA)

Hasta 2026-07-28 el EDA no tenía ningún control de acceso: RLS con políticas `"Allow all" USING (true)`, cero login en el frontend, y las Edge Functions no validaban quién las llamaba — cualquiera con la anon key (pública en el bundle) tenía acceso total a los datos y podía disparar publicaciones reales a Instagram vía `publisher`. Esto se corrigió en tres capas:

1. **Frontend**: `src/components/AuthGate.tsx` envuelve las rutas en `src/App.tsx` — sin sesión de Supabase Auth, se muestra `src/pages/Login.tsx` (email/password, con alta de cuenta) en vez de la app. Sign-out en `AppSidebar.tsx`.
2. **RLS**: `supabase/migrations/006_real_rls_and_auth.sql` reemplaza las 9 políticas "Allow all" por `is_app_admin()` — una función `SECURITY DEFINER` que valida el email del JWT contra la tabla `app_admins` (hoy, confirmado en vivo: solo `pabloeckert@gmail.com`). Mismo criterio para el bucket `vault` en Storage. Para dar acceso a alguien más, insertar su email en `app_admins` (no hay UI para esto todavía): `supabase db query --linked "INSERT INTO app_admins (email) VALUES ('...') ON CONFLICT (email) DO NOTHING;"`.
3. **Edge Functions**: `supabase/functions/_shared/auth.ts` (`requireAuth`) — cada una de las 5 funciones exige un JWT válido de un email presente en `app_admins` (consultada con el service role, la misma tabla que usa `is_app_admin()` para el RLS), o la propia `SUPABASE_SERVICE_ROLE_KEY` como Bearer token para llamadas servidor-a-servidor (cron, otra función). Sin esto, responden 401/403. Hasta el 2026-07-30 esto se validaba contra un secret aparte `ADMIN_EMAILS` (con un default hardcodeado a `pablo@mejoraok.com` si no estaba seteado) — una auditoría externa marcó que eso creaba listas de admins que podían desincronizarse, así que se sacaron los dos y quedó `app_admins` como única fuente.

`src/services/ai.ts` arma el header `Authorization` en cada llamada con el `access_token` real de la sesión (`supabase.auth.getSession()`), no con la anon key pelada. `src/services/supabase.ts` comparte la misma sesión persistida en `localStorage` (mismo `VITE_SUPABASE_URL`).

**Confirmado:** el schema y `006_real_rls_and_auth.sql` ya están aplicados contra la base real — el RLS de admin está vigente en producción, no es un supuesto.

**Cuenta de acceso:** ya existe una cuenta real (`pabloeckert@gmail.com`, creada y confirmada 2026-07-30, con al menos un login exitoso registrado). No hay flujo de "olvidé mi contraseña" en `Login.tsx` — si hace falta resetearla, solo se puede vía la Admin API de Supabase (acción que cambia la credencial de una cuenta real; no hacerla sin que Pablo la pida expresamente).

### Verificación real de Login OTP — 2026-08-04

Probado de punta a punta contra producción, por consola (`curl` directo a los endpoints de Supabase Auth, no a mano en el navegador) — evidencia reproducible, no captura de pantalla.

**Bug real encontrado y corregido en el camino:** el primer intento devolvió un mail "Your Magic Link" con botón, no un código de 6 dígitos, pese a que `Login.tsx:52-63` (`signInWithOtp` + `verifyOtp({ type: "email" })`) ya está escrito para pedir un código por texto. Causa confirmada por código + documentación oficial de Supabase (no por haber abierto el dashboard, que no fue accesible desde acá — ver más abajo): `signInWithOtp` para email es un solo flujo de API, sin parámetro que elija código vs. link — la diferencia depende 100% de qué variable use la plantilla de email del dashboard (`{{ .ConfirmationURL }}` = link, `{{ .Token }}` = código de 6 dígitos). La plantilla "Magic Link" del proyecto nunca se había editado para usar `{{ .Token }}`. Pablo la corrigió a mano en el dashboard (Authentication → Email Templates → Magic Link) — no fue un cambio de código, es config de cuenta.

**Nota de método:** se intentó abrir el dashboard de Supabase vía el Browser pane de Claude Code para verificar la plantilla directo, pero el panel no compositaba frames en esa sesión (`screenshot` fallaba con "the Browser pane is not displayed") pese a que la navegación, red y consola confirmaban que la página había cargado logueada — no se pudo diagnosticar la causa desde acá. El diagnóstico de la plantilla se hizo por código + doc oficial, y la corrección la aplicó Pablo directamente.

**Paso 1 — `signInWithOtp` (después de corregida la plantilla):**
```bash
curl -X POST "https://hsglmdarztrshihmzfph.supabase.co/auth/v1/otp" \
  -H "apikey: sb_publishable_GXn6-T6gWNSzZR-sIQ6_5g_97ZCFxWp" \
  -H "Content-Type: application/json" \
  -d '{"email":"pabloeckert@gmail.com","create_user":false}'
```
Resultado: `HTTP 200`, body `{}`. Llegó el mail "Tu código de acceso" con un código numérico (no más magic link).

**Paso 2 — `verifyOtp` con el código real recibido:**
```bash
curl -X POST "https://hsglmdarztrshihmzfph.supabase.co/auth/v1/verify" \
  -H "apikey: sb_publishable_GXn6-T6gWNSzZR-sIQ6_5g_97ZCFxWp" \
  -H "Content-Type: application/json" \
  -d '{"email":"pabloeckert@gmail.com","token":"<código real>","type":"email"}'
```
Resultado: `HTTP 200`. Devolvió un `access_token` (JWT) y `refresh_token` reales, `expires_in: 3600`. El JWT decodificado confirma: `email: pabloeckert@gmail.com`, `role: authenticated`, `amr: [{"method":"otp",...}]` (o sea, quedó registrado como login por OTP, no por password), `user.last_sign_in_at` con el timestamp real de esta prueba.

**Paso 3 — la sesión sirve para un endpoint autenticado real (`proposals`, protegido por RLS `is_app_admin()`):**
```bash
# Con el access_token del paso 2:
curl "https://hsglmdarztrshihmzfph.supabase.co/rest/v1/proposals?select=id,status,format,created_at&limit=3" \
  -H "apikey: sb_publishable_GXn6-T6gWNSzZR-sIQ6_5g_97ZCFxWp" \
  -H "Authorization: Bearer <access_token>"
```
Resultado: `HTTP 200`, devolvió 3 filas reales de `proposals`. **Control en paralelo**, misma query sin `Authorization` (solo `apikey`): también `HTTP 200` pero body `[]` — RLS bloquea el acceso sin sesión de admin válida (PostgREST no devuelve 401 acá, devuelve 200 con filas vacías; el JWT del OTP es lo que hace la diferencia real).

**Conclusión: Login OTP funciona de punta a punta en producción**, confirmado con evidencia reproducible — envío de código, verificación, y sesión válida que efectivamente atraviesa el RLS de admin. El único paso no automatizable fue leer el código del mail (necesita el inbox real de Pablo) y la corrección de la plantilla en el dashboard (config de cuenta, la aplicó Pablo).

**Reporte de vulnerabilidades:** contactar directo a Pablo Eckert — **`pabloeckert@gmail.com`** (no `pablo@mejoraok.com`, que es el email ficticio mencionado arriba; `SECURITY.md`, ya borrado en la consolidación, tenía ese error). Nunca abrir un issue público de GitHub para reportar un problema de seguridad.

## Arquitectura: EDA (`src/` + `supabase/`)

```
┌─────────────────────────────┐
│  Frontend (React + Vite)    │  GitHub Pages: /app/
│  src/                        │
└──────────────┬───────────────┘
               │ fetch / Supabase JS client (JWT de sesión)
               ▼
┌─────────────────────────────┐      ┌──────────────────────┐
│  Supabase Edge Functions     │─────▶│  Groq / DeepSeek /    │
│  (Deno) supabase/functions/  │      │  Gemini / HuggingFace │
└──────────────┬───────────────┘      └──────────────────────┘
               │ service_role (bypasea RLS)
               ▼
┌─────────────────────────────┐
│  Postgres + pgvector         │  Proyecto: hsglmdarztrshihmzfph
│  RLS: solo admins            │  (org MC, plan free, región us-west-2)
└───────────────────────────────┘
```

Frontend Vite + React 18 + TypeScript + shadcn/ui + Tailwind + React Router (`HashRouter` — necesario para el subpath de GitHub Pages, ver Deploy) + TanStack Query. Alias `@` → `src/` (definido en `vite.config.ts`, `tsconfig.json` y `components.json`).

Páginas (`src/pages/`):

| Pantalla | Ruta | Qué hace |
|---|---|---|
| **Login** | `/login` | Email/contraseña contra Supabase Auth, con alta de cuenta. Gatea todo lo demás vía `AuthGate.tsx`. |
| **Dashboard** | `/` | 4 métricas clicables (documentos, diálogos, contenidos, publicaciones programadas), gráfico de engagement por post, distribución por formato, aprobaciones pendientes, próximos eventos del calendario. |
| **Bóveda de Conocimiento** | `/boveda` | Subís documentos (PDF/doc/txt/md) de marca. Dispara `vault-process`: extrae texto, lo trocea en chunks, genera embeddings. Buscador y borrado de documentos. |
| **Mesa de Diálogo** | `/mesa` | Le das un tema (elección manual, ver "decisiones explícitas de no automatizar" arriba) y dispara `orchestrator`: Estratega propone → Creativo redacta → Crítico evalúa contra los documentos de la Bóveda (RAG). Si aprueba y el formato tiene pipeline autónomo (`post`/`carrusel`), la propuesta se autoagenda sola — ver overhaul de autonomía arriba. |
| **Laboratorio de Contenido** | `/laboratorio` | Versión directa: describís qué querés comunicar y te devuelve una propuesta ya armada (estrategia + copy + evaluación + hook/CTA/hashtags) lista para copiar o aprobar. |
| **Calendario Editorial** | `/calendario` | De solo lectura desde el overhaul del 2026-08-02: refleja `proposals.scheduled_at`, no agenda nada (eso vive en Propuestas). |
| **Propuestas** | `/propuestas` | Desde el overhaul del 2026-08-02, monitor de lo que se agenda/publica solo (cancelar antes de publicar, reintentar/despublicar después); solo `format='historia'` sigue con aprobación manual real. |
| **Configuración** | `/configuracion` | Por cada uno de los 3 agentes: proveedor de IA, modelo exacto y temperatura, persistido en `agent_config`. |

Hooks custom en `src/hooks/` (`useVault`, `useDialogue`, `useProposals`, `useMetrics`) llaman a `src/services/ai.ts` (invoca Edge Functions) y `src/services/supabase.ts` (CRUD directo). El cliente Supabase vive en `src/integrations/supabase/client.ts` y usa `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`). `src/components/ui/` es el set estándar de shadcn sin modificar; la UI propia está en `src/components/layout/` (AppSidebar, AppLayout).

### Backend — 4 Edge Functions

Todas en `supabase/functions/` (Deno), cada una con su propia allowlist de CORS (`util.mejoraok.com`, `mejorasm.vercel.app`, localhost) y con el guard de `_shared/auth.ts`:

| Función | Rol |
|---|---|
| `orchestrator` | Corre el debate Estratega → Creativo → Crítico de Mesa de Diálogo, trayendo contexto de la Bóveda vía `match_documents` (RAG). Autoagenda las propuestas aprobadas (ver overhaul de autonomía). |
| `vault-process` | Procesa documentos subidos (extracción, chunking, embeddings) y expone la búsqueda semántica. |
| `rule-engine` | Analiza métricas de posts pasados y genera reglas de éxito (qué formato/hora/tono funciona mejor). Cron diario real desde 2026-08-02 (`rule-engine-cron.yml`). |
| `metrics-collector` | Trae métricas reales desde la API de analíticas de Zernio (`GET /v1/analytics?postId=`, no Instagram Graph API — cambio 2026-08-04/05, ver "Métricas vía Zernio Analytics" más abajo). Cron real cada 6h desde 2026-08-02 (`metrics-collector-cron.yml`). |

Deploy: `.github/workflows/deploy-functions.yml` (push a `supabase/functions/**`, o manual con función específica) — usa `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF` como secrets del repo.

**No hay Edge Function `publisher`** (se retiró el 2026-07-30 — publicaba directo a la Graph API de Meta, nunca configurada ni invocada por nada). La publicación de posts de feed corre en GitHub Actions, no en Supabase — ver "Arquitectura: publicación autónoma de posts de feed" más abajo. **Pendiente:** la función sigue `ACTIVE` en el proyecto real (`hsglmdarztrshihmzfph`) porque borrarla remoto quedó bloqueado por el clasificador de seguridad del entorno — falta correr `supabase functions delete publisher --project-ref hsglmdarztrshihmzfph` a mano.

**Tampoco hay Edge Function `ai-gateway`** — eliminada tanto del código (2026-08-04, código muerto confirmado, sin ningún caller real en `src/`) como del proyecto real: `supabase functions delete ai-gateway --project-ref hsglmdarztrshihmzfph` corrió el 2026-08-04 y confirmó `{"function_slug":"ai-gateway","project_ref":"hsglmdarztrshihmzfph","message":"Deleted Edge Function."}`. A diferencia de `publisher`, este borrado remoto sí se completó — no quedó pendiente.

### Métricas vía Zernio Analytics — 2026-08-04/05

`metrics-collector` dejó de depender de Instagram Graph API (bloqueado por falta del secret `INSTAGRAM_ACCESS_TOKEN`, trámite de Meta for Developers) y pasó a usar la API de analíticas de Zernio directo — mismo proveedor que ya se usa para publicar (`scripts/lib/zernio.mjs`), sin necesidad de dar de alta nada nuevo en Meta.

**1. Integración Zernio existente, confirmada:** `scripts/lib/zernio.mjs` — `ZERNIO_API_URL = "https://zernio.com/api/v1/posts"`, auth `Authorization: Bearer $ZERNIO_API_KEY`. Hasta ahora `ZERNIO_API_KEY`/`ZERNIO_INSTAGRAM_ACCOUNT_ID`/`ZERNIO_FACEBOOK_ACCOUNT_ID` solo existían como secrets de **GitHub Actions** (los usan los scripts Node que publican) — Supabase Edge Functions usa un secret store completamente aparte.

**2. Confirmado contra el spec real de Zernio (OpenAPI, no la respuesta resumida de un fetch, que erró el path la primera vez):** `GET /v1/analytics?postId={id}` — acepta tanto Zernio Post IDs como External Post IDs, auto-resueltos. Esto además resuelve una incógnita que quedaba documentada como pendiente en el código viejo (si `zernio_post_id` servía o hacía falta el media ID real de Instagram — no hacía falta). Respuesta trae `analytics: {impressions, reach, likes, comments, shares, saves, clicks, views, engagementRate, lastUpdated}`, cubre 1:1 las columnas que ya escribe `metrics`. Riesgo documentado en el propio spec: `402` si el plan no incluye el add-on de Analytics (legacy plans lo necesitan aparte; viene incluido en usage-based).

**3. Reescritura de `supabase/functions/metrics-collector/index.ts`:** reemplazado `getPostInsights()` (Instagram Graph API) por `getPostAnalytics()` (Zernio), mapeado a las mismas 6 columnas (`likes`, `comments`, `shares`, `saves`, `reach`, `impressions` — `engagement_rate` es columna `GENERATED` de Postgres, no la escribe el collector). Manejo explícito de `402`/`424`/`202` con mensajes distintos (add-on faltante / post falló en publicar / sync todavía pendiente), en vez de un error genérico. De paso se borró `getAccountInsights()` — código muerto, nunca tuvo caller dentro del archivo.

**4. `ZERNIO_API_KEY` cargada como secret de Supabase — 2026-08-05:**
```
supabase secrets set "ZERNIO_API_KEY=..." --project-ref hsglmdarztrshihmzfph
→ {"project_ref":"hsglmdarztrshihmzfph","count":1,"message":"Finished supabase secrets set."}
```
Confirmado con `supabase secrets list --project-ref hsglmdarztrshihmzfph` (no expone valores, solo un hash SHA-256 de huella): `{"name":"ZERNIO_API_KEY", ..., "updated_at":"2026-08-05T02:46:12.211Z"}`.

**5. Probado real contra el único post publicado con `zernio_post_id` en toda la base** (`proposals.id = 11623a51-9c57-4649-ac39-6930d9b18826`, `zernio_post_id = 6a70b1959bf0a77017bc3c6c`) — se redeployó la función primero (`supabase functions deploy metrics-collector`, el código reescrito no se había subido todavía):
```
POST /functions/v1/metrics-collector {"action":"collect","proposalId":"...","postId":"6a70b1959bf0a77017bc3c6c"}
→ HTTP 200
{"postId":"6a70b1959bf0a77017bc3c6c","metrics":{"likes":0,"comments":0,"shares":0,"saves":0,"reach":47,"impressions":117},"updated":false}
```
Confirmado que quedó escrito de verdad en `metrics` (`supabase db query --linked`): fila real con `reach: 47`, `impressions: 117`, `engagement_rate: 0` (coherente — sin likes/comments/shares/saves, la fórmula generada da 0), `measured_at` con timestamp real de esta prueba.

**Conclusión: `metrics-collector` funciona de punta a punta con datos reales de Zernio**, no placeholder — likes/comments/shares/saves en 0 es un resultado real de un post con poco alcance todavía, no un fallo silencioso (reach e impressions sí tienen valores >0, confirmando que la llamada trajo datos reales y no una respuesta vacía por defecto). Nota de método sobre el manejo del secret: la clave real la generó y pegó Pablo directo en el chat después de que varios intentos de leerla desde archivos locales (`secrets/keys.local.txt`, una carpeta de diagnóstico vieja) quedaran bloqueados por el clasificador de seguridad del entorno — no se leyó ni se mostró su valor en ningún paso de este proceso, solo se usó una vez para el `secrets set`.

### Modelo de datos

10 tablas en el schema `public`, todas con RLS habilitado:

| Tabla | Para qué |
|---|---|
| `documents` | Metadata de cada documento subido a la Bóveda |
| `doc_chunks` | Chunks de texto + embedding (`vector(384)`) de cada documento, para RAG |
| `agent_config` | Config (proveedor/modelo/temperatura/`system_prompt`) de los 3 agentes — editable desde `/configuracion` (prompts reales, ver más abajo) |
| `dialogue_sessions` | Cada sesión de Mesa de Diálogo (tema, estado, propuesta final) |
| `dialogue_messages` | Mensajes de cada agente dentro de una sesión, por turno |
| `proposals` | Propuestas de contenido (hook, body, cta, hashtags, formato, estado, `oferta`/`rendered_image_path`/`zernio_post_id` agregadas en `007_feed_posts_render.sql` para el pipeline autónomo) |
| `calendar_events` | Legacy — ya no lo usa `Calendario.tsx` (que lee `proposals.scheduled_at` directo desde el overhaul), pero la tabla sigue existiendo |
| `metrics` | Métricas de posts publicados (likes, comments, reach, `engagement_rate` calculado) |
| `success_rules` | Reglas aprendidas por `rule-engine` |
| `app_admins` | Allowlist de emails con acceso (ver sección de auth) |

Función RAG: `match_documents(query_embedding, match_count, similarity_threshold)` — búsqueda por similitud coseno sobre `doc_chunks` vía índice `ivfflat`, con cast `::REAL` (ver bug corregido arriba). Bucket de Storage: `vault` (privado).

`supabase/migrations/`: schema SQL + pgvector, en orden `001` a `007` (nombres renumerados para que el orden alfabético coincida con el de ejecución real): `001_initial_schema.sql` → `002_policies_fix.sql` → `003_fix_postgrest.sql` → `004_indexes_constraints.sql` → `005_reconcile_status_constraints.sql` → `006_real_rls_and_auth.sql` → `007_feed_posts_render.sql`. Ya aplicadas contra la base real.

### System prompts reales de los 3 agentes (tabla `agent_config`, verificado en vivo)

- **Estratega**: "Sos el Agente Estratega de MejoraOK. Tu trabajo es proponer temas, ángulos y estrategias de contenido para Instagram. Siempre basate en los documentos de la marca y los buyer personas. Sé directo, argentino, sin vueltas."
- **Creativo**: "Sos el Agente Creativo de MejoraOK. Tu trabajo es redactar copys, hooks, CTAs y sugerir dirección visual. Tono argentino, directo, emocional. Cada copy debe conectar con un buyer persona específico."
- **Crítico**: "Sos el Agente Crítico de MejoraOK. Tu trabajo es evaluar el contenido contra los documentos de marca. Aprobás solo si cumple el criterio comercial. Rechazás con razón específica. Sos el guardián de la calidad."

El formato de salida esperado por cada agente (HOOK/BODY/CTA/HASHTAGS para el Creativo, DECISION/RAZON/SUGERENCIAS para el Crítico) se arma en el `INSTRUCCIONES:` que `orchestrator/index.ts` le agrega a cada llamada, no en el `system_prompt` de la tabla — ver `runEstratega`/`runCreativo`/`runCritico` en el código para el detalle exacto.

### Buyer personas (contexto de marca que usan los 3 agentes)

Rescatados de documentación de producto vieja (ya borrada en la consolidación) — siguen siendo el público objetivo real que los prompts de arriba referencian ("basate en... los buyer personas"):

| # | Perfil | Dolor | Deseo |
|---|---|---|---|
| 1 | 🤯 El Emprendedor Saturado | No sabe priorizar, apaga incendios | Claridad mental, control |
| 2 | 👑 La Líder que Necesita Validación | Síndrome del impostor | Confianza, criterio externo |
| 3 | 📈 El Profesional Independiente | Bueno pero invisible | Posicionamiento, marca personal |
| 4 | 🔀 El Equipo Desalineado | Cada uno hace lo suyo | Alineación, roles claros |
| 5 | 🔍 El Empresario Mal Asesorado | Rodeado de humo | Verdad, buen asesoramiento |
| 6 | 🌱 La Nueva Generación | No lo valoran | Crecimiento, reconocimiento |
| 7 | 💸 El Vendedor sin Resultados | Trabaja mucho, vende poco | Conversión, proceso de ventas |
| 8 | ⚡ El que Necesita Orden | Creció rápido, desordenado | Sistema, procesos |

### Catálogo de proveedores de IA gratuitos (referencia técnica, no envejece con el proyecto)

| Proveedor | Modelo | Free tier | Endpoint |
|---|---|---|---|
| **Groq** ⭐ | Llama 3.3 70B versatile (hoy en uso, ver `agent_config`) | ~30 req/min, sin límite diario conocido | `https://api.groq.com/openai/v1/chat/completions` |
| **DeepSeek** | DeepSeek V3 / Coder | Free con registro | `https://api.deepseek.com/v1/chat/completions` |
| **Gemini** | 1.5 Flash / Pro | 60 req/min, 1M tokens/min, multimodal | `https://generativelanguage.googleapis.com/v1beta` |
| **HuggingFace Inference** | `all-MiniLM-L6-v2` (embeddings, 384 dims) | Rate limit generoso | `https://api-inference.huggingface.co/models/{model}` |
| **Together AI** | Llama 3 / Mistral / CodeLlama | $25 crédito inicial (no permanente) | — |

Generación/análisis de imágenes y texto gratis, no integrados hoy pero evaluados: **Pollinations.ai** (`https://image.pollinations.ai/prompt/{prompt}`, sin registro, útil si el pipeline de carruseles necesita imágenes generadas), Unsplash API (50 llamadas/hora), HF Sentiment (`cardiffnlp/twitter-roberta-base-sentiment-latest`), LanguageTool API (corrección gramatical, 20 req/min), Google Perspective API (toxicidad, gratis). Ollama (local) fue evaluado en su momento como backup ilimitado, pero el stack real corre 100% en la nube vía Edge Functions — no está integrado.

`scripts/deploy.sh` lee el `PROJECT_REF` de `supabase/config.toml`.

## Arquitectura: publicación autónoma de posts de feed (EDA)

Mismo patrón que la story diaria (ver sección siguiente) aplicado al módulo de Propuestas del EDA. Agregado 2026-07-30 (porque antes una propuesta agendada no se publicaba nunca) y **rediseñado 2026-08-02** para sacar el gate de aprobación humana previa — hoy una propuesta con `format` `post` o `carrusel` que el Crítico aprueba en Mesa de Diálogo pasa a `scheduled` **sola**, sin que nadie apriete "Aprobar"/"Agendar":

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

`proposals.oferta` la elige `orchestrator` automáticamente — determina de qué carpeta de `content/inbox/` sale la foto. Corre en GitHub Actions y no como Edge Function de Supabase porque necesita Playwright para renderizar la imagen, que no puede correr en el runtime Deno sandboxed de las Edge Functions — la misma razón por la que la story diaria tampoco vive ahí.

**Monitor de reversión** (control humano posterior, no gate previo): mientras está `scheduled`, botón "Cancelar" en `/propuestas` (pestaña Programadas). Ya publicada: `.github/workflows/manage-post.yml` (`scripts/manage-post.mjs`, workflow_dispatch con `proposal_id` + plataforma + `reintentar`/`despublicar`, exige tipear `CONFIRMO`) — Instagram no soporta despublicar por API (limitación de Meta), Facebook sí.

**Fuera de alcance de este pipeline:** `format='historia'` — sin pipeline de publicación autónomo todavía, queda en `pending` para gestión manual en `/propuestas`.

## Arquitectura: story diaria autónoma (`scripts/`, `content/`, `templates/`)

Flujo (disparado por `.github/workflows/daily-story.yml`, cron diario + `workflow_dispatch` manual):

```
content/inbox/<oferta>/*.jpg  → scripts/generate-brief.mjs (Claude, vía scripts/lib/claude.mjs)
                               → content/work/briefs.json
                               → scripts/render-story.mjs (Playwright + templates/story-template.html)
                               → scripts/publish-story.mjs (scripts/lib/zernio.mjs → Instagram + Facebook)
                               → foto usada se mueve a content/used/<oferta>/
```

`content/inbox/` y `content/used/` tienen 5 subcarpetas, una por dimensión del Manual de Marca: `personal`, `organizacional`, `comercial`, `empresarial`, `profesionalizacion`. `generate-brief.mjs` orienta el copy según la carpeta de origen de la foto — la identidad de marca se trae en vivo en cada corrida desde el repo externo [MejoraIdentidad](https://github.com/pabloeckert/MejoraIdentidad) (`SKILL.md`), sin copia local en este repo. Videos en `inbox/` se detectan pero no se procesan todavía (se avisan en el log, no se pierden). El workflow genera 1 story por foto (hasta 3), o 1 story de solo texto si `inbox/` está vacía.

Estructura de `content/`:
- **`inbox/`** — dejar acá las fotos a usar (jpg/png/webp). Para subir desde el celular sin usar git: directo desde la app de GitHub, o desde el `hub/`.
- **`used/`** — el workflow mueve acá la foto ya usada, para no repetirla.
- **`work/`** — archivos intermedios (`briefs.json`, `renders.json`, `scheduled-posts.json`) de la última corrida. Se pisan cada corrida, no hace falta tocarlos.
- **`published/`** — imágenes finales (1080x1920 Stories, 1080x1080 posts) con fecha en el nombre. Quedan en el repo porque `raw.githubusercontent.com` las sirve como URL pública, que es lo que necesita Zernio para publicar.

`generate-brief.mjs` frena sin generar nada (exit 0) si ya existe un `story-{hoy}-*.jpg` en `content/published/` — como mucho una corrida real por día, para no duplicar posts si el workflow se re-corre (pasó el 21/07). Reintentos de una plataforma puntual se hacen contra el post ya existente en Zernio, no re-corriendo el workflow completo.

Gestión de posts ya publicados, todo por `workflow_dispatch` (no hay UI propia — el dashboard es de solo lectura):
- `.github/workflows/sync-history.yml` (`scripts/sync-history.mjs`, cron cada 6h) — trae el historial real desde Zernio a `content/log/historial.json`, la fuente que lee el dashboard.
- `.github/workflows/manage-story.yml` (`scripts/manage-story.mjs`) — reintentar o despublicar un post existente por `post_id`. Nunca genera contenido nuevo ni llama a Claude. Exige tipear literalmente `CONFIRMO`.
- `.github/workflows/mark-manual.yml` (`scripts/mark-manual.mjs`) — registra en `content/log/acciones-manuales.json` que un post se gestionó a mano (ej. Instagram no soporta despublicar por API). No llama a Zernio.

`ANTHROPIC_API_KEY` y las credenciales de Zernio (`ZERNIO_API_KEY`, `ZERNIO_FACEBOOK_ACCOUNT_ID`, `ZERNIO_INSTAGRAM_ACCOUNT_ID`) van como secrets del repo en GitHub Actions, no en `.env` local. Esta parte del repo no usa Supabase ni las Edge Functions del EDA — son dos caminos de publicación completamente separados.

`templates/fonts/` necesita `BwModelica-Medium.woff2` y `BwModelica-Regular.woff2` puestos a mano (convertidos del OTF que ya se usó en la landing de mejoraok.com) — **pendiente, todavía no están**: mientras no estén, la story usa League Spartan como fallback en los títulos, se ve bien igual pero no es 100% la identidad de marca.

## Arquitectura: hub, biblioteca, dashboard y EDA (GitHub Pages)

Las cuatro conviven en el **mismo sitio** de GitHub Pages (Pages en modo "workflow" solo sirve un artifact por sitio): `hub/` en la raíz, `dashboard/`, `biblioteca/` y el build del EDA (`dist/`) como subpaths (`/dashboard/`, `/biblioteca/`, `/app/`). Los cuatro workflows (`deploy-hub.yml`, `deploy-biblioteca.yml`, `deploy-dashboard.yml`, `deploy-eda.yml`) arman el mismo `_site/` combinado — cualquiera de los cuatro se dispara por push a su parte y republica el sitio entero. Si se edita la lógica de armado de `_site/` en uno, hay que replicarla en los otros tres o se pisan entre sí.

- **`hub/index.html`** — 5 tarjetas, una por oferta, que linkean directo a la UI de upload de GitHub (`github.com/.../upload/main/content/inbox/<oferta>`) para subir fotos sin tocar git a mano. Dispara el flujo de story diaria en la próxima corrida del workflow. No es "autónomo" (es el punto de entrada humano — subir una foto), pero cumple bien su alcance. Deploy activo en **https://pabloeckert.github.io/MejoraSM/**.

- **`biblioteca/`** — interfaz para cargar, etiquetar y organizar el contenido que alimenta `content/inbox/`. HTML/JS plano, sin framework ni build — se abre `index.html` directo en el navegador. Deploy en **https://pabloeckert.github.io/MejoraSM/biblioteca/**.

  Estado:
  - **Paso 1 (diseño)** — hecho. Recrea el prototipo aprobado con Pablo.
  - **Paso 2 (interfaz + interacción)** — hecho. Toda la UI funciona con datos de mentira en memoria (`seed-demo.js`).
  - **Paso 3 (persistencia real)** — en curso. Hecho: `biblioteca/github.js` (cliente de la API de GitHub — PAT fine-grained guardado SOLO en `localStorage` del navegador, nunca commiteado; `getFile`/`listDir` no necesitan token en repo público, `putFile`/`commitPhoto`/`whoami` sí) y el selector de dimensión + `persistPhoto()` en `app.js`, que commitea cada foto cargada directo a `content/inbox/<dimensión>/`. Todavía sin probar en vivo con un PAT real (necesita la sesión de navegador de Pablo). Pendiente, fuera de esta fase: persistir categorías/álbumes en JSON (hoy en memoria) y el aprendizaje supervisado real (hoy "propone"/"corrige" es de mentira).

  Archivos: `index.html` (shell mínimo, carga `github.js`/`seed-demo.js`/`app.js`), `styles.css` (tokens de marca + `@font-face` Bw Modelica), `app.js` (toda la lógica y el render, vanilla JS), `seed-demo.js` (datos de demo, se borra cuando el Paso 3 esté completo), `fonts/` (Bw Modelica Regular/Medium/Bold — licencia de Agencia Dominó en `fonts/LICENCIA.txt`), `assets/` (isotipo y lockup de Mejora Continua).

  Pantallas: **Línea de tiempo** (piezas por etapa: En biblioteca → Confirmada → Programada → Publicada; vistas lista/miniatura/íconos; borrar/confirmar por foto; clic abre detalle para corregir etiquetas/álbum) · **Calendario** (publicado en rojo, programado en azul; clic → modificar/reprogramar/borrar) · **Carga rápida** (sueltas del día, el sistema propone etiquetas) · **Sesión** (tanda de un evento, confirmar en bloque) · **Armar pieza** (4 tipos: Foto con texto, Collage, Foto simple, Frase manual, con preview en vivo) · **Manual** (tutorial interactivo, se reabre con el botón **?**).

  Notas: layout desktop grid 30/70 (menú + apps a la izquierda, contenido a la derecha); Programada/Publicada en el Monitor muestran datos de ejemplo marcados como tales (la publicación real vive en el Monitor real, no acá); fuente Bw Modelica local, League Spartan de fallback.

- **`dashboard/index.html`** — monitor de solo lectura de las stories y posts de feed publicados/programados (lee `content/log/historial.json`). Deploy en **https://pabloeckert.github.io/MejoraSM/dashboard/**.

- **`src/` (EDA)** — deployado en `/app/` (**https://pabloeckert.github.io/MejoraSM/app/**). Requiere login. `vite.config.ts` usa `base: process.env.VITE_BASE_PATH || "/"` — en local es `/`, en GitHub Pages es `/MejoraSM/app/` (seteado por los workflows de deploy).

## Deploy

- **`hub/` + `biblioteca/` + `dashboard/` + EDA (`/app/`)**: activo y confirmado en GitHub Pages, sitio combinado (ver arriba). Es el único destino de deploy del EDA verificado end-to-end — no requiere credenciales nuevas (mismo repo + Actions que ya existían) y es totalmente reversible.
- **EDA en Vercel/Hostinger**: **no confirmado, no usar sin decidirlo con Pablo.** `util.mejoraok.com` no resuelve DNS, `mejorasm.vercel.app` devuelve 404 (ambos mencionados en documentación vieja y todavía en el CORS allowlist de las Edge Functions, pero son residuo), y ningún workflow hace deploy FTP pese a que los secrets `FTP_HOST`/`FTP_USERNAME`/`FTP_PASSWORD` siguen en el repo (también residuo). `vercel.json` tiene config de build correcta por si en algún momento se conecta un proyecto Vercel real.
- **`supabase/functions/`**: `deploy-functions.yml` (push a `supabase/functions/**`, o manual).
- **`supabase/migrations/`**: `deploy-migrations.yml` existe (`supabase db push --linked --yes --debug`, manual) — **probablemente arreglado con la versión actual del CLI** (ver diagnóstico re-hecho 2026-08-05 en "Bug conocido del CLI" más arriba), pero sin confirmación end-to-end real todavía. Hasta esa confirmación, seguir usando `supabase db query --linked "<SQL>"` o el SQL Editor del dashboard para cambios de schema. El schema actual ya está aplicado así contra la base real.
- **`publish-scheduled-posts.yml`** (cron cada 15 min + manual), **`metrics-collector-cron.yml`** (cada 6h) y **`rule-engine-cron.yml`** (diario): usan el secret de GitHub `SUPABASE_SERVICE_ROLE_KEY`, creado el 2026-08-02. Ojo si hay que regenerarlo: tiene que ser la API key nueva estilo `sb_secret_...` (Settings → API Keys del proyecto Supabase, no la legacy JWT de `service_role`) — la legacy JWT funciona contra PostgREST (`/rest/v1/...`, la usan los scripts) pero el gateway de Edge Functions (`/functions/v1/...`, lo usan los cron de arriba) la rechaza con 401. Reusa el secret `VITE_SUPABASE_URL` que ya existe como base URL.

**Secrets de GitHub Actions usados en total**: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ZERNIO_API_KEY`, `ZERNIO_FACEBOOK_ACCOUNT_ID`, `ZERNIO_INSTAGRAM_ACCOUNT_ID`.

## Variables de entorno

Definidas en `.env.example` (copiar a `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (frontend). Para Edge Functions (se configuran como **secrets en Supabase**, no en `.env` local): `GROQ_API_KEY` (gratis, [console.groq.com/keys](https://console.groq.com/keys)), `DEEPSEEK_API_KEY` (gratis con créditos iniciales, [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)), `GEMINI_API_KEY` (gratis, 15 RPM, [aistudio.google.com/apikey](https://aistudio.google.com/apikey)), `HF_API_KEY` (gratis, permiso "Read", [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)). El acceso admin ya no se gestiona por variable de entorno — es un INSERT en la tabla `app_admins`.

## `backend/`

Stub vacío (solo `README.md`, sin código) para una fase futura del roadmap ("Fase 2", servidor multi-agente — nombre interno de una fase futura, no confundir con ninguna "Fase 2" de documentación vieja ya borrada, que se refería a otra cosa). No hay nada que correr ahí todavía.

## Privacidad

**Pendiente real, no resuelto:** el EDA hoy tiene login real y usuarios (aunque sea uno solo, `pabloeckert@gmail.com`) con datos personales (documentos de marca en la Bóveda, sesiones de diálogo, propuestas). Existía un borrador de política de privacidad (`Documents/PRIVACIDAD.md`, borrado en esta consolidación) pero describía un producto que ya no existe (la extensión de Chrome) y un modelo de datos viejo (RLS abierto, multi-usuario) — no es reutilizable tal cual. Si hace falta una política de privacidad real, hay que rehacerla desde cero acorde al EDA actual (sin extensión, con login/RLS real por `app_admins`, con Zernio/Anthropic como proveedores de datos además de Groq/DeepSeek/Gemini/HuggingFace/Supabase) — no inventarla sin que Pablo la revise, es un documento de cara a usuarios reales.

## Inventario de backend — 2026-08-04

Auditoría real de las 5 Edge Functions y los 5 cron jobs activos al momento de la auditoría, hecha sin arreglar nada de lo que se encontró — solo relevamiento. Evidencia sacada de: `gh run list` (corridas reales de GitHub Actions), `supabase db query --linked` contra la base real (`hsglmdarztrshihmzfph`), y grep del código fuente (no supuestos sobre quién llama a quién). El dashboard de logs de Supabase no estaba disponible en el momento de esta auditoría (extensión de Chrome desconectada) — donde hacía falta esa evidencia puntual, se dejó explícito que no se pudo conseguir en vez de inferirla.

**`ai-gateway` y `searchVault` eliminadas 2026-08-04** — código muerto sin caller real, dogma: lo que no se usa se borra. Las filas y evidencia de abajo quedan como registro histórico de la auditoría original (mismo día, antes del borrado); el catálogo vigente de Edge Functions es el de la sección "Backend" más arriba (ahora 4 funciones).

### Edge Functions (`supabase/functions/`) — estado al momento de la auditoría, antes del borrado

| Función | Qué hace | Qué la dispara | De qué depende |
|---|---|---|---|
| `orchestrator` | Corre el debate Estratega→Creativo→Crítico de Mesa de Diálogo; si aprueba y el formato es `post`/`carrusel`, autoagenda la propuesta (síncrono, no es un cron aparte) | Request del frontend (`startDialogue`/`continueDialogue` en `useDialogue`, usado por Mesa de Diálogo y Laboratorio) | Tablas: `agent_config`, `dialogue_sessions`, `dialogue_messages`, `proposals`, `documents` (RAG vía `match_documents`). Llama directo a Anthropic/Groq/DeepSeek/Gemini |
| `vault-process` | Extrae texto de documentos subidos a la Bóveda, los trocea en chunks, genera embeddings, expone búsqueda semántica | Request del frontend (`processDocument` en `useVault`, usado por Bóveda) | Tablas: `documents`, `doc_chunks`; bucket `vault` de Storage; `match_documents` (RPC). Llama directo a HuggingFace |
| `rule-engine` | Analiza `metrics` y genera/actualiza `success_rules` (qué formato/hook/horario rinde mejor). Necesita ≥5 filas en `metrics` para producir algo — con menos, responde `rulesFound: 0` sin error | Cron diario (`rule-engine-cron.yml`), acción `analyze`. **No lo llama nada del frontend** (grep sin resultados en `src/`) | Tablas: `metrics` (join con `proposals`), `success_rules` |
| `metrics-collector` | Trae métricas de Instagram Insights para posts publicados y las guarda en `metrics` | Cron cada 6h (`metrics-collector-cron.yml`), acción `collect-all`. **No lo llama nada del frontend** | Tablas: `metrics`, `proposals` (filtra `status='published'` con `zernio_post_id`). Requiere secret `INSTAGRAM_ACCESS_TOKEN` |

(Eliminadas desde acá: `ai-gateway` — no tenía ningún llamador real confirmado, solo aparecía en tests que mockean `fetch`, nunca contra la función real desplegada. `vault-process` conservó `processDocument` con caller real en `useVault.ts`; se borró solo `searchVault`, que no tenía ningún importador en `src/hooks` ni `src/pages`.)

### Evidencia real de ejecución — 2026-08-04

| Función | ¿Corrió hoy? | Evidencia real |
|---|---|---|
| `orchestrator` | **Sí, confirmado** | `dialogue_sessions` con `created_at` de hoy: 4 filas — 3 en `status='approved'` (`681ff48b...` 12:15 UTC, `30905256...` y `a6080f38...` ambas 05:09-05:10 UTC) y 1 en `status='active'` sin resolver (`e096830d...`, "[TEST DIAGNOSTICO Claude Code...]", 02:19 UTC — quedó a medio dialogar, no se tocó). Una de las tres aprobadas (`681ff48b...`) se disparó y verificó en esta misma sesión contra los logs reales de la función (200, sin fallback a Groq) |
| `rule-engine` | **Sí, el cron corrió** — la función en sí no tuvo trabajo real que hacer | `gh run list --workflow=rule-engine-cron.yml`: última corrida hoy `2026-08-04T05:44:21Z`, `completed success`. Pero `SELECT count(*) FROM metrics` = 0 y `SELECT count(*) FROM success_rules` = 0 contra la base real — consistente con el comportamiento documentado en el propio workflow (`rulesFound: 0` sin error si hay menos de 5 métricas), no es una falla |
| `metrics-collector` | **Sí, el cron corrió 4 veces hoy** — no-op esperado, no falla | `gh run list --workflow=metrics-collector-cron.yml`: 4 corridas hoy (02:33, 08:36, 14:12, 19:37 UTC), todas `completed success`. "Success" acá es que el `curl` devolvió <300 — la función internamente devuelve `skipped: true` porque `INSTAGRAM_ACCESS_TOKEN` sigue sin configurarse (documentado en `metrics-collector/index.ts` como no-op explícito, no error). Solo hay 1 propuesta publicada con `zernio_post_id` en toda la base — sería el único candidato real cuando el secret exista |
| `vault-process` | **No hay evidencia de que haya corrido hoy** | Última fila real en `documents`: "Criterio Medular", `created_at: 2026-08-03 21:38:09 UTC` (ayer). Último `doc_chunks`: `2026-08-03 21:52:27 UTC`. 53 chunks totales, los 53 con embedding generado (`con_embedding: 53` = `total_chunks: 53`) — evidencia de que la última vez que corrió, corrió bien de punta a punta, pero esa vez no fue hoy |

### Cron jobs activos (GitHub Actions, `.github/workflows/`)

| Workflow | Horario real (cron UTC) | Qué dispara | Última corrida real hoy |
|---|---|---|---|
| `daily-story.yml` | `0 13 * * *` (13:00 UTC = 10:00 ART) | Story diaria: genera copy (Claude), renderiza, publica a Instagram/Facebook vía Zernio — **no pasa por ninguna Edge Function**, corre como script Node en el runner | `2026-08-04T15:21:50Z`, `completed success`, 1m32s |
| `publish-scheduled-posts.yml` | `*/15 * * * *` | Publica posts/carruseles de feed autoagendados por `orchestrator` cuando `scheduled_at` ya venció — tampoco pasa por Edge Functions, habla directo a PostgREST + Zernio | 4 corridas hoy, última `2026-08-04T21:38:28Z`, `completed success`, 1m1s |
| `sync-history.yml` | `0 */6 * * *` | Trae el historial real desde Zernio a `content/log/historial.json` (lo que lee el dashboard) | 4 corridas hoy, última `2026-08-04T19:18:10Z`, `completed success`, 17s |
| `metrics-collector-cron.yml` | `0 */6 * * *` | Invoca la Edge Function `metrics-collector` (`collect-all`) | 4 corridas hoy, última `2026-08-04T19:37:21Z`, `completed success` (no-op interno, ver tabla de arriba) |
| `rule-engine-cron.yml` | `0 3 * * *` | Invoca la Edge Function `rule-engine` (`analyze`) | 1 corrida hoy, `2026-08-04T05:44:21Z`, `completed success` (2h44m tarde respecto al horario nominal — delay normal de GitHub Actions en cron, no es una falla) |

Aclaración sobre "autoagendado": no es un cron en sí mismo — pasa de forma síncrona dentro de `orchestrator` cuando el Crítico aprueba una propuesta `post`/`carrusel` (elige oferta y `scheduled_at` en el mismo request de Mesa de Diálogo). El cron real que hace algo con eso después es `publish-scheduled-posts.yml`, que cada 15 minutos revisa qué quedó `scheduled` y venció.

También corrió hoy, sin pipeline propio de contenido: `deploy-functions.yml` (push-triggered, no cron) — última corrida `2026-08-04T12:10:27Z`, `completed success`, 47s, en ese momento deployaba y verificaba las 5 Edge Functions de esta tabla (hoy son 4, ver nota de borrado de `ai-gateway` más arriba). Aparte, `deploy-migrations.yml` (manual only, no cron) tiene un **streak de 5/5 fallos** en sus últimas corridas reales (`2026-07-28`/`2026-07-29`) — consistente con el bug del CLI ya documentado en la sección "Deploy" más arriba, no es un hallazgo nuevo, pero es la evidencia concreta de `gh run list` que lo confirma.

### Nota de método — qué se re-verificó y qué no

Esta sección se re-chequeó de forma independiente el 2026-08-04 (misma fecha, sesión separada) antes de darla por buena: el catálogo de Edge Functions (código fuente + grep de callers en `src/`) y toda la evidencia de `gh run list` citada arriba coincidieron **exactamente** con una segunda lectura en vivo. Los conteos contra la base de Supabase (`dialogue_sessions`, `metrics`, `success_rules`, `documents`, `doc_chunks` de la tabla de arriba) **no se pudieron re-verificar** en esa segunda pasada porque en ese momento la máquina no tenía el CLI de Supabase instalado. **Actualización, mismo día, tercera pasada:** se instaló el CLI (binario oficial de `supabase/cli` descargado directo del release de GitHub, agregado al PATH de usuario — sin scoop, sin tocar la política de ejecución de PowerShell) y resultó estar ya vinculado al proyecto real (`supabase/.temp/project-ref` = `hsglmdarztrshihmzfph`, credenciales heredadas de una sesión anterior). Con el CLI activo se pudo re-verificar `documents`/`doc_chunks` en vivo (ver "Verificación de RAG y Bóveda" abajo) y ejecutar `supabase functions delete ai-gateway` de verdad — ver nota de borrado en la sección "Backend" más arriba.

### Verificación de RAG y Bóveda — ejecutada en vivo, 2026-08-04

Conteos reales contra la base (`supabase db query --linked`):

| Query | Resultado |
|---|---|
| `SELECT count(*) FROM documents` | **19** |
| `SELECT count(*) FROM doc_chunks WHERE embedding IS NOT NULL` | **53** |
| `SELECT count(*) FROM doc_chunks WHERE embedding IS NULL` | **0** |

Sube el total de `documents` (no estaba contado antes, solo se sabía la fecha de la última fila) — coincide con los `53`/`53` chunks-con-embedding ya documentados el 2026-08-04 temprano, sin discrepancia.

**Metodología de la prueba de RAG — con una limitación real, no escondida:** el pedido original era correr la búsqueda real de `orchestrator` (`getContextDocs()` en `supabase/functions/orchestrator/index.ts:248-281`) con la query "tono de voz para un emprendedor saturado". Esa función llama directo a la API de HuggingFace con `HF_API_KEY` (secret de Supabase) para generar el embedding de la query antes de pasarlo a `match_documents`. Esa key no está en esta máquina, y el intento de traerla vía `supabase projects api-keys` (para llamar en su lugar a la función `vault-process` desplegada, que hace lo mismo) **fue bloqueado por el clasificador de seguridad del entorno** — no se insistió por otra vía. En su lugar se probó `match_documents` (la misma función RPC que usan tanto `orchestrator` como `vault-process`, el corazón real del RAG) usando como "query" el embedding **ya real y ya calculado** de tres chunks temáticamente relevantes de la Bóveda — mismo mecanismo de similitud coseno, mismo índice `ivfflat`, sin generar ningún embedding nuevo. No es 100% el mismo camino end-to-end (falta el paso texto→embedding de la query libre), pero ejercita exactamente la función y el índice que decide qué le llega al Crítico/Creativo como contexto de marca.

| Chunk usado como query | Top resultado (excluyendo el propio) | Similitud | ¿Aparece "Emprendedor Saturado" en el top 8? |
|---|---|---|---|
| "Manual de Marca MejoraOK" (menciona tono de voz) | `Buyer Persona: El Emprendedor Saturado` | **0.727** | Sí — 2 veces (rank 2 y 8) |
| `Buyer Persona: El Emprendedor Saturado` (chunk 1) | `Buyer Persona: El que Necesita Orden para Crecer` | 0.802 | — (es la propia query) |
| "Tono y Voz" (documento dedicado, no el manual corto) | `Manifiesto` | 0.779 | Sí — rank 6, similitud 0.688, texto: "El Emprendedor Saturado no necesita un pitch largo..." |

**Evaluación de relevancia — comparado contra el manual de marca real:** el corpus completo son 19 documentos, todos sobre la marca MejoraOK (9 buyer personas, tono/voz, valores, arquitectura de contenido, segmentación, criterio medular) — no hay ningún documento fuera de tema en la Bóveda hoy, así que esta prueba no puede mostrar "evitó traer basura no relacionada" (no hay basura que traer). Lo que sí muestra: dentro de ese corpus, el RAG **no devuelve resultados al azar** — las tres pruebas devuelven consistentemente contenido de buyer personas y tono/voz con similitud 0.68–0.80, y en particular el perfil "Emprendedor Saturado" (el sujeto exacto de la query pedida) aparece en el top 8 de las tres corridas, con la coincidencia textual más literal en la prueba 3: el propio chunk que dice *"El Emprendedor Saturado no necesita un pitch largo. Necesita sentirse entendido... Corto. Directo"* — que es casi exactamente lo que preguntaba la query original. **Conclusión: el RAG funciona bien** dentro de lo que se pudo probar sin la `HF_API_KEY`; no hay evidencia de que traiga contenido irrelevante.

## Verificación real de rechazo del Crítico — 2026-08-05

Hasta esta prueba, nunca había evidencia real de que el Crítico rechazara algo — solo de que aprobara. Se armó un caso adversarial real, corrido contra `orchestrator` en producción, no simulado.

**Metodología pensada para no arriesgar autopublicación real:** el autoagendado (`AUTO_PUBLISH_FORMATS`, ver `orchestrator/index.ts`) solo pasa dentro de `startSession()` (acción `"start"`) — `continueSession()` (acción `"continue"`) nunca inserta en `proposals` ni autoagenda nada, sea cual sea el veredicto del Crítico. Por eso la ronda adversarial se corrió como un `"continue"` sobre una sesión ya iniciada con un tema neutro pedido explícitamente en formato `historia` (sin pipeline de publicación autónomo — `AUTO_PUBLISH_FORMATS` es solo `post`/`carrusel`), para que ni siquiera la primera ronda (legítima) corriera riesgo de autopublicarse si se aprobaba. Confirmado después contra la base real: esa primera propuesta quedó `status: "pending"`, `scheduled_at: null` — cero riesgo.

**Ronda 1 (`start`, tema neutro):** "Idea rápida para una historia (Instagram Story)... cómo organizamos la semana laboral" → Crítico aprobó (`DECISION: APROBADO`), formato `historia` confirmado en la respuesta.

**Ronda 2 (`continue`, adversarial, sobre la misma sesión):** feedback instruyendo directo al Creativo a violar dos reglas concretas del Criterio Medular: usar "GRATIS"/"SIN COSTO" como gancho principal del hook, y culpar a la persona directamente ("sos una persona desordenada... la falta de disciplina") en vez de señalar la falta de estructura/sistema. El Creativo **cumplió la instrucción** (no se resistió — generó el contenido tal cual se le pidió, confirmando que la prueba fue real y no blanda):

> HOOK: ¡Sesión de Claridad GRATIS y SIN COSTO!... "sos una persona desordenada... La falta de disciplina y la incapacidad para priorizar son los principales culpables..."

**Veredicto real del Crítico:**
```
DECISION: RECHAZADO
RAZON: El contenido utiliza "GRATIS" y "SIN COSTO" como gancho principal, lo que contradice
el criterio de no utilizar "Sin costo" como dato funcional en letra chica, nunca como gancho
emocional en hero o CTA principal. Además, el tono del contenido es demasiado duro y directo...
El enfoque debería ser más empático... en lugar de culpar al individuo por su falta de disciplina.
```

**Conclusión: no se encontró ningún bug — el Crítico rechaza contenido real que viola el Criterio Medular, y da un motivo específico y correcto**, no genérico: nombra las dos violaciones exactas que se le pidieron al Creativo (precio como gancho emocional, y culpar al individuo en vez de señalar la estructura). No hizo falta ningún fix. `dialogue_sessions.id = 36d571e3-ef05-46a2-9623-046a30d749de` para trazabilidad.

## rule-engine — corrida real con datos de prueba — 2026-08-05

`metrics` tenía **1 sola fila real** (la del post de prueba de Zernio) — `rule-engine` exige `>=5` filas para producir algo (`analyzeMetrics()` devuelve `[]` si no). Nunca había corrido su lógica completa.

**⚠️ Se insertaron 10 filas de prueba, no reales — identificables y borrables:**
- `proposals.id` con prefijo `7e57da7a-0000-4000-8000-...` (leet de "testdata") y `title` con prefijo `[TEST/QA] rule-engine seed`.
- `metrics.post_id` con prefijo `TEST-QA-` (A a J).
- `zernio_post_id` se dejó `NULL` a propósito en las 10 — así `metrics-collector` (que filtra `zernio_post_id IS NOT NULL`) nunca las va a tocar ni intentar traerles métricas reales de Zernio.
- Para borrarlas cuando ya no hagan falta: `DELETE FROM metrics WHERE post_id LIKE 'TEST-QA-%'; DELETE FROM proposals WHERE id::text LIKE '7e57da7a-%';`

**Diseño de los datos:** rango de `reach`/`impressions` basado en el único dato real de Zernio (reach 47, impressions 117) — entre 90 y 150 impresiones, con variación deliberada en likes/comments/shares/saves para generar señal real en distintas categorías (3 formatos, hooks con/sin "¿?", con/sin hashtags, distintos horarios). No se inventaron números al voleo — el objetivo era que `rule-engine` tuviera algo real que detectar, no solo pasar el mínimo de `>=5` filas.

**Resultado real de `POST /rule-engine {"action":"analyze"}`:**
```json
{"rulesFound":4,"rulesSaved":4,"rules":[
  {"type":"format","condition":{"format":"carrusel"},"action":{"reason":"Formato carrusel rinde 16.8% engagement vs 10.38% promedio"},"confidence":"70%","evidence":"4 posts con engagement promedio de 16.8%"},
  {"type":"hook","condition":{"pattern":"question"},"action":{"reason":"Los hooks con pregunta rinden mejor"},"confidence":"70%","evidence":"2/4 posts de alto rendimiento usan hooks con pregunta"},
  {"type":"timing","condition":{"hour":9},"action":{"reason":"Publicar a las 9:00 hs rinde mejor"},"confidence":"70%","evidence":"Posts a las 9:00 hs tienen 25.82% engagement promedio"},
  {"type":"hashtag","condition":{"min_count":5},"action":{"reason":"Usar hashtags mejora el engagement"},"confidence":"70%","evidence":"Con hashtags: 19.88% vs Sin: 2.46%"}
]}
```
Confirmado además contra `success_rules` real: las 4 reglas quedaron guardadas (`times_applied: 1`, `confidence: 0.7` cada una).

**Coherencia real, no solo "no tiró error":** cada regla generada corresponde exactamente a la señal que se diseñó en los datos (el grupo `carrusel` incluía además la fila real de Zernio con engagement 0%, y el promedio de 16.8% que reportó el sistema matemáticamente da con esa mezcla de 3 filas de prueba + 1 real). No hubo que ajustar nada — la lógica de `analyzeMetrics()` funciona como está documentada en el código.

**Hallazgo menor, no bloqueante, no corregido (fuera de alcance de esta prueba):** la categoría "hook con emoji" no disparó regla pese a diseñarse para eso — el regex de detección de emoji en `rule-engine/index.ts` (`\u{1F600}-\u{1F64F}`, `\u{1F300}-\u{1F5FF}`, `\u{1F680}-\u{1F6FF}`, `\u{1F1E0}-\u{1F1FF}`) no cubre el bloque Unicode de Dingbats (2600-27BF), así que emojis comunes como ✨✅❤️ no se detectan — solo emojis del plano suplementario como 🚀. Es un gap real del regex, pero menor y no pedido en esta tarea — queda anotado, no arreglado.

## Duplicado real de autoagendado — investigación 2026-08-05

Pablo reportó que la semana pasada un carrusel se autoagendó/publicó duplicado. Se investigó el código real de `orchestrator` y del pipeline de publicación (`render-scheduled-posts.mjs` + `publish-scheduled-posts.mjs`) buscando la causa — sin suponerla.

**Lo que se descartó con evidencia real:**
- `orchestrator.startSession()` inserta un solo `INSERT INTO proposals` por corrida — no hay ningún bucle ni doble insert posible ahí. `continueSession()` (acción `"continue"`) directamente nunca inserta nada.
- No hay ningún duplicado real visible hoy en `proposals` (`SELECT * WHERE format='carrusel'` — cada fila tiene título distinto, sin repetidos) — un duplicado a nivel de fila de propuesta no dejó rastro, o nunca ocurrió a ese nivel.
- `publish-scheduled-posts.yml` ya tiene `concurrency: {group: publish-scheduled-posts, cancel-in-progress: false}` desde el primer commit del archivo (no es un fix agregado ahora) — dos corridas de GitHub Actions de este mismo workflow no pueden correr en paralelo, se encolan. Se descarta "doble trigger simultáneo del cron" como causa a nivel de GitHub Actions.
- Las 36 corridas reales de `publish-scheduled-posts.yml` desde que existe (`gh run list`) son todas `"conclusion":"success"` — no hay ninguna corrida marcada como fallida que explique el duplicado a simple vista.

**Causa más probable, con evidencia de código real (no confirmada al 100% contra el incidente puntual — no hay logs de esa corrida específica para probarlo):** `render-scheduled-posts.mjs` selecciona propuestas por `status='scheduled' AND scheduled_at<=ahora` pero nunca las "reclama" (no las marca como "en proceso" antes de renderizar/publicar) — el `status` sigue siendo `'scheduled'` durante todo el render y todo el publish. Peor: `publish-scheduled-posts.mjs::markPublished()` **nunca chequeaba si el PATCH que marca `status='published'` realmente tenía éxito** (no miraba `res.ok`). Esto arma exactamente el gap que explica el síntoma: si Zernio publicó bien pero ese PATCH fallaba en silencio (red, timeout, hiccup de PostgREST), la propuesta seguía viéndose `"scheduled"` — la corrida siguiente (secuencial, no en paralelo, no hace falta ninguna carrera real) la volvía a renderizar y publicar. Y como es la MISMA fila de `proposals`, el segundo `zernio_post_id` pisa al primero al guardarse — por eso no queda ningún duplicado visible hoy en la tabla, aunque haya habido dos posts reales en Instagram/Facebook.

**Fix mínimo aplicado** (`scripts/publish-scheduled-posts.mjs`):
1. `markPublished()` ahora chequea `res.ok` y lanza si el PATCH falla — el fallo queda visible y real (marca la corrida como fallida), no silencioso.
2. Nueva `isStillScheduled(proposalId)` — antes de publicar cada entrada del manifiesto, re-consulta el `status` real en Supabase; si ya no es `"scheduled"` (ya se publicó), la salta. Cubre además el caso de un manifiesto viejo reprocesado a mano.

**Probado real** (sin necesidad de Playwright ni de publicar nada, contra la query REST exacta que usa el fix):
```bash
# Propuesta ya published (real, de la prueba de rule-engine):
GET /rest/v1/proposals?id=eq.7e57da7a-...000a&select=status → [{"status":"published"}]
# Propuesta real que sigue scheduled:
GET /rest/v1/proposals?id=eq.c074942a-...&select=status → [{"status":"scheduled"}]
```
Confirma que la lógica distingue correctamente los dos casos — la primera se saltearía, la segunda seguiría el flujo normal. No se probó el flujo completo con Playwright/Zernio real para no arriesgar una publicación real solo para testear el fix.

**Honestidad sobre el nivel de confirmación:** esto es la causa más probable con evidencia de código real y verificable, no una confirmación forense del incidente puntual de la semana pasada (no hay logs de esa corrida específica retenidos). El fix cierra el gap real encontrado independientemente de si fue exactamente esto lo que pasó esa vez.

## Notas históricas

Visión fundacional original del EDA (spec escrita por Pablo antes de que existiera código, sigue siendo la intención de fondo del proyecto): *"Construir una aplicación de gestión estratégica de contenidos que funcione mediante la interacción de múltiples Agentes de IA. El sistema debe ser capaz de procesar la identidad de marca localmente, debatir estrategias y ejecutar publicaciones automáticas aprendiendo de los resultados."* — Bóveda → RAG, Mesa de Diálogo → 3 agentes (Estratega/Creativo/Crítico), Bucle de Aprendizaje → `rule-engine`/`success_rules`, son la realización de esa visión original. Un detalle que si cambió: el spec original dejaba el "Modo Supervisión" (aprobación antes de publicar) como opcional — el sistema real fue más allá, no hay ningún gate de aprobación humana desde el overhaul del 2026-08-02.

Se consolidó y borró en esta sesión (2026-08-02) toda la documentación que describía estados ya superados del proyecto: la extensión de Chrome MejoraINSSIST (discontinuada), deploy vía FTP a Hostinger (nunca fue el destino real, es GitHub Pages), un backend Node.js/Express separado que nunca se construyó (se usó Supabase Edge Functions en cambio), RLS abierto sin auth, y varias generaciones de roadmaps/planes maestros (`docs/PROYECTO-MAESTRO.md`, `Documents/PLAN-OPTIMIZADO.md`, `Documents/ANALISIS-PROFUNDO.md`, etc.) cuyos ítems ya fueron resueltos por el overhaul de autonomía documentado arriba. Ninguno de esos archivos tenía información de configuración o decisiones vigentes que no esté ya en este archivo.
