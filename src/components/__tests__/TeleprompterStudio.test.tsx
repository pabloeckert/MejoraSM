import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeleprompterStudio } from "../TeleprompterStudio";

describe("TeleprompterStudio Component (Sprint S+9: Estudio de Rodaje y Teleprompter)", () => {
  const defaultInput = {
    propuesta_id: "PROP-2026-W01-01",
    titulo_portada: "El cuello de botella sos vos",
    copy_tres_pasos: {
      dolor: "Si cada decisión del día tiene que pasar por tu escritorio, no tenés una empresa.",
      reencuadre: "La claridad directiva comienza por delegar con criterios en lugar de órdenes puntuales.",
      direccion: "Hacé el diagnóstico en mejoraok.com para medir las 4 dimensiones de tu empresa.",
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza el diálogo con el título institucional, badges y desglose de 3 bloques", () => {
    render(<TeleprompterStudio open={true} onOpenChange={vi.fn()} input={defaultInput} />);

    expect(screen.getByText(/Estudio de Rodaje B2B · Reel 60s/i)).toBeInTheDocument();
    expect(screen.getByText("PROP-2026-W01-01")).toBeInTheDocument();
    expect(screen.getByText("El cuello de botella sos vos")).toBeInTheDocument();

    // Comprobar los 3 bloques
    expect(screen.getByText(/Gancho de Quiebre/i)).toBeInTheDocument();
    expect(screen.getByText(/Metodología y Sistema/i)).toBeInTheDocument();
    expect(screen.getByText(/Dirección y Llamado a la Acción/i)).toBeInTheDocument();
  });

  it("muestra las métricas de rodaje: duración (~60s), WPM (135) y retención estimada", () => {
    render(<TeleprompterStudio open={true} onOpenChange={vi.fn()} input={defaultInput} />);

    expect(screen.getByText(/Ritmo Directivo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/135 WPM/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Duración Total/i)).toBeInTheDocument();
    expect(screen.getByText(/Retención Est/i)).toBeInTheDocument();
  });

  it("cambia a la pestaña 'Teleprompter en Vivo' y muestra los controles de reproducción", () => {
    render(<TeleprompterStudio open={true} onOpenChange={vi.fn()} input={defaultInput} />);

    const teleprompterTabBtn = screen.getByRole("button", { name: /Teleprompter en Vivo/i });
    fireEvent.click(teleprompterTabBtn);

    // Controles de rodaje
    expect(screen.getByRole("button", { name: /Iniciar Rodaje/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reiniciar/i })).toBeInTheDocument();
    expect(screen.getByText(/Línea Focal de Mirada a Lente/i)).toBeInTheDocument();
  });

  it("permite cambiar la velocidad de lectura entre 115, 135 y 155 WPM", () => {
    render(<TeleprompterStudio open={true} onOpenChange={vi.fn()} input={defaultInput} />);

    fireEvent.click(screen.getByRole("button", { name: /Teleprompter en Vivo/i }));

    const btnLento = screen.getByRole("button", { name: /115 Lento/i });
    const btnRapido = screen.getByRole("button", { name: /155 Rápido/i });

    expect(btnLento).toBeInTheDocument();
    expect(btnRapido).toBeInTheDocument();

    fireEvent.click(btnRapido);
    expect(btnRapido).toHaveClass("bg-blue-600");
  });

  it("activa el Modo Espejo (Mirror Mode) para teleprompters de cristal físico", () => {
    render(<TeleprompterStudio open={true} onOpenChange={vi.fn()} input={defaultInput} />);

    fireEvent.click(screen.getByRole("button", { name: /Teleprompter en Vivo/i }));

    const mirrorBtn = screen.getByRole("button", { name: /Espejo/i });
    expect(mirrorBtn).toBeInTheDocument();

    fireEvent.click(mirrorBtn);
    expect(mirrorBtn).toHaveClass("bg-blue-600");
  });

  it("copia el guion completo al portapapeles en 1 clic", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<TeleprompterStudio open={true} onOpenChange={vi.fn()} input={defaultInput} />);

    const copyBtn = screen.getByRole("button", { name: /Copiar/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock.mock.calls[0][0]).toContain("# Guion de Rodaje B2B (Reel 60s)");
  });
});
