// src/services/pdfCarouselGenerator.ts
// GENERADOR NATIVO SOBERANO DE CARRUSELES PDF PARA LINKEDIN (1080x1350 - 4:5)
// Sin dependencias pesadas externas. Genera un documento PDF 1.4 multipágina
// con estética de marca: Fondo 80% blanco, tipografía suiza, barra tricolor institucional.

export interface SlideData {
  titulo: string;
  contenido: string;
  etiqueta?: string;
  esPortada?: boolean;
  esCierre?: boolean;
}

export interface LinkedInCarouselOptions {
  propuesta_id: string;
  titulo_general: string;
  autor?: string;
  slides: SlideData[];
}

/**
 * Escapa caracteres especiales de cadenas en PDF: (, ), \
 */
function escapePdfText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Normalizar acentos a ASCII limpio para fuentes estándar Helvetica
}

/**
 * Divide un texto largo en líneas que se ajusten a un número aproximado de caracteres.
 */
function wrapText(text: string, maxCharsPerLine: number = 42): string[] {
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
 * Genera el Buffer / Uint8Array de un PDF 1.4 multipágina optimizado para LinkedIn Document Posts.
 */
export function generarLinkedInCarouselPDF(options: LinkedInCarouselOptions): Uint8Array {
  const width = 1080;
  const height = 1350;
  const totalSlides = options.slides.length;

  const objects: string[] = [];
  let objCount = 0;

  function newObj(content: string): number {
    objCount++;
    objects.push(`${objCount} 0 obj\n${content}\nendobj`);
    return objCount;
  }

  // Obj 1: Catalog (se creará al final para enlazar con Pages)
  // Objeto de fuentes compartidas
  const fontHelveticaBold = newObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
  const fontHelvetica = newObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);

  const pageObjectIds: number[] = [];

  for (let i = 0; i < totalSlides; i++) {
    const slide = options.slides[i];
    const pageNum = i + 1;
    const pageNumStr = `${pageNum < 10 ? "0" + pageNum : pageNum} / ${totalSlides < 10 ? "0" + totalSlides : totalSlides}`;

    let stream = "";

    // 1. Fondo blanco puro #FFFFFF
    stream += `1 1 1 rg 0 0 ${width} ${height} re f\n`;

    // 2. Barra Tricolor Institucional Inferior (alto 24 pt)
    // Azul #1A3D84 (60% ancho: 0 a 648)
    stream += `0.102 0.239 0.518 rg 0 0 648 24 re f\n`;
    // Rojo #E1061E (20% ancho: 648 a 864)
    stream += `0.882 0.024 0.118 rg 648 0 216 24 re f\n`;
    // Amarillo #F7CC13 (20% ancho: 864 a 1080)
    stream += `0.969 0.800 0.075 rg 864 0 216 24 re f\n`;

    // 3. Encabezado de Marca (Top Bar)
    stream += `BT\n/F2 20 Tf\n0.420 0.447 0.502 rg\n80 1260 Td\n(MEJORA CONTINUA  |  SISTEMAS OPERATIVOS B2B) Tj\nET\n`;

    // Contador de diapositiva (Top Right)
    stream += `BT\n/F1 20 Tf\n0.102 0.239 0.518 rg\n950 1260 Td\n(${pageNumStr}) Tj\nET\n`;

    // Línea divisoria sutil superior
    stream += `0.88 0.90 0.92 RG 1 w 80 1235 m 1000 1235 l S\n`;

    // 4. Etiqueta / Pill de Tema
    const badgeText = escapePdfText(slide.etiqueta || (slide.esPortada ? "CRITERIO DIRECTIVO" : slide.esCierre ? "DIRECCION OPERATIVA" : "METODO 4D"));
    stream += `0.94 0.96 0.98 rg 80 1140 320 46 re f\n`;
    stream += `0.102 0.239 0.518 RG 1.5 w 80 1140 320 46 re S\n`;
    stream += `BT\n/F1 16 Tf\n0.102 0.239 0.518 rg\n100 1157 Td\n(${badgeText}) Tj\nET\n`;

    // 5. Título Principal de la Diapositiva
    const titleLines = wrapText(escapePdfText(slide.titulo), slide.esPortada ? 26 : 32);
    const titleFontSize = slide.esPortada ? 52 : 44;
    const titleLineHeight = slide.esPortada ? 64 : 54;
    let yPos = 1060;

    stream += `BT\n/F1 ${titleFontSize} Tf\n0.102 0.239 0.518 rg\n`;
    for (let l = 0; l < titleLines.length; l++) {
      if (l === 0) {
        stream += `80 ${yPos} Td\n(${titleLines[l]}) Tj\n`;
      } else {
        stream += `0 -${titleLineHeight} Td\n(${titleLines[l]}) Tj\n`;
      }
    }
    stream += `ET\n`;

    yPos -= titleLines.length * titleLineHeight + 40;

    // 6. Contenido del Cuerpo (Desarrollo Suizo con alto espaciado)
    const bodyLines = wrapText(escapePdfText(slide.contenido), 44);
    const bodyFontSize = 30;
    const bodyLineHeight = 44;

    stream += `BT\n/F2 ${bodyFontSize} Tf\n0.168 0.168 0.168 rg\n`;
    for (let l = 0; l < bodyLines.length; l++) {
      if (l === 0) {
        stream += `80 ${yPos} Td\n(${bodyLines[l]}) Tj\n`;
      } else {
        stream += `0 -${bodyLineHeight} Td\n(${bodyLines[l]}) Tj\n`;
      }
    }
    stream += `ET\n`;

    // 7. Pie de Diapositiva (Swipe indicator o CTA)
    if (slide.esPortada) {
      stream += `BT\n/F1 22 Tf\n0.882 0.024 0.118 rg\n80 100 Td\n(Desliza para ver el desglose operativo ->) Tj\nET\n`;
    } else if (slide.esCierre) {
      stream += `BT\n/F1 24 Tf\n0.102 0.239 0.518 rg\n80 120 Td\n(Diagnostico interactivo en mejoraok.com) Tj\nET\n`;
      stream += `BT\n/F2 18 Tf\n0.42 0.44 0.50 rg\n80 85 Td\n(Evalua tu empresa en las 4 Dimensiones en 60 segundos) Tj\nET\n`;
    } else {
      stream += `BT\n/F2 18 Tf\n0.55 0.58 0.62 rg\n80 90 Td\n(Mejora Continua  -  Calidez con Verdad) Tj\nET\n`;
    }

    const streamLength = getByteLength(stream);
    const contentObjId = newObj(`<< /Length ${streamLength} >>\nstream\n${stream}endstream`);

    // Objeto Página
    const pageObjId = newObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 ${fontHelveticaBold} 0 R /F2 ${fontHelvetica} 0 R >> >> >>`
    );
    pageObjectIds.push(pageObjId);
  }

  // Obj 2: Pages Catalog
  // Se inserta en la posición adecuada
  const pagesObjContent = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
  // Creamos el Pages Catalog
  const pagesObjId = newObj(pagesObjContent);

  // Root Catalog
  const catalogObjId = newObj(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);

  // Ensamblar PDF final con tabla xref y trailer
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(getByteLength(pdf));
    pdf += obj + "\n";
  }

  const xrefOffset = getByteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offsetStr = String(offsets[i]).padStart(10, "0");
    pdf += `${offsetStr} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObjId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return encoder.encode(pdf);
}
