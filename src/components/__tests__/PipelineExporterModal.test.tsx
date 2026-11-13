import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PipelineExporterModal } from "../PipelineExporterModal";
import * as csvDownloadService from "@/services/csvDownloadService";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("PipelineExporterModal (Sprint S+18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  it("renderiza título institucional, badges Kleppmann/Drucker y vista por defecto Embudo & ROI B2B", () => {
    render(
      <PipelineExporterModal
        open={true}
        onOpenChange={() => {}}
        exportInput={{ fechaReferencia: "2026-11-13" }}
      />
    );

    expect(
      screen.getByText(/Centro de Exportación y Sincronización con Planillas/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Martin Kleppmann \(DDIA\) & Peter Drucker/i)
    ).toBeInTheDocument();
    expect(screen.getByText("DATA PORTABILITY & BACKUP SOBERANO")).toBeInTheDocument();
    expect(screen.getByText(/Embudo B2B & Retorno de Contenido/i)).toBeInTheDocument();
    expect(screen.getByText("TOTAL PIPELINE ACTIVO")).toBeInTheDocument();
  });

  it("permite alternar entre las 4 pestañas de datasets actualizando columnas y filas", () => {
    render(
      <PipelineExporterModal
        open={true}
        onOpenChange={() => {}}
        exportInput={{ fechaReferencia: "2026-11-13" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /2\. Prospectos & SLA 48h/i }));
    expect(screen.getByText("ID Prospecto")).toBeInTheDocument();
    expect(screen.getByText("Martín Echeverría")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /3\. Grilla 26 Semanas & UTMs/i }));
    expect(screen.getByText("ID Pieza")).toBeInTheDocument();
    expect(screen.getByText("PROP-2026-W01-01")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /4\. Indicadores Grove \(Socios\)/i }));
    expect(screen.getByText("Categoría Grove")).toBeInTheDocument();
    expect(screen.getByText("Publicaciones & Ritmo")).toBeInTheDocument();
  });

  it("copia el contenido TSV al portapapeles al pulsar 'Copiar para Google Sheets (Ctrl+V)'", async () => {
    render(
      <PipelineExporterModal
        open={true}
        onOpenChange={() => {}}
        initialDataset="prospectos_sla"
        exportInput={{ fechaReferencia: "2026-11-13" }}
      />
    );

    const copyBtn = screen.getByRole("button", {
      name: /Copiar para Google Sheets \(Ctrl\+V\)/i,
    });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });
    const copiedText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as string;
    expect(copiedText).toContain("ID Prospecto\tFecha Captura");
    expect(copiedText).toContain("Martín Echeverría");
  });

  it("dispara descarga de CSV individual y del Reporte Maestro 4 en 1", () => {
    const spyIndividual = vi
      .spyOn(csvDownloadService, "descargarCsvDataset")
      .mockImplementation(() => {});
    const spyMaestro = vi
      .spyOn(csvDownloadService, "descargarPaqueteMaestroCsv")
      .mockImplementation(() => {});

    render(
      <PipelineExporterModal
        open={true}
        onOpenChange={() => {}}
        exportInput={{ fechaReferencia: "2026-11-13" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Descargar CSV Individual/i }));
    expect(spyIndividual).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: /Descargar Reporte Maestro \(4 en 1\)/i })
    );
    expect(spyMaestro).toHaveBeenCalledTimes(1);

    spyIndividual.mockRestore();
    spyMaestro.mockRestore();
  });
});
