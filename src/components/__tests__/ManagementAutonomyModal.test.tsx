/**
 * ManagementAutonomyModal.test.tsx
 * Pruebas unitarias del componente modal Matriz de Autonomía de Mandos Medios (Sprint S+24)
 * Basado en Andy Grove (Task-Relevant Maturity) y Michael Gerber (The E-Myth).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManagementAutonomyModal } from "../ManagementAutonomyModal";

// Mock de descarga PDF
vi.mock("@/services/managementAutonomyPdfGenerator", () => ({
  descargarManagementAutonomyPDF: vi.fn(),
}));

// Mock de toast
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("ManagementAutonomyModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it("renderiza el modal cuando open es true con datos iniciales y umbrales", () => {
    render(
      <ManagementAutonomyModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          nombreDirectivo: "Carlos Menéndez",
          empresaNombre: "Metalúrgica del Plata",
          nombreMandoMedio: "Juan Rossi",
        }}
      />
    );

    expect(
      screen.getByText(/Matriz de Autonomía & Delegación de Mandos Medios/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Misión Crítica del Puesto/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Decisiones con Impacto Crítico/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Decisiones Operativas con Registro Diario/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Decisiones Autónomas sin Consulta/i)
    ).toBeInTheDocument();
  });

  it("permite navegar a la pestaña de Nivel TRM de Andy Grove y cambiar de nivel", () => {
    render(
      <ManagementAutonomyModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const tabTRM = screen.getByRole("button", {
      name: /2\. Nivel TRM de Andy Grove/i,
    });
    fireEvent.click(tabTRM);

    expect(
      screen.getByText(/Seleccionar Nivel de Madurez Operativa en la Tarea/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Enfoque de Liderazgo Recomendado/i)
    ).toBeInTheDocument();

    // Cambiar a TRM ALTA
    const btnAlta = screen.getByRole("button", {
      name: /TRM ALTA/i,
    });
    fireEvent.click(btnAlta);

    const matches = screen.getAllByText(/Delegación Plena con Supervisión por Excepción/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("permite navegar a la pestaña de Plan Transición 60 Días y muestra las 3 fases", () => {
    render(
      <ManagementAutonomyModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const tabPlan = screen.getByRole("button", {
      name: /3\. Plan Transición 60 Días/i,
    });
    fireEvent.click(tabPlan);

    expect(screen.getByText(/Fase 1: Mapeo de Umbrales & Gemba Walk/i)).toBeInTheDocument();
    expect(screen.getByText(/Fase 2: Despliegue de Tablero Visual/i)).toBeInTheDocument();
    expect(screen.getByText(/Fase 3: Autonomía Paramétrica Consolidada/i)).toBeInTheDocument();
  });

  it("permite navegar a la pestaña de WhatsApp & Exportación y copiar el resumen", () => {
    render(
      <ManagementAutonomyModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const tabWhatsApp = screen.getByRole("button", {
      name: /4\. WhatsApp & Exportación/i,
    });
    fireEvent.click(tabWhatsApp);

    expect(
      screen.getByText(/Resumen Ejecutivo Formateado para WhatsApp Directivo/i)
    ).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", {
      name: /Copiar WhatsApp/i,
    });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("permite cambiar de rol desde el carrusel de selección", () => {
    render(
      <ManagementAutonomyModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const btnVentas = screen.getByText(/Responsable Comercial \/ Ejecutivo de Cuentas/i);
    fireEvent.click(btnVentas);

    expect(
      screen.getByText(/Decisiones Comerciales Estratégicas/i)
    ).toBeInTheDocument();
  });

  it("ejecuta onApplyTopic al hacer click en 'Debatir en Mesa Ejecutiva'", () => {
    const handleApplyTopic = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ManagementAutonomyModal
        open={true}
        onOpenChange={handleOpenChange}
        onApplyTopic={handleApplyTopic}
        initialData={{
          nombreDirectivo: "Carlos Menéndez",
          empresaNombre: "Metalúrgica del Plata",
          nombreMandoMedio: "Juan Rossi",
        }}
      />
    );

    const btnDebatir = screen.getByRole("button", {
      name: /Debatir en Mesa Ejecutiva/i,
    });
    fireEvent.click(btnDebatir);

    expect(handleApplyTopic).toHaveBeenCalledWith(
      expect.stringContaining("Debate sobre Delegación y Autonomía de Mandos Medios")
    );
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
