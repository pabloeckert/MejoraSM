/**
 * inactionCostPdfGenerator.test.ts
 * Pruebas unitarias para el generador soberano PDF A4 de Costo de Inacción Operativa
 */

import { describe, it, expect, vi } from "vitest";
import {
  generarInactionCostPDF,
  descargarInactionCostPDF,
} from "../inactionCostPdfGenerator";
import { calcularCostoInaccion } from "@/domain/inactionCostEngine";

describe("inactionCostPdfGenerator", () => {
  it("genera un buffer PDF 1.4 A4 válido y estructurado", () => {
    const resultado = calcularCostoInaccion({
      facturacionMensualARS: 45_000_000,
      tamanoEquipo: 18,
      arquetipoDolor: "fundador_saturado",
      empresaNombre: "Industrias del Plata",
      nombreDirectivo: "Esteban Morales",
    });

    const pdfBytes = generarInactionCostPDF(resultado);

    expect(pdfBytes.constructor.name).toBe("Uint8Array");
    expect(pdfBytes.byteLength).toBeGreaterThan(1500);

    const pdfText = new TextDecoder().decode(pdfBytes);

    // Cabecera y estándar
    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText).toContain("/MediaBox [0 0 595.28 841.89]");

    // Tipografías suizas integradas
    expect(pdfText).toContain("/BaseFont /Helvetica-Bold");
    expect(pdfText).toContain("/BaseFont /Helvetica");

    // Datos del cálculo
    expect(pdfText).toContain(resultado.idCalculo);
    expect(pdfText).toContain("Industrias del Plata");
    expect(pdfText).toContain("Esteban Morales");
    expect(pdfText).toContain("MEJORA CONTINUA");
    expect(pdfText).toContain("EVALUACION DE COSTO DE INACCION OPERATIVA");

    // Las 4 dimensiones
    expect(pdfText).toContain("Sobrecarga Directiva");
    expect(pdfText).toContain("Retrabajos");
    expect(pdfText).toContain("Seguimiento de Cotizaciones");

    // Estructura de cierre válida
    expect(pdfText).toContain("xref");
    expect(pdfText).toContain("trailer");
    expect(pdfText).toContain("startxref");
    expect(pdfText.trim().endsWith("%%EOF")).toBe(true);
  });

  it("maneja caracteres acentuados y caracteres especiales sin romper el stream", () => {
    const resultado = calcularCostoInaccion({
      facturacionMensualARS: 60_000_000,
      tamanoEquipo: 22,
      empresaNombre: "Compañía Logística & Distribución Ñandú S.A.",
      nombreDirectivo: "Lic. Martín Gómez Peña",
    });

    const pdfBytes = generarInactionCostPDF(resultado);
    const pdfText = new TextDecoder().decode(pdfBytes);

    // Los acentos deben normalizarse a caracteres seguros ASCII 20-7E
    expect(pdfText).toContain("Compania Logistica");
    expect(pdfText).toContain("Martin Gomez Pena");
    expect(pdfText.trim().endsWith("%%EOF")).toBe(true);
  });

  it("dispara la descarga en el navegador con el nombre de archivo adecuado", () => {
    const resultado = calcularCostoInaccion({
      facturacionMensualARS: 30_000_000,
      tamanoEquipo: 10,
      empresaNombre: "BioTech San Juan",
    });

    const clickMock = vi.fn();
    const appendChildMock = vi.fn();
    const removeChildMock = vi.fn();

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "a") {
        return {
          click: clickMock,
          set href(val: string) {},
          set download(val: string) {
            expect(val).toContain("biotech-san-juan");
            expect(val).toContain(".pdf");
          },
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    });

    vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      appendChildMock(node);
      return node;
    });

    vi.spyOn(document.body, "removeChild").mockImplementation((node) => {
      removeChildMock(node);
      return node;
    });

    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    } else {
      vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:mock-url");
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
    }

    descargarInactionCostPDF(resultado);

    expect(clickMock).toHaveBeenCalledTimes(1);
  });
});
