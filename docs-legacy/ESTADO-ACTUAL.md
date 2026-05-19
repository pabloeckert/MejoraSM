# 📊 Estado Actual del Proyecto

**Fecha:** 22 de abril de 2026
**Versión:** 1.1.0
**Rama:** main
**Último commit:** `6bb812a` — v1.1.0: MejoraOK injector

---

## Resumen Ejecutivo

MejoraINSSIST es un fork de la extensión Chrome INSSIST, personalizado para el nicho de **MejoraOK / Mejora Continua** — servicios de claridad estratégica para emprendedores, líderes y profesionales argentinos.

El proyecto tiene dos vertientes:
1. **Extensión Chrome funcional** (Fase 1 — completada)
2. **Sistema EDA** — Estrategia Digital Autónoma con múltiples IAs (Fase 2 — pendiente)

---

## Lo que existe hoy

### ✅ Extensión Chrome v1.1.0

| Componente | Estado | Descripción |
|---|---|---|
| `app/mejora-injector.js` | ✅ Nuevo | Inyector principal con botón flotante 🎯 y panel de 3 tabs |
| `data/buyer-personas.js` | ✅ Completo | 8 perfiles psicográficos del mercado argentino |
| `data/hashtags-db.js` | ✅ Completo | 6 packs de hashtags con rotación diaria |
| `data/sales-replies.js` | ✅ Completo | 24 quick replies para ventas por DM |
| `app/bg.js` | ✅ Core INSSIST | Background script del fork original |
| `app/ig-cs.js` | ✅ Core INSSIST | Content script de Instagram (minificado) |
| `app/fb-cs.js` | ✅ Core INSSIST | Content script de Facebook (minificado) |
| `app/nj.js` | ✅ Core INSSIST | Script inyectado en Instagram |
| `app/ig-nj.js` | ✅ Core INSSIST | Script inyectado en Instagram (3584 líneas) |
| `app/fb-nj.js` | ✅ Core INSSIST | Script inyectado en Facebook |
| `manifest.json` | ✅ Actualizado | v1.1.0, content scripts corregidos |
| `landing/index.html` | ✅ Nuevo | Landing page para subdominio |

### Funcionalidades implementadas

1. **🎯 Botón flotante** — Aparece en todas las páginas de Instagram
2. **📝 Caption Helper** — Detecta buyer persona, sugiere hooks/CTA/tags, genera caption completo
3. **🏷️ Hashtag Packs** — 6 packs por nicho con vista expandible, balance 40/40/20, copiar set o todos
4. **⚡ Quick Replies** — 24 respuestas con búsqueda y filtros por categoría (saludo, objeción, seguimiento, cierre, info, comentarios)
5. **Auto-detección DM** — Al escribir `/` en un DM, abre panel de replies automáticamente
6. **Core INSSIST** — Post Later, Dark/Wide/Zen Mode, multi-cuenta, Grid Preview, Post Assistant

### Los 8 Buyer Personas

1. 🤯 El Emprendedor Saturado — "No doy más, estoy en mil cosas"
2. 👑 La Líder que Necesita Validación — "¿Estaré liderando bien?"
3. 📈 El Profesional Independiente — "Soy bueno pero no lo saben"
4. 🔀 El Equipo Desalineado — "Cada uno hace lo suyo"
5. 🔍 El Empresario Mal Asesorado — "Estoy rodeado de humo"
6. 🌱 La Nueva Generación — "No me valoran, quiero crecer"
7. 💸 El Vendedor sin Resultados — "Trabajo mucho, no vendo"
8. ⚡ El que Necesita Orden — "Crecí rápido, ahora estoy desordenado"

---

## Lo que NO existe (requerido por SPEC EDA)

| Requerimiento | Estado | Prioridad |
|---|---|---|
| Backend/API server | ❌ No existe | Alta |
| Conexión Llama 4 Scout (Ollama) | ❌ No existe | Alta |
| Conexión Groq API | ❌ No existe | Alta |
| Conexión DeepSeek V3.2 | ❌ No existe | Media |
| Bóveda de conocimiento (upload PDF/Doc) | ❌ No existe | Alta |
| Mesa de Diálogo Multi-Agente | ❌ No existe | Alta |
| Generador multiformato | ❌ No existe | Baja |
| Publicador y calendario autónomo | ❌ No existe | Alta |
| Monitor de KPIs de Instagram | ❌ No existe | Alta |
| Bucle de aprendizaje automático | ❌ No existe | Media |
| Gestor de interacciones autónomo | ❌ No existe | Media |
| Dashboard de Director | ❌ No existe | Alta |
| Modo supervisión/aprobación | ❌ No existe | Alta |
| Laboratorio de contenido | ❌ No existe | Media |

---

## Dependencias y Stack

| Componente | Tecnología |
|---|---|
| Extensión | Chrome Extension Manifest V2 |
| Core | React (bundled en INSSIST original) |
| Datos | JavaScript puro (archivos .js) |
| UI inyectada | DOM manipulation + CSS inline |
| Backend (futuro) | Node.js o Python (TBD) |
| IA (futuro) | Ollama, Groq, DeepSeek, Gemini |

---

## Infraestructura

| Servicio | Detalle |
|---|---|
| GitHub | `github.com/pabloeckert/MejoraINSSIST` |
| Hosting | Hostinger — `mejoraok.com` |
| Subdominio | `util.mejoraok.com/MejoraSM` |
| FTP | `185.212.70.250:21` |
| FTP Path | `/home/u846064658/domains/mejoraok.com/public_html/util/MejoraSM` |
