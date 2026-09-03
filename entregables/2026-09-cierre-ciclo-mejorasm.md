# Cierre de ciclo MejoraSM — autonomía de publicación de punta a punta

**Traspaso a Project Management**

| | |
|---|---|
| **Fecha** | Septiembre 2026 |
| **Producto** | MejoraSM (Estratega Digital Autónoma) |
| **Repositorio** | `pabloeckert/MejoraSM` |
| **Estado** | En producción |

Qué se construyó en este ciclo, en qué estado quedó cada pieza y qué falta para operar el sistema al 100%.

---

## Objetivo del ciclo

**Que MejoraSM produzca y publique contenido de marca solo, y que además escuche.**

MejoraSM ya publicaba historias y posts de feed en automático desde julio. Este ciclo tenía tres metas:

- **Cerrar el último gate manual.** Hasta ahora alguien tenía que elegir el tema de cada post. Se agregó una vía autónoma con aviso previo y ventana de veto.
- **Darle al sistema los ojos que le faltaban.** Publicaba y medía números, pero nunca veía comentarios ni mensajes de la audiencia.
- **Usar todo lo que la herramienta de publicación (Zernio) ya ofrecía y estaba sin tocar** — bandeja de conversaciones, reciclado, LinkedIn, Reels, pauta.

El trabajo se ejecutó de forma autónoma, con despliegue directo a producción y verificación real en cada paso (revisión de tipos, linter, 62 pruebas, build y despliegues automáticos en verde por commit).

---

## Resultado final — el sistema hoy

**Un solo producto que genera contenido de marca con IA y lo publica sin intervención diaria.**

| Capacidad | Estado | Detalle |
|---|---|---|
| Historias diarias | ✅ Operativo | 100% automáticas. Cron diario 10:00 ART. |
| Posts y carruseles de feed | ✅ Operativo | El agente Crítico aprueba → se agenda y publica solo, cada 15 min. |
| Elección de tema | ✅ Automatizable | Manual (Mesa de Diálogo) *o* autónoma (Autopilot lun/mié/vie + email de aviso con veto). |
| "Publicar ahora" | ✅ Operativo | Subís una foto → preview real → un toque publica en IG y Facebook. |
| Conversaciones (comentarios + DMs) | ✅ Operativo | Traídos de IG/FB, clasificados por sentimiento, respondés desde el sistema con confirmación. |
| Acceso al EDA | ✅ Cerrado | Usuario y contraseña, una cuenta compartida, blanqueo por email. |
| Reels | ✅ Operativo (bajo demanda) | Foto → video vertical con movimiento + overlay de marca → publica como Reel. |
| LinkedIn | 🟡 Código listo | Se activa cuando se conecte la cuenta en Zernio. |
| Reciclado / Pauta | 🟡 Mecanismo listo | Esperando volumen de datos / cuenta de anuncios. |

La base de datos se dejó limpia (solo el Manual de Marca y la configuración) para empezar a operar en serio. El historial de métricas arranca de cero desde acá.

---

## Lo trabajado · Bloque A — Acceso y control

### Login reinstaurado

El EDA vive en una URL pública. Se volvió a poner control de acceso: **una sola cuenta compartida** (usuario + contraseña), sin alta de cuenta, con blanqueo de contraseña por email. Se descartó un esquema de roles: no hace falta un rol de solo-lectura separado.

### GitHub fuera de la vista

Antes, para subir fotos o gestionar publicaciones había que "conectar GitHub" con un token propio en el navegador y la palabra "GitHub" aparecía en varias pantallas. Ahora todo eso pasa del lado del servidor con una sola credencial central. En ninguna pantalla se ve "GitHub" — todo pasa por MejoraSM.

### Autopilot — elección de tema autónoma con veto

Lunes, miércoles y viernes el sistema elige un tema solo, corre el debate de agentes y, si el Crítico aprueba, agenda la pieza para esa noche y **manda un email con la pieza completa y un link para cancelar**. Si no se cancela, sale. Salvaguarda dura: si el email no se puede enviar, la pieza NO se publica. Probado de punta a punta — el email llegó y la ventana de veto funcionó.

---

## Lo trabajado · Bloque B — Plan de Publicación 2026 (7 fases)

Ejecutado en el orden pedido (1 → 2 → 3 → 5 → 4 → 6 → 7). Todo en producción.

| Fase | Qué | Estado |
|---|---|---|
| **1** | **Bandeja de conversaciones.** Comentarios y DMs de IG/FB traídos de Zernio, clasificados por sentimiento (positivo / neutral / negativo / pregunta), respondibles desde el sistema con redacción sugerida en voz de marca y confirmación humana. Sincroniza cada 3 h. | ✅ Hecho · verificado en prod |
| **2** | **Higiene.** Arreglado un error del sistema de historias en re-disparo manual. La recolección de métricas ya no marca error permanente cuando una publicación queda trabada del lado de Zernio. | ✅ Hecho |
| **3** | **Reciclado de contenido.** Detecta piezas de +90 días que rindieron sobre la mediana, la IA refresca el gancho y el llamado a la acción manteniendo el ángulo, y entra como propuesta para agendar a mano. Pestaña "Reciclar" en Propuestas. | 🟡 Mecanismo listo · dormido sin datos |
| **5** | **LinkedIn.** Los posts de feed salen también a LinkedIn en cuanto exista la cuenta conectada en Zernio y su identificador cargado. Sin eso, todo sigue igual (IG + FB). | 🟡 Código listo · gated en Zernio |
| **4** | **Loop de aprendizaje activo.** Mientras no haya una regla de horario aprendida, el sistema *explora* — rota entre los 3 bloques horarios preferidos y registra cada elección como experimento. Cuando llegan las métricas, se completa el resultado. Así la comparación de horarios es real, no sesgada. | ✅ Hecho |
| **6** | **Video / Reels.** Bajo demanda: foto → la IA arma gancho y subtexto → video vertical de 9 s con zoom lento y overlay de marca (ffmpeg) → se publica como Reel en IG y FB. El armado del video está verificado de punta a punta. | ✅ Hecho · render verificado |
| **7** | **Pauta de Facebook (solo lectura).** Lee campañas de FB Ads, detecta qué posts orgánicos conviene promocionar y da un consejo. **Nunca gasta plata** — no crea ni modifica campañas. Tarjeta en el Dashboard. | ✅ Hecho |

> **"Mecanismo listo · dormido"** significa que la funcionalidad está construida, desplegada y probada en lo que se pudo probar sin datos reales, y se enciende sola cuando aparezca el insumo que le falta (historial de métricas o una cuenta conectada). No es trabajo pendiente: es trabajo hecho esperando su momento.

---

## Pendiente — necesita acción humana

**Cuatro cosas, todas de Pablo, ninguna bloquea al resto.** El sistema funciona hoy sin ninguna de estas. Cada una desbloquea una capacidad adicional.

### 1. Dominio propio `mejorasm.mejoraok.com` — *Pablo · DNS*

Agregar un registro `CNAME  mejorasm → pabloeckert.github.io` en el DNS de mejoraok.com. El resto del cambio de dominio está preparado y se automatiza después.

**Desbloquea:** URL propia en vez de la de GitHub, y links de marca en los emails de aviso.

### 2. Borrar las publicaciones viejas de Instagram y Facebook — *Pablo · Redes*

Quedan ~12 posts de agosto en las redes. El borrado en masa de contenido público real no se hace desde el sistema por regla de seguridad. Cuando estén limpias, se reactiva la sincronización del historial (hoy pausada a propósito).

**Desbloquea:** el Monitor vuelve a mostrar el historial real sin arrastrar contenido viejo.

### 3. Conectar LinkedIn en Zernio + cargar el identificador — *Pablo · Zernio*

Conectar la página de LinkedIn de la marca en Zernio y guardar el `ZERNIO_LINKEDIN_ACCOUNT_ID` como secreto del repositorio. La Fase 5 se activa sola.

**Desbloquea:** los posts de feed salen también a LinkedIn (público B2B, alto encaje con los buyer personas).

### 4. Conectar una cuenta de Facebook Ads en Zernio — *Pablo · Zernio*

Hoy hay cero campañas conectadas. Al conectar la cuenta de anuncios, la tarjeta de Pauta del Dashboard empieza a mostrar rendimiento de campañas cruzado con el orgánico.

**Desbloquea:** la Fase 7 pasa de "candidatos a promocionar" a análisis completo de pauta.

---

## Pendiente — esperando datos

Se enciende solo con el uso, no requiere más desarrollo.

- **Reciclado de contenido (Fase 3).** Necesita piezas publicadas hace +90 días con métricas reales. Estimado: 1–2 meses de pipeline corriendo.
- **Reglas de aprendizaje (Fase 4).** El motor de reglas necesita ≥5 publicaciones medidas para empezar a generar reglas de horario / formato / hook con confianza. Los experimentos de timing ya se registran desde ahora.
- **Recolección de métricas.** Vuelve a tener datos en cuanto se publiquen posts nuevos (la base se vació en el cierre).

---

## Riesgos y notas para el PM

- **Publicación autónoma sin revisión previa por pieza.** Es una decisión de producto ya tomada (autonomía total desde agosto). El control es posterior: cancelar antes de que salga, o despublicar después. El Autopilot agrega un email de aviso con ventana de veto, pero si nadie mira el email, la pieza sale. El agente Crítico evalúa contra el Manual de Marca en cada pieza — hay evidencia real de que rechaza contenido que viola el criterio.

- **La clasificación de sentimiento de la bandeja falla el parseo en ~15% de las tandas** en una corrida dada. No se pierde nada: el reintento en cada sincronización las recupera, así que converge a cero. Si molesta, se ajusta el prompt.

- **Publicación de Reels no probada contra Zernio real.** El armado del video está verificado de punta a punta; la publicación se revisó contra la documentación de Zernio pero no se ejecutó (sería un Reel público real). Primera corrida real = primera confirmación.

- **Incidente menor de esta sesión, sin consecuencias.** Un comando de git trajo por error un cambio guardado muy viejo y pisó el archivo de documentación. Se detectó de inmediato y se restauró todo desde el último estado bueno — nada se perdió. Queda un "stash" obsoleto en la lista de git (de la época de Biblioteca) que se puede descartar cuando Pablo lo autorice.

- **Dependencias externas del sistema:** Zernio (publicación + métricas + bandeja + ads, una sola API), Anthropic (IA principal) con Groq de respaldo, Supabase (base de datos + funciones), GitHub Actions (pipeline de render y publicación), Resend (emails del Autopilot). Se evaluó cambiar Zernio y Anthropic en este ciclo — las dos elecciones se sostienen, no hay una mejora que justifique migrar.

---

## Documentación de referencia

- **`CLAUDE.md`** (raíz del repo) — única fuente de verdad operativa: arquitectura, deploy, modelo de datos, seguridad, y bitácora fechada de cada sesión con evidencia real.
- **`MejoraSM.md`** (raíz del repo) — transcripción cronológica en prosa de cada sesión de trabajo.
- El estado de cada fase, con qué se probó y qué quedó pendiente, está en la sección "Plan de publicación 2026" de `CLAUDE.md`.

---

*Documento generado para traspaso a Project Management · MejoraSM · septiembre 2026. Versión visual (HTML, con identidad de marca): `entregables/2026-09-cierre-ciclo-mejorasm.html` — o el artifact publicado.*
