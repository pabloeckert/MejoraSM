// src/components/__tests__/CopyExperimentSimulator.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CopyExperimentSimulator } from "../CopyExperimentSimulator";

describe("CopyExperimentSimulator Component", () => {
  it("renderiza el título institucional y el badge de Marco Jonah Berger (STEPPS)", () => {
    const handleApply = vi.fn();
    render(
      <CopyExperimentSimulator
        topic="Liderazgo y mandos medios"
        onApplyVariant={handleApply}
      />
    );

    expect(screen.getByText("Simulador A/B de Copy y Hooks")).toBeInTheDocument();
    expect(screen.getByText(/Marco Jonah Berger \(STEPPS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Dictamen Predictivo del Simulador/i)).toBeInTheDocument();
  });

  it("muestra ambas variantes (A: Provocador y B: Empático) con sus ganchos y métricas", () => {
    const handleApply = vi.fn();
    render(
      <CopyExperimentSimulator
        topic="Saturación del dueño y falta de procesos"
        activeVariantId="B"
        onApplyVariant={handleApply}
      />
    );

    expect(screen.getByText(/Variante A: Provocador/i)).toBeInTheDocument();
    expect(screen.getByText(/Quiebre de Creencias/i)).toBeInTheDocument();

    expect(screen.getByText(/Variante B: Empático/i)).toBeInTheDocument();
    expect(screen.getByText(/Calidez con Verdad/i)).toBeInTheDocument();

    expect(screen.getAllByText(/Scroll-Stop/i).length).toBe(2);
    expect(screen.getAllByText(/Retención/i).length).toBe(2);
  });

  it("permite desplegar el desglose detallado de las 6 dimensiones STEPPS", () => {
    const handleApply = vi.fn();
    render(
      <CopyExperimentSimulator
        topic="Desconexión de áreas"
        onApplyVariant={handleApply}
      />
    );

    const toggleBtn = screen.getByText(/Ver auditoría comparativa de 6 dimensiones STEPPS/i);
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);

    expect(screen.getByText("1. Moneda Social")).toBeInTheDocument();
    expect(screen.getByText("2. Disparadores")).toBeInTheDocument();
    expect(screen.getByText("3. Emoción Desculpabilizadora")).toBeInTheDocument();
    expect(screen.getByText("4. Público y Arquetipos")).toBeInTheDocument();
    expect(screen.getByText("5. Valor Práctico")).toBeInTheDocument();
    expect(screen.getByText("6. Historias Troya")).toBeInTheDocument();
  });

  it("llama a onApplyVariant al hacer clic en 'Aplicar Variante A al Carrusel'", () => {
    const handleApply = vi.fn();
    render(
      <CopyExperimentSimulator
        topic="Ventas vs Operaciones"
        activeVariantId="B"
        onApplyVariant={handleApply}
      />
    );

    const btnA = screen.getByRole("button", { name: /Aplicar Variante A al Carrusel/i });
    fireEvent.click(btnA);

    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "A",
        type: "provocador",
      })
    );
  });
});
