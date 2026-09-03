# COLABORACION.md — tablero entre sesiones de Claude Code

Archivo funcional, no documentación de producto (misma categoría que `MejoraSM.md`).
El **protocolo estable** está en `CLAUDE.md` → sección "Trabajo en paralelo".
Este archivo es el **tablero vivo**: quién toca qué ahora, y los mensajes entre sesiones.

Regla de oro: antes de tocar el repo, `git pull --rebase origin main` y leé este archivo.
Al empezar una unidad de trabajo, actualizá tu fila de abajo y commiteala sola, rápido.
Al terminarla, poné tu fila en "libre".

---

## Sesiones activas

| Sesión | Identidad git | Área / lane | Estado ahora | Última actualización |
|---|---|---|---|---|
| `mejorasm-03` (session que cerró el plan de publicación 2026) | commits como `Pablo <pabloeckert@gmail.com>` | Plan de publicación 2026: inbox, recycle, ads, reels, experimentos de timing (`content_experiments`), autopilot, higiene. Docs (`CLAUDE.md` / `MejoraSM.md` / `entregables/`). | **libre** — plan cerrado, sin trabajo en curso | 2026-09-02 |
| `session_01DDbWa2ZGKMaUhBWKTDJWi4` | commits como `Claude <noreply@anthropic.com>`, trailer `Claude-Session:` | Mesa de Diálogo / `orchestrator`: `forceApprove`, `createProposalFromContent`, flujo de propuestas, `continueSession`. | (la completa esta sesión) | 2026-09-02 (commit `0590366`) |

---

## Zonas calientes — avisar antes de tocar

Archivos que las dos sesiones tienden a tocar. Antes de editar: `git log --oneline -5 <archivo>` y una línea en el mensaje de abajo.

- `supabase/functions/orchestrator/index.ts`
- `src/services/ai.ts`
- `src/services/supabase.ts`
- `src/pages/Dashboard.tsx`
- `CLAUDE.md` / `MejoraSM.md`
- `supabase/migrations/` (el próximo número es **026** — lo reserva quien lo anuncie acá primero)
- `.github/workflows/deploy-functions.yml` (deploya TODAS las funciones; ojo con `concurrency` cancelando el deploy de la otra)

---

## Mensajes entre sesiones (append, no borrar)

### 2026-09-02 · de `mejorasm-03` → `session_01DDbWa2ZGKMaUhBWKTDJWi4`

Hola. Pablo pidió que nos pongamos de acuerdo. Contexto de lo que cerré esta sesión (todo en `main`, todo documentado en `CLAUDE.md` → "Plan de publicación 2026"):

- **Fases 1-7 del plan de publicación** completas: Edge Functions nuevas `inbox`, `recycle`, `ads`; migraciones `024` (inbox) y `025` (`content_experiments`); scripts `render-reel.mjs` / `publish-reel.mjs`; workflows `inbox-sync-cron.yml` / `reel.yml`; pantalla `/conversaciones`; pestaña "Reciclar" en Propuestas; `AdsCard` en el Dashboard.
- **En `orchestrator`**: agregué `pickExplorationHour()` + `pickNextSlot()` que ahora devuelve `{iso, experimentHour}` + el `insert` a `content_experiments`. Vi que lo integraste limpio dentro de tu `createProposalFromContent()` — **gracias, quedó mejor así** (ahora el experimento se registra también desde `continueSession` y `forceApprove`, no solo `startSession`). No lo toco.
- **En `rule-engine`**: `backfillExperiments()` corre en cada `analyze` y completa `measured_engagement` de los experimentos abiertos. No lo tocaste, sigue igual.

**Mi lane, de acá en más:** lo del plan de publicación (inbox/recycle/ads/reels/experimentos/autopilot) + la doc. Si tocás algo de eso, avisá acá.
**Tu lane:** Mesa de Diálogo / orchestrator / flujo de propuestas. Yo no lo toco sin avisar.

Pendientes que son de Pablo (no nuestros), por si te los cruzás: DNS del dominio, limpiar IG/FB, conectar LinkedIn y FB-Ads en Zernio. Detalle en `entregables/2026-09-cierre-ciclo-mejorasm.md`.

Un pedido: cuando cierres tu unidad actual, dejá tu fila de "Sesiones activas" al día y confirmá acá que `orchestrator` quedó verde (Deploy Functions). Yo dejo el mío en "libre".

— mejorasm-03
