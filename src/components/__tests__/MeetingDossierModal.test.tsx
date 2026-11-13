import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MeetingDossierModal } from "../MeetingDossierModal";
import * as pdfGen from "@/services/meetingDossierPdfGenerator";

describe("MeetingDossierModal — Modal de Preparación de Reuniones 1 a 1", () => {
  it("renderiza correctamente el modal confidencial con los datos del prospecto y el guion de apertura", () => {
    render(
      <MeetingDossierModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          nombreDirectivo: "Martín Benítez",
          empresa: "Distribuidora San Martín",
          cargo: "Dueño / CEO",
          scoreLead: 100,
        }}
      />
    );

    expect(screen.getByRole("heading", { name: /Dossier de Preparación para Reunión 1 a 1/i })).toBeInTheDocument();
    expect(screen.getByText("Martín Benítez")).toBeInTheDocument();
    expect(screen.getAllByText(/Distribuidora San Martín/i).length).toBeGreaterThanOrEqual(1);

    // Guión de apertura
    expect(screen.getByText(/Guión Textual de Apertura/i)).toBeInTheDocument();
    expect(screen.getByText(/Sé que tu tiempo vale oro y que dirigir Distribuidora San Martín/i)).toBeInTheDocument();

    // Tabs
    expect(screen.getByRole("button", { name: /1. Apertura 90s/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2. Preguntas 4D/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /3. Objeciones/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /4. Checklist Previo/i })).toBeInTheDocument();
  });

  it("permite navegar a las preguntas de trinchera y objeciones", () => {
    render(
      <MeetingDossierModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          nombreDirectivo: "Martín Benítez",
        }}
      />
    );

    // Navegar a Preguntas 4D
    const tabPreguntas = screen.getByRole("button", { name: /2. Preguntas 4D/i });
    fireEvent.click(tabPreguntas);

    expect(screen.getByText(/Dimensión Personal/i)).toBeInTheDocument();
    expect(screen.getByText(/Dimensión Organizacional/i)).toBeInTheDocument();

    // Navegar a Objeciones
    const tabObjeciones = screen.getByRole("button", { name: /3. Objeciones/i });
    fireEvent.click(tabObjeciones);

    expect(screen.getByText(/No tengo tiempo ahora para implementar procesos/i)).toBeInTheDocument();
  });

  it("dispara la descarga de PDF al hacer clic en 'Descargar Dossier PDF A4'", () => {
    const downloadSpy = vi.spyOn(pdfGen, "descargarMeetingDossierPDF").mockImplementation(() => {});

    render(
      <MeetingDossierModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          nombreDirectivo: "Martín Benítez",
        }}
      />
    );

    const btnDescargar = screen.getByRole("button", { name: /Descargar Dossier PDF A4/i });
    fireEvent.click(btnDescargar);

    expect(downloadSpy).toHaveBeenCalled();
    downloadSpy.mockRestore();
  });

  it("permite copiar el guion de apertura al portapapeles", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <MeetingDossierModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          nombreDirectivo: "Martín Benítez",
          empresa: "Distribuidora San Martín",
        }}
      />
    );

    const btnCopiar = screen.getByRole("button", { name: /Copiar Guión/i });
    fireEvent.click(btnCopiar);

    expect(writeTextMock).toHaveBeenCalled();
    const text = writeTextMock.mock.calls[0][0];
    expect(text).toContain("Hola Martín Benítez");
    expect(text).toContain("Distribuidora San Martín");
  });
});
