# 🚀 Prompt para Siguiente Sesión — MejoraSM

Copiá y pegá esto al inicio de tu próxima conversación:

---

## Contexto

Estoy trabajando en **MejoraSocialMedia (EDA)** — un sistema de gestión estratégica de contenidos en Instagram con IA para MejoraOK.

**Repo:** https://github.com/pabloeckert/MejoraSM
**Producción:** https://util.mejoraok.com/MejoraSM/
**Documentación:** `Documents/DOCUMENTACION.md` (lee este archivo para entender el estado actual)

## Estado actual

- ✅ Extensión Chrome v1.1.0 funcional
- ✅ Frontend React con 5 páginas + 4 hooks conectados a datos reales
- ✅ Backend código listo (3 Edge Functions + schema SQL)
- ✅ Deploy automático (GitHub Actions → Hostinger)
- ✅ Documentación unificada

## Lo que falta (ETAPA 1 — requiere mi acción en Supabase)

1. Ejecutar `supabase/migrations/001_initial_schema.sql` en Supabase SQL Editor
2. Crear bucket `vault` en Supabase Storage (privado)
3. Configurar API keys en Supabase Edge Functions Secrets:
   - `GROQ_API_KEY` → https://console.groq.com
   - `DEEPSEEK_API_KEY` → https://platform.deepseek.com
   - `GEMINI_API_KEY` → https://aistudio.google.com/apikey
   - `HF_API_KEY` → https://huggingface.co/settings/tokens
4. Deploy Edge Functions: `supabase functions deploy ai-gateway orchestrator vault-process`

## Lo que quiero hacer hoy

[ESCRIBÍ ACÁ LO QUE QUERÉS LOGRAR EN ESTA SESIÓN]

## Reglas

- Cuando diga **"documentar"**, actualizá `Documents/DOCUMENTACION.md` con los avances
- Repo: https://github.com/pabloeckert/MejoraSM
- Token GitHub: [SI LO NECESITÁS, PEDIMELO]
- No toques archivos en `docs/` (legacy, solo lectura)
- Los hooks están en `src/hooks/`, las páginas en `src/pages/`
- El build se hace con `npm install --legacy-peer-deps && npm run build`
