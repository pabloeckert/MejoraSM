/**
 * scopeAgreementPdfGenerator.ts — Generador Soberano de Acuerdos de Alcance y Propuestas B2B (PDF A4)
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - David Maister (The Trusted Advisor): Estructura formal de propuesta consultiva
 *   sin artificios; claridad en diagnósticos, compromisos y límites de alcance.
 * - Andy Grove (High Output Management): Fases de intervención con hitos de validación,
 *   entregables medibles y rendición de cuentas compartida.
 * - Josef Müller-Brockmann (Grid Systems) & Principios Suizos de Diseño:
 *   Retícula estricta, 80%+ fondo blanco (#FFFFFF), barra tricolor institucional y tipografía legible.
 *
 * Formato: 2 Páginas A4 Vectoriales (595.28 × 841.89 pt cada una), PDF 1.4 nativo puro (0 dependencias externas).
 */

import { type AcuerdoAlcance } from "@/domain/scopeAgreementEngine";

function escapePdfText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Normaliza a Latin-1 despojando tildes para Helvetica pura
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
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

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Genera el documento PDF A4 de 2 páginas con el Acuerdo de Alcance y Propuesta de Acompañamiento B2B
 */
export function generarScopeAgreementPDF(acuerdo: AcuerdoAlcance): Uint8Array {
  const width = 595.28;
  const height = 841.89;

  // ==========================================
  // PÁGINA 1: CARÁTULA, DIAGNÓSTICO & FASES 90D
  // ==========================================
  let p1Stream = "";

  // 1. Fondo blanco puro #FFFFFF
  p1Stream += `1 1 1 rg 0 0 ${width} ${height} re f\n`;

  // 2. Barra Tricolor Institucional Superior (alto 6 pt)
  // Azul #1A3D84 (60%: 0 a 357.17 pt)
  p1Stream += `0.102 0.239 0.518 rg 0 ${height - 6} 357.17 6 re f\n`;
  // Rojo #E1061E (20%: 357.17 a 476.22 pt)
  p1Stream += `0.882 0.024 0.118 rg 357.17 ${height - 6} 119.05 6 re f\n`;
  // Amarillo #F7CC13 (20%: 476.22 a 595.28 pt)
  p1Stream += `0.969 0.800 0.075 rg 476.22 ${height - 6} 119.06 6 re f\n`;

  // 3. Encabezado Institucional
  p1Stream += `BT\n/F1 14 Tf\n0.102 0.239 0.518 rg\n40 805 Td\n(MEJORA CONTINUA) Tj\nET\n`;
  p1Stream += `BT\n/F2 8 Tf\n0.420 0.447 0.502 rg\n185 805 Td\n(|  PROGRAMA DE PROFESIONALIZACION Y AUTONOMIA B2B) Tj\nET\n`;

  // Ref ID & Badge
  const idDoc = escapePdfText(acuerdo.idAcuerdo);
  p1Stream += `0.94 0.96 0.98 rg 420 798 135 18 re f\n`;
  p1Stream += `0.102 0.239 0.518 RG 0.8 w 420 798 135 18 re S\n`;
  p1Stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n430 804 Td\n(REF: ${idDoc}) Tj\nET\n`;

  // Línea divisoria
  p1Stream += `0.88 0.90 0.92 RG 0.8 w 40 790 m 555 790 l S\n`;

  // 4. Título Principal y Subtítulo
  p1Stream += `BT\n/F1 18 Tf\n0.102 0.239 0.518 rg\n40 765 Td\n(ACUERDO DE ALCANCE Y PROPUESTA DE ACOMPANAMIENTO) Tj\nET\n`;
  p1Stream += `BT\n/F2 9.5 Tf\n0.420 0.447 0.502 rg\n40 750 Td\n(Intervencion Metodologica de Trinchera, Estandarizacion y Transferencia de Autonomia) Tj\nET\n`;

  // 5. Caja de Metadatos del Prospecto (Gris suave con borde sutil)
  p1Stream += `0.973 0.980 0.988 rg 40 685 515 54 re f\n`;
  p1Stream += `0.886 0.910 0.941 RG 1 w 40 685 515 54 re S\n`;

  const dirText = escapePdfText(acuerdo.directivo);
  const empText = escapePdfText(acuerdo.empresa);
  const cargoText = escapePdfText(acuerdo.cargo);
  const fechaText = escapePdfText(acuerdo.fechaEmision);

  p1Stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n50 723 Td\n(DIRECTIVO:) Tj\nET\n`;
  p1Stream += `BT\n/F2 9 Tf\n0.169 0.169 0.169 rg\n108 723 Td\n(${dirText}  [${cargoText}]) Tj\nET\n`;

  p1Stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n330 723 Td\n(EMPRESA:) Tj\nET\n`;
  p1Stream += `BT\n/F2 9 Tf\n0.169 0.169 0.169 rg\n388 723 Td\n(${empText}) Tj\nET\n`;

  p1Stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n50 705 Td\n(FECHA EMISION:) Tj\nET\n`;
  p1Stream += `BT\n/F2 9 Tf\n0.169 0.169 0.169 rg\n135 705 Td\n(${fechaText}) Tj\nET\n`;

  p1Stream += `BT\n/F1 9 Tf\n0.882 0.024 0.118 rg\n330 705 Td\n(VALIDEZ OFERTA:) Tj\nET\n`;
  p1Stream += `BT\n/F2 9 Tf\n0.169 0.169 0.169 rg\n420 705 Td\n(${acuerdo.validezDias} dias corridos) Tj\nET\n`;

  p1Stream += `BT\n/F1 8.5 Tf\n0.420 0.447 0.502 rg\n50 690 Td\n(FOCO DE INTERVENCION:) Tj\nET\n`;
  p1Stream += `BT\n/F2 8.5 Tf\n0.102 0.239 0.518 rg\n165 690 Td\n(${escapePdfText(acuerdo.arquetipoLabel)}) Tj\nET\n`;

  // 6. Sección 1: Diagnóstico Situacional & Objetivo General
  let yP1 = 665;
  p1Stream += `BT\n/F1 11 Tf\n0.102 0.239 0.518 rg\n40 ${yP1} Td\n(1. DIAGNOSTICO SITUACIONAL Y OBJETIVO DE LA INTERVENCION) Tj\nET\n`;
  yP1 -= 14;

  const diagLines = wrapText(escapePdfText(acuerdo.diagnosticoSituacional), 88);
  p1Stream += `BT\n/F2 8.5 Tf\n0.25 0.25 0.25 rg\n`;
  for (let i = 0; i < Math.min(diagLines.length, 3); i++) {
    if (i === 0) p1Stream += `40 ${yP1} Td\n(${diagLines[i]})\n`;
    else p1Stream += `0 -11 Td\n(${diagLines[i]})\n`;
  }
  p1Stream += `ET\n`;
  yP1 -= Math.min(diagLines.length, 3) * 11 + 6;

  // Objetivo General en caja de realce azul suave
  p1Stream += `0.94 0.96 0.98 rg 40 ${yP1 - 24} 515 28 re f\n`;
  p1Stream += `0.102 0.239 0.518 RG 1 w 40 ${yP1 - 24} 515 28 re S\n`;
  p1Stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n50 ${yP1 - 10} Td\n(OBJETIVO CENTRAL:) Tj\nET\n`;
  const objLines = wrapText(escapePdfText(acuerdo.objetivoGeneral), 78);
  p1Stream += `BT\n/F2 8 Tf\n0.169 0.169 0.169 rg\n145 ${yP1 - 10} Td\n(${objLines[0] || ""}) Tj\nET\n`;
  if (objLines[1]) {
    p1Stream += `BT\n/F2 8 Tf\n0.169 0.169 0.169 rg\n50 ${yP1 - 21} Td\n(${objLines[1]}) Tj\nET\n`;
  }
  yP1 -= 40;

  // 7. Sección 2: Plan de Intervención en 3 Fases a 90 Días
  p1Stream += `BT\n/F1 11 Tf\n0.102 0.239 0.518 rg\n40 ${yP1} Td\n(2. PLAN DE ACCION ESTRUCTURADO EN 3 FASES A 90 DIAS) Tj\nET\n`;
  yP1 -= 16;

  for (let f = 0; f < acuerdo.fasesIntervencion.length; f++) {
    const fase = acuerdo.fasesIntervencion[f];
    const boxHeight = 84;

    p1Stream += `0.985 0.988 0.992 rg 40 ${yP1 - boxHeight} 515 ${boxHeight} re f\n`;
    p1Stream += `0.886 0.910 0.941 RG 1 w 40 ${yP1 - boxHeight} 515 ${boxHeight} re S\n`;

    // Barra lateral de fase azul
    p1Stream += `0.102 0.239 0.518 rg 40 ${yP1 - boxHeight} 5 ${boxHeight} re f\n`;

    // Encabezado de la Fase
    const faseNum = escapePdfText(fase.fase);
    const fasePeriodo = escapePdfText(fase.periodo);
    const faseNombre = escapePdfText(fase.nombre);
    p1Stream += `BT\n/F1 9.5 Tf\n0.102 0.239 0.518 rg\n52 ${yP1 - 14} Td\n(${faseNum} · ${fasePeriodo}: ${faseNombre}) Tj\nET\n`;

    // Objetivo de la Fase
    const fObjLines = wrapText(escapePdfText(fase.objetivoPrincipal), 86);
    p1Stream += `BT\n/F2 8 Tf\n0.35 0.35 0.35 rg\n52 ${yP1 - 26} Td\n(${fObjLines[0] || ""}) Tj\nET\n`;

    // Entregables
    let entY = yP1 - 38;
    for (let e = 0; e < Math.min(fase.entregables.length, 3); e++) {
      const entLine = escapePdfText(fase.entregables[e]);
      p1Stream += `0.102 0.239 0.518 rg 53 ${entY + 2} 3 3 re f\n`;
      p1Stream += `BT\n/F2 7.5 Tf\n0.2 0.2 0.2 rg\n60 ${entY} Td\n(${entLine}) Tj\nET\n`;
      entY -= 10;
    }

    // Hito de Cierre
    const hitoText = escapePdfText(fase.hitoValidacion);
    p1Stream += `BT\n/F1 7.5 Tf\n0.882 0.024 0.118 rg\n52 ${yP1 - 76} Td\n(HITO DE CIERRE:) Tj\nET\n`;
    p1Stream += `BT\n/F2 7.5 Tf\n0.169 0.169 0.169 rg\n120 ${yP1 - 76} Td\n(${hitoText}) Tj\nET\n`;

    yP1 -= boxHeight + 8;
  }

  // Footer Página 1
  p1Stream += `0.88 0.90 0.92 RG 0.8 w 40 40 m 555 40 l S\n`;
  p1Stream += `BT\n/F2 8 Tf\n0.5 0.5 0.5 rg\n40 28 Td\n(Mejora Continua  ·  mejoraok.com  ·  Documento Confidencial de Trabajo B2B) Tj\nET\n`;
  p1Stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n500 28 Td\n(Pagina 1 de 2) Tj\nET\n`;

  // Barra tricolor inferior página 1
  p1Stream += `0.102 0.239 0.518 rg 0 0 357.17 4 re f\n`;
  p1Stream += `0.882 0.024 0.118 rg 357.17 0 119.05 4 re f\n`;
  p1Stream += `0.969 0.800 0.075 rg 476.22 0 119.06 4 re f\n`;

  // ==========================================
  // PÁGINA 2: ENTREGABLES 4D, COMPROMISOS & FIRMA
  // ==========================================
  let p2Stream = "";

  // 1. Fondo blanco puro
  p2Stream += `1 1 1 rg 0 0 ${width} ${height} re f\n`;

  // 2. Barra Tricolor Superior (alto 6 pt)
  p2Stream += `0.102 0.239 0.518 rg 0 ${height - 6} 357.17 6 re f\n`;
  p2Stream += `0.882 0.024 0.118 rg 357.17 ${height - 6} 119.05 6 re f\n`;
  p2Stream += `0.969 0.800 0.075 rg 476.22 ${height - 6} 119.06 6 re f\n`;

  // 3. Encabezado Página 2
  p2Stream += `BT\n/F1 11 Tf\n0.102 0.239 0.518 rg\n40 805 Td\n(MEJORA CONTINUA  |  ACUERDO DE ALCANCE) Tj\nET\n`;
  p2Stream += `BT\n/F2 8.5 Tf\n0.420 0.447 0.502 rg\n380 805 Td\n(REF: ${idDoc}  ·  ${empText}) Tj\nET\n`;
  p2Stream += `0.88 0.90 0.92 RG 0.8 w 40 795 m 555 795 l S\n`;

  // 4. Sección 3: Entregables en las 4 Dimensiones del Negocio
  let yP2 = 780;
  p2Stream += `BT\n/F1 11 Tf\n0.102 0.239 0.518 rg\n40 ${yP2} Td\n(3. ENTREGABLES CLAVE POR DIMENSION METODOLOGICA [MARCO 4D]) Tj\nET\n`;
  yP2 -= 16;

  // Render de las 4 cajas en grilla de 2 columnas x 2 filas
  const colWidth = 252;
  const colHeight = 88;
  const colGap = 11;

  for (let d = 0; d < acuerdo.entregablesPorDimension.length; d++) {
    const dim = acuerdo.entregablesPorDimension[d];
    const isColRight = d % 2 === 1;
    const xBox = isColRight ? 40 + colWidth + colGap : 40;
    const yBox = d < 2 ? yP2 - colHeight : yP2 - colHeight * 2 - 8;

    p2Stream += `0.98 0.985 0.99 rg ${xBox} ${yBox} ${colWidth} ${colHeight} re f\n`;
    p2Stream += `0.886 0.910 0.941 RG 1 w ${xBox} ${yBox} ${colWidth} ${colHeight} re S\n`;

    // Barra de acento
    const accentColor =
      dim.dimension === "Personal"
        ? "0.102 0.239 0.518" // Azul
        : dim.dimension === "Organizacional"
        ? "0.882 0.024 0.118" // Rojo
        : dim.dimension === "Comercial"
        ? "0.969 0.800 0.075" // Amarillo
        : "0.20 0.45 0.75";
    p2Stream += `${accentColor} rg ${xBox} ${yBox + colHeight - 4} ${colWidth} 4 re f\n`;

    // Título Dimensión
    p2Stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n${xBox + 10} ${yBox + colHeight - 16} Td\n(DIMENSION ${escapePdfText(dim.dimension).toUpperCase()}) Tj\nET\n`;

    // Titulo de Entregable
    const titLines = wrapText(escapePdfText(dim.titulo), 32);
    p2Stream += `BT\n/F1 8 Tf\n0.169 0.169 0.169 rg\n${xBox + 10} ${yBox + colHeight - 28} Td\n(${titLines[0] || ""}) Tj\nET\n`;
    if (titLines[1]) {
      p2Stream += `BT\n/F1 8 Tf\n0.169 0.169 0.169 rg\n${xBox + 10} ${yBox + colHeight - 38} Td\n(${titLines[1]}) Tj\nET\n`;
    }

    // Detalle
    const detLines = wrapText(escapePdfText(dim.detalle), 38);
    p2Stream += `BT\n/F2 7 Tf\n0.35 0.35 0.35 rg\n${xBox + 10} ${yBox + 26} Td\n(${detLines[0] || ""}) Tj\nET\n`;
    if (detLines[1]) {
      p2Stream += `BT\n/F2 7 Tf\n0.35 0.35 0.35 rg\n${xBox + 10} ${yBox + 17} Td\n(${detLines[1]}) Tj\nET\n`;
    }

    // Impacto
    const impText = escapePdfText(dim.impactoEsperado);
    p2Stream += `BT\n/F1 7 Tf\n0.102 0.239 0.518 rg\n${xBox + 10} ${yBox + 8} Td\n(Meta: ${impText.slice(0, 36)}) Tj\nET\n`;
  }

  yP2 -= colHeight * 2 + 22;

  // 5. Sección 4: Compromisos Mutuos de Trabajo (David Maister)
  p2Stream += `BT\n/F1 11 Tf\n0.102 0.239 0.518 rg\n40 ${yP2} Td\n(4. CONDICIONES DE EXITO Y COMPROMISOS MUTUOS) Tj\nET\n`;
  yP2 -= 14;

  const halfWidth = 252;
  const compHeight = 98;

  for (let c = 0; c < acuerdo.compromisosMutuos.length; c++) {
    const comp = acuerdo.compromisosMutuos[c];
    const xComp = c === 1 ? 40 + halfWidth + colGap : 40;

    p2Stream += `0.973 0.980 0.988 rg ${xComp} ${yP2 - compHeight} ${halfWidth} ${compHeight} re f\n`;
    p2Stream += `0.886 0.910 0.941 RG 1 w ${xComp} ${yP2 - compHeight} ${halfWidth} ${compHeight} re S\n`;

    const actorText = escapePdfText(comp.actor);
    p2Stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n${xComp + 8} ${yP2 - 14} Td\n(${actorText}) Tj\nET\n`;

    let cy = yP2 - 28;
    for (let i = 0; i < Math.min(comp.compromisos.length, 4); i++) {
      const itemLines = wrapText(escapePdfText(comp.compromisos[i]), 38);
      p2Stream += `0.102 0.239 0.518 rg ${xComp + 10} ${cy + 2} 2.5 2.5 re f\n`;
      p2Stream += `BT\n/F2 7 Tf\n0.25 0.25 0.25 rg\n${xComp + 16} ${cy} Td\n(${itemLines[0] || ""}) Tj\nET\n`;
      if (itemLines[1]) {
        p2Stream += `BT\n/F2 7 Tf\n0.25 0.25 0.25 rg\n${xComp + 16} ${cy - 8} Td\n(${itemLines[1]}) Tj\nET\n`;
        cy -= 17;
      } else {
        cy -= 12;
      }
    }
  }

  yP2 -= compHeight + 16;

  // 6. Sección 5: Esquema de Inversión y Próximo Paso
  p2Stream += `BT\n/F1 11 Tf\n0.102 0.239 0.518 rg\n40 ${yP2} Td\n(5. MODALIDAD DE TRABAJO E INVERSION) Tj\nET\n`;
  yP2 -= 14;

  const invHeight = 62;
  p2Stream += `0.94 0.96 0.98 rg 40 ${yP2 - invHeight} 515 ${invHeight} re f\n`;
  p2Stream += `0.102 0.239 0.518 RG 1 w 40 ${yP2 - invHeight} 515 ${invHeight} re S\n`;

  const modText = escapePdfText(acuerdo.esquemaInversion.modalidad);
  const durText = `${acuerdo.esquemaInversion.duracionMeses} Meses de Acompanamiento Continuo`;
  const invText = escapePdfText(acuerdo.esquemaInversion.inversionMensual);

  p2Stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n50 ${yP2 - 14} Td\n(MODALIDAD:) Tj\nET\n`;
  p2Stream += `BT\n/F2 9 Tf\n0.169 0.169 0.169 rg\n120 ${yP2 - 14} Td\n(${modText}) Tj\nET\n`;

  p2Stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n330 ${yP2 - 14} Td\n(DURACION:) Tj\nET\n`;
  p2Stream += `BT\n/F2 9 Tf\n0.169 0.169 0.169 rg\n395 ${yP2 - 14} Td\n(${durText}) Tj\nET\n`;

  p2Stream += `BT\n/F1 9 Tf\n0.102 0.239 0.518 rg\n50 ${yP2 - 30} Td\n(HONORARIOS:) Tj\nET\n`;
  p2Stream += `BT\n/F2 9 Tf\n0.882 0.024 0.118 rg\n130 ${yP2 - 30} Td\n(${invText}) Tj\nET\n`;

  const garText = escapePdfText(acuerdo.esquemaInversion.garantiaCompromiso);
  const garLines = wrapText(`Garantia: ${garText}`, 84);
  p2Stream += `BT\n/F2 7.5 Tf\n0.4 0.4 0.4 rg\n50 ${yP2 - 45} Td\n(${garLines[0] || ""}) Tj\nET\n`;
  if (garLines[1]) {
    p2Stream += `BT\n/F2 7.5 Tf\n0.4 0.4 0.4 rg\n50 ${yP2 - 54} Td\n(${garLines[1]}) Tj\nET\n`;
  }

  yP2 -= invHeight + 20;

  // 7. Bloque de Conformidad y Firmas
  p2Stream += `0.88 0.90 0.92 RG 1 w 70 ${yP2 - 30} m 240 ${yP2 - 30} l S\n`;
  p2Stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n100 ${yP2 - 42} Td\n(Pablo Eckert) Tj\nET\n`;
  p2Stream += `BT\n/F2 7.5 Tf\n0.420 0.447 0.502 rg\n85 ${yP2 - 52} Td\n(Director · Mejora Continua) Tj\nET\n`;

  p2Stream += `0.88 0.90 0.92 RG 1 w 355 ${yP2 - 30} m 525 ${yP2 - 30} l S\n`;
  p2Stream += `BT\n/F1 8.5 Tf\n0.102 0.239 0.518 rg\n395 ${yP2 - 42} Td\n(${dirText}) Tj\nET\n`;
  p2Stream += `BT\n/F2 7.5 Tf\n0.420 0.447 0.502 rg\n385 ${yP2 - 52} Td\n(${cargoText} · ${empText}) Tj\nET\n`;

  // Footer Página 2
  p2Stream += `0.88 0.90 0.92 RG 0.8 w 40 40 m 555 40 l S\n`;
  p2Stream += `BT\n/F2 8 Tf\n0.5 0.5 0.5 rg\n40 28 Td\n(Mejora Continua  ·  mejoraok.com  ·  Validez 15 dias corridos  ·  Sistemas Operativos B2B) Tj\nET\n`;
  p2Stream += `BT\n/F1 8 Tf\n0.102 0.239 0.518 rg\n500 28 Td\n(Pagina 2 de 2) Tj\nET\n`;

  // Barra tricolor inferior página 2
  p2Stream += `0.102 0.239 0.518 rg 0 0 357.17 4 re f\n`;
  p2Stream += `0.882 0.024 0.118 rg 357.17 0 119.05 4 re f\n`;
  p2Stream += `0.969 0.800 0.075 rg 476.22 0 119.06 4 re f\n`;

  // ==========================================
  // ENSAMBLE BINARIO DEL PDF MULTIPÁGINA (PDF 1.4)
  // ==========================================
  // Objetos:
  // 1 0 obj: Font F1 (Helvetica-Bold)
  // 2 0 obj: Font F2 (Helvetica)
  // 3 0 obj: Pages Catalog
  // 4 0 obj: Page 1 Object
  // 5 0 obj: Page 1 Stream
  // 6 0 obj: Page 2 Object
  // 7 0 obj: Page 2 Stream
  // 8 0 obj: Catalog
  const objects: string[] = [];

  // Objeto 1: Font F1 (Helvetica-Bold)
  objects.push(`1 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`);

  // Objeto 2: Font F2 (Helvetica)
  objects.push(`2 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  // Objeto 3: Pages Catalog
  objects.push(`3 0 obj\n<< /Type /Pages /Kids [4 0 R 6 0 R] /Count 2 >>\nendobj\n`);

  // Objeto 4: Page 1 Object
  objects.push(
    `4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 ${width} ${height}] /Contents 5 0 R /Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> >>\nendobj\n`
  );

  // Objeto 5: Page 1 Stream
  const p1Len = p1Stream.length;
  objects.push(`5 0 obj\n<< /Length ${p1Len} >>\nstream\n${p1Stream}endstream\nendobj\n`);

  // Objeto 6: Page 2 Object
  objects.push(
    `6 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 ${width} ${height}] /Contents 7 0 R /Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> >>\nendobj\n`
  );

  // Objeto 7: Page 2 Stream
  const p2Len = p2Stream.length;
  objects.push(`7 0 obj\n<< /Length ${p2Len} >>\nstream\n${p2Stream}endstream\nendobj\n`);

  // Objeto 8: Catalog
  objects.push(`8 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n`);

  // Construcción con cálculo de offsets para la tabla xref
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += objects[i];
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    const off = offsets[i].toString().padStart(10, "0");
    pdf += `${off} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 8 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  // Retornar Uint8Array codificado
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }

  return bytes;
}

/**
 * Dispara la descarga del PDF en el navegador del usuario
 */
export function descargarScopeAgreementPDF(acuerdo: AcuerdoAlcance): void {
  const bytes = generarScopeAgreementPDF(acuerdo);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const sanitizedClient = escapePdfText(acuerdo.directivo)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const sanitizedRef = escapePdfText(acuerdo.idAcuerdo)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const filename = `Propuesta_Mejora_${sanitizedClient}_${sanitizedRef}.pdf`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
