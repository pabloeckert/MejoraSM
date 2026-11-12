// src/components/__tests__/FormatRecommenderCard.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormatRecommenderCard } from "../FormatRecommenderCard";
import { FormatRecommenderInput } from "@/domain/formatRecommender";

describe("FormatRecommenderCard Component (Sprint S+7)", () => {
  const sampleInputCarrusel: FormatRecommenderInput = {
    topic: "Protocolo de control de stock y desvíos en planta",
    hook: "Cómo auditar tu inventario en 3 pasos sin parar la fábrica",
    body: "Para evitar faltantes de producción implementá este checklist:\n1. Conteo cíclico diario por familia A.\n2. Cuadratura de remitos contra sistema.\n3. Fijación de stock de seguridad por tiempo de reposición.",
    copy_tres_pasos: {
      paso1_dolor: "Tu planta se frena porque faltó un insumo básico.",
      paso2_reencuadre: "La causa es la falta de un protocolo de compras automáticas.",
      paso3_direccion_web: "Descargá la matriz de abastecimiento en mejoraok.com",
    },
    targetChannel: "linkedin",
  };

  it("renderiza el título, la tasa de confianza y el formato recomendado ganador", () => {
    const handleApply = vi.fn();
    render(
      <FormatRecommenderCard
        input={sampleInputCarrusel}
        onApplyFormat={handleApply}
      />
    );

    expect(screen.getByText("Recomendador Inteligente de Formato")).toBeInTheDocument();
    expect(screen.getByText(/Confianza/i)).toBeInTheDocument();
    expect(screen.getByText("Formato Recomendado")).toBeInTheDocument();
    expect(screen.getAllByText("Carrusel PDF B2B (1080x1350)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/4:5/i)).toBeInTheDocument();
  });

  it("muestra las métricas predictivas de rendimiento (CTR, Retención, Guardados)", () => {
    const handleApply = vi.fn();
    render(
      <FormatRecommenderCard
        input={sampleInputCarrusel}
        onApplyFormat={handleApply}
      />
    );

    expect(screen.getByText(/CTR Estimado/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Retención/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Reenvíos \/ Guardados/i)).toBeInTheDocument();
  });

  it("ejecuta el callback onApplyFormat al pulsar 'Aplicar Formato Recomendado'", () => {
    const handleApply = vi.fn();
    render(
      <FormatRecommenderCard
        input={sampleInputCarrusel}
        activeFormat="post" // No es carrusel actualmente
        onApplyFormat={handleApply}
      />
    );

    const applyBtn = screen.getByRole("button", {
      name: /Aplicar Formato Recomendado/i,
    });
    expect(applyBtn).toBeInTheDocument();
    expect(applyBtn).not.toBeDisabled();

    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith("carrusel", "carrusel_pdf");
  });

  it("permite colapsar y expandir la comparativa de formatos", () => {
    const handleApply = vi.fn();
    render(
      <FormatRecommenderCard
        input={sampleInputCarrusel}
        compact={true}
        onApplyFormat={handleApply}
      />
    );

    // En modo compact arranca colapsado
    expect(screen.queryByText("Comparativa de Idoneidad por Formato")).not.toBeInTheDocument();

    const expandBtn = screen.getByRole("button", { name: /Comparar formatos/i });
    fireEvent.click(expandBtn);

    expect(screen.getByText("Comparativa de Idoneidad por Formato")).toBeInTheDocument();
    expect(screen.getByText(/Reel \/ Video Vertical/i)).toBeInTheDocument();
    expect(screen.getByText(/Placa de Cita \/ Autoridad/i)).toBeInTheDocument();
  });

  it("permite seleccionar manualmente un formato alternativo al hacer clic en su tarjeta", () => {
    const handleApply = vi.fn();
    render(
      <FormatRecommenderCard
        input={sampleInputCarrusel}
        compact={false}
        onApplyFormat={handleApply}
      />
    );

    const reelCard = screen.getByText("Reel / Video Vertical (1080x1920)");
    fireEvent.click(reelCard);

    expect(handleApply).toHaveBeenCalledWith("reel", "post_directo");
  });
});
