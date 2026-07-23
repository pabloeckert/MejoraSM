// scripts/generate-brief.mjs
// Genera los briefs de las stories del día llamando DIRECTO a la API de Anthropic
// (sin Supabase). Recorre content/inbox/<oferta>/ (una subcarpeta por cada
// dimensión de servicio del Manual de Marca) y toma hasta 2 fotos en total —
// una story por foto, con el copy orientado a la oferta de esa carpeta.
// Si no hay ninguna foto, genera 1 story de solo texto.
//
// Videos: por ahora se detectan pero NO se procesan (el render solo compone
// imágenes fijas) — quedan avisados en el log, no se pierden ni se ignoran
// en silencio. Soporte de video es un módulo aparte, todavía no construido.
//
// La identidad de marca (criterio medular + tono y voz) se lee en cada
// corrida desde docs/identidad-de-marca/*.md — no está hardcodeada acá.
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
const PUBLISHED_DIR = path.join(ROOT, "content/published");
const IDENTIDAD_DIR = path.join(ROOT, "docs/identidad-de-marca");
const MAX_STORIES = 2;

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

// Lee docs/identidad-de-marca/*.md (criterio medular + tono y voz) y los
// concatena. Zero-touch: si el Manual de Marca cambia, se edita el .md
// correspondiente, no este script.
async function loadIdentidadDeMarca() {
  const files = (await readdir(IDENTIDAD_DIR))
    .filter((f) => f.endsWith(".md"))
    .sort();
  const contents = await Promise.all(
    files.map((f) => readFile(path.join(IDENTIDAD_DIR, f), "utf-8"))
  );
  return contents.join("\n\n").trim();
}

function buildSystemPrompt(identidadDeMarca) {
  return `${identidadDeMarca}

TAREA: copy para UNA story vertical de Instagram/Facebook (vive 24hs).
Si te paso una foto, analizala primero y que el copy tenga relación real y
específica con lo que se ve — nada de caption genérica pegada encima.
Si no hay foto: elegí una de estas variantes — un tip corto y
accionable (sobre negociación, manejo de la frustración o el estrés,
gestión emocional, gestión del tiempo, reuniones o presentaciones
efectivas, feedback, resolución de conflictos, ventas), un dato
curioso empresarial o de innovación, o una frase breve para
reflexionar. Variedad día a día — nunca lo mismo dos veces seguidas.

Respondé ÚNICAMENTE con JSON válido, sin nada antes ni después:
{
  "kicker": "etiqueta corta en mayúsculas, máx 3 palabras (ej: CLARIDAD, FOCO REAL)",
  "headline": "la frase principal, máx 11 palabras, va grande en la pieza",
  "subtext": "1-2 líneas de apoyo, máx 26 palabras, cierran con dirección",
  "caption_feed": "1-2 frases + CTA suave para el post de Facebook (no va en la imagen)"
}`;
}

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

async function briefFor(item, avoidHeadlines, systemPrompt) {
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

  const text = await askClaude({ system: systemPrompt, userText, image });
  return extractJson(text);
}

// Freno de una-corrida-por-día: si ya hay una story publicada hoy, una
// segunda corrida (típicamente un reintento manual tras un fallo parcial de
// Zernio) no debe generar contenido nuevo — eso es lo que produjo la
// duplicación real del 21/07 (ver commit de este fix).
async function alreadyGeneratedToday(today) {
  if (!existsSync(PUBLISHED_DIR)) return false;
  const files = await readdir(PUBLISHED_DIR);
  return files.some((f) => f.startsWith(`story-${today}-`));
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  if (await alreadyGeneratedToday(today)) {
    console.log(
      `Ya se generó contenido para hoy (${today}) — no genero de nuevo para evitar publicaciones duplicadas. Si necesitás reintentar una plataforma que falló parcialmente, hacelo manualmente contra el post existente, no re-corriendo este workflow completo.`
    );
    process.exit(0);
  }

  await mkdir(WORK_DIR, { recursive: true });

  const identidadDeMarca = await loadIdentidadDeMarca();
  const systemPrompt = buildSystemPrompt(identidadDeMarca);

  const { photos, videosSkipped } = await findInboxItems();

  if (videosSkipped.length > 0) {
    console.log(`Videos detectados pero NO procesados (soporte de video aún no construido):`);
    videosSkipped.forEach((v) => console.log(`  - ${v.oferta}/${v.name}`));
  }

  const briefs = [];
  const headlines = [];

  if (photos.length === 0) {
    const brief = await briefFor(null, [], systemPrompt);
    brief.mode = "solo-texto";
    brief.oferta = null;
    brief.photoUsedPath = null;
    briefs.push(brief);
  } else {
    for (const item of photos) {
      const brief = await briefFor(item, headlines, systemPrompt);
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
