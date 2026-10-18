// src/domain/focalPoint.ts
// PUNTO FOCAL DE ROSTROS + VENTANA DE RECORTE (dominio puro, sin I/O).
// Invariante: ningún rostro detectado queda cortado en 1:1, 4:5 ni 9:16.
// Si la garantía no puede cumplirse (rostros dispersos) o no hay rostros detectados,
// se degrada a "contain_blur_fallback" (0 píxeles recortados, ver framingEngine.ts).

import { CANVAS_DIMENSIONS, type TargetAspectRatio } from "./framingEngine";

export interface FaceBox {
  x: number; // px, esquina superior izquierda en coordenadas de la imagen original
  y: number;
  width: number;
  height: number;
}

export interface CropWindow {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FocalStrategy = "focal_crop" | "contain_blur_fallback";

export interface FocalCropPlan {
  ratio: TargetAspectRatio;
  strategy: FocalStrategy;
  reason?: "sin_rostros" | "rostros_exceden_ventana";
  window: CropWindow | null; // null en fallback (la imagen no se recorta)
  focalPoint: { x: number; y: number } | null;
  facesDetected: number;
  facesCut: number; // invariante verificada: siempre 0
}

export const FACE_PADDING_RATIO = 0.25;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function validarCaja(f: FaceBox, w: number, h: number): void {
  if (![f.x, f.y, f.width, f.height].every(Number.isFinite) || f.width <= 0 || f.height <= 0) {
    throw new Error(`FaceBox inválido: ${JSON.stringify(f)}`);
  }
  if (f.x < 0 || f.y < 0 || f.x + f.width > w || f.y + f.height > h) {
    throw new Error(`FaceBox fuera de la imagen ${w}x${h}: ${JSON.stringify(f)}`);
  }
}

/** Ventana de mayor tamaño con la relación de aspecto objetivo que cabe en la imagen. */
export function maxWindowForRatio(srcW: number, srcH: number, ratio: TargetAspectRatio): { width: number; height: number } {
  const c = CANVAS_DIMENSIONS[ratio];
  const target = c.width / c.height;
  if (srcW / srcH > target) {
    return { width: Math.floor(srcH * target), height: srcH };
  }
  return { width: srcW, height: Math.floor(srcW / target) };
}

export function unionWithPadding(faces: FaceBox[], srcW: number, srcH: number, padRatio = FACE_PADDING_RATIO): CropWindow {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const f of faces) {
    const px = f.width * padRatio;
    const py = f.height * padRatio;
    x1 = Math.min(x1, f.x - px);
    y1 = Math.min(y1, f.y - py);
    x2 = Math.max(x2, f.x + f.width + px);
    y2 = Math.max(y2, f.y + f.height + py);
  }
  x1 = Math.max(0, Math.floor(x1));
  y1 = Math.max(0, Math.floor(y1));
  x2 = Math.min(srcW, Math.ceil(x2));
  y2 = Math.min(srcH, Math.ceil(y2));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function windowContains(outer: CropWindow, inner: CropWindow): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function planFocalCrop(srcW: number, srcH: number, ratio: TargetAspectRatio, faces: FaceBox[]): FocalCropPlan {
  if (!(srcW > 0 && srcH > 0)) throw new Error("Dimensiones de imagen de origen inválidas");
  faces.forEach((f) => validarCaja(f, srcW, srcH));

  if (faces.length === 0) {
    return { ratio, strategy: "contain_blur_fallback", reason: "sin_rostros", window: null, focalPoint: null, facesDetected: 0, facesCut: 0 };
  }

  const union = unionWithPadding(faces, srcW, srcH);
  const max = maxWindowForRatio(srcW, srcH, ratio);
  if (union.width > max.width || union.height > max.height) {
    return {
      ratio,
      strategy: "contain_blur_fallback",
      reason: "rostros_exceden_ventana",
      window: null,
      focalPoint: { x: union.x + union.width / 2, y: union.y + union.height / 2 },
      facesDetected: faces.length,
      facesCut: 0,
    };
  }

  const fx = union.x + union.width / 2;
  const fy = union.y + union.height / 2;
  const window: CropWindow = {
    x: clamp(Math.round(fx - max.width / 2), 0, srcW - max.width),
    y: clamp(Math.round(fy - max.height / 2), 0, srcH - max.height),
    width: max.width,
    height: max.height,
  };

  // Verificación zero-trust: cada rostro (sin padding) debe quedar íntegro dentro de la ventana.
  const cortados = faces.filter((f) => !windowContains(window, f)).length;
  if (cortados > 0) {
    throw new Error(`Invariante violada: ${cortados} rostro(s) quedarían cortados en ${ratio}`);
  }
  return { ratio, strategy: "focal_crop", window, focalPoint: { x: fx, y: fy }, facesDetected: faces.length, facesCut: 0 };
}
