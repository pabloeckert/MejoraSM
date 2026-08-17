import { describe, it, expect, vi, beforeEach } from "vitest";

// ═══════════════════════════════════════
// AI Service Tests
// ═══════════════════════════════════════

describe("AI Service", () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
    mockFetch.mockReset();
  });

  it("startDialogue sends correct action", async () => {
    const mockResponse = {
      sessionId: "abc-123",
      estrategia: "test strategy",
      contenido: "test content",
      evaluacion: { aprobado: true, feedback: "good" },
      proposal: { hook: "hook", body: "body", cta: "cta", hashtags: ["#test"], format: "post" },
      aprobado: true,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { startDialogue } = await import("@/services/ai");
    const result = await startDialogue("marketing digital");

    expect(result.sessionId).toBe("abc-123");
    expect(result.aprobado).toBe(true);
  });

  it("processDocument returns document stats", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ documentId: "doc-1", chunksCreated: 5, totalTokens: 100 }),
    });

    const { processDocument } = await import("@/services/ai");
    const result = await processDocument("doc-1");

    expect(result.chunksCreated).toBe(5);
  });
});

// ═══════════════════════════════════════
// Supabase Service Tests
// ═══════════════════════════════════════

// Use vi.hoisted so mocks are available when vi.mock is hoisted
const { mockFrom, mockStorageFrom } = vi.hoisted(() => {
  const chain = () => {
    const obj: Record<string, any> = {};
    const methods = ["select", "eq", "order", "single", "limit", "insert", "update", "delete"];
    methods.forEach((m) => {
      obj[m] = vi.fn(() => obj);
    });
    return obj;
  };

  const mockFrom = vi.fn(() => chain());
  const mockStorageFrom = vi.fn(() => ({
    upload: vi.fn(),
    remove: vi.fn(),
  }));

  return { mockFrom, mockStorageFrom };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

describe("Supabase Service", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
    mockFrom.mockClear();
    mockStorageFrom.mockClear();
  });

  it("documentsApi.list calls from('documents')", async () => {
    const { documentsApi } = await import("@/services/supabase");
    documentsApi.list();
    expect(mockFrom).toHaveBeenCalledWith("documents");
  });

  it("dialogueApi.listSessions calls from('dialogue_sessions')", async () => {
    const { dialogueApi } = await import("@/services/supabase");
    dialogueApi.listSessions();
    expect(mockFrom).toHaveBeenCalledWith("dialogue_sessions");
  });

  it("proposalsApi.list calls from('proposals')", async () => {
    const { proposalsApi } = await import("@/services/supabase");
    proposalsApi.list();
    expect(mockFrom).toHaveBeenCalledWith("proposals");
  });

  it("metricsApi.latest calls from('metrics')", async () => {
    const { metricsApi } = await import("@/services/supabase");
    metricsApi.latest();
    expect(mockFrom).toHaveBeenCalledWith("metrics");
  });

});

// ═══════════════════════════════════════
// Hook Export Tests
// ═══════════════════════════════════════

describe("Hook exports", () => {
  it("useVault exports correct functions", async () => {
    const mod = await import("@/hooks/useVault");
    expect(mod.useDocuments).toBeDefined();
    expect(mod.useDocument).toBeDefined();
    expect(mod.useUploadDocument).toBeDefined();
    expect(mod.useDeleteDocument).toBeDefined();
    expect(typeof mod.useDocuments).toBe("function");
    expect(typeof mod.useUploadDocument).toBe("function");
  });

  it("useDialogue exports correct functions", async () => {
    const mod = await import("@/hooks/useDialogue");
    expect(mod.useDialogueSessions).toBeDefined();
    expect(mod.useDialogueSession).toBeDefined();
    expect(mod.useDialogueMessages).toBeDefined();
    expect(mod.useStartDialogue).toBeDefined();
    expect(mod.useContinueDialogue).toBeDefined();
    expect(typeof mod.useStartDialogue).toBe("function");
  });

  it("useProposals exports correct functions", async () => {
    const mod = await import("@/hooks/useProposals");
    expect(mod.useProposals).toBeDefined();
    expect(mod.usePendingProposals).toBeDefined();
    expect(mod.useApproveProposal).toBeDefined();
    expect(mod.useRejectProposal).toBeDefined();
    expect(mod.useScheduleProposal).toBeDefined();
  });

  it("useMetrics exports correct functions", async () => {
    const mod = await import("@/hooks/useMetrics");
    expect(mod.useLatestMetrics).toBeDefined();
    expect(mod.useAllMetrics).toBeDefined();
    expect(mod.useProposalMetrics).toBeDefined();
    expect(mod.useSuccessRules).toBeDefined();
  });
});
