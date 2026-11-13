import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExecutiveMemoModal } from "../ExecutiveMemoModal";
import * as pdfService from "@/services/executiveOperationsMemoPdfGenerator";

describe("ExecutiveMemoModal Component (Sprint S+17: Andy Grove & Peter Drucker)", () => {
  it("renderiza correctamente el modal con sus badges institucionales cuando está abierto", () => {
    render(
      <ExecutiveMemoModal
        open={true}
        onOpenChange={() => {}}
        initialData={{ semana: 46, periodo: "10 Nov - 16 Nov 2026" }}
      />
    );

    expect(screen.getByText(/MEMO OPERATIVO EJECUTIVO DE SOCIOS/i)).toBeInTheDocument();
    expect(screen.getByText(/Andy Grove & Peter Drucker/i)).toBeInTheDocument();
    expect(screen.getByText(/Pulso Semanal de Gobierno B2B e Indicadores de Palanca/i)).toBeInTheDocument();
    expect(screen.getByText(/Semana 46/i)).toBeInTheDocument();
  });

  it("permite conmutar entre las 4 pestañas de navegación (Indicadores, Arquetipos, Alertas, Formatos)", () => {
    render(
      <ExecutiveMemoModal
        open={true}
        onOpenChange={() => {}}
        initialData={{ semana: 46 }}
      />
    );

    // Pestaña por defecto: Indicadores Grove
    expect(screen.getByText(/Publicaciones & Ritmo/i)).toBeInTheDocument();
    expect(screen.getByText(/Tráfico con Atribución UTM/i)).toBeInTheDocument();
    expect(screen.getByText(/Pipeline B2B Generado/i)).toBeInTheDocument();

    // Clic en Arquetipos & Cuello
    const tabArquetipos = screen.getByRole("button", { name: /2\. Arquetipos & Cuello/i });
    fireEvent.click(tabArquetipos);
    expect(screen.getByText(/Contribución al Pipeline por Arquetipo Directivo/i)).toBeInTheDocument();
    expect(screen.getByText(/El Paso Limitante de la Operación/i)).toBeInTheDocument();

    // Clic en Alertas & Prioridades
    const tabAlertas = screen.getByRole("button", { name: /3\. Alertas & Prioridades/i });
    fireEvent.click(tabAlertas);
    expect(screen.getByText(/Alertas Operativas y Fricciones del Sistema/i)).toBeInTheDocument();
    expect(screen.getByText(/Prioridades Directivas de los Socios para la Próxima Semana/i)).toBeInTheDocument();

    // Clic en Formatos Listos
    const tabFormatos = screen.getByRole("button", { name: /4\. Formatos Listos/i });
    fireEvent.click(tabFormatos);
    expect(screen.getByText(/Síntesis para WhatsApp de Socios \(Lunes AM\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Memorando Completo en Markdown/i)).toBeInTheDocument();
  });

  it("invoca la descarga de PDF al hacer clic en el botón correspondiente", () => {
    const downloadSpy = vi.spyOn(pdfService, "descargarExecutiveMemoPDF").mockImplementation(() => {});

    render(
      <ExecutiveMemoModal
        open={true}
        onOpenChange={() => {}}
        initialData={{ semana: 46 }}
      />
    );

    const btnDescargar = screen.getByRole("button", { name: /Descargar Memo A4 \(PDF\)/i });
    fireEvent.click(btnDescargar);

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    downloadSpy.mockRestore();
  });

  it("copia la síntesis de WhatsApp al portapapeles", () => {
    const clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardSpy,
      },
    });

    render(
      <ExecutiveMemoModal
        open={true}
        onOpenChange={() => {}}
        initialData={{ semana: 46 }}
      />
    );

    const btnsCopiar = screen.getAllByRole("button", { name: /WhatsApp Socios/i });
    fireEvent.click(btnsCopiar[0]);

    expect(clipboardSpy).toHaveBeenCalledTimes(1);
    expect(clipboardSpy).toHaveBeenCalledWith(expect.stringContaining("MEMO OPERATIVO SEMANAL"));
  });
});
