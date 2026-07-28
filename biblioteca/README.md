# Biblioteca de Contenido — Mejora Continua

Interfaz para cargar, etiquetar y organizar el contenido que alimenta el
sistema de Stories (`content/inbox/`). HTML/JS plano, sin framework ni build:
se abre `index.html` directo en el navegador.

## Estado

- **Paso 1 (diseño)** — hecho. Recrea el prototipo aprobado con Pablo.
- **Paso 2 (interfaz + interacción)** — hecho. Toda la UI funciona con datos
  **de mentira en memoria** (ver `seed-demo.js`).
- **Paso 3 (datos reales)** — pendiente. Persistir fotos en `content/inbox/`,
  categorías/álbumes, y el aprendizaje supervisado. **No arrancado** — se
  define con Pablo antes de tocar.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Shell mínimo; carga `seed-demo.js` y `app.js`. |
| `styles.css` | Estilos + tokens de marca (calcados del design system) + `@font-face` de Bw Modelica. |
| `app.js` | Toda la lógica y el render (vanilla JS, estado en memoria). |
| `seed-demo.js` | **Datos de demo.** Se borra entero en el Paso 3 (junto con su `<script>` en `index.html` y el fallback en `app.js`). |
| `fonts/` | Bw Modelica (Regular/Medium/Bold) — la tipografía real de marca. Licencia de Agencia Dominó para uso de Mejora Continua (`fonts/LICENCIA.txt`). |
| `assets/` | Isotipo y lockup de Mejora Continua. |

## Pantallas

- **Línea de tiempo** — todas las piezas con su etapa (En biblioteca →
  Confirmada → Programada → Publicada). Vistas lista/miniatura/íconos grandes.
  Sobre cada foto: **X** (borrar, arriba-izq) y **✓** (guardar/confirmar,
  arriba-der). Clic en la foto abre el detalle para corregir etiquetas/álbum.
- **Calendario** — lo publicado (rojo) y lo programado (azul) por fecha. Clic
  en una publicación → **modificar / reprogramar (cambiar fecha) / borrar**.
- **Carga rápida** — subir sueltas del día; el sistema propone etiquetas.
- **Sesión** — subir una tanda de un evento y confirmarla en bloque.
- **Armar pieza** — 4 tipos: Foto con texto, Collage (grilla/dinámico), Foto
  simple, Frase manual. Preview en vivo con la identidad de marca.
- **Manual** — explica el sistema. Tutorial interactivo (arranca solo la 1ª vez;
  se reabre con el botón **?**).

## Notas de implementación

- **Datos de ejemplo del Monitor**: Programada y Publicada muestran datos de
  ejemplo, siempre marcados como tal. La publicación real vive en el Monitor.
- **Aprendizaje supervisado**: hoy es de mentira (el sistema "propone", Pablo
  "corrige"). La lógica real es Paso 3.
- **Layout desktop**: grid 30/70 (menú + apps a la izquierda, contenido a la
  derecha).
- **Fuente**: Bw Modelica local (no CDN); League Spartan queda solo de fallback.
