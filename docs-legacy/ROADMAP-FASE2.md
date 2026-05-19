# 🗺️ Roadmap Fase 2 — Dashboard Real + Mesa de Diálogo

## Estado: Próxima sesión

### Paso 1: Setup Supabase (manual, Pablo)
- [ ] Ejecutar `docs/SUPABASE-SCHEMA.sql` en SQL Editor de Supabase
- [ ] Crear bucket `documents` en Storage (privado)
- [ ] Configurar Auth (email/password habilitado)
- [ ] Guardar Groq API key como Secret en Supabase:
  - Ir a: Settings → Edge Functions → Secrets
  - Agregar: `GROQ_API_KEY` = `[VER EN GROQ-SETUP.md O EN CHAT PRIVADO]`

### Paso 2: Edge Function para Groq (código)
- [ ] Crear `supabase/functions/chat-with-agent/index.ts`
- [ ] Deploy de la función: `supabase functions deploy chat-with-agent`
- [ ] Test desde frontend

### Paso 3: Frontend — Mesa de Diálogo
- [ ] Conectar `src/pages/MesaDialogo.tsx` a Supabase
- [ ] UI: Input de tema + botón "Iniciar Diálogo"
- [ ] Mostrar los 3 agentes con avatares (🎨 Estratega, ✍️ Creativo, 🔍 Crítico)
- [ ] Flujo secuencial: Estratega → Creativo → Crítico
- [ ] Botón "Aprobar contenido" que guarda en tabla `contents`

### Paso 4: Frontend — Bóveda de Conocimiento
- [ ] Conectar `src/pages/Boveda.tsx` a Supabase
- [ ] Upload de archivos a Storage
- [ ] Listar documentos con título, tipo, fecha
- [ ] Eliminar documentos
- [ ] Categorías: Manual de Marca, Buyer Persona, Tono de Voz, Otro

### Paso 5: Frontend — Dashboard real
- [ ] Stats reales desde Supabase (COUNT de cada tabla)
- [ ] "Aprobaciones pendientes" = contents con status='draft'
- [ ] Calendario de contenido (scheduled_at)

### Paso 6: Auth
- [ ] Página de Login/Register
- [ ] Proteger rutas (redirect a login si no autenticado)
- [ ] Logout

### Paso 7: Deploy
- [ ] Push a main → auto-deploy
- [ ] Verificar en https://util.mejoraok.com/MejoraSM/

## Stack técnico
- **Frontend**: React 18 + Tailwind + shadcn/ui
- **Backend**: Supabase (Auth, DB, Storage, Edge Functions)
- **IA**: Groq (Llama 4 Scout 8B) — vía Edge Function
- **Deploy**: GitHub Actions → FTP a Hostinger

## Credenciales (para referencia)
```
Supabase URL: https://exnjyxwmxknvzploeaex.supabase.co
Supabase Project ID: exnjyxwmxknvzploeaex
Groq API Key: [VER EN GROQ-SETUP.md O EN CHAT PRIVADO]
GitHub: https://github.com/pabloeckert/MejoraSM
Deploy URL: https://util.mejoraok.com/MejoraSM/
```
