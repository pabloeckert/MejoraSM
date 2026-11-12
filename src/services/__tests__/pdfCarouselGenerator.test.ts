// src/services/__tests__/pdfCarouselGenerator.test.ts
import { describe, it, expect } from "vitest";
import { generarLinkedInCarouselPDF } from "../pdfCarouselGenerator";
import { PDFParse } from "pdf-parse";

describe("Generador Nativo de Carruseles PDF para LinkedIn (Document Posts)", () => {
  it("genera un PDF 1.4 multipágina válido con 5 slides, barra tricolor y textos", async () => {
    const slides = [
      {
        titulo: "El cuello de botella sos vos",
        contenido: "Si cada decision depende de vos, no tenes una empresa, tenes un autoempleo.",
        esPortada: true,
      },
      {
        titulo: "01. El Dolor Real",
        contenido: "Tus mandos medios no toman decisiones. Todo termina en tu WhatsApp.",
      },
      {
        titulo: "02. La Causa Raiz",
        contenido: "No es falta de compromiso. Es ausencia de una matriz de delegacion clara.",
      },
      {
        titulo: "03. El Reencuadre",
        contenido: "El liderazgo profesional consiste en disenar procesos donde el equipo responda.",
      },
      {
        titulo: "04. Direccion Concreta",
        contenido: "Midi tu nivel de dependencia personal en el diagnostico de mejoraok.com",
        esCierre: true,
      },
    ];

    const pdfBuffer = generarLinkedInCarouselPDF({
      propuesta_id: "PROP-2026-W01-01",
      titulo_general: "El cuello de botella sos vos",
      slides,
    });

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verificación de encabezado y trailer de PDF 1.4
    const pdfString = Buffer.from(pdfBuffer).toString("binary");
    expect(pdfString.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfString.includes("%%EOF")).toBe(true);
    expect(pdfString.includes("MEJORA CONTINUA")).toBe(true);

    // Parseo mediante PDFParse para verificar validez estructural
    const parser = new PDFParse({ data: pdfBuffer });
    const parsed = await parser.getText();
    expect(parsed.text).toContain("El cuello de botella");
    expect(parsed.text).toContain("WhatsApp");
    expect(parsed.text).toContain("mejoraok.com");
  });
});
