// scripts/render-story.mjs
// Renderiza las stories del día (1080x1920 PNG) combinando la plantilla de marca
// con los briefs generados por generate-brief.mjs.
//
// Uso: node scripts/render-story.mjs
// Salida: content/published/story-YYYY-MM-DD-N.png + content/work/renders.json

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WORK_DIR = path.join(ROOT, "content/work");
const PUBLISHED_DIR = path.join(ROOT, "content/published");
const TEMPLATE_PATH = path.join(ROOT, "templates/story-template.html");

const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main() {
  const briefs = JSON.parse(await readFile(path.join(WORK_DIR, "briefs.json"), "utf8"));
  const templateBase = await readFile(TEMPLATE_PATH, "utf8");

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });

  await mkdir(PUBLISHED_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const outputs = [];

  for (let i = 0; i < briefs.length; i++) {
    const brief = briefs[i];
    let template = templateBase;

    let photoStyle = "";
    if (brief.mode === "foto" && brief.photoUsedPath) {
      const ext = path.extname(brief.photoUsedPath).toLowerCase();
      const buffer = await readFile(brief.photoUsedPath);
      photoStyle = `background-image: url('data:${EXT_TO_MIME[ext]};base64,${buffer.toString("base64")}');`;
    }

    template = template
      .replace("{{MODE_CLASS}}", brief.mode === "foto" ? "" : "solo-texto")
      .replace("{{PHOTO_STYLE}}", photoStyle)
      .replace("{{KICKER}}", escapeHtml(brief.kicker || "MEJORA CONTINUA"))
      .replace("{{HEADLINE}}", escapeHtml(brief.headline || ""))
      .replace("{{SUBTEXT}}", escapeHtml(brief.subtext || ""));

    await page.setContent(template, { waitUntil: "networkidle" });
    const outputPath = path.join(PUBLISHED_DIR, `story-${date}-${i + 1}.png`);
    await page.screenshot({ path: outputPath, type: "png" });

    outputs.push({
      outputPath: path.relative(ROOT, outputPath),
      caption_feed: brief.caption_feed || "",
      headline: brief.headline,
    });
    console.log("Story renderizada:", outputPath);
  }

  await browser.close();
  await writeFile(path.join(WORK_DIR, "renders.json"), JSON.stringify(outputs, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
