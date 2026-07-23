# 🎯 MejoraSM — MejoraOK

Un solo producto con tres partes que comparten backend Supabase, para la marca [MejoraOK](https://mejoraok.com).

---

## 📦 Las tres partes

### 1. EDA (Estratega Digital Autónoma)
SaaS de gestión de contenido con IA: `src/` (React 18 + TypeScript + Vite + shadcn/ui) + `supabase/` (Edge Functions Deno + Postgres/pgvector).

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + shadcn/ui |
| Backend | Supabase Edge Functions (Deno) |
| Base de datos | PostgreSQL + pgvector |
| IA | Groq · DeepSeek · Gemini · HuggingFace |

```bash
npm install --legacy-peer-deps
npm run dev       # Servidor local (puerto 8080)
npm run build     # Build de producción (dist/)
npm run lint      # ESLint
npm test          # Vitest
```

**Deploy: pendiente de decidir.** Hoy no hay ningún entorno de producción activo y confirmado para esta app:
- `util.mejoraok.com` (el dominio documentado en versiones anteriores de este README) **no resuelve DNS** — no existe.
- `mejorasm.vercel.app` (referenciado en el CORS allowlist de las Edge Functions y en `vercel.json`) **devuelve 404** — no hay deployment vivo ahí tampoco.
- Los secrets `FTP_HOST` / `FTP_USERNAME` / `FTP_PASSWORD` siguen configurados en el repo, pero **ningún workflow los usa** (`ci.yml`, `daily-story.yml`, `deploy-functions.yml`, `deploy-hub.yml` — ninguno hace deploy FTP). Son residuo de un flujo que ya no corre.
- `vercel.json` existe y tiene config de build de Vite correcta, pero no hay evidencia de un proyecto Vercel conectado y sirviendo hoy.

Antes de asumir un destino de deploy, confirmar con Pablo cuál es el plan (¿Vercel? ¿otro hosting?) — no reintroducir Hostinger/FTP como si fuera el estado vigente.

### 2. Sistema de story diaria autónoma
`scripts/` (Node/ESM) + `templates/` + `content/` + `docs/identidad-de-marca/`. Corre por GitHub Actions (`.github/workflows/daily-story.yml`, cron diario + `workflow_dispatch` manual).

```
content/inbox/<oferta>/*.jpg  → scripts/generate-brief.mjs (Claude, vía scripts/lib/claude.mjs)
                               → content/work/briefs.json
                               → scripts/render-story.mjs (Playwright + templates/story-template.html)
                               → scripts/publish-story.mjs (scripts/lib/zernio.mjs → Instagram + Facebook)
                               → foto usada se mueve a content/used/<oferta>/
```

- 5 dimensiones de marca: `personal`, `organizacional`, `comercial`, `empresarial`, `profesionalizacion` (subcarpetas de `content/inbox/` y `content/used/`).
- El copy se orienta según `docs/identidad-de-marca/` (criterio medular, tono y voz).
- Videos en `inbox/` se detectan pero todavía no se procesan (se avisan en el log, no se pierden).
- `content/published/` guarda las imágenes ya renderizadas y publicadas — el workflow las commitea para que sean accesibles vía `raw.githubusercontent.com`, consumido por la Graph API de Meta a través de Zernio.
- Secrets en GitHub Actions (no en `.env` local): `ANTHROPIC_API_KEY`, `ZERNIO_API_KEY`, `ZERNIO_FACEBOOK_ACCOUNT_ID`, `ZERNIO_INSTAGRAM_ACCOUNT_ID`.

### 3. Hub de contenido
`hub/index.html` — página estática (sin build) con 5 tarjetas, una por oferta, que linkean directo a la UI de upload de GitHub para subir fotos a `content/inbox/<oferta>/` sin tocar git a mano. Desplegado a GitHub Pages vía `.github/workflows/deploy-hub.yml` (trigger: push a `hub/**`, o manual).

**Deploy:** activo y confirmado en **https://pabloeckert.github.io/MejoraSM/**.

---

## 🛠️ Variables de entorno

Ver `.env.example`. Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Edge Functions (se configuran como secrets en Supabase, no en `.env` local): `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `HF_API_KEY`.

## 📚 Documentación

- `CLAUDE.md` — guía de arquitectura para trabajar en el repo con Claude Code.
- `Documents/` y `docs/` tienen documentación histórica de sesiones anteriores — puede estar desactualizada respecto al estado real de deploy descripto arriba; priorizar lo verificado en este README y en `CLAUDE.md`.

## 📄 Licencia

Privado — MejoraOK © 2026
