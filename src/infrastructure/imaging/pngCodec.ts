// src/infrastructure/imaging/pngCodec.ts
// CODEC PNG NATIVO (node:zlib), sin dependencias externas.
// Soporta 8 bits, sin entrelazado, color types 0/2/3/4/6. Todo lo demás falla de forma explícita.

import { deflateSync, inflateSync, crc32 } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export interface PngImage {
  width: number;
  height: number;
  colorType: number;
  channels: number;
  data: Buffer; // width * height * channels, filas contiguas sin filtro
  plte?: Buffer;
  trns?: Buffer;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

export function decodePng(buf: Buffer): PngImage {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Archivo no es un PNG válido (firma incorrecta)");
  }
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = 0;
  const idat: Buffer[] = [];
  let plte: Buffer | undefined;
  let trns: Buffer | undefined;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    off += 12 + len;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") plte = Buffer.from(data);
    else if (type === "tRNS") trns = Buffer.from(data);
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  if (!width || !height) throw new Error("PNG sin IHDR válido");
  if (bitDepth !== 8) throw new Error(`PNG bitDepth=${bitDepth} no soportado (solo 8)`);
  if (interlace !== 0) throw new Error("PNG entrelazado (Adam7) no soportado");
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`PNG colorType=${colorType} no soportado`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  if (raw.length !== (stride + 1) * height) throw new Error("PNG corrupto: tamaño de datos inesperado");
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i];
      const a = i >= channels ? out[dst + i - channels] : 0;
      const b = y > 0 ? out[dst - stride + i] : 0;
      const c = y > 0 && i >= channels ? out[dst - stride + i - channels] : 0;
      let v: number;
      switch (ft) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: v = x + paeth(a, b, c); break;
        default: throw new Error(`PNG filtro desconocido: ${ft}`);
      }
      out[dst + i] = v & 0xff;
    }
  }
  return { width, height, colorType, channels, data: out, plte, trns };
}

export function cropPng(img: PngImage, x: number, y: number, w: number, h: number): PngImage {
  if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > img.width || y + h > img.height) {
    throw new Error(`Ventana de recorte fuera de rango: ${x},${y} ${w}x${h} sobre ${img.width}x${img.height}`);
  }
  const out = Buffer.alloc(w * h * img.channels);
  for (let row = 0; row < h; row++) {
    const s = ((y + row) * img.width + x) * img.channels;
    img.data.copy(out, row * w * img.channels, s, s + w * img.channels);
  }
  return { ...img, width: w, height: h, data: out };
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

export function encodePng(img: PngImage): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, 4);
  ihdr[8] = 8;
  ihdr[9] = img.colorType;
  const stride = img.width * img.channels;
  const raw = Buffer.alloc((stride + 1) * img.height);
  for (let y = 0; y < img.height; y++) {
    raw[y * (stride + 1)] = 0;
    img.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const parts = [PNG_SIGNATURE, chunk("IHDR", ihdr)];
  if (img.plte) parts.push(chunk("PLTE", img.plte));
  if (img.trns) parts.push(chunk("tRNS", img.trns));
  parts.push(chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}
