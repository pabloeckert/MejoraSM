// scripts/generate-brief.mjs
// Genera los briefs de las stories del día llamando DIRECTO a la API de Anthropic
// (sin Supabase). Recorre content/inbox/<oferta>/ (una subcarpeta por cada
// dimensión de servicio del Manual de Marca) y toma hasta 3 fotos en total —
// una story por foto, con el copy orientado a la oferta de esa carpeta.
// Si no hay ninguna foto, genera 1 story de solo texto.
//
// Videos: por ahora se detectan pero NO se procesan (el render solo compone
// imágenes fijas) — quedan avisados en el log, no se pierden ni se ignoran
// en silencio. Soporte de video es un módulo aparte, todavía no construido.
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
const VIDEO_EXTS = [".mp4", ".mov", ".avi", ".webm"];

// Las 4 dimensiones + Profesionalización, tal cual el Manual de Marca (sección
// "Servicios"). Cada carpeta de content/inbox/ corresponde a una de estas.
const OFERTAS = {
  personal: {
    nombre: "Personal",
    contexto:
      "Todo cambio empieza en quien lidera. Liderazgo, gestión emocional, " +
      "creencias, objetivos. El resultado: un líder más seguro y efectivo.",
  },
  organizacional: {
    nombre: "Organizacional",
    contexto:
      "Cuando el líder está firme, el equipo lo siente. Cultura, roles, " +
      "procesos internos, comunicación, liderazgo de equipos.",
  },
  comercial: {
    nombre: "Comercial",
    contexto:
      "Un líder con confianza vende distinto. Ventas, pricing, fidelización, " +
      "negociación, marketing.",
  },
  empresarial: {
    nombre: "Empresarial",
    contexto:
      "La base sobre la que todo se sostiene. Modelo de negocio, finanzas, " +
      "escalabilidad, calidad, transformación digital.",
  },
  profesionalizacion: {
    nombre: "Profesionalización",
    contexto:
      "Nivel integrador, no una quinta área: el resultado de trabajar las " +
      "cuatro dimensiones de forma conjunta y sostenida — líderes formados, " +
      "métricas claras, procesos replicables.",
  },
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

VOZ — esto es crítico, más que la estructura: tiene que sonar a una persona
real escribiendo, no a una IA generando copy. Concretamente:
- Rioplatense: "vos", nunca "tú". Cadencia natural argentina.
- Nada de fórmulas de copywriting genérico: sin "descubrí el secreto de...",
  sin preguntas retóricas fáciles ("¿Te pasó alguna vez que...?"), sin
  exclamaciones de más, sin emojis.
- Sin lunfardo ni jerga pesada — el registro sigue siendo profesional, pero
  cercano, como alguien que sabe de lo que habla y te lo dice derecho.
- Frases con el corte natural de alguien hablando, no oraciones perfectas
  y balanceadas de manual de redacción. Si releyendo suena "escrito por
  IA" (demasiado prolijo, sin aspereza, genérico), reescribilo más crudo.

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

async function findInboxItems() {
  if (!existsSync(INBOX_DIR)) return { photos: [], videosSkipped: [] };

  const ofertaDirs = Object.keys(OFERTAS);
  const photos = [];
  const videosSkipped = [];

  for (const oferta of ofertaDirs) {
    const dir = path.join(INBOX_DIR, oferta);
    if (!existsSync(dir)) continue;
    const files = (await readdir(dir)).sort();
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (Object.keys(EXT_TO_MIME).includes(ext)) {
        photos.push({ path: path.join(dir, f), name: f, oferta });
      } else if (VIDEO_EXTS.includes(ext)) {
        videosSkipped.push({ name: f, oferta });
      }
    }
  }

  return { photos: photos.slice(0, MAX_STORIES), videosSkipped };
}

function extractJson(text) {
  return JSON.parse(text.trim().replace(/^```json\s*|^```\s*|```$/g, ""));
}

async function briefFor(item, avoidHeadlines) {
  const avoid =
    avoidHeadlines.length > 0
      ? ` Ya se generaron hoy estas headlines — NO repitas idea ni estructura: ${avoidHeadlines.join(" | ")}`
      : "";

  let image;
  let userText;

  if (item) {
    const oferta = OFERTAS[item.oferta];
    const ext = path.extname(item.path).toLowerCase();
    const buffer = await readFile(item.path);
    image = { base64: buffer.toString("base64"), media_type: EXT_TO_MIME[ext] };
    userText =
      `Generá la story a partir de esta foto. Es contenido de la oferta ` +
      `"${oferta.nombre}": ${oferta.contexto} Que el copy hable de esa ` +
      `dimensión específica, no genérico de la marca.${avoid}`;
  } else {
    userText = `No hay foto disponible hoy. Generá una story de solo texto.${avoid}`;
  }

  const text = await askClaude({ system: SYSTEM_PROMPT, userText, image });
  return extractJson(text);
}

async function main() {
  await mkdir(WORK_DIR, { recursive: true });

  const { photos, videosSkipped } = await findInboxItems();

  if (videosSkipped.length > 0) {
    console.log(`Videos detectados pero NO procesados (soporte de video aún no construido):`);
    videosSkipped.forEach((v) => console.log(`  - ${v.oferta}/${v.name}`));
  }

  const briefs = [];
  const headlines = [];

  if (photos.length === 0) {
    const brief = await briefFor(null, []);
    brief.mode = "solo-texto";
    brief.oferta = null;
    brief.photoUsedPath = null;
    briefs.push(brief);
  } else {
    for (const item of photos) {
      const brief = await briefFor(item, headlines);
      brief.mode = "foto";
      brief.oferta = item.oferta;
      const usedDir = path.join(USED_DIR, item.oferta);
      await mkdir(usedDir, { recursive: true });
      brief.photoUsedPath = path.join(usedDir, item.name);
      briefs.push(brief);
      headlines.push(brief.headline);
    }
  }

  await writeFile(path.join(WORK_DIR, "briefs.json"), JSON.stringify(briefs, null, 2));
  console.log(`${briefs.length} brief(s) generado(s):`);
  briefs.forEach((b, i) => console.log(`  ${i + 1}. [${b.mode}${b.oferta ? "/" + b.oferta : ""}] ${b.headline}`));

  for (const item of photos) {
    await rename(item.path, path.join(USED_DIR, item.oferta, item.name));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
