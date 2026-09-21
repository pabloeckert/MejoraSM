# MejoraSM — Motor de Redes y Generación de Contenido B2B

MejoraSM es el sistema autónomo de estrategia, generación, aprobación y publicación de contenidos para **Mejora Continua** ([mejoraok.com](https://mejoraok.com)).

---

## 1. Stack Tecnológico y Arquitectura

### Frontend (SPA)
- **Framework:** React 18.3 + TypeScript + Vite 5 + TailwindCSS 3.4 (`shadcn/ui` + `@radix-ui`).
- **Enrutamiento:** `react-router-dom` v7 (HashRouter) con lazy loading por ruta (`/app/`).
- **Estado y Cache:** `@tanstack/react-query` v5.
- **Acceso:** Protegido por `AuthGate` contra Supabase Auth (cuenta compartida de `app_admins`).

### Backend & Almacenamiento (Supabase)
- **Base de Datos:** PostgreSQL con Row Level Security (RLS) basado en `is_app_admin()`.
- **Tablas Clave:** `proposals`, `dialogue_sessions`, `dialogue_messages`, `metrics`, `success_rules`, `inbox_items`, `documents`, `doc_chunks`, `run_log`, `content_experiments`.
- **Storage:** Bucket `vault` para documentos de marca, manuales y libros de gestión.
- **Edge Functions (Deno / TypeScript - 11 funciones):**
  - `orchestrator`: Mesa de Diálogo Multi-Agente (Estratega, Creativo, Crítico con Anthropic/Groq).
  - `vault-process`: Extracción de texto y embeddings vectoriales para RAG.
  - `rule-engine`: Motor de aprendizaje inductivo de reglas exitosas.
  - `metrics-collector`: Ingesta periódica de métricas de Zernio.
  - `insights`: Análisis y recomendaciones automáticas sobre rendimiento.
  - `copilot`: Asistencia interactiva de estrategia de contenidos.
  - `classify-photo`: Clasificación visual y temática de fotos en inbox.
  - `repo`: Gateway backend hacia GitHub API para operaciones seguras sin exponer PATs.
  - `inbox`: Sincronización y análisis de sentimiento de comentarios/DMs desde Zernio.
  - `recycle`: Identificación de contenido histórico evergreen para recircular.
  - `ads`: Métricas y auditoría de anuncios de Facebook Ads vía Zernio.

### Pipeline de Publicación y Automatización
- **Agregador Social:** [Zernio API](https://zernio.com) (`https://zernio.com/api/v1/posts`).
  - **Instagram & Facebook:** Vía `ZERNIO_INSTAGRAM_ACCOUNT_ID` y `ZERNIO_FACEBOOK_ACCOUNT_ID`.
  - **LinkedIn:** Vía `ZERNIO_LINKEDIN_ACCOUNT_ID` (feed posts B2B).
  - *Sin APIs directas ni SDKs de Meta/LinkedIn*: Todo el ruteo de distribución social pasa por Zernio.
- **Generación Visual:** Playwright (`chromium`) renderiza plantillas HTML/CSS en `templates/` a 1080x1920 (stories) y 1080x1350 / 1080x1080 (carruseles y posts).
- **Ejecución Programada:** GitHub Actions en `.github/workflows/`:
  - `publish-scheduled-posts.yml`: Revisa propuestas agendadas y las publica.
  - `autopilot-cron.yml`: Modo libre de generación autónoma (Lun/Mié/Vie).
  - `sync-history.yml`: Sincroniza historial social hacia `content/log/historial.json`.
  - `inbox-sync-cron.yml`: Trae interacciones y comentarios cada 3 horas.
  - `metrics-collector-cron.yml` & `rule-engine-cron.yml`: Recolección y aprendizaje analítico.

### Integración CRM / Gateway de Contactos
- **Servicio:** `src/services/contactosService.ts`.
- **Destino:** API central de contactos (`MejoraContactos` / `MejoraCRM`):
  - Endpoint: `https://tzatuvxatsduuslxqdtm.supabase.co/functions/v1/contactos-api`
  - Acción: Desde `/conversaciones`, cuando un DM o comentario contiene intención comercial o datos de contacto, se pulsa **"Enviar a CRM"** derivando el lead con nombre, email, teléfono, red y nota contextual.

---

## 2. Identidad Institucional y Manual de Marca

### Paleta Oficial de Colores
- **Base Dominante:** Blanco `#FFFFFF` (mucho espacio negativo y claridad visual).
- **Azul Primario:** `#1A3D84` (estructura, titulares institucionales, autoridad).
- **Rojo Acento:** `#E1061E` (énfasis puntual, alertas de negocio, badges).
- **Amarillo Acento:** `#F7CC13` (puntuación visual, destacados sutiles, subrayados).
- **Tinta / Texto Principal:** `#2B2B2B`.
- **Gris / Apoyo:** `#6B7280`.

### Tono y Voz
- **Criterio Medular:**
  1. *Nunca a la persona:* El foco siempre es el sistema, el proceso o la falta de claridad; jamás la inteligencia o capacidad del líder.
  2. *Calidez con verdad:* La calidez radica en el cuidado detrás de decir la verdad sin rodeos ni complacencia.
  3. *No se vende por precio:* "Sin costo" es un dato funcional menor, nunca el gancho de un hero o CTA.
  4. *Un solo marco de servicios:* 4 Dimensiones (Personal, Organizacional, Comercial, Empresarial) + Profesionalización + Sociales (equipo/alianzas).
- **Estructuras Mandatorias:**
  - **Verdad + Claridad:** Nombrar el dolor o fricción real sin juzgar.
  - **Exposición + Dirección:** Explicar cómo opera la causa raíz y cerrar con instrucción o criterio concreto, sin retos agresivos ni motivación vacía.

---

## 3. Comandos de Desarrollo y Verificación

```bash
# Servidor local de desarrollo
npm run dev

# Verificación de tipos estricta (solution-style)
npx tsc -b

# Linter de código
npm run lint

# Suite de pruebas unitarias y de integración (Vitest)
npm run test

# Compilación de producción
npm run build
```
