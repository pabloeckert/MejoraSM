import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import type { InboxItem } from "@/services/supabase";

const incoming: InboxItem = {
  id: "i-1",
  kind: "dm",
  platform: "instagram",
  thread_id: "t-1",
  external_id: "m-1",
  author_name: "María López",
  author_username: "marial",
  author_is_follower: true,
  text: "Quiero información sobre el acompañamiento",
  attachment_url: null,
  direction: "incoming",
  sentiment: "pregunta",
  sentiment_note: "pide info del servicio",
  item_time: "2026-09-02T12:00:00Z",
  replied_at: null,
  archived: false,
};

const draftMut = { mutate: vi.fn(), isPending: false };
const sendMut = { mutateAsync: vi.fn().mockResolvedValue({ ok: true }), isPending: false };

vi.mock("@/hooks/useInbox", async (importActual) => {
  const actual = await importActual<typeof import("@/hooks/useInbox")>();
  return {
    ...actual, // buildThreads / isUnanswered reales
    useInbox: () => ({ data: [incoming], isLoading: false }),
    useInboxSyncState: () => ({ data: { last_synced_at: "2026-09-02T12:30:00Z", last_error: null } }),
    useSyncInbox: () => ({ mutate: vi.fn(), isPending: false }),
    useDraftReply: () => draftMut,
    useSendReply: () => sendMut,
    useArchiveInboxItem: () => ({ mutate: vi.fn() }),
    useArchiveAllInbox: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Conversaciones Page", () => {
  it("renders the heading and the incoming message", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);
    expect(screen.getByRole("heading", { name: "Conversaciones" })).toBeInTheDocument();
    expect(screen.getByText("Quiero información sobre el acompañamiento")).toBeInTheDocument();
    // "Pregunta" aparece en el chip de filtro y en el badge del hilo
    expect(screen.getAllByText("Pregunta").length).toBeGreaterThanOrEqual(2);
  });

  it("shows the author and the platform badge", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);
    expect(screen.getByText("María López")).toBeInTheDocument();
    expect(screen.getByText("pide info del servicio")).toBeInTheDocument();
  });

  it("triggers the draft mutation when opening the reply box", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);
    fireEvent.click(screen.getByRole("button", { name: /Redactar respuesta/i }));
    expect(draftMut.mutate).toHaveBeenCalledWith("i-1", expect.anything());
  });

  it("renders the Archivar todas button", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);
    expect(screen.getByRole("button", { name: /Archivar todas/i })).toBeInTheDocument();
  });

  it("renders the predictive Lead Scoring badge on the thread card", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);
    // Badge shows points and quadrant label
    expect(screen.getByText(/pts/i)).toBeInTheDocument();
    expect(screen.getAllByText(/En Nutrición/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/SLA <24h/i)).toBeInTheDocument();
  });

  it("renders suggested consultative replies and populates textarea on click", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);
    
    // Open reply box
    fireEvent.click(screen.getByRole("button", { name: /Redactar respuesta/i }));

    // Check fast consultative reply bar
    expect(screen.getByText(/Respuestas Consultivas Sugeridas/i)).toBeInTheDocument();
    const btnAuto = screen.getByRole("button", { name: /Autodiagnóstico 4D/i });
    expect(btnAuto).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pregunta de Trinchera/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar por Privado/i })).toBeInTheDocument();

    // Click suggested reply and verify textarea updates
    fireEvent.click(btnAuto);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value.toLowerCase()).toContain("autodiagnóstico");
    expect(textarea.value).toContain("4 dimensiones");
  });

  it("filters threads based on lead warmth filter chips", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);

    // Initial state: thread is visible
    expect(screen.getByText("Quiero información sobre el acompañamiento")).toBeInTheDocument();

    // Click "🔥 Calificados (≥70)" filter -> item is En Nutrición (43 pts), so it should not appear in list
    const btnCalificados = screen.getByRole("button", { name: /Calificados/i });
    fireEvent.click(btnCalificados);
    expect(screen.queryByText("Quiero información sobre el acompañamiento")).not.toBeInTheDocument();

    // Click "🟡 En Nutrición" filter -> thread reappears
    const btnNutricion = screen.getByRole("button", { name: /En Nutrición/i });
    fireEvent.click(btnNutricion);
    expect(screen.getByText("Quiero información sobre el acompañamiento")).toBeInTheDocument();
  });

  it("renders 'Diagnóstico A4' button and opens ExecutiveDiagnosticModal", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);

    const btnDiag = screen.getByRole("button", { name: /Diagnóstico A4/i });
    expect(btnDiag).toBeInTheDocument();

    fireEvent.click(btnDiag);

    // Modal opens and shows title and sections
    expect(screen.getByRole("heading", { name: /Diagnóstico Ejecutivo One-Pager/i })).toBeInTheDocument();
    expect(screen.getByText(/1. El Reencuadre Sistémico/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar PDF A4/i })).toBeInTheDocument();
  });

  it("renders 'Dossier 1 a 1' button and opens MeetingDossierModal", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);

    const btnDossier = screen.getByRole("button", { name: /Dossier 1 a 1/i });
    expect(btnDossier).toBeInTheDocument();

    fireEvent.click(btnDossier);

    // Modal opens and shows title, tabs and action buttons
    expect(screen.getByRole("heading", { name: /Dossier de Preparación para Reunión 1 a 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apertura 90s/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preguntas 4D/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar Dossier PDF A4/i })).toBeInTheDocument();
  });

  it("renders 'Propuesta B2B' button and opens ScopeAgreementModal", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);

    const btnScope = screen.getByRole("button", { name: /Propuesta B2B/i });
    expect(btnScope).toBeInTheDocument();

    fireEvent.click(btnScope);

    // Modal opens and shows title, tabs and download button
    expect(
      screen.getByRole("heading", { name: /Acuerdo de Alcance y Propuesta de Acompañamiento B2B/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1\. Diagnóstico & Objetivo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2\. Fases \(90 Días\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar Propuesta PDF A4/i })).toBeInTheDocument();
  });

  it("renders 'Caso de Éxito' button and opens CustomerSuccessModal", async () => {
    const { default: Conversaciones } = await import("@/pages/Conversaciones");
    renderPage(<Conversaciones />);

    const btnCase = screen.getByRole("button", { name: /Caso de Éxito/i });
    expect(btnCase).toBeInTheDocument();

    fireEvent.click(btnCase);

    // Modal opens and shows title, badges, tabs and download button
    expect(screen.getByText(/CASO DE ÉXITO & PRUEBA SOCIAL B2B/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1\. Historia StoryBrand/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2\. Métricas & Resultados/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar Caso A4 \(PDF\)/i })).toBeInTheDocument();
  });
});
