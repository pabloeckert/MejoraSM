// src/services/executiveDiagnosticPdfGenerator.ts
// GENERADOR NATIVO SOBERANO DE DIAGNOSTICOS EJECUTIVOS B2B EN PDF (A4 - 595.28 x 841.89 pt)
// Sin dependencias pesadas externas. Genera un documento PDF 1.4 de alta fidelidad
// con estética de marca: Fondo 80% blanco, tipografía suiza Helvetica, barra tricolor institucional.
// Basado en The Challenger Sale (Dixon & Adamson) y The Trusted Advisor (Maister).

import { DiagnosticoEjecutivo } from "@/domain/executiveDiagnosticEngine";

/**
 * Escapa caracteres especiales de cadenas en PDF: (, ), \
 * y normaliza tildes a caracteres ASCII estándar para fuentes Helvetica WinAnsi
 */
function escapePdfText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Normalizar acentos a ASCII limpio
}

/**
 * Divide un texto largo en líneas que se ajusten a un número de caracteres
 */
function wrapText(text: string, maxCharsPerLine: number = 75): string[] {
  if (!text) return [];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

const encoder = new TextEncoder();
function getByteLength(str: string): number {
  return encoder.encode(str).length;
}

/**
 * Genera el Uint8Array de un PDF 1.4 tamaño A4 con el diagnóstico ejecutivo
 */
export function generarDiagnosticoEjecutivoPDF(diag: DiagnosticoEjecutivo): Uint8Array {
  const width = 595.28;
  const height = 841.89;
  const marginX = 36;
  const contentWidth = width - marginX * 2; // 523.28 pt

  const objects: string[] = [];
  let objCount = 0;

  function newObj(content: string): number {
    objCount++;
    objects.push(`${objCount} 0 obj\n${content}\nendobj`);
    return objCount;
  }

  // Fuentes Helvetica estándar
  const fontHelveticaBold = newObj(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`
  );
  const fontHelvetica = newObj(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  );

  let stream = "";

  // 1. Fondo blanco puro #FFFFFF
  stream += `1 1 1 rg 0 0 ${width} ${height} re f\n`;

  // 2. Barra Tricolor Institucional Superior (y: 835 a 839, alto 4 pt)
  // Azul #1A3D84 (60%: 36 a 350)
  stream += `0.102 0.239 0.518 rg ${marginX} 833 ${contentWidth * 0.6} 4 re f\n`;
  // Rojo #E1061E (20%: 350 a 454)
  stream += `0.882 0.024 0.118 rg ${marginX + contentWidth * 0.6} 833 ${contentWidth * 0.2} 4 re f\n`;
  // Amarillo #F7CC13 (20%: 454 a 559)
  stream += `0.969 0.800 0.075 rg ${marginX + contentWidth * 0.8} 833 ${contentWidth * 0.2} 4 re f\n`;

  // 3. Encabezado Institucional (Header)
  // Nombre de marca
  stream += `BT\n/F1 16 Tf\n0.102 0.239 0.518 rg\n${marginX} 810 Td\n(MEJORA CONTINUA) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.420 0.447 0.502 rg\n${marginX} 798 Td\n(INGENIERIA DE PROCESOS, GOBIERNO B2B Y PROFESIONALIZACION) Tj\nET\n`;

  // Referencia y Confidencialidad (Top Right)
  const refText = escapePdfText(`REF: ${diag.id}`);
  const dateText = escapePdfText(`Fecha: ${diag.fechaEmision}`);
  stream += `BT\n/F1 8 Tf\n0.882 0.024 0.118 rg\n390 810 Td\n(DOCUMENTO CONFIDENCIAL DIRECTIVO) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.420 0.447 0.502 rg\n390 798 Td\n(${refText}  |  ${dateText}) Tj\nET\n`;

  // Línea divisoria
  stream += `0.88 0.90 0.92 RG 0.8 w ${marginX} 788 m ${marginX + contentWidth} 788 l S\n`;

  // 4. Caja de Datos del Directivo y Empresa
  const boxY = 730;
  const boxH = 50;
  stream += `0.97 0.98 0.99 rg ${marginX} ${boxY} ${contentWidth} ${boxH} re f\n`;
  stream += `0.85 0.88 0.92 RG 1 w ${marginX} ${boxY} ${contentWidth} ${boxH} re S\n`;

  const dirText = escapePdfText(`Directivo: ${diag.directivo} (${diag.cargo})`);
  const empText = escapePdfText(`Empresa: ${diag.empresa}`);
  const arqText = escapePdfText(`Enfoque: ${diag.arquetipoLabel}`);
  const scoreText = escapePdfText(`Prioridad de Intervencion: ${diag.scoreOportunidad} / 100`);

  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 12} 764 Td\n(${dirText}) Tj\nET\n`;
  stream += `BT\n/F2 8.5 Tf\n0.25 0.25 0.25 rg\n350 764 Td\n(${empText}) Tj\nET\n`;
  stream += `BT\n/F2 8.5 Tf\n0.35 0.35 0.35 rg\n${marginX + 12} 744 Td\n(${arqText}) Tj\nET\n`;
  stream += `BT\n/F1 8.5 Tf\n0.882 0.024 0.118 rg\n350 744 Td\n(${scoreText}) Tj\nET\n`;

  // 5. SECCION 1: EL REENCUADRE SISTEMICO (THE CHALLENGER INSIGHT)
  let curY = 712;
  stream += `BT\n/F1 10 Tf\n0.102 0.239 0.518 rg\n${marginX} ${curY} Td\n(1. EL REENCUADRE SISTEMICO  |  THE CHALLENGER INSIGHT) Tj\nET\n`;

  curY -= 8;
  const reencuadreH = 68;
  const reencuadreY = curY - reencuadreH;
  // Fondo azul muy suave con borde azul institucional
  stream += `0.95 0.97 1.0 rg ${marginX} ${reencuadreY} ${contentWidth} ${reencuadreH} re f\n`;
  stream += `0.102 0.239 0.518 RG 1 w ${marginX} ${reencuadreY} ${contentWidth} ${reencuadreH} re S\n`;

  const premisaLines = wrapText(
    `Premisa comun: "${escapePdfText(diag.reencuadreChallenger.premisaFalsa)}"`,
    88
  );
  const verdadLines = wrapText(
    `Verdad en Trinchera: "${escapePdfText(diag.reencuadreChallenger.verdadSistemica)}"`,
    84
  );
  const paradojaLines = wrapText(
    `Paradoja de Mando: ${escapePdfText(diag.reencuadreChallenger.paradojaDirectiva)}`,
    88
  );

  let textY = curY - 14;
  stream += `BT\n/F2 7.5 Tf\n0.45 0.45 0.45 rg\n${marginX + 10} ${textY} Td\n(${premisaLines[0] || ""}) Tj\nET\n`;

  textY -= 14;
  stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n`;
  for (let l = 0; l < verdadLines.length; l++) {
    if (l === 0) {
      stream += `${marginX + 10} ${textY} Td\n(${verdadLines[l]}) Tj\n`;
    } else {
      stream += `0 -10 Td\n(${verdadLines[l]}) Tj\n`;
    }
  }
  stream += `ET\n`;

  textY -= verdadLines.length > 1 ? 20 : 13;
  stream += `BT\n/F2 7.5 Tf\n0.882 0.024 0.118 rg\n${marginX + 10} ${textY} Td\n(${paradojaLines[0] || ""}) Tj\nET\n`;

  // 6. SECCION 2: MATRIZ DE CAUSA RAIZ SISTEMICA
  curY = reencuadreY - 18;
  stream += `BT\n/F1 10 Tf\n0.102 0.239 0.518 rg\n${marginX} ${curY} Td\n(2. MATRIZ DE CAUSA RAIZ SISTEMICA  |  SINTOMA VS CAUSA REAL) Tj\nET\n`;

  // Tabla con encabezado
  curY -= 16;
  const col1W = 150;
  const col2W = 190;
  const col3W = contentWidth - col1W - col2W; // 183.28

  // Header tabla
  stream += `0.92 0.94 0.96 rg ${marginX} ${curY} ${contentWidth} 16 re f\n`;
  stream += `0.80 0.82 0.85 RG 0.5 w ${marginX} ${curY} ${contentWidth} 16 re S\n`;
  stream += `BT\n/F1 7.5 Tf\n0.15 0.20 0.30 rg\n${marginX + 6} ${curY + 4} Td\n(SINTOMA VISIBLE EN TRINCHERA) Tj\nET\n`;
  stream += `BT\n/F1 7.5 Tf\n0.15 0.20 0.30 rg\n${marginX + col1W + 6} ${curY + 4} Td\n(CAUSA RAIZ EN EL SISTEMA DE PROCESOS) Tj\nET\n`;
  stream += `BT\n/F1 7.5 Tf\n0.15 0.20 0.30 rg\n${marginX + col1W + col2W + 6} ${curY + 4} Td\n(IMPACTO EN MARGEN Y ENERGIA) Tj\nET\n`;

  // Filas de la matriz
  let rowY = curY;
  for (let r = 0; r < diag.matrizCausaRaiz.length; r++) {
    const row = diag.matrizCausaRaiz[r];
    const rowHeight = 30;
    rowY -= rowHeight;

    // Fondo alternado
    if (r % 2 === 1) {
      stream += `0.98 0.98 0.99 rg ${marginX} ${rowY} ${contentWidth} ${rowHeight} re f\n`;
    }
    stream += `0.88 0.90 0.92 RG 0.5 w ${marginX} ${rowY} ${contentWidth} ${rowHeight} re S\n`;

    // Vertical column dividers
    stream += `0.88 0.90 0.92 RG 0.5 w ${marginX + col1W} ${rowY} m ${marginX + col1W} ${rowY + rowHeight} l S\n`;
    stream += `0.88 0.90 0.92 RG 0.5 w ${marginX + col1W + col2W} ${rowY} m ${marginX + col1W + col2W} ${rowY + rowHeight} l S\n`;

    const sLines = wrapText(escapePdfText(row.sintomaVisible), 28);
    const cLines = wrapText(escapePdfText(row.causaRaizSistemica), 36);
    const iLines = wrapText(escapePdfText(row.impactoNegocio), 34);

    // Render textos de celda
    stream += `BT\n/F1 7 Tf\n0.20 0.20 0.20 rg\n${marginX + 5} ${rowY + 18} Td\n(${sLines[0] || ""}) Tj\n`;
    if (sLines[1]) stream += `0 -8 Td\n(${sLines[1]}) Tj\n`;
    stream += `ET\n`;

    stream += `BT\n/F2 7 Tf\n0.102 0.239 0.518 rg\n${marginX + col1W + 5} ${rowY + 18} Td\n(${cLines[0] || ""}) Tj\n`;
    if (cLines[1]) stream += `0 -8 Td\n(${cLines[1]}) Tj\n`;
    stream += `ET\n`;

    stream += `BT\n/F2 6.5 Tf\n0.40 0.40 0.40 rg\n${marginX + col1W + col2W + 5} ${rowY + 18} Td\n(${iLines[0] || ""}) Tj\n`;
    if (iLines[1]) stream += `0 -8 Td\n(${iLines[1]}) Tj\n`;
    stream += `ET\n`;
  }

  // 7. SECCION 3: INTERVENCION INTEGRAL EN 4 DIMENSIONES
  curY = rowY - 18;
  stream += `BT\n/F1 10 Tf\n0.102 0.239 0.518 rg\n${marginX} ${curY} Td\n(3. MARCO METODOLOGICO DE LAS 4 DIMENSIONES) Tj\nET\n`;

  curY -= 12;
  const dimBoxW = (contentWidth - 12) / 2; // ~255 pt
  const dimBoxH = 46;

  for (let d = 0; d < 4; d++) {
    const dim = diag.cuatroDimensiones[d];
    const col = d % 2;
    const row = Math.floor(d / 2);
    const xPos = marginX + col * (dimBoxW + 12);
    const yPos = curY - row * (dimBoxH + 8) - dimBoxH;

    // Caja
    stream += `0.97 0.98 1.0 rg ${xPos} ${yPos} ${dimBoxW} ${dimBoxH} re f\n`;
    stream += `0.80 0.85 0.92 RG 0.8 w ${xPos} ${yPos} ${dimBoxW} ${dimBoxH} re S\n`;

    // Titulo dimension con barra lateral
    stream += `0.102 0.239 0.518 rg ${xPos} ${yPos} 3.5 ${dimBoxH} re f\n`;
    stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n${xPos + 8} ${yPos + 32} Td\n(${escapePdfText(dim.nombre)}) Tj\nET\n`;

    const enfLines = wrapText(escapePdfText(dim.enfoque), 46);
    const metaLines = wrapText(`Meta: ${escapePdfText(dim.metaClave)}`, 44);

    stream += `BT\n/F2 6.5 Tf\n0.30 0.30 0.30 rg\n${xPos + 8} ${yPos + 20} Td\n(${enfLines[0] || ""}) Tj\nET\n`;
    stream += `BT\n/F1 6.5 Tf\n0.882 0.024 0.118 rg\n${xPos + 8} ${yPos + 9} Td\n(${metaLines[0] || ""}) Tj\nET\n`;
  }

  // 8. SECCION 4: HOJA DE RUTA DE DESAHOGO Y ORDEN (90 DIAS)
  const roadmapY = curY - 2 * (dimBoxH + 8) - 18;
  stream += `BT\n/F1 10 Tf\n0.102 0.239 0.518 rg\n${marginX} ${roadmapY} Td\n(4. HOJA DE RUTA SUGERIDA DE DESAHOGO Y ORDEN  |  90 DIAS) Tj\nET\n`;

  const phaseBoxW = (contentWidth - 16) / 3; // ~163 pt
  const phaseBoxH = 60;
  const phaseY = roadmapY - 14 - phaseBoxH;

  for (let p = 0; p < 3; p++) {
    const fase = diag.hojaDeRuta90Dias[p];
    const xPos = marginX + p * (phaseBoxW + 8);

    stream += `0.98 0.98 0.99 rg ${xPos} ${phaseY} ${phaseBoxW} ${phaseBoxH} re f\n`;
    stream += `0.82 0.85 0.90 RG 0.8 w ${xPos} ${phaseY} ${phaseBoxW} ${phaseBoxH} re S\n`;

    // Encabezado de fase
    stream += `0.102 0.239 0.518 rg ${xPos} ${phaseY + phaseBoxH - 14} ${phaseBoxW} 14 re f\n`;
    stream += `BT\n/F1 7.5 Tf\n1 1 1 rg\n${xPos + 6} ${phaseY + phaseBoxH - 10} Td\n(${escapePdfText(fase.fase)}: ${escapePdfText(fase.periodo)}) Tj\nET\n`;

    const objLines = wrapText(escapePdfText(fase.objetivo), 28);
    const entLines = wrapText(`Entregable: ${escapePdfText(fase.entregable)}`, 28);

    stream += `BT\n/F1 7 Tf\n0.20 0.20 0.20 rg\n${xPos + 6} ${phaseY + 30} Td\n(${objLines[0] || ""}) Tj\n`;
    if (objLines[1]) stream += `0 -8 Td\n(${objLines[1]}) Tj\n`;
    stream += `ET\n`;

    stream += `BT\n/F2 6.5 Tf\n0.40 0.40 0.40 rg\n${xPos + 6} ${phaseY + 12} Td\n(${entLines[0] || ""}) Tj\n`;
    if (entLines[1]) stream += `0 -7 Td\n(${entLines[1]}) Tj\n`;
    stream += `ET\n`;
  }

  // 9. CALLOUT DE AGENDAMIENTO DIRECTIVO Y CIERRE
  const ctaBoxY = phaseY - 38;
  const ctaBoxH = 26;
  stream += `0.94 0.96 0.99 rg ${marginX} ${ctaBoxY} ${contentWidth} ${ctaBoxH} re f\n`;
  stream += `0.102 0.239 0.518 RG 1 w ${marginX} ${ctaBoxY} ${contentWidth} ${ctaBoxH} re S\n`;

  stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} ${ctaBoxY + 15} Td\n(PROXIMO PASO: SESION DE DEVOLUCION DIRECTIVA 1 A 1  |  mejoraok.com/diagnostico) Tj\nET\n`;
  stream += `BT\n/F2 7 Tf\n0.35 0.35 0.35 rg\n${marginX + 10} ${ctaBoxY + 6} Td\n(Sesion confidencial de 45 min con Pablo Eckert. Analisis sin costo de arquitectura de acuerdos y flujos.) Tj\nET\n`;

  // 10. PIE DE PAGINA INSTITUCIONAL & TRICOLOR INFERIOR
  // Tricolor bar (alto 4 pt)
  stream += `0.102 0.239 0.518 rg ${marginX} 22 ${contentWidth * 0.6} 4 re f\n`;
  stream += `0.882 0.024 0.118 rg ${marginX + contentWidth * 0.6} 22 ${contentWidth * 0.2} 4 re f\n`;
  stream += `0.969 0.800 0.075 rg ${marginX + contentWidth * 0.8} 22 ${contentWidth * 0.2} 4 re f\n`;

  stream += `BT\n/F2 7.5 Tf\n0.420 0.447 0.502 rg\n${marginX} 10 Td\n(Mejora Continua  |  Sistemas Operativos para Empresas  |  mejoraok.com  |  Buenos Aires, Argentina) Tj\nET\n`;
  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n480 10 Td\n(Pagina 01 / 01) Tj\nET\n`;

  // Stream Object
  const streamLength = getByteLength(stream);
  const streamObj = newObj(`<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`);

  // Page Object
  const pageObj = newObj(
    `<< /Type /Page /Parent 4 0 R /MediaBox [0 0 ${width} ${height}] /Contents ${streamObj} 0 R /Resources << /Font << /F1 ${fontHelveticaBold} 0 R /F2 ${fontHelvetica} 0 R >> >> >>`
  );

  // Pages Object (id: 4)
  const pagesObj = newObj(`<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`);

  // Catalog Object (id: 5)
  const catalogObj = newObj(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  // Ensamblar PDF 1.4 con tabla xref
  let pdfOutput = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
  const offsets: number[] = [0]; // offset 0 siempre es libre

  for (let i = 0; i < objects.length; i++) {
    offsets.push(getByteLength(pdfOutput));
    pdfOutput += objects[i] + "\n";
  }

  const xrefOffset = getByteLength(pdfOutput);
  pdfOutput += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    const off = offsets[i].toString().padStart(10, "0");
    pdfOutput += `${off} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdfOutput);
}

/**
 * Dispara la descarga del PDF en el navegador
 */
export function descargarDiagnosticoEjecutivoPDF(
  diag: DiagnosticoEjecutivo,
  nombreArchivo?: string
): void {
  const bytes = generarDiagnosticoEjecutivoPDF(diag);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const cleanName = escapePdfText(diag.directivo).replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  const filename =
    nombreArchivo ||
    `Diagnostico_Ejecutivo_${cleanName}_${diag.id}.pdf`;

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
