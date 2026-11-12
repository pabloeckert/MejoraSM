// scripts/capture_approved_cards.mjs
import { chromium } from "playwright";
import * as path from "node:path";

const SCREENSHOT_DIR = "C:/Users/tabeg/.gemini/antigravity/brain/81da2d3b-c6ba-422c-a896-3c6d8014894b/screenshots";
const BASE_URL = "http://127.0.0.1:4002";

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.25,
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/#/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // Click Aprobar Lote Completo
  const approveBatchBtn = page.locator("button:has-text('Aprobar Lote Completo')").first();
  if (await approveBatchBtn.isVisible()) {
    await approveBatchBtn.click();
    await page.waitForTimeout(500);

    const confirmBtn = page.locator("button:has-text('Confirmar Aprobación de Lote')").first();
    await confirmBtn.click();
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "13_lote_aprobado_exito_verde.png"),
      fullPage: false,
    });
    console.log("✓ Captura 13: Lote Aprobado Exitosamente (Badges Verdes)");
  }

  await browser.close();
}

run();
