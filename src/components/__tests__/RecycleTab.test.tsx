import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/services/ai", () => ({
  getRecycleCandidates: vi.fn().mockResolvedValue({ median: 0, count: 0, candidates: [] }),
  refreshRecycleProposal: vi.fn(),
  scheduleRecycledProposal: vi.fn(),
}));

function renderCmp(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("RecycleTab", () => {
  it("shows the empty state when there is nothing to recycle", async () => {
    const { RecycleTab } = await import("@/components/RecycleTab");
    renderCmp(<RecycleTab />);
    expect(
      await screen.findByText(/Todavía no hay nada para reciclar/i)
    ).toBeInTheDocument();
  });
});
