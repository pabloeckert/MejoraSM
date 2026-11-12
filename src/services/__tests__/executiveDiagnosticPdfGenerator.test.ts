import { describe, it, expect, vi } from "vitest";
import {
  generarDiagnosticoEjecutivoPDF,
  descargarDiagnosticoEjecutivoPDF,
} from "../executiveDiagnosticPdfGenerator";
import { generarDiagnosticoEjecutivo } from "@/domain/executiveDiagnosticEngine";

describe("executiveDiagnosticPdfGenerator — Generador Nativo de Diagnósticos A4 en PDF", () => {
  const diag = generarDiagnosticoEjecutivo({
    nombreDirectivo: "Martín Benítez",
    empresa: "Distribuidora San Martín",
    arquetipoDolor: "fundador_saturado",
    scoreLead: 90,
  });

  it("genera un PDF 1.4 binario válido de tamaño A4 con el header oficial", () => {
    const bytes = generarDiagnosticoEjecutivoPDF(diag);

    expect(bytes.constructor.name).toBe("Uint8Array");
    expect(bytes.byteLength).toBeGreaterThan(2500);

    // Decodificar inicio y final del documento PDF
    const strHeader = new TextDecoder().decode(bytes.slice(0, 20));
    expect(strHeader).toContain("%PDF-1.4");

    const strFooter = new TextDecoder().decode(bytes.slice(-50));
    expect(strFooter).toContain("%%EOF");
  });

  it("incluye en el stream vectorial las referencias institucionales y directivas", () => {
    const bytes = generarDiagnosticoEjecutivoPDF(diag);
    const fullText = new TextDecoder("latin1").decode(bytes);

    // Marca y confidencialidad
    expect(fullText).toContain("MEJORA CONTINUA");
    expect(fullText).toContain("DOCUMENTO CONFIDENCIAL DIRECTIVO");

    // Datos del directivo y empresa
    expect(fullText).toContain("Martin Benitez");
    expect(fullText).toContain("Distribuidora San Martin");

    // Reencuadre y 4 Dimensiones
    expect(fullText).toContain("EL REENCUADRE SISTEMICO");
    expect(fullText).toContain("MATRIZ DE CAUSA RAIZ SISTEMICA");
    expect(fullText).toContain("MARCO METODOLOGICO DE LAS 4 DIMENSIONES");
    expect(fullText).toContain("HOJA DE RUTA SUGERIDA DE DESAHOGO Y ORDEN");
    expect(fullText).toContain("mejoraok.com/diagnostico");
  });

  it("descargarDiagnosticoEjecutivoPDF dispara la descarga mediante Blob y enlace temporal sin errores", () => {
    // Mock de DOM
    const clickMock = vi.fn();
    const aMock = {
      href: "",
      download: "",
      click: clickMock,
    } as unknown as HTMLAnchorElement;

    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(aMock);
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => aMock);
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => aMock);
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    expect(() => descargarDiagnosticoEjecutivoPDF(diag)).not.toThrow();

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(aMock.download).toContain("Diagnostico_Ejecutivo_Martin_Benitez");
    expect(clickMock).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
