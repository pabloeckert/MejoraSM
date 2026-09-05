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
// La identidad de marca (criterio medular + tono y voz) se inyecta
// dinámicamente desde el repo MejoraIdentidad.
//
// Uso: node scripts/generate-brief.mjs
// Env: ANTHROPIC_API_KEY
// Salida: content/work/briefs.json

import { readdir, readFile, rename, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { askClaude } from "./lib/claude.mjs";
import { logRun, startTimer } from "./lib/run-log.mjs";

const ROOT = process.cwd();
const INBOX_DIR = path.join(ROOT, "content/inbox");
const USED_DIR = path.join(ROOT, "content/used");
const WORK_DIR = path.join(ROOT, "content/work");
const PUBLISHED_DIR = path.join(ROOT, "content/published");
const IDENTIDAD_URL = "https://raw.githubusercontent.com/pabloeckert/MejoraIdentidad/main/SKILL.md";

// "Publicar ahora" (2026-09-01, pedido de Pablo) — modo bajo demanda desde el
// EDA: una foto puntual, sin el freno de una-por-día, y con archivos de
// trabajo propios (publish-now-*.json) para no pisarse con el cron diario si
// los dos corren cerca. PUBLISH_NOW_OFERTA fija de qué carpeta sale.
const PUBLISH_NOW = process.env.PUBLISH_NOW === "1";
const PN_OFERTA = (process.env.PUBLISH_NOW_OFERTA || "").trim();
// Collage de 2 fotos (2026-09-04, pedido de Pablo) — opción manual desde
// "Publicar ahora", aditiva: sin este flag, el comportamiento de siempre
// (1 foto, la más reciente) no cambia en nada.
const PN_COLLAGE = process.env.PUBLISH_NOW_COLLAGE === "true";
const MAX_STORIES = PUBLISH_NOW ? (PN_COLLAGE ? 2 : 1) : 2;
const BRIEFS_FILE = PUBLISH_NOW ? "publish-now-briefs.json" : "briefs.json";
const RUN_SOURCE = PUBLISH_NOW ? "publish-now" : "daily-story";

const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const VIDEO_EXTS = [".mp4", ".mov", ".avi", ".webm"];

// Las 4 dimensiones de servicio + Profesionalización, tal cual el Manual de
// Marca (sección "Servicios"), más "Sociales" — agregada el 2026-08-17 a
// pedido explícito de Pablo y Sindy (Taller de la Oferta): contenido de
// equipo/alianzas/vida social de la marca (After Office, celebraciones,
// invitaciones, nuevos proyectos) que no encajaba a la fuerza en ninguna de
// las 5 dimensiones de servicio — Sociales es la única que NO es una
// dimensión de servicio, es la cara humana de la marca. Lista estática a
// propósito ("los Servicios deberían ser estático hoy, veremos cómo
// evoluciona en el futuro" — respuesta real de Pablo). Cada carpeta de
// content/inbox/ corresponde a una de estas.
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
  sociales: {
    nombre: "Sociales",
    contexto:
      "La cara humana y social de la marca, no una dimensión de servicio: " +
      "encuentros de equipo, nuevas alianzas, invitaciones, After Office, " +
      "celebraciones. Tono cercano y festejador, sin vender nada puntual.",
  },
};

// Trae la identidad de marca DIRECTO del repo MejoraIdentidad en cada corrida
// — no hay copia local que desincronizar. Si mañana se agrega una sección al
// SKILL.md de ese repo (o se corrige algo), la próxima story ya sale así,
// sin tocar MejoraSM para nada.
async function loadIdentidadDeMarca() {
  try {
    // raw.githubusercontent.com tiene caídas documentadas — si cuelga, mejor
    // seguir sin contexto fresco que comerse el presupuesto del job.
    const res = await fetch(IDENTIDAD_URL, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      console.warn(`Aviso: MejoraIdentidad respondió ${res.status} — sigo sin contexto de marca fresco.`);
      return "";
    }
    const text = (await res.text()).trim();
    console.log(`Identidad de marca cargada (${text.length} caracteres).`);
    return text;
  } catch (e) {
    console.warn(`Aviso: no pude leer MejoraIdentidad (${e.message}) — sigo sin contexto de marca fresco.`);
    return "";
  }
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

  // En modo "publicar ahora" solo miramos la carpeta de la dimensión pedida.
  const ofertaDirs = PUBLISH_NOW && PN_OFERTA ? [PN_OFERTA] : Object.keys(OFERTAS);
  const photos = [];
  const videosSkipped = [];

  for (const oferta of ofertaDirs) {
    const dir = path.join(INBOX_DIR, oferta);
    if (!existsSync(dir)) continue;
    const files = (await readdir(dir)).sort(); // nombre = YYYYMMDD-HHMMSS-... → orden cronológico
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (Object.keys(EXT_TO_MIME).includes(ext)) {
        photos.push({ path: path.join(dir, f), name: f, oferta });
      } else if (VIDEO_EXTS.includes(ext)) {
        videosSkipped.push({ name: f, oferta });
      }
    }
  }

  // Diario: las primeras N. Publicar ahora: la MÁS reciente (la que Pablo
  // acaba de subir), no la primera de la carpeta.
  const picked = PUBLISH_NOW ? photos.slice(-MAX_STORIES) : photos.slice(0, MAX_STORIES);
  return { photos: picked, videosSkipped };
}

// Tolera que el modelo agregue texto antes/después del JSON pese a la
// instrucción de "solo JSON" — si el parseo directo falla, busca el primer
// bloque {...} balanceado por regex antes de darlo por perdido.
function extractJson(text) {
  const cleaned = text.trim().replace(/^```json\s*|^```\s*|```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* sigue roto — probamos reparar un string sin cerrar */
      }
    }
    // Reparación best-effort: si la respuesta se cortó a mitad de un valor
    // string (caso real 2026-09-01: "Unterminated string in JSON"), intentamos
    // cerrar el string y el objeto y quedarnos con lo que llegó. Mejor eso que
    // fallar toda la corrida por un token de más.
    const repaired = tryRepairTruncatedJson(cleaned);
    if (repaired) return repaired;
    throw e;
  }
}

function tryRepairTruncatedJson(s) {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let body = s.slice(start);
  // cortar cualquier basura después del último caracter "válido" razonable
  const lastQuote = body.lastIndexOf('"');
  if (lastQuote < 0) return null;
  // si hay un número impar de comillas sin escapar, cerramos el string
  const quotes = (body.match(/(?<!\\)"/g) || []).length;
  if (quotes % 2 !== 0) body += '"';
  // cerrar llaves faltantes
  const opens = (body.match(/\{/g) || []).length;
  const closes = (body.match(/\}/g) || []).length;
  body += "}".repeat(Math.max(0, opens - closes));
  // sacar una coma colgante antes del cierre
  body = body.replace(/,\s*\}/g, "}");
  try {
    const obj = JSON.parse(body);
    return obj && obj.headline ? obj : null;
  } catch {
    return null;
  }
}

const BRIEF_ATTEMPTS = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  let lastError;
  for (let attempt = 1; attempt <= BRIEF_ATTEMPTS; attempt++) {
    let text = "";
    try {
      // max_tokens holgado (el brief son ~150 palabras, pero Anthropic a veces
      // devuelve la respuesta cortada — subir el techo baja la probabilidad).
      text = await askClaude({ system: systemPrompt, userText, image, maxTokens: 1600 });
      return extractJson(text);
    } catch (e) {
      lastError = e;
      console.error(
        `Intento ${attempt}/${BRIEF_ATTEMPTS}: ${e.message}. Respuesta cruda:\n---\n${text}\n---`
      );
      // Pausa creciente entre intentos — un hipo transitorio de Anthropic
      // (respuestas truncadas, 529) suele despejarse en unos segundos.
      if (attempt < BRIEF_ATTEMPTS) await sleep(2000 * attempt);
    }
  }
  throw new Error(`No se pudo generar un brief válido tras ${BRIEF_ATTEMPTS} intentos: ${lastError.message}`);
}

// Collage de 2 fotos (2026-09-04) — un solo brief para dos fotos reales,
// pensado como "dos momentos/ángulos de la misma sesión" en vez de dos
// stories separadas. Solo se llama desde "Publicar ahora" con la opción
// de collage activada; el flujo normal (1 foto → briefFor) no la toca.
async function briefForCollage(items, systemPrompt) {
  const oferta = OFERTAS[items[0].oferta];
  const images = [];
  for (const item of items) {
    const ext = path.extname(item.path).toLowerCase();
    const buffer = await readFile(item.path);
    images.push({ base64: buffer.toString("base64"), media_type: EXT_TO_MIME[ext] });
  }
  const userText =
    `Generá la story a partir de estas DOS fotos reales, que se van a mostrar ` +
    `una al lado de la otra en un collage — pensalas como dos momentos o dos ` +
    `ángulos de lo mismo (ej: antes/durante, dos instantes reales de una misma ` +
    `sesión). Un solo copy que hable de las dos fotos juntas, no de una sola. ` +
    `Es contenido de la oferta "${oferta.nombre}": ${oferta.contexto} Que el ` +
    `copy hable de esa dimensión específica, no genérico de la marca.`;

  let lastError;
  for (let attempt = 1; attempt <= BRIEF_ATTEMPTS; attempt++) {
    let text = "";
    try {
      text = await askClaude({ system: systemPrompt, userText, images, maxTokens: 1600 });
      return extractJson(text);
    } catch (e) {
      lastError = e;
      console.error(
        `Intento ${attempt}/${BRIEF_ATTEMPTS} (collage): ${e.message}. Respuesta cruda:\n---\n${text}\n---`
      );
      if (attempt < BRIEF_ATTEMPTS) await sleep(2000 * attempt);
    }
  }
  throw new Error(`No se pudo generar un brief de collage válido tras ${BRIEF_ATTEMPTS} intentos: ${lastError.message}`);
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

async function main(elapsed) {
  const today = new Date().toISOString().slice(0, 10);
  // El freno de una-por-día NO aplica a "publicar ahora" — es una acción
  // manual y puntual de Pablo, no el cron.
  if (!PUBLISH_NOW && (await alreadyGeneratedToday(today))) {
    console.log(
      `Ya se generó contenido para hoy (${today}) — no genero de nuevo para evitar publicaciones duplicadas. Si necesitás reintentar una plataforma que falló parcialmente, hacelo manualmente contra el post existente, no re-corriendo este workflow completo.`
    );
    // Dejar un briefs.json vacío para que render-story / publish-story no
    // exploten con ENOENT en un re-dispatch manual (bug real 2026-08-31).
    await mkdir(WORK_DIR, { recursive: true });
    await writeFile(path.join(WORK_DIR, BRIEFS_FILE), "[]");
    await logRun({ source: "daily-story", step: "generate-brief", status: "skipped", durationMs: elapsed(), metadata: { reason: "already-generated-today", today } });
    process.exit(0);
  }

  if (PUBLISH_NOW && !PN_OFERTA) {
    throw new Error("PUBLISH_NOW sin PUBLISH_NOW_OFERTA — falta la dimensión.");
  }

  await mkdir(WORK_DIR, { recursive: true });

  const identidadDeMarca = await loadIdentidadDeMarca();
  const systemPrompt = buildSystemPrompt(identidadDeMarca);

  const { photos, videosSkipped } = await findInboxItems();

  if (videosSkipped.length > 0) {
    console.log(`Videos detectados pero NO procesados (soporte de video aún no construido):`);
    videosSkipped.forEach((v) => console.log(`  - ${v.oferta}/${v.name}`));
  }

  if (PUBLISH_NOW && photos.length === 0) {
    throw new Error(`No hay ninguna foto en content/inbox/${PN_OFERTA}/ para publicar ahora.`);
  }

  const briefs = [];
  const headlines = [];

  if (photos.length === 0) {
    const brief = await briefFor(null, [], systemPrompt);
    brief.mode = "solo-texto";
    brief.oferta = null;
    brief.photoUsedPath = null;
    briefs.push(brief);
  } else if (PUBLISH_NOW && PN_COLLAGE && photos.length >= 2) {
    // Collage: un solo brief para las 2 fotos más recientes, no una por foto.
    // Si se pidió collage pero solo había 1 foto real, este branch ni se
    // alcanza (la condición de arriba lo evita) y sigue el camino normal.
    const [item1, item2] = photos.slice(-2);
    const brief = await briefForCollage([item1, item2], systemPrompt);
    brief.mode = "collage";
    brief.oferta = item1.oferta;
    const usedDir = path.join(USED_DIR, item1.oferta);
    await mkdir(usedDir, { recursive: true });
    brief.photoUsedPath = path.join(usedDir, item1.name);
    brief.photoUsedPath2 = path.join(usedDir, item2.name);
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

  await writeFile(path.join(WORK_DIR, BRIEFS_FILE), JSON.stringify(briefs, null, 2));
  console.log(`${briefs.length} brief(s) generado(s):`);
  briefs.forEach((b, i) => console.log(`  ${i + 1}. [${b.mode}${b.oferta ? "/" + b.oferta : ""}] ${b.headline}`));

  for (const item of photos) {
    await rename(item.path, path.join(USED_DIR, item.oferta, item.name));
  }

  await logRun({ source: RUN_SOURCE, step: "generate-brief", status: "success", durationMs: elapsed(), metadata: { briefsCount: briefs.length, videosSkipped: videosSkipped.length } });
}

const elapsed = startTimer();
main(elapsed).catch(async (e) => {
  console.error(e);
  await logRun({ source: RUN_SOURCE, step: "generate-brief", status: "error", durationMs: elapsed(), error: String(e?.message || e) });
  process.exit(1);
});
