import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

// ═══════════════════════════════════════
// Onboarding Tests
// ═══════════════════════════════════════

describe("Onboarding Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exports Onboarding component", async () => {
    const mod = await import("@/components/Onboarding");
    expect(mod.Onboarding).toBeDefined();
    expect(typeof mod.Onboarding).toBe("function");
  });
});

// ═══════════════════════════════════════
// ErrorBoundary Tests
// ═══════════════════════════════════════

describe("ErrorBoundary Component", () => {
  it("renders children when no error", async () => {
    const { ErrorBoundary } = await import("@/components/ErrorBoundary");
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders fallback when error occurs", async () => {
    const { ErrorBoundary } = await import("@/components/ErrorBoundary");

    const ThrowError = () => {
      throw new Error("Test error");
    };

    // Suppress console.error for this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("Reintentar")).toBeInTheDocument();

    spy.mockRestore();
  });
});

// ═══════════════════════════════════════
// ConfirmDialog Tests
// ═══════════════════════════════════════

describe("ConfirmDialog Component", () => {
  it("exports ConfirmDialog component", async () => {
    const mod = await import("@/components/ConfirmDialog");
    expect(mod.ConfirmDialog).toBeDefined();
    expect(typeof mod.ConfirmDialog).toBe("function");
  });
});


// ═══════════════════════════════════════
// AI Service Additional Tests
// ═══════════════════════════════════════

describe("AI Service — additional", () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
    mockFetch.mockReset();
  });

  it("processDocument sends correct documentId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ documentId: "abc", chunksCreated: 3, totalTokens: 50 }),
    });

    const { processDocument } = await import("@/services/ai");
    await processDocument("abc");

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.action).toBe("process");
    expect(callBody.documentId).toBe("abc");
  });
});

// ═══════════════════════════════════════
// Supabase Service — Additional CRUD Tests
// ═══════════════════════════════════════

const { mockFrom: mockFrom2, mockStorageFrom: mockStorageFrom2 } = vi.hoisted(() => {
  const chain = () => {
    const obj: Record<string, unknown> = {};
    const methods = ["select", "eq", "order", "single", "limit", "insert", "update", "delete"];
    methods.forEach((m) => {
      obj[m] = vi.fn(() => obj);
    });
    return obj;
  };

  return {
    mockFrom: vi.fn(() => chain()),
    mockStorageFrom: vi.fn(() => ({
      upload: vi.fn(),
      remove: vi.fn(),
      download: vi.fn(),
    })),
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: mockFrom2,
    storage: { from: mockStorageFrom2 },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

describe("Supabase Service — CRUD operations", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
    mockFrom2.mockClear();
    mockStorageFrom2.mockClear();
  });

  it("documentsApi.get calls eq('id', id)", async () => {
    const { documentsApi } = await import("@/services/supabase");
    const chain = documentsApi.get("test-id");
    expect(mockFrom2).toHaveBeenCalledWith("documents");
    expect(chain.eq).toHaveBeenCalledWith("id", "test-id");
    expect(chain.single).toHaveBeenCalled();
  });

  it("dialogueApi.getMessages calls eq + order", async () => {
    const { dialogueApi } = await import("@/services/supabase");
    const chain = dialogueApi.getMessages("session-123");
    expect(mockFrom2).toHaveBeenCalledWith("dialogue_messages");
    expect(chain.eq).toHaveBeenCalledWith("session_id", "session-123");
  });

  it("proposalsApi.approve calls update with status", async () => {
    const { proposalsApi } = await import("@/services/supabase");
    const chain = proposalsApi.approve("prop-123");
    expect(mockFrom2).toHaveBeenCalledWith("proposals");
    expect(chain.update).toHaveBeenCalledWith({ status: "approved" });
    expect(chain.eq).toHaveBeenCalledWith("id", "prop-123");
  });

  it("proposalsApi.reject includes rejection reason", async () => {
    const { proposalsApi } = await import("@/services/supabase");
    const chain = proposalsApi.reject("prop-123", "Off brand");
    expect(mockFrom2).toHaveBeenCalledWith("proposals");
    expect(chain.update).toHaveBeenCalledWith({ status: "rejected", rejection_reason: "Off brand" });
  });

  it("proposalsApi.schedule sets status and date", async () => {
    const { proposalsApi } = await import("@/services/supabase");
    const chain = proposalsApi.schedule("prop-123", "2026-05-01T10:00:00Z");
    expect(mockFrom2).toHaveBeenCalledWith("proposals");
    expect(chain.update).toHaveBeenCalledWith({ status: "scheduled", scheduled_at: "2026-05-01T10:00:00Z" });
  });
});

// ═══════════════════════════════════════
// Calendario Page Tests
// ═══════════════════════════════════════

describe("Calendario Page", () => {
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

  it("renders the heading", async () => {
    const { default: Calendario } = await import("@/pages/Calendario");
    renderWithProviders(<Calendario />);
    expect(screen.getByText("Calendario Editorial")).toBeInTheDocument();
  });

  it("renders real drag-and-drop rescheduling copy, not the old read-only text", async () => {
    // Texto ajustado 2026-08-25 (auditoría real: la pista de "arrastrar"
    // no aplica en mobile, donde el drag-and-drop HTML5 no funciona) —
    // sigue mencionando la reprogramación por arrastre en pantallas
    // grandes, ya no como única forma de hacerlo.
    const { default: Calendario } = await import("@/pages/Calendario");
    renderWithProviders(<Calendario />);
    expect(screen.getByText(/se puede arrastrar a otro día/i)).toBeInTheDocument();
  });

  it("renders month/week view toggle", async () => {
    const { default: Calendario } = await import("@/pages/Calendario");
    renderWithProviders(<Calendario />);
    expect(screen.getByRole("button", { name: "Mensual" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semanal" })).toBeInTheDocument();
  });

  it("renders weekday headers", async () => {
    const { default: Calendario } = await import("@/pages/Calendario");
    renderWithProviders(<Calendario />);
    // Calendar renders month/year header — se arma para el mes actual en vez
    // de una fecha hardcodeada, que quedaba vieja apenas pasaba el mes.
    const currentMonthYear = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date());
    expect(screen.getByText(new RegExp(currentMonthYear, "i"))).toBeInTheDocument();
  });

  it("renders upcoming section", async () => {
    const { default: Calendario } = await import("@/pages/Calendario");
    renderWithProviders(<Calendario />);
    expect(screen.getByText("Próximos 7 días")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════
// Propuestas Page Tests
// ═══════════════════════════════════════

describe("Propuestas Page", () => {
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

  it("renders the heading", async () => {
    const { default: Propuestas } = await import("@/pages/Propuestas");
    renderWithProviders(<Propuestas />);
    expect(screen.getByText("Propuestas de Contenido")).toBeInTheDocument();
  });

  it("renders tabs", async () => {
    const { default: Propuestas } = await import("@/pages/Propuestas");
    renderWithProviders(<Propuestas />);
    expect(screen.getByText("Pendientes")).toBeInTheDocument();
    expect(screen.getByText("Aprobadas")).toBeInTheDocument();
    expect(screen.getByText("Programadas")).toBeInTheDocument();
    expect(screen.getByText("Todas")).toBeInTheDocument();
  });
});
