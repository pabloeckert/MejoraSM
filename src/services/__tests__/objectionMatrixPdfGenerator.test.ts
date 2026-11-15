/**
 * objectionMatrixPdfGenerator.test.ts
 * Pruebas unitarias para el generador soberano PDF A4 de Matriz de Objeciones Directivas B2B
 */

import { describe, it, expect, vi } from "vitest";
import {
  generarObjectionMatrixPDF,
  descargarObjectionMatrixPDF,
} from "../objectionMatrixPdfGenerator";
import { resolverObjecionDirectiva } from "@/domain/objectionMatrixEngine";

describe("objectionMatrixPdfGenerator", () => {
  it("genera un buffer PDF 1.4 A4 válido y estructurado", () => {
    const res = resolverObjecionDirectiva({
      idObjecion: "sin_tiempo_sobrecarga",
      nombreDirectivo: "Esteban Morales",
      empresaNombre: "Industrias del Plata",
    });

    const pdfBytes = generarObjectionMatrixPDF(res);

    expect(pdfBytes.constructor.name).toBe("Uint8Array");
    expect(pdfBytes.byteLength).toBeGreaterThan(1500);

    const pdfText = new TextDecoder().decode(pdfBytes);

    // Cabecera y estándar A4
    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText).toContain("/MediaBox [0 0 595.28 841.89]");

    // Tipografía suiza
    expect(pdfText).toContain("/BaseFont /Helvetica-Bold");
    expect(pdfText).toContain("/BaseFont /Helvetica");

    // Contenido institucional
    expect(pdfText).toContain("MEJORA CONTINUA");
    expect(pdfText).toContain("MATRIZ DE RESOLUCION DE OBJECIONES DIRECTIVAS");
    expect(pdfText).toContain(res.idResolucion);
    expect(pdfText).toContain("Industrias del Plata");
    expect(pdfText).toContain("Esteban Morales");

    // Bloques temáticos
    expect(pdfText).toContain("EMPATIA TACTICA");
    expect(pdfText).toContain("REENCUADRE DE AUTORIDAD");
    expect(pdfText).toContain("GUION DE CONVERSACION DIRECTIVA");
    expect(pdfText).toContain("PREGUNTA SOCRATICA DE CIERRE");

    // Cierre PDF
    expect(pdfText).toContain("xref");
    expect(pdfText).toContain("trailer");
    expect(pdfText).toContain("startxref");
    expect(pdfText.trim().endsWith("%%EOF")).toBe(true);
  });

  it("normaliza caracteres acentuados sin romper la codificación PDF", () => {
    const res = resolverObjecionDirectiva({
      idObjecion: "rubro_muy_particular",
      nombreDirectivo: "Lic. Martín Gómez Peña",
      empresaNombre: "Compañía Metalúrgica Ñandú S.A.",
    });

    const pdfBytes = generarObjectionMatrixPDF(res);
    const pdfText = new TextDecoder().decode(pdfBytes);

    expect(pdfText).toContain("Martin Gomez Pena");
    expect(pdfText).toContain("Compania Metalurgica");
    expect(pdfText.trim().endsWith("%%EOF")).toBe(true);
  });

  it("dispara la descarga DOM del archivo PDF en el navegador", () => {
    const res = resolverObjecionDirectiva({
      idObjecion: "software_previo_fracasado",
      nombreDirectivo: "Carlos Benítez",
      empresaNombre: "Logística Andina",
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
            expect(val).toContain("software-previo-fracasado");
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

    descargarObjectionMatrixPDF(res);

    expect(clickMock).toHaveBeenCalledTimes(1);
  });
});
