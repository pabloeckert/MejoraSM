import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import MesaDialogo from "@/pages/MesaDialogo";

const startMutateMock = vi.fn();

const mockSessions = [
  {
    id: "sess-1",
    topic: "Optimización de procesos operativos",
    status: "approved",
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    metadata: {
      proposal: {
        hook: "Gancho de prueba para el post",
        body: "Cuerpo del post operativo.\n\nSegundo bloque.\n\nTercer bloque.",
        cta: "Escribinos a mejoraok.com",
        format: "carrusel",
      },
      proposalId: "prop-123",
      autoPublished: true,
      scheduledAt: new Date(Date.now() + 86400_000).toISOString(),
    },
  },
  {
    id: "sess-error",
    topic: "Problemas de sincronización en ventas",
    status: "error",
    created_at: new Date(Date.now() - 600_000).toISOString(),
    metadata: {
      error: "Anthropic error 504: Gateway timeout tras 15 segundos",
    },
  },
  {
    id: "sess-stale",
    topic: "Sesión colgada hace más de 90 segundos",
    status: "active",
    created_at: new Date(Date.now() - 120_000).toISOString(), // 120s atrás = stale
    metadata: {},
  },
];

vi.mock("@/hooks/useDialogue", () => ({
  useDialogueSessions: () => ({
    data: mockSessions,
    isLoading: false,
  }),
  useDialogueMessages: () => ({
    data: [],
    isLoading: false,
  }),
  useStartDialogue: () => ({
    mutate: startMutateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
  useContinueDialogue: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useForceApprove: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <MesaDialogo />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("MesaDialogo Page", () => {
  it("renders heading and the 4 B2B authority pillars", () => {
    renderPage();
    expect(screen.getByText("Mesa Ejecutiva de Contenido")).toBeInTheDocument();
    expect(screen.getByText(/Pilares de Autoridad B2B/i)).toBeInTheDocument();
    expect(screen.getByText(/Caso en Trinchera/i)).toBeInTheDocument();
    expect(screen.getByText(/Ecosistema y Red/i)).toBeInTheDocument();
    expect(screen.getByText(/Método 4D/i)).toBeInTheDocument();
    expect(screen.getByText(/Propósito y Liderazgo/i)).toBeInTheDocument();
  });

  it("renders session cards with proper badges", () => {
    renderPage();
    expect(screen.getByText("Optimización de procesos operativos")).toBeInTheDocument();
    expect(screen.getByText("Problemas de sincronización en ventas")).toBeInTheDocument();
    expect(screen.getByText("Sesión colgada hace más de 90 segundos")).toBeInTheDocument();
    expect(screen.getByText("Aprobado")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("displays error banner and retry button when expanding an error session", () => {
    renderPage();
    const errorCardTitle = screen.getByText("Problemas de sincronización en ventas");
    fireEvent.click(errorCardTitle);

    expect(screen.getByText(/El debate se interrumpió o no pudo completarse/i)).toBeInTheDocument();
    expect(screen.getByText(/Anthropic error 504/i)).toBeInTheDocument();
    
    const retryBtn = screen.getByRole("button", { name: /Reintentar debate/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);

    expect(startMutateMock).toHaveBeenCalledWith(
      { topic: "Problemas de sincronización en ventas", mode: "dirigido" },
      expect.any(Object)
    );
  });

  it("displays timeout warning and restart button for stale active sessions (>90s)", () => {
    renderPage();
    const staleCardTitle = screen.getByText("Sesión colgada hace más de 90 segundos");
    fireEvent.click(staleCardTitle);

    expect(screen.getByText(/El debate está tardando más de 90 segundos/i)).toBeInTheDocument();
    const restartBtn = screen.getByRole("button", { name: /Reiniciar debate/i });
    expect(restartBtn).toBeInTheDocument();
    fireEvent.click(restartBtn);

    expect(startMutateMock).toHaveBeenCalledWith(
      { topic: "Sesión colgada hace más de 90 segundos", mode: "dirigido" },
      expect.any(Object)
    );
  });
});
