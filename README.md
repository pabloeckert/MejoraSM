# 🎯 MejoraSocialMedia — Estratega Digital Autónoma (EDA)

Sistema completo de gestión estratégica de contenidos en Instagram mediante múltiples agentes de IA.

**Para:** [MejoraOK](https://mejoraok.com) — Claridad estratégica para emprendedores, líderes y profesionales argentinos.

---

## 🚀 Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + shadcn/ui |
| Backend | Supabase Edge Functions (Deno) |
| Base de datos | PostgreSQL + pgvector |
| IA | Groq · DeepSeek · Gemini · HuggingFace |
| Extensión | Chrome Extension (Instagram) |
| Deploy | GitHub Actions → Hostinger (FTP) |

## 📦 Estructura

```
src/              ← Frontend React
supabase/         ← Edge Functions + migraciones SQL
extension/        ← Extensión Chrome MejoraINSSIST
Documents/        ← Documentación unificada
docs/             ← Documentación legacy
```

## 🛠️ Desarrollo

```bash
npm install --legacy-peer-deps
npm run dev       # Servidor local
npm run build     # Build de producción
npm run test      # Tests con Vitest
```

## 🌐 Producción

**URL:** https://util.mejoraok.com/MejoraSM/

Deploy automático en cada push a `main` vía GitHub Actions.

## 📚 Documentación

Ver [`Documents/DOCUMENTACION.md`](Documents/DOCUMENTACION.md) para documentación completa.

## 📄 Licencia

Privado — MejoraOK © 2026
