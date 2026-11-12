import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExecutiveDiagnosticModal } from "../ExecutiveDiagnosticModal";
import * as pdfGen from "@/services/executiveDiagnosticPdfGenerator";

describe("ExecutiveDiagnosticModal — Modal Interactivo de Diagnóstico Ejecutivo", () => {
  it("renderiza correctamente el modal con los datos iniciales y el preview suizo", () => {
    render(
      <ExecutiveDiagnosticModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          nombreDirectivo: "Martín Benítez",
          empresa: "Distribuidora San Martín",
          scoreLead: 90,
        }}
      />
    );

    expect(screen.getByRole("heading", { name: /Diagnóstico Ejecutivo One-Pager/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Martín Benítez")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Distribuidora San Martín")).toBeInTheDocument();

    // Secciones del informe
    expect(screen.getByText(/1. El Reencuadre Sistémico/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Matriz de Causa Raíz Sistémica/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Marco Metodológico de las 4 Dimensiones/i)).toBeInTheDocument();
    expect(screen.getByText(/4. Hoja de Ruta Sugerida de Desahogo y Orden/i)).toBeInTheDocument();
  });

  it("permite alternar entre los 4 arquetipos de dolor y actualiza el reencuadre", () => {
    render(
      <ExecutiveDiagnosticModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          nombreDirectivo: "Martín Benítez",
        }}
      />
    );

    // Cambiar a "Segunda Generación"
    const btnSegunda = screen.getByRole("button", { name: "Segunda Generación" });
    fireEvent.click(btnSegunda);

    // Debe mostrar la verdad de segunda generación
    expect(screen.getByText(/La profesionalización no destruye el legado/i)).toBeInTheDocument();

    // Cambiar a "Ventas Intuitivas"
    const btnVentas = screen.getByRole("button", { name: "Ventas Intuitivas" });
    fireEvent.click(btnVentas);

    expect(screen.getByText(/El problema rara vez es el mercado/i)).toBeInTheDocument();
  });

  it("dispara la descarga de PDF al hacer clic en 'Descargar PDF A4'", () => {
    const downloadSpy = vi.spyOn(pdfGen, "descargarDiagnosticoEjecutivoPDF").mockImplementation(() => {});

    render(
      <ExecutiveDiagnosticModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          nombreDirectivo: "Martín Benítez",
        }}
      />
    );

    const btnDescargar = screen.getByRole("button", { name: /Descargar PDF A4/i });
    fireEvent.click(btnDescargar);

    expect(downloadSpy).toHaveBeenCalled();
    downloadSpy.mockRestore();
  });

  it("permite copiar el resumen de WhatsApp al portapapeles", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ExecutiveDiagnosticModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          nombreDirectivo: "Martín Benítez",
        }}
      />
    );

    const btnCopiar = screen.getByRole("button", { name: /Copiar para WhatsApp/i });
    fireEvent.click(btnCopiar);

    expect(writeTextMock).toHaveBeenCalled();
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("*Diagnóstico Preliminar Directivo — Mejora Continua*");
    expect(copiedText).toContain("Martín Benítez");
  });
});
