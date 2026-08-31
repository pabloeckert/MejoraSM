# MejoraSM.md — Transcripción de sesión

Archivo de log, no de documentación de producto (esa sigue siendo `CLAUDE.md`, única fuente de verdad). Se mantiene por dogma explícito de Pablo del 2026-08-08: cada actualización de `CLAUDE.md` va acompañada de una actualización acá con la transcripción de la conversación completa hasta ese punto, de corrido, sin etiquetar quién dice cada parte, con decisiones/hallazgos/explicaciones y el código final completo transcriptos literal. Quedan afuera los comandos de terminal, el JSON crudo de herramientas y los outputs técnicos (curl/git/SQL) — esos no se transcriben.

---

## Parte 1 — Rediseño de Dashboard

Se pidió leer `CLAUDE.md` completo antes de tocar nada y encarar la primera de varias pantallas del rediseño de frontend: el Dashboard, la de mayor uso real. Antes de escribir una línea de UI había que hacer una auditoría de datos: el brief define quince KPIs pero no todos tienen fuente real hoy. Se pidió armar una tabla de tres columnas — KPI, si hay dato real hoy, fuente exacta — revisando la tabla `metrics` y su schema real, qué campos escribe `metrics-collector/index.ts`, y qué devuelve realmente la API de Zernio. Cada KPI debía clasificarse en tres categorías: dato real disponible hoy, calculable a partir de lo que hay, o sin fuente (requeriría otra integración) — sin inventar una fuente para llegar a quince.

Se leyó el archivo `CLAUDE.md` completo (656 líneas). Se exploró la estructura del repo: `Data/brief-frontend-mejorasm.md` (el brief de rediseño con las decisiones estructurales ya tomadas), `Data/analisis-redes-mejora-continua.md` (el análisis real de redes sociales, fuente de los quince KPIs y de los insights), el schema de la tabla `metrics` en `001_initial_schema.sql`, el código de `metrics-collector/index.ts`, y `scripts/lib/zernio.mjs` para entender el desglose por plataforma.

Se encontró que el mismo post se publica en Instagram y Facebook con un solo `zernio_post_id` (un array `platforms` en la llamada a Zernio), y que `GET /v1/analytics?postId=` devuelve un agregado único sin desglose por red — lo único separado por plataforma es el status de publicación y la URL, disponible en `content/log/historial.json` (vía el endpoint `GET /v1/posts` de Zernio), no en Supabase. Esto se identificó como una limitación real a comunicar en la UI, no a inventar.

Se presentó la tabla de auditoría: siete KPIs con dato real disponible hoy (alcance por publicación, impresiones por publicación, engagement sobre impresión, guardados, compartidos, comentarios — clics quedó inicialmente en la categoría "sin fuente" en esta primera pasada), dos calculables (engagement sobre alcance, alcance/engagement promedio por formato), y seis sin fuente (alcance orgánico vs. pago, tasa de finalización de video, tiempo promedio de reproducción, engagement por seguidor, crecimiento neto de seguidores, tasa de finalización de historias) — cada uno con el motivo real documentado, no un placeholder.

La clasificación se confirmó, con dos ajustes antes de construir la UI. El primero: el KPI de clics pasaba de categoría "sin fuente" a categoría "real", porque Zernio ya lo devuelve en su respuesta pero `metrics-collector` lo descartaba al mapear — había que agregar una columna `clicks` a la tabla `metrics` (nullable, sin default, para que las filas existentes quedaran en NULL por no haberse recolectado nunca, no en cero como si se hubiera medido y hubiera dado cero), completar el mapeo en `metrics-collector/index.ts`, aplicar la migración contra la base real con `supabase db query -f` (no inline, porque el comentario `--` de la cabecera rompe el modo inline), y verificar con un SELECT que la columna existiera. El segundo ajuste: el desglose por plataforma debía implementarse exactamente como se había propuesto — total combinado real más badges de status/URL por red por pieza, más un estado explícito de "sin desglose por red disponible en la fuente" — sin inventar un split de métricas ni esconder la limitación.

Con esos dos ajustes, se pasó a construir el Dashboard: ocho KPIs reales (los siete más clics) y dos calculables, los seis sin fuente con estado explícito, filas de prueba excluidas con un toggle, insights semilla hardcodeados marcados internamente como semilla para que una futura capa de IA los pueda reemplazar o contrastar, e interactividad mínima — click en pieza abre detalle, click en KPI lleva a la sección, tooltips explicando cada métrica.

Se creó la migración `009_metrics_clicks.sql` y se editó `metrics-collector/index.ts` para persistir clics. Al aplicar el deploy de la Edge Function corregida, el workflow `deploy-functions.yml` falló en el paso "Link project" con un error real del CLI de Supabase: `supabase link` pega contra `GET /v1/projects/{ref}/api-keys`, que devolvía un `inserted_at` que no matcheaba el regex ISO8601 que espera el CLI — un `SchemaError` reproducido también en local, no un problema del workflow en sí. Se confirmó que ese paso era además innecesario: cada comando `functions deploy` ya recibe `--project-ref` directo, así que nunca necesitó el link previo. Se sacó ese paso del workflow, se re-disparó manualmente, y corrió verde de punta a punta, dejando desplegada la función con el fix de clics.

Se reconstruyó `Dashboard.tsx` completo: header con fecha de última sincronización real; toggle "Mostrar filas de prueba" que excluye por defecto las filas `[TEST/QA]` de `rule-engine` (identificadas por prefijo `TEST-QA-` en `post_id` o `7e57da7a-` en el id de la propuesta) y las marca visualmente si se activan; grilla de ocho tiles de KPIs reales con tooltip y click-a-detalle; tarjeta de KPIs sin fuente conectada, documentando el motivo real de cada uno; sección de resumen por red con el total combinado y los badges de status/URL reales por plataforma (traídos con un fetch directo a `raw.githubusercontent.com/.../historial.json`, degradando con gracia si falla); gráfico de engagement por post ya corregido para no mezclar filas de prueba sin aviso (bug señalado explícitamente en el brief); distribución por formato; tabla de alcance y engagement promedio por formato (el segundo KPI calculable); ranking de piezas más exitosas con miniatura real si existe imagen renderizada; y seis tarjetas de insights semilla, cada una con el título, el cuerpo, la evidencia numérica citada, y un badge "Validado con datos reales" — sin construir ahí la capa de IA que los reemplazaría a futuro. Se mantuvieron los contadores operativos existentes (documentos, diálogos, contenidos, programadas) porque eran reales y no estaban señalados como fuera de alcance.

Se corrió lint, tests y build. El lint bajó de 73 a 70 errores preexistentes (el archivo nuevo tenía menos usos de `any` que el que reemplazó, pese a ser mucho más grande). Los tests se actualizaron y ampliaron (mocks de los hooks nuevos, exclusión de filas de prueba, apertura de detalle, tooltips). El build salió limpio. Se intentó verificar visualmente en el navegador local, pero la pantalla real quedó bloqueada por el login OTP, que requiere el inbox real de Pablo — límite ya documentado en sesiones anteriores. Se confirmó al menos que el servidor de desarrollo levantaba sin errores.

Se hizo commit y push. El `Deploy EDA` (el workflow que efectivamente publica el sitio en GitHub Pages) corrió verde. El `ci.yml` general quedó en rojo, pero solo por el paso de lint — el mismo baseline preexistente ya documentado en `CLAUDE.md`, no empeorado por este cambio.

## Parte 2 — Rediseño de Propuestas y Calendario

Se pidió la siguiente pantalla del rediseño: Propuestas y Calendario juntas, porque comparten el modal de detalle de pieza — el hueco real que había quedado sin resolver en un export de Claude Design que Pablo tenía (un `actions="{{detailActions}}"` en el HTML pero `detailActions: null` en el estado, es decir, cero botones de acción). Ese archivo específico no estaba en el repo (solo existía un prototipo distinto, de una fase anterior, sobre specs de dimensiones de formato) — se tomó como contexto verbal válido de todos modos, sin necesitar el archivo.

Se pidieron tres cosas. Primero, el modal de detalle, lo más importante: botones reales con acciones reales contra Supabase, no placeholders — editar título/hook/body/cta/hashtags de una propuesta todavía no publicada, borrar con confirmación, reprogramar cambiando `scheduled_at`, convertir formato entre los valores permitidos por el constraint de la base, y republicar solo si la pieza ya estaba publicada — pero antes de implementar ese último botón, había que confirmar qué implica realmente republicar en el pipeline actual (si crea una propuesta nueva, si reusa el `zernio_post_id`), y si no había un camino limpio, decirlo en vez de fabricar un botón que rompiera algo. Cada acción tenía que respetar el estado: nada se edita ni se borra sobre algo ya publicado sin aviso explícito. Segundo, la reconstrucción completa de Propuestas: simplificar las cinco acciones que tenía cada tarjeta (aprobar, ver, agendar, copiar, rechazar) a algo menos cargado ahora que el detalle vive en el modal; distinción visual clara entre los formatos con pipeline autónomo (post, carrusel) y los que requieren acción manual (historia, video), porque hoy esa distinción no se veía en ningún lado y daba la sensación de que "no sirve para nada" cuando en realidad una parte ya corría sola; y una sección de plantillas, por ahora solo la estructura de listar/crear/editar, sin motor de render todavía. Tercero, la reconstrucción completa de Calendario: click en pieza abre el mismo modal de detalle; drag and drop real que actualizara `scheduled_at` de verdad en la base, no solo visualmente; vista semanal además de la mensual; y el mismo tratamiento de filas de prueba que el Dashboard. Se aclaró explícitamente que no había que construir preview visual de las piezas en ninguna de las dos pantallas, porque todavía no existe un motor de render real para post o carrusel y sería un placeholder falso — eso se resuelve cuando se construya el motor de render.

Antes de tocar código se investigó qué implica realmente republicar. El único mecanismo real es la acción "reintentar" de `manage-post.mjs`, y tiene tres problemas de fondo que la descartan como botón de un click: es por plataforma, Instagram o Facebook, nunca las dos a la vez, sin ninguna noción de "republicar la pieza" como unidad; crea un post nuevo en Zernio con un `postId` distinto al original, no reutiliza el `zernio_post_id` existente; y nunca actualiza `proposals.zernio_post_id` en Supabase después de un reintento exitoso, así que la fila queda apuntando para siempre al post viejo, lo que rompe en silencio a `metrics-collector` para esa pieza a futuro. Además, ese mecanismo corre solo por `workflow_dispatch` en GitHub Actions, exigiendo tipear literalmente `CONFIRMO` a mano — una fricción deliberada porque publica contenido real sin revisión posterior; meterlo en un botón de la app saltearía exactamente esa fricción. Con esa evidencia, se decidió no construir el botón: el modal, cuando una pieza está publicada, muestra en cambio un aviso de solo lectura que señala ese mismo workflow de GitHub Actions como el camino real para corregir o bajar algo ya publicado.

Se creó la migración `010_templates.sql`, con una tabla `templates` mínima (nombre, formato, notas) restringida a los mismos tres valores de formato que produce el pipeline real (post, carrusel, historia — ni "reel"/"story", legado sin ningún caller real, ni "video", que ni siquiera está permitido por el constraint de `proposals`), con la misma política de RLS de admin que ya usa el resto de las tablas. Se aplicó contra la base real y se verificó que la tabla y la política existieran.

Se amplió `proposalsApi` en `src/services/supabase.ts` con cuatro métodos nuevos — editar, borrar, reprogramar, convertir formato — y se agregó `templatesApi` con el CRUD completo de plantillas. Se agregaron los hooks correspondientes en `src/hooks/useProposals.ts`.

Se construyó un badge compartido, `PipelineBadge`, en un archivo nuevo `src/components/PipelineBadge.tsx`, que distingue con ícono y color los formatos con pipeline autónomo de los manuales, reusado en ambas pantallas.

Se construyó el modal de detalle compartido, `ProposalDetailDialog`, en `src/components/ProposalDetailDialog.tsx`: muestra el contenido de la pieza en modo lectura o edición; expone aprobar y rechazar cuando está pendiente o aprobada; cancelar cuando está programada; editar, copiar y borrar (con confirmación) mientras no esté publicada; una sección de agendar (si todavía no tiene fecha, pidiendo también la oferta de la que sale la foto) o reprogramar (si ya la tiene, solo la fecha); y una sección de convertir formato entre los tres valores reales, aclarando que el cambio de formato no agenda ni desagenda la pieza por su cuenta. Cuando la pieza está publicada, todo lo anterior desaparece y en su lugar aparece el aviso de solo lectura ya descripto.

Se reconstruyó `Propuestas.tsx`: las tarjetas quedaron simplificadas a clickeables (con un ícono de copiar rápido aparte), cada una mostrando el badge de pipeline, el badge de formato y el badge de estado; el detalle completo vive en el modal compartido; se agregó una quinta pestaña, Plantillas, con listado real, creación y edición contra Supabase, sin motor de render.

Se reconstruyó `Calendario.tsx`: se agregó un toggle de vista mensual/semanal; cada celda de día (mensual, compacta, o semanal, con más espacio) muestra las piezas de ese día con un ícono de pipeline autónomo o manual; las piezas con estado programado son arrastrables (`draggable`) y soltarlas sobre otro día llama de verdad a la reprogramación contra Supabase, preservando la hora original y solo cambiando la fecha; las piezas ya publicadas no son arrastrables, porque ya salieron; se agregó el mismo toggle de filas de prueba que el Dashboard, con el mismo criterio de exclusión por defecto y marca visual si se activan; y clickear cualquier pieza, en el calendario o en la lista de próximos siete días, abre el mismo modal compartido.

Se corrió lint (bajó a 55 problemas, 45 errores, sin subir el baseline), tests (con dos archivos de test nuevos, para Propuestas y Calendario, más el ajuste de un test de integración viejo que todavía esperaba el texto "Solo lectura" del Calendario original, ya no aplicable porque el calendario ahora edita de verdad) y build, todo limpio. Se verificó de nuevo que el servidor de desarrollo levantara sin errores, con el mismo límite de no poder pasar el login OTP.

Se hicieron dos commits separados, uno por pantalla, cada uno con su verificación y su `Deploy EDA` en verde.

## Parte 3 — Revisión de punta a punta

Se pidió analizar, revisar y probar de punta a punta el trabajo de las tres pantallas, cerrar, y dar un informe con un veredicto claro de si todo estaba bien.

En la revisión de código se encontró un bug real: tanto `Propuestas.tsx` como `Calendario.tsx` guardaban la propuesta clickeada como un objeto fijo en el estado de React, en vez de derivarlo en cada render de los datos ya cacheados de la query. El efecto concreto era que, si se abría el detalle de una pieza y se apretaba aprobar, reprogramar o convertir formato sin cerrar el modal, la acción sí pegaba bien contra Supabase, pero los badges y botones visibles adentro del modal seguían mostrando el estado viejo hasta cerrarlo y volver a abrirlo — por ejemplo, el botón de aprobar seguía apareciendo después de ya haber aprobado. El arreglo fue guardar solo el id de la pieza seleccionada en el estado y resolverlo en cada render contra los datos frescos de la query — como cualquier mutación ya invalidaba esa query, el modal terminaba actualizándose solo. De paso se sacó un import sin usar que había quedado en `Calendario.tsx`.

Se corrió lint, test y build de nuevo, todos limpios, con el conteo de errores de lint en el mismo nivel que antes del fix. Se hizo commit y push del arreglo, y se confirmó el `Deploy EDA` en verde. Se revisó además el panorama completo de corridas recientes de GitHub Actions: el patrón se repitió en los cuatro commits de la sesión — `Deploy EDA` siempre verde, `ci.yml` siempre rojo solo por el mismo baseline de lint preexistente y ya documentado, nunca por tests ni por build. Se verificó también, contra el sitio real ya desplegado en producción y no contra el entorno local, que la página cargaba bien, sin ningún recurso con error 404 y sirviendo el build más reciente — el único mensaje de consola encontrado fue un warning inofensivo y preexistente sobre una etiqueta `meta` de `X-Frame-Options` en `index.html`, un archivo nunca tocado en esta sesión.

## Parte 4 — Dos preguntas de seguimiento y el pedido de transcripción

Se preguntó qué había pasado con seis bugs específicos del Dashboard que se decían ya reportados — asteriscos crudos en los títulos, un modal vacío, un footer "EDA v1.0 — MejoraOK", un porcentaje de engagement en cero a verificar contra la base, un error en rojo de `historial.json` en la sección de resumen por red, y la pantalla de Configuración mostrando desplegables de Groq que el código ya ignora — pidiendo confirmar el estado real de cada uno sin rehacer los que ya estuvieran resueltos.

La respuesta fue que no había ningún registro de haber recibido esa lista en la conversación real — se la buscó de punta a punta y no aparecía en ningún mensaje anterior. Se señaló que esto es exactamente el caso que la propia documentación del proyecto ya contempla: cualquier insumo de otra sesión o de otro chat en paralelo solo se incorpora cuando se trae de forma expresa a esta conversación, y hasta entonces no aplica. En vez de inventar una respuesta, se verificó de forma independiente lo que sí se pudo comprobar contra el código real: el footer "EDA v1.0 — MejoraOK" seguía existiendo tal cual, en un archivo de layout nunca tocado en ninguno de los commits de esta sesión; la pantalla de Configuración seguía mostrando los desplegables de proveedor y modelo por agente pese a que el código ya no los usa para elegir el modelo, un gap que la propia documentación del proyecto ya registraba desde una sesión anterior, también en un archivo nunca tocado acá; y el aviso en rojo sobre el desglose por red era, en efecto, código propio de esta sesión — se probó el fetch exacto que usa ese aviso contra la URL real y devolvió una respuesta correcta con las cabeceras de acceso cruzado necesarias, así que si ese aviso realmente apareció en pantalla, no fue por un problema de red o de permisos de origen cruzado tal como está el código hoy, y haría falta el texto exacto o una captura para poder reproducirlo. Sobre los otros tres puntos —los asteriscos crudos, el modal vacío, y a qué pieza específica se refería el engagement en cero— no había manera honesta de confirmar ni descartar nada sin el reporte original.

Sobre el botón de republicar, se confirmó con una búsqueda completa sobre el código fuente que no existe ningún rastro de esa palabra ni de esa funcionalidad en ningún archivo — el modal no tiene, hoy, ningún botón de republicar. Se reiteraron los mismos tres motivos ya investigados al construir el modal: es una acción por plataforma, nunca por la pieza completa; crea un post nuevo en vez de reutilizar el existente; y nunca deja sincronizado el identificador real en la base después de usarse, además de estar deliberadamente protegida detrás de una confirmación manual fuera de la aplicación.

Se pidió entonces, primero como pedido puntual y después reformulado como una orden permanente — dogma — que cada vez que se actualice el archivo de documentación del proyecto se actualice en paralelo un archivo de transcripción con el nombre del proyecto, conteniendo toda la conversación transcripta de corrido, sin indicar quién dice cada parte en cada momento, incluyendo el contenido íntegro de cualquier documento abierto durante la sesión y el código final completo de lo entregado, todo transcripto en texto plano — excluyendo explícitamente los comandos de terminal, las respuestas crudas en formato JSON de las herramientas, y los resultados técnicos de comandos como curl, git o consultas SQL, que no debían transcribirse. Este mismo archivo es la respuesta a ese pedido, y la nota correspondiente quedó agregada al archivo de documentación del proyecto para que la práctica se sostenga de ahí en adelante.

---

## Anexo A — Brief definitivo de rediseño (`Data/brief-frontend-mejorasm.md`, texto completo)

# Brief definitivo — Rediseño UX/UI de MejoraSM

Generado a partir de la auditoría interactiva + ronda de preguntas cruzadas para resolver contradicciones. Este documento reemplaza al prompt corto generado automáticamente por el artifact — incorpora las 3 decisiones estructurales que la auditoría por sí sola no podía resolver.

### Contexto

El backend de MejoraSM ya está blindado y probado con evidencia real: Login OTP, Bóveda+RAG (19 docs, 53 chunks), `orchestrator` con Anthropic, autoagendado real (un carrusel ya se publicó solo en Instagram/Facebook), `metrics-collector` vía Zernio. Esta etapa es exclusivamente frontend — rediseño de UX/UI sobre ese motor ya funcional. **No tocar backend/orchestrator**, salvo el punto de ruteo de IA en Configuración (ver más abajo), que es lógica, no diseño.

### Criterio de marca (aplica a todo)

Skill `mejora-continua-brand` sin excepciones: paleta azul (#1A3D84) primario / rojo (#E1061E) y amarillo (#F7CC13) como acento puntual, nunca fondo dominante / blanco siempre de base. Tipografía Bw Modelica (Medium títulos, Regular cuerpo) con League Spartan como heading de apoyo. Isotipo trazo a mano — nunca geometrizado, nunca separado del wordmark para recomponerlo.

### Criterio de producto (aplica a todo)

- **Referencia de "wow":** identidad propia de Mejora Continua — no clonar Notion/Linear ni un dashboard de analytics genérico.
- **Usuarios:** uso individual, solo Pablo (no diseñar para equipo por ahora).
- **Dispositivo:** tiene que andar igual de bien en desktop y en mobile, no es "mobile-first con desktop de agregado" ni al revés.
- **Pantalla de mayor uso real:** Dashboard — es donde más se justifica invertir el mayor cuidado de diseño.

### Decisiones estructurales (resueltas en conversación, no asumidas)

1. **Mesa de Diálogo y Laboratorio se fusionan en una sola herramienta.** Pablo describió el mismo propósito para las dos ("cuando tengo una idea puntual o me piden comunicar algo, ayudame a prepararlo y mostrame cómo va a quedar antes de decidir si vale la pena"). Sugerencia de nombre: mantener "Mesa de Diálogo" y absorber ahí la función de brief puntual de Laboratorio, discontinuando Laboratorio como pantalla separada — nombre es sugerencia, cambiable.
2. **Propuestas está mal diseñada de punta a punta**, no es solo un problema de falta de preview — confirmado explícitamente. Tratar como reconstrucción completa, no como "agregar una vista previa arriba de lo que ya hay".
3. **El motor de insights de IA para el Dashboard va incluido en este mismo prompt**, no en una fase separada — Pablo lo pidió explícitamente junto, no después.

### 1. Dashboard (máxima prioridad — es la pantalla de uso diario)

Reconstrucción completa. Tiene que ser una síntesis real de lo que pasa en Instagram y Facebook, no solo 4 números sueltos. Alcance pedido explícitamente:

- Resumen de actividad real de ambas redes, con capturas/miniaturas de lo publicado y de lo que está por publicarse.
- Ranking de piezas y tipos de contenido más exitosos.
- Motor de insights con IA, no solo gráficos: análisis y recomendaciones basadas en cómo responde el público real de Pablo, aprendizaje sobre el público objetivo y buyer personas, mejores prácticas de redes sociales, tips y guías activas — no un reporte estático, algo que se pueda discutir.
- Todo interactivo: click en cualquier elemento lleva al detalle o a la sección correspondiente; tooltips al pasar el mouse explicando qué es cada cosa.
- Botón para generar un informe estilo infografía a partir de lo que se está viendo, con capacidad de parametrizar qué datos incluir.
- Bug a arreglar de paso: el gráfico de engagement mezcla hoy datos reales con las 10 filas de prueba [TEST/QA] de rule-engine, sin distinguirlas visualmente. Limpiar de la fuente de datos o marcarlas como prueba, no ambas cosas mezcladas sin aviso.
- Números separados por red (Instagram / Facebook) + un total combinado — no solo el agregado.

Los KPIs confirmados, de análisis real cruzando Meta Business Suite, IconSquare y base interna, no inventados: alcance por publicación, impresiones, alcance orgánico vs. pago, engagement sobre alcance, engagement sobre impresión, guardados, compartidos, comentarios, clics al enlace, tasa de finalización de video, tiempo promedio de reproducción, engagement por seguidor, crecimiento neto de seguidores, alcance/engagement promedio por formato, tasa de finalización de historias.

Los insights ya confirmados con datos reales, que el motor de IA arranca con esta base y no de cero: Facebook e Instagram van al mismo nivel de detalle en el Dashboard, porque el bajo rendimiento de Facebook es por falta de trabajo puesto ahí, no por el canal en sí, y con el sistema funcionando se espera que se mueva (roadmap futuro, fuera de este brief: sumar LinkedIn y TikTok si esto funciona). Reel gana en alcance pero pierde en retención: mejor reach medio (461) y mejor ER medio (3.26%) de los tres formatos, pero tiempo promedio de reproducción de solo ~6.9 segundos y casi nadie lo termina (0.81 full views promedio) — el motor de insights tiene que poder señalar esto como alerta, no solo mostrar el número de reach. El post estático o carousel con gancho directo en primera persona sobre liderazgo o decisiones da los ER más altos del período (ej. 27.9% y 22%), el mejor conversor de audiencia ya instalada, aunque llegue a menos gente nueva que el reel. Testimonios con nombre y apellido más series "Parte 1/2/3" concentran los saves y shares más altos del año, la señal de intención más fuerte en una cuenta B2B. Audiencia geográficamente concentrada en Posadas/Misiones (30-46% según red) más NEA y Paraguay, no dispersa a nivel nacional; base de seguidores pico en 35-44 años, pero el alcance reciente skewea a 25-34. No hay un horario único mágico: la audiencia está online de forma pareja de 11h a 23h todos los días; recomendación con datos: testear franja de mediodía (lunes a miércoles) contra tarde-noche en vez de fijarse en un solo bloque.

### 2. Manual de Identidad de Marca (rename de "Bóveda")

El nombre "Bóveda" queda descartado — se llama Manual de Identidad de Marca. Es la médula del sistema, no un simple listado de archivos: permitir subir un .zip completo con toda la información de marca de una vez, no solo archivo por archivo; el sistema tiene que leer, clasificar y guardar automáticamente el contenido del zip (mismo pipeline de embeddings que ya existe, pero con clasificación de tipo de documento); soportar carga de documentos específicos cuando la identidad evoluciona, cada uno clasificado, no solo apilado en una lista plana; mantener ver contenido sin tener que descargar el archivo y organización por categoría.

### 3. Mesa de Diálogo (fusión con Laboratorio)

Una sola herramienta con dos entradas posibles al mismo flujo: modo libre, donde el sistema propone un tema, y modo dirigido, donde Pablo tiene una idea puntual o le pidieron comunicar algo específico, la escribe y el sistema la desarrolla. En los dos casos, el resultado tiene que incluir preview visual real de cómo quedaría la pieza, no solo texto, usando el spec de formatos ya definido en `docs/prototipo-studio-v0.1/` como restricción de diseño; y sugerencia de cuándo conviene publicarlo y una valoración de si vale la pena la pieza antes de mandarla a Propuestas. Bug a arreglar de paso: encoding roto en tildes/ñ en los títulos de sesión, mismatch de UTF-8 entre generación y guardado/render.

### 4. Propuestas — reconstrucción completa

Confirmado: mal diseñada de punta a punta, no es un ajuste. El motor de fondo sí funciona (el autoagendado real ya publicó un carrusel en producción); el problema es exclusivamente de diseño/UX, no hay que tocar la lógica de publicación. Preview visual real de cada pieza, no lista de texto; simplificar las cinco acciones actuales a algo menos cargado visualmente; sección nueva para crear y gestionar plantillas o diseños de muestra reutilizables; dejar claro en la propia interfaz qué formatos tienen pipeline autónomo (post, carrusel) y cuáles requieren acción manual (historia, video) — hoy esa distinción no se ve, genera la sensación de que "no sirve para nada" cuando en realidad una parte ya corre sola.

### 5. Calendario — reconstrucción completa

Hoy es de solo lectura y sin ninguna interactividad real. Necesita: click en una pieza para ver el detalle completo, no solo el título; editar, borrar, republicar o convertir de formato directo desde ahí; drag and drop para mover fechas; preview visual de cada pieza en el propio calendario, no solo texto; información en tiempo real, no una vista estática; vista semanal además de la mensual actual.

### 6. Configuración — ruteo de IA automático

No es solo una pantalla de elegir modelo por agente a mano. Pablo quiere que Anthropic actúe como orquestador de criterio: qué modelo, qué skill y cuándo usar cada una, aplicando el mismo criterio que ya rige el resto del proyecto. Traducción técnica: `orchestrator` debe aplicar las reglas de `/optimo-de-uso` como lógica de ruteo automático entre modelos y proveedores, en vez de depender de que Pablo configure cada agente a mano. La pantalla de Configuración pasa a ser de supervisión, ver qué decidió el sistema y por qué, más que de asignación manual. Decisión ya tomada: Estratega y Creativo pasan a usar Anthropic por default, no Groq, consistente con que la única corrida real publicada usó Anthropic.

### Fuera de alcance de este brief

No tocar `orchestrator`, `publish-scheduled-posts`, `metrics-collector` ni ningún Edge Function existente, salvo la lógica de ruteo de modelo descrita en el punto 6. No es necesario diseñar para más de un usuario. La lista larga de KPIs específicos de Pablo queda pendiente de que él la reenvíe, no inventarla.

### Siguiente paso

Con este brief, arrancar en Claude Design una maqueta por pantalla, empezando por Dashboard y siguiendo por Propuestas y Calendario, los dos con veredicto más negativo. Mesa de Diálogo y Manual de Identidad de Marca después. Configuración es mayormente trabajo de Claude Code, no de maqueta visual, puede ir en paralelo.

---

## Anexo B — Análisis de redes sociales (`Data/analisis-redes-mejora-continua.md`, texto completo)

# Análisis de redes sociales — Mejora Continua (Instagram + Facebook)

Cuenta: mejoraok / Mejora Continua, consultora B2B de claridad estratégica, Posadas, Misiones. Documento generado en agosto de 2026 a partir de tres exports crudos combinados.

### Fuentes usadas

Un CSV de Meta Business Suite con rendimiento por publicación (289 publicaciones entre Instagram y Facebook, post a post, con alcance, impresiones, engagement y video, ventana del 26 de enero de 2025 al 3 de febrero de 2026). Un export interno de IconSquare con métricas ya estructuradas por post de Instagram (likes, saves, shares, reach, reach rate, engagement on reach, ventana corta del 13 de abril al 4 de mayo de 2026, usada para cruzar y confirmar, no como base principal). Un CSV de audiencia y demografía de Meta, tanto nativo de Facebook como de IconSquare para Instagram, cruzando ambas plataformas. Como complementarios: series diarias a nivel cuenta de Instagram Business Profiles y Facebook Pages en el mismo rango que la fuente principal, y los exports nativos de Meta Business Suite en UTF-16 de la cuenta de Facebook para confirmar actividad reciente.

Nota de calidad de datos: dos de los CSV de público mostraban un panel prácticamente 100% Argentina con ciudades tipo Capital Federal, Córdoba y Rosario, y afinidad con páginas masivas no relacionadas con la marca — no coincidía con ninguna otra fuente ni con el foco geográfico real de la cuenta, así que se descartó para las conclusiones de audiencia por parecer un panel de intereses genérico de Meta.

### KPIs para el dashboard

Ordenados por relevancia para una consultora B2B, donde el objetivo no es venta directa desde el post sino generar autoridad, confianza y conversación con potenciales clientes: alcance por publicación (base de todo, cuánta gente única vio el contenido); impresiones por publicación (frecuencia de exposición, distinto de alcance único); alcance orgánico vs. pago (separa lo que funciona por contenido de lo que funciona por presupuesto); tasa de engagement sobre alcance (más representativa que sobre impresión para medir si el que vio, reaccionó); tasa de engagement sobre impresión (métrica estándar de la plataforma); guardados (en B2B es la señal más fuerte de intención real, más que el like); compartidos (validación social activa); comentarios (proxy de conversación, más valioso que el like en una cuenta de servicios); clics al enlace (la métrica más cercana a intención de conversión en un negocio de servicios); tasa de finalización de video (si el mensaje se termina de consumir, no solo si arrancó); tiempo promedio de reproducción (calidad del gancho inicial); engagement por seguidor (detecta si el crecimiento es vanidad o audiencia activa); crecimiento neto de seguidores (tendencia real de la comunidad); alcance y engagement promedio por formato (para decidir el mix con evidencia, no con intuición); tasa de finalización de historias (mide retención de comunidad activa, no alcance nuevo).

### Qué contenido rindió mejor en los últimos 60 a 90 días

Instagram y Facebook no son una decisión pareja. En los últimos 90 días sin stories, Instagram tuvo un ER medio de 6.44% y un alcance medio de 294, contra un ER medio de 0.19% y un alcance medio de 33 en Facebook. En todo el año, con una muestra más grande, Instagram tuvo un ER medio de 2.44% y alcance medio de 401, contra 1.28% y 39 en Facebook. En el export más reciente de la página de Facebook, con una ventana de treinta días entre julio y agosto de 2026, hubo cero visitas, cero interacciones y cero clics en enlace en prácticamente todos los días — no es una racha mala, es una página sin pulso.

Sobre formato, con la muestra grande del año completo en Instagram sin stories: el video o reel, con 44 casos, tuvo un ER medio de 3.26%, ER mediana de 1.81%, reach medio de 461, engagements medio de 14.9 y saves medio de 0.43. El carousel, con 22 casos, tuvo ER medio de 2.15%, mediana de 0.92%, reach medio de 445, engagements medio de 13.2 y saves medio de 0.50. La foto, con 32 casos, tuvo ER medio de 1.51%, mediana de 0.68%, reach medio de 288, engagements medio de 9.4 y saves medio de 0.31. El reel es el formato más sólido en la muestra grande, aunque en la ventana corta de 90 días el carousel pareciera ganar, mostrando solo dos posteos, insuficiente para sacar una conclusión de formato, aunque sí confirma que un carousel bien escrito puede picar más alto que cualquier reel puntual.

El problema del reel es que entra pero no se termina de ver: el tiempo promedio de reproducción es de apenas 6.9 segundos, y el promedio de full video views por posteo es de 0.81 — básicamente nadie lo termina. El reel funciona como generador de alcance, no como vehículo del mensaje completo.

Lo que más picó, con datos concretos, en los últimos 90 días sin stories, por engagement rate: un reel titulado "En serio... hacer TEAM es trampa???" con ER de 51.5%, reach de 31 y 17 engagements, el 28 de noviembre. Un post/carousel titulado "WhatsApp no es decoración. Si vas a estar, respondé." con ER de 27.9%, reach de 30 y 17 engagements, el 3 de febrero. Un post/foto titulado "Equivocarse no te resta liderazgo. Negarse a aprender, sí." con ER de 22.0%, reach de 148 y 70 engagements, el 22 de diciembre. Un reel recap de "12 especialistas asociados... 2025" con ER de 12.4%, reach de 146 y 27 engagements, el 26 de enero. Por alcance, en la misma ventana: un reel titulado "Familia, desarrollo, profesionalización... la fórmula del éxito" con reach de 1372, 87 engagements y ER de 3.97%, el 2 de diciembre; un reel invitación a un evento en vivo con reach de 1000 y ER de 0.75%, el 6 de noviembre; y un reel con reach de 721, el 15 de diciembre.

Los patrones de tema que se repiten en lo que mejor anda: liderazgo con gancho en primera persona o confrontativo, con los ER más altos del período, en formato estático o carousel, no reel; contenido de evento en vivo, que genera los picos de alcance más grandes aunque el ER sea bajo; series "Parte 1/Parte 2/Parte 3", como la serie sobre negociación, que sostuvo un reach de 520, 436 y 237 en publicaciones consecutivas, señal de audiencia que vuelve a buscar la continuación; y testimonios con nombre y apellido, que no son los de mayor reach pero concentran los saves y shares más altos de todo el año, la señal de intención más fuerte en B2B. Esto coincide con el export nativo de Meta para Facebook, donde las interacciones por formato dan 56 para reels, 40 para historias, 14 para varias fotos y 14 para foto, el mismo orden que se ve en el análisis de rendimiento por publicación.

Sobre horario y día: el análisis de 90 días marca el bloque de las 18 horas como el más consistente, con siete casos y ER medio de 12.8%; por día, martes y lunes son los más robustos. El heatmap más reciente de IconSquare, de abril y mayo de 2026, marca un pico en miércoles a las 13 horas, con picos secundarios lunes temprano y a mediodía, y martes a las 19 horas. Cuándo está la audiencia efectivamente online, independiente del historial de posteos, muestra una meseta amplia de 11 a 23 horas todos los días, con un pico puntual el lunes a las 21 horas. La cadencia real de publicación ya se concentra de lunes a jueves, coincidiendo con los días de mejor rendimiento.

### Perfil de audiencia real

Cruzando demografía nativa de Facebook con demografía de Instagram de IconSquare: la base de seguidores en ambas plataformas tiene su pico claro en 35 a 44 años, con mujeres levemente por encima de hombres en casi todos los tramos. La gente alcanzada recientemente en Instagram, no solo los seguidores ya instalados, skewea un poco más joven, con 25 a 34 años como el grupo de mayor alcance actual, casi empatado con 35 a 44 — el contenido reciente está entrando a una audiencia algo más joven que la base histórica.

Sobre geografía, coincidiendo ambas fuentes: Argentina entre 57.6% y 61.2%, Paraguay entre 19.7% y 20.2%, México alrededor de 10.4% a 11%, Perú alrededor de 4.5% a 4.7%, España alrededor de 1.3%. La ciudad top es Posadas, Misiones, con 30.9% en Facebook y 45.7% en Instagram; la segunda es Encarnación, Paraguay. El resto del top diez de ciudades es NEA argentino y Paraguay — la cuenta tiene una audiencia geográficamente concentrada en la región, no dispersa a nivel nacional.

### Recomendaciones concretas

Cortar Facebook como canal activo de estrategia y dejarlo solo en cross-post automático, dado el ER del año de 1.28% contra 2.44% de Instagram, reach de 39 contra 401, y una ventana reciente con cero actividad casi todos los días. Seguir apostando a reels para alcance, pero acortarlos y reforzar el gancho de los primeros segundos, porque el problema no es el alcance sino la retención. Repetir el formato de testimonio con nombre y apellido y las series multi-parte, porque son los que más guardan y comparten en todo el año, la señal de intención más fuerte que hay en una cuenta B2B. No abandonar el post estático o carousel por perseguir solo reel, porque los picos de engagement rate más altos del período fueron post fijo o carousel, con gancho directo en primera persona sobre liderazgo o decisiones. Testear franja de mediodía entre semana, de lunes a miércoles, además de la tarde-noche, porque no hay un horario único obligado.

---

## Anexo C — Código final completo

### `supabase/migrations/009_metrics_clicks.sql`

```sql
-- Migration: persistir clicks de Zernio Analytics en metrics
--
-- GET /v1/analytics de Zernio ya devuelve "clicks" en el objeto analytics
-- (confirmado contra el spec real, ver CLAUDE.md "Métricas vía Zernio
-- Analytics") pero supabase/functions/metrics-collector/index.ts lo
-- descartaba al mapear la respuesta (interface ZernioMetrics no lo incluía)
-- y metrics no tenía columna para guardarlo. Este cambio solo agrega la
-- columna — el mapeo se corrige aparte en el código de la función.
--
-- Nullable, sin DEFAULT a propósito: las filas ya existentes en metrics
-- quedan en NULL (nunca se recolectó ese dato para ellas), no en 0 (que
-- significaría "se midió y dio cero clics").
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/009_metrics_clicks.sql`
-- (con -f, no `"$(cat ...)"` inline — el comentario -- de esta cabecera
-- rompe el modo inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (roto, ver CLAUDE.md "Bug conocido del CLI").

ALTER TABLE metrics
  ADD COLUMN IF NOT EXISTS clicks INTEGER;

COMMENT ON COLUMN metrics.clicks IS
  'Clics al link, desde el campo "clicks" de GET /v1/analytics (Zernio). NULL = nunca recolectado para este post (no confundir con 0 clics reales, que sí es un valor medido). Agregado 2026-08-07 — antes la API ya lo devolvía pero metrics-collector lo descartaba al mapear.';
```

### `supabase/migrations/010_templates.sql`

```sql
-- Migration: estructura de plantillas de contenido (sin motor de render)
--
-- Solo el CRUD estructural pedido en el rediseño de Propuestas
-- (listar/crear/editar) — el motor de render que efectivamente use estas
-- plantillas para generar piezas viene después, no en esta migración. El
-- concepto se conecta a futuro con templates/post-template.html y
-- templates/story-template.html (los templates HTML reales que ya usa
-- Playwright para renderizar) — hoy son dos cosas separadas a propósito.
--
-- format usa el mismo universo real de valores que orchestrator produce
-- (post | carrusel | historia) — no reel/story (legacy del constraint de
-- proposals, sin ningún caller real) ni video (ni siquiera está permitido
-- por proposals_format_check).
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/010_templates.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  format TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_format_check;
ALTER TABLE templates ADD CONSTRAINT templates_format_check
  CHECK (format IN ('post', 'carrusel', 'historia'));

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON templates;
CREATE POLICY "Admin full access" ON templates
  FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

COMMENT ON TABLE templates IS
  'Plantillas de pieza reutilizables, solo estructura (nombre/formato/notas) — sin motor de render todavía. CRUD real desde /propuestas.';
```

### `supabase/functions/metrics-collector/index.ts`

```typescript
// supabase/functions/metrics-collector/index.ts
// Recolecta métricas desde la API de analíticas de Zernio y las guarda en la DB
// Uso: POST /metrics-collector { action: "collect", proposalId, postId }
// Cron: ejecutar cada 6 horas

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";

const ALLOWED_ORIGINS = [
  "https://pabloeckert.github.io",
  "https://mejorasm-*.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app") ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function validateBody(body: any, required: string[]) {
  const missing = required.filter((k) => body[k] === undefined || body[k] === null);
  if (missing.length > 0) {
    throw new Error(`Campos requeridos faltantes: ${missing.join(", ")}`);
  }
}

// ═══════════════════════════════════════
// ZERNIO ANALYTICS API
// ═══════════════════════════════════════
// docs.zernio.com — GET /v1/analytics?postId={id}
// Acepta tanto Zernio Post IDs como External Post IDs (auto-resuelve) — el
// zernio_post_id que ya guarda `proposals` sirve directo como postId, sin
// necesidad de resolverlo al media ID real de la plataforma (esa incógnita
// quedaba documentada como pendiente en la versión anterior de este archivo,
// que pegaba directo a graph.facebook.com/{postId}/insights).

interface ZernioMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  clicks: number;
}

const ZERNIO_ANALYTICS_URL = "https://zernio.com/api/v1/analytics";

async function getPostAnalytics(postId: string, apiKey: string): Promise<ZernioMetrics> {
  const url = `${ZERNIO_ANALYTICS_URL}?postId=${encodeURIComponent(postId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (res.status === 402) {
    throw new Error(
      "Zernio Analytics error 402: el plan actual no incluye el add-on de Analytics (planes legacy lo necesitan aparte; viene incluido en los planes usage-based)."
    );
  }
  if (res.status === 424) {
    throw new Error(
      "Zernio Analytics error 424: el post falló en publicar en todas las plataformas — no hay analíticas disponibles para este postId."
    );
  }
  if (res.status === 202) {
    throw new Error(
      "Zernio Analytics: sync pendiente (202) — todavía no terminó de sincronizar las métricas desde la plataforma, reintentar en la próxima corrida."
    );
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zernio Analytics error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const a = data.analytics || {};
  return {
    likes: a.likes ?? 0,
    comments: a.comments ?? 0,
    shares: a.shares ?? 0,
    saves: a.saves ?? 0,
    reach: a.reach ?? 0,
    impressions: a.impressions ?? 0,
    clicks: a.clicks ?? 0,
  };
}

// ═══════════════════════════════════════
// PROCESAMIENTO
// ═══════════════════════════════════════

async function collectMetrics(proposalId: string, postId: string) {
  const apiKey = Deno.env.get("ZERNIO_API_KEY");
  if (!apiKey) {
    throw new Error("ZERNIO_API_KEY no configurado. Configurar en Supabase Secrets.");
  }

  // 1. Get analytics from Zernio
  const metrics = await getPostAnalytics(postId, apiKey);

  // 2. Save to DB
  const { data: existing } = await supabase
    .from("metrics")
    .select("id")
    .eq("proposal_id", proposalId)
    .eq("post_id", postId)
    .single();

  if (existing) {
    // Update existing
    await supabase
      .from("metrics")
      .update({
        ...metrics,
        measured_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Insert new
    await supabase.from("metrics").insert({
      proposal_id: proposalId,
      post_id: postId,
      ...metrics,
    });
  }

  return { postId, metrics, updated: !!existing };
}

async function collectAllPending() {
  const apiKey = Deno.env.get("ZERNIO_API_KEY");
  if (!apiKey) {
    // ZERNIO_API_KEY ya existe como secret de GitHub Actions (lo usan
    // scripts/lib/zernio.mjs para publicar), pero acá corre como Supabase
    // Edge Function — es un secret de Supabase aparte, todavía no
    // configurado ahí. No cortar el cron con un error: mientras no exista,
    // esto es un no-op esperado, no una falla. Apenas se configure
    // ZERNIO_API_KEY como secret de Supabase, esta misma corrida empieza a
    // servir sin tocar nada más.
    return {
      message: "ZERNIO_API_KEY no configurado en Supabase Secrets todavía — nada para recolectar.",
      count: 0,
      skipped: true,
    };
  }

  // zernio_post_id es lo que efectivamente llena el pipeline actual
  // (scripts/publish-scheduled-posts.mjs, vía Zernio) — instagram_post_id es
  // legacy del publisher viejo (Graph API directa) y ya no lo escribe nadie.
  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, zernio_post_id, title")
    .eq("status", "published")
    .not("zernio_post_id", "is", null);

  if (!proposals?.length) {
    return { message: "No hay posts publicados para recolectar métricas", count: 0 };
  }

  const results = [];
  for (const proposal of proposals) {
    try {
      const result = await collectMetrics(proposal.id, proposal.zernio_post_id);
      results.push({ ...result, title: proposal.title });
    } catch (e: any) {
      results.push({
        postId: proposal.zernio_post_id,
        title: proposal.title,
        error: e.message,
      });
    }
  }

  return { count: results.length, results };
}

async function generateInsights() {
  // Analyze metrics and generate insights
  const { data: metrics } = await supabase
    .from("metrics")
    .select("*, proposals(title, format, hook, hashtags)")
    .order("measured_at", { ascending: false })
    .limit(50);

  if (!metrics?.length) {
    return { insights: [], message: "No hay suficientes métricas para generar insights" };
  }

  // Calculate averages
  const avgEngagement =
    metrics.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / metrics.length;

  const topPost = metrics.reduce((best, m) =>
    (m.engagement_rate || 0) > (best.engagement_rate || 0) ? m : best
  );

  // Group by format
  const byFormat: Record<string, typeof metrics> = {};
  for (const m of metrics) {
    const format = m.proposals?.format || "post";
    if (!byFormat[format]) byFormat[format] = [];
    byFormat[format].push(m);
  }

  const formatStats = Object.entries(byFormat).map(([format, items]) => ({
    format,
    count: items.length,
    avgEngagement:
      items.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / items.length,
  }));

  return {
    totalPosts: metrics.length,
    avgEngagement: Math.round(avgEngagement * 100) / 100,
    topPost: {
      title: topPost.proposals?.title,
      engagement: topPost.engagement_rate,
      likes: topPost.likes,
      reach: topPost.reach,
    },
    formatStats,
    insights: [
      avgEngagement > 3
        ? "✅ Engagement rate por encima del promedio (3%). Seguir con la misma estrategia."
        : "⚠️ Engagement rate bajo el promedio. Probar hooks más emocionales o cambiar horario.",
      formatStats.length > 1
        ? `📊 El formato "${formatStats.sort((a, b) => b.avgEngagement - a.avgEngagement)[0]?.format}" tiene mejor rendimiento.`
        : "📊 Necesitás más variedad de formatos para comparar rendimiento.",
    ],
  };
}

// ═══════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return unauthorizedResponse(auth, corsHeaders);

  try {
    const body = await req.json();
    const { action } = body;

    let result;

    switch (action) {
      case "collect":
        validateBody(body, ["proposalId", "postId"]);
        result = await collectMetrics(body.proposalId, body.postId);
        break;

      case "collect-all":
        result = await collectAllPending();
        break;

      case "insights":
        result = await generateInsights();
        break;

      default:
        throw new Error("Acción no válida. Usa 'collect', 'collect-all' o 'insights'");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const status = e.message?.includes("Campos requeridos") ? 400 : 500;
    return new Response(JSON.stringify({ error: e.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### `.github/workflows/deploy-functions.yml`

```yaml
# Deploy Edge Functions to Supabase
# Trigger: manual (workflow_dispatch) or after CI passes on main
name: Deploy Edge Functions

on:
  workflow_dispatch:
    inputs:
      function_name:
        description: 'Function to deploy (leave empty for all)'
        required: false
        default: ''
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

# Cancel in-progress runs for the same branch
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    name: Deploy Edge Functions
    runs-on: ubuntu-latest
    # Only deploy after CI passes (if triggered by push)
    # For manual dispatch, always run
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install Supabase CLI
        run: npm install -g supabase

      - name: Login to Supabase
        run: npx supabase login --token ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      # No hay paso "Link project" a propósito — `supabase link` pega contra
      # GET /v1/projects/{ref}/api-keys, que hoy devuelve un inserted_at que
      # no matchea el regex ISO8601 que espera el CLI (SchemaError real,
      # reproducido también en local, no un problema de este workflow) y
      # tira el step abajo. No hace falta: cada comando de `functions
      # deploy` ya recibe --project-ref directo, así que nunca necesita el
      # link previo — probado en local sin `link`, deploya bien igual.
      - name: Deploy specific function
        if: ${{ github.event.inputs.function_name != '' }}
        run: |
          echo "🚀 Deploying function: ${{ github.event.inputs.function_name }}"
          npx supabase functions deploy ${{ github.event.inputs.function_name }} \
            --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}

      - name: Deploy all functions
        if: ${{ github.event.inputs.function_name == '' }}
        run: |
          echo "🚀 Deploying all Edge Functions..."
          FUNCTIONS=("orchestrator" "vault-process" "metrics-collector" "rule-engine")
          
          FAILED=0
          for fn in "${FUNCTIONS[@]}"; do
            echo ""
            echo "━━━ Deploying: $fn ━━━"
            if npx supabase functions deploy "$fn" \
              --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}; then
              echo "✅ $fn — OK"
            else
              echo "❌ $fn — FAILED"
              ((FAILED++))
            fi
          done
          
          echo ""
          echo "━━━━━━━━━━━━━━━━━━━━"
          if [ "$FAILED" -gt 0 ]; then
            echo "⚠️ $FAILED function(s) failed to deploy"
            exit 1
          else
            echo "✅ All functions deployed successfully!"
          fi

      - name: Verify endpoints
        if: success()
        run: |
          SUPABASE_URL="https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co"
          ANON_KEY="${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}"
          
          echo ""
          echo "🏥 Verifying endpoints..."
          
          for fn in orchestrator vault-process metrics-collector rule-engine; do
            code=$(curl -s -o /dev/null -w "%{http_code}" \
              "$SUPABASE_URL/functions/v1/$fn" \
              -H "apikey: $ANON_KEY" 2>/dev/null)
            case "$code" in
              401|405|400) echo "  ✅ $fn — active (HTTP $code)" ;;
              404)         echo "  ❌ $fn — NOT FOUND (HTTP 404)" ;;
              *)           echo "  ⚠️  $fn — HTTP $code" ;;
            esac
          done
```

### `src/services/supabase.ts`

```typescript
// src/services/supabase.ts
// Cliente de Supabase para queries directas (CRUD)

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "[supabase] Variables de entorno no configuradas.\n" +
    "Creá un archivo .env con:\n" +
    "  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\n" +
    "  VITE_SUPABASE_PUBLISHABLE_KEY=tu-anon-key\n" +
    "En Vercel: Settings → Environment Variables"
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseKey ?? "");

// ═══════════════════════════════════════
// DOCUMENTOS (Bóveda)
// ═══════════════════════════════════════

export const documentsApi = {
  list: () =>
    supabase.from("documents").select("*").order("created_at", { ascending: false }),

  get: (id: string) =>
    supabase.from("documents").select("*").eq("id", id).single(),

  upload: async (file: File) => {
    const filePath = `${Date.now()}-${file.name}`;

    // Subir a storage
    const { error: uploadError } = await supabase.storage
      .from("vault")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    // Crear registro
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({
        title: file.name,
        file_path: filePath,
        file_type: file.type,
      })
      .select()
      .single();
    if (dbError) throw dbError;

    return doc;
  },

  delete: async (id: string) => {
    // Obtener path
    const { data: doc } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", id)
      .single();

    if (doc) {
      await supabase.storage.from("vault").remove([doc.file_path]);
    }

    return supabase.from("documents").delete().eq("id", id);
  },
};

// ═══════════════════════════════════════
// SESIONES DE DIÁLOGO
// ═══════════════════════════════════════

export const dialogueApi = {
  listSessions: () =>
    supabase
      .from("dialogue_sessions")
      .select("*")
      .order("created_at", { ascending: false }),

  getSession: (id: string) =>
    supabase
      .from("dialogue_sessions")
      .select("*, dialogue_messages(*)")
      .eq("id", id)
      .single(),

  getMessages: (sessionId: string) =>
    supabase
      .from("dialogue_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("turn", { ascending: true }),
};

// ═══════════════════════════════════════
// PROPUESTAS
// ═══════════════════════════════════════

export const proposalsApi = {
  list: () =>
    supabase
      .from("proposals")
      .select("*, dialogue_sessions(topic)")
      .order("created_at", { ascending: false }),

  approve: (id: string) =>
    supabase.from("proposals").update({ status: "approved" }).eq("id", id),

  reject: (id: string, reason: string) =>
    supabase
      .from("proposals")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", id),

  schedule: (id: string, date: string, oferta: string) =>
    supabase
      .from("proposals")
      .update({ status: "scheduled", scheduled_at: date, oferta })
      .eq("id", id),

  // Monitor de reversión (PLAN_AUTONOMIA.md Fase 2): cancela una propuesta
  // todavía no publicada (autoagendada o programada a mano) antes de que el
  // cron de publish-scheduled-posts.yml la levante. Para una ya publicada,
  // la reversión es scripts/manage-post.mjs (workflow_dispatch), no esto.
  cancel: (id: string) =>
    supabase
      .from("proposals")
      .update({ status: "rejected", rejection_reason: "Cancelada antes de publicar" })
      .eq("id", id),

  pending: () =>
    supabase
      .from("proposals")
      .select("*, dialogue_sessions(topic)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),

  // Modal de detalle (rediseño 2026-08-07) — acciones reales, solo válidas
  // mientras la pieza no esté published (se valida también en la UI, esto
  // es la capa de datos).
  edit: (
    id: string,
    fields: Partial<{ title: string; hook: string; body: string; cta: string; hashtags: string[] }>
  ) => supabase.from("proposals").update(fields).eq("id", id),

  remove: (id: string) => supabase.from("proposals").delete().eq("id", id),

  reschedule: (id: string, date: string) =>
    supabase.from("proposals").update({ scheduled_at: date }).eq("id", id),

  // Valores reales que produce el pipeline (post | carrusel | historia) —
  // no reel/story (legacy del CHECK constraint, sin caller real) ni video
  // (ni siquiera permitido por proposals_format_check).
  convertFormat: (id: string, format: string) =>
    supabase.from("proposals").update({ format }).eq("id", id),
};

// ═══════════════════════════════════════
// PLANTILLAS (estructura, sin motor de render — ver migración 010)
// ═══════════════════════════════════════

export const templatesApi = {
  list: () => supabase.from("templates").select("*").order("created_at", { ascending: false }),

  create: (fields: { name: string; format: string; notes?: string }) =>
    supabase.from("templates").insert(fields).select().single(),

  update: (id: string, fields: Partial<{ name: string; format: string; notes: string }>) =>
    supabase
      .from("templates")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id),

  remove: (id: string) => supabase.from("templates").delete().eq("id", id),
};

// ═══════════════════════════════════════
// CALENDARIO
// ═══════════════════════════════════════

export const calendarApi = {
  list: () =>
    supabase
      .from("calendar_events")
      .select("*, proposals(title, format)")
      .order("date", { ascending: true }),

  create: (event: {
    title: string;
    description?: string;
    date: string;
    format: string;
    proposal_id?: string;
  }) => supabase.from("calendar_events").insert(event),
};

// ═══════════════════════════════════════
// MÉTRICAS
// ═══════════════════════════════════════

export const metricsApi = {
  latest: () =>
    supabase
      .from("metrics")
      .select("*, proposals(title, format)")
      .order("measured_at", { ascending: false })
      .limit(30),

  // Dashboard (rediseño 2026-08-07): a diferencia de latest() no tiene
  // límite — el Dashboard necesita el set completo para calcular KPIs
  // agregados reales (sumas/promedios), no solo una muestra reciente.
  // Trae los campos de proposals necesarios para el ranking de piezas,
  // el desglose por red y el filtro de filas [TEST/QA].
  all: () =>
    supabase
      .from("metrics")
      .select(
        "*, proposals(id, title, hook, format, status, zernio_post_id, oferta, rendered_image_path)"
      )
      .order("measured_at", { ascending: false }),

  byProposal: (proposalId: string) =>
    supabase
      .from("metrics")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("measured_at", { ascending: false }),

  successRules: () =>
    supabase
      .from("success_rules")
      .select("*")
      .order("confidence", { ascending: false }),
};
```

### `src/hooks/useMetrics.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { calendarApi, metricsApi } from "@/services/supabase";
import { supabase } from "@/services/supabase";

// ═══════════════════════════════════════
// CALENDARIO
// ═══════════════════════════════════════

export function useCalendarEvents() {
  return useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const { data, error } = await calendarApi.list();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (event: {
      title: string;
      description?: string;
      date: string;
      format: string;
      proposal_id?: string;
    }) => calendarApi.create(event),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  });
}

// ═══════════════════════════════════════
// MÉTRICAS
// ═══════════════════════════════════════

export function useLatestMetrics() {
  return useQuery({
    queryKey: ["metrics", "latest"],
    queryFn: async () => {
      const { data, error } = await metricsApi.latest();
      if (error) throw error;
      return data;
    },
  });
}

export function useAllMetrics() {
  return useQuery({
    queryKey: ["metrics", "all"],
    queryFn: async () => {
      const { data, error } = await metricsApi.all();
      if (error) throw error;
      return data;
    },
  });
}

export function useProposalMetrics(proposalId: string) {
  return useQuery({
    queryKey: ["metrics", "proposal", proposalId],
    queryFn: async () => {
      const { data, error } = await metricsApi.byProposal(proposalId);
      if (error) throw error;
      return data;
    },
    enabled: !!proposalId,
  });
}

export function useSuccessRules() {
  return useQuery({
    queryKey: ["success-rules"],
    queryFn: async () => {
      const { data, error } = await metricsApi.successRules();
      if (error) throw error;
      return data;
    },
  });
}
```

### `src/hooks/useProposals.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsApi, templatesApi } from "@/services/supabase";

export function useProposals() {
  return useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const { data, error } = await proposalsApi.list();
      if (error) throw error;
      return data;
    },
  });
}

export function usePendingProposals() {
  return useQuery({
    queryKey: ["proposals", "pending"],
    queryFn: async () => {
      const { data, error } = await proposalsApi.pending();
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useApproveProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => proposalsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useRejectProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      proposalsApi.reject(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useScheduleProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date, oferta }: { id: string; date: string; oferta: string }) =>
      proposalsApi.schedule(id, date, oferta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useCancelProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => proposalsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

// ═══════════════════════════════════════
// MODAL DE DETALLE — acciones reales (rediseño 2026-08-07)
// ═══════════════════════════════════════

export function useEditProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string;
      fields: Partial<{ title: string; hook: string; body: string; cta: string; hashtags: string[] }>;
    }) => proposalsApi.edit(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => proposalsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useRescheduleProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => proposalsApi.reschedule(id, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useConvertProposalFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: string }) => proposalsApi.convertFormat(id, format),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

// ═══════════════════════════════════════
// PLANTILLAS
// ═══════════════════════════════════════

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await templatesApi.list();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: { name: string; format: string; notes?: string }) => templatesApi.create(fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string;
      fields: Partial<{ name: string; format: string; notes: string }>;
    }) => templatesApi.update(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templatesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}
```

### `src/components/PipelineBadge.tsx`

```typescript
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

// Mismo universo real que usa orchestrator (AUTO_PUBLISH_FORMATS) — post y
// carrusel se agendan y publican solos; el resto (historia, y "video" que
// ni siquiera está permitido por proposals_format_check) requiere acción
// manual. Ver CLAUDE.md, "Arquitectura: publicación autónoma de posts de
// feed" — no confundir con AUTO_PUBLISH_FORMATS del backend, que es la
// misma lista pero no se puede importar directo del Edge Function.
export const AUTONOMOUS_FORMATS = ["post", "carrusel"];

export function isAutonomousFormat(format?: string | null): boolean {
  return AUTONOMOUS_FORMATS.includes(format || "");
}

// Badge compartido entre Propuestas y Calendario — antes esta distinción no
// se veía en ningún lado, lo que daba la sensación de que "no sirve para
// nada" cuando en realidad post/carrusel ya corren solos.
export function PipelineBadge({ format, className }: { format?: string | null; className?: string }) {
  const autonomous = isAutonomousFormat(format);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "gap-1",
            autonomous ? "border-primary/40 text-primary" : "border-[#F7CC13] text-[#c9a30d]",
            className
          )}
        >
          {autonomous ? <Zap className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
          {autonomous ? "Se publica solo" : "Acción manual"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-[220px] text-xs">
        {autonomous
          ? "Este formato se agenda y publica solo apenas el Crítico lo aprueba — nadie tiene que apretar nada."
          : "Este formato no tiene pipeline autónomo todavía — necesita aprobación y gestión manual."}
      </TooltipContent>
    </Tooltip>
  );
}
```

### `src/components/ProposalDetailDialog.tsx`

```typescript
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PipelineBadge } from "@/components/PipelineBadge";
import { toast } from "@/components/ui/use-toast";
import {
  CheckCircle,
  XCircle,
  Trash2,
  Pencil,
  Calendar,
  Repeat,
  Copy,
  Check,
  Loader2,
  Info,
} from "lucide-react";
import {
  useApproveProposal,
  useRejectProposal,
  useCancelProposal,
  useScheduleProposal,
  useEditProposal,
  useDeleteProposal,
  useRescheduleProposal,
  useConvertProposalFormat,
} from "@/hooks/useProposals";

// Mismas 5 dimensiones que content/inbox/ (ver scripts/generate-brief.mjs) —
// de acá sale la foto que usa render-scheduled-posts.mjs al publicar.
const OFERTAS = [
  { value: "personal", label: "Personal" },
  { value: "organizacional", label: "Organizacional" },
  { value: "comercial", label: "Comercial" },
  { value: "empresarial", label: "Empresarial" },
  { value: "profesionalizacion", label: "Profesionalización" },
];

// Universo real de proposals.format que el pipeline efectivamente produce y
// consume — no reel/story (legacy del CHECK constraint) ni video (ni
// siquiera permitido por proposals_format_check).
const CONVERTIBLE_FORMATS = [
  { value: "post", label: "Post Feed" },
  { value: "carrusel", label: "Carrusel" },
  { value: "historia", label: "Story" },
];

export interface ProposalDetail {
  id: string;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  hashtags: string[] | null;
  format: string | null;
  status: string | null;
  rejection_reason: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string | null;
  oferta: string | null;
  zernio_post_id: string | null;
  dialogue_sessions?: { topic: string | null } | null;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Formato datetime-local (sin segundos, hora local) a partir de un ISO real.
function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProposalDetailDialog({
  proposal,
  open,
  onOpenChange,
}: {
  proposal: ProposalDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const approveMutation = useApproveProposal();
  const rejectMutation = useRejectProposal();
  const cancelMutation = useCancelProposal();
  const scheduleMutation = useScheduleProposal();
  const editMutation = useEditProposal();
  const deleteMutation = useDeleteProposal();
  const rescheduleMutation = useRescheduleProposal();
  const convertMutation = useConvertProposalFormat();

  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({ title: "", hook: "", body: "", cta: "", hashtags: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleOferta, setScheduleOferta] = useState("");
  const [convertTo, setConvertTo] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!proposal) return;
    setIsEditing(false);
    setShowReject(false);
    setRejectReason("");
    setEditFields({
      title: proposal.title || "",
      hook: proposal.hook || "",
      body: proposal.body || "",
      cta: proposal.cta || "",
      hashtags: (proposal.hashtags || []).join(" "),
    });
    setScheduleDate(toDatetimeLocal(proposal.scheduled_at));
    setScheduleOferta(proposal.oferta || "");
    setConvertTo("");
  }, [proposal?.id]);

  if (!proposal) return null;

  const isPublished = proposal.status === "published";
  const isScheduled = proposal.status === "scheduled";
  const isPending = proposal.status === "pending";
  const isApproved = proposal.status === "approved";
  const isRejected = proposal.status === "rejected";

  const fullCopy = [proposal.hook, "", proposal.body, "", proposal.cta, "", ...(proposal.hashtags || [])]
    .filter((l) => l !== null && l !== undefined)
    .join("\n");

  function handleCopy() {
    navigator.clipboard.writeText(fullCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSaveEdit() {
    editMutation.mutate(
      {
        id: proposal.id,
        fields: {
          title: editFields.title,
          hook: editFields.hook,
          body: editFields.body,
          cta: editFields.cta,
          hashtags: editFields.hashtags.split(/\s+/).filter(Boolean),
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast({ title: "Propuesta actualizada" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleDelete() {
    deleteMutation.mutate(proposal.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        onOpenChange(false);
        toast({ title: "Propuesta borrada" });
      },
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function handleReschedule() {
    if (!scheduleDate) return;
    rescheduleMutation.mutate(
      { id: proposal.id, date: new Date(scheduleDate).toISOString() },
      {
        onSuccess: () => toast({ title: "Fecha actualizada" }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleSchedule() {
    if (!scheduleDate || !scheduleOferta) return;
    scheduleMutation.mutate(
      { id: proposal.id, date: new Date(scheduleDate).toISOString(), oferta: scheduleOferta },
      {
        onSuccess: () => toast({ title: "Propuesta programada" }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleConvert() {
    if (!convertTo || convertTo === proposal.format) return;
    convertMutation.mutate(
      { id: proposal.id, format: convertTo },
      {
        onSuccess: () => {
          toast({ title: `Formato cambiado a ${convertTo}` });
          setConvertTo("");
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleApprove() {
    approveMutation.mutate(proposal.id, {
      onSuccess: () => toast({ title: "Propuesta aprobada" }),
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function handleReject() {
    rejectMutation.mutate(
      { id: proposal.id, reason: rejectReason },
      {
        onSuccess: () => {
          setShowReject(false);
          setRejectReason("");
          toast({ title: "Propuesta rechazada" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleCancelScheduled() {
    cancelMutation.mutate(proposal.id, {
      onSuccess: () => toast({ title: "Publicación cancelada" }),
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{proposal.hook || proposal.title || "Sin título"}</DialogTitle>
            <DialogDescription>{proposal.dialogue_sessions?.topic || "Sin tema asociado"}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <PipelineBadge format={proposal.format} />
            <Badge variant="outline">{proposal.format || "post"}</Badge>
            <Badge variant={isPublished ? "default" : isRejected ? "destructive" : "secondary"}>
              {{
                pending: "Pendiente",
                approved: "Aprobada",
                rejected: "Rechazada",
                scheduled: "Programada",
                published: "Publicada",
              }[proposal.status || "pending"] || proposal.status}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            {isPublished && proposal.published_at
              ? `Publicada: ${fmtDate(proposal.published_at)}`
              : proposal.scheduled_at
              ? `Programada para: ${fmtDate(proposal.scheduled_at)}`
              : "Sin fecha de publicación ni programación"}
          </p>

          {isRejected && proposal.rejection_reason && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              Motivo de rechazo: {proposal.rejection_reason}
            </p>
          )}

          {isPublished && (
            <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Ya está publicada{proposal.zernio_post_id ? ` (Zernio: ${proposal.zernio_post_id})` : ""} — no se
                edita ni se borra desde acá para no desincronizar lo que ya salió en Instagram/Facebook. Para
                corregirla o bajarla, correr manualmente el workflow "Manage Post" en GitHub Actions (reintenta o
                despublica según la plataforma).
              </span>
            </div>
          )}

          {/* CONTENIDO — lectura o edición */}
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={editFields.title} onChange={(e) => setEditFields((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hook</Label>
                <Input value={editFields.hook} onChange={(e) => setEditFields((f) => ({ ...f, hook: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  rows={5}
                  value={editFields.body}
                  onChange={(e) => setEditFields((f) => ({ ...f, body: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CTA</Label>
                <Input value={editFields.cta} onChange={(e) => setEditFields((f) => ({ ...f, cta: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hashtags (separados por espacio)</Label>
                <Input
                  value={editFields.hashtags}
                  onChange={(e) => setEditFields((f) => ({ ...f, hashtags: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={editMutation.isPending}>
                  {editMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {proposal.hook && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">HOOK</p>
                  <p>{proposal.hook}</p>
                </div>
              )}
              {proposal.body && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">BODY</p>
                  <p className="whitespace-pre-wrap">{proposal.body}</p>
                </div>
              )}
              {proposal.cta && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">CTA</p>
                  <p>{proposal.cta}</p>
                </div>
              )}
              {proposal.hashtags && proposal.hashtags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">HASHTAGS</p>
                  <p className="text-muted-foreground">{proposal.hashtags.join(" ")}</p>
                </div>
              )}
            </div>
          )}

          {/* ACCIONES DE ESTADO */}
          {!isPublished && !isEditing && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {isPending && (
                <Button size="sm" onClick={handleApprove} disabled={approveMutation.isPending}>
                  {approveMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Aprobar
                </Button>
              )}
              {(isPending || isApproved) && (
                <Button size="sm" variant="outline" onClick={() => setShowReject((v) => !v)}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5 text-destructive" />
                  Rechazar
                </Button>
              )}
              {isScheduled && (
                <Button size="sm" variant="outline" onClick={handleCancelScheduled} disabled={cancelMutation.isPending}>
                  {cancelMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Cancelar publicación
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                Copiar
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Borrar
              </Button>
            </div>
          )}

          {showReject && !isPublished && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label>Razón del rechazo (opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Ej: No coincide con el tono de la marca..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>
                  Cancelar
                </Button>
                <Button size="sm" variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
                  {rejectMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Confirmar rechazo
                </Button>
              </div>
            </div>
          )}

          {/* AGENDAR (todavía sin fecha) / REPROGRAMAR (ya programada) */}
          {!isPublished && !isEditing && (isScheduled || isPending || isApproved) && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label className="flex items-center gap-1.5">
                {isScheduled ? <Repeat className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                {isScheduled ? "Reprogramar" : "Agendar"}
              </Label>
              <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              {!isScheduled && (
                <Select value={scheduleOferta} onValueChange={setScheduleOferta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Oferta (de dónde sale la foto)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {OFERTAS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex justify-end">
                {isScheduled ? (
                  <Button
                    size="sm"
                    onClick={handleReschedule}
                    disabled={!scheduleDate || rescheduleMutation.isPending}
                  >
                    {rescheduleMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Guardar nueva fecha
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSchedule}
                    disabled={!scheduleDate || !scheduleOferta || scheduleMutation.isPending}
                  >
                    {scheduleMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Programar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* CONVERTIR FORMATO */}
          {!isPublished && !isEditing && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label>Convertir formato</Label>
              <p className="text-[11px] text-muted-foreground">
                Solo cambia el campo format — no agenda ni desagenda la pieza por su cuenta.
              </p>
              <div className="flex gap-2">
                <Select value={convertTo} onValueChange={setConvertTo}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Elegir formato..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONVERTIBLE_FORMATS.filter((f) => f.value !== proposal.format).map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleConvert} disabled={!convertTo || convertMutation.isPending}>
                  {convertMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Convertir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Borrar esta propuesta?"
        description="No se puede deshacer. La propuesta se elimina por completo de Supabase."
        confirmText="Borrar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
```

### `src/pages/Dashboard.tsx`

```typescript
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText,
  MessageSquare,
  Sparkles,
  CalendarDays,
  Clock,
  Zap,
  ArrowRight,
  History,
  Info,
  ExternalLink,
  HelpCircle,
  Trophy,
} from "lucide-react";
import { useDocuments } from "@/hooks/useVault";
import { useDialogueSessions } from "@/hooks/useDialogue";
import { usePendingProposals, useProposals } from "@/hooks/useProposals";
import { useCalendarEvents, useAllMetrics } from "@/hooks/useMetrics";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Paleta de marca: Azul, Rojo, Amarillo (Manual de Marca Mejora Continua) +
// el 4to tono derivado de Azul (#6f93cf) del design system para el pie chart.
const COLORS = ["#1A3D84", "#E1061E", "#F7CC13", "#6f93cf"];

const RAW_BASE_URL = "https://raw.githubusercontent.com/pabloeckert/MejoraSM/main";
const HISTORIAL_URL = `${RAW_BASE_URL}/content/log/historial.json`;

// Metadata de status para la sección de últimas publicaciones — mismos 3
// status reales del pipeline autónomo (ver CLAUDE.md, overhaul de
// autonomía): published (Zernio ya lo publicó), scheduled (autoagendado,
// esperando el cron), pending (formato "historia", sin pipeline autónomo).
const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline"; dateLabel: string }> = {
  published: { label: "Publicada", variant: "default", dateLabel: "Publicada" },
  scheduled: { label: "Programada", variant: "secondary", dateLabel: "Programada para" },
  pending: { label: "Pendiente", variant: "outline", dateLabel: "Creada" },
};

// Filas [TEST/QA] sembradas para probar rule-engine (ver CLAUDE.md, "rule-
// engine — corrida real con datos de prueba"): las reales ya se limpiaron
// de la base el 2026-08-05, pero el filtro queda acá por si vuelven a
// aparecer — nunca se mezclan sin aviso en gráficos/KPIs.
const TEST_POST_PREFIX = "TEST-QA-";
const TEST_PROPOSAL_PREFIX = "7e57da7a-";

function isTestRow(m: MetricRow): boolean {
  return Boolean(
    m.post_id?.startsWith(TEST_POST_PREFIX) || m.proposals?.id?.startsWith(TEST_PROPOSAL_PREFIX)
  );
}

const nf = new Intl.NumberFormat("es-AR");
const fmt = (n: number) => nf.format(Math.round(n || 0));
const fmtPct = (n: number) => `${(Math.round((n || 0) * 100) / 100).toLocaleString("es-AR")}%`;
const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);
const avg = (nums: number[]) => (nums.length ? sum(nums) / nums.length : 0);

// KPIs del brief sin fuente de datos real hoy (Fase A de auditoría,
// 2026-08-07) — nunca se muestran en cero ni vacíos: se documenta acá por
// qué no hay dato, en vez de inventar uno.
const NO_SOURCE_KPIS = [
  {
    label: "Alcance orgánico vs. pago",
    reason: "Zernio Analytics devuelve un solo \"reach\" agregado — no distingue orgánico de pago.",
  },
  {
    label: "Tasa de finalización de video",
    reason: "El spec de Zernio Analytics no separa video views de full video views, solo un \"views\" genérico.",
  },
  {
    label: "Tiempo promedio de reproducción",
    reason: "No está en la respuesta de Zernio Analytics.",
  },
  {
    label: "Engagement por seguidor",
    reason: "No hay conteo de seguidores guardado en ningún lado — ni tabla propia ni en el endpoint de Zernio.",
  },
  {
    label: "Crecimiento neto de seguidores",
    reason: "Requeriría un snapshot histórico de seguidores que hoy no se persiste.",
  },
  {
    label: "Tasa de finalización de historias",
    reason: "Las Stories corren por un pipeline totalmente aparte que nunca escribe en esta base.",
  },
];

// Insights validados con datos reales (Data/analisis-redes-mejora-continua.md,
// agosto 2026) — semilla de arranque para el motor de insights con IA que
// viene en un commit futuro (no se construye acá). La capa de IA puede
// reemplazar o contrastar cada uno de estos; no se generan dinámicamente.
const SEED_INSIGHTS: { id: string; title: string; body: string; evidence: string }[] = [
  {
    id: "reel-retencion",
    title: "El Reel gana alcance, pero se pierde el mensaje",
    body: "Reel es el formato con mejor alcance (461 promedio) y mejor engagement (3.26% ER) de los tres, pero el tiempo promedio de reproducción es de apenas ~6.9 segundos y casi nadie lo mira completo.",
    evidence: "44 Reels analizados en el año — reach medio 461, ER medio 3.26%, ~6.9s de reproducción promedio, 0.81 full views promedio.",
  },
  {
    id: "hook-primera-persona",
    title: "El gancho directo en primera persona convierte mejor que cualquier Reel",
    body: "Los posts estáticos o carousel con gancho directo en primera persona sobre liderazgo y decisiones dieron el engagement más alto del período — el mejor conversor de audiencia ya instalada, aunque lleguen a menos gente nueva.",
    evidence: '"WhatsApp no es decoración..." ER 27.9% · "Equivocarse no te resta liderazgo..." ER 22.0%.',
  },
  {
    id: "testimonios-series",
    title: 'Testimonios con nombre y series "Parte 1/2/3" generan la señal más fuerte',
    body: "Concentran los guardados y compartidos más altos del año — en una cuenta B2B esa es la señal de intención más fuerte, más que el like.",
    evidence: "Serie sobre negociación: reach 520 / 436 / 237 en publicaciones consecutivas.",
  },
  {
    id: "geo-nea-paraguay",
    title: "La audiencia está concentrada en NEA + Paraguay, no dispersa a nivel nacional",
    body: "Posadas es la ciudad top en ambas redes, seguida de Encarnación y el resto del NEA argentino y Paraguay.",
    evidence: "Posadas 30.9% (Facebook) / 45.7% (Instagram) · Paraguay 19.7-20.2% del total.",
  },
  {
    id: "meseta-horaria",
    title: "No hay un horario mágico único — la audiencia está online de 11h a 23h todos los días",
    body: "Conviene testear franja de mediodía (lunes a miércoles) contra tarde-noche en vez de fijarse en un solo bloque horario.",
    evidence: "Meseta amplia 11h-23h todos los días, con pico puntual lunes 21h (IconSquare).",
  },
  {
    id: "facebook-sin-pulso",
    title: "Facebook va al mismo nivel de detalle que Instagram, pero hoy no tiene pulso propio",
    body: "El bajo rendimiento de Facebook es por falta de trabajo puesto ahí, no por el canal en sí — con el sistema funcionando se espera que se mueva.",
    evidence: "Ventana jul-ago 2026: 0 visitas, 0 interacciones y 0 clics en enlace en casi todos los días. ER del año 1.28% vs. 2.44% de Instagram.",
  },
];

type DetailContent = { title: string; description?: string; content: React.ReactNode };

interface ProposalJoin {
  id: string;
  title: string | null;
  hook: string | null;
  format: string | null;
  status: string | null;
  zernio_post_id: string | null;
  oferta: string | null;
  rendered_image_path: string | null;
}

interface MetricRow {
  id: string;
  proposal_id: string | null;
  post_id: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  impressions: number | null;
  clicks: number | null;
  engagement_rate: number | null;
  measured_at: string;
  proposals: ProposalJoin | null;
}

interface FlaggedMetricRow extends MetricRow {
  isTest: boolean;
}

// lucide-react no incluye íconos de marca (Instagram/Facebook) desde hace
// varias versiones — el badge distingue la red por texto + color, no por
// logo, para no depender de un ícono que no existe en el paquete.
function PlatformBadge({
  platform,
  status,
  url,
}: {
  platform: string;
  status: string;
  url: string | null;
}) {
  const ok = status === "published";
  const label = platform === "instagram" ? "Instagram" : platform === "facebook" ? "Facebook" : platform;
  const badge = (
    <Badge variant={ok ? "default" : "outline"} className="gap-1">
      {label} · {ok ? "publicado" : status}
    </Badge>
  );
  if (!url) return badge;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 hover:opacity-80"
    >
      {badge}
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </a>
  );
}

function KpiTile({
  label,
  value,
  sub,
  tooltip,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="flex h-full w-full flex-col gap-2.5 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-muted-foreground">{label}</span>
            <Info className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
          </div>
          <p className="text-[26px] font-medium leading-none text-primary [font-family:var(--font-display)]">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <DashboardContent />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

function DashboardContent() {
  const { data: documents } = useDocuments();
  const { data: sessions } = useDialogueSessions();
  const { data: proposals } = useProposals();
  const { data: pendingProposals } = usePendingProposals();
  const { data: calendarEvents } = useCalendarEvents();
  const { data: allMetrics } = useAllMetrics();

  const [showTestRows, setShowTestRows] = useState(false);
  const [detail, setDetail] = useState<DetailContent | null>(null);

  // Desglose por red: solo dato real disponible es status/URL por
  // plataforma, que vive en content/log/historial.json (no en Supabase) —
  // se trae vía raw.githubusercontent.com, mismo host que ya sirve las
  // imágenes publicadas. Si falla, el resto del Dashboard sigue funcionando.
  const { data: platformsByProposal, isError: platformsError } = useQuery({
    queryKey: ["historial-platforms"],
    queryFn: async () => {
      const res = await fetch(HISTORIAL_URL);
      if (!res.ok) throw new Error(`historial.json respondió ${res.status}`);
      const json = await res.json();
      const map = new Map<string, { platform: string; status: string; url: string | null }[]>();
      for (const post of json.posts ?? []) {
        if (post.proposalId) map.set(post.proposalId, post.platforms ?? []);
      }
      return map;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const metricsFlagged: FlaggedMetricRow[] = useMemo(
    () => (allMetrics ?? []).map((m: MetricRow) => ({ ...m, isTest: isTestRow(m) })),
    [allMetrics]
  );
  const testCount = metricsFlagged.filter((m) => m.isTest).length;
  const visibleMetrics = useMemo(
    () => (showTestRows ? metricsFlagged : metricsFlagged.filter((m) => !m.isTest)),
    [metricsFlagged, showTestRows]
  );

  const hasData = (documents?.length ?? 0) > 0 || (sessions?.length ?? 0) > 0;

  // ═══════════════════════════════════════
  // KPIs reales / calculables (Fase A de auditoría, 2026-08-07)
  // ═══════════════════════════════════════
  const reaches = visibleMetrics.map((m) => m.reach ?? 0);
  const impressions = visibleMetrics.map((m) => m.impressions ?? 0);
  const likes = visibleMetrics.map((m) => m.likes ?? 0);
  const comments = visibleMetrics.map((m) => m.comments ?? 0);
  const shares = visibleMetrics.map((m) => m.shares ?? 0);
  const saves = visibleMetrics.map((m) => m.saves ?? 0);
  const engagementTotal = sum(likes) + sum(comments) + sum(shares) + sum(saves);
  const withClicks = visibleMetrics.filter((m) => m.clicks !== null && m.clicks !== undefined);
  const clicksTotal = sum(withClicks.map((m) => m.clicks ?? 0));

  const engagementPerImpression = sum(impressions) > 0 ? (engagementTotal / sum(impressions)) * 100 : 0;
  const engagementPerReach = sum(reaches) > 0 ? (engagementTotal / sum(reaches)) * 100 : 0;

  function openKpiDetail(
    label: string,
    description: string,
    valueOf: (m: FlaggedMetricRow) => number,
    unit = ""
  ) {
    const rows = [...visibleMetrics].sort((a, b) => (valueOf(b) ?? 0) - (valueOf(a) ?? 0));
    setDetail({
      title: label,
      description,
      content: (
        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pieza</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Sin publicaciones con datos todavía.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[280px] truncate">
                      {r.proposals?.hook || r.proposals?.title || "Post sin título"}
                      {r.isTest && (
                        <Badge variant="outline" className="ml-1.5 border-[#F7CC13] text-[#c9a30d]">
                          PRUEBA
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {valueOf(r) === null || valueOf(r) === undefined ? "—" : `${fmt(valueOf(r))}${unit}`}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ),
    });
  }

  function openPieceDetail(m: FlaggedMetricRow) {
    const platforms = platformsByProposal?.get(m.proposals?.id) ?? [];
    setDetail({
      title: m.proposals?.hook || m.proposals?.title || "Pieza",
      description: m.proposals?.format ? `Formato: ${m.proposals.format}` : undefined,
      content: (
        <div className="space-y-3 text-sm">
          {m.proposals?.rendered_image_path && (
            <img
              src={`${RAW_BASE_URL}/${m.proposals.rendered_image_path}`}
              alt=""
              className="max-h-64 w-full rounded-md border border-border object-cover"
            />
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Alcance</p>
              <p className="font-semibold">{fmt(m.reach ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Impresiones</p>
              <p className="font-semibold">{fmt(m.impressions ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Engagement</p>
              <p className="font-semibold">{fmtPct(m.engagement_rate ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Guardados</p>
              <p className="font-semibold">{fmt(m.saves ?? 0)}</p>
            </div>
          </div>
          {platforms.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {platforms.map((p, i) => (
                <PlatformBadge key={i} platform={p.platform} status={p.status} url={p.url} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin desglose por red disponible para esta pieza.</p>
          )}
        </div>
      ),
    });
  }

  const kpiTiles = [
    {
      key: "reach",
      label: "Alcance por publicación",
      value: fmt(avg(reaches)),
      sub: `Total ${fmt(sum(reaches))} en ${visibleMetrics.length} publicaciones`,
      tooltip: "Reach real de Zernio Analytics: cuánta gente única vio cada pieza. Se muestra el promedio por publicación.",
      onClick: () =>
        openKpiDetail("Alcance por publicación", "Reach real por pieza (Zernio Analytics), de mayor a menor.", (m) => m.reach ?? 0),
    },
    {
      key: "impressions",
      label: "Impresiones por publicación",
      value: fmt(avg(impressions)),
      sub: `Total ${fmt(sum(impressions))} en ${visibleMetrics.length} publicaciones`,
      tooltip: "Frecuencia de exposición real (Zernio Analytics), distinta del alcance único. Promedio por publicación.",
      onClick: () =>
        openKpiDetail("Impresiones por publicación", "Impresiones reales por pieza, de mayor a menor.", (m) => m.impressions ?? 0),
    },
    {
      key: "eng-impression",
      label: "Engagement sobre impresión",
      value: fmtPct(engagementPerImpression),
      sub: "(likes+comentarios+shares+guardados) / impresiones",
      tooltip: "Columna generada en Postgres a partir de datos reales de Zernio — estándar de la plataforma para comparar histórico.",
      onClick: () =>
        openKpiDetail("Engagement sobre impresión", "Engagement rate real por pieza, de mayor a menor.", (m) => m.engagement_rate ?? 0, "%"),
    },
    {
      key: "eng-reach",
      label: "Engagement sobre alcance",
      value: fmtPct(engagementPerReach),
      sub: "Calculado sobre datos reales — más representativo de si el que vio, reaccionó",
      tooltip: "Calculable a partir de metrics: (likes+comentarios+shares+guardados) / reach. No viene precalculado en la base.",
      onClick: () =>
        openKpiDetail(
          "Engagement sobre alcance",
          "Por pieza: (likes+comentarios+shares+guardados) / reach, de mayor a menor.",
          (m) => (m.reach ? ((m.likes + m.comments + m.shares + m.saves) / m.reach) * 100 : 0),
          "%"
        ),
    },
    {
      key: "saves",
      label: "Guardados (saves)",
      value: fmt(sum(saves)),
      sub: "La señal de intención más fuerte en B2B, más que el like",
      tooltip: "Total real de guardados (Zernio Analytics) en las publicaciones visibles.",
      onClick: () => openKpiDetail("Guardados (saves)", "Guardados reales por pieza, de mayor a menor.", (m) => m.saves ?? 0),
    },
    {
      key: "shares",
      label: "Compartidos (shares)",
      value: fmt(sum(shares)),
      sub: "Validación social activa — alguien lo recomienda a un tercero",
      tooltip: "Total real de compartidos (Zernio Analytics) en las publicaciones visibles.",
      onClick: () => openKpiDetail("Compartidos (shares)", "Compartidos reales por pieza, de mayor a menor.", (m) => m.shares ?? 0),
    },
    {
      key: "comments",
      label: "Comentarios",
      value: fmt(sum(comments)),
      sub: "Proxy de conversación/consulta, más valioso que el like en servicios",
      tooltip: "Total real de comentarios (Zernio Analytics) en las publicaciones visibles.",
      onClick: () => openKpiDetail("Comentarios", "Comentarios reales por pieza, de mayor a menor.", (m) => m.comments ?? 0),
    },
    {
      key: "clicks",
      label: "Clics al enlace",
      value: withClicks.length > 0 ? fmt(clicksTotal) : "—",
      sub:
        withClicks.length > 0
          ? `${withClicks.length}/${visibleMetrics.length} publicaciones con datos de clics`
          : "Columna agregada el 2026-08-07 — esperando que el collector corra sobre estas piezas",
      tooltip:
        "Zernio Analytics ya lo devolvía; metrics-collector lo descartaba al mapear hasta el 2026-08-07. Filas previas a esa fecha quedan sin dato (no en cero) hasta la próxima recolección.",
      onClick: () =>
        openKpiDetail(
          "Clics al enlace",
          "Clics reales por pieza (solo las que ya tienen dato recolectado), de mayor a menor.",
          (m) => m.clicks,
          ""
        ),
    },
  ];

  // Rendimiento por formato (2do KPI calculable: alcance/engagement
  // promedio por formato) — se muestra como tabla, no como tile único,
  // porque es inherentemente una comparación entre formatos.
  const formatPerf = useMemo(() => {
    const groups: Record<string, FlaggedMetricRow[]> = {};
    for (const m of visibleMetrics) {
      const f = m.proposals?.format || "post";
      (groups[f] ??= []).push(m);
    }
    return Object.entries(groups)
      .map(([format, items]) => ({
        format,
        count: items.length,
        avgReach: avg(items.map((m) => m.reach ?? 0)),
        avgEngagement: avg(items.map((m) => m.engagement_rate ?? 0)),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }, [visibleMetrics]);

  const ranking = useMemo(
    () => [...visibleMetrics].sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0)).slice(0, 5),
    [visibleMetrics]
  );

  const publishedWithPlatforms = visibleMetrics.filter((m) => m.proposals?.status === "published");

  // Chart de engagement por post (real, no mock) — antes mezclaba filas
  // [TEST/QA] sin avisar (bug señalado en el brief); ahora sale de
  // visibleMetrics (ya respeta el toggle) y marca visualmente las de prueba.
  const engagementData = [...visibleMetrics]
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
    .slice(-7)
    .map((m) => ({
      name: (m.proposals?.hook || m.proposals?.title || "Post").slice(0, 15),
      engagement: Math.round((m.engagement_rate || 0) * 100) / 100,
      isTest: m.isTest,
    }));

  const metricCards = [
    {
      label: "Documentos en Bóveda",
      value: String(documents?.length ?? 0),
      sub: "Subí fotos para empezar a nutrir Stories.",
      href: "/boveda",
      icon: FileText,
      accentClassName: "text-primary",
    },
    {
      label: "Diálogos creados",
      value: String(sessions?.length ?? 0),
      sub: "Se cuentan cuando abrís una conversación en Mesa de Diálogo.",
      href: "/mesa",
      icon: MessageSquare,
      accentClassName: "text-secondary",
    },
    {
      label: "Contenidos generados",
      value: String(proposals?.length ?? 0),
      sub: "Últimos 30 días",
      href: "/laboratorio",
      icon: Sparkles,
      accentClassName: "text-[#c9a30d]",
    },
    {
      label: "Publicaciones programadas",
      value: String(calendarEvents?.length ?? 0),
      sub: "Vía Zernio, próximos 7 días",
      href: "/calendario",
      icon: Clock,
      accentClassName: "text-primary",
    },
  ];

  const formatCounts: Record<string, number> = {};
  proposals?.forEach((p: any) => {
    const format = p.format || "post";
    formatCounts[format] = (formatCounts[format] || 0) + 1;
  });
  const formatData = Object.entries(formatCounts).map(([name, value]) => ({ name, value }));

  const recentActivity = (proposals || [])
    .filter((p: any) => p.status === "published" || p.status === "scheduled" || p.status === "pending")
    .map((p: any) => ({
      ...p,
      displayDate: p.published_at || p.scheduled_at || p.created_at,
    }))
    .sort((a: any, b: any) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime())
    .slice(0, 5);

  const lastSync = visibleMetrics.reduce<string | null>((latest, m) => {
    if (!m.measured_at) return latest;
    return !latest || new Date(m.measured_at) > new Date(latest) ? m.measured_at : latest;
  }, null);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-medium leading-tight text-primary">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Centro de control del Estratega Digital Autónomo
            {lastSync && (
              <>
                {" "}
                · última métrica sincronizada:{" "}
                {new Date(lastSync).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2">
          <Switch id="show-test-rows" checked={showTestRows} onCheckedChange={setShowTestRows} />
          <label htmlFor="show-test-rows" className="cursor-pointer text-xs font-medium">
            Mostrar filas de prueba
            {testCount > 0 && (
              <span className="ml-1.5 text-muted-foreground">
                ({testCount} excluida{testCount === 1 ? "" : "s"} por defecto)
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Quick start banner for new users */}
      {!hasData && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Empezá subiendo documentos de marca</p>
              <p className="text-sm text-muted-foreground">
                Los agentes necesitan contexto sobre tu marca para generar contenido estratégico.
              </p>
            </div>
            <Link to="/boveda">
              <Button>
                Subir documentos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Resumen operativo del sistema */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((m) => (
          <Link key={m.label} to={m.href}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="flex flex-col gap-2.5 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-muted-foreground">{m.label}</span>
                  <m.icon className={cn("h-4 w-4 flex-shrink-0", m.accentClassName)} />
                </div>
                <p className="text-[34px] font-medium leading-none text-primary [font-family:var(--font-display)]">
                  {m.value}
                </p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* KPIs reales de rendimiento social (Fase A, 2026-08-07) */}
      <div>
        <h2 className="mb-3 text-[17px] font-medium">Rendimiento real (Instagram + Facebook)</h2>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {kpiTiles.map((t) => (
            <KpiTile key={t.key} label={t.label} value={t.value} sub={t.sub} tooltip={t.tooltip} onClick={t.onClick} />
          ))}
        </div>
      </div>

      {/* KPIs sin fuente conectada */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px] font-medium">KPIs sin fuente de datos conectada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Definidos en el brief de rediseño, pero ninguna fuente real los provee hoy — no se inventan, se documentan.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {NO_SOURCE_KPIS.map((k) => (
              <div key={k.label} className="flex items-start gap-2.5 text-[13px]">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <span className="font-medium">{k.label}</span>
                  <span className="text-muted-foreground"> — {k.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumen por red */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px] font-medium">Resumen por red</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Total combinado (Instagram + Facebook)</p>
            <p className="text-2xl font-medium text-primary [font-family:var(--font-display)]">
              {visibleMetrics.length} pieza{visibleMetrics.length === 1 ? "" : "s"} con métricas reales
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Zernio Analytics devuelve un agregado único por post — no hay desglose de alcance/likes/etc. entre
              Instagram y Facebook cuando la misma pieza sale en ambas redes. Lo que sí es real por red es el status
              de publicación y el link (abajo).
            </span>
          </div>
          {platformsError && (
            <p className="text-xs text-destructive">
              No se pudo traer el desglose por red ahora mismo (historial.json). El resto del Dashboard sigue funcionando normal.
            </p>
          )}
          {publishedWithPlatforms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay piezas publicadas con métricas.</p>
          ) : (
            <div className="flex flex-col">
              {publishedWithPlatforms.slice(0, 6).map((m) => {
                const platforms = platformsByProposal?.get(m.proposals?.id) ?? [];
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => openPieceDetail(m)}
                    className="flex flex-wrap items-center gap-2 border-b border-border py-2.5 text-left last:border-0 hover:bg-muted/40"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {m.proposals?.hook || m.proposals?.title}
                    </span>
                    {platforms.length > 0 ? (
                      platforms.map((p, i) => <PlatformBadge key={i} platform={p.platform} status={p.status} url={p.url} />)
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin desglose por red</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[17px] font-medium">Engagement por post</CardTitle>
            {engagementData.length > 0 && (
              <span className="text-xs text-muted-foreground">Últimos {engagementData.length} posts</span>
            )}
          </CardHeader>
          <CardContent>
            {engagementData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="engagement" radius={[4, 4, 0, 0]} name="Engagement %">
                    {engagementData.map((d, i) => (
                      <Cell key={i} fill={d.isTest ? "#F7CC13" : "#1A3D84"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center px-6 text-center">
                <p className="text-[13.5px] font-semibold">
                  Todavía no hay publicaciones con datos de engagement.
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Se completa solo cuando Zernio confirma la primera publicación en Instagram o Facebook — no hay nada más que hacer acá.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[17px] font-medium">Distribución por formato</CardTitle>
          </CardHeader>
          <CardContent>
            {formatData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={formatData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={72}
                    fill="#1A3D84"
                    dataKey="value"
                  >
                    {formatData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center px-6 text-center">
                <p className="text-[13.5px] font-semibold">Sin piezas generadas todavía.</p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Subí material a la Bóveda o armá una pieza para empezar a ver la mezcla de formatos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rendimiento por formato (2do KPI calculable) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px] font-medium">Alcance y engagement promedio por formato</CardTitle>
        </CardHeader>
        <CardContent>
          {formatPerf.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin métricas todavía para comparar formatos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formato</TableHead>
                  <TableHead className="text-right">Piezas</TableHead>
                  <TableHead className="text-right">Alcance promedio</TableHead>
                  <TableHead className="text-right">Engagement promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formatPerf.map((f) => (
                  <TableRow key={f.format}>
                    <TableCell className="font-medium capitalize">{f.format}</TableCell>
                    <TableCell className="text-right">{f.count}</TableCell>
                    <TableCell className="text-right">{fmt(f.avgReach)}</TableCell>
                    <TableCell className="text-right">{fmtPct(f.avgEngagement)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ranking de piezas más exitosas */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <Trophy className="h-4 w-4 text-[#c9a30d]" />
          <CardTitle className="text-[17px] font-medium">Ranking de piezas más exitosas</CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin piezas con métricas todavía.</p>
          ) : (
            <div className="flex flex-col">
              {ranking.map((m, i) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => openPieceDetail(m)}
                  className="flex items-center gap-3.5 border-b border-border py-3 text-left last:border-0 hover:bg-muted/40"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  {m.proposals?.rendered_image_path ? (
                    <img
                      src={`${RAW_BASE_URL}/${m.proposals.rendered_image_path}`}
                      alt=""
                      className="h-10 w-10 flex-shrink-0 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[13.5px] font-semibold">
                        {m.proposals?.hook || m.proposals?.title || "Post sin título"}
                      </p>
                      {m.isTest && (
                        <Badge variant="outline" className="flex-shrink-0 border-[#F7CC13] text-[#c9a30d]">
                          PRUEBA
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11.5px] text-muted-foreground">
                      {m.proposals?.format || "post"} · alcance {fmt(m.reach ?? 0)}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">
                    {fmtPct(m.engagement_rate ?? 0)}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights semilla */}
      <div>
        <h2 className="mb-1 text-[17px] font-medium">Insights</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Análisis validado con datos reales (Meta Business Suite + IconSquare, agosto 2026) — semilla de arranque
          hasta que el motor de insights con IA se conecte.
        </p>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {SEED_INSIGHTS.map((insight) => (
            <Card key={insight.id}>
              <CardContent className="flex h-full flex-col gap-2 p-4">
                <Badge variant="secondary" className="w-fit text-[10px]">
                  Validado con datos reales
                </Badge>
                <p className="text-[13.5px] font-semibold leading-snug">{insight.title}</p>
                <p className="flex-1 text-[12.5px] text-muted-foreground">{insight.body}</p>
                <p className="border-t border-border pt-2 text-[11px] text-muted-foreground/80">{insight.evidence}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pending approvals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[17px] font-medium">Aprobaciones pendientes</CardTitle>
          {pendingProposals && pendingProposals.length > 0 && (
            <Badge variant="secondary">{pendingProposals.length}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {!pendingProposals || pendingProposals.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Clock className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay contenido pendiente de aprobación.
              </p>
              {hasData && (
                <Link to="/mesa" className="mt-3">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Crear nueva sesión
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {pendingProposals.slice(0, 5).map((p: any) => (
                <Link
                  key={p.id}
                  to="/laboratorio"
                  className="-mx-1 flex items-center gap-3.5 rounded-md border-b border-border px-1 py-3 transition-colors last:border-0 hover:bg-muted/40"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{p.title || "Sin título"}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {p.dialogue_sessions?.topic || "Sin tema"}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">{p.format || "post"}</Badge>
                </Link>
              ))}
              {pendingProposals.length > 5 && (
                <Link to="/laboratorio" className="mt-2 text-center text-sm font-medium text-primary hover:underline">
                  Ver todas ({pendingProposals.length})
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Últimas publicaciones */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px] font-medium">Últimas publicaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <History className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Todavía no hay propuestas publicadas, programadas ni pendientes.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {recentActivity.map((p: any) => {
                const statusMeta = STATUS_META[p.status] ?? STATUS_META.pending;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3.5 border-b border-border py-3 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">
                        {p.hook || p.title || p.dialogue_sessions?.topic || "Sin título"}
                      </p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {statusMeta.dateLabel}:{" "}
                        {new Date(p.displayDate).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      {p.format || "post"}
                    </Badge>
                    <Badge variant={statusMeta.variant} className="flex-shrink-0">
                      {statusMeta.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px] font-medium">Calendario de contenido</CardTitle>
        </CardHeader>
        <CardContent>
          {!calendarEvents || calendarEvents.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay publicaciones programadas.
              </p>
              <Link to="/calendario" className="mt-3">
                <Button variant="outline" size="sm">
                  <CalendarDays className="mr-2 h-3 w-3" />
                  Ir al calendario
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col">
              {calendarEvents.slice(0, 7).map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3.5 border-b border-border py-3 last:border-0"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{e.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">{e.format}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
            {detail?.description && <DialogDescription>{detail.description}</DialogDescription>}
          </DialogHeader>
          {detail?.content}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### `src/pages/Propuestas.tsx`

```typescript
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  CheckCircle,
  Clock,
  Loader2,
  Calendar,
  Copy,
  Check,
  FileText,
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useProposals, usePendingProposals, useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from "@/hooks/useProposals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/components/ui/use-toast";
import { PipelineBadge } from "@/components/PipelineBadge";
import { ProposalDetailDialog, type ProposalDetail } from "@/components/ProposalDetailDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Filtro por tipo de posteo, sobre el campo proposals.format. "historia" es
// el valor real que usa el código (extractProposal en orchestrator/index.ts)
// para lo que acá se etiqueta "Story". "video" todavía no lo genera nada
// (ni orchestrator ni el pipeline de publicación) — el tab existe igual,
// a propósito, para no ocultar la categoría aunque hoy esté vacía. No es
// convertible (proposals_format_check ni siquiera lo permite).
const FORMATOS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "post", label: "Post Feed" },
  { value: "carrusel", label: "Carrusel" },
  { value: "historia", label: "Story" },
  { value: "video", label: "Video" },
];

const TEMPLATE_FORMATS = FORMATOS.filter((f) => f.value !== "all" && f.value !== "video");

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  approved: { label: "Aprobada", variant: "default" },
  rejected: { label: "Rechazada", variant: "destructive" },
  scheduled: { label: "Programada", variant: "outline" },
  published: { label: "Publicada", variant: "default" },
};

export default function Propuestas() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <PropuestasContent />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

function PropuestasContent() {
  const { data: allProposals, isLoading } = useProposals();
  const { data: pendingProposals } = usePendingProposals();

  // Se guarda el id, no el objeto — así el modal siempre muestra el estado
  // real después de aprobar/reprogramar/convertir sin cerrarlo (antes
  // quedaba mostrando el snapshot viejo de cuando se abrió, aunque la
  // mutación ya hubiera pegado en Supabase).
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<string>("all");

  const selectedProposal: ProposalDetail | null = selectedProposalId
    ? (allProposals || []).find((p: ProposalDetail) => p.id === selectedProposalId) ?? null
    : null;

  const handleCopy = (proposal: ProposalDetail) => {
    const text = [proposal.hook, "", proposal.body, "", proposal.cta, "", ...(proposal.hashtags || [])]
      .filter((l) => l !== null && l !== undefined)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedId(proposal.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const matchesFormat = (p: ProposalDetail) => formatFilter === "all" || p.format === formatFilter;
  const filteredProposals: ProposalDetail[] = (allProposals || []).filter(matchesFormat);
  const filteredPending: ProposalDetail[] = (pendingProposals || []).filter(matchesFormat);

  const approved = filteredProposals.filter((p) => p.status === "approved");
  const scheduled = filteredProposals.filter((p) => p.status === "scheduled");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Propuestas de Contenido</h1>
        <p className="mt-1 text-muted-foreground">
          Los posts y carruseles de feed se agendan y publican solos (mirá el badge "Se publica solo" en cada
          pieza). Esta pantalla es el monitor: click en cualquier pieza abre el detalle, con todas las acciones
          reales — aprobar, rechazar, agendar, editar, borrar o convertir formato.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FORMATOS.map((f) => (
          <Button
            key={f.value}
            type="button"
            size="sm"
            variant={formatFilter === f.value ? "default" : "outline"}
            onClick={() => setFormatFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pendientes
            {filteredPending.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {filteredPending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="h-3.5 w-3.5" />
            Aprobadas
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar className="h-3.5 w-3.5" />
            Programadas
          </TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPending.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              text={
                formatFilter === "all"
                  ? "No hay propuestas pendientes"
                  : `No hay propuestas pendientes de tipo "${FORMATOS.find((f) => f.value === formatFilter)?.label}"`
              }
              sub="Cuando los agentes generen contenido, aparecerá acá para tu aprobación."
            />
          ) : (
            <div className="space-y-3">
              {filteredPending.map((p) => (
                <ProposalListItem
                  key={p.id}
                  proposal={p}
                  onOpen={() => setSelectedProposalId(p.id)}
                  onCopy={() => handleCopy(p)}
                  copied={copiedId === p.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {approved.length === 0 ? (
            <EmptyState icon={FileText} text="No hay propuestas aprobadas aún." />
          ) : (
            <div className="space-y-3">
              {approved.map((p) => (
                <ProposalListItem
                  key={p.id}
                  proposal={p}
                  onOpen={() => setSelectedProposalId(p.id)}
                  onCopy={() => handleCopy(p)}
                  copied={copiedId === p.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <p className="mb-4 text-xs text-muted-foreground">
            Los posts y carruseles se agendan solos apenas los aprueba el Crítico en Mesa de Diálogo. Abrí la
            pieza para reprogramarla o cancelarla antes de que salga.
          </p>
          {scheduled.length === 0 ? (
            <EmptyState icon={Calendar} text="No hay propuestas programadas." />
          ) : (
            <div className="space-y-3">
              {scheduled.map((p) => (
                <ProposalListItem
                  key={p.id}
                  proposal={p}
                  onOpen={() => setSelectedProposalId(p.id)}
                  onCopy={() => handleCopy(p)}
                  copied={copiedId === p.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {filteredProposals.length === 0 ? (
            <EmptyState
              icon={FileText}
              text={
                formatFilter === "all"
                  ? "No hay propuestas todavía."
                  : `No hay propuestas de tipo "${FORMATOS.find((f) => f.value === formatFilter)?.label}" todavía.`
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredProposals.map((p) => (
                <ProposalListItem
                  key={p.id}
                  proposal={p}
                  onOpen={() => setSelectedProposalId(p.id)}
                  onCopy={() => handleCopy(p)}
                  copied={copiedId === p.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesSection />
        </TabsContent>
      </Tabs>

      <ProposalDetailDialog
        proposal={selectedProposal}
        open={!!selectedProposal}
        onOpenChange={(open) => !open && setSelectedProposalId(null)}
      />
    </div>
  );
}

function EmptyState({ icon: Icon, text, sub }: { icon: typeof FileText; text: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12">
        <Icon className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{text}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground/70">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ProposalListItem({
  proposal,
  onOpen,
  onCopy,
  copied,
}: {
  proposal: ProposalDetail;
  onOpen: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const status = STATUS_META[proposal.status || "pending"] || STATUS_META.pending;

  return (
    <Card className="transition-colors hover:bg-muted/40">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <PipelineBadge format={proposal.format} />
            <Badge variant="outline" className="text-[10px]">
              {proposal.format || "post"}
            </Badge>
            <Badge variant={status.variant} className="text-[10px]">
              {status.label}
            </Badge>
          </div>
          <p className="truncate text-sm font-semibold">{proposal.hook || proposal.title || "Sin título"}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{proposal.body}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {proposal.scheduled_at
              ? `Programada: ${new Date(proposal.scheduled_at).toLocaleDateString("es-AR")}`
              : proposal.created_at
              ? `Creada: ${new Date(proposal.created_at).toLocaleDateString("es-AR")}`
              : null}
          </p>
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════
// PLANTILLAS — solo estructura (listar/crear/editar), sin motor de render
// (ver migración 010_templates.sql). Se conecta a futuro con
// templates/post-template.html y templates/story-template.html.
// ═══════════════════════════════════════

interface TemplateRecord {
  id: string;
  name: string;
  format: string;
  notes: string | null;
}

function TemplatesSection() {
  const { data: templates, isLoading } = useTemplates();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();

  const [editing, setEditing] = useState<TemplateRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TemplateRecord | null>(null);
  const [form, setForm] = useState({ name: "", format: "post", notes: "" });

  const openCreate = () => {
    setForm({ name: "", format: "post", notes: "" });
    setEditing(null);
    setIsCreating(true);
  };

  const openEdit = (t: TemplateRecord) => {
    setForm({ name: t.name, format: t.format, notes: t.notes || "" });
    setEditing(t);
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, fields: form },
        {
          onSuccess: () => {
            setIsCreating(false);
            toast({ title: "Plantilla actualizada" });
          },
          onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          setIsCreating(false);
          toast({ title: "Plantilla creada" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast({ title: "Plantilla borrada" });
      },
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Estructura de plantillas reutilizables — todavía sin motor de render (eso viene después). Real, no de
          mentira: se guardan en Supabase.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nueva plantilla
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState icon={LayoutTemplate} text="Sin plantillas todavía." sub="Creá la primera con el botón de arriba." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t: TemplateRecord) => (
            <Card key={t.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {t.format}
                    </Badge>
                  </div>
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  {t.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <Select value={form.format} onValueChange={(v) => setForm((f) => ({ ...f, format: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea
                rows={3}
                placeholder="Dirección visual, cuándo usarla, etc."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                {editing ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="¿Borrar esta plantilla?"
        description="No se puede deshacer."
        confirmText="Borrar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
```

### `src/pages/Calendario.tsx`

```typescript
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalendarDays, Loader2, ChevronLeft, ChevronRight, Clock, Zap, Hand } from "lucide-react";
import { useProposals, useRescheduleProposal } from "@/hooks/useProposals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { isAutonomousFormat } from "@/components/PipelineBadge";
import { ProposalDetailDialog, type ProposalDetail } from "@/components/ProposalDetailDialog";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Mismo tratamiento que el Dashboard (rediseño 2026-08-07): las filas
// [TEST/QA] sembradas para probar rule-engine ya se limpiaron de la base
// (2026-08-05), pero el filtro queda por si vuelven a aparecer — nunca
// mezcladas sin aviso.
const TEST_PROPOSAL_PREFIX = "7e57da7a-";
function isTestProposal(p: ProposalDetail): boolean {
  return Boolean(p.id?.startsWith(TEST_PROPOSAL_PREFIX));
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function getWeekStart(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function Calendario() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <CalendarioContent />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

function CalendarioContent() {
  const { data: proposals, isLoading } = useProposals();
  const rescheduleMutation = useRescheduleProposal();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  // Se guarda el id, no el objeto — mismo motivo que en Propuestas.tsx: el
  // modal tiene que reflejar el estado real después de reprogramar/aprobar/
  // convertir sin cerrarlo, no el snapshot de cuando se abrió.
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [showTestRows, setShowTestRows] = useState(false);
  const [draggedProposal, setDraggedProposal] = useState<ProposalDetail | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const selectedProposal: ProposalDetail | null = selectedProposalId
    ? (proposals || []).find((p: ProposalDetail) => p.id === selectedProposalId) ?? null
    : null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const weekStart = getWeekStart(currentDate);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevWeek = () => setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
  const nextWeek = () => setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));

  const monthName = currentDate.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const weekLabel = `${weekStart.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;

  // Este calendario sigue siendo la fuente real: proposals.scheduled_at.
  // Antes existía un "Nuevo evento" que escribía en calendar_events sin
  // relación con lo que se publicaba de verdad — se saca esa promesa falsa
  // en vez de mantenerla. Agendar/cancelar/editar de verdad vive acá mismo
  // ahora (modal compartido con Propuestas), en vez de en otra pantalla.
  const allEvents: (ProposalDetail & { isTest: boolean })[] = useMemo(
    () =>
      (proposals || [])
        .filter((p: ProposalDetail) => (p.status === "scheduled" || p.status === "published") && p.scheduled_at)
        .map((p: ProposalDetail) => ({ ...p, isTest: isTestProposal(p) })),
    [proposals]
  );
  const testCount = allEvents.filter((e) => e.isTest).length;
  const events = showTestRows ? allEvents : allEvents.filter((e) => !e.isTest);

  const eventsByDay: Record<string, (ProposalDetail & { isTest: boolean })[]> = {};
  events.forEach((p) => {
    const d = new Date(p.scheduled_at!);
    const key = dayKey(d);
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(p);
  });

  const now = new Date();
  const nextWeekLimit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = events
    .filter((p) => {
      const d = new Date(p.scheduled_at!);
      return d >= now && d <= nextWeekLimit;
    })
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  function handleDrop(targetDate: Date) {
    setDragOverKey(null);
    if (!draggedProposal || !draggedProposal.scheduled_at) return;
    if (draggedProposal.status !== "scheduled") return; // solo lo programado se puede reprogramar arrastrando
    const original = new Date(draggedProposal.scheduled_at);
    const newDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      original.getHours(),
      original.getMinutes()
    );
    if (dayKey(newDate) === dayKey(original)) {
      setDraggedProposal(null);
      return;
    }
    const proposalId = draggedProposal.id;
    rescheduleMutation.mutate(
      { id: proposalId, date: newDate.toISOString() },
      {
        onSuccess: () =>
          toast({
            title: "Fecha actualizada",
            description: `Movida al ${newDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`,
          }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
    setDraggedProposal(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario Editorial</h1>
          <p className="mt-1 text-muted-foreground">
            Fuente real: lo que se agenda y publica solo. Click en una pieza para ver el detalle completo o
            arrastrala a otro día para reprogramarla. Para cancelar algo antes de que salga, también se hace
            acá mismo, desde el detalle.
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2">
          <Switch id="show-test-rows-cal" checked={showTestRows} onCheckedChange={setShowTestRows} />
          <label htmlFor="show-test-rows-cal" className="cursor-pointer text-xs font-medium">
            Mostrar filas de prueba
            {testCount > 0 && <span className="ml-1.5 text-muted-foreground">({testCount} excluidas)</span>}
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={viewMode === "month" ? "default" : "outline"}
          onClick={() => setViewMode("month")}
        >
          Mensual
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewMode === "week" ? "default" : "outline"}
          onClick={() => setViewMode("week")}
        >
          Semanal
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <Button variant="ghost" size="icon" onClick={viewMode === "month" ? prevMonth : prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base capitalize">{viewMode === "month" ? monthName : weekLabel}</CardTitle>
            <Button variant="ghost" size="icon" onClick={viewMode === "month" ? nextMonth : nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : viewMode === "month" ? (
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month, day);
                  const key = dayKey(date);
                  const isToday =
                    day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                  return (
                    <DayCell
                      key={day}
                      date={date}
                      label={String(day)}
                      compact
                      events={eventsByDay[key] || []}
                      isToday={isToday}
                      isDragOver={dragOverKey === key}
                      onDragEnter={() => setDragOverKey(key)}
                      onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                      onDrop={() => handleDrop(date)}
                      onSelect={(p) => setSelectedProposalId(p.id)}
                      onDragStartEvent={setDraggedProposal}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
                  const key = dayKey(date);
                  const isToday = dayKey(date) === dayKey(now);
                  return (
                    <div key={key}>
                      <p className="mb-1.5 text-center text-xs font-medium text-muted-foreground">
                        {WEEKDAYS[i]} <span className={isToday ? "text-primary" : ""}>{date.getDate()}</span>
                      </p>
                      <DayCell
                        date={date}
                        label=""
                        compact={false}
                        events={eventsByDay[key] || []}
                        isToday={isToday}
                        isDragOver={dragOverKey === key}
                        onDragEnter={() => setDragOverKey(key)}
                        onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                        onDrop={() => handleDrop(date)}
                        onSelect={(p) => setSelectedProposalId(p.id)}
                        onDragStartEvent={setDraggedProposal}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Sin publicaciones agendadas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProposalId(p.id)}
                    className="flex w-full items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">{p.hook || p.title || "Sin título"}</p>
                        {p.isTest && (
                          <Badge variant="outline" className="shrink-0 border-[#F7CC13] text-[10px] text-[#c9a30d]">
                            PRUEBA
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.scheduled_at!).toLocaleDateString("es-AR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {p.format || "post"}
                        </Badge>
                        {isAutonomousFormat(p.format) ? (
                          <Zap className="h-3 w-3 text-primary" />
                        ) : (
                          <Hand className="h-3 w-3 text-[#c9a30d]" />
                        )}
                        <Badge variant={p.status === "published" ? "default" : "secondary"} className="text-[10px]">
                          {p.status === "published" ? "Publicada" : "Programada"}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ProposalDetailDialog
        proposal={selectedProposal}
        open={!!selectedProposal}
        onOpenChange={(open) => !open && setSelectedProposalId(null)}
      />
    </div>
  );
}

function DayCell({
  date,
  label,
  compact,
  events,
  isToday,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onSelect,
  onDragStartEvent,
}: {
  date: Date;
  label: string;
  compact: boolean;
  events: (ProposalDetail & { isTest: boolean })[];
  isToday: boolean;
  isDragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onSelect: (p: ProposalDetail) => void;
  onDragStartEvent: (p: ProposalDetail) => void;
}) {
  const maxVisible = compact ? 2 : 6;
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "rounded-lg border p-1.5 transition-colors",
        compact ? "min-h-[80px]" : "min-h-[220px]",
        isToday ? "border-primary bg-primary/5" : "border-transparent",
        isDragOver && "border-primary bg-primary/10"
      )}
    >
      {label && (
        <p className={cn("mb-1 text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{label}</p>
      )}
      {events.slice(0, maxVisible).map((p) => {
        const draggable = p.status === "scheduled";
        return (
          <button
            key={p.id}
            type="button"
            draggable={draggable}
            onDragStart={() => draggable && onDragStartEvent(p)}
            onClick={() => onSelect(p)}
            title={p.hook || p.title || undefined}
            className={cn(
              "mb-0.5 flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] font-medium transition-colors hover:opacity-80",
              draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
              p.status === "published" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
              p.isTest && "outline outline-1 outline-[#F7CC13]"
            )}
          >
            {isAutonomousFormat(p.format) ? (
              <Zap className="h-2.5 w-2.5 flex-shrink-0" />
            ) : (
              <Hand className="h-2.5 w-2.5 flex-shrink-0" />
            )}
            <span className="truncate">{p.hook || p.title || "Sin título"}</span>
          </button>
        );
      })}
      {events.length > maxVisible && (
        <p className="text-[10px] text-muted-foreground">+{events.length - maxVisible} más</p>
      )}
    </div>
  );
}
```

---

## Parte 5 — Plan estratégico 2026, gobierno del proyecto y Fase 0

Se pidió un resumen del proyecto entero en lenguaje simple, en un párrafo, terminando con una definición sencilla. La respuesta describió MejoraSM como una máquina que le hace a Mejora Continua el trabajo diario de generar y publicar contenido en Instagram y Facebook sin que nadie tenga que sentarse todos los días a escribir un posteo: se suben fotos a una carpeta, tres agentes de inteligencia artificial se ponen de acuerdo sobre qué decir, el sistema arma la pieza con la identidad de marca, la publica sola en el horario que corresponde, y después mide cómo le fue de verdad para aprender qué funciona mejor — el control humano queda para después, no para antes de cada publicación. La definición simple: un empleado de redes sociales robot que piensa, escribe, publica y aprende solo. Se agregó, a pedido, que ese empleado además tiene un panel de control donde se mira en tiempo real tanto el detalle de cada pieza como el resumen general de cómo le está yendo a la marca, y desde donde se puede meter mano y corregir cuando se quiera — aclarando que esto último no es una promesa a futuro, ya está construido: el Dashboard muestra alcance, engagement, ranking de piezas y comparación entre formatos en tiempo real, con detalle de cada pieza a un click, y en Propuestas y Calendario ya existe la posibilidad real de editar el texto, cambiar la fecha, cambiar el formato o borrar una pieza antes de que salga publicada.

Se compartieron después, como adjuntos, dos versiones de un plan estratégico para MejoraSM generado por una herramienta externa (Lovable) — un documento largo con diagnóstico, seis ejes de mejora, un plan de ejecución de un día dividido en bloques, ideas disruptivas y una nota aclarando que el proyecto de Lovable estaba vacío y todo el código real vivía en el repositorio de GitHub. El pedido fue revisar ese plan con criterio propio y aprovechando el conocimiento actualizado a esa fecha, y proponer un plan estratégico propio para mejorar, actualizar y optimizar el proyecto, además de ideas disruptivas para llevarlo al siguiente nivel — dejando explícito que quien manda en la ejecución es Claude Code, no Lovable, que el plan de Lovable era solo un insumo, y que el proyecto tenía que seguir viviendo de forma independiente de Lovable. Se pidió una respuesta de una sola frase confirmando que se había entendido esto antes de avanzar, y que cualquier duda real se preguntara antes, no después.

La respuesta confirmó el entendimiento: el plan de Lovable era un insumo de referencia, no la autoridad; correspondía revisarlo con criterio propio y armar una propuesta estratégica propia — mejoras, actualización, optimización e ideas disruptivas — ejecutada sobre el mismo repositorio, sin que el proyecto pasara a depender de Lovable, y dejando grabada como regla permanente, tanto en memoria como dentro de una skill, la jerarquía "Lovable propone, Claude Code dispone, Pablo decide".

Se insistió con una instrucción más fuerte: no volver a consultar salvo que fuera estrictamente necesario, decidir directamente, y que cada paso ejecutado quedara deployado en producción de forma automática, en el repositorio de GitHub, en el repositorio local, y en la memoria — documentando cada paso al detalle para que, si una sesión se quedaba con muy poco crédito, ese último tramo se usara para dejar todo listo y poder retomar exactamente donde había quedado apenas se escribiera la palabra "continuemos" al inicio de una sesión nueva, en las mismas condiciones, hasta terminar. Se volvió a pedir una confirmación de una sola frase.

La respuesta confirmó: de ahí en más, decisión y ejecución directa sin consultar salvo bloqueo físico real; cada paso deployado, commiteado en GitHub, reflejado en el repositorio local, y documentado en memoria y en una skill: tanto la regla de gobierno como el detalle de cada paso dado, de forma que ante un corte de sesión se pudiera dejar un punto de retorno claro.

Se reforzó una vez más la instrucción de no preguntar, aclarando que solo se debía molestar para decisiones que excedieran físicamente la capacidad de actuar, y se preguntó si la descripción del proyecto seguía en pie y si algo de lo compartido por Lovable servía realmente, pidiendo again una respuesta en una sola frase.

La respuesta confirmó que la descripción seguía en pie tal cual, y que sí, una parte real del plan de Lovable servía y se iba a aprovechar — el diagnóstico de las grietas concretas, cerrar el loop de aprendizaje inyectando las reglas aprendidas en los prompts de los agentes, unificar las cinco pantallas sueltas en un solo panel, y la idea de un copiloto reflexivo — aclarando que cada afirmación del plan externo se iba a verificar contra el código y la base real antes de darla por buena, porque ya se había detectado que algunos números citados estaban desactualizados.

Antes de creer cualquier cifra del plan externo, se verificó el estado real: el conteo de errores de lint dio 45, no 70 como decía el plan; la base de datos real tenía cero filas de prueba contaminando métricas (ya se habían limpiado en una sesión anterior, el 2026-08-05), no diez como decía el plan; la tabla `calendar_events` estaba vacía y sin uso real; y la Edge Function `publisher`, retirada del código desde hacía semanas, seguía activa en el proyecto real de Supabase — esta última sí coincidía con lo ya documentado como pendiente.

Se dejó asentada la infraestructura de gobierno y continuidad antes de ejecutar: en la memoria persistente, un registro explicando la jerarquía de decisión y el modo de ejecución autónoma pedido, y otro registro sobre el plan estratégico como proyecto vivo. En `CLAUDE.md` se agregó una sección nueva documentando el mismo dogma de gobierno, el modo de ejecución sin consultas salvo bloqueo físico real, el protocolo de continuidad entre sesiones con la palabra "continuemos", y una tabla de estado con las fases del plan: Fase 0 de higiene, Fase 1 de idempotencia dura, Fase 2 de cerrar el loop de aprendizaje, Fase 3 de observabilidad, y como roadmap fuera de este ciclo el copiloto reflexivo, la unificación de las cinco pantallas en un solo panel, y la posibilidad de vender el producto a terceros.

Se ejecutó la Fase 0 completa, de punta a punta. Se borró de verdad, contra el proyecto real de Supabase, la Edge Function `publisher` — confirmada activa pese a estar retirada del código, y ya sin el bloqueo que la había dejado pendiente en sesiones anteriores. Se aplicó una migración nueva que dropea la tabla `calendar_events` (confirmada vacía y sin ningún uso real desde el rediseño de Calendario) y agrega una columna real `is_test` a la tabla de propuestas, con relleno automático para cualquier fila vieja que todavía tuviera el prefijo histórico de pruebas. Se corrigió el regex de detección de emoji del motor de reglas, que hasta ahora no reconocía el bloque de símbolos donde viven emojis comunes como los tildes y corazones, ampliándolo para cubrirlos. Y se reemplazó en el Dashboard y en el Calendario la forma de detectar filas de prueba: antes se inferían adivinando un prefijo de identificador, ahora se lee directamente la columna real de la base — lo que obligó, como consecuencia directa de haber borrado la tabla de eventos de calendario, a sacar del código todo lo que todavía dependía de ella (los ganchos y el servicio que la consultaban, ya sin ningún uso real) y a que el contador de publicaciones programadas y la sección de calendario del Dashboard pasaran a leer directamente de las propuestas programadas, exactamente como ya lo hacía la pantalla de Calendario.

Se verificó cada cambio contra la base real antes de darlo por bueno: la tabla de eventos de calendario efectivamente desapareció, la columna nueva de filas de prueba efectivamente existe con su valor por defecto correcto. Se corrió el control de calidad completo — la cantidad de errores de estilo de código bajó, no subió, pese al código nuevo; las pruebas automáticas completas pasaron todas, con dos pruebas ajustadas para reflejar la nueva fuente de datos; y la compilación de producción salió limpia.

---

## Anexo D — Código final de la Fase 0

### `supabase/migrations/011_higiene_fase0.sql`

```sql
-- Migration: Fase 0 del plan estratégico 2026-08-16 — higiene real
--
-- 1. calendar_events: tabla legacy confirmada vacía (0 filas, verificado
--    2026-08-16) y sin ningún caller real — Calendario.tsx lee
--    proposals.scheduled_at directo desde el rediseño del 2026-08-07.
--    Se dropea en vez de dejarla como deuda muerta.
--
-- 2. proposals.is_test: reemplaza el filtro por prefijo de UUID
--    (id::text LIKE '7e57da7a-%') que usaban Dashboard.tsx y
--    Calendario.tsx — una heurística de string, no una columna real.
--    Default false, backfill explícito por si quedara alguna fila vieja
--    con el prefijo histórico de pruebas de rule-engine (no debería haber
--    ninguna, ya se limpiaron el 2026-08-05, pero el UPDATE es inocuo si
--    no matchea nada).
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/011_higiene_fase0.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

DROP TABLE IF EXISTS calendar_events;

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

UPDATE proposals SET is_test = true WHERE id::text LIKE '7e57da7a-%' AND is_test = false;

COMMENT ON COLUMN proposals.is_test IS
  'Marca real de fila de prueba (ej. seeds de rule-engine) — reemplaza el filtro por prefijo de UUID que usaba el frontend. Default false. Fase 0 del plan estratégico 2026-08-16.';
```

### `src/hooks/useMetrics.ts` (completo, tras la Fase 0)

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { metricsApi } from "@/services/supabase";

// calendar_events (y sus hooks useCalendarEvents/useCreateCalendarEvent/
// useDeleteCalendarEvent) se retiraron en la Fase 0 del plan estratégico
// 2026-08-16 — tabla legacy confirmada vacía, sin ningún caller real desde
// el rediseño de Calendario del 2026-08-07 (lee proposals.scheduled_at
// directo). Dashboard.tsx ahora deriva "próximos 7 días" de useProposals().

// ═══════════════════════════════════════
// MÉTRICAS
// ═══════════════════════════════════════

export function useLatestMetrics() {
  return useQuery({
    queryKey: ["metrics", "latest"],
    queryFn: async () => {
      const { data, error } = await metricsApi.latest();
      if (error) throw error;
      return data;
    },
  });
}

export function useAllMetrics() {
  return useQuery({
    queryKey: ["metrics", "all"],
    queryFn: async () => {
      const { data, error } = await metricsApi.all();
      if (error) throw error;
      return data;
    },
  });
}

export function useProposalMetrics(proposalId: string) {
  return useQuery({
    queryKey: ["metrics", "proposal", proposalId],
    queryFn: async () => {
      const { data, error } = await metricsApi.byProposal(proposalId);
      if (error) throw error;
      return data;
    },
    enabled: !!proposalId,
  });
}

export function useSuccessRules() {
  return useQuery({
    queryKey: ["success-rules"],
    queryFn: async () => {
      const { data, error } = await metricsApi.successRules();
      if (error) throw error;
      return data;
    },
  });
}
```

**Nota sobre esta transcripción:** `Dashboard.tsx` y `Calendario.tsx` tuvieron cambios acotados en esta fase (reemplazo de la fuente de datos de calendario, lectura de `is_test` real) sobre el código completo ya transcripto en el Anexo C — no se vuelve a pegar el archivo entero acá para no duplicar miles de líneas sin cambios; los cambios reales están descriptos en prosa arriba y en el detalle de la Fase 0 dentro de `CLAUDE.md`. Si Pablo quiere el archivo completo actualizado transcripto igual, pedirlo expresamente.

Se continuó sin pausa a la Fase 1, idempotencia dura, siguiendo la instrucción explícita de no consultar entre fases. El objetivo era agregar una segunda capa de protección real, a nivel de base de datos, contra que dos propuestas terminaran agendadas para la misma oferta, el mismo día y el mismo formato — un problema relacionado pero distinto del duplicado de publicación ya investigado y corregido en una sesión anterior. Antes de tocar nada se verificó que no hubiera ninguna propuesta programada en ese momento en la base real, así que no había riesgo de que la restricción nueva chocara con datos existentes.

Al aplicar la migración apareció un problema técnico real, no anticipado: Postgres no permite convertir directamente una fecha con hora y zona horaria a solo fecha dentro de la definición de un índice, porque ese cálculo depende de en qué zona horaria esté la sesión que lo ejecuta, y un índice necesita una función cuyo resultado sea siempre el mismo para los mismos datos de entrada. Se resolvió creando una función propia que fija la zona horaria a UTC de forma explícita antes de calcular la fecha — con la zona fija, el resultado deja de depender de la sesión y se vuelve genuinamente estable, no un truco declarado a la fuerza.

La restricción se probó de verdad, no solo se aplicó y se dio por buena: se insertó una propuesta de prueba agendada para una oferta, fecha y formato determinados, y después se intentó insertar una segunda con la misma oferta, la misma fecha, el mismo formato pero una hora distinta — Postgres la rechazó exactamente como se esperaba, con un error real de clave duplicada. Las filas usadas para la prueba se borraron enseguida.

---

## Anexo E — Código final de la Fase 1

### `supabase/migrations/012_idempotencia_scheduling.sql`

```sql
-- Migration: Fase 1 del plan estratégico 2026-08-16 — idempotencia dura
-- contra el duplicado de autoagendado
--
-- Contexto real (ver CLAUDE.md "Duplicado real de autoagendado —
-- investigación 2026-08-05"): la causa más probable identificada fue un
-- gap de idempotencia en publish-scheduled-posts.mjs (markPublished() no
-- chequeaba éxito del PATCH) — ya corregido en esa fecha con un chequeo de
-- res.ok + una función isStillScheduled() que re-consulta el status antes
-- de publicar cada entrada del manifiesto. Esta migración agrega una
-- segunda capa, a nivel de base, contra un problema relacionado pero
-- distinto: que dos propuestas terminen agendadas para la misma oferta,
-- misma fecha (día) y mismo formato — algo que el rotador de oferta y el
-- espaciado de 24h de orchestrator ya evita en el camino feliz, pero sin
-- ninguna garantía dura si dos sesiones de Mesa de Diálogo corrieran cerca
-- en el tiempo o si un agendado manual colisionara con uno automático.
--
-- Índice único parcial (solo aplica a status='scheduled' — una propuesta
-- puede pasar por rejected/published sin chocar con este constraint, y
-- claramente formatos sin pipeline autónomo como historia no agendan por
-- oferta+fecha de la misma forma). NULLs en oferta no colisionan entre sí
-- (comportamiento estándar de Postgres en índices únicos), consistente con
-- que oferta es nullable hasta que se agenda de verdad.
--
-- Verificado antes de aplicar: SELECT * FROM proposals WHERE
-- status='scheduled' devolvió 0 filas el 2026-08-16 — no hay riesgo de que
-- el índice falle por datos existentes.
--
-- Nota técnica real (encontrada al aplicar, no anticipada): Postgres NO
-- deja usar scheduled_at::date directo en un índice porque el cast
-- timestamptz→date depende del timezone de la sesión, así que no es
-- IMMUTABLE (error real: "42P17: functions in index expression must be
-- marked IMMUTABLE"). Se resuelve con una función wrapper que fija UTC
-- explícito — ahí el resultado ya no depende de ninguna sesión, es
-- genuinamente inmutable, no una mentira de volatilidad.
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/012_idempotencia_scheduling.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

CREATE OR REPLACE FUNCTION scheduled_day_utc(ts TIMESTAMPTZ)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$ SELECT (ts AT TIME ZONE 'UTC')::date $$;

DROP INDEX IF EXISTS idx_proposals_no_duplicate_schedule;

CREATE UNIQUE INDEX idx_proposals_no_duplicate_schedule
  ON proposals (oferta, scheduled_day_utc(scheduled_at), format)
  WHERE status = 'scheduled';

COMMENT ON INDEX idx_proposals_no_duplicate_schedule IS
  'Fase 1 del plan estratégico 2026-08-16: impide dos propuestas scheduled para la misma oferta+día+formato. Defensa a nivel de base, complementa el fix de idempotencia ya aplicado en publish-scheduled-posts.mjs el 2026-08-05.';
```

---

Se continuó, sin pausa, a la Fase 2: cerrar el loop de aprendizaje. El motor de reglas venía generando conclusiones sobre qué funcionaba mejor desde hacía semanas, pero nada dentro del sistema las leía en el momento de generar contenido nuevo — el sistema medía y sacaba conclusiones, pero no cambiaba su comportamiento real. Se agregó una función que trae hasta diez reglas aprendidas con confianza suficiente, ordenadas de mayor a menor, y las inyecta como contexto adicional en las instrucciones que reciben el agente que propone el tema y el agente que redacta el copy — incluyendo la evidencia numérica real detrás de cada regla, y aclarando explícitamente que no es una orden ciega, que el criterio de marca sigue siendo lo primero. El agente crítico, a propósito, no recibe este contexto — su trabajo es juzgar contra el criterio de marca, no contra métricas de rendimiento, y mezclar los dos criterios lo debilitaría.

Antes de dar la fase por terminada se verificó la consulta real contra la base, y ahí apareció un problema genuino, no anticipado: la tabla de reglas aprendidas nunca había tenido una columna para guardar la evidencia numérica de cada regla — el motor de reglas la calculaba y la devolvía en sus respuestas, pero nunca la había guardado de verdad en la base. Si eso se dejaba así, la consulta nueva agregada a `orchestrator` iba a fallar apenas existiera una sola regla real que leer, porque le pediría a la base una columna que no existe — un error que se habría introducido en producción con este mismo cambio. Se agregó la columna real que faltaba y se corrigió el motor de reglas para que la guarde de verdad, tanto la primera vez que aparece una regla como cuando se actualiza una ya existente.

Se verificó de punta a punta a nivel de base de datos: se insertó una regla de prueba, marcada como tal, con su motivo y su evidencia reales, y se corrió exactamente la misma consulta que usa la función nueva — devolvió la fila completa, con el motivo y la evidencia bien poblados, confirmando que el bloque de contexto se arma correctamente. No se pudo disparar una sesión real completa de Mesa de Diálogo para observar el comportamiento en vivo de los agentes con este cambio, porque hacía falta una credencial de servidor a servidor que no está disponible en esta máquina — y se optó, a propósito, por no intentar leerla de un archivo local ya marcado en una sesión anterior como bloqueado para ese uso. Queda como pendiente real, no resuelto, si se quiere cerrar esa verificación del todo. La fila de prueba se borró después de confirmar; la tabla de reglas reales sigue en cero filas, porque los datos genuinos siguen siendo insuficientes, sin cambios respecto a lo ya sabido.

---

## Anexo F — Código final de la Fase 2

### `supabase/migrations/013_success_rules_evidence.sql`

```sql
-- Migration: Fase 2 del plan estratégico 2026-08-16 — evidence real en
-- success_rules
--
-- Bug encontrado al implementar la inyección de reglas aprendidas en los
-- prompts de orchestrator (cerrar el loop de aprendizaje): RuleCandidate
-- en rule-engine/index.ts siempre calculó un campo "evidence" (ej. "4
-- posts con engagement promedio de 16.8%") y lo devolvía en la respuesta
-- de la API, pero saveRules() nunca lo escribía en la base — la columna
-- ni siquiera existía en success_rules (solo rule_type, condition,
-- action, confidence, times_applied, success_rate). orchestrator no podía
-- citar evidencia real al inyectar una regla en el prompt del Estratega/
-- Creativo sin esto.
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/013_success_rules_evidence.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

ALTER TABLE success_rules
  ADD COLUMN IF NOT EXISTS evidence TEXT;

COMMENT ON COLUMN success_rules.evidence IS
  'Evidencia numérica textual de la regla (ej. "4 posts con engagement promedio de 16.8%") — rule-engine ya la calculaba pero nunca la persistía. Fase 2 del plan estratégico 2026-08-16.';
```

### `supabase/functions/orchestrator/index.ts` — bloque nuevo (loop de aprendizaje)

```typescript
// ═══════════════════════════════════════
// LOOP DE APRENDIZAJE — Fase 2 del plan estratégico 2026-08-16
//
// rule-engine ya generaba success_rules desde el 2026-08-02 (cron diario),
// pero nada las leía al generar contenido nuevo — el sistema medía y
// concluía, pero no cambiaba su comportamiento. Esto cierra ese loop: el
// Estratega y el Creativo reciben las reglas aprendidas (confidence >= 0.6)
// como contexto adicional, con la evidencia numérica real, no como una
// orden ciega — el Crítico sigue siendo la autoridad final sobre marca.
// ═══════════════════════════════════════

const LEARNED_RULES_MIN_CONFIDENCE = 0.6;

async function getLearnedRulesBlock(): Promise<string> {
  const { data: rules } = await supabase
    .from("success_rules")
    .select("rule_type, condition, action, confidence, evidence")
    .gte("confidence", LEARNED_RULES_MIN_CONFIDENCE)
    .order("confidence", { ascending: false })
    .limit(10);

  if (!rules?.length) return "";

  const lines = rules.map((r) => {
    const reason = r.action?.reason || JSON.stringify(r.action);
    const pct = Math.round((r.confidence ?? 0) * 100);
    return `- [${r.rule_type}] ${reason} (confianza ${pct}%, evidencia real: ${r.evidence})`;
  });

  return `\n\nLO QUE YA APRENDIMOS DE NUESTROS PROPIOS DATOS (rule-engine, confianza >= ${Math.round(LEARNED_RULES_MIN_CONFIDENCE * 100)}%):\n${lines.join("\n")}\nUsá esto como contexto real de qué funcionó antes con este público — no es una orden ciega, el criterio de marca sigue siendo lo primero.`;
}
```

`runEstratega`/`runCreativo` reciben ahora un parámetro `learnedRules: string` que se concatena en el `system` prompt inmediatamente después de `DOCUMENTOS DE MARCA`; `startSession`/`continueSession` llaman `getLearnedRulesBlock()` una vez y lo pasan a ambos. El Crítico (`runCritico`) no lo recibe a propósito.

### `supabase/functions/rule-engine/index.ts` — `saveRules()` corregido

```typescript
async function saveRules(rules: RuleCandidate[]) {
  let saved = 0;
  for (const rule of rules) {
    // Check if similar rule exists
    const { data: existing } = await supabase
      .from("success_rules")
      .select("id, confidence, times_applied")
      .eq("rule_type", rule.rule_type)
      .eq("condition", JSON.stringify(rule.condition))
      .single();

    if (existing) {
      // Update confidence (weighted average)
      const newConfidence =
        (existing.confidence * existing.times_applied + rule.confidence) /
        (existing.times_applied + 1);
      await supabase
        .from("success_rules")
        .update({
          confidence: Math.min(0.95, newConfidence),
          action: rule.action,
          evidence: rule.evidence,
          times_applied: (existing.times_applied || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("success_rules").insert({
        rule_type: rule.rule_type,
        condition: rule.condition,
        action: rule.action,
        confidence: rule.confidence,
        evidence: rule.evidence,
        times_applied: 1,
      });
    }
    saved++;
  }
  return saved;
}
```

---

## Parte 6 — Fase 3 del plan estratégico: observabilidad real (2026-08-17)

La sesión anterior había quedado cortada a mitad de la Fase 2 por una suspensión de la máquina; se retomó y se cerró esa fase (el bug real de `success_rules.evidence` nunca persistido quedó documentado y corregido). El pedido siguiente fue simple y directo: "Sigué con la Fase 3" — sin más contexto, bajo el mismo régimen de autonomía ya establecido ("Lovable propone, Claude Code dispone, Pablo decide", sin consultar decisiones de alcance entre fases).

La Fase 3 del plan — Observabilidad — buscaba resolver un problema concreto: no había ningún lugar único donde ver qué había pasado con cada corrida del pipeline. Los seis scripts de Node (la story diaria y los posts de feed) dejaban rastro en los logs de GitHub Actions, pero mirar eso paso por paso significaba entrar a cada corrida por separado; las cuatro Edge Functions de Supabase no dejaban ningún rastro propio consultable desde afuera. "¿Corrió el rule-engine hoy? ¿Con qué resultado? ¿Cuánto tardó?" eran preguntas sin una respuesta directa.

La solución fue una tabla nueva, `run_log`, con columnas `source` (qué componente corrió: `daily-story`, `publish-scheduled-posts`, `sync-history`, `orchestrator`, `rule-engine`, `metrics-collector`, `vault-process`), `step` (el paso puntual dentro de ese componente), `status` (`success`, `error` o `skipped`, con un `CHECK` real en la base, no solo una convención de código), `proposal_id` (nullable y sin foreign key dura a propósito — el pipeline de Stories nunca usa `proposals`, así que una FK obligatoria no tendría sentido para esa mitad del sistema), `duration_ms`, `error` y un `metadata jsonb` para lo que cada paso quisiera agregar de específico. Misma política de RLS que el resto del schema (`is_app_admin()`), y un índice sobre `(source, created_at DESC)` pensado para la consulta más obvia: "las últimas corridas de tal cosa".

La migración se escribió con el mismo criterio que las anteriores de esta fase del proyecto — comentario de cabecera explicando el porqué, no solo el qué — y se aplicó contra la base real con `supabase db query --linked -f`, no con `db push` (el bug documentado del CLI de Supabase sigue siendo la razón para evitarlo). Se verificó con una consulta directa a `information_schema.columns` que las nueve columnas quedaron creadas con los tipos esperados.

Con la tabla lista, hacía falta una forma de escribir en ella desde los dos runtimes distintos que tiene el proyecto — Deno en las Edge Functions, Node en los scripts de GitHub Actions — sin duplicar lógica ni, más importante, sin que un fallo al loguear rompiera nunca el flujo real de publicación o de generación de contenido. Se escribieron dos helpers con la misma firma conceptual: `supabase/functions/_shared/runLog.ts` para el lado Deno, con un cliente de Supabase propio (mismas variables de entorno `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` que ya usa cada función), y `scripts/lib/run-log.mjs` para el lado Node, que en vez de traer una dependencia nueva simplemente pega contra el endpoint REST de PostgREST con `fetch` directo — exactamente el mismo patrón que ya usaban `render-scheduled-posts.mjs` y `publish-scheduled-posts.mjs` para hablar con Supabase sin el SDK de JS. Los dos envuelven la escritura en un `try/catch` que, si falla, imprime un `console.warn` y sigue — nunca un `throw`.

Instrumentar las cuatro Edge Functions fue directo: cada una ya tenía un único `Deno.serve` con un `switch` sobre la acción pedida (`start`/`continue` en `orchestrator`, `analyze`/`suggest` en `rule-engine`, `collect`/`collect-all`/`insights` en `metrics-collector`, `process`/`search` en `vault-process`) envuelto en un `try/catch` que ya devolvía el error como respuesta HTTP. Se agregó un `logRun` justo antes de cada `return` de éxito y otro en cada bloque `catch`, con el nombre de la acción como `step` y la duración real medida desde el arranque del handler. En el camino se encontró un detalle real que valía la pena resolver aparte de la instrumentación: `orchestrator` insertaba una propuesta nueva en la tabla `proposals` sin pedir de vuelta el `id` generado (`.insert(insert)` sin `.select()`), así que no había ninguna forma de citar esa propuesta en el log — se agregó `.select("id").single()` y ese `id` ahora viaja tanto en el `run_log` como en la respuesta HTTP de la función, como campo `proposalId` nuevo (backward compatible, nadie en el frontend lo leía todavía, así que no rompe nada existente).

Los seis scripts del pipeline autónomo se instrumentaron con el mismo criterio en todos: un `startTimer()` al principio, un `logRun` de éxito justo antes de que termine el `main()`, y el `main().catch((e) => { ... })` de siempre reemplazado por una versión que además llama a `logRun` con `status: "error"` antes de hacer `process.exit(1)`. Los frenos legítimos que ya existían — `generate-brief.mjs` cuando ya se generó contenido hoy, `render-scheduled-posts.mjs` y `publish-scheduled-posts.mjs` cuando no hay nada pendiente de publicar — pasaron a loguear `status: "skipped"` con el motivo en el `metadata`, en vez de simplemente no dejar rastro. `publish-scheduled-posts.mjs` recibió además una granularidad extra que los otros cinco no necesitan: como procesa varias propuestas independientes en una sola corrida (el manifiesto generado por el paso anterior), cada publicación individual —éxito o error— queda como su propia fila en `run_log`, con el `proposal_id` real de esa pieza, además de que el fallo de una no corta el procesamiento de las demás (eso ya era así antes, la instrumentación solo lo hizo visible).

Un detalle de infraestructura salió a la luz al revisar los tres workflows relevantes de GitHub Actions: `publish-scheduled-posts.yml` y `sync-history.yml` ya tenían `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` pasadas como variables de entorno en sus pasos (las necesitaban desde antes, para hablar con `proposals`), pero `daily-story.yml` —el workflow de la story diaria— nunca las había necesitado hasta ahora y no las tenía en ninguno de sus tres pasos relevantes (generar brief, renderizar, publicar). Sin agregarlas ahí, el helper de Node del lado de Stories se hubiera quedado sin credenciales para escribir, con un `console.warn` silencioso en cada corrida real. Se agregaron a los tres pasos.

La primera pasada de la instrumentación introdujo un efecto colateral que se detectó antes de dar la fase por cerrada: para leer campos específicos del resultado de cada acción (por ejemplo `rulesFound`/`rulesSaved` de `rule-engine`, o el `proposalId` recién agregado de `orchestrator`) dentro del bloque de logging, el código usaba `(result as any).campo` — una forma rápida pero que dispara la regla de lint `@typescript-eslint/no-explicit-any`, ya con 44 errores preexistentes documentados en el proyecto y una política explícita de no aumentarlos. La primera corrida de lint tras los cambios subió a 51. Se corrigió tipando la variable `result` de cada handler con una forma concreta y parcial (por ejemplo `{ rulesFound?: number; rulesSaved?: number }` en `rule-engine`, `{ chunksCreated?: number }` en `vault-process`) en vez de castear a `any` — TypeScript permite asignar los objetos reales devueltos por cada rama del `switch` a ese tipo más angosto sin quejarse (las propiedades de más no importan, solo hace falta que las que se leen después estén tipadas). El lint volvió a 44 errores exactos, mismos que antes de tocar nada. Los 61 tests siguieron pasando y el build quedó limpio.

Antes de dar la fase por probada de verdad, no solo desplegada, se dispararon dos workflows reales por `workflow_dispatch` — `rule-engine-cron.yml` y `sync-history.yml`, ambos ya corren por cron de forma rutinaria, así que dispararlos a mano no es una acción nueva ni riesgosa. El primer intento de `sync-history.yml` corrió con el código todavía sin pushear a `main` (GitHub Actions siempre hace checkout de la rama, no del working directory local), así que no escribió nada en `run_log` — comportamiento esperado, no un bug. Después de commitear y pushear los catorce archivos de esta fase (y de resolver un rebase trivial contra un commit automático de `sync-history.yml` que se había generado mientras tanto, producto del primer disparo), se volvió a correr `sync-history.yml` ya con el código real en la rama. Los dos disparos —el de `rule-engine-cron` contra la Edge Function recién deployada, y el segundo de `sync-history` contra el script recién pusheado— confirmaron filas reales en `run_log`: una con `source: rule-engine`, `step: analyze`, `status: success`, `duration_ms: 1071` y `metadata: {rulesFound: 0, rulesSaved: 0}` (coherente con que solo hay dos métricas reales genuinas hoy, muy por debajo del mínimo de cinco que `rule-engine` necesita para producir algo); otra con `source: sync-history`, `status: success`, `duration_ms: 5925` y `metadata: {count: 28}` (el número real de posts que devolvió la API de Zernio). No se disparó manualmente `daily-story.yml` ni `publish-scheduled-posts.yml` para no generar una publicación real solo para probar el logging — la instrumentación ahí sigue exactamente el mismo patrón ya probado en los otros dos, así que queda verificada por revisión de código y se confirmará de forma indirecta la próxima vez que corra alguno de esos dos por su cron normal.

Con eso, tres de las siete fases del plan estratégico (Higiene, Idempotencia dura, Cerrar el loop de aprendizaje, y ahora Observabilidad) quedaron cerradas de punta a punta —código, migración aplicada, deploy real, verificación contra producción, commit, push y documentación— bajo el mismo régimen de autonomía sin gate de aprobación entre fases. Las tres restantes documentadas en la tabla del plan (Copiloto reflexivo, Un solo panel, Vendible a terceros) siguen marcadas explícitamente como roadmap fuera de este ciclo, no descartadas ni tampoco comprometidas para arranque inmediato.

### Anexo G — código completo de la Fase 3

**`supabase/migrations/014_run_log.sql`** (íntegro):

```sql
-- Migration: Fase 3 del plan estratégico 2026-08-16 — observabilidad real
--
-- Hoy "¿corrió la story de hoy?" se responde mirando commits o los logs de
-- GitHub Actions por separado de los de Supabase — no hay un solo lugar
-- donde ver qué pasó con una pieza en cualquier paso del pipeline (Edge
-- Functions o scripts de Actions). run_log es esa fuente única: cada
-- script y cada Edge Function real del pipeline escribe una fila por
-- corrida, éxito o error, sin excepción.
--
-- source = qué componente corrió (daily-story | publish-scheduled-posts |
-- sync-history | orchestrator | vault-process | metrics-collector |
-- rule-engine). step = el paso puntual dentro de ese componente (varios
-- scripts ya son un paso completo del pipeline por sí mismos — ej.
-- generate-brief.mjs ES el paso "generate-brief" — así que una fila por
-- corrida de script ya da granularidad real de paso).
--
-- proposal_id sin FK dura a propósito: el pipeline de Stories nunca usa
-- proposals (va directo por content/inbox → Zernio → historial.json), así
-- que una FK NOT NULL o con ON DELETE forzado no tendría sentido para esa
-- mitad del sistema. Se deja como UUID libre, NULL cuando no aplica.
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/014_run_log.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

CREATE TABLE IF NOT EXISTS run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  proposal_id UUID,
  duration_ms INTEGER,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE run_log DROP CONSTRAINT IF EXISTS run_log_status_check;
ALTER TABLE run_log ADD CONSTRAINT run_log_status_check
  CHECK (status IN ('success', 'error', 'skipped'));

CREATE INDEX IF NOT EXISTS idx_run_log_source_created ON run_log (source, created_at DESC);

ALTER TABLE run_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON run_log;
CREATE POLICY "Admin full access" ON run_log
  FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

COMMENT ON TABLE run_log IS
  'Observabilidad real (Fase 3 del plan estratégico 2026-08-16): una fila por corrida de cada script/Edge Function del pipeline, éxito o error. Escrita por scripts/lib/run-log.mjs (Node/Actions) y supabase/functions/_shared/runLog.ts (Deno/Edge Functions).';
```

**`supabase/functions/_shared/runLog.ts`** (íntegro):

```typescript
// supabase/functions/_shared/runLog.ts
// Observabilidad real (Fase 3, plan estratégico 2026-08-16): cada Edge
// Function del pipeline escribe una fila en run_log por corrida, éxito o
// error. El logging nunca debe romper el flujo real de la función que lo
// usa — cualquier fallo al escribir se trata como warning, no como error.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

export interface RunLogEntry {
  source: string;
  step: string;
  status: "success" | "error" | "skipped";
  proposalId?: string | null;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export async function logRun(entry: RunLogEntry): Promise<void> {
  try {
    await supabase.from("run_log").insert({
      source: entry.source,
      step: entry.step,
      status: entry.status,
      proposal_id: entry.proposalId ?? null,
      duration_ms: entry.durationMs ?? null,
      error: entry.error ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.warn(`[runLog] no se pudo escribir "${entry.source}/${entry.step}": ${(e as Error).message}`);
  }
}
```

**`scripts/lib/run-log.mjs`** (íntegro):

```javascript
// scripts/lib/run-log.mjs
// Observabilidad real (Fase 3, plan estratégico 2026-08-16): cada script
// del pipeline autónomo escribe una fila en run_log por corrida, éxito o
// error. El logging nunca debe romper el flujo real del script que lo usa
// — cualquier fallo al escribir se trata como warning, no como error, y si
// faltan las credenciales de Supabase en el entorno se avisa y se sigue.

export async function logRun({
  source,
  step,
  status,
  proposalId = null,
  durationMs = null,
  error = null,
  metadata = {},
}) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn(
      `[run-log] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no configurados — no se registra "${source}/${step}".`
    );
    return;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/run_log`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        source,
        step,
        status,
        proposal_id: proposalId,
        duration_ms: durationMs,
        error,
        metadata,
      }),
    });
    if (!res.ok) {
      console.warn(`[run-log] fallo al registrar "${source}/${step}": ${res.status} ${await res.text()}`);
    }
  } catch (e) {
    console.warn(`[run-log] fallo al registrar "${source}/${step}": ${e.message}`);
  }
}

export function startTimer() {
  const start = Date.now();
  return () => Date.now() - start;
}
```

---

## Parte 7 — Fase 4: Copiloto Reflexivo, y la autorización para seguir solo toda la noche (2026-08-17)

Con la Fase 3 cerrada y documentada, se le presentó a Pablo una disyuntiva concreta: las Fases 4, 5 y 6 del plan estratégico habían quedado escritas en `CLAUDE.md` como "roadmap, no en este ciclo" — a diferencia de las Fases 0 a 3, que ya venían con diseño concreto desde el planteo original, estas tres solo tenían una frase de intención ("Copiloto reflexivo: consejo diario + chat sobre datos propios en el Dashboard, con la voz de marca" para la 4; absorber los sitios estáticos como rutas del EDA para la 5; multi-tenant vendible a terceros para la 6). Preguntado si correspondía arrancar la Fase 4 ahora, cerrar el ciclo en la Fase 3, o atender otra prioridad puntual, la respuesta fue clara y sin ambigüedad: seguir con la Fase 4 hasta la última de manera autónoma, sin más check-ins — la sesión se quedaría trabajando sola mientras Pablo dormía.

Esa respuesta amplió el alcance de la autonomía ya delegada: ya no se trataba solo de ejecutar sin preguntar decisiones de prioridad entre fases con diseño ya cerrado, sino de diseñar el detalle concreto de fases que hasta ese momento eran solo una frase de intención, y seguir encadenando las siguientes sin esperar confirmación. Se documentó esa ampliación en `CLAUDE.md`, citando la frase exacta de la autorización, antes de arrancar a construir.

El diseño de la Fase 4 partió de un diagnóstico simple: el sistema ya medía (`metrics`), ya aprendía (`rule-engine` generando `success_rules`), y desde la Fase 3 ya sabía si estaba sano (`run_log`) — pero nada de eso se traducía a lenguaje humano para Pablo. Había que abrir el Dashboard y leer números sueltos, o consultar la base directo, para entender qué estaba pasando. El Copiloto Reflexivo resuelve eso con dos modos.

El primero es un "consejo del día": un párrafo breve, en la voz de MejoraOK, que resume lo que dicen los datos reales de esa jornada. El segundo es un chat abierto donde Pablo puede preguntar lo que quiera sobre sus propios datos — "¿qué formato rindió mejor esta semana?", por ejemplo — y recibir una respuesta anclada en la misma fuente de verdad. Los dos modos comparten una función central, `gatherDataSummary()`, que junta en paralelo las métricas reales de los últimos 30 posts (excluyendo filas de prueba vía `is_test`), las reglas aprendidas con confianza mayor o igual a 60%, los errores reales del pipeline en las últimas 48 horas (leídos directo de `run_log` — la primera pieza del sistema que consume esa tabla, no solo la escribe), y el conteo de piezas agendadas/publicadas en la última semana. Ese resumen, más una búsqueda RAG contra la Bóveda de documentos de marca (el mismo mecanismo que ya usan `orchestrator` y `vault-process`, copiado en vez de compartido — mismo criterio de una función por Edge Function que ya regía en el proyecto), arma el contexto real que se le pasa al modelo. La regla innegociable, escrita explícitamente en el system prompt de los dos modos: nunca inventar una cifra que no esté en ese contexto. Si los datos son insuficientes para un consejo con sustancia, decirlo con franqueza en vez de rellenar con algo genérico.

El consejo del día se genera una sola vez por día real y se cachea en una tabla nueva, `copilot_advice`, con `advice_date` como columna única — así una segunda carga del Dashboard el mismo día no vuelve a llamar al modelo, y si dos requests llegan en simultáneo (una carrera real, no hipotética, dado que el cron y una visita manual podrían coincidir), la inserción que pierde la carrera por la restricción única simplemente relee la fila que ya quedó guardada en vez de fallar. El chat, en cambio, es deliberadamente stateless: no tiene tabla de sesiones ni de mensajes propia — el historial de la conversación vive en el estado de React del componente y se manda completo (acotado a los últimos diez turnos) en cada pregunta nueva. Fue una decisión consciente de no replicar el peso de esquema de Mesa de Diálogo (que sí necesita persistir sesiones y turnos, porque de ahí salen propuestas reales que se autoagendan) para un asistente que es, por diseño, más liviano.

La función de IA elegida para el copiloto fue Anthropic con `claude-sonnet-5` como modelo principal y Groq como respaldo si el primero falla — el mismo par que ya usa `orchestrator` para sus tres agentes, sin necesidad de abrir el abanico completo de cuatro proveedores que sí tiene disponible Mesa de Diálogo. Deliberadamente no se agregó como un cuarto agente en la tabla `agent_config`: esa tabla es específicamente el espacio de los tres agentes del debate (Estratega, Creativo, Crítico), y mezclar ahí un asistente de consulta habría difuminado esa frontera sin necesidad — el copiloto tiene su propio prompt de sistema escrito directo en el código de la función.

El primer borrador del código de la función introdujo once usos de `any` explícito — en las respuestas de Anthropic y Groq, en los resultados de la búsqueda RAG, en las filas de las cuatro tablas que consulta `gatherDataSummary()` — que hubieran subido el conteo de errores de lint de 44 (el número ya establecido como línea de base desde las fases anteriores) a 55. Se corrigió tipando cada una de esas formas con interfaces concretas y parciales en vez de castear a `any`, exactamente la misma disciplina aplicada en la Fase 3 cuando apareció el mismo problema en `orchestrator`. El lint volvió a los 44 errores de siempre, ninguno nuevo.

La verificación en producción se hizo en dos pasos, sin arriesgar nada real: primero se desplegó la función y se disparó el cron nuevo (`copilot-advice-cron.yml`) una vez por `workflow_dispatch` — el mismo patrón ya usado para probar `rule-engine` y `sync-history` en la Fase 3, disparar a mano un cron que de todas formas corre solo. Devolvió un consejo real y honesto: con solo tres métricas genuinas disponibles y un engagement promedio real de cero, el copiloto no inventó una conclusión — dijo explícitamente que no había suficiente información para un consejo con sustancia. Confirmado también en la base: la fila quedó cacheada con la evidencia numérica real adjunta, y una fila nueva en `run_log` con la duración real de la llamada al modelo incluida. Para probar el chat —que comparte casi todo el código con el consejo del día, salvo el manejo del historial de turnos— se armó un workflow temporal, se disparó una sola vez con una pregunta real sobre los datos, devolvió una respuesta anclada correctamente en las cifras reales, y se borró el workflow apenas quedó confirmado — no se dejó como infraestructura permanente del repo.

El frontend sumó una tarjeta nueva al Dashboard, entre el resumen operativo y los KPIs de rendimiento social: el consejo del día con un estado de carga mientras se genera, y debajo un chat mínimo con burbujas de conversación y una caja de texto. El historial de mensajes vive en un hook propio que no depende de ningún estado del servidor. No fue posible verificar la tarjeta en una sesión de navegador autenticada real, porque el login pide un código que llega al mail de Pablo — la misma limitación ya documentada varias veces en este proyecto — así que la verificación quedó a nivel de la batería de tests de componentes (que sigue pasando completa, con la tarjeta nueva montada) y de un build de producción limpio.

Con la Fase 4 cerrada — backend probado con datos reales, frontend integrado, documentación al día — quedan las Fases 5 y 6 del plan, ambas todavía sin diseño concreto más allá de la frase de intención original, para las que la autorización de Pablo también aplica: seguir sin más consultas, diseñando sobre la marcha, hasta terminarlas o hasta que la sesión se corte por falta de crédito, momento en el que este mismo protocolo de continuidad vuelve a aplicar.

### Anexo H — código completo de la Fase 4

**`supabase/migrations/015_copilot_advice.sql`** (íntegro):

```sql
-- Migration: Fase 4 del plan estratégico 2026-08-16 — Copiloto reflexivo
--
-- "Consejo diario": una sola fila real por día con una lectura en lenguaje
-- natural de los datos propios (metrics, success_rules, run_log), generada
-- por la Edge Function copilot y cacheada acá — no se regenera en cada
-- carga del Dashboard, solo la primera vez que se pide ese día. advice_date
-- UNIQUE es la idempotencia real: dos pedidos el mismo día devuelven la
-- misma fila, no llaman al LLM dos veces.
--
-- El chat del copiloto ("chat sobre datos propios") NO tiene tabla propia
-- a propósito: es stateless — el frontend mantiene el historial de la
-- conversación en memoria (React state) y lo manda completo en cada
-- request, la Edge Function no persiste nada de eso. Menos peso de schema
-- para una función que es un asistente liviano de consulta, no un registro
-- editorial como Mesa de Diálogo (que sí necesita persistir sesiones/turnos
-- porque de ahí salen propuestas reales que se autoagendan).
--
-- Ejecutar vía `supabase db query --linked -f supabase/migrations/015_copilot_advice.sql`
-- (con -f, no `"$(cat ...)"` inline) o el SQL Editor del dashboard — NO con
-- `supabase db push` (ver CLAUDE.md "Bug conocido del CLI").

CREATE TABLE IF NOT EXISTS copilot_advice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advice_date DATE NOT NULL UNIQUE,
  content TEXT NOT NULL,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE copilot_advice ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON copilot_advice;
CREATE POLICY "Admin full access" ON copilot_advice
  FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

COMMENT ON TABLE copilot_advice IS
  'Fase 4 del plan estratégico 2026-08-16 (Copiloto reflexivo): un "consejo del día" en lenguaje natural por fecha, generado y cacheado por la Edge Function copilot a partir de metrics/success_rules/run_log reales. No confundir con el chat del copiloto, que es stateless y no tiene tabla propia.';
```

**`supabase/functions/copilot/index.ts`** (íntegro):

```typescript
// supabase/functions/copilot/index.ts
// Copiloto Reflexivo — Fase 4 del plan estratégico 2026-08-16.
// Dos modos, ambos basados en datos propios reales (metrics, success_rules,
// run_log, proposals) — nunca en cifras inventadas:
//   - action: "advice"  → "consejo del día", generado una vez por día y
//     cacheado en copilot_advice (advice_date UNIQUE evita regenerarlo en
//     cada carga del Dashboard).
//   - action: "chat"    → pregunta libre sobre los datos propios, stateless
//     (el historial de la conversación lo manda el cliente, no se persiste
//     acá — ver comentario de cabecera de la migración 015).
//
// Uso: POST /copilot { action: "advice" } | { action: "chat", question, history? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { logRun } from "../_shared/runLog.ts";

const ALLOWED_ORIGINS = [
  "https://pabloeckert.github.io",
  "https://mejorasm-*.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app") ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function validateBody(body: Record<string, unknown>, required: string[]) {
  const missing = required.filter((k) => body[k] === undefined || body[k] === null);
  if (missing.length > 0) {
    throw new Error(`Campos requeridos faltantes: ${missing.join(", ")}`);
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 1000): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries) throw e;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      console.warn(`[copilot] Retry ${i + 1}/${maxRetries} after ${Math.round(delay)}ms: ${errorMessage(e)}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

async function callAI(
  system: string,
  messages: { role: string; content: string }[],
  temperature = 0.7
): Promise<string> {
  try {
    return await withRetry(() => callAnthropic(system, messages, temperature));
  } catch (e) {
    console.warn(`[copilot] Anthropic falló (${errorMessage(e)}), fallback a Groq`);
    return await withRetry(() => callGroq(system, messages, temperature));
  }
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

async function callAnthropic(
  system: string,
  messages: { role: string; content: string }[],
  temperature: number
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system,
      messages,
      temperature,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as AnthropicResponse;
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error("Anthropic: respuesta sin contenido");
  return textBlock.text;
}

interface GroqResponse {
  choices?: { message?: { content?: string } }[];
}

async function callGroq(
  system: string,
  messages: { role: string; content: string }[],
  temperature: number
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: system }, ...messages],
      temperature,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as GroqResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq: respuesta sin contenido");
  return content;
}

interface DocChunkRow {
  content: string;
}

async function getContextDocs(query: string): Promise<string> {
  try {
    const hfKey = Deno.env.get("HF_API_KEY");
    if (!hfKey) throw new Error("HF_API_KEY no configurada");

    const embedRes = await fetch(
      "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: [query], options: { wait_for_model: true } }),
      }
    );
    if (!embedRes.ok) throw new Error(`HF error: ${embedRes.status}`);
    const embeddings = (await embedRes.json()) as number[][];

    if (embeddings?.[0]) {
      const { data: chunks } = await supabase.rpc("match_documents", {
        query_embedding: embeddings[0],
        match_count: 4,
      });
      const rows = chunks as DocChunkRow[] | null;
      if (rows?.length) {
        return rows.map((c) => `### Fragmento relevante:\n${c.content}`).join("\n\n");
      }
    }
  } catch (e) {
    console.warn(`[copilot] Búsqueda vectorial falló: ${errorMessage(e)}, usando fallback`);
  }

  const { data: docs } = await supabase
    .from("documents")
    .select("title, content")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!docs?.length) return "No hay documentos en la bóveda aún.";
  return docs.map((d) => `### ${d.title}\n${d.content?.slice(0, 800)}`).join("\n\n");
}

interface DataSummary {
  summaryText: string;
  evidence: Record<string, unknown>;
}

interface MetricRow {
  engagement_rate: number | null;
  likes: number | null;
  reach: number | null;
  impressions: number | null;
  proposals: { format: string | null; is_test: boolean | null } | null;
}

interface SuccessRuleRow {
  rule_type: string;
  action: { reason?: string } | null;
  confidence: number;
  evidence: string | null;
}

interface RunLogErrorRow {
  source: string;
  step: string;
  error: string | null;
  created_at: string;
}

async function gatherDataSummary(): Promise<DataSummary> {
  const now = new Date();
  const nowIso = now.toISOString();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysFromNowIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgoIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const [metricsRes, rulesRes, runLogErrorsRes, scheduledRes, publishedRes] = await Promise.all([
    supabase
      .from("metrics")
      .select("engagement_rate, likes, reach, impressions, proposals(format, is_test)")
      .order("measured_at", { ascending: false })
      .limit(30),
    supabase
      .from("success_rules")
      .select("rule_type, action, confidence, evidence")
      .gte("confidence", 0.6)
      .order("confidence", { ascending: false })
      .limit(5),
    supabase
      .from("run_log")
      .select("source, step, error, created_at")
      .eq("status", "error")
      .gte("created_at", fortyEightHoursAgoIso)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("proposals")
      .select("id")
      .eq("status", "scheduled")
      .gte("scheduled_at", nowIso)
      .lte("scheduled_at", sevenDaysFromNowIso),
    supabase
      .from("proposals")
      .select("id")
      .eq("status", "published")
      .gte("published_at", sevenDaysAgoIso),
  ]);

  const realMetrics = ((metricsRes.data as MetricRow[] | null) || []).filter((m) => !m.proposals?.is_test);
  const avgEngagement =
    realMetrics.length > 0
      ? realMetrics.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / realMetrics.length
      : null;

  const rules = (rulesRes.data as SuccessRuleRow[] | null) || [];
  const runLogErrors = (runLogErrorsRes.data as RunLogErrorRow[] | null) || [];
  const scheduledCount = scheduledRes.data?.length || 0;
  const publishedCount = publishedRes.data?.length || 0;

  const evidence = {
    realMetricsCount: realMetrics.length,
    avgEngagement,
    learnedRulesCount: rules.length,
    runLogErrorsLast48h: runLogErrors.length,
    scheduledNext7Days: scheduledCount,
    publishedLast7Days: publishedCount,
  };

  const lines = [
    `Métricas reales disponibles: ${realMetrics.length} (filas de prueba excluidas).`,
    avgEngagement !== null
      ? `Engagement promedio real: ${Math.round(avgEngagement * 100) / 100}%.`
      : "Todavía no hay métricas reales para calcular un promedio.",
    rules.length > 0
      ? `Reglas aprendidas con confianza >= 60%: ${rules
          .map((r) => r.action?.reason || `${r.rule_type} (${r.evidence || "sin evidencia registrada"})`)
          .join(" | ")}`
      : "Todavía no hay reglas aprendidas con confianza suficiente (rule-engine necesita al menos 5 métricas reales para producir algo).",
    runLogErrors.length > 0
      ? `${runLogErrors.length} error(es) real(es) en el pipeline en las últimas 48hs: ${runLogErrors
          .slice(0, 3)
          .map((e) => `${e.source}/${e.step}`)
          .join(", ")}.`
      : "Sin errores registrados en el pipeline en las últimas 48hs (run_log).",
    `${scheduledCount} pieza(s) agendada(s) para los próximos 7 días. ${publishedCount} publicada(s) en los últimos 7 días.`,
  ];

  return { summaryText: lines.join("\n"), evidence };
}

const ADVICE_SYSTEM_PROMPT = `Sos el Copiloto Reflexivo de MejoraOK — el asistente que ayuda a Pablo a interpretar sus propios datos de contenido (métricas, reglas aprendidas, salud del pipeline) y a pensar mejor sus próximos pasos. Tono argentino, directo, cercano, como alguien de confianza que conoce el negocio — nunca un reporte corporativo genérico. Regla innegociable: nunca inventes una cifra ni un dato que no te haya dado el usuario en el contexto — si la evidencia real es insuficiente para un consejo con sustancia, decilo con franqueza en vez de rellenar con genérico.`;

interface AdviceResult {
  advice_date: string;
  content: string;
  evidence: Record<string, unknown>;
  cached: boolean;
}

async function getOrGenerateAdvice(): Promise<AdviceResult> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("copilot_advice")
    .select("advice_date, content, evidence")
    .eq("advice_date", today)
    .maybeSingle();

  if (existing) {
    return { ...existing, cached: true };
  }

  const { summaryText, evidence } = await gatherDataSummary();
  const contextDocs = await getContextDocs("consejo estratégico de contenido basado en resultados reales");

  const userText = `DATOS REALES DE HOY:\n${summaryText}\n\nDOCUMENTOS DE MARCA:\n${contextDocs}\n\nEscribí un "consejo del día" breve (2 a 4 frases) para Pablo, basado ÚNICAMENTE en los datos reales de arriba. Si son insuficientes para un consejo con sustancia real, decilo con franqueza en vez de rellenar con algo genérico.`;

  const content = await callAI(ADVICE_SYSTEM_PROMPT, [{ role: "user", content: userText }], 0.7);

  const { data: inserted, error: insertError } = await supabase
    .from("copilot_advice")
    .insert({ advice_date: today, content, evidence })
    .select("advice_date, content, evidence")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existingRace } = await supabase
        .from("copilot_advice")
        .select("advice_date, content, evidence")
        .eq("advice_date", today)
        .single();
      if (existingRace) return { ...existingRace, cached: true };
    }
    throw new Error(`Error guardando el consejo del día: ${insertError.message}`);
  }

  return { ...inserted, cached: false };
}

const CHAT_SYSTEM_PROMPT = `Sos el Copiloto Reflexivo de MejoraOK — el asistente que ayuda a Pablo a interpretar sus propios datos de contenido y a pensar mejor sus próximos pasos. Tono argentino, directo, cercano — como charlar con alguien de confianza que conoce el negocio, no un informe. Regla innegociable: nunca inventes una cifra ni un dato que no esté en el contexto que te dan — si la pregunta pide algo que los datos no cubren, decilo explícitamente. Respuesta breve y concreta: esto es un chat, no un informe largo.`;

async function runChat(question: string, history: { role: string; content: string }[]): Promise<string> {
  const { summaryText } = await gatherDataSummary();
  const contextDocs = await getContextDocs(question);

  const system = `${CHAT_SYSTEM_PROMPT}

DATOS REALES DE HOY:
${summaryText}

DOCUMENTOS DE MARCA:
${contextDocs}`;

  const messages = [
    ...history.map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
    { role: "user", content: question },
  ];

  return callAI(system, messages, 0.6);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return unauthorizedResponse(auth, corsHeaders);

  const startedAt = Date.now();
  let action: string | undefined;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    action = body.action as string | undefined;

    let result: { cached?: boolean; answer?: string } | undefined;

    switch (action) {
      case "advice": {
        result = await getOrGenerateAdvice();
        break;
      }

      case "chat": {
        validateBody(body, ["question"]);
        const question = body.question as string;
        const history = Array.isArray(body.history)
          ? (body.history as { role: string; content: string }[]).slice(-10)
          : [];
        const answer = await runChat(question, history);
        result = { answer };
        break;
      }

      default:
        throw new Error("Acción no válida. Usa 'advice' o 'chat'");
    }

    await logRun({
      source: "copilot",
      step: action,
      status: "success",
      durationMs: Date.now() - startedAt,
      metadata: action === "advice" ? { cached: result?.cached } : {},
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = errorMessage(e);
    await logRun({
      source: "copilot",
      step: action || "unknown",
      status: "error",
      durationMs: Date.now() - startedAt,
      error: msg,
    });
    const status = msg.includes("Campos requeridos") ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

**`src/hooks/useCopilot.ts`** (íntegro):

```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCopilotAdvice, sendCopilotMessage, type CopilotChatMessage } from "@/services/ai";

export function useCopilotAdvice() {
  return useQuery({
    queryKey: ["copilot-advice"],
    queryFn: getCopilotAdvice,
    staleTime: 60 * 60 * 1000, // cacheado por fecha en el backend, no hace falta refetch agresivo
  });
}

// Chat stateless (ver migración 015): el historial vive acá, en memoria del
// componente — no hay sesión persistida en el backend, cada mensaje manda
// el historial completo (acotado a los últimos 10 turnos, igual que hace
// el backend con lo que le llega).
export function useCopilotChat() {
  const [messages, setMessages] = useState<CopilotChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isSending) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setIsSending(true);
    setError(null);

    try {
      const { answer } = await sendCopilotMessage(trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error consultando al copiloto");
    } finally {
      setIsSending(false);
    }
  }

  return { messages, sendMessage, isSending, error };
}
```

---

## Parte 8 — Fase 5: Un solo panel, y una decisión de no reescribir a ciegas (2026-08-17)

Con la Fase 4 cerrada, tocaba la Fase 5: "absorber hub/, biblioteca/, dashboard/ como rutas del EDA React". A diferencia de la Fase 4, este titular no tenía ningún detalle de diseño detrás — era la frase de intención original, sin más. Antes de escribir una sola línea, se leyeron los tres sitios completos: hub/index.html (194 líneas), dashboard/index.html (483 líneas) y toda la Biblioteca (app.js con 1375 líneas, github.js con 122, styles.css con 477, seed-demo.js con 86 — casi 2100 líneas en total).

La lectura cambió el plan de ejecución. hub/ resultó ser casi trivial: cinco tarjetas estáticas, cada una apuntando directo a la interfaz de subida de archivos de GitHub para una carpeta de content/inbox/ distinta — sin estado, sin lógica propia, sin nada que romper al portarlo. dashboard/ era más sustancial pero seguía siendo de solo lectura: trae el historial real desde Zernio (vía historial.json, ya sincronizado por otro proceso) y arma tarjetas con insignias de estado por red social, más links a los workflows de GitHub Actions que permiten reintentar o despublicar algo — nunca ejecuta una acción real por sí mismo, todo pasa por "copiá este ID, andá a Actions, corré el workflow a mano". Ninguna de las dos herramientas tenía nada que pusiera en riesgo real un port fiel a React.

La Biblioteca era otra historia. Es una aplicación de una sola página escrita en JavaScript puro — sin React, sin ningún framework — con manipulación directa del DOM, HTML armado como strings con manejadores de eventos en línea, y un estado global mutable que se reescribe entero en cada render. Cubre una línea de tiempo completa de las piezas de contenido, un calendario editorial, carga rápida de fotos, sesiones en bloque después de un evento, un compositor de piezas con reposicionamiento de imagen por arrastre, categorías y álbumes editables, y un tutorial interactivo. Y, más importante que el tamaño: escribe de verdad al repositorio. Usa un token personal de GitHub, guardado únicamente en el almacenamiento local del navegador de quien lo usa, para comitear cada foto cargada directo a content/inbox/. Es, además, la herramienta que Pablo usa activamente todos los días para organizar el material que alimenta las Stories — no un experimento, no algo secundario.

Reescribir mil trescientas setenta y cinco líneas de una aplicación imperativa a React idiomático, en una sola pasada nocturna, sin ninguna forma de probar el camino más delicado — el commit real contra GitHub, que necesita el token real de Pablo funcionando en su propio navegador, la misma limitación que ya apareció varias veces a lo largo de este proyecto — no era una mejora que valiera el riesgo. Una regresión silenciosa ahí significaría que Pablo intente cargar una foto un día cualquiera y descubra que algo se rompió, sin que nadie lo haya visto venir. Así que la decisión fue otra: la Biblioteca se integra al panel del EDA embebiendo la página tal cual existe hoy, dentro de un iframe, sin tocar una sola línea de su código. Cero riesgo funcional — sigue siendo exactamente la misma herramienta que ya funciona, ahora alcanzable sin salir del panel principal ni recordar una URL distinta.

hub/ y dashboard/, en cambio, sí se portaron a React de verdad, como rutas nuevas del EDA — /hub y /monitor —, replicando el comportamiento exacto de los originales: los mismos textos, los mismos links, el mismo criterio de colores para cada estado, el mismo aviso especial para Instagram (que no permite despublicar por su API, a diferencia de Facebook), los mismos tres workflows de gestión enlazados. En ningún caso se ejecuta una acción real desde el nuevo panel — los botones de reversión siguen abriendo GitHub Actions en una pestaña nueva, donde Pablo tiene que confirmar escribiendo la palabra exacta que el sistema pide.

Ninguna de las tres páginas originales se tocó ni se dio de baja. hub/index.html, dashboard/index.html y biblioteca/index.html siguen desplegadas exactamente donde estaban, funcionando igual que ayer — se confirmó en vivo contra el sitio real después del deploy, navegando a cada una: la Biblioteca mostrando las mismas quince piezas de ejemplo de siempre, el hub con las mismas cinco tarjetas y el mismo texto. "Un solo panel" se resolvió sumando una puerta de entrada nueva, no cerrando las que ya existían — quien prefiera entrar directo por la URL del hub (pensado, a propósito, para subir una foto rápido desde el celular sin tener que iniciar sesión en ningún lado) sigue pudiendo hacerlo exactamente igual que siempre.

La verificación de este cambio se hizo con las herramientas que sí estaban disponibles: una revisión estricta de tipos con el compilador de TypeScript en modo de solo verificación, que no encontró ningún error en los tres archivos nuevos; el lint del proyecto, que se mantuvo en los mismos cuarenta y cuatro errores preexistentes de siempre, ninguno nuevo; la batería completa de sesenta y un tests, que siguió pasando entera; y un build de producción limpio. Después del despliegue, se navegó al sitio real para confirmar que el login del EDA seguía cargando sin errores nuevos en la consola, y que las tres páginas estáticas originales respondían exactamente con el mismo contenido de antes. Lo que no se pudo confirmar fue el comportamiento de las tres rutas nuevas (/hub, /monitor, /biblioteca) dentro de una sesión real y autenticada del EDA, porque el inicio de sesión pide un código que llega al correo de Pablo — la misma limitación de siempre, ya documentada varias veces en este mismo proyecto. Esa parte de la verificación queda a nivel de código, tipos y build, no de una captura de pantalla real de la pantalla logueada.

Con la Fase 5 cerrada, queda una sola fase del plan original: la Fase 6, "vendible a terceros" — multi-tenant mínimo, el Criterio Medular como flujo de onboarding, auditoría exportable. Es, de las seis, la que más se aleja de ser una mejora técnica sobre lo que ya existe y más se acerca a ser una decisión de negocio real: convertir una herramienta pensada y construida para una sola marca en un producto que otros clientes puedan usar. La autorización de Pablo para seguir sin consultar sigue vigente, así que el trabajo continúa — pero con la misma vara aplicada en las cinco fases anteriores: diseñar con criterio, no ejecutar el titular a ciegas, y dejar dicho por escrito cada decisión real que se tome en el camino.

---

## Parte 9 — Fase 6: dónde termina la autonomía técnica y empieza una decisión de Pablo (2026-08-17)

La última fase del plan tenía tres piezas en el titular original: multi-tenant mínimo, el Criterio Medular como flujo de alta para un cliente nuevo, y auditoría exportable. Antes de tocar código, valía la pena pensar qué tipo de decisión era cada una, porque no eran del mismo tipo — y esta sesión venía sosteniendo, fase tras fase, la misma disciplina de verificar antes de confiar, incluso en el propio criterio, no solo en los números ajenos de Lovable.

La auditoría exportable era, de las tres, una mejora técnica pura: agregar una pantalla que exporte a CSV o JSON los datos operativos reales del sistema — las propuestas generadas, las métricas reales, las reglas que aprendió el motor, el registro de corridas que dejó la Fase 3 — para que existan afuera de la base, por si hace falta una copia, una revisión externa, o simple transparencia. No tocaba seguridad, no tocaba el modelo de datos existente, era reversible con solo borrar la ruta, y se podía verificar exactamente igual que cualquiera de las fases anteriores. Se construyó completa: una utilidad genérica de exportación sin dependencias nuevas, una nueva forma de traer el registro de corridas desde el servicio ya existente, y una pantalla con un botón por cada fuente de datos más un export combinado. Todo corriendo del lado del cliente, sin necesitar ninguna función nueva del backend.

El multi-tenant era otra cosa completamente distinta, y pensarlo con cuidado cambió la forma de actuar. Convertir un sistema de un solo cliente — con datos reales, ya en producción, sirviendo el negocio real de Pablo — a un sistema que acepte múltiples organizaciones no es una fase técnica más en una lista: es reescribir el modelo de seguridad completo. Cada tabla del sistema necesitaría una columna nueva para identificar a qué organización pertenece cada fila, y la función que hoy decide quién es administrador tendría que dejar de ser una lista plana de emails para convertirse en un esquema real de membresías por organización. Un error en esa lógica de aislamiento no es un bug cualquiera que se corrige al día siguiente — es la posibilidad real de que los datos de una organización se filtren a otra, con el propio negocio de Pablo como el primero expuesto si algo saliera mal.

Y no termina en lo técnico. "Vendible a terceros" significa, en los hechos, aceptar los datos de otras empresas — lo que trae consigo una superficie legal y de cumplimiento real: términos de servicio, garantías de aislamiento, qué pasa si alguien pide que se borren sus datos. Ninguna de esas son decisiones técnicas que corresponda tomar en nombre de Pablo mientras él duerme, por más autonomía que se haya delegado para el resto del trabajo. El tercer punto del titular original, el Criterio Medular como flujo de alta para un cliente nuevo, tampoco tenía sentido construirlo aislado: solo cobra sentido si existe una base real de multi-tenant debajo — construirlo antes sería trabajo que después se tira o se rehace por completo.

Había además una razón más práctica y más alineada con todo lo que ya se venía haciendo en este proyecto: ninguna de las fases anteriores se dio por cerrada sin probarla contra la base real, y varias veces esta sesión evitó a propósito sembrar datos de prueba en la base de producción, incluso datos falsos e identificables, cuando existía otra forma más segura de verificar. No hay forma real de comprobar que el aislamiento entre organizaciones funciona sin un segundo tenant de prueba — y crear uno en la base real de Pablo, aunque fuera con datos inventados, es exactamente el tipo de riesgo que esta sesión viene evitando con cuidado desde el principio.

Así que la decisión fue no avanzar a ciegas. No es una negativa a seguir trabajando — es la misma vara de "verificar antes de confiar" aplicada, esta vez, al propio criterio y no solo al de Lovable. Quedó documentada en `CLAUDE.md` una recomendación concreta para cuando Pablo la quiera mirar: antes de tocar una sola línea de seguridad, decidir si el objetivo real es tener varias marcas propias funcionando en paralelo o un producto comercial con clientes externos reales — porque cambia todo el diseño, desde el aislamiento de datos hasta si hace falta cobrar. Ninguna de esas preguntas tiene una respuesta técnica; son decisiones de negocio que le corresponden a él.

Con esto, de las seis fases del plan estratégico original, cinco quedaron cerradas de punta a punta y la sexta quedó parcialmente hecha, con la pieza pausada documentada con el razonamiento completo, no simplemente descartada en silencio. Todo el trabajo de esta noche —observabilidad real, el copiloto reflexivo, el panel unificado, y ahora la auditoría exportable— quedó, cada pieza, deployada en producción, verificada contra datos reales cuando fue posible, commiteada, pusheada, y documentada acá y en `CLAUDE.md`, exactamente con el mismo estándar que se sostuvo desde la primera fase de esta sesión.

---

## Parte 10 — Revisión de Pablo tras las 6 fases, y siete correcciones reales (2026-08-17)

Con las seis fases del plan estratégico cerradas, Pablo revisó el resultado en producción y volvió con una lista concreta de siete puntos, más un pedido de investigar mejoras y sistemas parecidos, bajo el mismo régimen de autonomía de siempre: que se ejecutara todo sin pausar a preguntar, documentando cada paso para poder retomar si la sesión se cortaba. El primer paso, como en cada ronda anterior de este proyecto, fue confirmar en una sola frase que el pedido se había entendido bien antes de arrancar — Pablo respondió "coincidimos, empezá a trabajar" y ahí arrancó la ejecución real.

Antes de tocar código, valía la pena entender qué pedía cada punto de verdad, porque varios no eran lo que parecían a primera lectura.

El primer punto — agregar datos de prueba reales, con imágenes y publicaciones reales, para ver el sistema funcionando de verdad — llevó a revisar el estado real de la base antes de fabricar nada. La sorpresa fue que el sistema no estaba vacío: ya había cinco posts de feed reales publicados (carruseles reales generados por Mesa de Diálogo, con imágenes reales) y veintiocho stories reales en el historial, desde principios de agosto. El hueco real era mucho más chico de lo que parecía: dos de esos cinco posts nunca habían tenido una fila de métricas. Se disparó el recolector de métricas real contra Zernio, sin inventar ningún número, y apareció un hallazgo genuino: esos dos posts puntuales seguían en estado "sincronización pendiente" once días después de publicados, cuando lo normal —documentado y probado antes en este mismo proyecto— es que eso se resuelva en una o dos horas. Es una anomalía real del lado de Zernio para esos dos posts específicos, no algo que haya que arreglar acá; quedó anotada, no resuelta, porque no hay nada de este lado que corregir. De paso apareció algo más: un análisis real de Instagram y Facebook, hecho en una sesión anterior a partir de exports oficiales de Meta Business Suite e IconSquare, ya estaba integrado en el Dashboard como una sección de conclusiones reales con evidencia citada — no hacía falta ir a buscar datos nuevos, ya estaban ahí, solo no se sabía que ya se habían usado. Se decidió explícitamente no fabricar propuestas o métricas sintéticas que parecieran reales: este proyecto viene sosteniendo con cuidado, desde hace semanas, la distinción entre datos reales y datos de prueba, e inventar contenido de demo que se vea como real habría roto esa disciplina justo cuando más importaba mantenerla.

El segundo punto preguntaba si convenía seguir en GitHub Pages y GitHub Actions o mudar la parte pesada a Vercel, a Hostinger, o a más Supabase. Se investigó en profundidad, con fuentes reales, en paralelo al resto del trabajo. La conclusión fue clara: quedarse donde está. GitHub Pages y Actions no tienen riesgo real de límites mientras el repositorio siga siendo público. Vercel, que parecía la alternativa obvia, resultó tener una letra chica importante: su plan gratuito es explícitamente no comercial, así que cualquier proyecto que genere ingresos reales —como este— necesitaría el plan pago, veinte dólares por mes como mínimo, no gratis como se asumía. El motor de renderizado de imágenes, que usa Playwright con un navegador Chromium real, tampoco tiene a dónde mudarse mejor: ni Supabase ni Deno Deploy permiten correr un navegador completo dentro de sus funciones. Hostinger no aportaba nada nuevo. Pero la investigación sí encontró algo que generó una corrección real: el servicio que GitHub usa para servir contenido crudo de un repositorio tiene caídas documentadas y recurrentes —cientos de incidentes en el último año, con outages mayores casi una vez por semana en el peor mes— y eso resultó ser, confirmado en vivo contra el panel de estado de GitHub, exactamente lo que le había pasado a Pablo minutos antes con el error del Monitor.

Los puntos tres y cuatro pedían repensar en profundidad la pantalla de "Subir material", especialmente el concepto de "oferta", y reemplazar el link que llevaba a la interfaz cruda de subida de GitHub por una pantalla propia. Antes de rediseñar nada a ciegas, se armó un documento de trabajo —un artifact interactivo, con la identidad visual real de la marca y las mismas tipografías que usa el resto del sistema— para que Pablo y Sindy lo revisen juntos. El documento muestra exactamente cómo se programó el concepto hasta ahora: cinco categorías fijas que vienen del Manual de Marca, cada una mapeada a una carpeta del repositorio, usadas por la inteligencia artificial para orientar el tono del texto que genera. Después plantea cinco preguntas concretas que, desde afuera, no tenían una respuesta clara: si "oferta" es lo mismo que "dimensión de marca" o son dos ideas distintas que se estaban mezclando, si las cinco categorías alcanzan o hay fotos que no encajan bien en ninguna, quién debería decidir la categoría de cada foto. Y cierra con dos caminos de diseño concretos según cómo respondan, para que la conversación no quede en el aire. Mientras tanto, la pantalla de subida se reconstruyó de verdad: ya no manda a la interfaz cruda de GitHub, ahora es una pantalla propia del panel, con selector de oferta, arrastrar y soltar, y dos grillas reales que muestran lo que está pendiente y lo que ya se usó en cada carpeta — más un link directo al Monitor para poder seguir la foto hasta que se convierte en una publicación real. El cliente que habla con la API de GitHub se pasó a código propio del panel, reusando exactamente la misma clave de almacenamiento del navegador que ya usaba la Biblioteca — como las dos páginas viven en el mismo dominio, conectar la sesión de GitHub en una deja conectada la otra automáticamente, sin tener que iniciar sesión dos veces.

El quinto punto pedía que todas las secciones quedaran interrelacionadas, para poder seguir una pieza de punta a punta desde cualquier lado. El alcance que se cubrió fue concreto, no exhaustivo: ahora se puede abrir el detalle de una propuesta directo desde una URL, y el Monitor enlaza a la propuesta real de cada publicación que tiene ese dato, además del link que ya se había agregado desde la nueva pantalla de subida hacia el Monitor. Se puede seguir una foto real desde que se sube, hasta que se convierte en propuesta, hasta que se publica, cruzando pantallas sin tener que buscarla a mano en cada una.

El sexto punto era el error concreto que Pablo había visto: el Monitor no podía cargar el historial, "Failed to fetch". Se diagnosticó con evidencia real, no con una suposición: el servicio de GitHub que serví­a ese archivo tenía, en ese momento exacto, un incidente real y documentado —confirmado contra el panel de estado oficial de GitHub, y confirmado también probando con un archivo de un repositorio completamente ajeno, que fallaba exactamente igual—. La solución no fue parchear con reintentos y listo: se atacó la causa de fondo. El historial ahora se guarda en una tabla propia dentro de la base de datos del sistema, actualizada por los mismos procesos automáticos que ya sincronizaban el archivo antes, y el Monitor —además de una parte del Dashboard que dependía de la misma fuente— empezó a leer de ahí en lugar de depender de un servicio externo con caídas conocidas. El archivo original en el repositorio se sigue actualizando en paralelo, porque todavía lo necesita el panel de monitoreo estático de siempre, que no tiene sesión iniciada contra la base de datos. Se probó de verdad, no en teoría: se disparó la sincronización real con el código nuevo y la tabla quedó poblada con las veintiocho filas reales del historial completo.

El séptimo punto era la Biblioteca: Pablo reportó que no cargaba nada, solo "una carita triste". No se pudo reproducir el problema exacto sin tener su sesión real de navegador — se revisó con cuidado si el sitio estaba bloqueando el embebido con alguna configuración de seguridad, y no era eso, los encabezados reales del servidor confirmaron que no había ningún bloqueo de ese tipo. En vez de asumir que el embebido siempre va a funcionar y dejarlo como estaba, la pantalla se rediseñó para no depender ciegamente de él: ahora hay un botón grande y visible, "Abrir Biblioteca", que abre la herramienta real en su propia pestaña — probado y confirmado que funciona siempre — y el embebido dentro del panel quedó como una opción secundaria y opcional, con detección de que tardó demasiado y un botón para recargarlo, en vez de quedarse en blanco sin ninguna explicación.

Por último, la investigación de mercado pedida aparte confirmó algo que vale la pena que Pablo sepa con precisión: publicar contenido de forma completamente autónoma, sin que una persona apruebe cada pieza antes de salir —que es exactamente lo que hace este sistema desde hace semanas— es genuinamente atípico en el mercado de 2026. El consenso de la industria es que un humano tiene que estar en el medio del proceso, con cadenas de aprobación de varias personas antes de que algo se publique; ninguna de las herramientas comerciales relevadas publica sola de la forma en que lo hace este sistema. El debate entre tres agentes de inteligencia artificial con roles distintos, que se corrigen entre sí antes de aprobar una pieza, tampoco tiene un equivalente comercial directo — existe como patrón de arquitectura técnica, pero no como función que se pueda comprar hoy en ninguna herramienta de marketing revisada. Lo que sí es estándar en el mercado y todavía falta acá: más plataformas más allá de Instagram y Facebook (LinkedIn tendría más sentido que TikTok dado el perfil de la marca), una bandeja unificada para responder comentarios y mensajes directos, reglas que no solo se aprendan sino que se apliquen activamente, y comparación contra el rendimiento de cuentas competidoras. Quedan como ideas para el futuro, no como trabajo de esta ronda — responden a construir algo nuevo, no a corregir lo que Pablo señaló.

---

## Parte 11 — El Taller respondido en vivo, y un hallazgo urgente que no estaba en la lista (2026-08-17)

Pablo y Sindy no se limitaron a leer el artifact del Taller de la Oferta — lo respondieron ahí mismo, en el chat, en el momento, exactamente como estaba pensado. Cinco respuestas reales, concretas, sin vueltas.

A la pregunta de si "oferta" era lo mismo que "dimensión del Manual de Marca", la respuesta fue directa: el concepto de "oferta" resultaba confuso, preferían llamarlo "Dimensión del servicio que se desea mostrar". A la pregunta de en qué piensan primero al subir una foto, las dos respuestas no coincidieron del todo — Sindy piensa en el servicio concreto ("esto es del servicio de team building"), Pablo piensa en la dimensión ("Dimensión del Servicio que se desea mostrar") — una diferencia real entre dos personas que van a usar la misma herramienta, que quedó anotada tal cual, sin forzar una única respuesta donde había dos genuinas. A la pregunta de si las cinco categorías alcanzaban, apareció el hallazgo más concreto de los cinco: no, había un tipo de contenido que no encajaba en ninguna — las reuniones con socios, los nuevos proyectos, las invitaciones, el After Office de la marca — y la pregunta que se devolvió fue si hacía falta una sexta categoría, "Sociales". A la pregunta de si un servicio nuevo debería nacer como una sexta oferta, la respuesta fue que la lista de servicios debía quedar estática por ahora, ya verían cómo evolucionaba en el futuro. Y a la última pregunta, quién debería decidir la dimensión de cada foto, la respuesta fue clara y corta: que el sistema proponga.

Las cinco respuestas se tradujeron a cambios reales, esa misma noche. "Oferta" se renombró a "Dimensión del servicio" en todo el texto que ve un humano —el selector de Subir material, el selector de reprogramar una propuesta— sin tocar el nombre técnico interno de la columna en la base de datos ni el de las carpetas del repositorio, porque el problema era de vocabulario, no de estructura. Se agregó una sexta categoría, "Sociales", en las seis listas reales del código donde hacía falta —incluida una edición puntual y acotada dentro del archivo de la Biblioteca, sin tocar el resto de esa aplicación, respetando la misma decisión de no reescribirla que se había tomado en la fase anterior—, con una salvedad pensada a propósito: esa categoría quedó deliberadamente afuera de la rotación automática que usa Mesa de Diálogo para elegir temas de carruseles, porque Sociales depende de que haya pasado un evento real, no es algo que un agente de inteligencia artificial deba poder inventar en automático sin ningún hecho real detrás. La lista se dejó fija, sin construir una pantalla de administración de categorías que hoy nadie necesita. Y para la última respuesta, se construyó una función nueva, con visión real de Claude, que mira la foto que se está por subir y sugiere una dimensión con un motivo — la pantalla de subida ahora espera esa sugerencia antes de guardar nada, con la dimensión ya pre-seleccionada y el humano confirmando o corrigiendo, en vez de subir directo.

Fue al probar esa función nueva contra producción, real, que apareció algo que no estaba en la lista de nadie. La función devolvió un error real de Anthropic: la cuenta había llegado a su límite de uso, y no lo recuperaría hasta el primero de septiembre. No era un error de la función recién construida — era un límite real de la cuenta completa. Y antes de anotarlo como una curiosidad aislada, se cruzó contra el registro real de corridas del sistema, y apareció la confirmación que le daba a este hallazgo una urgencia distinta: la story diaria de ese mismo día, la corrida real del cron de las diez y media de la mañana, había fallado exactamente por lo mismo. La pieza autónoma más antigua y más probada de todo este proyecto —la que lleva corriendo sola desde julio, la que se usa como la vara contra la que se mide el resto— se había quedado sin generar nada, en silencio, ese mismo día.

Se hizo lo que sí se podía hacer sin necesitar nada de Pablo: el script que genera el copy de las stories ahora cae a Groq cuando Anthropic falla, con el mismo patrón ya probado en otras dos partes del sistema — pero solo para el caso sin foto, porque no hay ningún modelo de visión de Groq que se haya podido verificar como confiable, y arriesgar un resultado de visión sin poder revisarlo hubiera sido peor que no tener fallback. Lo que no se podía hacer sin Pablo quedó dicho con total claridad, sin maquillarlo: la clave de Groq para que ese fallback funcione todavía no existe como secreto de GitHub Actions —solo existe del lado de Supabase—, así que el código ya está listo pero apagado hasta que él la agregue. Y para las stories que sí llevan foto, que son la mayoría, no hay fallback posible todavía — van a seguir sin poder generarse hasta que se resuelva el límite de la cuenta de Anthropic de un lado o del otro, algo que ya no es una decisión técnica sino de cuenta y de facturación, y que le corresponde a Pablo, no a esta sesión.

Con esto, la sección del proyecto que había arrancado como "revisemos el concepto de oferta juntos" terminó revelando, de pura casualidad, el hallazgo más urgente de toda la noche — uno que no tenía nada que ver con la pregunta original, pero que ninguna otra parte del trabajo de esta sesión hubiera sacado a la luz si no se hubiera probado la función nueva contra producción real, en vez de darla por buena solo porque el código compilaba.

---

## Parte 12 — "Continuemos": tres frentes sueltos, uno elegido, un pendiente cerrado (2026-08-18)

La sesión arrancó con una sola palabra, "Continuemos", sin más contexto — la orden permanente del proyecto dice que eso significa retomar desde el estado documentado en `CLAUDE.md`, sin volver a explicar nada. Pero antes de asumir que había una fase abierta esperando, valía la pena mirar el estado real del repositorio, y ahí aparecieron tres piezas sueltas que no estaban reflejadas en la documentación.

La primera: un archivo con un brief completo y ya cerrado de rediseño de interfaz para todo el sistema — Panel principal, Propuestas, Calendario, la fusión de Mesa de Diálogo con el Laboratorio, el cambio de nombre de la Bóveda a Manual de Identidad de Marca, y un ruteo automático de inteligencia artificial en Configuración — acompañado de dos archivos comprimidos que parecían traer el sistema de diseño real de la marca. Una parte de ese brief, el ruteo automático de modelo por agente, ya se había hecho semanas atrás; el resto del rediseño visual no aparecía ejecutado en ningún lado. La segunda: un script nuevo, sin documentar, pensado para cargar la clave de Zernio en los tres lugares donde el sistema la necesita de una sola vez. La tercera: el hallazgo urgente que ya estaba en la documentación desde el día anterior — la cuenta de Anthropic había llegado a su límite de uso, la story diaria se había quedado sin generar contenido ese mismo día, y quedaba pendiente cargar la clave de Groq como secreto de GitHub Actions para activar el resguardo que ya estaba escrito en el código.

Ninguno de los tres frentes estaba indicado con claridad en la sola palabra "Continuemos", y el proyecto tiene como norma no inventar qué insumo aplica sin que la persona lo traiga de forma expresa a la conversación — así que se le preguntó directamente cuál de los tres retomar. La respuesta fue cerrar el incidente de Anthropic.

Al investigar el estado real antes de tocar nada, apareció una sorpresa: la clave de Groq ya estaba cargada como secreto de GitHub Actions, con una marca de tiempo de esa misma madrugada — alguien, fuera de esta conversación, ya lo había resuelto después de que se escribiera la nota pendiente en la documentación. El flujo de trabajo automático ya la referenciaba en el paso correcto. La corrida fallida más reciente que se pudo confirmar contra el registro real de ejecuciones había ocurrido antes de que existiera tanto el arreglo de código como la clave cargada — no era evidencia de que el resguardo actual fallara, era la corrida de antes de que la pieza estuviera completa. Y las carpetas donde se dejan las fotos pendientes por cada dimensión de marca estaban todas vacías en ese momento, lo que significaba que la próxima corrida automática, programada para el mediodía, iba a generar una historia de solo texto — exactamente el caso que el resguardo con Groq sabe cubrir, sin necesitar visión.

Se decidió no forzar esa corrida a mano para comprobarlo antes de tiempo — dispararla habría significado arriesgar una publicación real solo para adelantar una prueba, el mismo criterio de cautela que este proyecto viene sosteniendo en cada instancia parecida desde hace semanas. En su lugar, se actualizó la documentación con lo que sí estaba confirmado — la clave ya cargada, el pendiente formalmente cerrado — dejando explícito, sin maquillarlo, que la confirmación real de que la corrida del mediodía funcionó todavía no existía al momento de escribir esto, no porque faltara trabajo, sino porque la hora del cron todavía no había llegado. Los otros dos frentes que habían aparecido al principio —el rediseño completo de interfaz y la rotación de la clave de Zernio— quedaron exactamente donde estaban, sin tocar, porque no fueron el camino elegido en esta ronda.

Horas más tarde, dentro de la misma conversación, Pablo volvió con la pregunta directa: si ya funcionaba al cien por ciento. La respuesta honesta exigía volver a mirar el registro real de ejecuciones, no repetir lo que se había dicho antes con confianza prestada — y esa vez el cron del mediodía ya había corrido. Había fallado de nuevo, pero por un motivo completamente distinto al del día anterior. El resguardo hacia Groq sí se había activado esta vez, tal como estaba pensado, pero Groq respondió que el modelo pedido no existía. Al revisar la documentación oficial del proveedor apareció la explicación completa: ese modelo había sido retirado de verdad dos días antes, con un reemplazo oficial ya indicado. Y no era un problema aislado del guion de la historia diaria — el mismo nombre de modelo estaba escrito a mano en otras dos partes del sistema, el orquestador de Mesa de Diálogo y el copiloto reflexivo del panel, así que el resguardo hacia Groq llevaba dos días roto en silencio en los tres lugares al mismo tiempo, justo mientras la cuenta principal seguía sin poder usarse por el límite de uso.

Se corrigió el nombre del modelo en los tres archivos, se volvieron a desplegar las dos funciones del panel que hacía falta actualizar, y antes de darlo por resuelto se armó una prueba real y acotada: una llamada al chat del copiloto reflexivo, la misma vía de siempre para probar cosas sin arriesgar nada, aprovechando que la cuenta principal seguía bloqueada y que eso iba a forzar el mismo camino de resguardo que usan los tres puntos del sistema. La respuesta llegó con éxito real — el copiloto contestó, de forma coherente con su propia regla de no opinar sobre lo que no puede confirmar con datos reales, que no tenía forma de verificar el funcionamiento del resguardo, sin saber que su propia respuesta exitosa ya lo estaba demostrando. Confirmado eso, se retiró la prueba temporal, como siempre se hace apenas cumple su función.

Quedó un pendiente real, dicho con la misma honestidad que el resto de esta sesión: el mecanismo general ya se probó en vivo, pero el camino específico de la historia diaria recién se va a poder confirmar de punta a punta con la corrida real del día siguiente, porque tampoco esta vez se forzó una publicación real solo para adelantar la prueba.

---

## Parte 12 — El documento que se vació solo, y todo lo que pasó mientras nadie lo veía (2026-08-19/20)

La sesión se retomó el 20 de agosto con una frase simple: que se continuara desde donde había quedado. Pero lo primero que apareció al mirar el estado real del repositorio no fue una continuación tranquila — fue una señal de que había pasado mucho más de lo que la memoria inmediata de la conversación alcanzaba a cubrir. El historial de commits llegaba hasta un mensaje fechado dos días después de la última acción recordada, con entradas sobre pruebas de Mesa de Diálogo, sobre un modelo de Groq que había dejado de existir, sobre fuentes tipográficas reales agregadas. Nada de eso estaba en la memoria de la conversación en curso.

Antes de asumir nada, se leyó el archivo de documentación del proyecto — y ahí apareció el problema real: tenía apenas veintiocho líneas, el contenido genérico de una plantilla compartida entre todos los proyectos, no las casi novecientas líneas específicas de este uno que se habían construido con tanto cuidado durante toda la sesión anterior. Se rastreó el historial de ese archivo puntual y apareció el momento exacto: un commit hecho directamente por Pablo, sin pasar por esta conversación, titulado simplemente "sincronizar CLAUDE.md", que en los hechos había reemplazado casi novecientas líneas de contexto real del proyecto por el texto corto de una plantilla compartida — con toda apariencia de haber sido un accidente, probablemente una herramienta o un hábito de sincronizar esa plantilla entre repositorios que en este caso pisó el archivo equivocado en vez de solo actualizar una sección.

La buena noticia, encontrada al revisar qué más se había visto afectado: el archivo de transcripción completa de la sesión, el que registra todo en prosa corrida, nunca se tocó. Seguía intacto, con casi cinco mil líneas, y ahí estaba contada con detalle la historia completa de lo que había pasado en el medio — incluido un episodio real que la documentación corta ya alcanzaba a insinuar pero que solo la transcripción completa explicaba del todo: el resguardo hacia Groq, que se había armado para cubrir a la cuenta principal mientras esa tenía su propio límite de uso agotado, resultó estar roto también, por una razón completamente distinta y hasta graciosa en su ironía — el modelo específico que se le pedía a Groq había sido retirado de verdad por el proveedor, con fecha de baja dos días antes de que se descubriera el problema, y el reemplazo ya estaba anunciado oficialmente. El nombre del modelo viejo estaba escrito a mano en tres lugares distintos del sistema, así que el resguardo llevaba roto en los tres al mismo tiempo, en silencio, justo durante la ventana en la que más falta hacía.

Se corrigió el nombre del modelo en los tres lugares, se volvió a desplegar lo que hacía falta, y se probó en vivo antes de darlo por bueno — la misma disciplina de siempre. Con eso resuelto, y con el archivo de documentación real ya restaurado a partir del último commit bueno que sí seguía disponible en el historial de git, tocaba reconstruir todo lo que había pasado después de ese punto, porque ahí es donde el archivo se había vaciado antes de que alguien alcanzara a escribir la nota de continuidad correspondiente.

Se armó esa reconstrucción cruzando dos fuentes que nunca mienten: el registro real de corridas del sistema, y el propio historial de git con sus mensajes de commit. De ahí salió una imagen bastante mejor de lo que parecía al principio. La cuenta de Anthropic, que se esperaba bloqueada hasta el primero de septiembre, había recuperado el acceso mucho antes — Pablo había subido el límite de gasto por su cuenta, y la primera llamada real de visión después de eso, confirmada contra el registro del sistema, había funcionado. La story diaria del día anterior se había generado y publicado sola, de punta a punta, sin ningún fallo — la primera corrida completa y real desde que había empezado todo el incidente. Y Pablo mismo había pedido, en algún momento de esas horas sin registro directo en esta conversación, una prueba real de punta a punta de la Mesa de Diálogo con un tema de verdad, no inventado — y esa prueba también había funcionado: los tres agentes debatieron, el crítico aprobó, y el sistema agendó solo un carrusel real y completo sobre un tema de liderazgo y reuniones improductivas, con el copy entero ya escrito y aprobado.

Ese carrusel, sin embargo, seguía esperando sin publicarse más de veinte horas después de su horario agendado — no por ningún error nuevo, sino porque la pausa de publicación automática de posts y carruseles que Pablo mismo había pedido hacía dos semanas seguía activa, exactamente como se documentó en su momento que se iba a comportar. Quedó anotado como lo que es: una pieza real, aprobada, esperando una decisión humana, no un bug.

Apareció también, en el medio de todo esto, una pieza sin relación directa con el incidente pero igual de real: las tipografías reales de la marca, las mismas que se habían dejado pendientes semanas atrás por no tener los archivos convertidos, finalmente llegaron — Pablo trajo el paquete actualizado de identidad de marca, se convirtieron los archivos al formato que necesita la web, y se confirmó en vivo que cargan bien en las dos plantillas de render. Un pendiente viejo, cerrado sin que hiciera falta pedirlo de nuevo.

Con todo eso reconstruido y confirmado contra evidencia real —no contra lo que decía un mensaje de commit aislado, que en al menos un caso había quedado desactualizado por el mismo apagón de contexto que se estaba reparando—, se reescribió el archivo de documentación completo: la base restaurada desde el último commit bueno, más una sección nueva contando en detalle todo este episodio, desde el vaciado accidental hasta el estado real confirmado al día de hoy. Vale la pena decirlo con la misma llaneza que el resto de esta sesión: perder ese archivo no fue solo perder texto — en algún momento de las horas sin registro, otra instancia de trabajo autónomo tuvo que volver a descubrir desde cero un hallazgo que ya se había hecho antes, simplemente porque no tenía dónde leer que ya estaba resuelto. No causó ningún daño real, pero es la prueba concreta, no teórica, de por qué este documento importa tanto como la propia base de datos del sistema.

---

*Fin de la transcripción hasta este punto. Se actualiza en paralelo cada vez que se actualiza `CLAUDE.md`, por dogma explícito de Pablo del 2026-08-08.*

Con el archivo restaurado y la ronda de recuperación documentada, Pablo pidió publicar a mano el carrusel real que había quedado esperando desde la prueba de Mesa de Diálogo. Se disparó el workflow de publicación programada — publicó de verdad en Instagram y en Facebook, con identificadores y URLs reales de las dos plataformas. Hasta ese punto, todo se comportó exactamente como está documentado que debía comportarse.

El resultado publicado, sin embargo, era malo, y Pablo lo señaló con una captura de pantalla real y en términos directos: la imagen del carrusel tenía texto amontonado, y la leyenda pública de Instagram y Facebook mostraba literalmente las etiquetas internas de guion — "Slide 1 (Portada)", "Slide 2", y así sucesivamente — algo que nunca debía llegar a verse, y un copy mucho más largo de lo que correspondía a una pieza pensada para leerse en segundos. La queja fue textual y dura: que parecía hecho por un robot y no por un diseñador gráfico, que sobraba texto en cada slide cuando alcanzaba con una frase y una imagen ilustrativa, y que el copy era larguísimo.

La causa real, investigada antes de tocar nada, no fue un capricho de la IA sino un hueco real en el diseño del prompt: el Agente Creativo nunca había recibido instrucciones distintas para carrusel que para post — se le pedía simplemente "el copy completo", sin aclarar el formato de salida. Cuando el Estratega recomendaba una estructura de varias slides (algo que hace seguido, es parte legítima de cómo arma una estrategia), el Creativo la seguía al pie de la letra y escribía un guion de producción completo, con encabezados de slide y notas de rol — perfectamente razonable si un diseñador humano fuera a leerlo e interpretarlo antes de armar la pieza, pero inútil y hasta dañino para un renderizador completamente automático, que no tiene ningún humano en el medio y que además trituraba ese texto por oraciones sueltas sin filtrar ninguna de esas etiquetas.

El arreglo se hizo en dos frentes, no como un parche cosmético sobre el síntoma. En el origen, dentro del orquestador, se agregó una detección del formato recomendado apenas el Estratega termina su turno — antes recién se sabía el formato al final de todo el proceso — y ese dato se le pasa ahora al Creativo, que para carrusel recibe instrucciones explícitas de escribir líneas cortas ya listas para el renderizador, sin encabezados de slide ni numeración, en vez de un guion de producción. Como salvavidas adicional, el renderizador de posts programados se reescribió para reconocer esa notación de slide si en algún momento vuelve a aparecer, y en ese caso limpiarla en vez de trocear el texto a ciegas por oraciones — un texto por slide, no un párrafo entero; la primera slide queda como el gancho solo, sin repetir la misma frase como subtítulo debajo. La leyenda pública del carrusel dejó de repetir el cuerpo completo del texto (las propias slides ya lo muestran) y quedó reducida a gancho, llamado a la acción y hashtags. De paso se sacó una duplicación menor pero real: la misma palabra de la oferta aparecía dos veces en cada slide, una vez como pastilla visual y otra vez como texto de apoyo idéntico.

La corrección se probó localmente contra el texto real que había causado el problema — no contra un caso inventado — confirmando una salida limpia antes de desplegar nada. Deliberadamente no se volvió a disparar una prueba real de punta a punta de Mesa de Diálogo para confirmar el arreglo, porque hacerlo hubiera significado arriesgar otra publicación real solo para verificar — exactamente el mismo patrón de riesgo que había producido el incidente original. La verificación quedó a nivel de la lógica real, probada contra el texto real que falló, más las comprobaciones de estilo, tipos, pruebas automáticas y compilación, todas limpias.

Sobre la pieza ya publicada y defectuosa, Pablo resolvió el problema más rápido de lo que cualquier automatización hubiera podido: la borró él mismo, directo desde las aplicaciones de Instagram y de Facebook. El sistema se actualizó después para reflejar esa realidad — la propuesta correspondiente pasó de figurar como publicada a figurar como rechazada, con el motivo real anotado, y la acción manual quedó registrada para las dos plataformas a través del mecanismo ya existente para este tipo de casos, que hasta ese momento solo contemplaba Instagram como opción — se le agregó Facebook, la primera vez que hacía falta de verdad.

Al revisar ese registro contra lo que mostraba el panel de monitoreo, apareció un segundo bug real, menor pero genuino: la pantalla solo mostraba el aviso de "gestionado a mano" cuando la plataforma de publicación reportaba una falla — pero en este caso la plataforma nunca se enteró de que Pablo había borrado el post directo desde las aplicaciones, así que seguía informando que todo seguía publicado, y el panel seguía mostrando el ícono verde de éxito indefinidamente, sin ninguna forma de saber que ya no era así. Se corrigió para que cada fila de plataforma consulte el registro de acciones manuales sin importar lo que informe la plataforma de publicación — si existe un registro manual, se muestra tachado con la fecha real en que se gestionó, en lugar del ícono de éxito.

Los tres cambios de este episodio —el arreglo del pipeline de carruseles, la ampliación del mecanismo de registro manual a Facebook, y la corrección del panel de monitoreo— quedaron cada uno confirmado con las mismas verificaciones de siempre, comiteados y desplegados.

Con el episodio del carrusel ya documentado, Pablo cambió de tema con un pedido urgente y concreto: necesitaba saber en qué estado real estaba todo el proyecto, y qué faltaba para ponerlo a producir hoy mismo — tenía una gran cantidad de material pendiente para cargar y quería que el sistema lo procesara respetando, como siempre, la identidad de marca real de MejoraIdentidad.

Antes de responder con supuestos, se hizo un barrido real del estado del sistema: el registro de ejecuciones sin ningún error desde varios días atrás, ninguna propuesta atascada en estados intermedios, las seis carpetas de material pendiente completamente vacías, y todos los procesos automáticos corriendo en verde. Con esa base confirmada, se le devolvió a Pablo un panorama honesto: la parte que genera stories automáticamente a partir de fotos ya estaba probada de punta a punta y lista para absorber material apenas se cargara; el cuello de botella real era que los dos caminos para cargar fotos en volumen necesitaban un token personal de GitHub que solo él podía generar, nunca probado con su sesión real; y, más importante, la publicación automática de posts y carruseles seguía pausada desde hacía más de dos semanas, justo después de que el arreglo del bug del guion crudo nunca se hubiera vuelto a probar en producción.

Ante la pregunta directa de si reactivar esa publicación automática ahora que el arreglo ya estaba hecho, Pablo eligió el camino más prudente: probarlo primero de forma supervisada, en vez de confiar a ciegas. Dado que la elección del tema de una sesión de Mesa de Diálogo sigue siendo, por decisión ya tomada hace tiempo, algo que solo Pablo define, se le preguntó qué tema quería usar para la prueba — y eligió que se tomara un ángulo real basado en uno de los perfiles de público ya documentados en la Bóveda, sin inventar nada fuera de ese criterio.

Se corrió entonces una sesión real de Mesa de Diálogo con un tema construido sobre el perfil del Emprendedor Saturado, pidiendo explícitamente formato carrusel para forzar el mismo camino de código que había fallado la vez anterior. El resultado fue revelador en dos sentidos a la vez: el cuerpo del copy salió completamente limpio, sin ningún rastro de las etiquetas de guion que habían arruinado la pieza anterior — confirmando que el arreglo funcionaba con contenido generado de verdad, no solo con el texto de prueba armado a mano — pero el Crítico rechazó la propuesta de todos modos, por un motivo distinto y completamente real: el llamado a la acción no usaba el texto exacto que la marca tiene aprobado, mezclaba una frase pensada para conversaciones privadas con el llamado institucional del carrusel. Fue una confirmación valiosa de que el Crítico sigue evaluando con precisión real contra el criterio de marca, no solo contra la estructura del texto.

Se corrigió el llamado a la acción y se le pidió al sistema una segunda vuelta sobre la misma sesión — esta vez aprobada, sin objeciones. Ahí apareció una limitación de diseño real, ya existente y a propósito: continuar una sesión nunca inserta una propuesta nueva en la base ni la agenda automáticamente, es un freno de seguridad pensado para que corregir el rumbo de una conversación nunca dispare una publicación por accidente. Como consecuencia, la ronda aprobada no dejó ningún rastro que se pudiera renderizar. Para poder probar el resto del recorrido sin inventar nada, se reconstruyó a mano exactamente la misma inserción que el sistema hubiera hecho solo si esa aprobación hubiera llegado en la primera vuelta — mismo cálculo real de qué categoría le tocaba por rotación y qué horario le correspondía, con el contenido real ya aprobado por el Crítico real, sin fabricar ningún dato.

Con esa propuesta agendada de verdad, se armó un paso intermedio pensado para no correr ningún riesgo innecesario: renderizar las imágenes reales sin publicarlas todavía, para poder mirarlas antes de arriesgar cualquier cosa pública. El resultado se le mandó a Pablo directamente: cuatro imágenes, una frase corta por lámina, sin ninguna etiqueta de guion visible, sin la repetición que antes duplicaba el nombre de la categoría, con el llamado a la acción exacto. Con la prueba visual ya confirmada, Pablo tomó las dos decisiones que quedaban pendientes: que se publicara esa pieza de verdad, ya que era contenido real y aprobado, no algo para descartar; y que se reactivara el cron automático de publicación.

Se disparó la publicación real — salió en Instagram y en Facebook, confirmado contra la base con el identificador real del post — y se volvió a descomentar el disparador automático que había quedado pausado desde principios de agosto. Desde ese momento, cualquier propuesta de post o carrusel que el Crítico apruebe en una sesión real de Mesa de Diálogo vuelve a publicarse sola, sin que nadie la revise antes, exactamente como estaba pensado el diseño original de autonomía total. Lo único que sigue siendo una decisión exclusivamente humana, como desde el principio, es elegir con qué tema arrancar cada conversación.

Apenas reactivada la publicación automática, Pablo miró con atención las cuatro imágenes reales del carrusel de prueba que se le habían mandado, y volvió con correcciones concretas sobre el diseño, numeradas una por una. La primera: que el diseño fuera idéntico en las cuatro láminas, todas iguales — porque la portada usaba una tipografía grande y las tres siguientes usaban una mucho más chica y gris, y el conjunto se veía como dos piezas distintas pegadas una atrás de la otra en vez de una sola pieza coherente. La segunda: que la cuarta lámina del carrusel no fuera, que la pieza cerrara en la tercera. La tercera era distinta de las dos anteriores — no era una corrección puntual sobre esta pieza, sino un pedido de memoria permanente para cualquier cierre futuro parecido a esa cuarta lámina: regla dura, nunca agresivo, y pidió expresamente que se observaran los valores y el tono documentados en la identidad de marca antes de asumir nada. La cuarta terminaba de explicar el motivo: no se trataba de evitar la venta agresiva por evitarla, sino de entender que lo correcto era empatizar y ofrecer ayuda de forma abierta. Cerró preguntando, directo, si se entendía y qué se había entendido.

Antes de tocar una sola línea de código, se fue a buscar el manual de marca real —no a suponer el tono, sino a leerlo— y ahí apareció, textual, exactamente el mismo criterio que Pablo acababa de nombrar: que el tono nunca es agresivo, que señala sin atacar, que no genera urgencia artificial, que no vende sino que clarifica; y el posicionamiento de la marca descripto como "padrino, no proveedor" — la lógica no es que la marca le ofrezca algo a alguien a cambio de algo, es al revés, es el otro quien necesita acercarse. Con eso confirmado, se le devolvió a Pablo un resumen de las cuatro correcciones entendidas, explicando además que el problema real no había sido el texto del llamado a la acción en sí —que ya era el texto oficial aprobado por la marca, confirmado dos veces por el Crítico real en la sesión anterior— sino la puesta en escena: una lámina entera dedicada solamente a pedir la acción, aislada de todo el resto del contenido, se lee como venta aunque la frase sea impecable.

Se corrigió entonces el código que arma las láminas de cualquier carrusel futuro: todas pasaron a usar el mismo estilo tipográfico grande que antes solo tenía la portada, y se eliminó por completo la lámina dedicada al llamado a la acción — ese llamado sigue existiendo, pero solo en el texto que acompaña la publicación, nunca como una pieza visual propia. Como consecuencia directa de sacar esa lámina, también se bajó el límite total de láminas de cuatro a tres, porque de lo contrario el lugar que dejaba libre la lámina de cierre se hubiera llenado con más cuerpo de texto en vez de terminar la pieza más corta, como se había pedido explícitamente.

La corrección se probó con una pieza real, marcada a propósito como una prueba y nunca conectada al flujo de publicación automática, usando el mismo contenido que ya había aprobado el Crítico real en la sesión anterior. Se renderizaron las imágenes sin publicarlas y se revisaron una por una: tres láminas, mismo estilo tipográfico en las tres, sin ninguna cuarta lámina de cierre. Apenas confirmado el resultado visual, la propuesta de prueba se sacó de inmediato del estado de agendada, para que el cron recién reactivado no llegara a publicarla por error en el rato que tardara en revisarse.

En el medio de esa prueba apareció, sin buscarlo, un problema real de otro origen: el nombre con el que el sistema guarda cada imagen renderizada dependía de la posición dentro de una corrida de render, no de a qué propuesta pertenecía. Como en el día ya se habían hecho dos corridas distintas —la publicación real de la mañana y esta prueba de diseño— y las dos habían sido, cada una, la única propuesta pendiente en su momento, las dos terminaron usando exactamente el mismo nombre de archivo. La segunda corrida pisó en silencio, dentro del repositorio, las imágenes de la pieza que ya se había publicado de verdad horas antes en Instagram y Facebook. Se detectó revisando con cuidado qué había cambiado antes de guardar nada —la misma disciplina de nunca confiar un guardado amplio sin mirar antes qué quedó adentro, ya aplicada varias veces en este proyecto—, se recuperaron las cuatro imágenes originales desde el historial de versiones, confirmando que coincidían exactamente en tamaño con las que se habían revisado al principio, y se corrigió la causa real: el nombre de archivo ahora incluye una porción del identificador único de cada propuesta, así que dos corridas de render nunca más van a poder pisarse entre sí, sin importar cuántas pasen el mismo día.

Por último, quedó guardada una memoria permanente, fuera de este repositorio, con la regla de que ningún cierre de una pieza de esta marca puede quedar aislado en su propio espacio pidiendo la acción — siempre integrado, siempre desde el lugar de ofrecer ayuda, nunca desde el de vender.

Con el episodio del diseño del carrusel cerrado, Pablo cambió de tema con un pedido de dos partes bien distintas: primero, que se tuviera en cuenta y quedara guardado en memoria un dato concreto sobre el formato correcto de cualquier post de feed; segundo, que ese mismo dato se agregara además, textual, a la skill de marca — con una referencia externa real que citó completa. El dato era preciso: todo post debe ser vertical, formato 4:5, con un lienzo de 1080 por 1350 píxeles, y una zona segura central donde va todo el texto importante, dejando al menos 80 píxeles de margen arriba y abajo, y unos 60 a cada lado, lo que deja un área útil de aproximadamente 1000 por 1270 píxeles libres.

Antes de tocar nada, se fue a leer el archivo real de la skill de marca para entender su estructura y su tono, y se agregó ahí una sección nueva, en el mismo estilo del resto del documento, con el lienzo, los márgenes y la referencia citada, aclarando que aplica a cualquier post de feed y no a las historias, que tienen su propio formato vertical distinto.

Pero el pedido no se quedó solo en la skill. El sistema real de MejoraSM todavía renderizaba los posts en formato cuadrado, uno por uno, desde el principio del proyecto — y al revisar el prototipo de diseño que ya se había aprobado hacía tiempo, apareció algo revelador: ese prototipo ya especificaba exactamente el mismo formato vertical que Pablo acababa de pedir, con el mismo tamaño de lienzo. No era una decisión nueva, era una corrección de algo que se había aprobado pero nunca se había terminado de implementar. Con esa confirmación, se corrigió el archivo de plantilla real y el script que lo renderiza para que coincidieran con el formato correcto, ajustando también la posición de los elementos visuales para respetar los márgenes pedidos.

Al armar una prueba real para confirmar el cambio con imágenes de verdad, apareció algo que no se esperaba: un marco de color alrededor del diseño que no formaba parte de ninguno de los cambios hechos en esta conversación. Revisando el propio comentario dejado en el código, quedó claro que ese marco venía de otra sesión de trabajo, corriendo en paralelo sobre el mismo repositorio, a partir de un comentario distinto que Pablo le había hecho sobre que el texto se perdía en demasiado espacio en blanco. Ese cambio había llegado solo, sin conflicto, al traer las últimas novedades del repositorio antes de guardar el trabajo propio. No se tocó ni se deshizo — se verificó con cuidado que el marco de esa otra sesión y el nuevo formato vertical convivieran bien juntos, sin que ningún elemento se recortara o se superpusiera, y quedó anotado con claridad que este repositorio tiene más de una sesión trabajando al mismo tiempo, así que cualquier verificación futura tiene que mirar el estado real de los archivos y no asumir que una sola conversación es la única fuente de cambios.

La corrección se probó con dos piezas reales marcadas a propósito como prueba, una simple y una en formato carrusel, renderizadas sin publicarse — el resultado confirmó el lienzo correcto, los márgenes respetados, y el marco de la otra sesión integrado sin problemas. Las dos piezas de prueba se sacaron de inmediato del estado de agendadas para que el sistema de publicación automática, ya reactivado, no llegara a publicarlas por error, y se borraron apenas confirmado el resultado. Por último, quedó guardada una memoria permanente con el dato del formato correcto, apuntando a la skill de marca como la fuente completa para no duplicar el mismo contenido en dos lugares distintos.

Pablo pidió, en un mensaje corto, un carrusel de muestra que se pudiera revisar juntos. Con el diseño recién corregido —formato vertical, márgenes de zona segura, láminas parejas, sin cierre aislado— tenía sentido probarlo con contenido nuevo y real, no reciclar lo ya usado. Se eligió un ángulo real basado en otro de los perfiles de público documentados en la marca, distinto a los que ya se habían usado en pruebas anteriores, y se corrió una sesión real de Mesa de Diálogo. El Crítico aprobó en la primera vuelta, sin objeciones.

Ahí apareció un detalle importante de cómo funciona el sistema: apenas una propuesta se aprueba en la primera ronda, el propio sistema la agenda sola para publicarse, y como la publicación automática ya estaba reactivada desde antes en esta misma conversación, esa pieza iba a salir de verdad a Instagram y Facebook dentro de los quince minutos siguientes si no se hacía nada. Como el pedido explícito había sido una "muestra para revisar", no contenido para publicar a ciegas, se la sacó del estado de agendada en el mismo minuto en que se creó, y se la volvió a poner en ese estado solo el tiempo mínimo necesario para cada corrida de renderizado, sacándola de nuevo apenas terminaba cada vez — la misma precaución que ya se había usado varias veces antes en esta conversación, aplicada ahora también a este otro camino del sistema que hasta entonces no se había necesitado cuidar de la misma forma.

Al revisar las primeras tres imágenes generadas, apareció un problema real que no se había visto en ninguna prueba anterior: dos de las tres láminas terminaban a mitad de una frase, con una preposición colgando y puntos suspensivos, como si el texto se hubiera cortado en cualquier lugar sin mirar dónde caía. La causa era un límite de dieciséis palabras que recortaba en seco sin respetar dónde terminaba una idea. No había aparecido antes en esta conversación porque el contenido usado en las pruebas anteriores tenía frases más cortas — esta vez, con contenido real y nuevo, las frases eran un poco más largas y el límite las cortaba justo antes de una palabra que no podía quedar sola.

Se corrigió el criterio de corte: en vez de cortar siempre a la misma cantidad fija de palabras sin mirar el contenido, ahora se busca la última coma dentro de un límite más generoso y se corta ahí, dejando una idea completa en vez de una frase rota; solo si no hay ninguna coma cerca del límite, cae al corte anterior como respaldo. Se probó primero contra las cuatro frases reales de esa misma pieza antes de volver a tocar nada del pipeline real: las dos que habían fallado ahora entraban completas, y una tercera, más larga, cortaba limpio justo en una coma real, sin dejar nada colgando.

Con el arreglo confirmado en el papel, se volvió a renderizar exactamente la misma pieza real, con el mismo cuidado de sacarla del estado de agendada apenas terminaba cada corrida. El resultado esta vez fue limpio: las tres láminas completas, sin ningún corte a mitad de frase, con el mismo diseño uniforme y el marco ya presente de la otra sesión conviviendo bien con todo lo demás. Las imágenes finales se le mandaron a Pablo para que las mirara — la pieza quedó guardada en un estado pendiente, sin publicarse, a la espera de que él decida si sale o no.

Con las tres láminas ya corregidas y mandadas para revisión, Pablo respondió corto y directo: sin marco rojo. Se sacó del archivo de plantilla el bloque que dibujaba ese borde alrededor de la variante sin foto — el mismo que había llegado, sin que nadie lo pidiera en esta conversación, desde otra sesión que trabajaba en paralelo sobre el mismo repositorio. Se dejó intacto el resto de lo que esa otra sesión había cambiado, en particular que el pie de página quedara siempre anclado abajo del todo en vez de moverse según cuánto texto hubiera arriba, porque eso seguía siendo una mejora válida independiente del marco.

Se volvió a renderizar la misma pieza real una tercera vez, con el mismo cuidado de sacarla del estado de agendada apenas terminaba la corrida, para no arriesgar que el sistema de publicación automática la tomara antes de tiempo. El resultado se confirmó visualmente sin el marco y se le volvió a mandar a Pablo. La pieza sigue guardada, sin publicarse, esperando su decisión.

Con el marco ya afuera, el problema real que ese marco había intentado tapar seguía sin resolverse: cuando una lámina tenía poco texto, quedaba demasiado espacio en blanco sin peso visual. Pablo pidió una propuesta de diseño de verdad, siguiendo el manual de marca real, y que además se auditara con el criterio de una revisión de marca independiente antes de mostrarla.

Se armaron tres caminos distintos, los tres probados con imágenes reales, sin tocar la base de datos ni el sistema de publicación — solo mockups locales con el mismo lienzo y el mismo texto real ya usado. El primero no agregaba nada nuevo, solo movía el bloque de texto más arriba para que el blanco de abajo se sintiera como un respiro en vez de un vacío — el más fiel al estilo de siempre, pero el que menos resolvía el problema de fondo. El segundo agregaba una línea fina de color en el margen izquierdo, una aplicación bastante literal de la regla de que el color se usa como detalle, nunca como fondo. El tercero ponía el isotipo real de la marca, el trazo hecho a mano, enorme y casi transparente, como una firma de fondo — el más distintivo, pero el que más estiraba el uso del logo más allá de lo que el manual tenía escrito hasta ese momento, porque ahí el isotipo siempre se pensó como logo identificador, nunca como textura decorativa.

Al principio se explicó todo esto en una tabla técnica, y Pablo pidió que se lo explicara de otra forma, más simple, porque no lo estaba pudiendo leer así. Se lo volvió a contar en unas pocas frases, sin tecnicismos, con la recomendación puesta en la segunda opción por ser la más segura. Pablo eligió, sin dudarlo y remarcándolo dos veces, la tercera: el isotipo de fondo. Pidió además que esa decisión quedara escrita en la skill del manual de marca, para que valiera como regla real y no como una excepción de una sola vez.

Al ponerse a implementarlo apareció, sin buscarlo, un hallazgo bastante más grande que el problema que se estaba resolviendo. Para decidir cómo insertar la imagen del isotipo en la plantilla real, hubo que revisar cómo el sistema carga los archivos durante el renderizado — y ahí quedó al descubierto que la forma en que el sistema arma cada imagen nunca pudo, en ningún momento desde que se habían agregado las fuentes reales de la marca varias semanas atrás, cargar esa fuente de verdad. La comprobación fue directa y reproducible: al consultar el estado real de las fuentes cargadas en el navegador contra la plantilla real, la fuente aparecía marcada con error; y al mirar qué pedidos de red se habían intentado, no había ninguno — el archivo de la fuente ni siquiera se había llegado a pedir, porque la ruta con la que estaba escrita nunca podía resolverse en el contexto en el que corre el renderizado. En la práctica, esto significaba que cada título y cada firma de marca publicados desde que se agregó la fuente real habían salido, en silencio, con la fuente de respaldo en lugar de la fuente real de la marca — sin que nadie lo hubiera notado, y contradiciendo lo que en su momento se había dado por confirmado.

La solución fue la misma que ya se usaba para las fotos de cada pieza: en vez de dejar la fuente como un archivo aparte que había que ir a buscar, se la incrustó directo adentro del archivo de la plantilla, codificada de una forma que no necesita ninguna ruta que resolver. Se confirmó después, con la misma comprobación técnica de antes, que la fuente ya cargaba de verdad. Se aplicó el mismo arreglo tanto en la plantilla de los posts como en la de las historias, ya que las dos tenían exactamente el mismo problema.

El isotipo de fondo se agregó de la misma manera, incrustado directo en el archivo, apareciendo solo en la variante de las piezas que no tienen foto real detrás — que es exactamente donde vivía el problema del vacío. La decisión de Pablo quedó documentada en la skill del manual de marca, dejando explícito que es un uso nuevo del logo, distinto del uso como logo identificador, y que fue una decisión real tomada ese día, no algo que ya estuviera permitido de antes.

Todo se probó dos veces antes de darlo por bueno: una vez local, contra la plantilla real tal cual queda guardada en el repositorio, y otra vez a través del sistema real que corre en producción, disparando manualmente el paso de renderizado sobre la misma pieza de muestra ya usada antes, con el mismo cuidado de siempre de sacarla del estado de agendada apenas terminaba, para que el sistema de publicación automática no llegara a tocarla. Las dos pruebas confirmaron lo mismo: la fuente real cargando, el isotipo de fondo visible, y el resto del diseño sin ningún cambio no buscado.

Pablo pidió una pieza nueva para publicar, esta vez con la aprobación ya dada por adelantado: que se armara un texto distinto, y que en cuanto quedara aprobado por el sistema real se publicara directamente, sin pasar por una revisión intermedia como las veces anteriores. Se corrió una sesión real de Mesa de Diálogo con un ángulo distinto a los ya usados —esta vez sobre alguien que trabaja mucho pero no ve el resultado reflejado en la caja— y el Crítico aprobó en la primera vuelta. La pieza se publicó de verdad en Instagram y Facebook, la primera con el diseño ya cerrado semanas atrás funcionando en un caso real de producción, no de prueba.

Enseguida llegó un pedido distinto y más ambicioso sobre el cierre de los carruseles: volver a tener una lámina final dedicada, pero que esta vez lograra dos cosas a la vez — que generara impacto e hiciera pensar a quien la viera, y que invitara de forma directa a escribir o comunicarse. Con la instrucción explícita de no copiar literalmente lo que se le había dicho como ejemplo, sino pensarlo en profundidad e investigar antes de proponer. Antes de escribir una sola palabra, se fue a buscar el manifiesto real de la marca dentro de la base de conocimiento, no a inventar desde la memoria — y ahí apareció, casi textual, la frase que terminó siendo la base real de la propuesta: la idea de cargar solo con el peso de decisiones que nadie más ve. Se armó una propuesta combinando esa frase de impacto con una invitación directa y de bajo compromiso a escribir, se mostró, y la respuesta fue una aprobación entusiasta con una instrucción de alcance mayor: que ese estilo quedara memorizado como el estándar para todo cierre futuro, no solo para esa pieza puntual.

Esa decisión quedó guardada como memoria permanente, con la explicación completa de por qué ese estilo funciona y de dónde sale cada parte, y se implementó como una plantilla fija dentro del sistema real que arma los carruseles — no generada de nuevo por la inteligencia artificial en cada pieza, para no arriesgar que la calidad varíe, sino siempre la misma combinación ya aprobada. El carrusel volvió a tener cuatro láminas: el gancho, dos de contenido, y esta nueva lámina de cierre fija.

Con eso resuelto, llegó el pedido más grande de esta etapa: una revisión completa y minuciosa de toda la interfaz del sistema, para poder empezar a usarla en serio de una vez — con foco especial en tres cosas concretas: subir fotos, programar contenido, y cargar el criterio de marca. El pedido venía con instrucciones claras: revisar con el nivel de detalle más obsesivo posible, resolver lo que se encontrara de forma autónoma sin pedir permiso en cada paso, investigar en profundidad para llegar a los mejores resultados posibles, y al final presentar todo en un lenguaje simple y operativo para que se pudiera aprobar y empezar a trabajar de una vez.

Para cubrir un alcance tan grande en un tiempo razonable, se lanzaron cuatro revisiones en paralelo, cada una mirando una parte distinta del sistema real con instrucciones de leer el código completo y anotar cada hallazgo con su ubicación exacta, sin inventar problemas que no estuvieran ahí. Una se dedicó al camino de subir fotos, otra al de programar contenido y conversar con los agentes de inteligencia artificial, otra a la bóveda de conocimiento y la pantalla de configuración, y la última al monitor de publicaciones, la biblioteca, la navegación general y el inicio de sesión. Las cuatro terminaron con hallazgos reales y concretos, algunos bastante serios.

El más urgente: la aplicación era prácticamente inutilizable desde un teléfono, porque el menú lateral estaba fijo y le comía casi toda la pantalla angosta, sin ninguna versión pensada para ese tamaño. Se corrigió armando un menú desplegable que se abre con un botón, reutilizando piezas que ya estaban construidas en el proyecto pero nunca conectadas, y se escribió una prueba automática real que confirma que ese menú se abre, muestra todas las secciones, y se cierra solo al navegar.

El segundo hallazgo grave tenía que ver con cargar documentos de marca a la bóveda de conocimiento: subir un PDF o un Word no funcionaba de verdad, aunque el sistema lo aceptara sin quejarse. Por dentro, se estaba tratando ese archivo como si fuera texto plano, lo que sobre un archivo binario real produce basura ilegible — y esa basura se guardaba, se trozaba, y se usaba como si fuera contenido real de marca, sin que nadie se enterara nunca de que estaba roto. Se agregaron dos herramientas reales de extracción, una para PDF y otra para Word, pensadas para funcionar en el mismo entorno restringido donde corre esa parte del sistema. La primera prueba real, con un PDF y un Word armados a mano con texto conocido, reveló que la herramienta de Word esperaba el archivo en un formato ligeramente distinto al que se le estaba pasando — se corrigió, y la segunda prueba confirmó que los dos formatos ahora se leen de verdad, con el texto exacto que se había puesto adentro, sin ninguna corrupción.

De paso apareció un problema relacionado: el sistema no tenía forma real de distinguir un documento que se procesó bien de uno que falló a mitad de camino — todos se veían iguales, marcados como "procesado", aunque por dentro les faltara el paso de generar los vectores que permiten buscarlos por significado. Se agregó un estado real, guardado paso a paso, para que la pantalla muestre la verdad de cada documento, con un botón para reprocesar el que haya quedado a medias.

Otro hallazgo importante: cuando se aprobaba una idea en la mesa de diálogo con los agentes, y esa aprobación disparaba la publicación automática sin revisión previa, la pantalla no avisaba nada de eso — quien aprobaba se enteraba recién si iba a buscarlo a otra pantalla. Ahora aparece un aviso inmediato y una tarjeta que se queda guardada explicando cuándo va a salir esa pieza y con un acceso directo para cancelarla si hace falta.

Relacionado con eso, se encontró que si la conversación entre los tres agentes de inteligencia artificial se cortaba a mitad de camino por una falla real de los servicios que la sostienen, la sesión quedaba congelada para siempre en un estado que se veía idéntico a una conversación que sigue en curso ahora mismo, sin ninguna manera de saber que en realidad se rompió. Se corrigió para que ese tipo de falla quede marcada de forma clara y visible, y se probó de verdad, con una llamada real, que el sistema sigue funcionando bien después del cambio.

En el camino de subir fotos aparecieron varios problemas más: no había ninguna forma de reconectar la credencial de acceso a GitHub el día que venciera, algo que va a pasar sí o sí con el tiempo — ahora se puede volver a conectar tocando el mismo indicador que muestra el estado de la conexión. Tampoco se distinguía si esa credencial tenía permiso real de escritura o solo de lectura, lo que hacía que se aceptara como válida una conexión que en realidad iba a fallar en cada intento de subida. Y el más delicado: si alguien confirmaba subir una segunda tanda de fotos mientras la primera todavía estaba en proceso, el sistema mezclaba el resultado visual de una tanda con la otra, mostrando como exitosa o fallida una foto que no tenía nada que ver. Se reescribió toda esa lógica con una cola de verdad, y se armó una prueba automática que reproduce exactamente ese escenario forzado —una subida atascada a propósito mientras se confirma una segunda tanda en el medio— confirmando que ahora las fotos conviven sin pisarse entre sí. También se corrigió que los errores de subida desaparecían solos después de un par de segundos sin importar si habían fallado, y se agregó un botón para reintentar una foto puntual que no existía en ningún lado hasta ahora.

Se revisó también la pantalla de configuración de los agentes, donde aparecían opciones para elegir proveedor y modelo de inteligencia artificial que en realidad no tienen ningún efecto desde hace semanas, porque el sistema real siempre elige el modelo automáticamente — sin que la pantalla lo dijera en ningún lado. Se agregó un aviso explícito, y se habilitó edición real del texto que sí define el comportamiento de cada agente, que hasta ahora solo se podía cambiar escribiendo directo en la base de datos.

En el panel de monitoreo se encontró que la opción de marcar una publicación como "gestionada a mano" para Facebook usaba el identificador equivocado, el mismo tipo de error que ya se había corregido antes para un caso parecido con Instagram — se corrigió ofreciendo los dos identificadores por separado, cada uno con su uso real explicado. Se corrigió también que las miniaturas de los posts de feed se recortaban con la proporción pensada para historias, y que la pantalla de error cuando alguien entra a una dirección que no existe usaba un enlace que no funcionaba bien con el sistema de rutas del sitio, además de estar en inglés.

Se encontró que dos consultas centrales a la base de datos no tenían ningún límite explícito, y el motor que las atiende corta en mil filas por defecto sin avisar — no afecta hoy porque el volumen real todavía es chico, pero tanto el panel principal como la exportación de auditoría dependían de ese mismo dato completo sin saberlo. Se corrigió para que ambas consultas sigan pidiendo de a tandas hasta traer todo lo que realmente existe, y se agregó un aviso con la cantidad real de filas cada vez que se exporta algo, para poder notar si algún día vuelve a faltar algo.

Se agregó además un resguardo para evitar programar o reprogramar una publicación para dentro de muy pocos minutos por error de tipeo, dado que el sistema publica sin que nadie la revise antes; se corrigió que una parte del sistema seguía consultando el estado de conversaciones viejas cada pocos segundos sin necesidad; se ajustó el texto de una pantalla que sugería que arrastrar era la única forma de reprogramar, cuando esa forma no funciona en un celular; se corrigió un mensaje que daba a entender que aprobar una pieza ya la dejaba en camino de publicarse, cuando en realidad todavía faltaba un paso; se tradujeron los mensajes de error más comunes del inicio de sesión, que aparecían crudos en otro idioma en medio de una pantalla completamente en español; y se aplicó, en la herramienta más antigua e independiente del sistema, la misma corrección de subir fotos de a una por vez en lugar de todas juntas, aunque esa parte puntual no se pudo probar en vivo por no contar con la credencial real necesaria.

Cada uno de estos cambios se verificó antes de darlo por terminado: se revisó el estilo del código, se comprobaron los tipos, se corrieron todas las pruebas automáticas existentes más las nuevas agregadas, se compiló el proyecto entero, y se confirmó que cada publicación automática del sistema siguiera saliendo en verde después de cada cambio. Dos de las correcciones más delicadas —la de los documentos de la bóveda y la de la conversación que podía quedar colgada— se probaron además con llamadas reales contra el sistema en producción, no solo de forma teórica.

Frente al resumen final de toda la auditoría, donde quedaban tres puntos marcados de forma explícita como pendientes para más adelante, la respuesta fue corta y directa: que se resolviera todo. Se tomó como instrucción de cerrar los tres, uno por uno.

El primero era la posibilidad de crear una cuenta nueva desde la pantalla de inicio de sesión, algo que ya estaba protegido de fondo por los permisos reales de la base de datos —nadie que no fuera administrador podía ver ni tocar ningún dato real aunque se creara una cuenta—, pero que igual sumaba una fricción y una confusión innecesarias para una herramienta que en la práctica tiene un solo dueño real. Se sacó esa opción por completo, dejando intactos el ingreso con contraseña para la cuenta ya existente y el ingreso sin contraseña por código de un solo uso.

El segundo era la falta de un límite de tiempo y de una señal de progreso real durante la conversación entre los tres agentes de inteligencia artificial, que puede tardar minutos reales cuando hay que reintentar o cambiar de proveedor por una falla momentánea. Se agregó un corte real de dos minutos y medio con un aviso claro si algo se cuelga de verdad, y se aprovechó un dato que el sistema ya tenía disponible pero no estaba usando para este fin —los mensajes de cada agente se van guardando uno por uno a medida que terminan— para mostrar en pantalla cuál de los tres sigue trabajando en ese momento, en vez de un símbolo de carga genérico sin ninguna información real.

El tercero era distinto a los otros dos: al ponerse a resolverlo de verdad, la idea original no se sostuvo. Había quedado anotado que faltaba comprimir o redimensionar archivos antes de subirlos a la bóveda de conocimiento, pero esa bóveda recibe documentos de texto y no fotos, y comprimir ese tipo de archivo del lado del navegador no es algo simple ni que aporte un valor real, porque esos formatos ya vienen comprimidos por dentro. En vez de forzar un cambio cosmético sin sustancia solo para poder marcarlo como resuelto, se explicó por qué correspondía descartarlo directamente — la misma disciplina de honestidad que se sostuvo en toda esta sesión, aplicada también hacia el propio trabajo pendiente y no solo hacia lo que se encontraba en el código ajeno.

Cada uno de estos tres cambios se verificó de la misma manera que el resto: tipos correctos, mismo nivel de errores de estilo que ya venía de antes, todas las pruebas automáticas pasando de forma estable en corridas repetidas —una sola corrida aislada mostró fallos que no volvieron a aparecer, descartados como un problema pasajero de la máquina y no del código—, compilación limpia, y confirmación de que el sitio se desplegó bien después de cada cambio.

El siguiente pedido fue distinto a todo lo anterior: sacar el login por completo, porque es una herramienta de uso personal. Antes de tocar una sola línea se explicó el riesgo real, sin vueltas: la aplicación vive en una dirección pública de internet, no en algo privado o local, así que sin ningún control de acceso cualquiera que tuviera ese link podría publicar contenido real en Instagram y Facebook (el sistema aprueba y publica solo, sin que nadie lo revise antes, desde hace semanas), borrar o cambiar propuestas y documentos reales de la estrategia de marca, gastar los créditos pagos de las inteligencias artificiales, o leer información confidencial de la marca. También se señaló que la sesión ya quedaba guardada en el navegador, así que en la práctica el login solo pedía credenciales una vez por dispositivo nuevo, no en cada visita — para entender si el pedido real era sacar esa fricción puntual o aceptar el riesgo completo de dejar todo abierto, se hizo una pregunta directa con esas dos alternativas más una tercera de "quiero que quede sin login igual, entiendo el riesgo". La respuesta no fue ninguna de las alternativas ofrecidas, fue una idea propia y más contundente: "Nada, es para uso interno entonces quiero abrir como cualquier cosa, Word, Excel, lo que sea, doble click y listo." Con esa confirmación, informada y explícita sobre su propio riesgo, se procedió.

Se sacó el control de acceso en las tres capas donde vivía. En la interfaz, se borraron por completo la pantalla de inicio de sesión y el componente que envolvía toda la aplicación exigiendo una sesión activa, junto con sus pruebas automáticas — la aplicación ahora se abre directo, sin ninguna pantalla previa, y se sacó también el botón de cerrar sesión porque ya no hay ninguna sesión que cerrar. En la base de datos, se escribió una migración nueva que revierte, tabla por tabla, los permisos estrictos que solo dejaban pasar a un administrador identificado, devolviéndolos al estado abierto de antes — se aplicó contra la base real y se confirmó, consultando los permisos reales después de aplicarla, que quedaron abiertos en las doce tablas que los tenían cerrados y en el depósito de archivos de la Bóveda. En el código que corre en la nube (las funciones que atienden los pedidos de inteligencia artificial), se ajustó la validación para que acepte también la clave pública general como credencial válida — es la única credencial que la aplicación puede mandar una vez que no existe ninguna sesión iniciada — y se volvieron a publicar las seis funciones afectadas con ese ajuste.

Se decidió a propósito no borrar la tabla ni la función que identificaban a los administradores — quedan sin ningún uso real, pero no hacía falta sacarlas para lograr el objetivo, y dejarlas simplifica volver atrás el día de mañana si hiciera falta cerrar el acceso otra vez. Se probó de verdad, no solo se dio por publicado: usando solamente la clave pública general, sin ninguna sesión ni token de administrador, un pedido directo a la base de datos devolvió una fila real (antes de este cambio, la misma consulta con esa misma clave devolvía una lista vacía por los permisos cerrados), y un pedido directo a una de las funciones de inteligencia artificial respondió con éxito en vez de rechazarlo — confirmando que la aplicación efectivamente funciona sin login de punta a punta, no que solamente desapareció la pantalla. Se verificaron además los tipos, el estilo de código (sin ningún error nuevo respecto de lo que ya había antes), las pruebas automáticas (todas las que seguían aplicando, pasando bien — bajó la cantidad total solamente porque se borraron las pruebas específicas de la pantalla de login que ya no existe, nada roto) y la compilación de producción, todo limpio.

Queda documentado sin maquillar cuál es la implicancia real de esta decisión: la aplicación queda completamente abierta a cualquiera que tenga la dirección web, sin usuario, sin contraseña, sin ningún control de quién entra a leer o a escribir. Es correcto y fue una decisión consciente bajo el marco que se confirmó — uso personal e interno, tratarla como se trataría un archivo local — pero si en algún momento esa dirección se comparte, se filtra, o el uso deja de ser estrictamente personal, hay que volver a revisar esta decisión en vez de asumir que sigue siendo válida sin volver a preguntarlo.

Enseguida llegó una captura real mostrando un error al intentar conectar el token de GitHub desde la pantalla de subir material: un mensaje que sugería falta de conexión a internet. No lo era. La causa real estaba en una política de seguridad del navegador que la propia aplicación declara para restringir a qué direcciones puede conectarse — esa lista incluía la base de datos y los proveedores de inteligencia artificial, pero nunca se actualizó cuando, semanas atrás, se sumó la conexión directa con GitHub para subir fotos desde adentro de la aplicación. El navegador bloqueaba en silencio cualquier intento de contactar a GitHub, y ese bloqueo le llegaba al código exactamente igual que si de verdad no hubiera señal — de ahí el mensaje engañoso. Nunca se había notado antes porque la herramienta de Biblioteca, que usa la misma conexión con GitHub, vive en un documento aparte que no tiene esa restricción. El arreglo fue agregar esa única dirección faltante a la lista permitida. Se probó de verdad, no solo se leyó el código: ejecutando un pedido real a GitHub desde dentro de la aplicación, antes se hubiera bloqueado silenciosamente y ahora llega y devuelve una respuesta real — confirmando que el problema de fondo, y no solo el síntoma, quedó resuelto.

Usando ya la aplicación sin login, llegaron tres reportes concretos más, cada uno investigado con evidencia real antes de tocar nada. El primero: en la pantalla de configuración de los tres agentes de inteligencia artificial, el desplegable de proveedor nunca ofrecía la opción real que efectivamente corre en producción desde hace semanas — solo mostraba otras tres alternativas que ni siquiera se usan hoy. Se agregó la que faltaba, y de paso se corrigió el nombre de otra opción que había quedado desactualizado desde que ese proveedor retiró el modelo viejo. El segundo: al abrir el detalle de una pieza ya publicada o programada, solo se veía el texto (el gancho, el cuerpo, el llamado a la acción) pero nunca la imagen final tal cual sale publicada en Instagram y Facebook — el dato ya estaba disponible en el sistema, solo que esa pantalla en particular nunca lo mostraba. Se agregó ese bloque de imagen real, y se probó contra una pieza real ya publicada: la imagen cargó de punta a punta, igual a como se ve en las redes.

El tercero era más de fondo: cada vez que se quería reintentar, despublicar o marcar algo como gestionado a mano desde el panel de monitoreo, la aplicación mandaba a una pantalla externa de GitHub a completar la acción — copiar un identificador, buscar el botón correcto, tipear una palabra de confirmación exacta. Un reclamo directo y justo: ¿por qué hace falta salir de la aplicación para terminar algo que se empezó adentro? Se investigó el mecanismo real y se construyó la alternativa: ahora esas mismas acciones se disparan directo desde el panel, usando la misma conexión con GitHub que ya se usa para subir fotos — con un cuadro de confirmación real antes de cualquier acción que baje contenido de verdad de las redes, para no perder ese resguardo solo por sacar la fricción. Un detalle técnico real que había que resolver: dos de esas tres acciones nunca actualizaban el registro que lee el panel de monitoreo, así que el resultado de un reintento quedaba invisible ahí hasta la próxima sincronización automática, que corre cada seis horas. Se agregó un paso adicional, silencioso, que dispara esa sincronización sola un minuto y medio después de la acción, para que el resultado aparezca sin que haga falta ningún paso manual extra. Queda un único paso real que solo puede hacer Pablo: el permiso que ya tiene guardado el navegador para conectarse a GitHub alcanza para subir fotos, pero hace falta un permiso adicional para poder disparar estas acciones — la primera vez que se use alguno de estos botones nuevos, va a pedir generar un token con ese permiso de más.

Los tres cambios se verificaron con el mismo criterio de siempre: tipos correctos, mismo nivel de errores de estilo que ya venía de antes, todas las pruebas automáticas pasando, compilación limpia.

El pedido de ver la imagen real con un solo click se amplió después a todas las pantallas donde se toca una pieza de contenido: la de propuestas, el laboratorio, la mesa de diálogo, la biblioteca y el calendario. Antes de cambiar nada se revisó cada una por separado. La mayoría ya iban a mostrar la imagen sin ningún cambio extra, porque todas comparten la misma ventana de detalle que ya se había arreglado — la de propuestas y la de calendario abren esa misma ventana al tocar cualquier pieza, y la mesa de diálogo ya llevaba a esa misma pantalla con un link una vez que una pieza quedaba agendada sola.

El laboratorio sí tenía un hueco real: la lista de "propuestas recientes" ahí era puro texto, sin ninguna forma de tocarla para abrir el detalle. Se agregó exactamente el mismo comportamiento que ya tenían las otras pantallas — tocar una fila abre la misma ventana con la misma imagen real. De paso apareció un error que nadie había buscado: cuando se generaba una propuesta nueva desde el laboratorio y el sistema la aprobaba y agendaba solo, esa pieza nueva no aparecía en la lista hasta que algo más, en otro lado de la aplicación, forzara una actualización — un aviso que faltaba y ya se corrigió.

La biblioteca quedó afuera a propósito, no por descuido. Sus columnas de "programada" y "publicada" siempre mostraron datos de ejemplo, aclarado en su propio tutorial — nunca estuvieron conectadas a la información real. Eso fue una decisión tomada hace semanas: la biblioteca es la única herramienta de este sistema que se dejó completamente intacta a propósito, sin tocar una sola línea, para no arriesgar algo que se usa todos los días reescribiendo una aplicación grande sin poder probar su parte más delicada. Conectar esas dos columnas a los datos reales es un trabajo real y separado, no un ajuste rápido — se avisa así en vez de forzarlo sin conversarlo antes.

Se probó de verdad, no solo se leyó el código: se tocó una fila real en el laboratorio y la ventana se abrió con la imagen real cargada, la misma pieza ya confirmada antes. Todo lo demás se verificó igual que siempre — tipos, estilo, pruebas automáticas, compilación.

Frente al aviso de que la biblioteca había quedado afuera a propósito, la respuesta fue corta y sin vueltas: todo con datos reales, el sistema ya está en producción. Antes de tocar la única herramienta que se había dejado intacta hasta ahora, se investigó qué tan grande era en realidad el trabajo pendiente — y resultó ser más grande de lo que parecía a primera vista. La biblioteca no guarda en ningún lado, de verdad, ni siquiera las fotos que ya se cargaron y confirmaron — eso es un trabajo de fondo todavía pendiente, con su propio esfuerzo aparte. Pero las columnas de programada y publicada sí tenían un camino corto y real: esa información ya existe en el sistema, solo había que traerla.

Se sacaron los ejemplos de esas dos columnas y se reemplazaron por una consulta real, directa, a la misma base de datos que usa el resto del sistema — sin necesitar ningún inicio de sesión ni nada nuevo, la misma llave pública que ya usa toda la aplicación. Se actualizó también todo el texto que explicaba que esos datos eran de ejemplo, en el tutorial, en el manual y en los avisos de pantalla.

En el camino apareció algo importante que había que resolver antes de dar esto por terminado: los botones de reprogramar, borrar y editar que ya existían en esa pantalla nunca habían escrito nada de verdad en ningún lado — con datos de ejemplo eso no importaba, pero con una pieza real ya publicada en Instagram, tocar "guardar" hubiera mostrado un mensaje de éxito sin cambiar absolutamente nada de la realidad. Alguien podría pensar que canceló una publicación real cuando en verdad iba a salir exactamente igual. Se bloquearon esos tres botones para las piezas reales, y en su lugar tocarlas ahora lleva directo a la propuesta real dentro del sistema principal, el mismo mecanismo que ya se usa en otras pantallas para pasar de una vista a otra sin perder el hilo. También se sacaron las piezas reales de las dos secciones pensadas para material crudo sin publicar todavía, donde no tenían ningún sentido apareciendo.

Se probó de verdad contra el sitio real: las piezas reales cargaron con sus fechas correctas, el calendario mostró la información real, y tocar una pieza real llevó exactamente a la propuesta correspondiente en el sistema principal, sin ningún botón de borrado disponible ahí. Queda pendiente, sin resolver a propósito, la otra mitad de la biblioteca — la que todavía no tiene ningún lugar real donde guardar lo que se sube y confirma, un trabajo de fondo aparte, no un ajuste como este.

Llegó después una captura real de la pantalla que muestra la biblioteca dentro del sistema principal: no mostraba nada, solo un texto invitando a tocar para verla. El pedido fue terminante — el proyecto tiene que funcionar hoy, y esa herramienta no puede abrir aparte, tiene que quedar de verdad adentro del panel. Investigando la causa real, no la que se había investigado semanas atrás, apareció el motivo genuino: una política de seguridad del propio panel principal bloqueaba, sin excepción, cualquier ventana incrustada dentro suyo — sin importar de dónde viniera. La investigación anterior había mirado el problema desde el lado equivocado: había revisado si la biblioteca se dejaba incrustar por otros, pero nunca si el panel principal se dejaba incrustar algo a sí mismo. Esa configuración probablemente estuvo ahí desde antes de que existiera siquiera la idea de mostrar la biblioteca adentro del panel — es decir, esa función nunca funcionó ni una sola vez desde que se construyó, semanas atrás. El botón que mandaba a abrirla aparte no era una alternativa cómoda, era el único camino que en verdad funcionaba, sin que nadie supiera por qué el otro no.

Se corrigió esa política de seguridad para permitir específicamente lo que hacía falta, sin abrir la puerta a nada más. Con eso resuelto, se sacó también el paso extra de tener que tocar algo para que apareciera — ahora se muestra directo, apenas se entra a esa pantalla, y el acceso para abrirla aparte quedó como una opción chica y secundaria, ya no como el camino principal.

El pedido siguiente fue el más grande de toda la sesión: seguir probando el resto de las pantallas de la manera más exigente posible, con publicaciones reales y verificables en Instagram y en Facebook, de todos los tipos de contenido, sin que importara si eso cargaba mucho la cuenta real del negocio. Para las fotos de prueba se descartó bajar imágenes de bancos con licencia — usar fotos de un banco pago sobre la cuenta real de la marca, sin haber pagado esa licencia, es un riesgo legal genuino que no vale la pena correr solo para una prueba. En su lugar se generaron tres imágenes completamente originales, composiciones abstractas propias, sin inspirarse en ninguna foto ajena.

La primera prueba real fue un post simple. La conversación entre los agentes de inteligencia artificial rechazó la primera propuesta por un motivo real y correcto: quien escribe el contenido armó visualmente un carrusel de varias partes pese a que quien arma la estrategia había pedido explícitamente una sola imagen — una inconsistencia real, detectada bien. Corregido eso, la pieza se aprobó y salió publicada de verdad, visible hoy tanto en Instagram como en Facebook.

En el camino aparecieron dos problemas reales, uno escondiendo al otro. El primero: cuando algo fallaba al publicar, el mensaje de error que quedaba registrado se cortaba a un largo fijo, y ese corte se completaba entero con datos irrelevantes (una dirección larga de una foto de perfil) antes de llegar nunca al motivo real del fallo — quedaba completamente a ciegas para diagnosticar cualquier cosa. Se corrigió para que el resumen del error sea corto y relevante, sin datos de relleno.

Con ese arreglo puesto, apareció el segundo problema real, más de fondo: el sistema esperaba un tiempo fijo, bastante corto, a que Instagram terminara de procesar cada publicación antes de darla por perdida — y en el caso real que se estaba probando, Instagram tardó más de ese tiempo fijo, así que el sistema reportó un fallo que en realidad no existía: la pieza sí había salido bien, solo un poco más tarde de lo que el sistema esperaba. Peor todavía, un segundo intento automático chocó, como corresponde, con la protección real de la plataforma contra contenido duplicado — confirmando, de rebote, que la primera vez sí había funcionado. Se corrigió ampliando bastante ese tiempo de espera, y se agregó algo nuevo: cuando la plataforma avisa que el contenido ya existe, el sistema ahora consulta ese contenido real antes de darlo por fallido — si ya está publicado de verdad en todas partes, lo reconoce como un éxito real en lugar de reportarlo como un error inexistente. El registro de esa pieza real, que había quedado con datos desactualizados en el sistema por este mismo problema, se corrigió a mano para que coincida con la realidad confirmada.

La segunda prueba real fue un carrusel completo. De nuevo, la conversación entre los agentes rechazó la primera versión por un motivo real: el llamado a la acción saltaba directo a la opción más comprometida, sin pasar antes por la pregunta que invita a reflexionar primero — violando un criterio de marca ya confirmado hace días por Pablo y Sindy juntos, y sonando además más a venta que a claridad. Corregido, se aprobó, y esta vez —con el arreglo del tiempo de espera ya funcionando— salió publicada de verdad en el primer intento, sin ningún falso fallo. Se revisaron a mano las cuatro imágenes reales del carrusel: diseño parejo entre todas, sin ningún texto de guion interno visible por error, y el cierre con el estilo ya aprobado hace días, sin ningún llamado a la acción aislado en su propia imagen.

Se probó además reintentar una historia real ya publicada, para ejercitar ese mismo camino. Ahí apareció un caso real que la corrección de arriba no llegó a resolver del todo: la plataforma volvió a avisar contenido duplicado, señalando exactamente la misma publicación que se estaba reintentando, pero el sistema no llegó a reconocerla como ya exitosa. No se pudo diagnosticar la causa exacta desde acá por no tener acceso directo a la credencial real de la plataforma, así que queda anotado como un caso real sin resolver — sin ningún daño real, porque el contenido en cuestión ya estaba confirmado publicado bien por otro lado, y la propia protección de la plataforma contra duplicados impidió que se creara nada de más.

De paso, revisando todo esto, apareció algo real y aparte que no se había buscado: una publicación real, solo en Instagram, con el texto idéntico al de una pieza real de un día antes, pero sin ningún registro propio del sistema que la respalde — no se generó por el camino normal ni por ninguna acción de esta sesión. No se tocó nada al respecto (tampoco se podría borrar automáticamente, esa red no lo permite) — queda anotado tal cual para que Pablo lo revise cuando pueda.

Por último se revisaron, ya con las dos piezas reales nuevas visibles, las pantallas restantes contra el sitio real: la de propuestas abre el detalle de cada una con su imagen real, el calendario las muestra en su día real, el panel de monitoreo las muestra publicadas de verdad en las dos redes con los botones de acción ya funcionando, la biblioteca actualizó su conteo real de piezas publicadas, y las pantallas de auditoría y de subir material respondieron bien, sin errores.

Después llegó una consulta directa sobre si todo lo trabajado había quedado sincronizado entre la máquina local y GitHub — se confirmó que sí, los dos lados en el mismo punto exacto, sin nada pendiente para ningún lado. A continuación llegó una orden clara: borrar todo lo que no fuera parte del proyecto. Antes de borrar nada se revisó de verdad qué había en esos archivos sueltos que nunca habían entrado al control de versiones — y resultó que dos de los cuatro no eran basura en absoluto. Uno era una carpeta con información real de analíticas de las redes sociales, incluido un análisis que ya está citado y en uso dentro del propio panel principal. El otro era una herramienta real y segura para cargar una clave del sistema, sin ninguna clave escrita adentro. Se presentó el inventario completo antes de tocar nada, explicando qué se perdía en cada caso. La decisión final fue borrar la carpeta de analíticas, su copia comprimida, y la configuración local de la herramienta de trabajo — y dejar intacta la herramienta de carga de claves.

Enseguida llegó un reporte de un problema real: el panel de monitoreo no estaba mostrando información confiable, con piezas que no correspondían a nada publicado de verdad, y el pedido de poder sacarlas a mano desde ahí mismo. Investigando, apareció con fuerza el mismo caso ya detectado un rato antes en esta misma sesión: una publicación real en una sola red social, con el texto idéntico al de otra pieza real de un día antes, sin ningún registro propio del sistema detrás. El panel de monitoreo lee un espejo de lo que la plataforma externa informa, y ese espejo se reescribe entero cada seis horas — no existía ninguna forma de sacar de ahí algo que la plataforma externa siguiera reportando, aunque en la práctica ya no fuera real. Se agregó un botón para sacar cualquier pieza de esa vista a mano, con una aclaración explícita antes de confirmar: eso solo la saca de esta pantalla, no borra nada real de las redes sociales ni de la plataforma externa — si esa plataforma la sigue reportando de verdad, puede volver a aparecer en la próxima sincronización. Con la herramienta ya lista, se usó de inmediato para sacar el caso real ya identificado.

Después de eso llegó una consulta sobre sincronizar la copia local con la de GitHub, sin saber cuál estaba más adelantada. Se revisó y la de GitHub estaba treinta y dos commits adelante, sin nada propio sin subir del lado local, así que fue un traído limpio y directo. Enseguida se pidió ver qué cambios de la aplicación habían llegado en esa tanda: cuatro correcciones, todas disparadas por el uso real de la aplicación el mismo día — el feedback de la mesa de diálogo que no refrescaba la pantalla, el panel de monitoreo que se quedaba sin botones de acción para las historias publicadas sin fallas, una publicación huérfana en una red social que seguía reapareciendo en el monitor, y la integración continua que hacía tiempo no corría las pruebas ni el build de verdad porque un paso anterior la cortaba.

A continuación se pidió aplicar cinco mejoras al archivo de documentación del proyecto y leer siete devoluciones externas sobre el proyecto que habían llegado como adjuntos. Las cinco mejoras se aplicaron: separar la referencia estable de la bitácora cronológica con un divisor claro, una tabla de estado actual del sistema al principio, un bloque de comandos consolidado con cómo correr un solo test y las vías reales de despliegue, una línea explícita sobre los archivos de entorno y de secretos, y el criterio de cuándo aplica la transcripción de sesión. Sobre las siete devoluciones, la lectura fue que tres eran casi la misma revisión con incrementos, una describía una parte del sistema que no coincidía con la realidad, y las dos que valían de verdad eran una del treinta y uno de agosto que había leído el código con referencias exactas de archivo y línea, y otra con una tesis de "sistema operativo de contenido" desmesurada en volumen pero con lectura real. Varios de los problemas que marcaban como graves ya estaban resueltos o nunca habían sido bugs; los que sí valían eran un puñado de hallazgos concretos y una pregunta sobre el acceso abierto del sistema que convenía volver a mirar.

Entonces llegó el pedido de hacer una auditoría propia — con mirada de diseño, de gestión de proyecto y de especialista en experiencia de usuario, obsesiva al detalle, buscando bugs y fallas, e investigando qué se puede sumar a dos mil veintiséis. Se leyó el código real de punta a punta: toda la carpeta de la aplicación, la aplicación de biblioteca entera, los scripts del pipeline, las funciones del backend, las migraciones y el archivo raíz de la página. El resultado fue un informe con treinta y cuatro bugs verificados con archivo y línea, unos veinte hallazgos de diseño, experiencia y gestión, y dieciocho oportunidades para dos mil veintiséis, todo ordenado por severidad. El informe se armó como una página visual y se entregó como archivo — la publicación como artefacto la bloqueó el clasificador del entorno. Lo más grave que se encontró: una clase de bug sistémico donde casi todas las operaciones de guardado mostraban éxito aunque el guardado hubiera fallado de verdad, exactamente el "guardado falso" que temían las devoluciones externas, y esta vez sí en el código; el programador automático de publicaciones que ignoraba los propios datos de horario que el sistema mide y muestra, publicando a la hora en que había arrancado la primera cadena, cerca de la medianoche; la acción de cancelar una publicación que no pedía confirmación y no tenía vuelta atrás; y el token de una plataforma de código guardado en el navegador de un sitio público, que ahora además podía disparar procesos automáticos.

Después de ver el informe llegó una orden de dos palabras: arreglá todo. Se ejecutó en nueve tandas, cada una con verificación completa — chequeo de tipos, análisis estático, pruebas y build todos en verde — y cada una guardada y subida, desplegándose por los flujos normales del proyecto. La primera tanda arregló el guardado falso de raíz: se centralizó el manejo del error de la base de datos en un solo lugar que ahora lanza el error de verdad, con lo cual todos los avisos de error que ya existían en la interfaz empezaron a funcionar; también se agregó una forma real de recuperar una propuesta cancelada, y confirmación antes de cancelar. La segunda tanda tocó el programador de publicaciones del backend: ahora apunta a bloques horarios reales acordes a cuándo está la audiencia, o a la hora que el motor de aprendizaje haya deducido si tiene confianza suficiente, y rota las dimensiones sobre los últimos treinta días en vez del acumulado histórico; también se cerró el hueco que permitía que un reintento del cliente generara un debate y una publicación duplicados. La tercera tanda reconstruyó la pantalla de subir material para que clasifique cada foto por separado en vez de aplicar a todo el lote la dimensión de la primera, con vista previa por foto, y sacó la recarga de página entera al conectar la integración de código, más un botón real para desconectarla. Las tandas siguientes cubrieron el calendario (una forma de mover piezas que funciona en pantalla táctil, y un freno contra fechas pasadas), el monitor, el panel principal, el diseño visual (las fuentes pasadas a un formato mucho más liviano, la paleta de estados separada de la paleta de marca, contraste, el menú lateral agrupado por rol, respeto por la preferencia de menos movimiento), la configuración de agentes, la biblioteca, y una limpieza grande de la deuda técnica: las constantes que estaban duplicadas a mano en seis lugares se unificaron en una sola fuente, la aplicación pasó a cargar cada pantalla como un pedazo aparte para que el caso de subir una foto desde el celular no arrastre todo el motor de gráficos, y los errores del análisis estático bajaron de cuarenta y dos a cero, con lo cual la integración continua volvió a ser bloqueante de verdad.

Lo que quedó afuera a propósito: las dieciocho oportunidades para dos mil veintiséis son funcionalidades nuevas — una bandeja de comentarios y mensajes directos, sumar otra red social, video corto, un calendario editorial planeable, un freno de emergencia automático para la publicación autónoma, un modelo de datos real para la biblioteca — que necesitan una decisión de producto, no correcciones. Y la decisión sobre el acceso abierto del sistema quedó para el dueño del proyecto: la recomendación concreta de la auditoría es poner una capa de control de acceso simple adelante de la aplicación, alrededor de una hora de trabajo, sin tocar el modelo de seguridad de la base — el punto medio real entre tener un login completo y estar abierto a cualquiera con el enlace.
