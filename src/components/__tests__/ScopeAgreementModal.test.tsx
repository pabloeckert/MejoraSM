import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScopeAgreementModal } from "../ScopeAgreementModal";
import * as pdfService from "@/services/scopeAgreementPdfGenerator";

describe("ScopeAgreementModal — Modal Interactivo de Acuerdo de Alcance B2B (Sprint S+14)", () => {
  const initialDataMock = {
    nombreDirectivo: "Martín Benítez",
    empresa: "Distribuidora San Martín",
    cargo: "Dueño / CEO",
    canal: "Instagram",
    arquetipoDolor: "fundador_saturado" as const,
    mesesDuracion: 3,
    modalidad: "Hibrida (Trinchera + Remoto)" as const,
  };

  it("renderiza correctamente el modal formal con los datos del prospecto y el diagnóstico", () => {
    render(
      <ScopeAgreementModal
        open={true}
        onOpenChange={vi.fn()}
        initialData={initialDataMock}
      />
    );

    // Título y badges
    expect(
      screen.getByRole("heading", { name: /Acuerdo de Alcance y Propuesta de Acompañamiento B2B/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Distribuidora San Martín/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Martín Benítez/i).length).toBeGreaterThanOrEqual(1);

    // Pestaña inicial: Diagnóstico
    expect(screen.getByText(/Diagnóstico Situacional Compartido/i)).toBeInTheDocument();
    expect(screen.getByText(/Objetivo Central de la Intervención/i)).toBeInTheDocument();

    // Botones de acción principales
    expect(screen.getByRole("button", { name: /Copiar Mensaje WhatsApp/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar Propuesta PDF A4/i })).toBeInTheDocument();
  });

  it("permite navegar fluidamente entre las 4 pestañas operativas", () => {
    render(
      <ScopeAgreementModal
        open={true}
        onOpenChange={vi.fn()}
        initialData={initialDataMock}
      />
    );

    // 1. Pestaña Fases (90 Días)
    const btnFases = screen.getByRole("button", { name: /2. Fases \(90 Días\)/i });
    fireEvent.click(btnFases);
    expect(screen.getByText(/Fase 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Fase 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Fase 3/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Entregables Tangibles:/i).length).toBeGreaterThanOrEqual(1);

    // 2. Pestaña Entregables 4D
    const btnEntregables = screen.getByRole("button", { name: /3. Entregables 4D/i });
    fireEvent.click(btnEntregables);
    expect(screen.getByText(/Dimensión Personal/i)).toBeInTheDocument();
    expect(screen.getByText(/Dimensión Organizacional/i)).toBeInTheDocument();
    expect(screen.getByText(/Dimensión Comercial/i)).toBeInTheDocument();
    expect(screen.getByText(/Dimensión Empresarial/i)).toBeInTheDocument();

    // 3. Pestaña Compromisos & Inversión
    const btnCompromisos = screen.getByRole("button", { name: /4. Compromisos & Inversión/i });
    fireEvent.click(btnCompromisos);
    expect(screen.getByText(/Mejora Continua \(Equipo Consultor\)/i)).toBeInTheDocument();
    expect(screen.getByText(/La Dirección y el Equipo de la Empresa/i)).toBeInTheDocument();
    expect(screen.getByText(/Garantía de Compromiso:/i)).toBeInTheDocument();
  });

  it("permite alternar el arquetipo de dolor recalculando los contenidos", () => {
    render(
      <ScopeAgreementModal
        open={true}
        onOpenChange={vi.fn()}
        initialData={initialDataMock}
      />
    );

    // Hacer clic en "2da Generación"
    const btn2daGen = screen.getByRole("button", { name: /2da Generación/i });
    fireEvent.click(btn2daGen);

    // Ir a pestaña de Fases para verificar el cambio de contenido
    const btnFases = screen.getByRole("button", { name: /2. Fases \(90 Días\)/i });
    fireEvent.click(btnFases);
    expect(screen.getByText(/Mesa de Acuerdos Directivos & Mapa de Roles/i)).toBeInTheDocument();
  });

  it("dispara la descarga de PDF al hacer clic en 'Descargar Propuesta PDF A4'", () => {
    const downloadSpy = vi
      .spyOn(pdfService, "descargarScopeAgreementPDF")
      .mockImplementation(() => {});

    render(
      <ScopeAgreementModal
        open={true}
        onOpenChange={vi.fn()}
        initialData={initialDataMock}
      />
    );

    const btnDownload = screen.getByRole("button", { name: /Descargar Propuesta PDF A4/i });
    fireEvent.click(btnDownload);

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    downloadSpy.mockRestore();
  });
});
