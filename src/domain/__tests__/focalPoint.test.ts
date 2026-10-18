// src/domain/__tests__/focalPoint.test.ts
// Punto focal de rostros: 0% de rostros cortados en 1:1, 4:5 y 9:16 (plan puro + render PNG real a disco).
import { describe, it, expect, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { planFocalCrop, windowContains, type FaceBox } from "../focalPoint";
import { CANVAS_DIMENSIONS, type TargetAspectRatio } from "../framingEngine";
import { encodePng, decodePng, type PngImage } from "../../infrastructure/imaging/pngCodec";
import { renderFocalCropsToDisk } from "../../infrastructure/imaging/focalRenderer";

const RATIOS: TargetAspectRatio[] = ["1:1", "4:5", "9:16"];

describe("planFocalCrop (dominio puro)", () => {
  it("rostro en cada esquina y centro: ventana con ratio exacto que contiene el rostro íntegro", () => {
    const W = 1600, H = 900;
    const posiciones: FaceBox[] = [
      { x: 0, y: 0, width: 120, height: 150 },
      { x: W - 120, y: 0, width: 120, height: 150 },
      { x: 0, y: H - 150, width: 120, height: 150 },
      { x: W - 120, y: H - 150, width: 120, height: 150 },
      { x: 740, y: 360, width: 120, height: 150 },
    ];
    for (const face of posiciones) {
      for (const ratio of RATIOS) {
        const p = planFocalCrop(W, H, ratio, [face]);
        expect(p.strategy).toBe("focal_crop");
        expect(p.facesCut).toBe(0);
        expect(windowContains(p.window!, face)).toBe(true);
        const c = CANVAS_DIMENSIONS[ratio];
        expect(Math.abs(p.window!.width / p.window!.height - c.width / c.height)).toBeLessThan(0.01);
        expect(p.window!.x).toBeGreaterThanOrEqual(0);
        expect(p.window!.x + p.window!.width).toBeLessThanOrEqual(W);
        expect(p.window!.y + p.window!.height).toBeLessThanOrEqual(H);
      }
    }
  });

  it("propiedad: 500 escenarios aleatorios (apaisado/vertical) jamás cortan un rostro", () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    let focal = 0, fallback = 0;
    for (let i = 0; i < 500; i++) {
      const W = 400 + Math.floor(rnd() * 3000), H = 400 + Math.floor(rnd() * 3000);
      const n = 1 + Math.floor(rnd() * 4);
      const faces: FaceBox[] = Array.from({ length: n }, () => {
        const w = 30 + Math.floor(rnd() * 150), h = 30 + Math.floor(rnd() * 150);
        return { x: Math.floor(rnd() * (W - w)), y: Math.floor(rnd() * (H - h)), width: w, height: h };
      });
      for (const ratio of RATIOS) {
        const p = planFocalCrop(W, H, ratio, faces);
        expect(p.facesCut).toBe(0);
        if (p.strategy === "focal_crop") {
          focal++;
          for (const f of faces) expect(windowContains(p.window!, f)).toBe(true);
        } else {
          fallback++;
          expect(p.window).toBeNull(); // contain+blur: 0 px recortados
        }
      }
    }
    expect(focal).toBeGreaterThan(0);
    expect(fallback).toBeGreaterThan(0);
  });

  it("sin rostros o rostros demasiado dispersos => contain_blur_fallback (nunca recorta)", () => {
    expect(planFocalCrop(1600, 900, "9:16", [])).toMatchObject({ strategy: "contain_blur_fallback", reason: "sin_rostros", window: null });
    const dispersos: FaceBox[] = [
      { x: 10, y: 100, width: 100, height: 120 },
      { x: 1480, y: 100, width: 100, height: 120 },
    ];
    expect(planFocalCrop(1600, 900, "9:16", dispersos)).toMatchObject({ strategy: "contain_blur_fallback", reason: "rostros_exceden_ventana" });
    expect(planFocalCrop(1600, 900, "1:1", dispersos)).toMatchObject({ strategy: "contain_blur_fallback" });
  });

  it("rechaza cajas inválidas o fuera de imagen (fallo explícito)", () => {
    expect(() => planFocalCrop(100, 100, "1:1", [{ x: 90, y: 0, width: 50, height: 10 }])).toThrow(/fuera de la imagen/);
    expect(() => planFocalCrop(100, 100, "1:1", [{ x: 0, y: 0, width: 0, height: 10 }])).toThrow(/inválido/);
  });
});

describe("Render estático a disco (PNG real)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "focal-"));
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  function fotoSintetica(W: number, H: number, faces: FaceBox[]): string {
    const data = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) { data[i * 4] = 20; data[i * 4 + 1] = 60; data[i * 4 + 2] = 120; data[i * 4 + 3] = 255; }
    for (const f of faces) {
      for (let y = f.y; y < f.y + f.height; y++) {
        for (let x = f.x; x < f.x + f.width; x++) {
          const o = (y * W + x) * 4;
          data[o] = 255; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 255;
        }
      }
    }
    const img: PngImage = { width: W, height: H, colorType: 6, channels: 4, data };
    const p = path.join(tmp, "foto.png");
    fs.writeFileSync(p, encodePng(img));
    return p;
  }

  const rojos = (img: PngImage) => {
    let n = 0;
    for (let i = 0; i < img.width * img.height; i++) if (img.data[i * 4] === 255 && img.data[i * 4 + 1] === 0) n++;
    return n;
  };

  it("los 3 archivos recortados conservan el 100% de píxeles de rostro y tienen el ratio exacto", async () => {
    const faces: FaceBox[] = [{ x: 30, y: 40, width: 60, height: 80 }, { x: 110, y: 50, width: 50, height: 70 }];
    const areaTotal = 60 * 80 + 50 * 70;
    const entradas = await renderFocalCropsToDisk({
      inputPath: fotoSintetica(1200, 800, faces),
      outDir: path.join(tmp, "out"),
      detector: () => faces,
    });
    expect(entradas).toHaveLength(3);
    for (const e of entradas) {
      expect(e.plan.strategy).toBe("focal_crop");
      expect(fs.existsSync(e.outputPath!)).toBe(true);
      const out = decodePng(fs.readFileSync(e.outputPath!));
      const c = CANVAS_DIMENSIONS[e.plan.ratio];
      expect(Math.abs(out.width / out.height - c.width / c.height)).toBeLessThan(0.01);
      expect(rojos(out)).toBe(areaTotal); // 0% de rostro cortado, verificado píxel a píxel
    }
  });

  it("sin rostros no escribe recorte (outputPath null)", async () => {
    const e = await renderFocalCropsToDisk({ inputPath: fotoSintetica(600, 600, []), outDir: path.join(tmp, "out2"), detector: () => [] });
    expect(e.every((x) => x.outputPath === null && x.plan.strategy === "contain_blur_fallback")).toBe(true);
  });

  it("PNG no soportado o corrupto falla de forma explícita", () => {
    expect(() => decodePng(Buffer.from("no soy un png"))).toThrow(/PNG/);
  });
});
