// src/domain/__tests__/goldenFramingPhase3.test.ts
import { describe, it, expect, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { planFocalCrop, type FaceBox } from "../focalPoint";
import { CANVAS_DIMENSIONS, type TargetAspectRatio } from "../framingEngine";
import { encodePng, decodePng, type PngImage } from "../../infrastructure/imaging/pngCodec";
import { renderFocalCropsToDisk } from "../../infrastructure/imaging/focalRenderer";

const GOLDEN_RATIOS: TargetAspectRatio[] = ["1:1", "4:5", "9:16"];

describe("Fase 3: Tests de Imagen Dorada y Punto Focal Obligatorio (1:1, 4:5, 9:16)", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "golden-framing-"));
  afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  function generarImagenDorada(W: number, H: number, faces: FaceBox[]): string {
    const data = Buffer.alloc(W * H * 4);
    // Fondo de prueba
    for (let i = 0; i < W * H; i++) {
      data[i * 4] = 26;     // #1A
      data[i * 4 + 1] = 61; // #3D
      data[i * 4 + 2] = 132; // #84 (Azul Institucional)
      data[i * 4 + 3] = 255;
    }
    // Rostros de prueba
    for (const f of faces) {
      for (let y = f.y; y < f.y + f.height; y++) {
        for (let x = f.x; x < f.x + f.width; x++) {
          const o = (y * W + x) * 4;
          data[o] = 247;     // #F7
          data[o + 1] = 204; // #CC
          data[o + 2] = 19;  // #13 (Amarillo Institucional)
          data[o + 3] = 255;
        }
      }
    }
    const img: PngImage = { width: W, height: H, colorType: 6, channels: 4, data };
    const filePath = path.join(tmpDir, `golden_${W}x${H}.png`);
    fs.writeFileSync(filePath, encodePng(img));
    return filePath;
  }

  it("punto focal OBLIGATORIO en metadatos_json para todas las relaciones de aspecto (con y sin rostros)", () => {
    const W = 1920, H = 1080;
    const face: FaceBox = { x: 800, y: 300, width: 200, height: 250 };

    // 1. Caso con rostro detectado
    for (const ratio of GOLDEN_RATIOS) {
      const plan = planFocalCrop(W, H, ratio, [face]);
      const metadata = JSON.parse(JSON.stringify(plan));

      // Verificación innegociable de presencia obligatoria de focalPoint
      expect(metadata.focalPoint).toBeDefined();
      expect(typeof metadata.focalPoint.x).toBe("number");
      expect(typeof metadata.focalPoint.y).toBe("number");
      expect(metadata.focalPoint.x).toBeGreaterThan(0);
      expect(metadata.focalPoint.y).toBeGreaterThan(0);
      expect(metadata.facesCut).toBe(0);
    }

    // 2. Caso sin rostros: centro óptico obligatorio en metadatos_json
    for (const ratio of GOLDEN_RATIOS) {
      const planSinRostros = planFocalCrop(W, H, ratio, []);
      const metadata = JSON.parse(JSON.stringify(planSinRostros));

      expect(metadata.focalPoint).toBeDefined();
      expect(metadata.focalPoint).toEqual({ x: 960, y: 540 });
      expect(metadata.strategy).toBe("contain_blur_fallback");
    }
  });

  it("render dorado de 1:1, 4:5 y 9:16: exactitud dimensional y 0% de rostro recortado", async () => {
    const W = 1200, H = 800;
    const face: FaceBox = { x: 500, y: 200, width: 150, height: 180 };
    const areaRostro = 150 * 180;
    const imgPath = generarImagenDorada(W, H, [face]);

    const rendered = await renderFocalCropsToDisk({
      inputPath: imgPath,
      outDir: path.join(tmpDir, "renders"),
      detector: () => [face],
      ratios: GOLDEN_RATIOS,
    });

    expect(rendered).toHaveLength(3);

    for (const entry of rendered) {
      expect(entry.plan.strategy).toBe("focal_crop");
      expect(entry.outputPath).not.toBeNull();
      expect(fs.existsSync(entry.outputPath!)).toBe(true);

      const buf = fs.readFileSync(entry.outputPath!);
      const decoded = decodePng(buf);
      const targetCanvas = CANVAS_DIMENSIONS[entry.plan.ratio];
      const targetRatio = targetCanvas.width / targetCanvas.height;
      const actualRatio = decoded.width / decoded.height;

      // Tolerancia matemática de relación de aspecto < 0.01
      expect(Math.abs(actualRatio - targetRatio)).toBeLessThan(0.01);

      // Verificación cero rostros cortados: todos los píxeles del rostro (#F7CC13) presentes
      let yellowPixels = 0;
      for (let i = 0; i < decoded.width * decoded.height; i++) {
        if (
          decoded.data[i * 4] === 247 &&
          decoded.data[i * 4 + 1] === 204 &&
          decoded.data[i * 4 + 2] === 19
        ) {
          yellowPixels++;
        }
      }
      expect(yellowPixels).toBe(areaRostro);
    }
  });
});
