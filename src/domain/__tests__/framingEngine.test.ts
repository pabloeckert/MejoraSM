// src/domain/__tests__/framingEngine.test.ts
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  calculateContainmentGeometry,
  renderFramedHtml,
  validateFramingCompliance,
  CANVAS_DIMENSIONS,
  TargetAspectRatio,
} from "../framingEngine";

describe("Subfase 1.4: Engine Visual con Marco Desenfocado Expandido", () => {
  const ratios: TargetAspectRatio[] = ["4:5", "1:1", "9:16"];

  it("calcula dimensiones de canvas canónicas para 4:5, 1:1 y 9:16", () => {
    expect(CANVAS_DIMENSIONS["4:5"]).toEqual({ width: 1080, height: 1350, ratio: "4:5" });
    expect(CANVAS_DIMENSIONS["1:1"]).toEqual({ width: 1080, height: 1080, ratio: "1:1" });
    expect(CANVAS_DIMENSIONS["9:16"]).toEqual({ width: 1080, height: 1920, ratio: "9:16" });
  });

  it("garantiza 0 píxeles recortados y conservación de relación de aspecto en relaciones 4:5, 1:1 y 9:16", () => {
    // Probar con foto horizontal 16:9 (1920x1080) típica de capturas de sesiones y eventos
    const horizontalPhoto = { width: 1920, height: 1080 };

    for (const ratio of ratios) {
      const geo = calculateContainmentGeometry(horizontalPhoto.width, horizontalPhoto.height, ratio);

      expect(geo.croppedPixels).toBe(0);
      expect(geo.aspectRatioPreserved).toBe(true);
      expect(geo.renderWidth).toBeLessThanOrEqual(geo.canvasWidth);
      expect(geo.renderHeight).toBeLessThanOrEqual(geo.canvasHeight);
      expect(geo.blurLayer.filter).toBe("blur(28px) brightness(0.85)");
      expect(geo.frameStyle.background).toBe("#FFFFFF");
      expect(geo.frameStyle.brandBar.azul).toBe("#1A3D84");
    }

    // Probar con foto vertical (800x1200)
    const verticalPhoto = { width: 800, height: 1200 };
    for (const ratio of ratios) {
      const geo = calculateContainmentGeometry(verticalPhoto.width, verticalPhoto.height, ratio);
      expect(geo.croppedPixels).toBe(0);
      expect(geo.aspectRatioPreserved).toBe(true);
    }
  });

  it("renderiza HTML seguro con doble capa, contain, marco blanco y barra tricolor", () => {
    const html = renderFramedHtml("https://example.com/foto_clevel.jpg", "4:5", {
      kicker: "GOBIERNO CORPORATIVO",
      title: "Decisiones directivas que trascienden el día a día",
    });

    const compliance = validateFramingCompliance(html);
    expect(compliance.compliant).toBe(true);
    expect(compliance.errors).toHaveLength(0);

    expect(html).toContain("1080px");
    expect(html).toContain("1350px");
    expect(html).toContain("blur(28px)");
    expect(html).toContain("brightness(0.85)");
    expect(html).toContain("object-fit: contain");
    expect(html).toContain("#FFFFFF");
    expect(html).toContain("#1A3D84");
    expect(html).toContain("#E1061E");
    expect(html).toContain("#F7CC13");
  });

  it("valida que las plantillas del repositorio cumplen la técnica de doble capa", () => {
    const unifiedTemplatePath = path.join(process.cwd(), "templates", "unified-layout-template.html");
    const unifiedContent = fs.readFileSync(unifiedTemplatePath, "utf-8");

    const complianceUnified = validateFramingCompliance(unifiedContent);
    expect(complianceUnified.compliant).toBe(true);

    const postTemplatePath = path.join(process.cwd(), "templates", "post-template.html");
    const postContent = fs.readFileSync(postTemplatePath, "utf-8");

    expect(postContent).toContain("blur(28px) brightness(0.85)");
    expect(postContent).toContain("contain");
  });
});
