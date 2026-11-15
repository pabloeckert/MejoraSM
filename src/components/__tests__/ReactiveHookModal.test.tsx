import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReactiveHookModal } from "../ReactiveHookModal";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("ReactiveHookModal (Sprint S+21: Radar de Coyuntura PyME & Hooks Reactivos)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  it("renderiza el encabezado institucional, los badges y los 3 hooks reactivos", () => {
    render(<ReactiveHookModal open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("RADAR DE COYUNTURA & NEWSJACKING B2B")).toBeInTheDocument();
    expect(
      screen.getByText(/Radar de Coyuntura Operativa PyME y Hooks Reactivos/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Voz de Marca 100\/100/i)).toBeInTheDocument();

    expect(screen.getAllByText("Quiebre Directivo").length).toBeGreaterThan(0);
    expect(screen.getByText("Situacional de Trinchera")).toBeInTheDocument();
    expect(screen.getByText("Pregunta Socrática C-Level")).toBeInTheDocument();
  });

  it("permite cambiar la situación de trinchera y recalcula los textos", () => {
    render(<ReactiveHookModal open={true} onOpenChange={() => {}} />);

    const btnAguinaldos = screen.getByRole("button", {
      name: /Pago de Aguinaldos/i,
    });
    fireEvent.click(btnAguinaldos);

    expect(
      screen.getAllByText(/Pago de Aguinaldos/i).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Junio y Diciembre/i).length).toBeGreaterThan(0);
  });

  it("navega entre las 4 pestañas mostrando el carrusel, guion de reel y DMs", () => {
    render(<ReactiveHookModal open={true} onOpenChange={() => {}} />);

    // Pestaña 2: Carrusel
    fireEvent.click(screen.getByRole("button", { name: /2\. Carrusel \(5 Slides\)/i }));
    expect(screen.getByText(/Slide 1 \/ 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Slide 5 \/ 5/i)).toBeInTheDocument();

    // Pestaña 3: Reel
    fireEvent.click(screen.getByRole("button", { name: /3\. Guion Reel \(60s\)/i }));
    expect(screen.getByText(/00:00 a 00:05 — Gancho de Quiebre/i)).toBeInTheDocument();
    expect(screen.getByText(/00:05 a 00:45 — Causa Raíz y Metodología/i)).toBeInTheDocument();

    // Pestaña 4: DMs & Conversión
    fireEvent.click(screen.getByRole("button", { name: /4\. DMs & Conversión/i }));
    expect(
      screen.getByText(/Pregunta Consultiva para DMs \/ Comentarios/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Primer Comentario con Link UTM \(LinkedIn\)/i)
    ).toBeInTheDocument();
  });

  it("copia el post completo y permite inyectar a la Mesa de Diálogo", async () => {
    const onApplyMock = vi.fn();
    render(
      <ReactiveHookModal
        open={true}
        onOpenChange={() => {}}
        onApplyTopic={onApplyMock}
      />
    );

    // Copiar post
    const btnCopiar = screen.getByRole("button", { name: /Copiar Post Completo/i });
    fireEvent.click(btnCopiar);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });

    // Inyectar a mesa
    const btnInyectar = screen.getByRole("button", { name: /Inyectar a Mesa de Diálogo/i });
    fireEvent.click(btnInyectar);
    expect(onApplyMock).toHaveBeenCalledTimes(1);
    expect(onApplyMock.mock.calls[0][0]).toContain("Coyuntura PyME:");
  });
});
