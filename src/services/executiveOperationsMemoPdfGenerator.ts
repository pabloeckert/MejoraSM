// src/services/executiveOperationsMemoPdfGenerator.ts
// GENERADOR NATIVO SOBERANO DE MEMORANDO OPERATIVO EJECUTIVO DE SOCIOS EN PDF (A4 - 595.28 x 841.89 pt)
// Sin dependencias pesadas externas. Genera un documento PDF 1.4 de alta fidelidad
// con estética de marca: Fondo 80% blanco, tipografía suiza Helvetica, barra tricolor institucional.
// Basado en High Output Management (Andy Grove) y Managing for Results (Peter Drucker).

import { ExecutiveOperationsMemo, formatearMonedaARS } from "@/domain/executiveOperationsMemoEngine";

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
function wrapText(text: string, maxCharsPerLine: number = 80): string[] {
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
 * Genera el Uint8Array de un PDF 1.4 tamaño A4 con el memorando operativo ejecutivo
 */
export function generarExecutiveMemoPDF(memo: ExecutiveOperationsMemo): Uint8Array {
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

  // 2. Barra Tricolor Institucional Superior (y: 833, alto 4 pt)
  // Azul #1A3D84 (60%: 36 a 350)
  stream += `0.102 0.239 0.518 rg ${marginX} 833 ${contentWidth * 0.6} 4 re f\n`;
  // Rojo #E1061E (20%: 350 a 454)
  stream += `0.882 0.024 0.118 rg ${marginX + contentWidth * 0.6} 833 ${contentWidth * 0.2} 4 re f\n`;
  // Amarillo #F7CC13 (20%: 454 a 559)
  stream += `0.969 0.800 0.075 rg ${marginX + contentWidth * 0.8} 833 ${contentWidth * 0.2} 4 re f\n`;

  // 3. Encabezado Institucional
  stream += `BT\n/F1 15 Tf\n0.102 0.239 0.518 rg\n${marginX} 810 Td\n(MEJORA CONTINUA) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.420 0.447 0.502 rg\n${marginX} 798 Td\n(MEMORANDO OPERATIVO EJECUTIVO DE SOCIOS  |  HIGH OUTPUT MANAGEMENT) Tj\nET\n`;

  // Referencia y Fecha
  const refText = escapePdfText(`REF: ${memo.id}`);
  const semText = escapePdfText(`Semana: ${memo.semana} (${memo.periodo})`);
  stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n370 810 Td\n(INFORME CONFIDENCIAL DE SOCIOS) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.420 0.447 0.502 rg\n370 798 Td\n(${refText}  |  ${semText}) Tj\nET\n`;

  // Línea divisoria
  stream += `0.88 0.90 0.92 RG 0.8 w ${marginX} 788 m ${marginX + contentWidth} 788 l S\n`;

  // 4. Ficha de Metadatos de Reunión
  stream += `0.97 0.98 0.99 rg ${marginX} 746 ${contentWidth} 36 re f\n`;
  stream += `0.85 0.88 0.92 RG 0.5 w ${marginX} 746 ${contentWidth} 36 re S\n`;

  const metaLinea1 = escapePdfText(`Emisor: ${memo.emisor}  |  Destinatarios: ${memo.destinatarios.join(", ")}`);
  const metaLinea2 = escapePdfText(`Fecha de Emision: ${memo.fechaEmision}  |  Metodologia: Andy Grove & Peter Drucker`);
  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} 768 Td\n(${metaLinea1}) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.35 0.35 0.35 rg\n${marginX + 8} 755 Td\n(${metaLinea2}) Tj\nET\n`;

  let curY = 732;

  // 5. Resumen Ejecutivo (Pulso Semanal)
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 11 re f\n`;
  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(1. RESUMEN EJECUTIVO DEL PULSO SEMANAL) Tj\nET\n`;
  curY -= 14;

  const lineasResumen = wrapText(memo.resumenEjecutivo, 88);
  for (const l of lineasResumen) {
    stream += `BT\n/F2 8 Tf\n0.20 0.20 0.20 rg\n${marginX + 8} ${curY} Td\n(${escapePdfText(l)}) Tj\nET\n`;
    curY -= 10;
  }
  curY -= 6;

  // 6. Indicadores Clave de Gobierno (Grove Indicators)
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 11 re f\n`;
  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(2. INDICADORES CLAVE DE GOBIERNO B2B (GROVE INDICATORS)) Tj\nET\n`;
  curY -= 14;

  const ind = memo.indicadores;
  const cardW = (contentWidth - 18) / 4;
  const cardH = 50;

  const kpis = [
    {
      titulo: "PUBLICACIONES & RITMO",
      valor: `${ind.publicaciones.publicadas} / ${ind.publicaciones.planificadas} piezas`,
      sub: `${ind.publicaciones.tasaCumplimientoPct}% cumplimiento`,
      destaque: true,
    },
    {
      titulo: "TRAFICO CON ATRIBUCION",
      valor: `${ind.traficoYAtribucion.clicksUtm.toLocaleString("es-AR")} clicks`,
      sub: ind.traficoYAtribucion.canalLider,
      destaque: false,
    },
    {
      titulo: "LEADS & DECISORES C-LEVEL",
      valor: `${ind.conversionYLeads.calificadosAltos} calificados (>=70)`,
      sub: `de ${ind.conversionYLeads.leadsTotales} consultas directas`,
      destaque: true,
    },
    {
      titulo: "SLA 48H & PIPELINE ACTIVO",
      valor: formatearMonedaARS(ind.pipelineEstimadoARS),
      sub: `${ind.saludSla.cumplimientoSlaPct}% en tiempo (<2h prom)`,
      destaque: true,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const xPos = marginX + idx * (cardW + 6);
    if (kpi.destaque) {
      stream += `0.94 0.97 1.0 rg ${xPos} ${curY - cardH} ${cardW} ${cardH} re f\n`;
      stream += `0.102 0.239 0.518 RG 0.8 w ${xPos} ${curY - cardH} ${cardW} ${cardH} re S\n`;
    } else {
      stream += `0.97 0.98 0.99 rg ${xPos} ${curY - cardH} ${cardW} ${cardH} re f\n`;
      stream += `0.85 0.88 0.92 RG 0.5 w ${xPos} ${curY - cardH} ${cardW} ${cardH} re S\n`;
    }

    const tKpi = escapePdfText(kpi.titulo);
    stream += `BT\n/F1 6.5 Tf\n0.35 0.35 0.35 rg\n${xPos + 6} ${curY - 12} Td\n(${tKpi}) Tj\nET\n`;

    const vKpi = escapePdfText(kpi.valor);
    stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${xPos + 6} ${curY - 26} Td\n(${vKpi}) Tj\nET\n`;

    const sKpi = escapePdfText(kpi.sub);
    stream += `BT\n/F2 7 Tf\n0.45 0.45 0.45 rg\n${xPos + 6} ${curY - 40} Td\n(${sKpi}) Tj\nET\n`;
  });

  curY -= cardH + 16;

  // 7. Contribución por Arquetipo Directivo
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 11 re f\n`;
  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(3. CONTRIBUCION AL PIPELINE POR ARQUETIPO DIRECTIVO) Tj\nET\n`;
  curY -= 14;

  // Cabecera tabla
  stream += `0.93 0.95 0.98 rg ${marginX} ${curY - 14} ${contentWidth} 14 re f\n`;
  stream += `BT\n/F1 7 Tf\n0.102 0.239 0.518 rg\n${marginX + 6} ${curY - 10} Td\n(ARQUETIPO DIRECTIVO DE DOLOR) Tj\nET\n`;
  stream += `BT\n/F1 7 Tf\n0.102 0.239 0.518 rg\n${marginX + 220} ${curY - 10} Td\n(LEADS CAPTURADOS) Tj\nET\n`;
  stream += `BT\n/F1 7 Tf\n0.102 0.239 0.518 rg\n${marginX + 320} ${curY - 10} Td\n(DECISORES (>=70)) Tj\nET\n`;
  stream += `BT\n/F1 7 Tf\n0.102 0.239 0.518 rg\n${marginX + 410} ${curY - 10} Td\n(PIPELINE ESTIMADO) Tj\nET\n`;
  curY -= 18;

  // Filas tabla
  memo.desgloseArquetipos.forEach((arq) => {
    stream += `0.98 0.98 0.99 rg ${marginX} ${curY - 14} ${contentWidth} 14 re f\n`;
    stream += `0.88 0.90 0.92 RG 0.4 w ${marginX} ${curY - 14} ${contentWidth} 14 re S\n`;

    const nombrePdf = escapePdfText(arq.nombre);
    stream += `BT\n/F1 7.5 Tf\n0.20 0.20 0.20 rg\n${marginX + 6} ${curY - 10} Td\n(${nombrePdf}) Tj\nET\n`;

    const leadsPdf = escapePdfText(`${arq.leads} consultas`);
    stream += `BT\n/F2 7.5 Tf\n0.35 0.35 0.35 rg\n${marginX + 220} ${curY - 10} Td\n(${leadsPdf}) Tj\nET\n`;

    const califPdf = escapePdfText(`${arq.calificados} directivos`);
    stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 320} ${curY - 10} Td\n(${califPdf}) Tj\nET\n`;

    const pipePdf = escapePdfText(formatearMonedaARS(arq.pipelineARS));
    stream += `BT\n/F1 7.5 Tf\n0.882 0.024 0.118 rg\n${marginX + 410} ${curY - 10} Td\n(${pipePdf}) Tj\nET\n`;

    curY -= 16;
  });
  curY -= 6;

  // 8. El Paso Limitante (Andy Grove)
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 11 re f\n`;
  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(4. EL PASO LIMITANTE: CUELLO DE BOTELLA OPERATIVO) Tj\nET\n`;
  curY -= 14;

  stream += `0.98 0.97 0.95 rg ${marginX + 6} ${curY - 34} ${contentWidth - 12} 34 re f\n`;
  stream += `0.882 0.024 0.118 RG 1.5 w ${marginX + 6} ${curY - 34} m ${marginX + 6} ${curY} l S\n`;

  const plNom = escapePdfText(`Cuello Detectado: ${memo.pasoLimitante.pasoLimitante}`);
  const plAcc = escapePdfText(`Accion de Trinchera: ${memo.pasoLimitante.accionInmediata}`);
  stream += `BT\n/F1 8 Tf\n0.882 0.024 0.118 rg\n${marginX + 14} ${curY - 11} Td\n(${plNom}) Tj\nET\n`;
  stream += `BT\n/F2 7.5 Tf\n0.25 0.25 0.25 rg\n${marginX + 14} ${curY - 24} Td\n(${plAcc}) Tj\nET\n`;
  curY -= 44;

  // 9. Prioridades Directivas de la Semana
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 11 re f\n`;
  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(5. PRIORIDADES DE GOBIERNO PARA LA PROXIMA SEMANA) Tj\nET\n`;
  curY -= 14;

  memo.prioridadesSemanaSiguiente.slice(0, 3).forEach((p, idx) => {
    const pPdf = escapePdfText(wrapText(`${idx + 1}. ${p}`, 88)[0] || p);
    stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY} Td\n(${pPdf}) Tj\nET\n`;
    curY -= 11;
  });

  // 10. Footer Institucional y Firma
  const footY = 32;
  stream += `0.88 0.90 0.92 RG 0.6 w ${marginX} ${footY + 16} m ${marginX + contentWidth} ${footY + 16} l S\n`;

  // Barra Tricolor Inferior
  stream += `0.102 0.239 0.518 rg ${marginX} ${footY + 13} ${contentWidth * 0.6} 2 re f\n`;
  stream += `0.882 0.024 0.118 rg ${marginX + contentWidth * 0.6} ${footY + 13} ${contentWidth * 0.2} 2 re f\n`;
  stream += `0.969 0.800 0.075 rg ${marginX + contentWidth * 0.8} ${footY + 13} ${contentWidth * 0.2} 2 re f\n`;

  stream += `BT\n/F2 7.5 Tf\n0.420 0.447 0.502 rg\n${marginX} ${footY} Td\n(MEJORA CONTINUA  |  mejoraok.com  |  contacto@mejoraok.com) Tj\nET\n`;
  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n350 ${footY} Td\n(Firma Directiva: Pablo Eckert - Direccion General) Tj\nET\n`;

  // Crear objeto Stream de la página
  const streamLength = getByteLength(stream);
  const pageStream = newObj(`<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`);

  // Objeto Page
  const pageObj = newObj(
    `<< /Type /Page /Parent 4 0 R /MediaBox [0 0 ${width} ${height}] /Contents ${pageStream} 0 R /Resources << /Font << /F1 ${fontHelveticaBold} 0 R /F2 ${fontHelvetica} 0 R >> >> >>`
  );

  // Catálogo de Páginas
  const pagesObj = newObj(`<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`);

  // Raíz del Catálogo
  const catalogObj = newObj(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  // Construir PDF final con XREF y Trailer
  let pdfOutput = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(getByteLength(pdfOutput));
    pdfOutput += objects[i] + "\n";
  }

  const xrefOffset = getByteLength(pdfOutput);
  pdfOutput += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const off = String(offsets[i]).padStart(10, "0");
    pdfOutput += `${off} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdfOutput);
}

/**
 * Dispara la descarga del PDF del memorando operativo en el navegador
 */
export function descargarExecutiveMemoPDF(memo: ExecutiveOperationsMemo): void {
  const bytes = generarExecutiveMemoPDF(memo);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Memo_Operativo_${memo.semana}_${memo.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
