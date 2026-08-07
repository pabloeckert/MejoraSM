import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

const scheduledProposal = {
  id: "p-auto",
  title: "Post autónomo",
  hook: "Hook autónomo programado",
  body: "Body",
  cta: "CTA",
  hashtags: [],
  format: "post",
  status: "scheduled",
  rejection_reason: null,
  scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  published_at: null,
  created_at: "2026-08-01T00:00:00Z",
  oferta: "comercial",
  zernio_post_id: null,
  dialogue_sessions: { topic: "Tema" },
};

const testProposal = {
  ...scheduledProposal,
  id: "7e57da7a-0000-4000-8000-00000000000a",
  hook: "Hook de prueba QA",
  format: "historia",
  scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
};

vi.mock("@/hooks/useProposals", () => ({
  useProposals: () => ({ data: [scheduledProposal, testProposal], isLoading: false }),
  useRescheduleProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useApproveProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useScheduleProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useEditProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useConvertProposalFormat: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Calendario Page", () => {
  it("renders the heading", async () => {
    const { default: Calendario } = await import("@/pages/Calendario");
    renderWithProviders(<Calendario />);
    expect(screen.getByText("Calendario Editorial")).toBeInTheDocument();
  });

  it("excludes [TEST/QA] rows from upcoming by default and shows them behind the toggle", async () => {
    const { default: Calendario } = await import("@/pages/Calendario");
    renderWithProviders(<Calendario />);

    // La pieza real aparece dos veces (celda del calendario + sidebar
    // "Próximos 7 días") — alcanza con confirmar que existe.
    expect(screen.getAllByText("Hook autónomo programado").length).toBeGreaterThan(0);
    expect(screen.queryByText("Hook de prueba QA")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch"));

    expect(screen.getAllByText("Hook de prueba QA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PRUEBA").length).toBeGreaterThan(0);
  });

  it("opens the shared detail dialog when clicking an upcoming piece", async () => {
    const { default: Calendario } = await import("@/pages/Calendario");
    renderWithProviders(<Calendario />);
    fireEvent.click(screen.getAllByText("Hook autónomo programado")[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("switches between month and week view", async () => {
    const { default: Calendario } = await import("@/pages/Calendario");
    renderWithProviders(<Calendario />);
    const weekBtn = screen.getByRole("button", { name: "Semanal" });
    fireEvent.click(weekBtn);
    // La cabecera pasa de nombre de mes a un rango "d mmm – d mmm"
    expect(screen.getByText(/–/)).toBeInTheDocument();
  });
});
