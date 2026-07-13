# content/

Flujo de la story diaria (`.github/workflows/daily-story.yml`):

- **inbox/** — dejá acá hasta 3 fotos (jpg/png/webp): el workflow de hoy genera
  una story por foto. Si está vacía, genera 1 story de solo texto.
- **used/** — el workflow mueve acá la foto ya usada, para no repetirla.
- **work/** — archivos intermedios (`briefs.json`, `renders.json`) de la última corrida.
  Se pisan cada día, no hace falta tocarlos.
- **published/** — las imágenes finales (1080x1920) que se publicaron, con fecha
  en el nombre. Quedan en el repo porque `raw.githubusercontent.com` las sirve como
  URL pública, que es lo que necesita la Graph API de Meta para publicar.

Para subir una foto desde el celular sin usar git: hacerlo directo desde la
app de GitHub, o desde Dispatch de Claude Cowork apuntando a este repo.
