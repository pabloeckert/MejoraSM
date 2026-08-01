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
- [ ] 2. **Posts de feed sin gate** — sacar "Aprobar/Agendar", cerrar lo
      técnico pendiente (secret, borrar `publisher`, probar `contentType`),
      agregar el monitor de reversión.
- [ ] 3. **rule-engine / metrics-collector** — disparador real (cron), para
      que el sistema aprenda de lo que se publica y se corrige.
- [ ] 4. **Dashboard** — cubrir posts de feed (hoy rotos) + soporte para
      borrar/corregir una publicación ya hecha (el monitor del punto 2).
- [ ] 5. **Calendario** — reconectar con `proposals.scheduled_at` o sacarle
      la promesa visual de que agenda algo.
- [ ] 6. **Biblioteca** — Paso 3, persistencia real (subida vía API de
      GitHub).
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

- [ ] Crear el secret `SUPABASE_SERVICE_ROLE_KEY` en GitHub Actions.
- [ ] Borrar la función `publisher` (`ACTIVE` en el proyecto real, sin uso).
- [ ] Correr `publish-scheduled-posts.yml` una vez a mano y confirmar que
      Zernio acepta `contentType: "post"`.
- [ ] Sacar el gate "Aprobar/Agendar" de `Propuestas.tsx` — una propuesta
      generada pasa a agendada sola.
- [ ] Definir y construir el "monitor de reversión": dónde y cómo Pablo ve
      lo publicado y lo borra/corrige si no le gustó (ver Fase 4).

## Fase 3 — rule-engine / metrics-collector

🚨 Alerta de fase: sin esto el sistema publica solo pero nunca aprende —
contradice la idea de independencia real, no solo de automatización.

- [ ] Workflow de GitHub Actions con `schedule` para `metrics-collector`
      (cada 6h, ya documentado en el código).
- [ ] Workflow de GitHub Actions con `schedule` para `rule-engine` (diario).

## Fase 4 — Dashboard

🚨 Alerta de fase: sin esto, sacar el gate de la Fase 2 es publicar a
ciegas — el dashboard es el único control real que va a quedar.

- [ ] `localImageFor()` en `sync-history.mjs` soporta también el patrón
      `post-{fecha}-N.jpg`, no solo `story-{fecha}-1.jpg`.
- [ ] Headline/kicker de un post de feed sale de `proposals` (vía REST) o de
      un log propio — hoy solo lo llena Stories.
- [ ] Acción de "borrar/corregir" un post ya publicado, expuesta en el
      dashboard (el monitor de la Fase 2).

## Fase 5 — Calendario

🚨 Alerta de fase: acá no hay autonomía que ganar, es que deje de mentir. No
agregar funciones nuevas — solo reconectar o achicar la promesa visual.

- [ ] Decidir: ¿el calendario pasa a ser la forma real de agendar (se
      unifica con `scheduled_at`), o se le saca todo elemento que sugiera
      que programa algo?
- [ ] Implementar la decisión de arriba.

## Fase 6 — Biblioteca (Paso 3)

🚨 Alerta de fase: el cuello de botella real de carga de contenido — no
agregar features de organización nuevas hasta que la persistencia real
funcione.

- [ ] `biblioteca/github.js` sube fotos reales a `content/inbox/<oferta>/`
      vía API de GitHub (reemplaza los datos de mentira en memoria).

## Fase 7 — Carruseles

🚨 Alerta de fase: última pieza — no adelantarla salvo que las Fases 2 a 4
ya estén cerradas (es extensión de formato, no de autonomía).

- [ ] `render-scheduled-posts.mjs` genera múltiples imágenes cuando
      `format='carrusel'`.
- [ ] `publish-scheduled-posts.mjs` pasa `mediaItems` múltiples a Zernio.
