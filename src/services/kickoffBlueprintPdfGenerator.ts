/**
 * kickoffBlueprintPdfGenerator.ts — Generador Soberano PDF A4 de Onboarding & Plan 30 Días
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - Joey Coleman (Never Lose a Customer Again): Primera entrega tangible y afirmación de confianza.
 * - Taiichi Ohno (Gemba Walk): Matriz 4D de observación sistémica sin burocracia ni juicios a personas.
 * - Josef Müller-Brockmann (Grid Systems): Retícula suiza 80%+ blanco (#FFFFFF), barra tricolor
 *   institucional (#1A3D84 / #E1061E / #F7CC13) y Helvetica WinAnsi pura.
 *
 * Formato: PDF 1.4 vectorial nativo A4 (595.28 × 841.89 pt), 0 dependencias externas.
 */

import { type KickoffBlueprint } from "@/domain/kickoffBlueprintEngine";

function escapePdfText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function truncateLine(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 3)).trimEnd() + "...";
}

const encoder = new TextEncoder();
function getByteLength(str: string): number {
  return encoder.encode(str).length;
}

/**
 * Genera el buffer Uint8Array de un documento PDF 1.4 tamaño A4 con el Protocolo Kickoff 30 Días.
 */
export function generarKickoffBlueprintPDF(blueprint: KickoffBlueprint): Uint8Array {
  const width = 595.28;
  const height = 841.89;
  const marginX = 36;
  const contentWidth = width - marginX * 2; // 523.28 pt

  let stream = "";

  // 1. Fondo blanco puro #FFFFFF (estándar suizo 80%+)
  stream += `1 1 1 rg 0 0 ${width} ${height} re f\n`;

  // 2. Barra Tricolor Institucional Superior (60% Azul, 20% Rojo, 20% Amarillo)
  stream += `0.102 0.239 0.518 rg ${marginX} 833 ${(contentWidth * 0.6).toFixed(2)} 4 re f\n`;
  stream += `0.882 0.024 0.118 rg ${(marginX + contentWidth * 0.6).toFixed(2)} 833 ${(contentWidth * 0.2).toFixed(2)} 4 re f\n`;
  stream += `0.969 0.800 0.075 rg ${(marginX + contentWidth * 0.8).toFixed(2)} 833 ${(contentWidth * 0.2).toFixed(2)} 4 re f\n`;

  // 3. Encabezado Institucional
  stream += `BT\n/F1 14 Tf\n0.102 0.239 0.518 rg\n${marginX} 812 Td\n(MEJORA CONTINUA) Tj\nET\n`;
  stream += `BT\n/F2 7.8 Tf\n0.420 0.447 0.502 rg\n${marginX} 800 Td\n(PROTOCOLO DE ONBOARDING & PLAN DE PRIMEROS 30 DIAS  |  KICKOFF & GEMBA WALK 4D) Tj\nET\n`;

  const idDoc = escapePdfText(blueprint.idBlueprint);
  const modText = escapePdfText(blueprint.modalidad);
  stream += `0.94 0.96 0.99 rg 415 796 144 24 re f\n`;
  stream += `0.102 0.239 0.518 RG 0.7 w 415 796 144 24 re S\n`;
  stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n422 810 Td\n(REF: ${idDoc}) Tj\nET\n`;
  stream += `BT\n/F2 7 Tf\n0.35 0.35 0.35 rg\n422 800 Td\n(${truncateLine(modText, 28)}) Tj\nET\n`;

  // Línea divisoria header
  stream += `0.88 0.90 0.92 RG 0.8 w ${marginX} 790 m ${marginX + contentWidth} 790 l S\n`;

  // 4. Caja de Metadatos del Cliente
  stream += `0.973 0.980 0.988 rg ${marginX} 746 ${contentWidth} 38 re f\n`;
  stream += `0.85 0.88 0.92 RG 0.6 w ${marginX} 746 ${contentWidth} 38 re S\n`;

  const meta1 = escapePdfText(
    `Empresa: ${blueprint.empresa}  |  Directivo: ${blueprint.directivo} (${blueprint.cargo})`
  );
  const meta2 = escapePdfText(
    `Sponsor Interno: ${blueprint.sponsorInterno}  |  Inicio Estimado: ${blueprint.fechaInicio}`
  );
  const meta3 = escapePdfText(`Foco de Intervencion: ${blueprint.arquetipoLabel}`);

  stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} 772 Td\n(${truncateLine(meta1, 92)}) Tj\nET\n`;
  stream += `BT\n/F2 7.5 Tf\n0.25 0.25 0.25 rg\n${marginX + 8} 761 Td\n(${truncateLine(meta2, 95)}) Tj\nET\n`;
  stream += `BT\n/F1 7.5 Tf\n0.882 0.024 0.118 rg\n${marginX + 8} 750 Td\n(${truncateLine(meta3, 92)}) Tj\nET\n`;

  let curY = 732;

  // 5. Sección 1: Encuadre de Arranque & Regla de Oro del Gemba Walk
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 10 re f\n`;
  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(1. ENCUADRE DE ARRANQUE Y REGLA DE ORO DEL GEMBA WALK (SISTEMA, NO PERSONA)) Tj\nET\n`;
  curY -= 12;

  const affirmLines = wrapText(escapePdfText(blueprint.mensajeAfirmacionColeman), 98).slice(0, 2);
  for (const line of affirmLines) {
    stream += `BT\n/F2 7.5 Tf\n0.20 0.20 0.20 rg\n${marginX + 4} ${curY} Td\n(${line}) Tj\nET\n`;
    curY -= 9.5;
  }
  curY -= 3;

  // Caja destacada Regla de Oro
  stream += `0.99 0.96 0.96 rg ${marginX} ${curY - 24} ${contentWidth} 25 re f\n`;
  stream += `0.882 0.024 0.118 RG 2 w ${marginX} ${curY - 24} m ${marginX} ${curY + 1} l S\n`;
  const goldLines = wrapText(escapePdfText(blueprint.reglaDeOroGemba), 96).slice(0, 2);
  goldLines.forEach((line, idx) => {
    stream += `BT\n/F1 7.2 Tf\n0.16 0.16 0.16 rg\n${marginX + 8} ${curY - 8 - idx * 9.5} Td\n(${line}) Tj\nET\n`;
  });
  curY -= 36;

  // 6. Sección 2: Agenda de Sesión de Kickoff Directivo (90 Minutos)
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 10 re f\n`;
  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(2. AGENDA DE SESION DE KICKOFF DIRECTIVO (90 MINUTOS)) Tj\nET\n`;
  curY -= 12;

  stream += `0.93 0.95 0.98 rg ${marginX} ${curY - 12} ${contentWidth} 12 re f\n`;
  stream += `BT\n/F1 6.8 Tf\n0.102 0.239 0.518 rg\n${marginX + 5} ${curY - 9} Td\n(TIEMPO) Tj\nET\n`;
  stream += `BT\n/F1 6.8 Tf\n0.102 0.239 0.518 rg\n${marginX + 74} ${curY - 9} Td\n(BLOQUE Y OBJETIVO) Tj\nET\n`;
  stream += `BT\n/F1 6.8 Tf\n0.102 0.239 0.518 rg\n${marginX + 345} ${curY - 9} Td\n(ENTREGABLE EN VIVO) Tj\nET\n`;
  curY -= 14;

  blueprint.agendaKickoff90Min.forEach((bloque) => {
    const rowH = 22;
    stream += `0.985 0.988 0.994 rg ${marginX} ${curY - rowH} ${contentWidth} ${rowH} re f\n`;
    stream += `0.88 0.90 0.93 RG 0.4 w ${marginX} ${curY - rowH} ${contentWidth} ${rowH} re S\n`;

    stream += `BT\n/F1 7 Tf\n0.882 0.024 0.118 rg\n${marginX + 5} ${curY - 9} Td\n(${escapePdfText(bloque.minuto)}) Tj\nET\n`;
    stream += `BT\n/F1 7.2 Tf\n0.102 0.239 0.518 rg\n${marginX + 74} ${curY - 9} Td\n(${truncateLine(escapePdfText(bloque.titulo), 52)}) Tj\nET\n`;
    stream += `BT\n/F2 6.8 Tf\n0.30 0.30 0.30 rg\n${marginX + 74} ${curY - 18} Td\n(${truncateLine(escapePdfText(bloque.objetivo), 58)}) Tj\nET\n`;

    const entLines = wrapText(escapePdfText(bloque.entregableEnVivo), 34).slice(0, 2);
    entLines.forEach((el, idx) => {
      stream += `BT\n/F2 6.8 Tf\n0.18 0.18 0.18 rg\n${marginX + 345} ${curY - 9 - idx * 8.5} Td\n(${el}) Tj\nET\n`;
    });

    curY -= rowH + 2;
  });

  curY -= 8;

  // 7. Sección 3: Matriz de Relevamiento Gemba Walk en las 4 Dimensiones
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 10 re f\n`;
  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(3. MATRIZ DE RELEVAMIENTO GEMBA WALK EN LAS 4 DIMENSIONES) Tj\nET\n`;
  curY -= 12;

  stream += `0.93 0.95 0.98 rg ${marginX} ${curY - 12} ${contentWidth} 12 re f\n`;
  stream += `BT\n/F1 6.8 Tf\n0.102 0.239 0.518 rg\n${marginX + 5} ${curY - 9} Td\n(DIMENSION) Tj\nET\n`;
  stream += `BT\n/F1 6.8 Tf\n0.102 0.239 0.518 rg\n${marginX + 82} ${curY - 9} Td\n(ESTACION & FOCO DE OBSERVACION) Tj\nET\n`;
  stream += `BT\n/F1 6.8 Tf\n0.102 0.239 0.518 rg\n${marginX + 345} ${curY - 9} Td\n(EVIDENCIA SISTEMICA) Tj\nET\n`;
  curY -= 14;

  blueprint.recorridoGemba4D.forEach((est) => {
    const rowH = 30;
    stream += `0.99 0.99 0.996 rg ${marginX} ${curY - rowH} ${contentWidth} ${rowH} re f\n`;
    stream += `0.86 0.89 0.92 RG 0.4 w ${marginX} ${curY - rowH} ${contentWidth} ${rowH} re S\n`;

    stream += `BT\n/F1 7.2 Tf\n0.102 0.239 0.518 rg\n${marginX + 5} ${curY - 11} Td\n(${escapePdfText(est.dimension.toUpperCase())}) Tj\nET\n`;
    stream += `BT\n/F1 7.2 Tf\n0.15 0.15 0.15 rg\n${marginX + 82} ${curY - 10} Td\n(${truncateLine(escapePdfText(est.estacion), 50)}) Tj\nET\n`;

    const focoLines = wrapText(escapePdfText(est.focoObservacion), 56).slice(0, 2);
    focoLines.forEach((fl, idx) => {
      stream += `BT\n/F2 6.6 Tf\n0.32 0.32 0.32 rg\n${marginX + 82} ${curY - 18.5 - idx * 8} Td\n(${fl}) Tj\nET\n`;
    });

    const evLines = wrapText(escapePdfText(est.evidenciaSistemica), 34).slice(0, 2);
    evLines.forEach((el, idx) => {
      stream += `BT\n/F2 6.6 Tf\n0.102 0.239 0.518 rg\n${marginX + 345} ${curY - 11 - idx * 8.5} Td\n(${el}) Tj\nET\n`;
    });

    curY -= rowH + 2;
  });

  curY -= 8;

  // 8. Sección 4: Hoja de Ruta de Primeros 30 Días y Victorias Rápidas (Quick Wins)
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 10 re f\n`;
  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(4. HOJA DE RUTA DE PRIMEROS 30 DIAS Y VICTORIAS RAPIDAS (QUICK WINS D15 / D30)) Tj\nET\n`;
  curY -= 12;

  blueprint.hitosPrimeros30Dias.forEach((hito, idx) => {
    const boxH = 40;
    const isHighlight = idx === 1;
    if (isHighlight) {
      stream += `0.94 0.965 1.0 rg ${marginX} ${curY - boxH} ${contentWidth} ${boxH} re f\n`;
      stream += `0.102 0.239 0.518 RG 0.8 w ${marginX} ${curY - boxH} ${contentWidth} ${boxH} re S\n`;
    } else {
      stream += `0.975 0.98 0.99 rg ${marginX} ${curY - boxH} ${contentWidth} ${boxH} re f\n`;
      stream += `0.85 0.88 0.92 RG 0.5 w ${marginX} ${curY - boxH} ${contentWidth} ${boxH} re S\n`;
    }

    const tit = escapePdfText(`${hito.ventana}  |  ${hito.tituloHito}`);
    const acc = escapePdfText(`Accion de Sistema: ${hito.accionSistema}`);
    const ind = escapePdfText(`Indicador: ${hito.indicadorExito}  |  Impacto: ${hito.impactoDirectivo}`);

    stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 6} ${curY - 10} Td\n(${truncateLine(tit, 92)}) Tj\nET\n`;
    stream += `BT\n/F2 6.9 Tf\n0.20 0.20 0.20 rg\n${marginX + 6} ${curY - 21} Td\n(${truncateLine(acc, 98)}) Tj\nET\n`;
    stream += `BT\n/F1 6.7 Tf\n0.882 0.024 0.118 rg\n${marginX + 6} ${curY - 32} Td\n(${truncateLine(ind, 98)}) Tj\nET\n`;

    curY -= boxH + 4;
  });

  curY -= 6;

  // 9. Sección 5: Checklist Pre-Vuelo Cero Burocracia
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 10 re f\n`;
  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(5. CHECKLIST PRE-VUELO CERO BUROCRACIA (INSUMOS MINIMOS ANTES DEL DIA 1)) Tj\nET\n`;
  curY -= 13;

  blueprint.requisitosCeroBurocracia.forEach((req) => {
    const tag = req.obligatorioAntesDeKickoff ? "[OBLIGATORIO]" : "[OPCIONAL / DESEABLE]";
    const line = escapePdfText(`[ ] ${req.item}  -  Formato: ${req.formatoAceptado} ${tag}`);
    stream += `BT\n/F2 6.9 Tf\n0.22 0.22 0.22 rg\n${marginX + 6} ${curY} Td\n(${truncateLine(line, 102)}) Tj\nET\n`;
    curY -= 11;
  });

  // 10. Footer Institucional y Firma Directiva
  const footY = 30;
  stream += `0.88 0.90 0.92 RG 0.6 w ${marginX} ${footY + 16} m ${marginX + contentWidth} ${footY + 16} l S\n`;
  stream += `0.102 0.239 0.518 rg ${marginX} ${footY + 13} ${(contentWidth * 0.6).toFixed(2)} 2 re f\n`;
  stream += `0.882 0.024 0.118 rg ${(marginX + contentWidth * 0.6).toFixed(2)} ${footY + 13} ${(contentWidth * 0.2).toFixed(2)} 2 re f\n`;
  stream += `0.969 0.800 0.075 rg ${(marginX + contentWidth * 0.8).toFixed(2)} ${footY + 13} ${(contentWidth * 0.2).toFixed(2)} 2 re f\n`;

  stream += `BT\n/F2 7.5 Tf\n0.420 0.447 0.502 rg\n${marginX} ${footY} Td\n(MEJORA CONTINUA  |  mejoraok.com  |  Onboarding Soberano B2B) Tj\nET\n`;
  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n355 ${footY} Td\n(Firma Directiva: Pablo Eckert - Direccion General) Tj\nET\n`;

  // ==========================================
  // ENSAMBLE BINARIO DEL PDF 1.4 NATIVO (A4)
  // ==========================================
  const streamByteLen = getByteLength(stream);
  const objects = [
    `1 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`,
    `2 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
    `3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n`,
    `4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 ${width} ${height}] /Contents 5 0 R /Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> >>\nendobj\n`,
    `5 0 obj\n<< /Length ${streamByteLen} >>\nstream\n${stream}endstream\nendobj\n`,
    `6 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n`,
  ];

  let pdfOutput = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(getByteLength(pdfOutput));
    pdfOutput += objects[i];
  }

  const xrefOffset = getByteLength(pdfOutput);
  pdfOutput += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdfOutput += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size ${objects.length + 1} /Root 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return encoder.encode(pdfOutput);
}

/**
 * Dispara la descarga directa en navegador del Protocolo Kickoff 30D en PDF A4.
 */
export function descargarKickoffBlueprintPDF(blueprint: KickoffBlueprint): void {
  const bytes = generarKickoffBlueprintPDF(blueprint);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const empresaSanitizada = escapePdfText(blueprint.empresa)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const idSanitizado = escapePdfText(blueprint.idBlueprint).replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `Kickoff_30D_${empresaSanitizada || "Empresa"}_${idSanitizado}.pdf`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
