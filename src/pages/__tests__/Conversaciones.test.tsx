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
});
