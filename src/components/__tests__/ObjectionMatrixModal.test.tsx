/**
 * ObjectionMatrixModal.test.tsx
 * Pruebas unitarias del componente modal Matriz de Objeciones Directivas Ocultas & Argumentario de Confianza
 * Basado en David Maister (The Trusted Advisor) y Chris Voss (Never Split the Difference).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ObjectionMatrixModal } from "../ObjectionMatrixModal";

// Mock de descarga PDF
vi.mock("@/services/objectionMatrixPdfGenerator", () => ({
  descargarObjectionMatrixPDF: vi.fn(),
}));

// Mock de toast
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("ObjectionMatrixModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it("renderiza el modal cuando open es true con datos iniciales y la primera objeción activa", () => {
    render(
      <ObjectionMatrixModal
        open={true}
        onOpenChange={() => {}}
        initialData={{
          nombreDirectivo: "Carlos Menéndez",
          empresaNombre: "Distribuidora del Centro",
        }}
      />
    );

    expect(
      screen.getByText(/Matriz de Objeciones Directivas & Argumentario de Confianza/i)
    ).toBeInTheDocument();

    // Muestra la frase textual del cliente y las etiquetas de análisis (usando getAllByText porque aparece en la cita y en el desglose)
    const matches = screen.getAllByText(/No tenemos tiempo para implementar cambios ahora/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText(/Miedo Oculto Real/i)).toBeInTheDocument();
    expect(screen.getByText(/Reencuadre de Autoridad B2B/i)).toBeInTheDocument();
  });

  it("permite navegar a la pestaña de Guión de Llamada (90s) y copiar el guión", () => {
    render(
      <ObjectionMatrixModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const tabGuion = screen.getByRole("button", {
      name: /2\. Guión de Llamada \(90s\)/i,
    });
    fireEvent.click(tabGuion);

    expect(screen.getByText(/Paso 1 — Apertura & Validación/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 2 — Desarme Táctico/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 3 — Puente Metodológico 4D/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 4 — Cierre Socrático/i)).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", {
      name: /Copiar Guión/i,
    });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("permite navegar a la pestaña de WhatsApp & DMs y copiar el resumen", () => {
    render(
      <ObjectionMatrixModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const tabWhatsApp = screen.getByRole("button", {
      name: /3\. WhatsApp & DMs/i,
    });
    fireEvent.click(tabWhatsApp);

    expect(
      screen.getByText(/Respuesta Consultiva para WhatsApp o DM Directo/i)
    ).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", {
      name: /Copiar WhatsApp/i,
    });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("permite navegar a la pestaña de Pregunta Socrática C-Level", () => {
    render(
      <ObjectionMatrixModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const tabSocratica = screen.getByRole("button", {
      name: /4\. Pregunta Socrática C-Level/i,
    });
    fireEvent.click(tabSocratica);

    expect(
      screen.getByText(/Pregunta Socrática C-Level de Apertura Reflexiva/i)
    ).toBeInTheDocument();
  });

  it("permite cambiar la objeción activa desde la lista de selección", () => {
    render(
      <ObjectionMatrixModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Seleccionamos la objeción de software fracasado
    const btnSoftware = screen.getByText(/Frustración por Software o ERP Previo Fracasado/i);
    fireEvent.click(btnSoftware);

    // Debe mostrar la frase textual de esa objeción
    const matches = screen.getAllByText(/Ya compramos un sistema caro hace un tiempo y nadie lo usó/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("ejecuta onApplyTopic al hacer click en 'Debatir en Mesa Ejecutiva'", () => {
    const handleApplyTopic = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ObjectionMatrixModal
        open={true}
        onOpenChange={handleOpenChange}
        onApplyTopic={handleApplyTopic}
        initialData={{
          nombreDirectivo: "Martín Sosa",
          empresaNombre: "Logística del Sur",
        }}
      />
    );

    const btnDebatir = screen.getByRole("button", {
      name: /Debatir en Mesa Ejecutiva/i,
    });
    fireEvent.click(btnDebatir);

    expect(handleApplyTopic).toHaveBeenCalledWith(
      expect.stringContaining("Debate sobre Objeción Directiva")
    );
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
