// src/services/customerSuccessPdfGenerator.ts
// GENERADOR NATIVO SOBERANO DE CASOS DE ÉXITO B2B EN PDF (A4 - 595.28 x 841.89 pt)
// Sin dependencias pesadas externas. Genera un documento PDF 1.4 de alta fidelidad
// con estética de marca: Fondo 80% blanco, tipografía suiza Helvetica, barra tricolor institucional.
// Basado en Building a StoryBrand (Donald Miller) y The Psychology of Persuasion (Robert Cialdini).

import { CustomerCase } from "@/domain/customerSuccessEngine";

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
 * Genera el Uint8Array de un PDF 1.4 tamaño A4 con el caso de éxito B2B
 */
export function generarCasoExitoPDF(caso: CustomerCase): Uint8Array {
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
  stream += `BT\n/F1 16 Tf\n0.102 0.239 0.518 rg\n${marginX} 810 Td\n(MEJORA CONTINUA) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.420 0.447 0.502 rg\n${marginX} 798 Td\n(CASO DE ESTUDIO B2B  |  PRUEBA SOCIAL & TRANSFORMACION DIRECTIVA) Tj\nET\n`;

  // Referencia y Badge
  const refText = escapePdfText(`REF: ${caso.id}`);
  const arqLabel = escapePdfText(caso.arquetipo.toUpperCase().replace(/_/g, " "));
  stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n380 810 Td\n(CASO DE AUTORIDAD VERIFICADO) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.420 0.447 0.502 rg\n380 798 Td\n(${refText}  |  ${arqLabel}) Tj\nET\n`;

  // Línea divisoria
  stream += `0.88 0.90 0.92 RG 0.8 w ${marginX} 788 m ${marginX + contentWidth} 788 l S\n`;

  // 4. Bloque de Identificación de la Empresa
  // Fondo de ficha gris tenue
  stream += `0.97 0.98 0.99 rg ${marginX} 732 ${contentWidth} 50 re f\n`;
  stream += `0.85 0.88 0.92 RG 0.5 w ${marginX} 732 ${contentWidth} 50 re S\n`;

  const tituloPdf = escapePdfText(caso.titulo);
  stream += `BT\n/F1 11 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} 766 Td\n(${tituloPdf}) Tj\nET\n`;

  const datosEmpresa = escapePdfText(
    `Empresa: ${caso.empresa} (${caso.tamano})  |  Sector: ${caso.rubro}  |  Ubicacion: ${caso.ubicacion}`
  );
  const datosProtagonista = escapePdfText(
    `Protagonista: ${caso.rolProtagonista}  |  Confidencialidad: ${caso.anonimizado ? "Datos Anonimizados" : "Autorizado por Direccion"}`
  );
  stream += `BT\n/F2 8 Tf\n0.25 0.25 0.25 rg\n${marginX + 10} 752 Td\n(${datosEmpresa}) Tj\nET\n`;
  stream += `BT\n/F2 8 Tf\n0.420 0.447 0.502 rg\n${marginX + 10} 740 Td\n(${datosProtagonista}) Tj\nET\n`;

  let curY = 718;

  // 5. Marco StoryBrand: El Problema (Situación Inicial)
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 11 re f\n`;
  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(1. LA SITUACION INICIAL: EL CUELLO DE BOTELLA DEL LIDER) Tj\nET\n`;
  curY -= 14;

  const lineasExterno = wrapText(`Sintoma Operativo: ${caso.problemaStoryBrand.externo}`, 88);
  for (const l of lineasExterno) {
    stream += `BT\n/F2 8 Tf\n0.20 0.20 0.20 rg\n${marginX + 8} ${curY} Td\n(${escapePdfText(l)}) Tj\nET\n`;
    curY -= 10;
  }
  const lineasInterno = wrapText(`Carga Emocional: ${caso.problemaStoryBrand.interno}`, 88);
  for (const l of lineasInterno) {
    stream += `BT\n/F2 8 Tf\n0.420 0.447 0.502 rg\n${marginX + 8} ${curY} Td\n(${escapePdfText(l)}) Tj\nET\n`;
    curY -= 10;
  }
  curY -= 6;

  // 6. El Guía y la Metodología 4D
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 11 re f\n`;
  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(2. LA INTERVENCION METODOLOGICA: EL GUIA Y EL PLAN 4D) Tj\nET\n`;
  curY -= 14;

  const lineasGuia = wrapText(`${caso.guiaYPlan.rolGuia}`, 88);
  for (const l of lineasGuia) {
    stream += `BT\n/F2 8 Tf\n0.20 0.20 0.20 rg\n${marginX + 8} ${curY} Td\n(${escapePdfText(l)}) Tj\nET\n`;
    curY -= 10;
  }
  curY -= 4;

  // 4 Cajas de las Dimensiones
  const p4d = caso.guiaYPlan.plan4D;
  const planItems = [
    { dim: "Dimension Personal", text: p4d.personal },
    { dim: "Dimension Organizacional", text: p4d.organizacional },
    { dim: "Dimension Comercial", text: p4d.comercial },
    { dim: "Dimension Empresarial", text: p4d.empresarial },
  ];

  for (const item of planItems) {
    stream += `0.98 0.98 0.99 rg ${marginX + 8} ${curY - 14} ${contentWidth - 16} 16 re f\n`;
    stream += `0.88 0.90 0.92 RG 0.4 w ${marginX + 8} ${curY - 14} ${contentWidth - 16} 16 re S\n`;
    const labelDim = escapePdfText(item.dim.toUpperCase());
    const textDim = escapePdfText(wrapText(item.text, 68)[0] || item.text);
    stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 14} ${curY - 9} Td\n(${labelDim}:) Tj\nET\n`;
    stream += `BT\n/F2 7.5 Tf\n0.25 0.25 0.25 rg\n${marginX + 145} ${curY - 9} Td\n(${textDim}) Tj\nET\n`;
    curY -= 18;
  }
  curY -= 6;

  // 7. Métricas de Impacto Cuantitativas (Robert Cialdini)
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 11 re f\n`;
  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(3. RESULTADOS CUANTITATIVOS: ANTES VS DESPUES EN 90 DIAS) Tj\nET\n`;
  curY -= 14;

  const cardW = (contentWidth - 18) / 4;
  const cardH = 50;
  const metricas = caso.metricasImpacto.slice(0, 4);

  metricas.forEach((m, idx) => {
    const xPos = marginX + idx * (cardW + 6);
    // Fondo de tarjeta
    if (m.destaque) {
      stream += `0.94 0.97 1.0 rg ${xPos} ${curY - cardH} ${cardW} ${cardH} re f\n`;
      stream += `0.102 0.239 0.518 RG 0.8 w ${xPos} ${curY - cardH} ${cardW} ${cardH} re S\n`;
    } else {
      stream += `0.97 0.98 0.99 rg ${xPos} ${curY - cardH} ${cardW} ${cardH} re f\n`;
      stream += `0.85 0.88 0.92 RG 0.5 w ${xPos} ${curY - cardH} ${cardW} ${cardH} re S\n`;
    }

    // Título métrica
    const mTitulo = escapePdfText(wrapText(m.metrica, 22)[0] || m.metrica);
    stream += `BT\n/F1 7 Tf\n0.35 0.35 0.35 rg\n${xPos + 6} ${curY - 12} Td\n(${mTitulo}) Tj\nET\n`;

    // Valor antes vs después
    const mAntes = escapePdfText(`Antes: ${m.antes}`);
    const mDespues = escapePdfText(`Hoy: ${m.despues}`);
    stream += `BT\n/F2 7.5 Tf\n0.50 0.50 0.50 rg\n${xPos + 6} ${curY - 24} Td\n(${mAntes}) Tj\nET\n`;
    stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${xPos + 6} ${curY - 35} Td\n(${mDespues}) Tj\nET\n`;

    // Badge cambio
    const mCambio = escapePdfText(m.cambio);
    stream += `BT\n/F1 7 Tf\n0.882 0.024 0.118 rg\n${xPos + 6} ${curY - 45} Td\n(${mCambio}) Tj\nET\n`;
  });

  curY -= cardH + 16;

  // 8. Transformación y Cita Textual del Héroe
  stream += `0.102 0.239 0.518 rg ${marginX} ${curY} 3 11 re f\n`;
  stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${marginX + 8} ${curY + 1} Td\n(4. LA TRANSFORMACION Y TESTIMONIO DIRECTIVO) Tj\nET\n`;
  curY -= 14;

  // Caja de Cita Destacada
  stream += `0.97 0.98 0.99 rg ${marginX + 8} ${curY - 34} ${contentWidth - 16} 34 re f\n`;
  stream += `0.102 0.239 0.518 RG 1.5 w ${marginX + 8} ${curY - 34} m ${marginX + 8} ${curY} l S\n`;
  
  const citaLineas = wrapText(`"${caso.transformacion.citaHeroe}"`, 78);
  citaLineas.slice(0, 2).forEach((cl, i) => {
    stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 16} ${curY - 12 - i * 11} Td\n(${escapePdfText(cl)}) Tj\nET\n`;
  });
  const autorCita = escapePdfText(`- ${caso.rolProtagonista}, ${caso.empresa}`);
  stream += `BT\n/F2 7.5 Tf\n0.420 0.447 0.502 rg\n${marginX + 16} ${curY - 30} Td\n(${autorCita}) Tj\nET\n`;
  curY -= 46;

  // 9. Lecciones de Trinchera
  stream += `BT\n/F1 8 Tf\n0.25 0.25 0.25 rg\n${marginX + 8} ${curY} Td\n(LECCIONES DE GOBIERNO PARA OTROS DIRECTIVOS:) Tj\nET\n`;
  curY -= 12;

  caso.leccionesDirectivas.slice(0, 3).forEach((lec, idx) => {
    const lPdf = escapePdfText(wrapText(`${idx + 1}. ${lec}`, 85)[0] || lec);
    stream += `BT\n/F2 7.5 Tf\n0.30 0.30 0.30 rg\n${marginX + 14} ${curY} Td\n(${lPdf}) Tj\nET\n`;
    curY -= 10;
  });

  // 10. Footer Institucional (Tricolor inferior y contacto)
  const footY = 32;
  stream += `0.88 0.90 0.92 RG 0.6 w ${marginX} ${footY + 16} m ${marginX + contentWidth} ${footY + 16} l S\n`;

  // Barra Tricolor Inferior
  stream += `0.102 0.239 0.518 rg ${marginX} ${footY + 13} ${contentWidth * 0.6} 2 re f\n`;
  stream += `0.882 0.024 0.118 rg ${marginX + contentWidth * 0.6} ${footY + 13} ${contentWidth * 0.2} 2 re f\n`;
  stream += `0.969 0.800 0.075 rg ${marginX + contentWidth * 0.8} ${footY + 13} ${contentWidth * 0.2} 2 re f\n`;

  stream += `BT\n/F2 7.5 Tf\n0.420 0.447 0.502 rg\n${marginX} ${footY} Td\n(MEJORA CONTINUA  |  mejoraok.com  |  contacto@mejoraok.com) Tj\nET\n`;
  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n360 ${footY} Td\n(Diagnostico y Evaluacion Directiva: mejoraok.com/diagnostico) Tj\nET\n`;

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
 * Dispara la descarga del PDF del caso de estudio en el navegador
 */
export function descargarCasoExitoPDF(caso: CustomerCase): void {
  const bytes = generarCasoExitoPDF(caso);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Caso_Exito_${caso.arquetipo}_${caso.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
