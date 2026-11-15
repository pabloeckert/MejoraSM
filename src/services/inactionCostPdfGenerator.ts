/**
 * inactionCostPdfGenerator.ts — Generador Soberano PDF A4 de Costo de Inacción Operativa & Retorno 4D
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - Matthew Dixon & Brent Adamson (The Challenger Sale): Tensión constructiva y cuantificación de la inacción.
 * - Peter Drucker (Managing for Results): Costo de oportunidad directivo y retorno sobre activos.
 * - Josef Müller-Brockmann (Grid Systems): Retícula suiza 80%+ blanco (#FFFFFF), barra tricolor
 *   institucional (#1A3D84 / #E1061E / #F7CC13) y tipografía Helvetica limpia.
 *
 * Formato: PDF 1.4 vectorial nativo A4 (595.28 × 841.89 pt), 0 dependencias externas.
 */

import { type ResultadoCostoInaccion, formatearMonedaARS } from "@/domain/inactionCostEngine";

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
 * Genera el buffer Uint8Array de un documento PDF 1.4 tamaño A4 con el Costo de Inacción Operativa.
 */
export function generarInactionCostPDF(resultado: ResultadoCostoInaccion): Uint8Array {
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
  stream += `BT\n/F2 7.8 Tf\n0.420 0.447 0.502 rg\n${marginX} 800 Td\n(EVALUACION DE COSTO DE INACCION OPERATIVA & RETORNO DE INVERSION 4D) Tj\nET\n`;

  const idDoc = escapePdfText(resultado.idCalculo);
  const fechaStr = new Date(resultado.fechaCalculo).toLocaleDateString("es-AR");
  stream += `0.95 0.96 0.98 rg 410 796 149 24 re f\n`;
  stream += `0.102 0.239 0.518 RG 0.7 w 410 796 149 24 re S\n`;
  stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n418 810 Td\n(REF: ${idDoc}) Tj\nET\n`;
  stream += `BT\n/F2 7 Tf\n0.35 0.35 0.35 rg\n418 800 Td\n(EMISION: ${escapePdfText(fechaStr)}) Tj\nET\n`;

  // Línea separadora
  stream += `0.82 0.85 0.90 RG 0.5 w ${marginX} 788 m ${(width - marginX).toFixed(2)} 788 l S\n`;

  // 4. Bloque de Datos de la Empresa y Contexto
  const emp = escapePdfText(resultado.empresaNombre);
  const dir = escapePdfText(resultado.nombreDirectivo);
  const arq = escapePdfText(resultado.arquetipoDolor.toUpperCase().replace(/_/g, " "));
  const factMensual = escapePdfText(formatearMonedaARS(resultado.facturacionMensualARS));

  stream += `0.97 0.98 1.0 rg ${marginX} 742 ${contentWidth.toFixed(2)} 38 re f\n`;
  stream += `0.85 0.89 0.96 RG 0.6 w ${marginX} 742 ${contentWidth.toFixed(2)} 38 re S\n`;

  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} 766 Td\n(EMPRESA:) Tj\nET\n`;
  stream += `BT\n/F2 8.5 Tf\n0.15 0.15 0.15 rg\n${marginX + 60} 766 Td\n(${truncateLine(emp, 28)}) Tj\nET\n`;

  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 230} 766 Td\n(INTERLOCUTOR:) Tj\nET\n`;
  stream += `BT\n/F2 8.5 Tf\n0.15 0.15 0.15 rg\n${marginX + 310} 766 Td\n(${truncateLine(dir, 26)}) Tj\nET\n`;

  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} 750 Td\n(ARQUETIPO:) Tj\nET\n`;
  stream += `BT\n/F2 8.5 Tf\n0.25 0.25 0.25 rg\n${marginX + 75} 750 Td\n(${truncateLine(arq, 25)}) Tj\nET\n`;

  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 230} 750 Td\n(FACTURACION BASE:) Tj\nET\n`;
  stream += `BT\n/F2 8.5 Tf\n0.15 0.15 0.15 rg\n${marginX + 335} 750 Td\n(${factMensual} / mes) Tj\nET\n`;

  // 5. Tres Cajas de KPIs de Alto Impacto
  const cardW = (contentWidth - 16) / 3; // ~169 pt cada una
  const cardY = 664;
  const cardH = 68;

  // Caja 1: Drenaje Mensual (Rojo suave)
  const c1X = marginX;
  stream += `0.99 0.95 0.95 rg ${c1X.toFixed(2)} ${cardY} ${cardW.toFixed(2)} ${cardH} re f\n`;
  stream += `0.88 0.40 0.40 RG 0.8 w ${c1X.toFixed(2)} ${cardY} ${cardW.toFixed(2)} ${cardH} re S\n`;
  stream += `BT\n/F1 7.5 Tf\n0.882 0.024 0.118 rg\n${c1X + 8} ${cardY + 52} Td\n(DRENAJE DE INACCION MENSUAL) Tj\nET\n`;
  stream += `BT\n/F1 12.5 Tf\n0.882 0.024 0.118 rg\n${c1X + 8} ${cardY + 34} Td\n(${escapePdfText(formatearMonedaARS(resultado.costoInaccionMensualARS))}) Tj\nET\n`;
  stream += `BT\n/F2 7 Tf\n0.40 0.40 0.40 rg\n${c1X + 8} ${cardY + 18} Td\n(${resultado.porcentajeSobreFacturacion}% de facturacion mensual) Tj\nET\n`;
  stream += `BT\n/F2 6.5 Tf\n0.55 0.55 0.55 rg\n${c1X + 8} ${cardY + 7} Td\n(Fuga de caja recurrente) Tj\nET\n`;

  // Caja 2: Drenaje Anual y Horas (Azul Institucional)
  const c2X = marginX + cardW + 8;
  stream += `0.96 0.97 1.0 rg ${c2X.toFixed(2)} ${cardY} ${cardW.toFixed(2)} ${cardH} re f\n`;
  stream += `0.102 0.239 0.518 RG 0.8 w ${c2X.toFixed(2)} ${cardY} ${cardW.toFixed(2)} ${cardH} re S\n`;
  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${c2X + 8} ${cardY + 52} Td\n(COSTO ANUALIZADO STATU QUO) Tj\nET\n`;
  stream += `BT\n/F1 12.5 Tf\n0.102 0.239 0.518 rg\n${c2X + 8} ${cardY + 34} Td\n(${escapePdfText(formatearMonedaARS(resultado.costoInaccionAnualARS))}) Tj\nET\n`;
  stream += `BT\n/F2 7 Tf\n0.30 0.30 0.30 rg\n${c2X + 8} ${cardY + 18} Td\n(${resultado.horasAnualesBomberismo}h anuales de bomberismo) Tj\nET\n`;
  stream += `BT\n/F1 6.5 Tf\n0.102 0.239 0.518 rg\n${c2X + 8} ${cardY + 7} Td\n(Equivale a ${resultado.equivalenciaSemanasCompletasAnuales} semanas de trabajo) Tj\nET\n`;

  // Caja 3: Recuperación Proyectada (Verde Eficacia)
  const c3X = marginX + (cardW + 8) * 2;
  stream += `0.94 0.98 0.95 rg ${c3X.toFixed(2)} ${cardY} ${cardW.toFixed(2)} ${cardH} re f\n`;
  stream += `0.15 0.60 0.30 RG 0.8 w ${c3X.toFixed(2)} ${cardY} ${cardW.toFixed(2)} ${cardH} re S\n`;
  stream += `BT\n/F1 7.5 Tf\n0.10 0.50 0.20 rg\n${c3X + 8} ${cardY + 52} Td\n(AHORRO RECUPERABLE A 90 DIAS) Tj\nET\n`;
  stream += `BT\n/F1 12.5 Tf\n0.10 0.50 0.20 rg\n${c3X + 8} ${cardY + 34} Td\n(${escapePdfText(formatearMonedaARS(resultado.proyeccionRecuperacion.ahorroMensualProyectadoARS))} / mes) Tj\nET\n`;
  stream += `BT\n/F2 7 Tf\n0.25 0.25 0.25 rg\n${c3X + 8} ${cardY + 18} Td\n(${resultado.proyeccionRecuperacion.horasDirectivasLiberadasMes}h directivas liberadas al mes) Tj\nET\n`;
  stream += `BT\n/F1 6.5 Tf\n0.10 0.50 0.20 rg\n${c3X + 8} ${cardY + 7} Td\n(Retorno estimado: ${escapePdfText(resultado.proyeccionRecuperacion.roiEstimadoRatio)}) Tj\nET\n`;

  // 6. Título de Sección de las 4 Dimensiones
  const sec1Y = 642;
  stream += `BT\n/F1 10 Tf\n0.102 0.239 0.518 rg\n${marginX} ${sec1Y} Td\n(1. DESGLOSE DEL DRENAJE OPERATIVO EN LAS 4 DIMENSIONES) Tj\nET\n`;

  // Tabla de 4 Dimensiones
  const dimList = [
    resultado.desgloseDimensiones.personal,
    resultado.desgloseDimensiones.organizacional,
    resultado.desgloseDimensiones.comercial,
    resultado.desgloseDimensiones.empresarial,
  ];

  let currentY = sec1Y - 14;
  for (const d of dimList) {
    const boxH = 46;
    currentY -= boxH;

    stream += `0.985 0.985 0.99 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} ${boxH} re f\n`;
    stream += `0.88 0.89 0.92 RG 0.5 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} ${boxH} re S\n`;

    // Barra lateral de la dimensión
    stream += `0.102 0.239 0.518 rg ${marginX} ${currentY} 3.5 ${boxH} re f\n`;

    const tit = escapePdfText(d.titulo);
    const monto = escapePdfText(formatearMonedaARS(d.costoMensualARS) + " / mes");
    stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} ${currentY + 34} Td\n(${tit}) Tj\nET\n`;
    stream += `BT\n/F1 8 Tf\n0.882 0.024 0.118 rg\n${width - marginX - 110} ${currentY + 34} Td\n(${monto}) Tj\nET\n`;

    const fric = escapePdfText(truncateLine(d.friccionDetectada, 95));
    const causa = escapePdfText(truncateLine("Causa Raiz de Sistema: " + d.causaRaizSistema, 95));
    stream += `BT\n/F2 7 Tf\n0.25 0.25 0.25 rg\n${marginX + 10} ${currentY + 20} Td\n(${fric}) Tj\nET\n`;
    stream += `BT\n/F2 6.5 Tf\n0.45 0.45 0.45 rg\n${marginX + 10} ${currentY + 8} Td\n(${causa}) Tj\nET\n`;

    currentY -= 6;
  }

  // 7. Bloque Challenger ("El Costo del Statu Quo vs Intervención Mejora Continua")
  currentY -= 14;
  stream += `BT\n/F1 10 Tf\n0.102 0.239 0.518 rg\n${marginX} ${currentY} Td\n(2. REENCUADRE ESTRATEGICO: EL COSTO DE NO DECIDIR) Tj\nET\n`;

  currentY -= 64;
  stream += `0.96 0.98 1.0 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} 58 re f\n`;
  stream += `0.102 0.239 0.518 RG 0.8 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} 58 re S\n`;

  const chalLines = [
    `El mayor riesgo para ${resultado.empresaNombre} no es la inversion en metodologia, sino la continuidad del statu quo actual:`,
    `Cada mes de inaccion consolida una perdida real de ${formatearMonedaARS(resultado.costoInaccionMensualARS)} en horas directivas y retrabajos.`,
    `La solucion nunca radica en exigir mas esfuerzo al personal, sino en dotar a la empresa de acuerdos parametricos,`,
    `tableros visuales y un protocolo comercial sistematico que funcione sin la dependencia permanente del fundador.`,
  ];

  let lY = currentY + 44;
  for (let idx = 0; idx < chalLines.length; idx++) {
    const l = escapePdfText(chalLines[idx]);
    const font = idx === 1 ? "/F1 7.5 Tf\n0.882 0.024 0.118 rg" : "/F2 7 Tf\n0.25 0.25 0.25 rg";
    stream += `BT\n${font}\n${marginX + 12} ${lY} Td\n(${l}) Tj\nET\n`;
    lY -= 11;
  }

  // 8. Bloque Hoja de Ruta de Intervención 4D a 90 Días
  currentY -= 18;
  stream += `BT\n/F1 10 Tf\n0.102 0.239 0.518 rg\n${marginX} ${currentY} Td\n(3. PLAN DE INTERVENCION Y DESAHOGO DIRECTIVO (METODOLOGIA 4D)) Tj\nET\n`;

  currentY -= 62;
  stream += `0.98 0.98 0.98 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} 56 re f\n`;
  stream += `0.85 0.85 0.85 RG 0.6 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} 56 re S\n`;

  const planLines = [
    `Fase 1 (Dias 1 a 30) - Diagnostico y Gemba Walk: Relevamiento en piso, mapeo del cuello de botella y 1er Quick Win.`,
    `Fase 2 (Dias 31 a 60) - Diseno de Acuerdos & Protocolos: Matriz de delegacion directiva y regla de seguimiento comercial 48h.`,
    `Fase 3 (Dias 61 a 90) - Despliegue de Tableros y Direccion: Ecosistema unificado de mandos y tablero semanal de rentabilidad.`,
    `Resultado proyectado: Recuperacion de ${formatearMonedaARS(resultado.proyeccionRecuperacion.ahorroMensualProyectadoARS)}/mes y ${resultado.proyeccionRecuperacion.horasDirectivasLiberadasMes} horas de direccion liberadas al mes.`,
  ];

  lY = currentY + 42;
  for (let idx = 0; idx < planLines.length; idx++) {
    const p = escapePdfText(planLines[idx]);
    const font = idx === 3 ? "/F1 7 Tf\n0.10 0.50 0.20 rg" : "/F2 7 Tf\n0.25 0.25 0.25 rg";
    stream += `BT\n${font}\n${marginX + 10} ${lY} Td\n(${p}) Tj\nET\n`;
    lY -= 11;
  }

  // 9. Pie de página institucional y Barra Tricolor Inferior
  stream += `0.85 0.85 0.85 RG 0.5 w ${marginX} 38 m ${(width - marginX).toFixed(2)} 38 l S\n`;
  stream += `BT\n/F1 6.5 Tf\n0.102 0.239 0.518 rg\n${marginX} 26 Td\n(MEJORA CONTINUA  |  CONSULTORIA DE DIRECCION B2B Y PROFESIONALIZACION PYME) Tj\nET\n`;
  stream += `BT\n/F2 6.5 Tf\n0.40 0.40 0.40 rg\n${width - marginX - 170} 26 Td\n(Diagnostico y Hoja de Ruta: mejoraok.com/diagnostico) Tj\nET\n`;

  // Barra Tricolor Inferior
  stream += `0.102 0.239 0.518 rg ${marginX} 12 ${(contentWidth * 0.6).toFixed(2)} 3 re f\n`;
  stream += `0.882 0.024 0.118 rg ${(marginX + contentWidth * 0.6).toFixed(2)} 12 ${(contentWidth * 0.2).toFixed(2)} 3 re f\n`;
  stream += `0.969 0.800 0.075 rg ${(marginX + contentWidth * 0.8).toFixed(2)} 12 ${(contentWidth * 0.2).toFixed(2)} 3 re f\n`;

  // 10. Estructura de Objetos PDF 1.4
  const streamLength = getByteLength(stream);

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`;
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[6] = `<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`;

  let pdfOutput = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let i = 1; i <= 6; i++) {
    offsets[i] = getByteLength(pdfOutput);
    pdfOutput += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = getByteLength(pdfOutput);
  pdfOutput += "xref\n0 7\n0000000000 65535 f \n";

  for (let i = 1; i <= 6; i++) {
    pdfOutput += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdfOutput);
}

/**
 * Dispara la descarga del PDF en el navegador
 */
export function descargarInactionCostPDF(resultado: ResultadoCostoInaccion): void {
  const bytes = generarInactionCostPDF(resultado);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const cleanName = resultado.empresaNombre.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  a.href = url;
  a.download = `Costo-Inaccion-${cleanName}-${resultado.idCalculo}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
