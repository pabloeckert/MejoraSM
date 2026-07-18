# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este repo

Un solo producto: **MejoraSM**, para la marca MejoraOK. Tiene tres partes que comparten backend Supabase:

1. **EDA (Estratega Digital Autónoma)** — SaaS de gestión de contenido con IA: `src/` (React) + `supabase/` (Edge Functions + Postgres). Documentado en el `README.md` raíz.
2. **Sistema de story diaria autónoma** — `scripts/` (Node/ESM), corre por GitHub Actions (`.github/workflows/daily-story.yml`). Lee fotos de `content/inbox/<oferta>/`, genera el copy llamando directo a la API de Anthropic (`scripts/lib/claude.mjs`), renderiza la pieza de marca (`scripts/render-story.mjs` + `templates/story-template.html`) y publica en Instagram/Facebook vía Zernio (`scripts/publish-story.mjs`, `scripts/lib/zernio.mjs`).
3. **Hub de contenido** — `hub/index.html`, página estática desplegada a GitHub Pages (`.github/workflows/deploy-hub.yml`) para subir fotos a `content/inbox/<oferta>/` sin tocar git a mano.

(Nota histórica: hubo un producto separado, una extensión de Chrome llamada MejoraInstaStories/MejoraINSSIST, que vivió en `extension/` y en varios duplicados en la raíz. Se discontinuó y se eliminó del repo por completo — quedó superada por el sistema de story diaria + hub descriptos arriba.)

## Comandos principales

```bash
npm run dev           # Vite dev server, app EDA (React), puerto 8080
npm run build          # Build de producción (dist/)
npm run lint           # ESLint (*.ts/*.tsx)
npm test               # Vitest (src/**/*.{test,spec}.{ts,tsx}, jsdom)
```

Si `npm test` falla con `Cannot find package '@vitejs/plugin-react-swc'`, es que `node_modules` no tiene las devDependencies instaladas (falta `npm ci`/`npm install`) — no es un problema del código.

## Arquitectura: EDA (`src/` + `supabase/`)

Frontend Vite + React 18 + TypeScript + shadcn/ui + Tailwind + React Router + TanStack Query. Alias `@` → `src/` (definido en `vite.config.ts`, `tsconfig.json` y `components.json`).

Páginas (`src/pages/`) y su rol:
- `Dashboard` — KPIs principales
- `Boveda` — bóveda de documentos de marca (RAG)
- `MesaDialogo` — mesa de diálogo multi-agente (debate Estratega/Creativo/Crítico)
- `Laboratorio` — laboratorio de contenido
- `Calendario` — calendario editorial
- `Propuestas` — cola de aprobación de propuestas de contenido
- `Configuracion` — configuración de agentes de IA

Hooks custom en `src/hooks/` (`useVault`, `useDialogue`, `useProposals`, `useMetrics`) llaman a `src/services/ai.ts` (invoca Edge Functions) y `src/services/supabase.ts` (CRUD directo). El cliente Supabase vive en `src/integrations/supabase/client.ts` y usa `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`). `src/components/ui/` es el set estándar de shadcn sin modificar; la UI propia está en `src/components/layout/` (AppSidebar, AppLayout).

Backend en `supabase/functions/` (Deno, Edge Functions), cada una con su propia allowlist de CORS (`util.mejoraok.com`, `mejorasm.vercel.app`, localhost):
- `ai-gateway` — gateway universal de IA (Groq, DeepSeek, Gemini, HuggingFace)
- `orchestrator` — orquesta el debate multi-agente (Estratega → Creativo → Crítico)
- `vault-process` — extrae texto/chunks/embeddings de documentos para RAG
- `publisher` — publica contenido programado en Instagram
- `rule-engine` — analiza métricas y genera reglas de éxito
- `metrics-collector` — recolecta métricas de Instagram Insights (pensado para cron cada 6h)

`supabase/migrations/` tiene schema SQL + pgvector. Ojo: existen `003_indexes_and_constraints.sql` y `003_indexes_constraints.sql` — parecen duplicados, confirmar cuál es el vigente antes de tocar migraciones.

`scripts/deploy.sh` tiene hardcodeado un `PROJECT_REF` distinto al `project_id` de `supabase/config.toml` — verificar cuál es el proyecto Supabase correcto antes de deployar.

## Arquitectura: story diaria autónoma (`scripts/`, `content/`, `templates/`)

Flujo (disparado por `.github/workflows/daily-story.yml`, cron diario + `workflow_dispatch` manual):

```
content/inbox/<oferta>/*.jpg  → scripts/generate-brief.mjs (Claude, vía scripts/lib/claude.mjs)
                               → content/work/briefs.json
                               → scripts/render-story.mjs (Playwright + templates/story-template.html)
                               → scripts/publish-story.mjs (scripts/lib/zernio.mjs → Instagram + Facebook)
                               → foto usada se mueve a content/used/<oferta>/
```

`content/inbox/` y `content/used/` tienen 5 subcarpetas, una por dimensión del Manual de Marca: `personal`, `organizacional`, `comercial`, `empresarial`, `profesionalizacion`. `generate-brief.mjs` orienta el copy según la carpeta de origen de la foto. Videos en `inbox/` se detectan pero no se procesan todavía (se avisan en el log, no se pierden).

`content/published/` guarda las imágenes ya renderizadas y publicadas (el workflow las commitea para que sean accesibles vía `raw.githubusercontent.com`, que es lo que consume la Graph API de Meta).

`ANTHROPIC_API_KEY` y las credenciales de Zernio (`ZERNIO_API_KEY`, `ZERNIO_FACEBOOK_ACCOUNT_ID`, `ZERNIO_INSTAGRAM_ACCOUNT_ID`) van como secrets del repo en GitHub Actions, no en `.env` local.

## Arquitectura: hub de contenido (`hub/`)

`hub/index.html` es una página estática (sin build) con 5 tarjetas, una por oferta, que linkean directo a la UI de upload de GitHub (`github.com/.../upload/main/content/inbox/<oferta>`) — subir una foto ahí hace commit directo a `content/inbox/<oferta>/`, que dispara el flujo de arriba en la próxima corrida del workflow. Se despliega a GitHub Pages vía `.github/workflows/deploy-hub.yml` (trigger: push a `hub/**`, o manual).

## Deploy

- `vercel.json`: build de Vite (`dist/`, la app EDA) a Vercel.
- `.github/workflows/deploy-hub.yml`: publica `hub/` a GitHub Pages.
- `README.md` / `Documents/CTO-CONTEXT.md`: describen deploy de EDA vía FTP a Hostinger (`https://util.mejoraok.com/MejoraSM/`).

No asumir cuál es el destino de deploy real de la app EDA sin preguntar — FTP a Hostinger y Vercel conviven documentados.

## Variables de entorno

Definidas en `.env.example` (copiar a `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (frontend), `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `HF_API_KEY` (Edge Functions — se configuran como secrets en Supabase, no en `.env` local).

## `backend/` y `dashboard/`

Son stubs vacíos (solo `README.md`, sin código) para fases futuras del roadmap ("Fase 2" y "Fase 5"). No hay nada que correr ahí todavía.
