# 🚀 Prompt para Siguiente Sesión — MejoraSM

Copiá y pegá esto al inicio de tu próxima conversación:

---

## Contexto

Estoy trabajando en **MejoraSocialMedia (EDA)** — un sistema de gestión estratégica de contenidos en Instagram con IA para MejoraOK.

**Repo:** https://github.com/pabloeckert/MejoraSM
**Producción:** https://util.mejoraok.com/MejoraSM/
**Documentación:** `Documents/DOCUMENTACION.md`
**Setup Supabase:** `Documents/SUPABASE_SETUP.md`

## Estado actual

- ✅ Extensión Chrome v1.1.0 funcional (migrada a Manifest V3)
- ✅ Frontend React con 5 páginas + 4 hooks conectados a datos reales
- ✅ Backend código listo (3 Edge Functions + schema SQL)
- ✅ Deploy automático (GitHub Actions → Hostinger)
- ✅ ETAPA 6 completa: strictNullChecks, 21 tests Vitest, lovable-tagger removido, browserslist, code splitting
- 🔄 **ETAPA 1 en progreso** — ver abajo

## ETAPA 1: Activar Backend (en progreso)

| # | Tarea | Estado |
|---|---|---|
| 1.1 | Ejecutar SQL schema en Supabase | ✅ Success (23/04 22:35) |
| 1.2 | Verificar bucket `vault` en Storage | ⏳ Pendiente |
| 1.3 | Configurar API keys en Secrets | ⏳ Pendiente |
| 1.4 | Deploy Edge Functions | ⏳ Pendiente |
| 1.5 | Health check | ⏳ Pendiente |

### Lo que falta hacer en Supabase (resumen):

1. **Storage** → verificar que existe bucket `vault` (privado)
2. **Settings → Edge Functions → Secrets** → agregar:
   - `GROQ_API_KEY` → https://console.groq.com/keys
   - `DEEPSEEK_API_KEY` → https://platform.deepseek.com/api_keys
   - `GEMINI_API_KEY` → https://aistudio.google.com/apikey
3. **Edge Functions** (menú izquierdo) → deploy las 3 funciones: `ai-gateway`, `orchestrator`, `vault-process`
4. Pasarme **Project URL** + **anon key** (Settings → API) para conectar el frontend

### Para deploy de Edge Functions desde terminal:
```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase functions deploy ai-gateway
npx supabase functions deploy orchestrator
npx supabase functions deploy vault-process
```

## Lo que quiero hacer hoy

[ESCRIBÍ ACÁ LO QUE QUERÉS LOGRAR EN ESTA SESIÓN]

## Reglas

- Cuando diga **"documentar"**, actualizá `Documents/DOCUMENTACION.md` con los avances
- Repo: https://github.com/pabloeckert/MejoraSM
- Token GitHub: [PEDIR SI ES NECESARIO]
- No toques archivos en `docs/` (legacy, solo lectura)
- Los hooks están en `src/hooks/`, las páginas en `src/pages/`
- Build: `npm install --legacy-peer-deps && npm run build`
- Tests: `npm test` (21 tests, Vitest)
