import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

const pendingProposal = {
  id: "p-manual",
  title: "Story pendiente",
  hook: "Hook manual",
  body: "Body de la story",
  cta: "CTA",
  hashtags: ["#test"],
  format: "historia",
  status: "pending",
  rejection_reason: null,
  scheduled_at: null,
  published_at: null,
  created_at: "2026-08-01T00:00:00Z",
  oferta: null,
  zernio_post_id: null,
  dialogue_sessions: { topic: "Tema manual" },
};

const scheduledProposal = {
  id: "p-auto",
  title: "Post autónomo",
  hook: "Hook autónomo",
  body: "Body del post",
  cta: "CTA",
  hashtags: [],
  format: "post",
  status: "scheduled",
  rejection_reason: null,
  scheduled_at: "2026-09-01T12:00:00Z",
  published_at: null,
  created_at: "2026-08-01T00:00:00Z",
  oferta: "comercial",
  zernio_post_id: null,
  dialogue_sessions: { topic: "Tema autónomo" },
};

vi.mock("@/hooks/useProposals", () => ({
  useProposals: () => ({ data: [pendingProposal, scheduledProposal], isLoading: false }),
  usePendingProposals: () => ({ data: [pendingProposal] }),
  useApproveProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useScheduleProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useEditProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useRescheduleProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useConvertProposalFormat: () => ({ mutate: vi.fn(), isPending: false }),
  useTemplates: () => ({ data: [], isLoading: false }),
  useCreateTemplate: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateTemplate: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteTemplate: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Propuestas Page", () => {
  it("renders the heading", async () => {
    const { default: Propuestas } = await import("@/pages/Propuestas");
    renderWithProviders(<Propuestas />);
    expect(screen.getByText("Propuestas de Contenido")).toBeInTheDocument();
  });

  it("renders all tabs including Plantillas", async () => {
    const { default: Propuestas } = await import("@/pages/Propuestas");
    renderWithProviders(<Propuestas />);
    expect(screen.getByRole("tab", { name: /Pendientes/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Aprobadas/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Programadas/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Todas" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Plantillas/ })).toBeInTheDocument();
  });

  it("distinguishes autonomous vs manual pipeline formats", async () => {
    const { default: Propuestas } = await import("@/pages/Propuestas");
    renderWithProviders(<Propuestas />);
    // Pendientes tab (default) muestra la propuesta manual (historia)
    expect(screen.getByText("Acción manual")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /Programadas/ }));
    expect(screen.getByText("Se publica solo")).toBeInTheDocument();
  });

  it("opens the shared detail dialog when clicking a piece", async () => {
    const { default: Propuestas } = await import("@/pages/Propuestas");
    renderWithProviders(<Propuestas />);
    fireEvent.click(screen.getByText("Hook manual"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Editar")).toBeInTheDocument();
  });

  it("shows the empty state for templates", async () => {
    const { default: Propuestas } = await import("@/pages/Propuestas");
    renderWithProviders(<Propuestas />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Plantillas/ }));
    expect(screen.getByText("Sin plantillas todavía.")).toBeInTheDocument();
  });
});
