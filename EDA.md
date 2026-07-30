# EDA — Estratega Digital Autónoma

Informe técnico completo. Última actualización: **2026-07-30**.

Este documento es autocontenido — pensado para poder compartirse solo (por ejemplo, pegado en otra conversación) sin necesitar el resto del repo para entender qué es el EDA, cómo funciona y en qué estado está.

---

## 1. Qué es

El EDA es uno de los 5 productos del repo **MejoraSM** (marca **MejoraOK**), y el único que usa Supabase como backend. Es un SaaS de gestión de contenido con IA: un frontend React que orquesta 3 "agentes" (Estratega, Creativo, Crítico) que debaten y generan contenido de Instagram/Facebook usando como contexto documentos de marca que el usuario sube (manual de marca, buyer persona, tono de voz).

No hay que confundirlo con el **sistema de story diaria autónoma** (`scripts/`, corre por cron en GitHub Actions, publica una story por día) — son dos productos separados dentro del mismo repo, con bases de datos y flujos de publicación completamente distintos. El EDA es manual/interactivo (el usuario decide qué generar y cuándo aprobar); el sistema de stories es automático.

## 2. Cómo se accede

**URL: https://pabloeckert.github.io/MejoraSM/app/**

Pide login (Supabase Auth, email + contraseña, con alta de cuenta desde la misma pantalla). Solo entran usuarios cuyo email esté en la tabla `app_admins` de Postgres. Hoy (2026-07-30) están habilitados:

- `pabloeckert@gmail.com` — la cuenta real del operador.
- `pablo@mejoraok.com` — **cuenta ficticia**, la inventó una sesión anterior de Claude Code como placeholder de admin durante el hardening de seguridad. Nunca fue una cuenta real de nadie. Se dejó en la allowlist por compatibilidad (no molesta), pero no hay que asumir que existe ni enviarle nada.

Repo: **https://github.com/pabloeckert/MejoraSM**

## 3. Arquitectura general

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
│  RLS: solo admins            │
└───────────────────────────────┘
```

- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Tailwind + React Router (`HashRouter`, necesario por el subpath de GitHub Pages) + TanStack Query. Alias `@` → `src/`.
- **Backend**: 6 Edge Functions Deno + Postgres 17 con `pgvector` para embeddings/RAG. Proyecto Supabase: **`hsglmdarztrshihmzfph`** (org `MC`, plan free).
- El frontend llama a las Edge Functions para todo lo que involucra IA (`src/services/ai.ts`), y a Postgres directo (vía cliente Supabase JS, respetando RLS) para CRUD simple (`src/services/supabase.ts`).

## 4. Frontend — las 7 pantallas

| Pantalla | Ruta | Qué hace |
|---|---|---|
| **Login** | `/login` | Email/contraseña contra Supabase Auth, con alta de cuenta. Gatea todo lo demás vía `AuthGate.tsx`. |
| **Dashboard** | `/` | 4 métricas clicables (documentos, diálogos, contenidos, publicaciones programadas), gráfico de engagement por post, distribución por formato, aprobaciones pendientes, próximos eventos del calendario. |
| **Bóveda de Conocimiento** | `/boveda` | Subís documentos (PDF/doc/txt/md) de marca. Dispara `vault-process`: extrae texto, lo trocea en chunks, genera embeddings. Buscador y borrado de documentos. |
| **Mesa de Diálogo** | `/mesa` | Le das un tema y dispara `orchestrator`: Estratega propone → Creativo redacta → Crítico evalúa contra los documentos de la Bóveda (RAG) y aprueba o pide revisión. Conversación completa visible turno por turno, con feedback iterativo. |
| **Laboratorio de Contenido** | `/laboratorio` | Versión directa: describís qué querés comunicar y te devuelve una propuesta ya armada (estrategia + copy + evaluación + hook/CTA/hashtags) lista para copiar o aprobar. |
| **Calendario Editorial** | `/calendario` | Calendario mensual navegable para programar publicaciones (título, fecha, hora, formato), opcionalmente vinculadas a una propuesta ya generada. |
| **Propuestas** | `/propuestas` | Cola de aprobación con tabs (Pendientes/Aprobadas/Programadas/Todas). Aprobar, rechazar con motivo, agendar, vista previa, copiar. |
| **Configuración** | `/configuracion` | Por cada uno de los 3 agentes: proveedor de IA, modelo exacto y temperatura, persistido en `agent_config`. |

Hooks custom en `src/hooks/`: `useVault`, `useDialogue`, `useProposals`, `useMetrics` — envuelven las llamadas a Edge Functions y a Postgres con TanStack Query.

## 5. Backend — las 6 Edge Functions

Todas en `supabase/functions/`, cada una con su propio CORS allowlist y protegidas por el guard compartido `_shared/auth.ts` (`requireAuth`, ver sección 7).

| Función | Rol |
|---|---|
| `ai-gateway` | Gateway universal de IA — habla con Groq, DeepSeek, Gemini y HuggingFace (embeddings) según lo que pida el agente/tarea. |
| `orchestrator` | Corre el debate Estratega → Creativo → Crítico de la Mesa de Diálogo, trayendo contexto de la Bóveda vía `match_documents` (RAG). |
| `vault-process` | Procesa documentos subidos (extracción, chunking, embeddings) y expone la búsqueda semántica (`action: "search"`). |
| `publisher` | Publica contenido programado directo en Instagram (Graph API). |
| `rule-engine` | Analiza métricas de posts pasados y genera reglas de éxito (qué formato/hora/tono funciona mejor). |
| `metrics-collector` | Trae métricas de Instagram Insights. Pensada para cron cada 6h — **todavía no tiene ningún workflow que la dispare automáticamente**, hoy es manual. |

Deploy: `.github/workflows/deploy-functions.yml`, dispara con cualquier push a `supabase/functions/**`, o manual eligiendo una función puntual.

## 6. Modelo de datos

10 tablas en el schema `public`, todas con RLS habilitado:

| Tabla | Para qué |
|---|---|
| `documents` | Metadata de cada documento subido a la Bóveda |
| `doc_chunks` | Chunks de texto + embedding (`vector(384)`) de cada documento, para RAG |
| `agent_config` | Config (proveedor/modelo/temperatura) de los 3 agentes — editable desde `/configuracion` |
| `dialogue_sessions` | Cada sesión de Mesa de Diálogo (tema, estado, propuesta final) |
| `dialogue_messages` | Mensajes de cada agente dentro de una sesión, por turno |
| `proposals` | Propuestas de contenido generadas (hook, body, cta, hashtags, formato, estado) |
| `calendar_events` | Eventos del calendario editorial, opcionalmente ligados a una propuesta |
| `metrics` | Métricas de posts publicados (likes, comments, reach, engagement_rate calculado) |
| `success_rules` | Reglas aprendidas por `rule-engine` |
| `app_admins` | Allowlist de emails con acceso (ver sección 7) |

Función RAG: `match_documents(query_embedding, match_count, similarity_threshold)` — búsqueda por similitud coseno sobre `doc_chunks` vía índice `ivfflat`. Bucket de Storage: `vault` (privado), para los archivos originales subidos.

## 7. Seguridad

Hasta el 2026-07-28 el EDA no tenía ningún control de acceso: RLS abierto (`USING (true)`), sin login, Edge Functions sin validar quién llamaba. Se cerró en tres capas:

1. **Frontend**: `AuthGate.tsx` bloquea toda la app sin sesión de Supabase Auth.
2. **RLS**: función `is_app_admin()` (SECURITY DEFINER) valida el email del JWT contra `app_admins`. Reemplaza las 9 políticas "Allow all" por `"Admin full access" USING (is_app_admin())`. Mismo criterio para el bucket `vault`.
3. **Edge Functions**: `requireAuth()` exige un JWT de un email en el secret `ADMIN_EMAILS` (hoy: `pablo@mejoraok.com,pabloeckert@gmail.com`), o la propia `SUPABASE_SERVICE_ROLE_KEY` como Bearer token para llamadas servidor-a-servidor.

Para dar acceso a alguien más: insertar su email en `app_admins` Y agregarlo a `ADMIN_EMAILS` — no hay UI para esto, se hace por SQL / `supabase secrets set`.

## 8. Infraestructura y deploy

- **Supabase**: proyecto `hsglmdarztrshihmzfph` (plan free), región us-west-2.
- **Frontend**: GitHub Pages, deployado junto con `hub/`, `biblioteca/` y `dashboard/` como un único sitio (`deploy-eda.yml` entre otros arma el `_site/` combinado).
- **CI**: `ci.yml` corre lint/test/build en cada push — hoy en rojo por ~75 errores de lint preexistentes, sin relación con el EDA en sí, no bloquea nada (no hay branch protection).
- **Secrets de Supabase** (Edge Functions): `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `HF_API_KEY`, `ADMIN_EMAILS`, `SUPABASE_SERVICE_ROLE_KEY` (automático).
- **Secrets de GitHub** (Actions): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

## 9. Qué se hizo el 2026-07-29/30 (reactivación)

El EDA quedó con el código de seguridad listo desde el 2026-07-28, pero **sin ninguna tabla creada** en la base real — `supabase db push` fallaba siempre (bug del CLI de Supabase, motor "Effect", sin relación con el SQL en sí). El 2026-07-30 se resolvió:

- Se corrió el schema completo (`001` a `006`) a mano en el SQL Editor del dashboard de Supabase, evitando el CLI roto.
- Se descubrió que `supabase db query --linked "<SQL>"` ejecuta contra la base real sin pasar por el motor roto — útil para cambios puntuales futuros sin depender del dashboard.
- Dos bugs encontrados y corregidos, ambos rompían features enteras desde que existen:
  - **HuggingFace URL mal escrita** (`api-inference.huggingface.com` en vez de `.co`) en `ai-gateway`, `orchestrator` y `vault-process` — rompía toda generación de embeddings (Bóveda/RAG).
  - **`match_documents` con mismatch de tipos** (`REAL` vs `double precision`, por el operador `<=>` de pgvector) — rompía la búsqueda RAG en cada llamada.
- `ADMIN_EMAILS` seteado con la cuenta real (`pabloeckert@gmail.com`) además del placeholder viejo.
- De paso, se arregló un bug no relacionado en el sistema de story diaria (`scripts/generate-brief.mjs`): `max_tokens` muy ajustado rompía el parseo del JSON de Claude — ver commit `55b5efb`.

## 10. Problemas conocidos / deuda técnica

- `supabase db push` / `deploy-migrations.yml` siguen rotos (bug del CLI, no reportado como resuelto en Supabase todavía). Usar `supabase db query --linked` o el SQL Editor del dashboard para cambios de schema futuros, **no** `db push` — si se corre igual, va a reintentar `001_initial_schema.sql` completo, que no tiene los `DROP POLICY IF EXISTS` que sí tienen las migraciones posteriores, y podría reabrir el RLS.
- CI en rojo por lint preexistente (no relacionado a este producto).
- `metrics-collector` no tiene ningún cron disparándola — hoy es 100% manual.
- No hay UI para gestionar `app_admins` — todo por SQL.
- `publisher` publica directo en Instagram sin ningún paso de confirmación adicional una vez que una propuesta está aprobada y programada — ejercer criterio antes de aprobar.

## 11. Trabajar en esto localmente

```bash
npm install --legacy-peer-deps
npm run dev       # http://localhost:8080
npm run build
npm run lint
npm test
```

Variables de entorno: ver `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` para el frontend local — los secrets de Edge Functions se configuran en Supabase, no acá).

Documentación relacionada: `CLAUDE.md` (guía general del repo completo, los 5 productos) y `README.md` (raíz).
