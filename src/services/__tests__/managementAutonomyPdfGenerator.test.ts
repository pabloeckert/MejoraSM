/**
 * managementAutonomyPdfGenerator.test.ts
 * Pruebas unitarias para el generador PDF A4 de la Matriz de Autonomía de Mandos Medios (Sprint S+24)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generarManagementAutonomyPDF,
  descargarManagementAutonomyPDF,
} from "../managementAutonomyPdfGenerator";
import { calcularAutonomiaMandosMedios } from "@/domain/managementAutonomyEngine";

describe("managementAutonomyPdfGenerator", () => {
  const mockResultado = calcularAutonomiaMandosMedios({
    idRol: "jefe_taller_produccion",
    nombreMandoMedio: "Juan Rossi",
    nombreDirectivo: "Carlos Menéndez",
    empresaNombre: "Metalúrgica del Plata",
    montoLimiteARS: 350_000,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("genera un buffer Uint8Array con formato válido PDF 1.4 A4", () => {
    const pdfBytes = generarManagementAutonomyPDF(mockResultado);

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.constructor.name).toBe("Uint8Array");
    expect(pdfBytes.length).toBeGreaterThan(1500);

    const pdfText = new TextDecoder().decode(pdfBytes);
    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText.includes("%%EOF")).toBe(true);
    expect(pdfText.includes("/MediaBox [0 0 595.28 841.89]")).toBe(true);
  });

  it("contiene los textos institucionales, ID de matriz, empresa y umbrales", () => {
    const pdfBytes = generarManagementAutonomyPDF(mockResultado);
    const pdfText = new TextDecoder().decode(pdfBytes);

    expect(pdfText).toContain("MEJORA CONTINUA");
    expect(pdfText).toContain("Metalurgica del Plata");
    expect(pdfText).toContain(mockResultado.idMatriz);
    expect(pdfText).toContain("TASK-RELEVANT MATURITY");
    expect(pdfText).toContain("Carlos Menendez");
  });

  it("dispara la descarga en el DOM sin fallas", () => {
    const createElementSpy = vi.spyOn(document, "createElement");
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    // Mock createObjectURL & revokeObjectURL
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url-pdf");
    URL.revokeObjectURL = vi.fn();

    expect(() => descargarManagementAutonomyPDF(mockResultado)).not.toThrow();

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url-pdf");

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
