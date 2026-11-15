/**
 * objectionMatrixPdfGenerator.ts — Generador Soberano PDF A4 de Matriz de Objeciones Directivas B2B
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - David Maister (The Trusted Advisor): Credibilidad, intimidad y baja auto-orientación ante objeciones.
 * - Chris Voss (Never Split the Difference): Tactical Empathy y etiquetado de miedos directivos ocultos.
 * - Josef Müller-Brockmann (Grid Systems): Retícula suiza 80%+ blanco (#FFFFFF), barra tricolor
 *   institucional (#1A3D84 / #E1061E / #F7CC13) y tipografía Helvetica limpia.
 *
 * Formato: PDF 1.4 vectorial nativo A4 (595.28 × 841.89 pt), 0 dependencias externas.
 */

import { type ResultadoResolucionObjecion } from "@/domain/objectionMatrixEngine";

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

function truncateLine(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 3)).trimEnd() + "...";
}

const encoder = new TextEncoder();
function getByteLength(str: string): number {
  return encoder.encode(str).length;
}

/**
 * Genera el buffer Uint8Array de un documento PDF 1.4 tamaño A4 con la Matriz de Objeción Directiva.
 */
export function generarObjectionMatrixPDF(resultado: ResultadoResolucionObjecion): Uint8Array {
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
  stream += `BT\n/F2 7.8 Tf\n0.420 0.447 0.502 rg\n${marginX} 800 Td\n(MATRIZ DE RESOLUCION DE OBJECIONES DIRECTIVAS B2B  |  THE TRUSTED ADVISOR & TACTICAL EMPATHY) Tj\nET\n`;

  const idDoc = escapePdfText(resultado.idResolucion);
  const dim = escapePdfText(resultado.objecion.dimensionPrincipal.toUpperCase());
  stream += `0.95 0.96 0.98 rg 410 796 149 24 re f\n`;
  stream += `0.102 0.239 0.518 RG 0.7 w 410 796 149 24 re S\n`;
  stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n418 810 Td\n(REF: ${idDoc}) Tj\nET\n`;
  stream += `BT\n/F2 7 Tf\n0.35 0.35 0.35 rg\n418 800 Td\n(DIMENSION: ${dim}) Tj\nET\n`;

  // Línea separadora
  stream += `0.82 0.85 0.90 RG 0.5 w ${marginX} 788 m ${(width - marginX).toFixed(2)} 788 l S\n`;

  // 4. Bloque de Datos Contextuales
  const emp = escapePdfText(resultado.empresaNombre);
  const dir = escapePdfText(resultado.nombreDirectivo);
  const titObj = escapePdfText(resultado.objecion.titulo);

  stream += `0.97 0.98 1.0 rg ${marginX} 742 ${contentWidth.toFixed(2)} 38 re f\n`;
  stream += `0.85 0.89 0.96 RG 0.6 w ${marginX} 742 ${contentWidth.toFixed(2)} 38 re S\n`;

  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} 766 Td\n(EMPRESA:) Tj\nET\n`;
  stream += `BT\n/F2 8.5 Tf\n0.15 0.15 0.15 rg\n${marginX + 60} 766 Td\n(${truncateLine(emp, 28)}) Tj\nET\n`;

  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 230} 766 Td\n(INTERLOCUTOR:) Tj\nET\n`;
  stream += `BT\n/F2 8.5 Tf\n0.15 0.15 0.15 rg\n${marginX + 310} 766 Td\n(${truncateLine(dir, 26)}) Tj\nET\n`;

  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} 750 Td\n(OBJECION:) Tj\nET\n`;
  stream += `BT\n/F1 8.5 Tf\n0.882 0.024 0.118 rg\n${marginX + 65} 750 Td\n(${truncateLine(titObj, 65)}) Tj\nET\n`;

  // 5. Bloque 1: Diagnóstico Psicológico y Miedo Oculto (Chris Voss)
  let currentY = 724;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${currentY} Td\n(1. ANALISIS PSICOLOGICO & EMPATIA TACTICA (CHRIS VOSS)) Tj\nET\n`;

  currentY -= 68;
  stream += `0.99 0.96 0.96 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} 62 re f\n`;
  stream += `0.88 0.40 0.40 RG 0.8 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} 62 re S\n`;
  stream += `0.882 0.024 0.118 rg ${marginX} ${currentY} 3.5 62 re f\n`;

  const fraseCliente = escapePdfText(truncateLine('"' + resultado.objecion.fraseTextualCliente + '"', 90));
  const miedoOculto = escapePdfText(truncateLine(resultado.objecion.miedoOcultoDirectivo, 90));
  const etiquetado = escapePdfText(truncateLine('"' + resultado.objecion.etiquetadoEmpaticoVoss + '"', 90));

  stream += `BT\n/F1 7.5 Tf\n0.882 0.024 0.118 rg\n${marginX + 10} ${currentY + 48} Td\n(OBJECION DECLARADA:) Tj\nET\n`;
  stream += `BT\n/F2 7.5 Tf\n0.20 0.20 0.20 rg\n${marginX + 115} ${currentY + 48} Td\n(${fraseCliente}) Tj\nET\n`;

  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} ${currentY + 30} Td\n(MIEDO OCULTO REAL:) Tj\nET\n`;
  stream += `BT\n/F2 7.5 Tf\n0.20 0.20 0.20 rg\n${marginX + 115} ${currentY + 30} Td\n(${miedoOculto}) Tj\nET\n`;

  stream += `BT\n/F1 7.5 Tf\n0.10 0.50 0.20 rg\n${marginX + 10} ${currentY + 12} Td\n(ETIQUETADO EMPATICO:) Tj\nET\n`;
  stream += `BT\n/F2 7 Tf\n0.15 0.45 0.20 rg\n${marginX + 115} ${currentY + 12} Td\n(${etiquetado}) Tj\nET\n`;

  // 6. Bloque 2: Reencuadre Sistémico de David Maister
  currentY -= 20;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${currentY} Td\n(2. REENCUADRE DE AUTORIDAD & CAUSA RAIZ (DAVID MAISTER)) Tj\nET\n`;

  currentY -= 68;
  stream += `0.96 0.98 1.0 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} 62 re f\n`;
  stream += `0.102 0.239 0.518 RG 0.8 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} 62 re S\n`;
  stream += `0.102 0.239 0.518 rg ${marginX} ${currentY} 3.5 62 re f\n`;

  const reencuadre = escapePdfText(truncateLine(resultado.objecion.reencuadreSistemicoMaister, 90));
  const causaRaiz = escapePdfText(truncateLine(resultado.objecion.causaRaizSistema, 90));
  const solucion = escapePdfText(truncateLine(resultado.objecion.solucionParametrica4D, 90));

  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} ${currentY + 48} Td\n(REENCUADRE SISTEMA:) Tj\nET\n`;
  stream += `BT\n/F2 7.5 Tf\n0.20 0.20 0.20 rg\n${marginX + 115} ${currentY + 48} Td\n(${reencuadre}) Tj\nET\n`;

  stream += `BT\n/F1 7.5 Tf\n0.882 0.024 0.118 rg\n${marginX + 10} ${currentY + 30} Td\n(CAUSA RAIZ DE PISO:) Tj\nET\n`;
  stream += `BT\n/F2 7.5 Tf\n0.20 0.20 0.20 rg\n${marginX + 115} ${currentY + 30} Td\n(${causaRaiz}) Tj\nET\n`;

  stream += `BT\n/F1 7.5 Tf\n0.10 0.50 0.20 rg\n${marginX + 10} ${currentY + 12} Td\n(SOLUCION METODO 4D:) Tj\nET\n`;
  stream += `BT\n/F2 7.5 Tf\n0.15 0.45 0.20 rg\n${marginX + 115} ${currentY + 12} Td\n(${solucion}) Tj\nET\n`;

  // 7. Bloque 3: Guión de Conversación en 4 Pasos (90 Segundos)
  currentY -= 20;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${currentY} Td\n(3. GUION DE CONVERSACION DIRECTIVA 1 A 1 (PASO A PASO 90s)) Tj\nET\n`;

  const guionPasos = [
    {
      num: "PASO 1 (VALIDAR):",
      txt: resultado.objecion.guionLlamada90Segundos.aperturaValidacion,
      color: "0.102 0.239 0.518",
    },
    {
      num: "PASO 2 (DESARMAR):",
      txt: resultado.objecion.guionLlamada90Segundos.desarmeTactico,
      color: "0.882 0.024 0.118",
    },
    {
      num: "PASO 3 (PUENTE 4D):",
      txt: resultado.objecion.guionLlamada90Segundos.puenteMetodologico,
      color: "0.102 0.239 0.518",
    },
    {
      num: "PASO 4 (PREGUNTA):",
      txt: resultado.objecion.guionLlamada90Segundos.preguntaSocraticaCierre,
      color: "0.10 0.50 0.20",
    },
  ];

  for (const gp of guionPasos) {
    currentY -= 40;
    stream += `0.985 0.985 0.99 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} 36 re f\n`;
    stream += `0.88 0.89 0.92 RG 0.5 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} 36 re S\n`;
    stream += `${gp.color} rg ${marginX} ${currentY} 3 36 re f\n`;

    const pasoNom = escapePdfText(gp.num);
    const pasoTxt = escapePdfText(truncateLine(gp.txt, 98));

    stream += `BT\n/F1 7.5 Tf\n${gp.color} rg\n${marginX + 8} ${currentY + 22} Td\n(${pasoNom}) Tj\nET\n`;
    stream += `BT\n/F2 7 Tf\n0.25 0.25 0.25 rg\n${marginX + 8} ${currentY + 10} Td\n(${pasoTxt}) Tj\nET\n`;
  }

  // 8. Bloque 4: Pregunta Socrática de Alto Impacto Directivo
  currentY -= 20;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${currentY} Td\n(4. PREGUNTA SOCRATICA DE CIERRE C-LEVEL) Tj\nET\n`;

  currentY -= 48;
  stream += `0.95 0.98 0.96 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} 42 re f\n`;
  stream += `0.10 0.50 0.20 RG 0.8 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} 42 re S\n`;

  const pregSocratica = escapePdfText(truncateLine('"' + resultado.objecion.preguntaSocraticaCLevel + '"', 95));
  stream += `BT\n/F1 8 Tf\n0.10 0.50 0.20 rg\n${marginX + 10} ${currentY + 26} Td\n(PREGUNTA PARA DEVOLVER EL CONTROL AL DECISOR:) Tj\nET\n`;
  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} ${currentY + 12} Td\n(${pregSocratica}) Tj\nET\n`;

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
export function descargarObjectionMatrixPDF(resultado: ResultadoResolucionObjecion): void {
  const bytes = generarObjectionMatrixPDF(resultado);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const cleanId = resultado.objecion.id.toLowerCase().replace(/[^a-z0-9]/g, "-");
  a.href = url;
  a.download = `Argumentario-Objeciones-${cleanId}-${resultado.idResolucion}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
