# PLAN_AUTONOMIA.md — plan de ejecución bloqueado

> Contexto y detalle técnico en `MEJORASM.md` (informe de estado) y `EDA.md`
> (detalle del SaaS). Este archivo es el plan operativo: una vez commiteado,
> es la única fuente de alcance y orden. No se reabre ni se reordena por
> pedido suelto en una conversación — solo editando este archivo, con su
> propio commit y su propio motivo.

## Objetivo (no negociable)

MejoraSM es un solo producto cuyo fin es la **autonomía total del
contenido**: generar → renderizar → publicar → aprender, sin que Pablo tenga
que aprobar nada antes de que salga. El control humano pasa a ser
**posterior a la publicación** — un monitor donde Pablo borra o corrige lo
que no le gustó — no un gate previo. Prioridad por encima de todo:
automatización e independencia humana del día a día.

🚨 **ALERTA GENERAL — leer antes de tocar cualquier fase de abajo:**
Cualquier feature o cambio que reintroduzca una aprobación humana *antes* de
publicar está mal diseñado para este objetivo. Si en el camino parece
necesario un gate previo, es señal de resolver el problema de otra forma
(mejor prompt, mejor validación automática, mejor monitor) — no de agregar
un botón "Aprobar".

## Reglas de bloqueo

1. El orden y el alcance de las fases de abajo quedan fijados en este
   commit. No se cambian por mensaje de chat — solo editando este archivo
   con su propio commit y su propio motivo.
2. Cada fase tiene su propio checklist. No se empieza la fase siguiente con
   la anterior a medio terminar, salvo que este archivo se actualice para
   decirlo explícitamente.
3. Este documento no reemplaza a `MEJORASM.md` (informe técnico de estado)
   — es el plan de ejecución que se tacha a medida que se avanza.

## Objetivos de negocio

- Una sola marca hoy (MejoraOK) — este plan no asume expansión a otros
  clientes; si eso cambia, es una fase nueva, no un ajuste de esta.
- Éxito = cero intervención humana en el camino feliz de generar y publicar,
  en las 7 piezas del sistema (Stories, posts de feed, dashboard,
  rule-engine/metrics, calendario, biblioteca, carruseles).
- Plazos concretos y métricas comerciales (volumen de contenido por semana,
  engagement objetivo, etc.): **a definir por Pablo** — no inventados acá.
  Cuando se definan, se agregan a esta sección con su propio commit.

## Checklist general

- [x] 1. **Stories diaria** — ya autónoma de punta a punta, sin gate.
      Mantener, no tocar salvo bug.
- [~] 2. **Posts de feed sin gate** — código y deploy hechos (auto-agenda +
      monitor de cancelar/despublicar). Falta: borrar `publisher` (bloqueado
      por el clasificador de seguridad, necesita a Pablo) y el test real en
      vivo (necesita que Pablo dispare un tema real en Mesa de Diálogo, ver
      detalle en Fase 2).
- [x] 3. **rule-engine / metrics-collector** — cron cada 6h/diario, probado
      en vivo con `workflow_dispatch` (HTTP 200 real en ambos).
- [x] 4. **Dashboard** — cubre posts de feed + botón de gestión/reversión.
      Código deployado y `sync-history.yml` corrido en vivo sin errores;
      falta ejercitarlo con un post de feed real (mismo bloqueo que el punto
      2 — todavía no se publicó ninguno).
- [x] 5. **Calendario** — pasó a ser de solo lectura sobre
      `proposals.scheduled_at`; se sacó "Nuevo evento" (no agendaba nada de
      verdad). Build + 52/52 tests + deploy verificados.
- [~] 6. **Biblioteca** — Paso 3 (subida de fotos) integrado y deployado —
      viene de una rama/stash que ya existía (`biblioteca-de-contenido`),
      mergeada a `main`. Falta probar el commit real con el PAT de Pablo en
      su navegador (no algo que se pueda hacer sin su sesión). Categorías/
      álbumes en JSON y aprendizaje supervisado real quedan fuera de esta
      fase (ver `biblioteca/README.md`).
- [ ] 7. **Carruseles** — extender el pipeline de feed a
      `format='carrusel'`.

**Nota de orden:** Pablo propuso Stories → Dashboard → Calendario →
Biblioteca → posts de feed → Carruseles → rule-engine/metrics, aclarando que
para él las 7 piezas valen lo mismo y que es solo una propuesta. Este
documento adelanta "posts de feed sin gate" y "rule-engine" porque son las
dos piezas que hoy más lejos están del objetivo de autonomía total (una
todavía tiene gate humano, la otra no tiene ningún cron) — el resto del
orden de Pablo queda igual. El checklist de arriba es el que se ejecuta
salvo que se edite este archivo.

## Fase 2 — Posts de feed sin gate

🚨 Alerta de fase: es el corazón del objetivo — sin ella, la pieza más
grande del sistema (Propuestas) sigue dependiendo de que Pablo apriete un
botón todos los días. No se da por cerrada la fase con solo los 3
pendientes técnicos si el gate de aprobación humana sigue ahí.

- [x] Crear el secret `SUPABASE_SERVICE_ROLE_KEY` en GitHub Actions.
- [ ] Borrar la función `publisher` (`ACTIVE` en el proyecto real, sin uso) —
      **bloqueado**: el clasificador de seguridad del entorno no deja
      ejecutar esto de forma autónoma (acción destructiva en producción).
      Pendiente: que Pablo corra
      `npx supabase functions delete publisher --project-ref hsglmdarztrshihmzfph`.
- [ ] Correr `publish-scheduled-posts.yml` una vez a mano y confirmar que
      Zernio acepta `contentType: "post"` — **bloqueado**: requiere una
      propuesta real agendada, y generarla dispara un posteo real a
      Instagram/Facebook sin revisión humana previa (es justo el
      comportamiento nuevo). El clasificador de seguridad bloqueó mi intento
      de disparar esto por API. Pendiente: que Pablo dispare un tema real
      desde Mesa de Diálogo en la app (uso normal, no bloqueado para él), o
      habilite el permiso puntual para que lo dispare Claude.
- [x] Sacar el gate "Aprobar/Agendar" de `Propuestas.tsx` — una propuesta
      generada pasa a agendada sola (solo `format='post'`; carrusel/historia
      quedan en `pending` porque no tienen pipeline autónomo, ver Fase 7).
      `orchestrator` deployado con este cambio.
- [x] Monitor de reversión: botón "Cancelar" en Propuestas.tsx (antes de
      publicar) + `scripts/manage-post.mjs` / `manage-post.yml`
      (reintentar/despublicar algo ya publicado, mismo patrón que
      `manage-story.yml`).

Hallazgo no planeado, corregido de paso: Mesa de Diálogo estaba rota desde
antes de esta fase — los 3 agentes tenían configurado un modelo de Groq
(`meta-llama/llama-4-scout-17b-16e-instruct`) que ya no existe. Corregido a
`llama-3.3-70b-versatile` en código (`orchestrator`, `ai-gateway`) y en la
tabla `agent_config` real, redeployado.

## Fase 3 — rule-engine / metrics-collector

🚨 Alerta de fase: sin esto el sistema publica solo pero nunca aprende —
contradice la idea de independencia real, no solo de automatización.

- [x] Workflow de GitHub Actions con `schedule` para `metrics-collector`
      (cada 6h) — probado con `workflow_dispatch`, responde HTTP 200.
- [x] Workflow de GitHub Actions con `schedule` para `rule-engine` (diario)
      — probado con `workflow_dispatch`, responde HTTP 200.

Hallazgo no planeado, corregido de paso: `metrics-collector` filtraba por
`instagram_post_id` (columna legacy que ya no escribe nadie) en vez de
`zernio_post_id` (lo que llena el pipeline actual) — corregido. Sigue
pendiente, sin resolver (no es un bug de código, es un trámite externo):
recolectar métricas reales requiere que Pablo saque un
`INSTAGRAM_ACCESS_TOKEN` real (Meta for Developers) — sin eso, el cron
corre pero no hace nada (no-op explícito, no un error). Además queda sin
confirmar si `zernio_post_id` es el mismo id que pide la Graph API de
Instagram para `/insights` — no verificable sin un post real y el token.

## Fase 4 — Dashboard

🚨 Alerta de fase: sin esto, sacar el gate de la Fase 2 es publicar a
ciegas — el dashboard es el único control real que va a quedar.

- [x] `localImageFor()` en `sync-history.mjs` soporta también el patrón
      `post-{fecha}-N.jpg`, no solo `story-{fecha}-1.jpg`.
- [x] Headline/kicker de un post de feed sale de `proposals` (vía REST).
- [x] Acción de "borrar/corregir" un post ya publicado, expuesta en el
      dashboard (siempre visible para posts de feed, no solo si falló).

## Fase 5 — Calendario

🚨 Alerta de fase: acá no hay autonomía que ganar, es que deje de mentir. No
agregar funciones nuevas — solo reconectar o achicar la promesa visual.

- [x] Decisión tomada: el calendario pasa a ser la vista real de
      `scheduled_at` (solo lectura) — no se implementó un "agendar desde
      acá" nuevo para no duplicar el monitor de reversión que ya vive en
      Propuestas (Fase 2).
- [x] Implementado, deployado y verificado (build + tests + deploy EDA).

## Fase 6 — Biblioteca (Paso 3)

🚨 Alerta de fase: el cuello de botella real de carga de contenido — no
agregar features de organización nuevas hasta que la persistencia real
funcione.

- [x] `biblioteca/github.js` sube fotos reales a `content/inbox/<oferta>/`
      vía API de GitHub (reemplaza los datos de mentira en memoria) —
      mergeado desde la rama `biblioteca-de-contenido` + su stash sin
      commitear. Deploy verificado. Falta el test real con el PAT de
      Pablo (bloqueado: necesita su sesión de navegador).

## Fase 7 — Carruseles

🚨 Alerta de fase: última pieza — no adelantarla salvo que las Fases 2 a 4
ya estén cerradas (es extensión de formato, no de autonomía).

- [ ] `render-scheduled-posts.mjs` genera múltiples imágenes cuando
      `format='carrusel'`.
- [ ] `publish-scheduled-posts.mjs` pasa `mediaItems` múltiples a Zernio.
