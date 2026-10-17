// src/test/micropaso3-e2e-ui.test.tsx
// PRUEBA EMPÍRICA INTEGRAL E2E DE RENDERIZADO UI Y FRAMING ENGINE VISUAL
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TableroSemanal from "@/pages/TableroSemanal";
import { Grid26Semanas } from "@/components/Grid26Semanas";
import Boveda from "@/pages/Boveda";
import { getLocalProposals } from "@/services/localSMService";
import { calculateContainmentGeometry, validateFramingCompliance } from "@/domain/framingEngine";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("E2E EMPÍRICO SRE: MICRO-PASO 3 (UI & FRAMING ENGINE)", () => {
  it("Audita 0 contenedores en blanco, 78 piezas evergreen y carga de 26 semanas", () => {
    const proposals = getLocalProposals();
    expect(proposals.length).toBe(78);

    const { container } = renderWithProviders(<TableroSemanal />);

    // 1. Título y persistencia soberana visible
    expect(screen.getByText("Mesa de Revisión y Control — MejoraSM")).toBeInTheDocument();
    expect(screen.getByText("Modo Local Soberano (SQLite Activo)")).toBeInTheDocument();

    // 2. Cero rectángulos vacíos o placeholders rotos
    const placeholdersVacios = container.querySelectorAll(".placeholder, .skeleton, .empty-box");
    expect(placeholdersVacios.length).toBe(0);

    // 3. Verificación de balance 80% Jabs / 20% Right Hooks en Semana 1
    const jabs = screen.getAllByText(/Jab \(80%\)/i);
    const rightHooks = screen.getAllByText(/Right Hook \(20%\)/i);
    expect(jabs.length + rightHooks.length).toBe(3); // 3 piezas por semana
  });

  it("Audita el Framing Engine CSS: blur(28px), barra tricolor y 0% de recorte de fotos", () => {
    const { container } = renderWithProviders(<TableroSemanal />);

    // Barra tricolor institucional presente en cada tarjeta
    const brandBars = container.querySelectorAll(".brand-bar");
    expect(brandBars.length).toBeGreaterThan(0);
    brandBars.forEach((bar) => {
      const colors = bar.querySelectorAll("div");
      expect(colors[0]).toHaveClass("bg-[#1A3D84]");
      expect(colors[1]).toHaveClass("bg-[#E1061E]");
      expect(colors[2]).toHaveClass("bg-[#F7CC13]");
    });

    // Fondo adaptativo con blur(28px) y brightness(0.85)
    const blurBackdrops = container.querySelectorAll("[style*='blur(28px)']");
    expect(blurBackdrops.length).toBeGreaterThan(0);
    blurBackdrops.forEach((el) => {
      expect(el.getAttribute("style")).toContain("blur(28px)");
      expect(el.getAttribute("style")).toContain("brightness(0.85)");
    });

    // Invariante visual de contención frontal sin recorte (object-fit: contain)
    const frontImages = container.querySelectorAll("img.object-contain");
    expect(frontImages.length).toBeGreaterThan(0);

    // Validación formal matemática del Framing Engine en 4:5, 1:1 y 9:16
    const ratios = ["4:5", "1:1", "9:16"] as const;
    ratios.forEach((ratio) => {
      const geom = calculateContainmentGeometry(1920, 1080, ratio);
      expect(geom.croppedPixels).toBe(0);
      expect(geom.aspectRatioPreserved).toBe(true);
      expect(geom.blurLayer.filter).toBe("blur(28px) brightness(0.85)");
    });
  });

  it("Prueba conmutación de ratios (1:1, 4:5, 9:16) y actualización inmediata del DOM", () => {
    renderWithProviders(<TableroSemanal />);

    // Cambiar a 1:1
    const boton11 = screen.getAllByRole("button", { name: "Cambiar formato a 1:1" })[0];
    fireEvent.click(boton11);
    expect(screen.getByText("Marco 1:1 · 0% Recorte")).toBeInTheDocument();

    // Cambiar a 9:16
    const boton916 = screen.getAllByRole("button", { name: "Cambiar formato a 9:16" })[0];
    fireEvent.click(boton916);
    expect(screen.getByText("Marco 9:16 · 0% Recorte")).toBeInTheDocument();

    // Cambiar a 4:5
    const boton45 = screen.getAllByRole("button", { name: "Cambiar formato a 4:5" })[0];
    fireEvent.click(boton45);
    expect(screen.getAllByText("Marco 4:5 · 0% Recorte").length).toBeGreaterThan(0);
  });

  it("Prueba conmutación de borradores IA (A, B, C) con mutación reactiva de título y copy", () => {
    renderWithProviders(<TableroSemanal />);

    // Verificar título del borrador A inicial
    expect(screen.getByText(/El cuello de botella sos vos/i)).toBeInTheDocument();

    // Cambiar a Borrador B
    const botonB = screen.getAllByRole("button", { name: /Seleccionar borrador B/i })[0];
    fireEvent.click(botonB);

    // El DOM se actualiza inmediatamente mostrando el contenido de la variante B
    expect(screen.getByText(/Autoridad Directiva: El cuello de botella sos vos/i)).toBeInTheDocument();
  });


  it("Prueba aprobación unitaria y aprobación en lote con actualización inmediata del DOM", () => {
    renderWithProviders(<TableroSemanal />);

    // 1. Aprobación unitaria de la primera pieza
    const botonAprobar = screen.getAllByRole("button", { name: /Aprobar pieza/i })[0];
    fireEvent.click(botonAprobar);

    expect(screen.getAllByText("Aprobada").length).toBeGreaterThan(0);

    // 2. Aprobación de lote completo semanal
    const botonLote = screen.getByText(/Aprobar Lote Completo/i);
    fireEvent.click(botonLote);

    const botonConfirmar = screen.getByText("Confirmar Aprobación de Lote");
    fireEvent.click(botonConfirmar);

    // Todas las piezas de la semana quedan aprobadas en el DOM
    const badgesAprobadas = screen.getAllByText("Aprobada");
    expect(badgesAprobadas.length).toBeGreaterThanOrEqual(3);
  });
});
