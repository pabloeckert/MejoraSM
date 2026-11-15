import { describe, it, expect, vi } from "vitest";
import {
  generarKickoffBlueprintPDF,
  descargarKickoffBlueprintPDF,
} from "../kickoffBlueprintPdfGenerator";
import { generarKickoffBlueprint } from "@/domain/kickoffBlueprintEngine";

describe("kickoffBlueprintPdfGenerator (Sprint S+20: Sovereign A4 PDF Onboarding)", () => {
  it("genera un buffer binario PDF 1.4 válido con cabecera y trailer", () => {
    const blueprint = generarKickoffBlueprint({
      nombreDirectivo: "Martín Benítez",
      empresa: "Metalúrgica Litoral",
      arquetipoDolor: "fundador_saturado",
    });
    const pdfBytes = generarKickoffBlueprintPDF(blueprint);

    expect(pdfBytes.constructor.name).toBe("Uint8Array");
    expect(pdfBytes.byteLength).toBeGreaterThan(2000);

    const pdfString = new TextDecoder().decode(pdfBytes);
    expect(pdfString.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfString.trim().endsWith("%%EOF")).toBe(true);
    expect(pdfString).toContain("MEJORA CONTINUA");
    expect(pdfString).toContain(blueprint.idBlueprint);
  });

  it("incluye en el stream PDF la agenda 90m, Gemba Walk 4D, hitos 30D y firma directiva", () => {
    const blueprint = generarKickoffBlueprint({
      nombreDirectivo: "Laura Gómez",
      empresa: "Textil Misiones",
      arquetipoDolor: "calidad_entregas",
    });
    const pdfString = new TextDecoder().decode(generarKickoffBlueprintPDF(blueprint));

    expect(pdfString).toContain("AGENDA DE SESION DE KICKOFF DIRECTIVO");
    expect(pdfString).toContain("MATRIZ DE RELEVAMIENTO GEMBA WALK");
    expect(pdfString).toContain("HOJA DE RUTA DE PRIMEROS 30 DIAS");
    expect(pdfString).toContain("CHECKLIST PRE-VUELO CERO BUROCRACIA");
    expect(pdfString).toContain("Pablo Eckert");
  });

  it("dispara la descarga DOM del archivo PDF con nombre Kickoff_30D_*", () => {
    const blueprint = generarKickoffBlueprint({
      nombreDirectivo: "Carlos Pereyra",
      empresa: "Logística Sur",
      arquetipoDolor: "estancamiento_comercial",
    });

    const clickMock = vi.fn();
    const appendChildMock = vi.fn();
    const removeChildMock = vi.fn();
    const anchorMock = {
      href: "",
      download: "",
      click: clickMock,
    };

    vi.spyOn(document.body, "appendChild").mockImplementation(appendChildMock);
    vi.spyOn(document.body, "removeChild").mockImplementation(removeChildMock);
    vi.spyOn(document, "createElement").mockReturnValue(anchorMock as unknown as HTMLAnchorElement);

    const createMock = vi.fn().mockReturnValue("blob:kickoff-mock");
    globalThis.URL.createObjectURL = createMock;

    descargarKickoffBlueprintPDF(blueprint);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(appendChildMock).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(removeChildMock).toHaveBeenCalledTimes(1);
    expect(anchorMock.download).toContain("Kickoff_30D_Logistica_Sur_");
    expect(anchorMock.download.endsWith(".pdf")).toBe(true);
  });
});
