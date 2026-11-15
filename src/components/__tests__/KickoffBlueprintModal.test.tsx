import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KickoffBlueprintModal } from "../KickoffBlueprintModal";
import * as pdfGen from "@/services/kickoffBlueprintPdfGenerator";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("KickoffBlueprintModal (Sprint S+20: Onboarding & Plan 30 Días + Gemba Walk)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  it("renderiza encabezado institucional, agenda de 90 min y checklist pre-vuelo en la pestaña inicial", () => {
    render(<KickoffBlueprintModal open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("KICKOFF BLUEPRINT & GEMBA WALK 30D")).toBeInTheDocument();
    expect(
      screen.getByText(/Protocolo de Onboarding y Plan de Primeros 30 Días/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Min 00 a 15/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Checklist Pre-Vuelo Cero Burocracia/i)
    ).toBeInTheDocument();
  });

  it("permite navegar a las pestañas Gemba Walk 4D y Plan 30 Días mostrando sus contenidos", () => {
    render(<KickoffBlueprintModal open={true} onOpenChange={() => {}} />);

    fireEvent.click(
      screen.getByRole("button", { name: /2\. Gemba Walk 4D/i })
    );
    expect(screen.getByText(/REGLA DE ORO DEL GEMBA WALK/i)).toBeInTheDocument();
    expect(screen.getByText("Dimensión Personal")).toBeInTheDocument();
    expect(screen.getByText("Dimensión Organizacional")).toBeInTheDocument();
    expect(screen.getByText("Dimensión Comercial")).toBeInTheDocument();
    expect(screen.getByText("Dimensión Empresarial")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /3\. Plan 30 Días & Quick Wins/i })
    );
    expect(screen.getByText(/QUICK WIN PRIORITARIO D15/i)).toBeInTheDocument();
    expect(screen.getByText(/Día 8 a 15 \(1er Quick Win\)/i)).toBeInTheDocument();
  });

  it("recalcula el contenido reactivamente al cambiar de arquetipo de arranque", () => {
    render(<KickoffBlueprintModal open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Calidad y Retrabajos" }));

    expect(screen.getByText(/KICK-2026-CE-/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /3\. Plan 30 Días & Quick Wins/i })
    );
    expect(
      screen.getByText(/Checklist Visual de Autocontrol \(Gate Anti-Defecto en Origen\)/i)
    ).toBeInTheDocument();
  });

  it("copia comunicados al portapapeles y dispara la descarga del PDF A4", async () => {
    const downloadSpy = vi
      .spyOn(pdfGen, "descargarKickoffBlueprintPDF")
      .mockImplementation(() => {});

    render(<KickoffBlueprintModal open={true} onOpenChange={() => {}} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Copiar Comunicado Equipo/i })
    );
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Descargar Kickoff PDF \(A4\)/i })
    );
    expect(downloadSpy).toHaveBeenCalledTimes(1);
  });
});
