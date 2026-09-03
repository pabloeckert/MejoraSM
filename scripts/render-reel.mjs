// scripts/render-reel.mjs
// Fase 6 del plan de publicación 2026 — Reel armado de una foto.
//
// Toma la foto más nueva de content/inbox/<dimension>/, le pide a Claude un
// hook + subtexto orientados a esa dimensión, arma un overlay de marca
// transparente (Playwright) y compone un MP4 vertical 1080x1920 con efecto
// Ken Burns (zoom lento) usando ffmpeg. No publica — eso es publish-reel.mjs.
//
// Uso: REEL_OFERTA=personal node scripts/render-reel.mjs
// Env: ANTHROPIC_API_KEY, REEL_OFERTA (una de las dimensiones)
// Salida: content/published/reel-YYYY-MM-DD.mp4 + content/work/reel.json

import { readdir, readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { chromium } from "playwright";
import { askClaude } from "./lib/claude.mjs";
import { logRun, startTimer } from "./lib/run-log.mjs";

const execFileP = promisify(execFile);
const ROOT = process.cwd();
const INBOX_DIR = path.join(ROOT, "content/inbox");
const USED_DIR = path.join(ROOT, "content/used");
const WORK_DIR = path.join(ROOT, "content/work");
const STORY_TEMPLATE = path.join(ROOT, "templates/story-template.html");

const OFERTA = (process.env.REEL_OFERTA || "").trim();
const IMG_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const EXT_TO_MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const DURATION_S = 9;
const FPS = 30;

const OFERTA_CONTEXTO = {
  personal: "Liderazgo, gestión emocional, creencias, objetivos. El resultado: un líder más seguro y efectivo.",
  organizacional: "Cultura, roles, procesos internos, comunicación, liderazgo de equipos.",
  comercial: "Ventas, pricing, fidelización, negociación, marketing — vender desde la confianza.",
  empresarial: "Modelo de negocio, finanzas, escalabilidad, calidad, transformación digital.",
  profesionalizacion: "Nivel integrador: líderes formados, métricas claras, procesos replicables.",
  sociales: "La cara humana de la marca: encuentros de equipo, alianzas, celebraciones. Tono cercano, sin vender.",
};

function escapeHtml(s = "") {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function pickPhoto() {
  const dir = path.join(INBOX_DIR, OFERTA);
  if (!existsSync(dir)) return null;
  const files = (await readdir(dir))
    .filter((f) => IMG_EXTS.includes(path.extname(f).toLowerCase()))
    .sort();
  if (files.length === 0) return null;
  const name = files[files.length - 1]; // la más nueva por nombre
  return { name, path: path.join(dir, name) };
}

async function generateBrief(photoPath) {
  const buffer = await readFile(photoPath);
  const ext = path.extname(photoPath).toLowerCase();
  const system =
    "Sos el equipo creativo de Mejora Continua (consultoría de gestión empresarial, tono argentino, directo, " +
    "sin vender de una — clarifica, no promete magia). Mirás una foto real y devolvés SOLO este JSON:\n" +
    '{"kicker":"UNA PALABRA EN MAYÚSCULAS","headline":"frase corta y potente (max 12 palabras)","subtext":"una línea que amplía (max 18 palabras)","caption":"epígrafe para el feed con 2-3 hashtags de marca"}\n' +
    "El headline tiene que funcionar como gancho de un Reel: entra en los primeros 2 segundos.";
  const userText =
    `Contenido de la dimensión "${OFERTA}": ${OFERTA_CONTEXTO[OFERTA] || ""} ` +
    `Que hable de esa dimensión, no genérico.`;
  const out = await askClaude({
    system,
    userText,
    image: { base64: buffer.toString("base64"), media_type: EXT_TO_MIME[ext] },
    maxTokens: 800,
  });
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`Claude no devolvió JSON: ${out.slice(0, 200)}`);
  return JSON.parse(m[0]);
}

function fontFacesFrom(templateHtml) {
  return [...templateHtml.matchAll(/@font-face\s*\{[\s\S]*?\}/g)].map((x) => x[0]).join("\n");
}

function overlayHtml(brief, fontFaces) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
${fontFaces}
* { margin: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; background: transparent; }
.wrap { position: relative; width: 1080px; height: 1920px; font-family: "Bw Modelica","League Spartan",sans-serif; }
.scrim { position: absolute; inset: 0; background: linear-gradient(to top, rgba(26,61,132,0.92) 0%, rgba(26,61,132,0.55) 32%, rgba(26,61,132,0) 58%); }
.panel { position: absolute; left: 80px; right: 80px; bottom: 210px; }
.kicker { font-family: "League Spartan",sans-serif; font-weight: 600; letter-spacing: .22em; font-size: 30px; color: #F7CC13; text-transform: uppercase; margin-bottom: 22px; }
.headline { font-weight: 500; font-size: 76px; line-height: 1.08; color: #fff; }
.rule { width: 96px; height: 8px; background: #F7CC13; margin: 30px 0; }
.subtext { font-family: "League Spartan",sans-serif; font-weight: 400; font-size: 34px; line-height: 1.35; color: rgba(255,255,255,.92); }
.brand { position: absolute; left: 80px; bottom: 120px; font-weight: 500; font-size: 34px; color: #fff; }
.brand::before { content: ""; display: inline-block; width: 14px; height: 14px; border-radius: 50%; background: #E1061E; margin-right: 10px; vertical-align: middle; }
.site { position: absolute; right: 80px; bottom: 124px; font-family: "League Spartan",sans-serif; font-size: 26px; color: rgba(255,255,255,.8); }
</style></head><body>
<div class="wrap">
  <div class="scrim"></div>
  <div class="panel">
    <div class="kicker">${escapeHtml(brief.kicker || "MEJORA CONTINUA")}</div>
    <div class="headline">${escapeHtml(brief.headline || "")}</div>
    <div class="rule"></div>
    <div class="subtext">${escapeHtml(brief.subtext || "")}</div>
  </div>
  <div class="brand">Mejora Continua</div>
  <div class="site">mejoraok.com</div>
</div></body></html>`;
}

async function renderOverlay(brief) {
  const templateHtml = await readFile(STORY_TEMPLATE, "utf8");
  const html = overlayHtml(brief, fontFacesFrom(templateHtml));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(WORK_DIR, "reel-overlay.png");
  await page.screenshot({ path: out, omitBackground: true });
  await browser.close();
  return out;
}

async function composeVideo(photoPath, overlayPath, outPath) {
  // 1) foto: escalar para llenar 1080x1920 y recortar; zoompan (Ken Burns:
  //    zoom lento del 1.0 al 1.12) a lo largo de toda la duración.
  // 2) overlay PNG transparente encima, estático.
  // 3) pista de audio silenciosa (Instagram Reels exige audio).
  const frames = DURATION_S * FPS;
  const filter =
    `[0:v]scale=1350:2400:force_original_aspect_ratio=increase,crop=1350:2400,` +
    `zoompan=z='min(zoom+0.0006,1.12)':d=${frames}:s=1080x1920:fps=${FPS},setsar=1[bg];` +
    `[bg][1:v]overlay=0:0:format=auto[v]`;
  const args = [
    "-y",
    "-loop", "1", "-t", String(DURATION_S), "-i", photoPath,
    "-i", overlayPath,
    "-f", "lavfi", "-t", String(DURATION_S), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-filter_complex", filter,
    "-map", "[v]", "-map", "2:a",
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest",
    outPath,
  ];
  // timeout: un encode de 9s a 1080x1920 tarda segundos — si ffmpeg cuelga
  // (filtro raro, input corrupto), 3 min es de sobra y evita comerse el job.
  await execFileP("ffmpeg", args, { maxBuffer: 1024 * 1024 * 32, timeout: 180_000 });
}

async function main() {
  await mkdir(WORK_DIR, { recursive: true });

  if (!OFERTA || !(OFERTA in OFERTA_CONTEXTO)) {
    throw new Error(`REEL_OFERTA inválida: "${OFERTA}". Usá una de: ${Object.keys(OFERTA_CONTEXTO).join(", ")}`);
  }

  const photo = await pickPhoto();
  if (!photo) {
    console.log(`No hay fotos en content/inbox/${OFERTA}/ — nada que armar.`);
    await writeFile(path.join(WORK_DIR, "reel.json"), JSON.stringify({ skip: true, reason: "sin fotos" }, null, 2));
    await logRun({ source: "reel", step: "render-reel", status: "skipped", durationMs: elapsed(), metadata: { oferta: OFERTA } });
    return;
  }

  console.log(`Foto: ${photo.name} · dimensión: ${OFERTA}`);
  const brief = await generateBrief(photo.path);
  console.log(`Hook: ${brief.headline}`);

  const overlayPath = await renderOverlay(brief);

  // El MP4 vive solo en el runner — se sube directo a Zernio, no al repo
  // (un video por reel bloatearía el historial de git; las imágenes sí van
  // al repo porque Zernio las sirve desde raw.githubusercontent, el video no).
  const date = new Date().toISOString().slice(0, 10);
  const outPath = path.join(WORK_DIR, `reel-${date}.mp4`);
  await composeVideo(photo.path, overlayPath, outPath);
  console.log(`Reel: ${outPath}`);

  // Mover la foto usada, igual que el pipeline de stories.
  const usedDir = path.join(USED_DIR, OFERTA);
  await mkdir(usedDir, { recursive: true });
  await rename(photo.path, path.join(usedDir, photo.name));

  await writeFile(
    path.join(WORK_DIR, "reel.json"),
    JSON.stringify(
      { video: path.relative(ROOT, outPath), caption: brief.caption || brief.headline || "", headline: brief.headline, oferta: OFERTA },
      null,
      2
    )
  );
  await logRun({ source: "reel", step: "render-reel", status: "success", durationMs: elapsed(), metadata: { oferta: OFERTA, headline: brief.headline } });
}

const elapsed = startTimer();
main().catch(async (e) => {
  console.error(e);
  await logRun({ source: "reel", step: "render-reel", status: "error", durationMs: elapsed(), error: String(e?.message || e) });
  process.exit(1);
});
