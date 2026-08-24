// scripts/render-scheduled-posts.mjs
// Primer paso del publicador autónomo de posts de feed del EDA — mismo
// principio de dos pasos que generate-brief.mjs + render-story.mjs: acá
// solo se busca qué hay que publicar y se renderiza la imagen; el publish
// real a Zernio (scripts/publish-scheduled-posts.mjs) corre después,
// una vez que la imagen ya está commiteada y accesible por
// raw.githubusercontent.com (si se publicara antes del commit, Zernio
// intentaría bajar una URL que todavía no existe).
//
// Fuente de contenido: tabla `proposals` de Supabase (generada por el
// orchestrator del EDA vía Mesa de Diálogo), filtrando status='scheduled',
// scheduled_at <= ahora y format='post' (carruseles/historias quedan fuera
// de este alcance).
//
// Uso: node scripts/render-scheduled-posts.mjs
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Salida: content/work/scheduled-posts.json

import { readdir, readFile, rename, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { logRun, startTimer } from "./lib/run-log.mjs";

const ROOT = process.cwd();
const INBOX_DIR = path.join(ROOT, "content/inbox");
const USED_DIR = path.join(ROOT, "content/used");
const PUBLISHED_DIR = path.join(ROOT, "content/published");
const WORK_DIR = path.join(ROOT, "content/work");
const TEMPLATE_PATH = path.join(ROOT, "templates/post-template.html");
const MANIFEST_PATH = path.join(WORK_DIR, "scheduled-posts.json");

const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Mismas 4 dimensiones + Profesionalización que scripts/generate-brief.mjs —
// solo necesitamos el nombre visible acá (el contexto de negocio ya lo usó
// el orchestrator al generar la propuesta, no hace falta de nuevo).
const OFERTA_LABELS = {
  personal: "Personal",
  organizacional: "Organizacional",
  comercial: "Comercial",
  empresarial: "Empresarial",
  profesionalizacion: "Profesionalización",
  sociales: "Sociales",
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// El body de la propuesta es el copy completo del post (varios párrafos) —
// para la pieza visual hace falta un resumen corto; el texto completo va en
// el caption de Zernio (publish-scheduled-posts.mjs), no en la imagen.
function truncateWords(text = "", maxWords = 28) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ") + "…";
}

async function fetchDueProposals() {
  const now = new Date().toISOString();
  const url =
    `${SUPABASE_URL}/rest/v1/proposals?status=eq.scheduled` +
    `&scheduled_at=lte.${encodeURIComponent(now)}&format=in.(post,carrusel)` +
    `&select=*&order=scheduled_at.asc&limit=5`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Error consultando propuestas: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function findPhoto(oferta) {
  if (!oferta) return null;
  const dir = path.join(INBOX_DIR, oferta);
  if (!existsSync(dir)) return null;
  const files = (await readdir(dir)).sort();
  const photo = files.find((f) => Object.keys(EXT_TO_MIME).includes(path.extname(f).toLowerCase()));
  return photo ? { dir, name: photo, path: path.join(dir, photo) } : null;
}

// Para un carrusel, hasta `count` fotos de la misma oferta (una por slide) —
// si hay menos fotos que slides, los slides sobrantes salen en solo-texto
// (mismo criterio de fallback que un post simple sin foto).
async function findPhotos(oferta, count) {
  if (!oferta) return [];
  const dir = path.join(INBOX_DIR, oferta);
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir))
    .filter((f) => Object.keys(EXT_TO_MIME).includes(path.extname(f).toLowerCase()))
    .sort();
  return files.slice(0, count).map((name) => ({ dir, name, path: path.join(dir, name) }));
}

// Divide el body en oraciones — fallback para cuando el Creativo escribió
// un copy corrido, sin estructura de slides explícita.
function splitSentences(text = "") {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (matches?.length) return matches.map((s) => s.trim()).filter(Boolean);
  return text.trim() ? [text.trim()] : [];
}

// El Estratega a veces recomienda una estructura de N slides (ej. "Slide 1:
// Hook / Slide 2-3: La trampa..."), y el Creativo la sigue literal,
// escribiendo el body con encabezados tipo "**Slide 1 (Portada):**" — son
// notas para un diseñador humano, nunca texto real de la pieza. Hallazgo
// real 2026-08-20: un carrusel real se publicó con esos encabezados
// visibles en la imagen Y en la leyenda pública de Instagram/Facebook,
// porque el render viejo no los reconocía, solo troceaba todo por
// oraciones sin filtrar. `stripMarkdown` + este regex sacan la etiqueta;
// si no hay estructura de slides, se cae al troceo por oraciones de antes.
const SLIDE_MARKER_RE = /\*\*\s*slide\s*\d+[^*]*\*\*:?/gi;

function stripMarkdown(text = "") {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function hasSlideMarkers(text = "") {
  return /\*\*\s*slide\s*\d+/i.test(text);
}

// Un texto corto por slide — "una foto y un texto alcanza" (pedido real de
// Pablo el 2026-08-20, tras ver un carrusel real con demasiado texto
// encima) — se toma solo la primera oración de cada bloque detectado, no
// el bloque completo, y se acota a un puñado de palabras.
//
// Dos reglas más, feedback real de Pablo 2026-08-24 sobre una prueba real:
// 1. Todas las slides usan el mismo campo `headline` (misma tipografía
//    grande) — antes el hook iba en `headline` y el resto del cuerpo en
//    `subtext` (más chico, más gris), y el carrusel se veía como dos
//    piezas de diseño distintas ("que el diseño sea idéntico a la primera,
//    todas iguales").
// 2. Sin slide final de CTA. Cerrar el carrusel con una slide dedicada solo
//    al llamado a la acción, aislada del resto, lee como venta agresiva
//    aunque el texto sea el aprobado por marca — el problema es la puesta
//    en escena, no la frase (ver Criterio Medular: "no es agresivo... no
//    vende, clarifica"; posicionamiento "padrino, no proveedor"). El CTA
//    sigue viviendo en la leyenda (buildCaption) — nunca en su propia
//    slide. Regla dura para todo cierre futuro, no solo esta pieza.
// Tope bajado de 4 a 3 slides (hook + 2 de cuerpo) el 2026-08-24, mismo
// feedback real: "pieza 4 del carrusel no, cierra con la 3" — sacar la
// slide de CTA sin bajar el tope hacía que un cuarto slide de cuerpo
// ocupara ese lugar en vez de dejar el carrusel más corto, como se pidió.
function buildCarruselSlides(proposal, maxSlides = 3) {
  const rawBody = proposal.body || "";
  const structured = hasSlideMarkers(rawBody);
  let chunks = structured
    ? rawBody.split(SLIDE_MARKER_RE).map((c) => stripMarkdown(c)).filter(Boolean)
    : splitSentences(rawBody);

  // Si el Creativo escribió un guión por slide, el primer bloque ("Slide 1
  // / Portada") repite casi textual el hook — se saltea para no duplicar
  // la misma frase como headline Y como subtexto del slide 1 (hallazgo
  // real 2026-08-20: el carrusel publicado mostraba la misma frase dos
  // veces, una vez grande y una vez chica, en el mismo slide).
  if (structured) chunks = chunks.slice(1);

  // Un texto por slide, no un párrafo — slide 1 es SOLO el hook, cada
  // slide siguiente lleva una única frase corta. Ya no se reserva un slot
  // para CTA (no hay slide de CTA); el largo real del carrusel lo define
  // el contenido disponible, no un conteo fijo.
  const maxBodySlides = Math.max(0, maxSlides - 1);
  const bodyChunks = chunks.slice(0, maxBodySlides).map((chunk) => {
    const firstSentence = splitSentences(chunk)[0] || chunk;
    return truncateWords(firstSentence, 16);
  });

  const slides = [{ headline: proposal.hook || proposal.title || "", subtext: "" }];
  bodyChunks.forEach((text) => slides.push({ headline: text, subtext: "" }));
  return slides.slice(0, maxSlides);
}

function buildCaption(proposal) {
  // Carrusel: las slides ya muestran el copy completo — repetir todo en la
  // leyenda es ruido, y era la fuente real del bug de "Slide N" filtrándose
  // a la leyenda pública (hallazgo real, 2026-08-20). Post simple: la
  // imagen no tiene lugar para todo el texto, así que la leyenda sí lleva
  // el body — limpio de encabezados de slide, por las dudas.
  if (proposal.format === "carrusel") {
    return [proposal.hook, "", proposal.cta, "", ...(proposal.hashtags || [])].filter(Boolean).join("\n");
  }
  const cleanBody = stripMarkdown((proposal.body || "").replace(SLIDE_MARKER_RE, "\n\n")).replace(/\n{3,}/g, "\n\n");
  return [proposal.hook, "", cleanBody, "", proposal.cta, "", ...(proposal.hashtags || [])]
    .filter(Boolean)
    .join("\n");
}

async function markRendered(proposalId, renderedImagePath) {
  await fetch(`${SUPABASE_URL}/rest/v1/proposals?id=eq.${proposalId}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ rendered_image_path: renderedImagePath }),
  });
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.");
    process.exit(1);
  }

  const proposals = await fetchDueProposals();
  await mkdir(WORK_DIR, { recursive: true });

  if (proposals.length === 0) {
    console.log("No hay propuestas de feed pendientes de publicación.");
    await writeFile(MANIFEST_PATH, "[]");
    await logRun({ source: "publish-scheduled-posts", step: "render-scheduled-posts", status: "skipped", durationMs: elapsed(), metadata: { reason: "no-due-proposals" } });
    return;
  }

  const templateBase = await readFile(TEMPLATE_PATH, "utf8");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  await mkdir(PUBLISHED_DIR, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const manifest = [];

  async function renderSlide(template, { photo, ofertaLabel, kicker, headline, subtext }) {
    let photoStyle = "";
    if (photo) {
      const ext = path.extname(photo.name).toLowerCase();
      const buffer = await readFile(photo.path);
      photoStyle = `background-image: url('data:${EXT_TO_MIME[ext]};base64,${buffer.toString("base64")}');`;
    }
    return template
      .replace("{{MODE_CLASS}}", photo ? "" : "solo-texto")
      .replace("{{PHOTO_STYLE}}", photoStyle)
      .replace("{{OFERTA_LABEL}}", escapeHtml(ofertaLabel))
      .replace("{{KICKER}}", escapeHtml(kicker))
      .replace("{{HEADLINE}}", escapeHtml(headline))
      .replace("{{SUBTEXT}}", escapeHtml(truncateWords(subtext)));
  }

  async function markPhotoUsed(photo, oferta) {
    const usedDir = path.join(USED_DIR, oferta);
    await mkdir(usedDir, { recursive: true });
    await rename(photo.path, path.join(usedDir, photo.name));
  }

  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i];
    const ofertaLabel = OFERTA_LABELS[proposal.oferta] || "Mejora Continua";

    if (proposal.format === "carrusel") {
      const slides = buildCarruselSlides(proposal);
      const photos = await findPhotos(proposal.oferta, slides.length);
      const outputPaths = [];

      for (let s = 0; s < slides.length; s++) {
        const photo = photos[s] || null;
        const html = await renderSlide(templateBase, {
          photo,
          ofertaLabel,
          // Sin kicker propio: la pastilla ({{OFERTA_LABEL}}) ya muestra la
          // dimensión — repetirla acá era una duplicación visual real
          // (misma palabra dos veces en la pieza), hallazgo 2026-08-20.
          kicker: "",
          headline: slides[s].headline,
          subtext: slides[s].subtext,
        });
        await page.setContent(html, { waitUntil: "networkidle" });
        const outputPath = path.join(PUBLISHED_DIR, `post-${date}-${i + 1}-${s + 1}.jpg`);
        await page.screenshot({ path: outputPath, type: "jpeg", quality: 92 });
        if (photo) await markPhotoUsed(photo, proposal.oferta);
        outputPaths.push(path.relative(ROOT, outputPath));
      }

      // rendered_image_path guarda el primer slide — es lo que usa el
      // dashboard como miniatura representativa del post (ver sync-history.mjs).
      await markRendered(proposal.id, outputPaths[0]);
      manifest.push({
        proposalId: proposal.id,
        outputPaths,
        caption: buildCaption(proposal),
      });
      console.log(`Carrusel renderizado (${outputPaths.length} slides) para propuesta ${proposal.id}:`, outputPaths.join(", "));
      continue;
    }

    const photo = await findPhoto(proposal.oferta);
    const html = await renderSlide(templateBase, {
      photo,
      ofertaLabel,
      kicker: ofertaLabel,
      headline: proposal.hook || proposal.title || "",
      subtext: proposal.body || "",
    });
    await page.setContent(html, { waitUntil: "networkidle" });
    const outputPath = path.join(PUBLISHED_DIR, `post-${date}-${i + 1}.jpg`);
    await page.screenshot({ path: outputPath, type: "jpeg", quality: 92 });

    if (photo) await markPhotoUsed(photo, proposal.oferta);

    const relativeOutputPath = path.relative(ROOT, outputPath);
    await markRendered(proposal.id, relativeOutputPath);

    manifest.push({
      proposalId: proposal.id,
      outputPaths: [relativeOutputPath],
      caption: buildCaption(proposal),
    });
    console.log(`Post renderizado para propuesta ${proposal.id}:`, outputPath);
  }

  await browser.close();
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  await logRun({ source: "publish-scheduled-posts", step: "render-scheduled-posts", status: "success", durationMs: elapsed(), metadata: { count: manifest.length } });
}

const elapsed = startTimer();
main().catch(async (e) => {
  console.error(e);
  await logRun({ source: "publish-scheduled-posts", step: "render-scheduled-posts", status: "error", durationMs: elapsed(), error: String(e?.message || e) });
  process.exit(1);
});
