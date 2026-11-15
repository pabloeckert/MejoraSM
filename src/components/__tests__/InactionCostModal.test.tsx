/**
 * InactionCostModal.test.tsx
 * Pruebas unitarias del componente modal Calculadora de Costo de Inacción Operativa B2B
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InactionCostModal } from "../InactionCostModal";

// Mock de descarga PDF
vi.mock("@/services/inactionCostPdfGenerator", () => ({
  descargarInactionCostPDF: vi.fn(),
}));

// Mock de toast
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("InactionCostModal", () => {
  it("renderiza el modal cuando open es true con los datos iniciales y KPIs", () => {
    render(
      <InactionCostModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          empresaNombre: "Metalúrgica Andina",
          nombreDirectivo: "Roberto Calvo",
          facturacionMensualARS: 50_000_000,
          tamanoEquipo: 20,
        }}
      />
    );

    expect(
      screen.getByText(/Calculadora de Costo de Inacción Operativa & Retorno 4D/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/Drenaje Mensual Inacción/i)).toBeInTheDocument();
    expect(screen.getByText(/Costo Anualizado Statu Quo/i)).toBeInTheDocument();
    expect(screen.getByText(/Ahorro Proyectado 90 Días/i)).toBeInTheDocument();
  });

  it("permite navegar a la pestaña de las 4 Dimensiones y muestra sus contenidos", () => {
    render(
      <InactionCostModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const tabDimensiones = screen.getByRole("button", {
      name: /2\. Las 4 Dimensiones 4D/i,
    });
    fireEvent.click(tabDimensiones);

    expect(
      screen.getByText(/Dimensión Personal \(Sobrecarga Directiva\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Dimensión Organizacional \(Retrabajos & Fricción de Piso\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Dimensión Comercial \(Fuga en Seguimiento de Cotizaciones\)/i)
    ).toBeInTheDocument();
  });

  it("permite navegar a la pestaña de Plan 90 Días y muestra las 3 fases", () => {
    render(
      <InactionCostModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const tabPlan = screen.getByRole("button", {
      name: /3\. Plan 90 Días & Retorno/i,
    });
    fireEvent.click(tabPlan);

    expect(
      screen.getByText(/Días 1 a 30 — Diagnóstico & Gemba Walk en Piso/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Días 31 a 60 — Diseño de Acuerdos Paramétricos/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Días 61 a 90 — Despliegue de Tableros & Dirección Continua/i)
    ).toBeInTheDocument();
  });

  it("permite navegar a la pestaña de WhatsApp & Exportación y contiene el botón de descarga PDF", () => {
    render(
      <InactionCostModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const tabExportar = screen.getByRole("button", {
      name: /4\. WhatsApp & Exportación/i,
    });
    fireEvent.click(tabExportar);

    expect(
      screen.getByText(/Resumen Ejecutivo Formateado para WhatsApp Directivo/i)
    ).toBeInTheDocument();

    const btnDownload = screen.getByRole("button", {
      name: /Descargar Informe Vectorial PDF A4/i,
    });
    expect(btnDownload).toBeInTheDocument();
  });
});
