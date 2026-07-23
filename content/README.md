# content/

Flujo de la story diaria (`.github/workflows/daily-story.yml`):

- **inbox/** — dejá acá hasta 3 fotos (jpg/png/webp): el workflow de hoy genera
  una story por foto. Si está vacía, genera 1 story de solo texto.
- **used/** — el workflow mueve acá la foto ya usada, para no repetirla.
- **work/** — archivos intermedios (`briefs.json`, `renders.json`) de la última corrida.
  Se pisan cada día, no hace falta tocarlos.
- **published/** — las imágenes finales (1080x1920) que se publicaron, con fecha
  en el nombre. Quedan en el repo porque `raw.githubusercontent.com` las sirve como
  URL pública, que es lo que necesita Zernio para publicar.

Para subir una foto desde el celular sin usar git: hacerlo directo desde la
app de GitHub, o desde Dispatch de Claude Cowork apuntando a este repo.

## Una corrida real por día

`generate-brief.mjs` frena (exit 0, sin generar nada) si ya existe un
`story-{hoy}-*.jpg` en `published/`. Si el workflow se re-corre el mismo día
(ej. reintento manual tras un fallo parcial de Zernio), la segunda corrida
no genera ni publica contenido nuevo — evita duplicar posts reales como pasó
el 21/07. Si necesitás reintentar una plataforma que falló, hacelo a mano
contra el post existente en Zernio, no re-corriendo el workflow completo.
