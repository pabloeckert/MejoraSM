// scripts/e2e_interactive_actions.mjs
// CAPTURAS DE INTERACCIÓN EN VIVO: APROBACIÓN, INYECCIÓN DE LEADS Y PREVIEW DE RATIOS
import { chromium } from "playwright";
import * as path from "node:path";

const SCREENSHOT_DIR = "C:/Users/tabeg/.gemini/antigravity/brain/81da2d3b-c6ba-422c-a896-3c6d8014894b/screenshots";
const BASE_URL = "http://127.0.0.1:4002";

async function runInteractiveActions() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.25,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/#/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // 1. Probar Inyección de Lead en Vivo (Botón Amarillo Superior)
    const injectLeadBtn = page.locator("button:has-text('PROBAR CONVERSIÓN REAL'), button:has-text('Inyectar Lead')").first();
    if (await injectLeadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Haciendo clic en 'PROBAR CONVERSIÓN REAL'...");
      await injectLeadBtn.click();
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "10_interaccion_inyeccion_lead_exito.png"),
        fullPage: false,
      });
      console.log("✓ Captura 10: Inyección de Lead y Atribución en Vivo");
    }

    // 2. Aprobar Lote de la Semana 1
    const approveBatchBtn = page.locator("button:has-text('Aprobar Lote Completo')").first();
    if (await approveBatchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Aprobando lote de la semana 1...");
      await approveBatchBtn.click();
      await page.waitForTimeout(800);

      // Si aparece confirm dialog
      const confirmDialogBtn = page.locator("[role='dialog'] button:has-text('Confirmar'), [role='dialog'] button:has-text('Aprobar')").first();
      if (await confirmDialogBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirmDialogBtn.click();
        await page.waitForTimeout(1000);
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "11_interaccion_lote_aprobado.png"),
        fullPage: false,
      });
      console.log("✓ Captura 11: Estado de Propuestas Aprobadas");
    }

    // 3. Inspeccionar el Framing Engine interactivo con Ratios (1:1, 4:5, 9:16)
    const editBtn = page.locator("button:has-text('Revisar'), button:has-text('Editar')").first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(1000);

      // Clic en pestaña o selector de ratios si existe
      const ratioBtn = page.locator("button:has-text('9:16'), [data-ratio='9:16']").first();
      if (await ratioBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await ratioBtn.click();
        await page.waitForTimeout(500);
      }

      // Clic en borrador B
      const draftBBtn = page.locator("button:has-text('Opción B'), [data-draft='B']").first();
      if (await draftBBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await draftBBtn.click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "12_modal_framing_borradores.png"),
      });
      console.log("✓ Captura 12: Framing Engine con Conmutación de Ratios y Borradores");
    }
  } catch (err) {
    console.error("Error en interactive actions:", err);
  } finally {
    await browser.close();
  }
}

runInteractiveActions();
