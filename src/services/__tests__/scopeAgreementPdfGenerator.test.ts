import { describe, it, expect, vi } from "vitest";
import {
  generarScopeAgreementPDF,
  descargarScopeAgreementPDF,
} from "../scopeAgreementPdfGenerator";
import { generarAcuerdoAlcance } from "@/domain/scopeAgreementEngine";

describe("scopeAgreementPdfGenerator — Generador Soberano PDF A4 Multipágina (Sprint S+14)", () => {
  const acuerdoMock = generarAcuerdoAlcance({
    nombreDirectivo: "Martín Benítez",
    empresa: "Distribuidora San Martín",
    cargo: "Dueño / CEO",
    arquetipoDolor: "fundador_saturado",
    mesesDuracion: 3,
    modalidad: "Hibrida (Trinchera + Remoto)",
  });

  it("genera un binario PDF 1.4 válido de 2 páginas con tamaño superior a 4000 bytes", () => {
    const bytes = generarScopeAgreementPDF(acuerdoMock);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(4000);

    // Verificar cabecera %PDF-1.4
    const header = String.fromCharCode(...bytes.slice(0, 8));
    expect(header).toBe("%PDF-1.4");

    // Convertir el PDF a string para verificar palabras clave institucionales
    let pdfString = "";
    for (let i = 0; i < bytes.length; i++) {
      pdfString += String.fromCharCode(bytes[i]);
    }

    // Objetos multipágina
    expect(pdfString).toContain("/Type /Pages /Kids [4 0 R 6 0 R] /Count 2");
    expect(pdfString).toContain("Pagina 1 de 2");
    expect(pdfString).toContain("Pagina 2 de 2");

    // Datos del prospecto y directivo
    expect(pdfString).toContain("Martin Benitez");
    expect(pdfString).toContain("Distribuidora San Martin");
    expect(pdfString).toContain(acuerdoMock.idAcuerdo);

    // Fases y Marco 4D
    expect(pdfString).toContain("Fase 1");
    expect(pdfString).toContain("Fase 2");
    expect(pdfString).toContain("Fase 3");
    expect(pdfString).toContain("DIMENSION PERSONAL");
    expect(pdfString).toContain("DIMENSION ORGANIZACIONAL");
    expect(pdfString).toContain("DIMENSION COMERCIAL");
    expect(pdfString).toContain("DIMENSION EMPRESARIAL");

    // Firma de Pablo Eckert
    expect(pdfString).toContain("Pablo Eckert");
    expect(pdfString).toContain("Director");

    // Fin de archivo PDF
    expect(pdfString).toContain("%%EOF");
  });

  it("dispara la descarga de archivo en el DOM sin arrojar excepciones", () => {
    const clickMock = vi.fn();
    const aMock = {
      href: "",
      download: "",
      click: clickMock,
    } as unknown as HTMLAnchorElement;

    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(aMock);
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    // Mock URL.createObjectURL y revokeObjectURL
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-pdf-url");
    URL.revokeObjectURL = vi.fn();

    expect(() => descargarScopeAgreementPDF(acuerdoMock)).not.toThrow();

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(appendChildSpy).toHaveBeenCalledWith(aMock);
    expect(clickMock).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(aMock);

    // Restaurar spies
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
