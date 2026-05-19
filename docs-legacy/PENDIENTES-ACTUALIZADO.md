# 📋 Pendientes — Actualizado 22/04/2026

## 🔴 Bloqueadores activos

### B1: Deploy FTP no funciona desde servidor
- **Descripción**: FTP data connection (PASV y ACTIVE) falla desde servidor → Hostinger
- **Estado**: ✅ RESUELTO — Se usa GitHub Actions (auto-deploy en push a main)

### B2: npm ci falla por lockfile desincronizado
- **Descripción**: `package-lock.json` desincronizado con `package.json` (proyecto usa bun)
- **Estado**: ✅ RESUELTO — Cambiado a `npm install --legacy-peer-deps`

### B3: GitHub bloquea push con API keys en docs
- **Descripción**: Secret scanning detecta keys en archivos markdown
- **Estado**: ✅ RESUELTO — Keys reemplazadas por placeholders en docs

---

## 🟡 Pendientes Alta Prioridad

### Fase 2 — Dashboard Real + IA

| # | Tarea | Estado | Notas |
|---|---|---|---|
| F2.1 | Ejecutar SQL schema en Supabase | ⏳ Pendiente (Pablo) | Ver `docs/SUPABASE-SCHEMA.sql` |
| F2.2 | Crear bucket `documents` en Storage | ⏳ Pendiente (Pablo) | Privado, no público |
| F2.3 | Guardar Groq API key en Supabase Secrets | ⏳ Pendiente (Pablo) | Settings → Edge Functions → Secrets |
| F2.4 | Crear Edge Function `chat-with-agent` | ⏳ Pendiente | Proxy a Groq API |
| F2.5 | Implementar Mesa de Diálogo (frontend) | ⏳ Pendiente | Conectar a Supabase + Groq |
| F2.6 | Implementar Bóveda (frontend) | ⏳ Pendiente | Upload + listado de documentos |
| F2.7 | Dashboard con stats reales | ⏳ Pendiente | COUNT desde Supabase |
| F2.8 | Auth: Login/Register + proteger rutas | ⏳ Pendiente | Supabase Auth |

---

## 🟡 Pendientes Media Prioridad

### Extensión Chrome

| # | Tarea | Estado | Notas |
|---|---|---|---|
| E1.1 | Migrar a Manifest V3 | ⏳ Pendiente | Chrome eliminará V2 eventualmente |
| E1.2 | Sacar `unsafe-eval` del CSP | ⏳ Pendiente | Riesgo de seguridad |
| E1.3 | Limpiar archivos legacy | ⏳ Pendiente | caption-helper.js, hashtag-packs.js, sales-quick-replies.js |
| E1.4 | Test funcional en Chrome real | ⏳ Pendiente | No testeado en navegador |

### Código / Configuración

| # | Tarea | Estado | Notas |
|---|---|---|---|
| C1.1 | Activar `strictNullChecks` en tsconfig | ⏳ Pendiente | Mejora calidad de tipos |
| C1.2 | Quitar `lovable-tagger` de dependencias | ⏳ Pendiente | Innecesario en producción |
| C1.3 | Agregar `.env` a `.gitignore` | ⏳ Pendiente | Evitar exposición de keys |
| C1.4 | Actualizar browserslist | ⏳ Pendiente | 10 meses desactualizado |
| C1.5 | Metadata de `index.html`: quitar TODO comments | ⏳ Pendiente | Autor sigue como "Lovable" |

---

## 🟢 Pendientes Baja Prioridad

| # | Tarea | Estado | Notas |
|---|---|---|---|
| B1.1 | Soporte de temas (dark/light) en extensión | ⏳ Pendiente | Actualmente siempre dark |
| B1.2 | Fuzzy matching en buyer persona | ⏳ Pendiente | Actualmente keyword exacto |
| B1.3 | Analytics de uso (qué hooks se copian más) | ⏳ Pendiente | Para bucle de aprendizaje |
| B1.4 | Tests reales con Vitest | ⏳ Pendiente | Vitest configurado pero sin tests |
| B1.5 | Mejorar detección de buyer persona | ⏳ Pendiente | Keywords → fuzzy |

---

## 🔮 Fase 3-6 (Futuro)

| Fase | Descripción | Dependencias |
|---|---|---|
| Fase 3 | Laboratorio de Contenido (subir imagen → 3 propuestas) | Fase 2 completa |
| Fase 4 | Configuración de agentes (UI para elegir modelo por agente) | Fase 2 completa |
| Fase 5 | Image Generation con IA | API de imágenes |
| Fase 6 | Instagram Graph API (publicación automática + KPIs) | Credenciales Meta |

---

## ❓ Decisiones pendientes

| Decisión | Opciones | Recomendación |
|---|---|---|
| Backend si se necesita | Express / FastAPI | No necesario (Supabase Edge Functions) |
| RAG framework | LangChain / LlamaIndex / custom | Supabase pgvector + embeddings |
| Hosting backend extra | No necesario | Supabase Edge Functions cubre todo |
| Auth para dashboard | Solo Pablo / compartir | Solo Pablo para MVP |
| Presupuesto infraestructura | — | $0 (todo free tier) |

---

## 📊 Resumen rápido

- **Resueltos hoy**: 3 bloqueadores + deploy automático + documentación completa
- **Pendientes inmediatos**: 3 tareas manuales de Pablo en Supabase
- **Pendientes desarrollo**: 8 tareas de Fase 2
- **Pendientes extensión**: 4 tareas
- **Pendientes código**: 5 tareas menores
