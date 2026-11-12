// scripts/e2e_playwright_tour.mjs
// RECORRIDO REAL E2E AUTOMATIZADO Y CAPTURA DE PANTALLAS EN PRODUCCIÓN LOCAL SOBERANA
import { chromium } from "playwright";
import * as path from "node:path";
import * as fs from "node:fs";

const SCREENSHOT_DIR = "C:/Users/tabeg/.gemini/antigravity/brain/81da2d3b-c6ba-422c-a896-3c6d8014894b/screenshots";
const BASE_URL = "http://127.0.0.1:4002";

async function runTour() {
  console.log("Iniciando suite de navegación Playwright E2E contra Producción Soberana...");
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.25,
  });

  const page = await context.newPage();

  const consoleLogs = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleLogs.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    consoleLogs.push(`[PAGE ERROR] ${err.message}`);
  });

  try {
    // 1. Tablero Semanal (Mesa de Revisión y Control)
    console.log("1. Navegando a Tablero Semanal (#/)...");
    await page.goto(`${BASE_URL}/#/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01_tablero_semanal_general.png"),
      fullPage: false,
    });
    console.log("✓ Captura 01: Tablero Semanal");

    // Modal de detalle/edición de una propuesta
    const reviewBtn = page.locator("button:has-text('Revisar'), button:has-text('Editar')").first();
    if (await reviewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reviewBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "02_propuesta_modal_detalle.png"),
      });
      console.log("✓ Captura 02: Modal Detalle / Framing Engine");

      // Cerrar modal
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
    }

    // 2. Bóveda de Conocimiento B2B
    console.log("2. Navegando a Bóveda RAG (#/boveda)...");
    await page.goto(`${BASE_URL}/#/boveda`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03_boveda_rag_conocimiento.png"),
      fullPage: false,
    });
    console.log("✓ Captura 03: Bóveda de Conocimiento RAG");

    // 3. Calendario Editorial
    console.log("3. Navegando a Calendario (#/calendario)...");
    await page.goto(`${BASE_URL}/#/calendario`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04_calendario_editorial.png"),
      fullPage: false,
    });
    console.log("✓ Captura 04: Calendario Editorial");

    // 4. Mesa de Diálogo Multi-Agente
    console.log("4. Navegando a Mesa de Diálogo (#/mesa)...");
    await page.goto(`${BASE_URL}/#/mesa`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05_mesa_dialogo_agentes.png"),
      fullPage: false,
    });
    console.log("✓ Captura 05: Mesa de Diálogo Multi-Agente");

    // 5. Hub de Ingesta Multimedia (Subir Material)
    console.log("5. Navegando a Hub de Ingesta (#/hub)...");
    await page.goto(`${BASE_URL}/#/hub`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06_hub_ingesta_multimedia.png"),
      fullPage: false,
    });
    console.log("✓ Captura 06: Hub de Ingesta Multimedia");

    // 6. Monitor de Operaciones SRE (Daemon, Outbox & Circuit Breaker)
    console.log("6. Navegando a Monitor SRE (#/monitor)...");
    await page.goto(`${BASE_URL}/#/monitor`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07_monitor_sre_daemon.png"),
      fullPage: false,
    });
    console.log("✓ Captura 07: Monitor SRE");

    // 7. Citas Studio (Generador Visual de Placas de Autoridad)
    console.log("7. Navegando a Citas Studio (#/citas)...");
    await page.goto(`${BASE_URL}/#/citas`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "08_citas_studio_placas.png"),
      fullPage: false,
    });
    console.log("✓ Captura 08: Citas Studio");

    // 8. Configuración
    console.log("8. Navegando a Configuración (#/configuracion)...");
    await page.goto(`${BASE_URL}/#/configuracion`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "09_configuracion_sistema.png"),
      fullPage: false,
    });
    console.log("✓ Captura 09: Configuración");

    console.log("\n==================================================");
    console.log("RECORRIDO E2E Y CAPTURAS COMPLETADAS CON ÉXITO");
    console.log(`Directorio de destino: ${SCREENSHOT_DIR}`);
    if (consoleLogs.length > 0) {
      console.log("\nLogs capturados en navegador:");
      consoleLogs.slice(0, 10).forEach((l) => console.log(l));
    } else {
      console.log("0 errores de consola en runtime.");
    }
    console.log("==================================================");
  } catch (error) {
    console.error("Error durante el recorrido Playwright:", error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTour();
