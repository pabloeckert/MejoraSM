// src/components/__tests__/ContentTransmutationModal.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContentTransmutationModal } from "../ContentTransmutationModal";
import { TransmutationInput } from "@/domain/contentTransmutationEngine";

const mockInput: TransmutationInput = {
  propuesta_id: "PROP-TEST-001",
  titulo_portada: "El embotellamiento no es tu gente, es tu proceso",
  copy_calibrado: {
    paso1_dolor: "Sentís que sin tu supervisión constante la fábrica o las operaciones se frenan.",
    paso2_reencuadre: "El problema no es la falta de compromiso del equipo, es la ausencia de un flujo visual estandarizado.",
    paso3_direccion_web: "Diagnostica tus cuellos de botella operativos en mejoraok.com/procesos",
  },
  oferta: "organizacional",
  formatoOriginal: "carrusel",
  hook_aprobado: "Si tenés que estar en todo, tu empresa no tiene procesos, tiene dependencias.",
};

describe("ContentTransmutationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders correctly with modal open and shows metrics and 5 tabs", () => {
    render(
      <ContentTransmutationModal
        open={true}
        onOpenChange={vi.fn()}
        input={mockInput}
      />
    );

    // Title and description
    expect(screen.getByText(/Motor de Transmutación y Repurposing Multicanal B2B/i)).toBeInTheDocument();
    expect(screen.getByText(/The Content Pyramid/i)).toBeInTheDocument();

    // Metrics
    expect(screen.getByText(/3.8x Alcance/i)).toBeInTheDocument();
    expect(screen.getByText(/\+4.5h Ahorradas/i)).toBeInTheDocument();

    // Tabs exist
    expect(screen.getByRole("tab", { name: /Carrusel/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Reel/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /LinkedIn/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Cita/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /WhatsApp/i })).toBeInTheDocument();
  });

  it("renders Carrusel tab slides by default", () => {
    render(
      <ContentTransmutationModal
        open={true}
        onOpenChange={vi.fn()}
        input={mockInput}
      />
    );

    expect(screen.getByText(/Carrusel PDF B2B de Alta Retención/i)).toBeInTheDocument();
    expect(screen.getByText(/Lámina 1 \/ 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Lámina 5 \/ 5/i)).toBeInTheDocument();
  });

  it("switches to Reel tab and handles Teleprompter launcher", () => {
    const mockLaunchTeleprompter = vi.fn();
    render(
      <ContentTransmutationModal
        open={true}
        onOpenChange={vi.fn()}
        input={mockInput}
        onLaunchTeleprompter={mockLaunchTeleprompter}
      />
    );

    const reelTab = screen.getByRole("tab", { name: /Reel/i });
    fireEvent.click(reelTab);

    expect(screen.getByText(/Guion de Reel \/ Short 60s B2B/i)).toBeInTheDocument();
    expect(screen.getByText(/3 Bloques Teleprompter/i)).toBeInTheDocument();

    const launchButton = screen.getByRole("button", { name: /Abrir en Teleprompter Studio/i });
    expect(launchButton).toBeInTheDocument();
    fireEvent.click(launchButton);
    expect(mockLaunchTeleprompter).toHaveBeenCalledTimes(1);
  });

  it("switches to LinkedIn tab and copies principal post", async () => {
    render(
      <ContentTransmutationModal
        open={true}
        onOpenChange={vi.fn()}
        input={mockInput}
      />
    );

    const linkedinTab = screen.getByRole("tab", { name: /LinkedIn/i });
    fireEvent.click(linkedinTab);

    expect(screen.getByText(/Hilo Ejecutivo LinkedIn/i)).toBeInTheDocument();
    expect(screen.getByText(/Primer Comentario Estratégico/i)).toBeInTheDocument();
    expect(screen.getByText(/Debate C-Level Simulado/i)).toBeInTheDocument();

    const copyPostBtn = screen.getByRole("button", { name: /Copiar Solo Post Principal/i });
    fireEvent.click(copyPostBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it("switches to Placa tab and shows quote card", () => {
    render(
      <ContentTransmutationModal
        open={true}
        onOpenChange={vi.fn()}
        input={mockInput}
      />
    );

    const placaTab = screen.getByRole("tab", { name: /Cita/i });
    fireEvent.click(placaTab);

    expect(screen.getByText(/Placa de Cita \/ Aforismo de Marca/i)).toBeInTheDocument();
    expect(screen.getByText(/80% Espacio Negativo Swiss/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy de Acompañamiento para el Feed/i)).toBeInTheDocument();
  });

  it("switches to WhatsApp tab and checks message content", () => {
    render(
      <ContentTransmutationModal
        open={true}
        onOpenChange={vi.fn()}
        input={mockInput}
      />
    );

    const waTab = screen.getByRole("tab", { name: /WhatsApp/i });
    fireEvent.click(waTab);

    expect(screen.getByText(/Mensaje de Difusión VIP WhatsApp B2B/i)).toBeInTheDocument();
    expect(screen.getByText(/Abrir en WhatsApp Web/i)).toBeInTheDocument();
  });
});
