/**
 * managementAutonomyPdfGenerator.ts — Generador Soberano PDF A4 de Matriz de Autonomía de Mandos Medios
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - Andy Grove (High Output Management): Task-Relevant Maturity (TRM) y delegación paramétrica.
 * - Peter Drucker (The Effective Executive): Concentración en la contribución de alto impacto.
 * - Josef Müller-Brockmann (Grid Systems): Retícula suiza 80%+ blanco (#FFFFFF), barra tricolor
 *   institucional (#1A3D84 / #E1061E / #F7CC13) y tipografía Helvetica sobria.
 *
 * Formato: PDF 1.4 vectorial nativo A4 (595.28 × 841.89 pt), 0 dependencias externas.
 */

import { type ResultadoAutonomiaMandos } from "@/domain/managementAutonomyEngine";

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
 * Genera el buffer Uint8Array de un documento PDF 1.4 tamaño A4 con la Matriz de Autonomía de Mandos Medios.
 */
export function generarManagementAutonomyPDF(resultado: ResultadoAutonomiaMandos): Uint8Array {
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
  stream += `BT\n/F2 7.8 Tf\n0.420 0.447 0.502 rg\n${marginX} 800 Td\n(MATRIZ DE AUTONOMIA & DELEGACION PARA MANDOS MEDIOS  |  TASK-RELEVANT MATURITY - ANDY GROVE) Tj\nET\n`;

  const idDoc = escapePdfText(resultado.idMatriz);
  const dim = escapePdfText(resultado.rol.dimensionPrincipal.toUpperCase());
  stream += `0.95 0.96 0.98 rg 400 796 159 24 re f\n`;
  stream += `0.102 0.239 0.518 RG 0.7 w 400 796 159 24 re S\n`;
  stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n408 810 Td\n(REF: ${idDoc}) Tj\nET\n`;
  stream += `BT\n/F2 7 Tf\n0.35 0.35 0.35 rg\n408 800 Td\n(DIMENSION: ${dim}) Tj\nET\n`;

  // Línea separadora
  stream += `0.82 0.85 0.90 RG 0.5 w ${marginX} 788 m ${(width - marginX).toFixed(2)} 788 l S\n`;

  // 4. Bloque de Datos Contextuales
  const emp = escapePdfText(resultado.empresaNombre);
  const dir = escapePdfText(resultado.nombreDirectivo);
  const man = escapePdfText(resultado.nombreMandoMedio);
  const rolNom = escapePdfText(resultado.rol.nombreRol);

  stream += `0.97 0.98 1.0 rg ${marginX} 738 ${contentWidth.toFixed(2)} 42 re f\n`;
  stream += `0.85 0.89 0.96 RG 0.6 w ${marginX} 738 ${contentWidth.toFixed(2)} 42 re S\n`;

  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} 766 Td\n(EMPRESA:) Tj\nET\n`;
  stream += `BT\n/F2 8.5 Tf\n0.15 0.15 0.15 rg\n${marginX + 60} 766 Td\n(${truncateLine(emp, 28)}) Tj\nET\n`;

  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 240} 766 Td\n(DIRECTIVO SPONSOR:) Tj\nET\n`;
  stream += `BT\n/F2 8.5 Tf\n0.15 0.15 0.15 rg\n${marginX + 345} 766 Td\n(${truncateLine(dir, 24)}) Tj\nET\n`;

  stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} 748 Td\n(MANDO MEDIO:) Tj\nET\n`;
  stream += `BT\n/F1 8.5 Tf\n0.15 0.15 0.15 rg\n${marginX + 80} 748 Td\n(${truncateLine(man, 25)} - ${truncateLine(rolNom, 35)}) Tj\nET\n`;

  // 5. Bloque 1: Estilo de Supervisión de Andy Grove (TRM)
  let currentY = 720;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${currentY} Td\n(1. ESTILO DE SUPERVISION Y MADUREZ OPERATIVA (TASK-RELEVANT MATURITY)) Tj\nET\n`;

  currentY -= 54;
  stream += `0.98 0.99 1.0 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} 48 re f\n`;
  stream += `0.80 0.85 0.95 RG 0.8 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} 48 re S\n`;
  stream += `0.102 0.239 0.518 rg ${marginX} ${currentY} 3.5 48 re f\n`;

  const trmLabel = escapePdfText(resultado.nivelTRM.toUpperCase() + " - " + resultado.estiloSupervisionGrove.enfoque);
  const cadencia = escapePdfText(resultado.estiloSupervisionGrove.frecuenciaContacto);
  const rolLider = escapePdfText(truncateLine(resultado.estiloSupervisionGrove.rolDelLider, 85));

  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} ${currentY + 34} Td\n(NIVEL TRM GROVE:) Tj\nET\n`;
  stream += `BT\n/F1 7.5 Tf\n0.15 0.15 0.15 rg\n${marginX + 105} ${currentY + 34} Td\n(${trmLabel}) Tj\nET\n`;

  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} ${currentY + 20} Td\n(CADENCIA SUPERVISION:) Tj\nET\n`;
  stream += `BT\n/F2 7.5 Tf\n0.25 0.25 0.25 rg\n${marginX + 125} ${currentY + 20} Td\n(${cadencia}) Tj\nET\n`;

  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} ${currentY + 6} Td\n(ROL DEL LIDER:) Tj\nET\n`;
  stream += `BT\n/F2 7 Tf\n0.25 0.25 0.25 rg\n${marginX + 85} ${currentY + 6} Td\n(${rolLider}) Tj\nET\n`;

  // 6. Bloque 2: Matriz de Umbrales Paramétricos de Decisión (3 Niveles)
  currentY -= 20;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${currentY} Td\n(2. MATRIZ DE UMBRALES PARAMETRICOS DE DECISION (3 NIVELES)) Tj\nET\n`;

  currentY -= 124;
  stream += `0.99 0.99 0.99 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} 118 re f\n`;
  stream += `0.85 0.85 0.85 RG 0.8 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} 118 re S\n`;

  // Filas de los 3 niveles
  resultado.umbrales.forEach((u, idx) => {
    const rowY = currentY + 76 - idx * 38;
    const colorBg = u.nivel === 1 ? "0.99 0.95 0.95" : u.nivel === 2 ? "0.99 0.98 0.93" : "0.94 0.98 0.95";
    const colorBar = u.nivel === 1 ? "0.882 0.024 0.118" : u.nivel === 2 ? "0.90 0.65 0.05" : "0.10 0.55 0.25";

    stream += `${colorBg} rg ${marginX + 5} ${rowY} ${(contentWidth - 10).toFixed(2)} 34 re f\n`;
    stream += `${colorBar} rg ${marginX + 5} ${rowY} 3 34 re f\n`;

    const tit = escapePdfText(u.etiqueta);
    const reg = escapePdfText(truncateLine(u.reglaParametrica, 85));
    const ej = escapePdfText(truncateLine("Ejemplo: " + u.ejemploConcreto, 85));

    stream += `BT\n/F1 7.5 Tf\n${colorBar} rg\n${marginX + 14} ${rowY + 22} Td\n(${tit}) Tj\nET\n`;
    stream += `BT\n/F2 7 Tf\n0.20 0.20 0.20 rg\n${marginX + 14} ${rowY + 11} Td\n(${reg}) Tj\nET\n`;
    stream += `BT\n/F2 6.5 Tf\n0.45 0.45 0.45 rg\n${marginX + 14} ${rowY + 2} Td\n(${ej}) Tj\nET\n`;
  });

  // 7. Bloque 3: Plan de Transición de 60 Días
  currentY -= 20;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${currentY} Td\n(3. PLAN DE TRANSICION Y DESPLIEGUE A 60 DIAS (MICHAEL GERBER & ANDY GROVE)) Tj\nET\n`;

  currentY -= 124;
  stream += `0.97 0.98 1.0 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} 118 re f\n`;
  stream += `0.85 0.89 0.96 RG 0.8 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} 118 re S\n`;

  const fases = [
    resultado.planTransicion60Dias.fase1Dias1a15,
    resultado.planTransicion60Dias.fase2Dias16a30,
    resultado.planTransicion60Dias.fase3Dias31a60,
  ];

  fases.forEach((fase, fIdx) => {
    const fY = currentY + 80 - fIdx * 38;
    const fNom = escapePdfText(fase.nombre);
    const fObj = escapePdfText(truncateLine("Meta: " + fase.objetivo, 88));
    const fEnt = escapePdfText(truncateLine("Hito: " + fase.entregables[0], 88));

    stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} ${fY + 24} Td\n(${fNom}) Tj\nET\n`;
    stream += `BT\n/F2 7 Tf\n0.25 0.25 0.25 rg\n${marginX + 10} ${fY + 13} Td\n(${fObj}) Tj\nET\n`;
    stream += `BT\n/F2 6.5 Tf\n0.10 0.50 0.20 rg\n${marginX + 10} ${fY + 3} Td\n(${fEnt}) Tj\nET\n`;
  });

  // 8. Bloque 4: Gobernanza y Firmas de Compromiso Mutuo
  currentY -= 18;
  stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n${marginX} ${currentY} Td\n(4. ACUERDO DE COMPROMISO Y GOBERNANZA OPERATIVA) Tj\nET\n`;

  currentY -= 68;
  stream += `0.99 0.99 0.99 rg ${marginX} ${currentY} ${contentWidth.toFixed(2)} 62 re f\n`;
  stream += `0.85 0.85 0.85 RG 0.8 w ${marginX} ${currentY} ${contentWidth.toFixed(2)} 62 re S\n`;

  const indGrove = escapePdfText(truncateLine(resultado.rol.indicadorGrovePrincipal, 85));
  stream += `BT\n/F1 7.5 Tf\n0.102 0.239 0.518 rg\n${marginX + 10} ${currentY + 48} Td\n(INDICADOR DE GOBERNANZA:) Tj\nET\n`;
  stream += `BT\n/F2 7.5 Tf\n0.15 0.15 0.15 rg\n${marginX + 130} ${currentY + 48} Td\n(${indGrove}) Tj\nET\n`;

  // Espacio para dos firmas
  const col1X = marginX + 40;
  const col2X = marginX + 310;
  const lineFirmasY = currentY + 18;

  stream += `0.60 0.60 0.60 RG 0.5 w ${col1X} ${lineFirmasY} m ${(col1X + 160).toFixed(2)} ${lineFirmasY} l S\n`;
  stream += `0.60 0.60 0.60 RG 0.5 w ${col2X} ${lineFirmasY} m ${(col2X + 160).toFixed(2)} ${lineFirmasY} l S\n`;

  stream += `BT\n/F1 7 Tf\n0.30 0.30 0.30 rg\n${col1X + 25} ${lineFirmasY - 9} Td\n(${truncateLine(dir, 24)} - Director) Tj\nET\n`;
  stream += `BT\n/F1 7 Tf\n0.30 0.30 0.30 rg\n${col2X + 25} ${lineFirmasY - 9} Td\n(${truncateLine(man, 24)} - Responsable) Tj\nET\n`;

  // 9. Pie de Página Suizo
  stream += `0.88 0.90 0.94 RG 0.5 w ${marginX} 32 m ${(width - marginX).toFixed(2)} 32 l S\n`;
  stream += `BT\n/F2 6.8 Tf\n0.50 0.50 0.50 rg\n${marginX} 22 Td\n(Mejora Continua  |  Consultoria de Direccion B2B  |  mejoraok.com/diagnostico) Tj\nET\n`;
  stream += `BT\n/F2 6.8 Tf\n0.50 0.50 0.50 rg\n440 22 Td\n(ESTANDAR HIGH OUTPUT MANAGEMENT) Tj\nET\n`;

  // Barra Tricolor Inferior (3pt)
  stream += `0.102 0.239 0.518 rg ${marginX} 10 ${(contentWidth * 0.6).toFixed(2)} 3 re f\n`;
  stream += `0.882 0.024 0.118 rg ${(marginX + contentWidth * 0.6).toFixed(2)} 10 ${(contentWidth * 0.2).toFixed(2)} 3 re f\n`;
  stream += `0.969 0.800 0.075 rg ${(marginX + contentWidth * 0.8).toFixed(2)} 10 ${(contentWidth * 0.2).toFixed(2)} 3 re f\n`;

  // Construcción del documento PDF 1.4
  const streamBytes = getByteLength(stream);

  let pdf = `%PDF-1.4\n`;
  const offsets: number[] = [];

  // Objeto 1: Catalog
  offsets.push(getByteLength(pdf));
  pdf += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

  // Objeto 2: Pages
  offsets.push(getByteLength(pdf));
  pdf += `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;

  // Objeto 3: Page
  offsets.push(getByteLength(pdf));
  pdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`;

  // Objeto 4: Stream de Contenido
  offsets.push(getByteLength(pdf));
  pdf += `4 0 obj\n<< /Length ${streamBytes} >>\nstream\n${stream}endstream\nendobj\n`;

  // Objeto 5: Fuente Helvetica-Bold
  offsets.push(getByteLength(pdf));
  pdf += `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

  // Objeto 6: Fuente Helvetica
  offsets.push(getByteLength(pdf));
  pdf += `6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  // Tabla xref
  const xrefOffset = getByteLength(pdf);
  pdf += `xref\n0 7\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  // Trailer
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdf);
}

/**
 * Dispara la descarga del PDF A4 en el navegador del cliente.
 */
export function descargarManagementAutonomyPDF(resultado: ResultadoAutonomiaMandos): void {
  const bytes = generarManagementAutonomyPDF(resultado);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const nombreLimpio = resultado.empresaNombre.replace(/[^a-zA-Z0-9]/g, "_");
  const rolLimpio = resultado.rol.id.replace(/[^a-zA-Z0-9]/g, "_");
  a.download = `Matriz-Autonomia-${rolLimpio}-${nombreLimpio}-${resultado.idMatriz}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
