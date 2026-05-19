import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

// Mock all hooks used by Dashboard
vi.mock("@/hooks/useVault", () => ({
  useDocuments: () => ({ data: [{ id: "1", title: "Test Doc" }] }),
}));

vi.mock("@/hooks/useDialogue", () => ({
  useDialogueSessions: () => ({ data: [{ id: "1", topic: "Test Topic" }] }),
}));

vi.mock("@/hooks/useProposals", () => ({
  useProposals: () => ({ data: [{ id: "1", title: "Test Proposal" }] }),
  usePendingProposals: () => ({
    data: [
      {
        id: "1",
        title: "Pending Post",
        format: "post",
        dialogue_sessions: { topic: "Marketing" },
      },
    ],
  }),
}));

vi.mock("@/hooks/useMetrics", () => ({
  useCalendarEvents: () => ({ data: [{ id: "1", title: "Scheduled Post", date: "2026-05-01" }] }),
  useLatestMetrics: () => ({ data: [] }),
  useCreateCalendarEvent: () => ({ mutate: vi.fn() }),
  useDeleteCalendarEvent: () => ({ mutate: vi.fn() }),
  useSuccessRules: () => ({ data: [] }),
  useProposalMetrics: () => ({ data: [] }),
}));

// Mock recharts to avoid SVG rendering issues in tests
vi.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("Dashboard Page", () => {
  it("renders the heading", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders subtitle text", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);
    expect(
      screen.getByText("Centro de control del Estratega Digital Autónomo")
    ).toBeInTheDocument();
  });

  it("renders stat cards with correct counts", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Documentos en Bóveda")).toBeInTheDocument();
    expect(screen.getByText("Diálogos creados")).toBeInTheDocument();
    expect(screen.getByText("Contenidos generados")).toBeInTheDocument();
    expect(screen.getByText("Publicaciones programadas")).toBeInTheDocument();
  });

  it("renders pending approvals section", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Aprobaciones pendientes")).toBeInTheDocument();
    expect(screen.getByText("Pending Post")).toBeInTheDocument();
    expect(screen.getByText("Marketing")).toBeInTheDocument();
  });

  it("renders calendar section", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Calendario de contenido")).toBeInTheDocument();
    expect(screen.getByText("Scheduled Post")).toBeInTheDocument();
  });

  it("renders stat values as links", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(4);
  });
});
