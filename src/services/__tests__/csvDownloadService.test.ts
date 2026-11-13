import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  descargarCsvDataset,
  descargarPaqueteMaestroCsv,
} from "../csvDownloadService";
import {
  generarCsvDataset,
  generarPaqueteCsvCompleto,
} from "@/domain/pipelineCsvExporterEngine";

describe("csvDownloadService (Sovereign CSV Blob Download)", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.fn>;
  let removeChildSpy: ReturnType<typeof vi.fn>;
  let clickMock: ReturnType<typeof vi.fn>;
  let createdLinks: HTMLAnchorElement[];

  beforeEach(() => {
    createdLinks = [];
    clickMock = vi.fn();

    createObjectURLSpy = vi.fn(() => "blob:http://localhost/csv-mock-url");
    revokeObjectURLSpy = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: revokeObjectURLSpy,
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName.toLowerCase() === "a") {
        (el as HTMLAnchorElement).click = clickMock;
        createdLinks.push(el as HTMLAnchorElement);
      }
      return el;
    });

    appendChildSpy = vi.fn((node) => node);
    removeChildSpy = vi.fn((node) => node);
    vi.spyOn(document.body, "appendChild").mockImplementation(appendChildSpy);
    vi.spyOn(document.body, "removeChild").mockImplementation(removeChildSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("genera un Blob CSV UTF-8 al descargar un dataset individual", () => {
    const dataset = generarCsvDataset("embudo_roi", {
      fechaReferencia: "2026-11-13",
    });

    descargarCsvDataset(dataset);

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("text/csv;charset=utf-8;");
  });

  it("asigna el nombre de archivo correcto, ejecuta click() y limpia el DOM en descargarCsvDataset", () => {
    const dataset = generarCsvDataset("prospectos_sla", {
      fechaReferencia: "2026-11-13",
    });

    descargarCsvDataset(dataset);

    expect(createdLinks.length).toBe(1);
    expect(createdLinks[0].download).toBe(dataset.nombreArchivo);
    expect(createdLinks[0].href).toContain("blob:http://localhost/csv-mock-url");
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
  });

  it("descarga el paquete maestro consolidado 4 en 1 con el nombre correcto", () => {
    const paquete = generarPaqueteCsvCompleto({
      fechaReferencia: "2026-11-13",
    });

    descargarPaqueteMaestroCsv(paquete);

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blobArg.type).toBe("text/csv;charset=utf-8;");
    expect(createdLinks.length).toBe(1);
    expect(createdLinks[0].download).toBe(paquete.nombreArchivoMaestro);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
  });
});
