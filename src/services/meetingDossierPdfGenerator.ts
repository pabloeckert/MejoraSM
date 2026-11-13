// src/services/meetingDossierPdfGenerator.ts
// GENERADOR NATIVO SOBERANO DE DOSSIERS DE REUNION 1 A 1 EN PDF (A4 - 595.28 x 841.89 pt)
// Sin dependencias pesadas externas. Genera un documento PDF 1.4 de uso interno
// para Pablo Eckert antes de la llamada de devolución de 45 minutos.
// Basado en High Output Management (Andy Grove) y The Challenger Sale (Dixon & Adamson).

import { MeetingDossier } from "@/domain/meetingDossierEngine";

function escapePdfText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Normalizar acentos a ASCII WinAnsi
}

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
 * Genera el Uint8Array de un PDF 1.4 tamaño A4 con el dossier de reunión 1 a 1
 */
export function generarMeetingDossierPDF(dossier: MeetingDossier): Uint8Array {
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

  // Fuentes estándar
  const fontHelveticaBold = newObj(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`
  );
  const fontHelvetica = newObj(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  );

  let stream = "";

  // 1. Fondo blanco puro #FFFFFF
  stream += `1 1 1 rg 0 0 ${width} ${height} re f\n`;

  // 2. Barra Tricolor Superior (alto 4 pt)
  stream += `0.102 0.239 0.518 rg ${marginX} 833 ${contentWidth * 0.6} 4 re f\n`;
  stream += `0.882 0.024 0.118 rg ${marginX + contentWidth * 0.6} 833 ${contentWidth * 0.2} 4 re f\n`;
  stream += `0.969 0.800 0.075 rg ${marginX + contentWidth * 0.8} 833 ${contentWidth * 0.2} 4 re f\n`;

  // 3. Encabezado de Uso Interno Confidencial
  stream += `BT\n/F1 15 Tf\n0.102 0.239 0.518 rg\n${marginX} 812 Td\n(MEJORA CONTINUA) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.42 0.45 0.50 rg\n${marginX} 801 Td\n(SISTEMAS OPERATIVOS B2B  |  SISTEMA DE PREPARACION DIRECTIVA 1 A 1) Tj\nET\n`;

  const refText = escapePdfText(`REF: ${dossier.idDossier}`);
  const dateText = escapePdfText(`Fecha: ${dossier.fechaGeneracion}`);
  stream += `BT\n/F1 8.5 Tf\n0.882 0.024 0.118 rg\n360 812 Td\n(DOSSIER CONFIDENCIAL  |  USO INTERNO PABLO ECKERT) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.42 0.45 0.50 rg\n360 801 Td\n(${refText}  |  ${dateText}) Tj\nET\n`;

  stream += `0.88 0.90 0.92 RG 0.8 w ${marginX} 792 m ${marginX + contentWidth} 792 l S\n`;

  // 4. Caja de Datos del Prospecto Directivo
  const boxY = 736;
  const boxH = 48;
  stream += `0.96 0.97 0.98 rg ${marginX} ${boxY} ${contentWidth} ${boxH} re f\n`;
  stream += `0.82 0.85 0.90 RG 1 w ${marginX} ${boxY} ${contentWidth} ${boxH} re S\n`;

  const leadTitle = escapePdfText(`Directivo: ${dossier.directivo} (${dossier.cargo})  |  Empresa: ${dossier.empresa}`);
  const leadMeta = escapePdfText(`Canal: ${dossier.canal}  |  Arquetipo: ${dossier.arquetipoLabel}`);
  const scoreBadge = escapePdfText(`Score Calificacion: ${dossier.scoreLead} / 100`);

  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} 770 Td\n(${leadTitle}) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.30 0.30 0.30 rg\n${marginX + 10} 752 Td\n(${leadMeta}) Tj\nET\n`;
  stream += `BT\n/F1 8 Tf\n0.882 0.024 0.118 rg\n420 752 Td\n(${scoreBadge}) Tj\nET\n`;

  // 5. SECCION 1: GUION DE APERTURA CHALLENGER (90 SEGUNDOS)
  let curY = 718;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${curY} Td\n(1. GUION DE APERTURA CHALLENGER  |  PRIMEROS 90 SEGUNDOS) Tj\nET\n`;

  curY -= 6;
  const scriptLines = wrapText(escapePdfText(dossier.guionAperturaChallenger90s), 86);
  const scriptH = Math.max(52, scriptLines.length * 11 + 16);
  const scriptY = curY - scriptH;

  stream += `0.95 0.97 1.0 rg ${marginX} ${scriptY} ${contentWidth} ${scriptH} re f\n`;
  stream += `0.102 0.239 0.518 RG 1 w ${marginX} ${scriptY} ${contentWidth} ${scriptH} re S\n`;

  let lineY = curY - 14;
  stream += `BT\n/F2 7.5 Tf\n0.15 0.20 0.30 rg\n`;
  for (let l = 0; l < scriptLines.length; l++) {
    if (l === 0) {
      stream += `${marginX + 10} ${lineY} Td\n(${scriptLines[l]}) Tj\n`;
    } else {
      stream += `0 -10 Td\n(${scriptLines[l]}) Tj\n`;
    }
  }
  stream += `ET\n`;

  // 6. SECCION 2: LAS 4 PREGUNTAS MAESTRAS DE TRINCHERA (4 DIMENSIONES)
  curY = scriptY - 14;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${curY} Td\n(2. LAS 4 PREGUNTAS MAESTRAS DE TRINCHERA  |  MARCO 4 DIMENSIONES) Tj\nET\n`;

  curY -= 10;
  const qBoxW = (contentWidth - 10) / 2; // ~256 pt
  const qBoxH = 50;

  for (let q = 0; q < 4; q++) {
    const item = dossier.preguntasTrinchera4D[q];
    const col = q % 2;
    const row = Math.floor(q / 2);
    const xPos = marginX + col * (qBoxW + 10);
    const yPos = curY - row * (qBoxH + 6) - qBoxH;

    stream += `0.97 0.98 0.99 rg ${xPos} ${yPos} ${qBoxW} ${qBoxH} re f\n`;
    stream += `0.80 0.85 0.90 RG 0.8 w ${xPos} ${yPos} ${qBoxW} ${qBoxH} re S\n`;

    // Indicador dimension
    stream += `0.102 0.239 0.518 rg ${xPos} ${yPos} 3.5 ${qBoxH} re f\n`;
    stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${xPos + 8} ${yPos + 38} Td\n([${escapePdfText(item.dimension)}]: ${escapePdfText(item.objetivoDiagnostico)}) Tj\nET\n`;

    const qLines = wrapText(`"${escapePdfText(item.pregunta)}"`, 44);
    const listenLines = wrapText(`Escuchar: ${escapePdfText(item.queEscuchar)}`, 44);

    stream += `BT\n/F1 7 Tf\n0.20 0.20 0.20 rg\n${xPos + 8} ${yPos + 27} Td\n(${qLines[0] || ""}) Tj\n`;
    if (qLines[1]) stream += `0 -7.5 Td\n(${qLines[1]}) Tj\n`;
    stream += `ET\n`;

    stream += `BT\n/F2 6 Tf\n0.882 0.024 0.118 rg\n${xPos + 8} ${yPos + 10} Td\n(${listenLines[0] || ""}) Tj\nET\n`;
  }

  // 7. SECCION 3: MATRIZ DE OBJECIONES ANTICIPADAS & REENCUADRES
  const objSectionY = curY - 2 * (qBoxH + 6) - 14;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${objSectionY} Td\n(3. MATRIZ DE OBJECIONES ANTICIPADAS & REENCUADRES CONSULTIVOS) Tj\nET\n`;

  let objRowY = objSectionY - 12;
  const colObj1W = 160;
  const colObj2W = contentWidth - colObj1W; // ~363 pt

  // Header tabla objeciones
  stream += `0.92 0.94 0.96 rg ${marginX} ${objRowY} ${contentWidth} 14 re f\n`;
  stream += `0.80 0.82 0.85 RG 0.5 w ${marginX} ${objRowY} ${contentWidth} 14 re S\n`;
  stream += `BT\n/F1 7 Tf\n0.15 0.20 0.30 rg\n${marginX + 6} ${objRowY + 3.5} Td\n(OBJECION TIPICA EN LA LLAMADA) Tj\nET\n`;
  stream += `BT\n/F1 7 Tf\n0.15 0.20 0.30 rg\n${marginX + colObj1W + 6} ${objRowY + 3.5} Td\n(REENCUADRE CONSULTIVO RECOMENDADO - CALIDEZ CON VERDAD) Tj\nET\n`;

  for (let o = 0; o < dossier.objecionesAnticipadas.length; o++) {
    const obj = dossier.objecionesAnticipadas[o];
    const rowH = 26;
    objRowY -= rowH;

    if (o % 2 === 1) stream += `0.98 0.98 0.99 rg ${marginX} ${objRowY} ${contentWidth} ${rowH} re f\n`;
    stream += `0.88 0.90 0.92 RG 0.5 w ${marginX} ${objRowY} ${contentWidth} ${rowH} re S\n`;
    stream += `0.88 0.90 0.92 RG 0.5 w ${marginX + colObj1W} ${objRowY} m ${marginX + colObj1W} ${objRowY + rowH} l S\n`;

    const oLines = wrapText(escapePdfText(obj.objecionTipica), 28);
    const rLines = wrapText(escapePdfText(obj.reencuadreConsultivo), 64);

    stream += `BT\n/F1 6.5 Tf\n0.882 0.024 0.118 rg\n${marginX + 5} ${objRowY + 16} Td\n(${oLines[0] || ""}) Tj\n`;
    if (oLines[1]) stream += `0 -7.5 Td\n(${oLines[1]}) Tj\n`;
    stream += `ET\n`;

    stream += `BT\n/F2 6.5 Tf\n0.15 0.20 0.30 rg\n${marginX + colObj1W + 5} ${objRowY + 16} Td\n(${rLines[0] || ""}) Tj\n`;
    if (rLines[1]) stream += `0 -7.5 Td\n(${rLines[1]}) Tj\n`;
    stream += `ET\n`;
  }

  // 8. SECCION 4: CHECKLIST PRE-VUELO (10 MIN ANTES) & SERVICIO RECOMENDADO
  const checkY = objRowY - 14;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${checkY} Td\n(4. CHECKLIST PRE-VUELO  |  RITUAL DE 10 MINUTOS ANTES DE CONECTARSE) Tj\nET\n`;

  const bottomBoxY = checkY - 58;
  const bottomBoxH = 50;

  // Caja izquierda: Checklist (ancho 330)
  const checkW = 340;
  stream += `0.98 0.98 0.99 rg ${marginX} ${bottomBoxY} ${checkW} ${bottomBoxH} re f\n`;
  stream += `0.85 0.88 0.92 RG 0.8 w ${marginX} ${bottomBoxY} ${checkW} ${bottomBoxH} re S\n`;

  for (let c = 0; c < Math.min(4, dossier.checklistPreVuelo10Min.length); c++) {
    const item = wrapText(`[  ] ${escapePdfText(dossier.checklistPreVuelo10Min[c])}`, 62)[0] || "";
    stream += `BT\n/F2 6 Tf\n0.30 0.30 0.30 rg\n${marginX + 8} ${bottomBoxY + 38 - c * 10} Td\n(${item}) Tj\nET\n`;
  }

  // Caja derecha: Servicio Sugerido (ancho contentWidth - checkW - 10)
  const srvX = marginX + checkW + 8;
  const srvW = contentWidth - checkW - 8;
  stream += `0.94 0.96 0.99 rg ${srvX} ${bottomBoxY} ${srvW} ${bottomBoxH} re f\n`;
  stream += `0.102 0.239 0.518 RG 1 w ${srvX} ${bottomBoxY} ${srvW} ${bottomBoxH} re S\n`;

  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${srvX + 6} ${bottomBoxY + 38} Td\n(PROPUESTA SUGERIDA:) Tj\nET\n`;
  const srvNameLines = wrapText(escapePdfText(dossier.propuestaServicioRecomendada.nombreServicio), 28);
  stream += `BT\n/F1 6.5 Tf\n0.20 0.20 0.20 rg\n${srvX + 6} ${bottomBoxY + 28} Td\n(${srvNameLines[0] || ""}) Tj\nET\n`;
  stream += `BT\n/F2 6 Tf\n0.40 0.40 0.40 rg\n${srvX + 6} ${bottomBoxY + 18} Td\n(${escapePdfText(dossier.propuestaServicioRecomendada.duracionEstimada)}) Tj\nET\n`;
  stream += `BT\n/F1 6 Tf\n0.882 0.024 0.118 rg\n${srvX + 6} ${bottomBoxY + 8} Td\n(Cierre: ${escapePdfText(dossier.propuestaServicioRecomendada.cierreSugerido.substring(0, 36))}...) Tj\nET\n`;

  // 9. FOOTER TRICOLOR
  stream += `0.102 0.239 0.518 rg ${marginX} 22 ${contentWidth * 0.6} 4 re f\n`;
  stream += `0.882 0.024 0.118 rg ${marginX + contentWidth * 0.6} 22 ${contentWidth * 0.2} 4 re f\n`;
  stream += `0.969 0.800 0.075 rg ${marginX + contentWidth * 0.8} 22 ${contentWidth * 0.2} 4 re f\n`;

  stream += `BT\n/F2 7 Tf\n0.42 0.45 0.50 rg\n${marginX} 10 Td\n(Mejora Continua  |  Dossier Confidencial de Trinchera  |  mejoraok.com  |  Uso Interno Exclusivo) Tj\nET\n`;
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
  const offsets: number[] = [0];

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
export function descargarMeetingDossierPDF(
  dossier: MeetingDossier,
  nombreArchivo?: string
): void {
  const bytes = generarMeetingDossierPDF(dossier);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const cleanName = escapePdfText(dossier.directivo).replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  const filename =
    nombreArchivo ||
    `Dossier_Reunion_${cleanName}_${dossier.idDossier}.pdf`;

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
