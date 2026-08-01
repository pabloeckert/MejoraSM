# MejoraSM — informe técnico y plan de cierre

Documento vivo. Edición 2026-07-30 (post cierre de la auditoría de seguridad y del pipeline autónomo de posts de feed de esta misma noche). Léelo junto con `CLAUDE.md` (arquitectura general) y `EDA.md` (detalle del SaaS con Supabase) — este archivo no repite lo que ya está bien documentado ahí, mide **todo el proyecto contra una sola vara**: la fórmula que ya probamos que funciona.

## 1. Qué es MejoraSM

No son cinco herramientas sueltas. Es **un solo producto**, para una sola marca (MejoraOK), con un solo trabajo: generar contenido de marca con IA y publicarlo solo, sin que nadie tenga que apretar "publicar" a mano todos los días. Todo lo que vive en este repo — el SaaS con login (`src/` + `supabase/`, hoy llamado "EDA" puertas adentro), el sistema de story diaria, el hub de carga, la biblioteca de contenido, el dashboard de monitoreo — es una pieza de esa misma máquina.

`CLAUDE.md` ya lo dice así desde hace rato ("Un solo producto: MejoraSM"). Lo que cambia hoy es que dejamos de tratarlo como cinco proyectos que comparten repo por comodidad, y empezamos a exigirle a cada pieza el mismo estándar de autonomía que ya probamos que funciona.

## 2. La fórmula probada (Stories)

Un solo camino, sin intervención humana, corriendo en producción desde julio:

```
cron (GitHub Actions) → generar copy con IA → renderizar la pieza (Playwright + template HTML)
  → commitear la imagen (para que sea servible por URL) → publicar (Zernio) → trackear (historial.json)
```

Por qué funciona y no es un logro cosmético:
- **Cero gate humano en el camino feliz.** Nadie aprueba nada — el freno es programático (`alreadyGeneratedToday`), no una persona mirando una pantalla.
- **Cada paso es una función pura con una sola responsabilidad** (`generate-brief.mjs` genera, `render-story.mjs` renderiza, `publish-story.mjs` publica) — se puede reintentar o depurar un paso sin tocar los otros.
- **Un solo canal de publicación real** (Zernio), no un camino "de mentira" en paralelo.
- **Se prueba sola en cada corrida diaria**, no en un ambiente de staging separado — si se rompe, se sabe al otro día, no en un audit trimestral.

Esta es la vara. Todo lo que sigue se mide contra esto, no contra "¿tiene una pantalla linda?".

## 3. Estado real de cada pieza, medido contra la fórmula

| Pieza | ¿Autónoma de punta a punta? | Estado real (2026-07-30) |
|---|---|---|
| **Stories** (`scripts/`, `daily-story.yml`) | ✅ Sí | En producción, probada, la única pieza 100% terminada. |
| **Posts de feed del EDA** (`Propuestas` → `publish-scheduled-posts.yml`) | ✅ Sí, con gate humano intencional | Recién armada esta noche, mismo mecanismo que Stories. El gate humano es "Aprobar + Agendar" — decisión explícita de Pablo, no una limitación técnica. Falta el secret de GitHub y verificar `contentType` de Zernio contra un post real antes de confiar en el cron (ver sección 4). |
| **Autenticación / RLS / `app_admins`** | ✅ Sí (no es "autónomo" en el mismo sentido, pero está cerrado) | Auditado y corregido esta noche: una sola fuente de verdad, verificado en vivo contra la base real. |
| **Biblioteca de contenido** (`biblioteca/`) | ❌ No | Paso 1 (diseño) y Paso 2 (UI) hechos, corriendo sobre datos de mentira en memoria. Paso 3 — el que realmente sube fotos a `content/inbox/` vía la API de GitHub — no está. Hoy la única forma real de cargar contenido es el `hub/` (subida directa a GitHub) o `biblioteca/github.js` a medio construir. |
| **Dashboard** (`dashboard/`) | ⚠️ Parcial, con un gap nuevo descubierto hoy | Cubre bien el historial de Stories. **No cubre los posts de feed nuevos**: `sync-history.mjs` trae TODOS los posts de la cuenta de Zernio (incluye los de feed), pero `localImageFor()` (línea 61-65) busca la imagen con el patrón fijo `story-{fecha}-1.jpg` — un post de feed (`post-{fecha}-N.jpg`) va a aparecer en `historial.json` con `imageUrl: null`, `headline: null`, `kicker: null`, porque además el headline sale de `local-briefs.json`, que solo escribe `render-story.mjs`. Gap real, no cosmético — el dashboard va a mostrar filas vacías para cada post de feed publicado. |
| **Hub** (`hub/`) | ✅ Cumple su alcance | No es "autónomo" (es justamente el punto de entrada humano — subir una foto), pero hace bien lo que promete. |
| **Calendario Editorial** (`Calendario.tsx`, tabla `calendar_events`) | ❌ Desconectado | `calendar_events.date` no tiene relación con `proposals.scheduled_at` — crear un evento de calendario no agenda nada. Es una vista cosmética hoy, no un control real. |
| **Carruseles / Historias vía EDA** (`proposals.format`) | ❌ No construido | El pipeline nuevo de esta noche solo procesa `format='post'`. Carrusel necesita múltiples imágenes por post (Zernio soporta `mediaItems` con varios elementos, no lo usamos todavía). |
| **`rule-engine` / `metrics-collector`** | ❌ Sin disparador | Ambas funciones existen y están bien escritas, pero **nada las invoca nunca** — ni cron de GitHub Actions, ni pg_cron, ni nadie. El loop de aprendizaje ("qué formato/horario funciona mejor") está armado pero apagado. |

## 4. Lo que hay que cerrar de lo de esta noche antes de confiar en el cron nuevo

Esto no es plan a futuro, es terminar lo que ya está armado:

1. **Crear el secret `SUPABASE_SERVICE_ROLE_KEY` en GitHub** (Settings → Secrets → Actions). Sin esto `publish-scheduled-posts.yml` falla en el primer paso.
2. **Borrar `publisher` del proyecto Supabase real** (`npx supabase functions delete publisher --project-ref hsglmdarztrshihmzfph`) — sigue `ACTIVE` en producción, quedó bloqueado que lo borre yo por ser una acción destructiva.
3. **Correr `publish-scheduled-posts.yml` una vez a mano** con una propuesta de prueba agendada en el pasado, y confirmar que Zernio acepta `contentType: "post"` — se copió por simetría con `"story"`, no se verificó contra la doc real.

## 5. Plan de cierre, priorizado

No es una lista de deseos — cada ítem está ordenado por qué tan lejos deja a la pieza correspondiente de la fórmula probada.

**P0 — sin esto, lo de esta noche no sirve de nada.** Los 3 puntos de la sección 4.

**P1 — Dashboard: que muestre los posts de feed, no solo Stories.**
`sync-history.mjs` necesita dos cambios chicos: (a) `localImageFor()` tiene que probar también el patrón `post-{fecha}-N.jpg`, no solo `story-{fecha}-1.jpg`; (b) el headline/kicker de un post de feed no sale de `local-briefs.json` (eso es de Stories) — o se lee directo de `proposals` (hook/oferta) vía la API REST de Supabase, o se arma un log propio análogo. Sin esto, cada post de feed publicado aparece "roto" en el dashboard aunque se haya publicado bien.

**P2 — Biblioteca Paso 3: persistencia real.**
Es la pieza que le da sentido a "subo fotos y armo álbumes" — hoy la promesa de `biblioteca/` no se cumple, sigue en datos de mentira. Sin esto, la única forma real de alimentar `content/inbox/` (y por lo tanto Stories Y los posts de feed) es el `hub/` (subida simple, sin organizar) o git a mano. No es un capricho de UX, es el cuello de botella real de todo el sistema de generación de contenido.

**P3 — Cron real para `rule-engine` y `metrics-collector`.**
Mismo patrón que todo lo demás: un workflow de GitHub Actions con `schedule`. `metrics-collector` cada 6h (ya está documentado así en el código, solo falta el disparador), `rule-engine` diario. Sin esto, `success_rules` nunca se llena y los agentes del EDA nunca aprenden de lo que ya funcionó — la Mesa de Diálogo sigue generando a ciegas.

**P4 — Reconectar `Calendario.tsx` con `proposals.scheduled_at`, o sacar la promesa implícita.**
O el calendario pasa a ser la forma real de agendar (unificando con lo que hoy hace el diálogo "Agendar" de Propuestas), o se le saca cualquier elemento visual que sugiera que programa algo — hoy engaña sin querer.

**P5 — Carruseles en el pipeline de feed.**
Extender `scripts/render-scheduled-posts.mjs` para generar más de una imagen por propuesta cuando `format='carrusel'`, y pasar `mediaItems` múltiples a Zernio. Más trabajo de diseño (necesita un template que sea coherente entre sí mismo, no piezas sueltas) que de lógica.

## 6. Lo que decidimos NO hacer (y por qué)

- **No renombrar mecánicamente "EDA" en código/rutas/Edge Functions.** El nombre del producto es MejoraSM; "EDA" puede seguir siendo el nombre interno del módulo de estrategia con IA dentro de MejoraSM (como "Stories" es el nombre del módulo de historias) — tocar rutas, nombres de función y el proyecto de Supabase por una cuestión de naming es riesgo real por beneficio cosmético. Si en algún momento se quiere hacer, que sea una decisión aparte, explícita, no un efecto secundario de este documento.
- **No se automatizó la elección del tema en Mesa de Diálogo.** Fue una decisión explícita de esta noche (ver conversación previa) — Pablo mantiene el criterio sobre qué tema vale la pena convertir en propuesta. Sacar ese gate es una decisión de negocio, no técnica, y hay que tomarla aparte si se quiere.
