import { describe, it, expect, vi } from "vitest";
import {
  generarMeetingDossierPDF,
  descargarMeetingDossierPDF,
} from "../meetingDossierPdfGenerator";
import { generarMeetingDossier } from "@/domain/meetingDossierEngine";

describe("meetingDossierPdfGenerator — Generador Nativo de Dossiers A4 en PDF", () => {
  const dossier = generarMeetingDossier({
    nombreDirectivo: "Martín Benítez",
    empresa: "Distribuidora San Martín",
    cargo: "CEO",
    canal: "Instagram DM",
    arquetipoDolor: "fundador_saturado",
    scoreLead: 95,
  });

  it("genera un PDF 1.4 binario válido de tamaño A4 con el header oficial", () => {
    const bytes = generarMeetingDossierPDF(dossier);

    expect(bytes.constructor.name).toBe("Uint8Array");
    expect(bytes.byteLength).toBeGreaterThan(2500);

    const strHeader = new TextDecoder().decode(bytes.slice(0, 20));
    expect(strHeader).toContain("%PDF-1.4");

    const strFooter = new TextDecoder().decode(bytes.slice(-50));
    expect(strFooter).toContain("%%EOF");
  });

  it("incluye en el stream vectorial las referencias confidenciales de trinchera", () => {
    const bytes = generarMeetingDossierPDF(dossier);
    const fullText = new TextDecoder("latin1").decode(bytes);

    expect(fullText).toContain("MEJORA CONTINUA");
    expect(fullText).toContain("DOSSIER CONFIDENCIAL");
    expect(fullText).toContain("USO INTERNO PABLO ECKERT");
    expect(fullText).toContain("GUION DE APERTURA CHALLENGER");
    expect(fullText).toContain("LAS 4 PREGUNTAS MAESTRAS DE TRINCHERA");
    expect(fullText).toContain("MATRIZ DE OBJECIONES ANTICIPADAS");
    expect(fullText).toContain("CHECKLIST PRE-VUELO");
    expect(fullText).toContain("Martin Benitez");
  });

  it("descargarMeetingDossierPDF dispara la descarga mediante Blob y enlace temporal sin errores", () => {
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

    expect(() => descargarMeetingDossierPDF(dossier)).not.toThrow();

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(aMock.download).toContain("Dossier_Reunion_Martin_Benitez");
    expect(clickMock).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
