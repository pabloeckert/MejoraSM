# 📋 Pendientes y Blockers

**Última actualización:** 22/04/2026

---

## Bloqueadores activos

### 🔴 B1: Deploy FTP no funciona desde servidor
- **Descripción:** El FTP data connection (PASV y ACTIVE) falla desde el servidor de trabajo hacia Hostinger
- **Error:** `TimeoutError: timed out` en la conexión de datos
- **Causa probable:** Firewall o NAT traversal en el servidor, o rango de puertos pasivos bloqueados
- **Solución:** Deploy manual vía File Manager de Hostinger o desde máquina local
- **Acción requerida:** Pablo sube los archivos manualmente
- **Prioridad:** Alta
- **Estado:** Pendiente

### 🟡 B2: Extensión en Manifest V2 (deprecado)
- **Descripción:** Chrome elimina soporte para Manifest V2
- **Impacto:** En algún momento la extensión dejará de funcionar
- **Solución:** Migrar a Manifest V3 (service workers, declarativeNetRequest)
- **Prioridad:** Media
- **Estado:** Pendiente (no urgente, Chrome aún soporta V2)

---

## Pendientes de la Fase 1

### Mejoras de la extensión

| # | Tarea | Prioridad | Notas |
|---|---|---|---|
| P1.1 | Deploy manual al subdominio | Alta | Bloqueado por B1 |
| P1.2 | Test de funcionalidad en Chrome real | Alta | No testeado en navegador |
| P1.3 | Fix: legacy files (caption-helper.js, hashtag-packs.js, sales-quick-replies.js) | Baja | Ya reemplazados por mejora-injector.js pero siguen en el repo |
| P1.4 | Agregar analytics de uso (qué hooks se copian más) | Media | Para alimentar futuro bucle de aprendizaje |
| P1.5 | Mejorar detección de buyer persona (fuzzy matching) | Baja | Actualmente es keyword exacto |
| P1.6 | Soporte para temas (dark/light) en el panel MejoraOK | Baja | Actualmente siempre dark |
| P1.7 | Migrar a Manifest V3 | Media | Preparar para cuando Chrome elimine V2 |

---

## Pendientes de Fase 2 (Backend EDA)

| # | Tarea | Prioridad | Blocker |
|---|---|---|---|
| P2.1 | Decidir stack: Node.js vs Python | Alta | — |
| P2.2 | Obtener API keys (Groq, DeepSeek) | Alta | — |
| P2.3 | Setup Ollama local (si se usa Llama local) | Alta | Requiere GPU |
| P2.4 | Definir schema de base de datos | Alta | — |
| P2.5 | Elegir hosting para backend | Alta | ¿Hostinger? ¿VPS? |
| P2.6 | Configurar dominio/API endpoint | Media | Depende de P2.5 |

---

## Decisiones técnicas pendientes

| Decisión | Opciones | Recomendación |
|---|---|---|
| Lenguaje backend | Node.js / Python | Node.js (consistencia con extensión) |
| Framework backend | Express / FastAPI | Express si Node, FastAPI si Python |
| Base de datos | SQLite / PostgreSQL / MongoDB | SQLite para MVP, migrar a PostgreSQL |
| IA primaria | Ollama local / Groq / DeepSeek | Groq (más rápido, free tier generoso) |
| RAG framework | LangChain / LlamaIndex / custom | LlamaIndex (más simple para RAG) |
| Hosting backend | Hostinger / VPS / Railway / Fly.io | Railway o Fly.io (gratis para empezar) |
| Frontend dashboard | React / Vue / Svelte | React (ecosistema más grande) |
| Auth para dashboard | JWT / Session / OAuth | JWT simple para MVP |

---

## Preguntas para Pablo

1. **¿Tenés API keys de Groq y DeepSeek?** — Necesarias para Fase 2
2. **¿Querés Ollama local o preferís todo cloud?** — Ollama requiere GPU decente
3. **¿El backend va en Hostinger o en un VPS separado?** — Hostinger tiene limitaciones para Node.js
4. **¿Necesitás autenticación en el dashboard?** — ¿Solo vos o compartís con equipo?
5. **¿Tenés la Instagram Graph API configurada?** — Necesaria para publicación autónoma y KPIs
6. **¿Cuál es el presupuesto mensual para infraestructura?** — Define qué tier de servicios usar

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Instagram bloquea la extensión | Baja | Alto | No hacer scraping agresivo, solo DOM injection |
| Rate limits de APIs de IA | Media | Medio | Fallback chain, cache de respuestas |
| Chrome elimina Manifest V2 | Alta | Medio | Migrar a V3 proactivamente |
| Instagram Graph API tiene restricciones | Media | Alto | Investigar límites antes de implementar |
| Costo de APIs de IA se dispara | Baja | Medio | Monitoreo de uso, límites por día |
| Los datos de buyer personas quedan obsoletos | Baja | Bajo | Revisión trimestral del contenido |
