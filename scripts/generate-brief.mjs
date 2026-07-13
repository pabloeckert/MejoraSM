// scripts/generate-brief.mjs
// Genera los briefs de las stories del día llamando DIRECTO a la API de Anthropic
// (sin Supabase). Toma hasta 3 fotos de content/inbox/ — una story por foto.
// Si no hay ninguna, genera 1 story de solo texto.
//
// Uso: node scripts/generate-brief.mjs
// Env: ANTHROPIC_API_KEY
// Salida: content/work/briefs.json

import { readdir, readFile, rename, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { askClaude } from "./lib/claude.mjs";

const ROOT = process.cwd();
const INBOX_DIR = path.join(ROOT, "content/inbox");
const USED_DIR = path.join(ROOT, "content/used");
const WORK_DIR = path.join(ROOT, "content/work");
const MAX_STORIES = 3;

const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Tono calibrado contra el Manual de Marca 2026 (Criterio Medular + Tono y Voz).
const SYSTEM_PROMPT = `Sos el redactor de contenido de Mejora Continua (mejoraok.com), consultora de
claridad estratégica para dueños de empresa, líderes y profesionales argentinos.

CRITERIO MEDULAR (manda sobre todo lo demás):
- Nunca a la persona: el sujeto del problema siempre es lo que falta — foco,
  estructura, criterio externo — jamás la capacidad o inteligencia del otro.
- Calidez con verdad: directo y cálido a la vez. La calidez no es consuelo,
  es el cuidado detrás de decir la verdad sin maquillaje.
- No se vende por precio. Nunca "gratis" o "sin costo" como gancho.
- El tono NO es: agresivo, motivacional vacío, jerga para parecer sofisticado,
  frío, ni urgencia artificial. No vende: clarifica.

REGISTRO: nivel "Directo" (el de primer contacto). Referencia de intensidad:
"No te falta capacidad, te falta claridad."

ESTRUCTURA de cada mensaje: nombrá el dolor sin juzgar → corré el eje de
"hiciste mal" a "esto funciona así, por eso pasa" → cerrá con dirección concreta.

PÚBLICO (por estado mental, no demografía): el emprendedor saturado que apaga
incendios, el que creció rápido y necesita orden, el que sospecha que le venden
humo, la líder que decide en soledad. Ninguno busca motivación: buscan claridad.

TAREA: copy para UNA story vertical de Instagram/Facebook (vive 24hs).
Si te paso una foto, analizala primero y que el copy tenga relación real y
específica con lo que se ve — nada de caption genérica pegada encima.
Si no hay foto: una idea o quiebre de perspectiva breve y potente.

Respondé ÚNICAMENTE con JSON válido, sin nada antes ni después:
{
  "kicker": "etiqueta corta en mayúsculas, máx 3 palabras (ej: CLARIDAD, FOCO REAL)",
  "headline": "la frase principal, máx 11 palabras, va grande en la pieza",
  "subtext": "1-2 líneas de apoyo, máx 26 palabras, cierran con dirección",
  "caption_feed": "1-2 frases + CTA suave para el post de Facebook (no va en la imagen)"
}`;

async function findInboxPhotos() {
  if (!existsSync(INBOX_DIR)) return [];
  const files = (await readdir(INBOX_DIR))
    .filter((f) => Object.keys(EXT_TO_MIME).includes(path.extname(f).toLowerCase()))
    .sort();
  return files.slice(0, MAX_STORIES).map((f) => path.join(INBOX_DIR, f));
}

function extractJson(text) {
  return JSON.parse(text.trim().replace(/^```json\s*|^```\s*|```$/g, ""));
}

async function briefFor(photoPath, avoidHeadlines) {
  const avoid =
    avoidHeadlines.length > 0
      ? ` Ya se generaron hoy estas headlines — NO repitas idea ni estructura: ${avoidHeadlines.join(" | ")}`
      : "";

  let image;
  if (photoPath) {
    const ext = path.extname(photoPath).toLowerCase();
    const buffer = await readFile(photoPath);
    image = { base64: buffer.toString("base64"), media_type: EXT_TO_MIME[ext] };
  }

  const text = await askClaude({
    system: SYSTEM_PROMPT,
    userText: photoPath
      ? `Generá la story a partir de esta foto.${avoid}`
      : `No hay foto disponible hoy. Generá una story de solo texto.${avoid}`,
    image,
  });

  return extractJson(text);
}

async function main() {
  await mkdir(WORK_DIR, { recursive: true });
  await mkdir(USED_DIR, { recursive: true });

  const photos = await findInboxPhotos();
  const briefs = [];
  const headlines = [];

  if (photos.length === 0) {
    const brief = await briefFor(null, []);
    brief.mode = "solo-texto";
    brief.photoUsedPath = null;
    briefs.push(brief);
  } else {
    for (const photoPath of photos) {
      const brief = await briefFor(photoPath, headlines);
      brief.mode = "foto";
      brief.photoUsedPath = path.join(USED_DIR, path.basename(photoPath));
      briefs.push(brief);
      headlines.push(brief.headline);
    }
  }

  await writeFile(path.join(WORK_DIR, "briefs.json"), JSON.stringify(briefs, null, 2));
  console.log(`${briefs.length} brief(s) generado(s):`);
  briefs.forEach((b, i) => console.log(`  ${i + 1}. [${b.mode}] ${b.headline}`));

  for (const photoPath of photos) {
    await rename(photoPath, path.join(USED_DIR, path.basename(photoPath)));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
