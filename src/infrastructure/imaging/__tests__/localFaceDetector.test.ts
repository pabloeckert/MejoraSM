// src/infrastructure/imaging/__tests__/localFaceDetector.test.ts
// Tests unitarios y de integración para el detector soberano de rostros y puntos focales.
import { describe, it, expect, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  isSkinPixel,
  isFaceOrSalientPixel,
  detectFacesInPixelArray,
  detectPizarraSubject,
  calculateFocalPoint,
  parsePngDimensions,
  parseJpegDimensions,
  detectFacesLocally,
  detectFacesFromDataUrl,
} from "../localFaceDetector";
import { renderFocalCropsToDisk } from "../focalRenderer";
import { encodePng, decodePng, type PngImage } from "../pngCodec";
import { CANVAS_DIMENSIONS, type TargetAspectRatio } from "../../../domain/framingEngine";
import type { FaceBox } from "../../../domain/focalPoint";

describe("localFaceDetector: Clasificador Colorimétrico Soberano", () => {
  it("clasifica correctamente píxeles de piel humana en condiciones normales", () => {
    // Tonos de piel humana típicos (RGB)
    expect(isSkinPixel(210, 160, 130)).toBe(true);
    expect(isSkinPixel(185, 130, 95)).toBe(true);
    expect(isSkinPixel(125, 80, 60)).toBe(true);
    expect(isSkinPixel(230, 180, 150)).toBe(true);

    // No son piel humana:
    expect(isSkinPixel(26, 61, 132)).toBe(false);   // Azul institucional MejoraSM
    expect(isSkinPixel(30, 180, 40)).toBe(false);   // Verde
    expect(isSkinPixel(255, 255, 255)).toBe(false); // Blanco saturado
    expect(isSkinPixel(0, 0, 0)).toBe(false);       // Negro absoluto
    expect(isSkinPixel(80, 80, 80)).toBe(false);    // Gris neutro
  });

  it("reconoce tanto piel humana como marcadores sintéticos dorados (#F7CC13) y rojos", () => {
    // Piel humana
    expect(isFaceOrSalientPixel(210, 160, 130)).toBe(true);

    // Amarillo institucional / dorado (#F7CC13: 247, 204, 19)
    expect(isFaceOrSalientPixel(247, 204, 19)).toBe(true);

    // Rojo puro (255, 0, 0)
    expect(isFaceOrSalientPixel(255, 0, 0)).toBe(true);

    // Fondo azul (#1A3D84: 26, 61, 132)
    expect(isFaceOrSalientPixel(26, 61, 132)).toBe(false);
  });
});

describe("localFaceDetector: Detección y Clustering en Arreglo de Píxeles", () => {
  function crearLienzo(w: number, h: number, bg: [number, number, number]): Buffer {
    const buf = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      buf[i * 4] = bg[0];
      buf[i * 4 + 1] = bg[1];
      buf[i * 4 + 2] = bg[2];
      buf[i * 4 + 3] = 255;
    }
    return buf;
  }

  function dibujarRect(
    buf: Buffer,
    w: number,
    x: number,
    y: number,
    rw: number,
    rh: number,
    color: [number, number, number]
  ): void {
    for (let py = y; py < y + rh; py++) {
      for (let px = x; px < x + rw; px++) {
        const idx = (py * w + px) * 4;
        buf[idx] = color[0];
        buf[idx + 1] = color[1];
        buf[idx + 2] = color[2];
        buf[idx + 3] = 255;
      }
    }
  }

  it("detecta un rostro con tono de piel humana y computa caja delimitadora ajustada", () => {
    const W = 800, H = 600;
    const buf = crearLienzo(W, H, [26, 61, 132]); // Fondo azul institucional
    // Dibujar parche de piel humana
    const faceX = 320, faceY = 150, faceW = 120, faceH = 140;
    dibujarRect(buf, W, faceX, faceY, faceW, faceH, [215, 160, 130]);

    const boxes = detectFacesInPixelArray(buf, W, H, 4);
    expect(boxes.length).toBe(1);

    const b = boxes[0];
    expect(b.x).toBeGreaterThanOrEqual(faceX - 5);
    expect(b.x).toBeLessThanOrEqual(faceX + 5);
    expect(b.y).toBeGreaterThanOrEqual(faceY - 5);
    expect(b.y).toBeLessThanOrEqual(faceY + 5);
    expect(b.width).toBeGreaterThanOrEqual(faceW - 5);
    expect(b.height).toBeGreaterThanOrEqual(faceH - 5);
  });

  it("detecta dos personas separadas sin fusionarlas incorrectamente", () => {
    const W = 1000, H = 600;
    const buf = crearLienzo(W, H, [26, 61, 132]);
    // Persona 1 a la izquierda
    dibujarRect(buf, W, 100, 150, 100, 120, [215, 160, 130]);
    // Persona 2 a la derecha
    dibujarRect(buf, W, 700, 180, 100, 120, [195, 140, 110]);

    const boxes = detectFacesInPixelArray(buf, W, H, 4);
    expect(boxes.length).toBe(2);

    const left = boxes.find((b) => b.x < 300);
    const right = boxes.find((b) => b.x > 500);

    expect(left).toBeDefined();
    expect(right).toBeDefined();
  });

  it("filtra ruido diminuto (<16px) evitando falsos positivos", () => {
    const W = 400, H = 400;
    const buf = crearLienzo(W, H, [26, 61, 132]);
    // Puntos aislados de ruido
    dibujarRect(buf, W, 50, 50, 4, 4, [215, 160, 130]);
    dibujarRect(buf, W, 200, 200, 8, 8, [215, 160, 130]);

    const boxes = detectFacesInPixelArray(buf, W, H, 4);
    expect(boxes).toEqual([]);
  });

  it("en fondo liso o sin rostros devuelve arreglo vacío", () => {
    const W = 500, H = 500;
    const buf = crearLienzo(W, H, [26, 61, 132]);
    const boxes = detectFacesInPixelArray(buf, W, H, 4);
    expect(boxes).toEqual([]);
  });

  it("detecta área de diagrama en fotos de pizarra operativa", () => {
    const W = 800, H = 600;
    // Superficie blanca/clara de pizarra (210, 210, 210)
    const buf = crearLienzo(W, H, [210, 210, 210]);
    // Trazos oscuros de marcador en el centro
    dibujarRect(buf, W, 250, 180, 300, 200, [30, 30, 30]);

    const pizarra = detectPizarraSubject(buf, W, H, 4);
    expect(pizarra).not.toBeNull();
    expect(pizarra!.x).toBeLessThanOrEqual(260);
    expect(pizarra!.x + pizarra!.width).toBeGreaterThanOrEqual(540);
    expect(pizarra!.y).toBeLessThanOrEqual(190);
  });
});

describe("localFaceDetector: Cálculo de Punto Focal Soberano", () => {
  it("calcula el centro de masa de la unión de rostros", () => {
    const faces: FaceBox[] = [
      { x: 100, y: 100, width: 100, height: 100 },
      { x: 300, y: 100, width: 100, height: 100 },
    ];
    // Unión: x: 100..400 (w: 300, centro: 250), y: 100..200 (h: 100, centro: 150)
    const fp = calculateFocalPoint(1000, 800, faces);
    expect(fp).toEqual({ x: 250, y: 150 });
  });

  it("degrada de forma segura al centro óptico exacto de la imagen cuando no hay rostros", () => {
    const fp = calculateFocalPoint(1920, 1080, []);
    expect(fp).toEqual({ x: 960, y: 540 });
  });
});

describe("localFaceDetector: Parsers de Cabeceras en Memoria", () => {
  it("extrae dimensiones de cabecera PNG sin decodificar todo el archivo", () => {
    const ihdr = Buffer.alloc(24);
    // Firma PNG
    ihdr[0] = 0x89; ihdr[1] = 0x50; ihdr[2] = 0x4e; ihdr[3] = 0x47;
    ihdr[4] = 0x0d; ihdr[5] = 0x0a; ihdr[6] = 0x1a; ihdr[7] = 0x0a;
    // Ancho 1920 (0x00000780)
    ihdr.writeUInt32BE(1920, 16);
    // Alto 1080 (0x00000438)
    ihdr.writeUInt32BE(1080, 20);

    const dims = parsePngDimensions(ihdr);
    expect(dims).toEqual({ width: 1920, height: 1080 });
  });

  it("extrae dimensiones de cabecera JPEG mediante marcador SOF0", () => {
    const jpegBuf = Buffer.alloc(30);
    jpegBuf[0] = 0xff; jpegBuf[1] = 0xd8; // SOI
    jpegBuf[2] = 0xff; jpegBuf[3] = 0xc0; // SOF0
    jpegBuf.writeUInt16BE(17, 4);         // Longitud de segmento
    jpegBuf[6] = 8;                       // Precisión
    jpegBuf.writeUInt16BE(600, 7);        // Alto 600
    jpegBuf.writeUInt16BE(800, 9);        // Ancho 800

    const dims = parseJpegDimensions(jpegBuf);
    expect(dims).toEqual({ width: 800, height: 600 });
  });

  it("devuelve null ante buffers inválidos o truncados", () => {
    expect(parsePngDimensions(Buffer.from([1, 2, 3]))).toBeNull();
    expect(parseJpegDimensions(Buffer.from([1, 2, 3]))).toBeNull();
  });
});

describe("Integración: focalRenderer usando detector local por defecto (Sin inyección manual)", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "focal-detector-test-"));
  afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  function generarFotoPngConRostro(W: number, H: number, face: FaceBox): string {
    const data = Buffer.alloc(W * H * 4);
    // Fondo azul
    for (let i = 0; i < W * H; i++) {
      data[i * 4] = 26;
      data[i * 4 + 1] = 61;
      data[i * 4 + 2] = 132;
      data[i * 4 + 3] = 255;
    }
    // Rostro con tono de piel humana
    for (let y = face.y; y < face.y + face.height; y++) {
      for (let x = face.x; x < face.x + face.width; x++) {
        const o = (y * W + x) * 4;
        data[o] = 215;     // R
        data[o + 1] = 160; // G
        data[o + 2] = 130; // B
        data[o + 3] = 255;
      }
    }
    const img: PngImage = { width: W, height: H, colorType: 6, channels: 4, data };
    const p = path.join(tmpDir, `sujeto_${W}x${H}.png`);
    fs.writeFileSync(p, encodePng(img));
    return p;
  }

  it("renderFocalCropsToDisk detecta automáticamente el rostro y genera los 3 ratios sin cortes", async () => {
    const W = 1200, H = 800;
    const originalFace: FaceBox = { x: 500, y: 250, width: 140, height: 160 };
    const inputPath = generarFotoPngConRostro(W, H, originalFace);

    // Se invoca SIN pasar detector (usa detectFacesLocally soberano por defecto)
    const entries = await renderFocalCropsToDisk({
      inputPath,
      outDir: path.join(tmpDir, "out-auto"),
      ratios: ["1:1", "4:5", "9:16"],
    });

    expect(entries).toHaveLength(3);

    for (const e of entries) {
      expect(e.plan.strategy).toBe("focal_crop");
      expect(e.plan.facesCut).toBe(0);
      expect(e.plan.facesDetected).toBeGreaterThanOrEqual(1);
      expect(e.outputPath).not.toBeNull();
      expect(fs.existsSync(e.outputPath!)).toBe(true);

      const cropped = decodePng(fs.readFileSync(e.outputPath!));
      const canvas = CANVAS_DIMENSIONS[e.plan.ratio];
      const targetRatio = canvas.width / canvas.height;
      const actualRatio = cropped.width / cropped.height;

      // Verificación de exactitud de aspect ratio
      expect(Math.abs(actualRatio - targetRatio)).toBeLessThan(0.01);

      // Verificación incondicional: ningún píxel de rostro quedó afuera
      let skinPixels = 0;
      for (let i = 0; i < cropped.width * cropped.height; i++) {
        if (
          cropped.data[i * 4] === 215 &&
          cropped.data[i * 4 + 1] === 160 &&
          cropped.data[i * 4 + 2] === 130
        ) {
          skinPixels++;
        }
      }
      expect(skinPixels).toBe(originalFace.width * originalFace.height);
    }
  });

  it("renderFocalCropsToDisk en imagen sin rostros degrada automáticamente a contain_blur_fallback", async () => {
    const W = 800, H = 800;
    const data = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      data[i * 4] = 26; data[i * 4 + 1] = 61; data[i * 4 + 2] = 132; data[i * 4 + 3] = 255;
    }
    const img: PngImage = { width: W, height: H, colorType: 6, channels: 4, data };
    const p = path.join(tmpDir, `sin_rostros_${W}x${H}.png`);
    fs.writeFileSync(p, encodePng(img));

    const entries = await renderFocalCropsToDisk({
      inputPath: p,
      outDir: path.join(tmpDir, "out-sin-rostros"),
    });

    expect(entries).toHaveLength(3);
    for (const e of entries) {
      expect(e.plan.strategy).toBe("contain_blur_fallback");
      expect(e.plan.reason).toBe("sin_rostros");
      expect(e.plan.facesCut).toBe(0);
      expect(e.outputPath).toBeNull(); // 0% de recorte
      expect(e.plan.focalPoint).toEqual({ x: 400, y: 400 });
    }
  });
});

describe("localFaceDetector: detectFacesFromDataUrl en Node", () => {
  it("maneja de forma segura dataUrls no estándar o vacías sin arrojar errores", async () => {
    const resVacio = await detectFacesFromDataUrl("");
    expect(resVacio.strategy).toBe("image_center_fallback");
    expect(resVacio.focalPoint).toEqual({ x: 540, y: 540 });

    const resMock = await detectFacesFromDataUrl("data:image/jpeg;base64,mock-data-xyz");
    expect(resMock.strategy).toBe("image_center_fallback");
    expect(typeof resMock.focalPoint.x).toBe("number");
    expect(typeof resMock.focalPoint.y).toBe("number");
  });
});
