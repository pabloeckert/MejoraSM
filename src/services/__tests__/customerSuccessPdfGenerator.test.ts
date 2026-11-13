import { describe, it, expect, vi } from "vitest";
import { generarCasoExitoPDF, descargarCasoExitoPDF } from "../customerSuccessPdfGenerator";
import { obtenerCasoPorArquetipo } from "@/domain/customerSuccessEngine";

describe("CustomerSuccessPdfGenerator (Sprint S+16: Sovereign A4 PDF Generator)", () => {
  it("genera un buffer binario PDF 1.4 válido con la cabecera y trailer correctos", () => {
    const caso = obtenerCasoPorArquetipo("fundador_saturado");
    const pdfBytes = generarCasoExitoPDF(caso);

    expect(pdfBytes.constructor.name).toBe("Uint8Array");
    expect(pdfBytes.byteLength).toBeGreaterThan(1500);

    const decoder = new TextDecoder();
    const pdfString = decoder.decode(pdfBytes);

    expect(pdfString.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfString.trim().endsWith("%%EOF")).toBe(true);
    expect(pdfString).toContain("MEJORA CONTINUA");
    expect(pdfString).toContain("CASO DE ESTUDIO B2B");
    expect(pdfString).toContain(caso.empresa);
  });

  it("incluye las 4 métricas de impacto y la cita testimonial del directivo", () => {
    const caso = obtenerCasoPorArquetipo("ventas_intuitivas");
    const pdfBytes = generarCasoExitoPDF(caso);
    const pdfString = new TextDecoder().decode(pdfBytes);

    expect(pdfString).toContain("RESULTADOS CUANTITATIVOS");
    expect(pdfString).toContain("LA TRANSFORMACION");
    expect(pdfString).toContain("LECCIONES DE GOBIERNO");
    expect(pdfString).toContain("mejoraok.com");
  });

  it("dispara la descarga de archivo creando y haciendo clic en un enlace temporal", () => {
    const caso = obtenerCasoPorArquetipo("segunda_generacion");

    const clickMock = vi.fn();
    const appendChildMock = vi.fn();
    const removeChildMock = vi.fn();

    vi.spyOn(document.body, "appendChild").mockImplementation(appendChildMock);
    vi.spyOn(document.body, "removeChild").mockImplementation(removeChildMock);
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: clickMock,
    } as unknown as HTMLAnchorElement);

    const revokeMock = vi.fn();
    const createMock = vi.fn().mockReturnValue("blob:mock-url");
    globalThis.URL.createObjectURL = createMock;
    globalThis.URL.revokeObjectURL = revokeMock;

    descargarCasoExitoPDF(caso);

    expect(createMock).toHaveBeenCalled();
    expect(appendChildMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(removeChildMock).toHaveBeenCalled();
  });
});
