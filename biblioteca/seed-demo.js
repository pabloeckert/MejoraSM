// Datos de demostración — SOLO Paso 2 (interfaz e interacción).
// Todo esto es de mentira y vive en memoria: fotos generadas al vuelo,
// álbumes y etapas de ejemplo. En el Paso 3 este archivo se borra entero
// (y se saca su <script> de index.html + el fallback en app.js) — la data
// real va a venir de content/inbox y de donde definamos persistir.
"use strict";

(function () {
  // Placeholder que "lee" como foto: duotono con blobs orgánicos, sin texto,
  // en tonos naturales (nunca los colores de marca, para no confundir una
  // foto de la biblioteca con una pieza ya armada).
  function photo(hue, sat, i) {
    const h2 = (hue + 24) % 360;
    const blob = (cx, cy, r, o) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" opacity="${o}"/>`;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600" viewBox="0 0 480 600">` +
      `<defs><linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="hsl(${hue},${sat}%,70%)"/>` +
      `<stop offset="1" stop-color="hsl(${h2},${sat + 8}%,44%)"/>` +
      `</linearGradient></defs>` +
      `<rect width="480" height="600" fill="url(#g${i})"/>` +
      blob(120 + (i * 37) % 240, 140 + (i * 53) % 200, 150, 0.10) +
      blob(360 - (i * 29) % 200, 460 - (i * 41) % 180, 120, 0.08) +
      blob(240, 300, 90, 0.06) +
      `<rect width="480" height="600" fill="#000" opacity="0.04"/>` +
      `</svg>`;
    return "data:image/svg+xml;base64," + btoa(svg);
  }

  // Columnas: title, categories, album, stage, proposed, stageMeta, hue, sat, dayOffset
  // dayOffset: días respecto de hoy para el calendario (negativo = ya publicada,
  // positivo = programada a futuro; null = todavía no tiene fecha).
  // Solo "biblioteca"/"confirmada" — todavía no hay una tabla real donde
  // persistir el catálogo de fotos ni sus categorías/álbumes (Paso 3 en
  // curso, ver CLAUDE.md), así que estas dos etapas siguen siendo de
  // ejemplo. "programada"/"publicada" YA NO están acá — app.js las carga
  // reales desde Supabase (proposals + historial_cache), 2026-08-26.
  const D = [
    // album "Taller en Chapadmalal"
    ["Ronda de apertura del taller", ["Eventos y talleres", "Capacitaciones"], "Taller en Chapadmalal", "biblioteca", true, null, 145, 30, null],
    ["Trabajo en grupos", ["Eventos y talleres"], "Taller en Chapadmalal", "biblioteca", true, null, 150, 34, null],
    ["Almuerzo del equipo", ["Detrás de escena"], "Taller en Chapadmalal", "confirmada", false, null, 28, 26, null],
    // album "13 años del primer after"
    ["Brindis de aniversario", ["Eventos y talleres", "Detrás de escena"], "13 años del primer after", "confirmada", false, null, 340, 22, null],
    ["El equipo de siempre", ["Detrás de escena"], "13 años del primer after", "biblioteca", true, null, 8, 40, null],
    // album "Entrevista en Radio del Plata"
    ["Antes de entrar al estudio", ["Detrás de escena", "Entrevistas"], "Entrevista en Radio del Plata", "biblioteca", true, null, 190, 20, null],
    // sueltas
    ["Reunión con cliente PyME", ["Trabajo con clientes"], null, "biblioteca", true, null, 168, 24, null],
    ["Capacitación online de equipos", ["Capacitaciones"], null, "confirmada", false, null, 262, 22, null],
    ["Asociado nuevo en Córdoba", ["Asociados (otras ciudades)"], null, "biblioteca", true, null, 95, 28, null],
  ];

  // Fecha ISO (YYYY-MM-DD) a partir de un offset de días respecto de hoy.
  function isoFromOffset(off) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + off);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  window.__SEED_ITEMS = function () {
    return D.map(function (row, i) {
      const [title, categories, album, stage, proposed, stageMeta, hue, sat, dayOffset] = row;
      return {
        id: "seed-" + i,
        title,
        categories,
        album: album || null,
        context: null,
        proposed,
        date: "hoy",
        img: photo(hue, sat, i),
        pos: "50% 50%",
        stage,
        stageMeta: stageMeta || null,
        when: dayOffset == null ? null : isoFromOffset(dayOffset),
      };
    });
  };
})();
