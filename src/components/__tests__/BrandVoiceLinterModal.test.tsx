import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrandVoiceLinterModal } from "../BrandVoiceLinterModal";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("BrandVoiceLinterModal (Sprint S+19: Calidez con Verdad Linter)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  it("renderiza el encabezado institucional, los 4 pilares y detecta vicios en el preset por defecto", () => {
    render(<BrandVoiceLinterModal open={true} onOpenChange={() => {}} />);

    expect(
      screen.getByText(/Auditor y Calibrador de Tono de Marca/i)
    ).toBeInTheDocument();
    expect(screen.getByText("BRAND VOICE LINTER & CALIBRATOR")).toBeInTheDocument();
    expect(
      screen.getByText(/RECHAZADO — VIOLA CRITERIO DE MARCA/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/1\. Sistema, No Persona/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\. Calidez con Verdad/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3\. No Vender por Precio/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4\. Dirección 4D/i).length).toBeGreaterThan(0);
  });

  it("eleva el score a 100/100 APROBADO IMPECABLE al pulsar 'Aplicar Calibración Quirúrgica'", () => {
    const onApplyMock = vi.fn();
    render(
      <BrandVoiceLinterModal
        open={true}
        onOpenChange={() => {}}
        onApplyText={onApplyMock}
      />
    );

    const btnCalibrar = screen.getByRole("button", {
      name: /^Aplicar Calibración Quirúrgica$/i,
    });
    fireEvent.click(btnCalibrar);

    expect(onApplyMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/APROBADO IMPECABLE \(ESTÁNDAR MC\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Copy 100% alineado con la Constitución Verbal de Mejora Continua/i
      )
    ).toBeInTheDocument();
  });

  it("cambia a la pestaña 2 mostrando la arquitectura verbal en 3 pasos y la comparativa", () => {
    render(<BrandVoiceLinterModal open={true} onOpenChange={() => {}} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /2\. Calibración Quirúrgica & Estructura 3 Pasos/i,
      })
    );

    expect(
      screen.getByText(/Arquitectura Verbal en 3 Pasos/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1\. Verdad \+ Claridad \(Dolor Real\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2\. Exposición \(Causa Raíz de Sistema\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/3\. Dirección Concreta \(Acción 4D\)/i)
    ).toBeInTheDocument();
  });

  it("copia la versión calibrada al portapapeles al pulsar 'Copiar Versión Calibrada'", async () => {
    render(<BrandVoiceLinterModal open={true} onOpenChange={() => {}} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Copiar Versión Calibrada/i })
    );

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });
  });
});
