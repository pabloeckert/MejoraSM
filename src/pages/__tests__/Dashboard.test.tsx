import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const realMetric = {
  id: "m1",
  proposal_id: "p1",
  post_id: "6a70b1959bf0a77017bc3c6c",
  reach: 100,
  impressions: 200,
  likes: 10,
  comments: 2,
  shares: 1,
  saves: 3,
  clicks: 5,
  engagement_rate: 8,
  measured_at: "2026-08-01T00:00:00Z",
  proposals: {
    id: "p1",
    title: "Real Post",
    hook: "Real Hook",
    format: "post",
    status: "published",
    zernio_post_id: "6a70b1959bf0a77017bc3c6c",
    oferta: "comercial",
    rendered_image_path: null,
  },
};

const testMetric = {
  id: "m2",
  proposal_id: "7e57da7a-0000-4000-8000-00000000000a",
  post_id: "TEST-QA-A",
  reach: 50,
  impressions: 90,
  likes: 1,
  comments: 0,
  shares: 0,
  saves: 0,
  clicks: null,
  engagement_rate: 1.1,
  measured_at: "2026-08-02T00:00:00Z",
  proposals: {
    id: "7e57da7a-0000-4000-8000-00000000000a",
    title: "Test Post",
    hook: "Test Hook",
    format: "carrusel",
    status: "published",
    zernio_post_id: null,
    oferta: "comercial",
    rendered_image_path: null,
  },
};

vi.mock("@/hooks/useMetrics", () => ({
  useCalendarEvents: () => ({ data: [{ id: "1", title: "Scheduled Post", date: "2026-05-01", format: "post" }] }),
  useAllMetrics: () => ({ data: [realMetric, testMetric] }),
}));

// Mock recharts to avoid SVG rendering issues in tests
vi.mock("recharts", () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
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

beforeEach(() => {
  // El Dashboard trae content/log/historial.json (desglose por red) vía
  // fetch directo a raw.githubusercontent.com — nunca pegarle a la red real
  // en tests, se devuelve un historial vacío controlado.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ posts: [] }) }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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
      screen.getByText(/Centro de control del Estratega Digital Autónomo/)
    ).toBeInTheDocument();
  });

  it("renders operational stat cards with correct counts", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Documentos en Bóveda")).toBeInTheDocument();
    expect(screen.getByText("Diálogos creados")).toBeInTheDocument();
    expect(screen.getByText("Contenidos generados")).toBeInTheDocument();
    expect(screen.getByText("Publicaciones programadas")).toBeInTheDocument();
  });

  it("renders real KPI tiles, including clicks", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Alcance por publicación")).toBeInTheDocument();
    expect(screen.getByText("Impresiones por publicación")).toBeInTheDocument();
    expect(screen.getByText("Engagement sobre impresión")).toBeInTheDocument();
    expect(screen.getByText("Engagement sobre alcance")).toBeInTheDocument();
    expect(screen.getByText("Guardados (saves)")).toBeInTheDocument();
    expect(screen.getByText("Compartidos (shares)")).toBeInTheDocument();
    expect(screen.getByText("Comentarios")).toBeInTheDocument();
    expect(screen.getByText("Clics al enlace")).toBeInTheDocument();
  });

  it("renders the no-source-data KPI list explicitly, not as fake zeros", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("KPIs sin fuente de datos conectada")).toBeInTheDocument();
    expect(screen.getByText("Alcance orgánico vs. pago")).toBeInTheDocument();
    expect(screen.getByText("Crecimiento neto de seguidores")).toBeInTheDocument();
  });

  it("excludes [TEST/QA] rows by default and shows them behind the toggle", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);

    expect(screen.getAllByText("Real Hook").length).toBeGreaterThan(0);
    expect(screen.queryByText("Test Hook")).not.toBeInTheDocument();

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(screen.getAllByText("Test Hook").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PRUEBA").length).toBeGreaterThan(0);
  });

  it("opens a detail dialog when clicking a piece in the ranking", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);

    fireEvent.click(screen.getAllByText("Real Hook")[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders seed insights marked as validated", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("El Reel gana alcance, pero se pierde el mensaje")).toBeInTheDocument();
    expect(screen.getAllByText("Validado con datos reales").length).toBeGreaterThan(0);
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
