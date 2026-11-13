import { describe, it, expect, vi } from "vitest";
import { generarExecutiveMemoPDF, descargarExecutiveMemoPDF } from "../executiveOperationsMemoPdfGenerator";
import { calcularExecutiveOperationsMemo } from "@/domain/executiveOperationsMemoEngine";

describe("ExecutiveOperationsMemoPdfGenerator (Sprint S+17: Sovereign A4 PDF Memo)", () => {
  it("genera un buffer binario PDF 1.4 válido con la cabecera y trailer correctos", () => {
    const memo = calcularExecutiveOperationsMemo();
    const pdfBytes = generarExecutiveMemoPDF(memo);

    expect(pdfBytes.constructor.name).toBe("Uint8Array");
    expect(pdfBytes.byteLength).toBeGreaterThan(1500);

    const decoder = new TextDecoder();
    const pdfString = decoder.decode(pdfBytes);

    expect(pdfString.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfString.trim().endsWith("%%EOF")).toBe(true);
    expect(pdfString).toContain("MEJORA CONTINUA");
    expect(pdfString).toContain("MEMORANDO OPERATIVO EJECUTIVO DE SOCIOS");
    expect(pdfString).toContain(memo.semana);
  });

  it("incluye en el stream los indicadores Grove y el paso limitante", () => {
    const memo = calcularExecutiveOperationsMemo();
    const pdfBytes = generarExecutiveMemoPDF(memo);
    const pdfString = new TextDecoder().decode(pdfBytes);

    expect(pdfString).toContain("INDICADORES CLAVE DE GOBIERNO");
    expect(pdfString).toContain("EL PASO LIMITANTE");
    expect(pdfString).toContain("PRIORIDADES DE GOBIERNO");
    expect(pdfString).toContain("Pablo Eckert");
  });

  it("dispara la descarga de archivo creando y haciendo clic en un enlace temporal", () => {
    const memo = calcularExecutiveOperationsMemo();

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

    const createMock = vi.fn().mockReturnValue("blob:mock-url");
    globalThis.URL.createObjectURL = createMock;

    descargarExecutiveMemoPDF(memo);

    expect(createMock).toHaveBeenCalled();
    expect(appendChildMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(removeChildMock).toHaveBeenCalled();
  });
});
