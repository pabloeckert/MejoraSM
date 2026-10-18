// src/infrastructure/imaging/focalRenderer.ts
// RENDER ESTÁTICO A DISCO: detección de rostros (inyectada) -> plan de punto focal -> PNG recortado.
// Para 'contain_blur_fallback' NO se escribe recorte: la pieza se compone con renderFramedHtml (0% recorte).

import * as fs from "node:fs";
import * as path from "node:path";
import { decodePng, cropPng, encodePng } from "./pngCodec";
import { planFocalCrop, type FaceBox, type FocalCropPlan } from "../../domain/focalPoint";
import type { TargetAspectRatio } from "../../domain/framingEngine";

/** Contrato del detector de rostros (ML local, API, metadatos de Bóveda, etc.). */
export type FaceDetector = (image: { width: number; height: number; path: string }) => Promise<FaceBox[]> | FaceBox[];

export interface FocalRenderEntry {
  plan: FocalCropPlan;
  outputPath: string | null; // null si strategy = contain_blur_fallback
}

export const RATIOS_SOPORTADOS: readonly TargetAspectRatio[] = ["1:1", "4:5", "9:16"];

export async function renderFocalCropsToDisk(opts: {
  inputPath: string;
  outDir: string;
  detector: FaceDetector;
  ratios?: readonly TargetAspectRatio[];
}): Promise<FocalRenderEntry[]> {
  const img = decodePng(fs.readFileSync(opts.inputPath));
  const faces = await opts.detector({ width: img.width, height: img.height, path: opts.inputPath });
  fs.mkdirSync(opts.outDir, { recursive: true });
  const base = path.basename(opts.inputPath, path.extname(opts.inputPath));

  const entries: FocalRenderEntry[] = [];
  for (const ratio of opts.ratios ?? RATIOS_SOPORTADOS) {
    const plan = planFocalCrop(img.width, img.height, ratio, faces);
    if (plan.strategy !== "focal_crop" || !plan.window) {
      entries.push({ plan, outputPath: null });
      continue;
    }
    const w = plan.window;
    const cropped = cropPng(img, w.x, w.y, w.width, w.height);
    const outputPath = path.join(opts.outDir, `${base}_${ratio.replace(":", "x")}.png`);
    fs.writeFileSync(outputPath, encodePng(cropped));
    entries.push({ plan, outputPath });
  }
  return entries;
}
