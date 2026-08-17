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

// Divide el body en oraciones para repartirlas entre los slides del
// carrusel — no hay estructura de "slide N" en la propuesta (el Creativo
// genera un copy corrido, no un guión por slide), así que esta es la forma
// más simple de no mandar el texto completo apretado en una sola imagen.
function splitSentences(text = "") {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (matches?.length) return matches.map((s) => s.trim()).filter(Boolean);
  return text.trim() ? [text.trim()] : [];
}

function buildCarruselSlides(proposal, maxSlides = 4) {
  const sentences = splitSentences(proposal.body || "");
  const bodySlideCount = Math.max(1, Math.min(maxSlides - (proposal.cta ? 1 : 0), sentences.length || 1));
  const perSlide = Math.ceil(sentences.length / bodySlideCount) || 1;
  const bodyChunks = [];
  for (let i = 0; i < sentences.length; i += perSlide) {
    bodyChunks.push(sentences.slice(i, i + perSlide).join(" "));
  }
  if (bodyChunks.length === 0) bodyChunks.push("");

  const slides = bodyChunks.map((chunk, i) => ({
    headline: i === 0 ? proposal.hook || proposal.title || "" : "",
    subtext: chunk,
  }));
  if (proposal.cta) slides.push({ headline: "", subtext: proposal.cta });
  return slides.slice(0, maxSlides);
}

function buildCaption(proposal) {
  // Misma concatenación que tenía supabase/functions/publisher/index.ts
  // (publishScheduled()) — se mantiene el mismo criterio de caption.
  return [proposal.hook, "", proposal.body, "", proposal.cta, "", ...(proposal.hashtags || [])]
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
          kicker: ofertaLabel,
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
