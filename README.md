# 🎯 MejoraSM — MejoraOK

Cinco productos que comparten repo, para la marca [MejoraOK](https://mejoraok.com). Solo el primero usa Supabase; el resto son estáticos o corren por GitHub Actions.

---

## 📦 Los cinco productos

### 1. EDA (Estratega Digital Autónoma)
SaaS de gestión de contenido con IA: `src/` (React 18 + TypeScript + Vite + shadcn/ui) + `supabase/` (Edge Functions Deno + Postgres/pgvector). Informe técnico completo — arquitectura, pantallas, Edge Functions, modelo de datos, seguridad — en **[`EDA.md`](EDA.md)**.

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

**Deploy: activo.** **https://pabloeckert.github.io/MejoraSM/app/** — GitHub Pages, junto con `hub/`, `biblioteca/` y `dashboard/` en el mismo sitio. Requiere login (Supabase Auth); detalle de acceso y seguridad en `EDA.md`.

`util.mejoraok.com` y `mejorasm.vercel.app` (mencionados en versiones anteriores de este README y todavía en el CORS allowlist de las Edge Functions) no resuelven / no tienen deploy activo — son residuo, no el destino real.

### 2. Sistema de story diaria autónoma
`scripts/` (Node/ESM) + `templates/` + `content/`. Corre por GitHub Actions (`.github/workflows/daily-story.yml`, cron diario + `workflow_dispatch` manual).

```
content/inbox/<oferta>/*.jpg  → scripts/generate-brief.mjs (Claude, vía scripts/lib/claude.mjs)
                               → content/work/briefs.json
                               → scripts/render-story.mjs (Playwright + templates/story-template.html)
                               → scripts/publish-story.mjs (scripts/lib/zernio.mjs → Instagram + Facebook)
                               → foto usada se mueve a content/used/<oferta>/
```

- 5 dimensiones de marca: `personal`, `organizacional`, `comercial`, `empresarial`, `profesionalizacion` (subcarpetas de `content/inbox/` y `content/used/`).
- El copy se orienta según la identidad de marca, traída en vivo en cada corrida desde el repo [MejoraIdentidad](https://github.com/pabloeckert/MejoraIdentidad) (`SKILL.md`) — sin copia local en este repo.
- Videos en `inbox/` se detectan pero todavía no se procesan (se avisan en el log, no se pierden).
- `content/published/` guarda las imágenes ya renderizadas y publicadas — el workflow las commitea para que sean accesibles vía `raw.githubusercontent.com`, consumido por la Graph API de Meta a través de Zernio.
- Secrets en GitHub Actions (no en `.env` local): `ANTHROPIC_API_KEY`, `ZERNIO_API_KEY`, `ZERNIO_FACEBOOK_ACCOUNT_ID`, `ZERNIO_INSTAGRAM_ACCOUNT_ID`.

### 3. Hub de contenido
`hub/index.html` — página estática (sin build) con 5 tarjetas, una por oferta, que linkean directo a la UI de upload de GitHub para subir fotos a `content/inbox/<oferta>/` sin tocar git a mano. Desplegado a GitHub Pages vía `.github/workflows/deploy-hub.yml` (trigger: push a `hub/**`, o manual).

**Deploy:** activo y confirmado en **https://pabloeckert.github.io/MejoraSM/**.

### 4. Biblioteca de contenido
`biblioteca/` — página estática (sin build) para cargar, etiquetar y organizar el contenido que alimenta `content/inbox/` del sistema de stories. Escribe al repo vía API de GitHub (PAT fine-grained guardado solo en `localStorage` del navegador, nunca commiteado).

**Deploy:** activo en **https://pabloeckert.github.io/MejoraSM/biblioteca/**.

### 5. Dashboard / Monitor de stories
`dashboard/index.html` — panel de solo lectura sobre lo publicado/programado por el sistema de stories (lee `content/log/historial.json`).

**Deploy:** activo en **https://pabloeckert.github.io/MejoraSM/dashboard/**.

---

## 🛠️ Variables de entorno

Ver `.env.example`. Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Edge Functions (se configuran como secrets en Supabase, no en `.env` local): `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `HF_API_KEY`.

## 📚 Documentación

- `CLAUDE.md` — guía de arquitectura para trabajar en el repo con Claude Code.
- `Documents/` y `docs/` tienen documentación histórica de sesiones anteriores — puede estar desactualizada respecto al estado real de deploy descripto arriba; priorizar lo verificado en este README y en `CLAUDE.md`.

## 📄 Licencia

Privado — MejoraOK © 2026
