import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import SubirMaterial from "@/pages/SubirMaterial";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/services/github", () => ({
  github: {
    rawUrl: (p: string) => `https://example.com/${p}`,
    commitPhoto: vi.fn().mockResolvedValue({ ok: true }),
    putJsonFile: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

vi.mock("@/hooks/useGithubUpload", () => ({
  useDirListing: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  usePhotoUpload: () => ({
    uploads: [],
    uploadFiles: vi.fn(),
    retryUpload: vi.fn(),
    clearUploads: vi.fn(),
  }),
}));

vi.mock("@/services/ai", () => ({
  suggestPhotoDimension: vi.fn().mockResolvedValue({ dimension: "organizacional" }),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <SubirMaterial />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("SubirMaterial Page", () => {
  it("renders heading and navigation links", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Subir material" })).toBeInTheDocument();
    expect(screen.getByText(/Ver historial en el Monitor/i)).toBeInTheDocument();
  });

  it("renders the Instantánea de Trabajo (Trinchera Operativa) card", () => {
    renderPage();
    expect(screen.getByText("Instantánea de Trabajo")).toBeInTheDocument();
    expect(screen.getByText("Trinchera Operativa")).toBeInTheDocument();
    expect(screen.getByText(/Arrastrá una foto o captura acá/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contexto o nota operativa/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar e iniciar debate en Mesa/i })).toBeInTheDocument();
  });

  it("keeps the action button disabled if no file is selected", () => {
    renderPage();
    const actionBtn = screen.getByRole("button", { name: /Guardar e iniciar debate en Mesa/i });
    expect(actionBtn).toBeDisabled();
  });

  it("renders Sincronizar Google Drive button in the top action area", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Sincronizar Google Drive/i })).toBeInTheDocument();
  });

  it("renders dimension selectors for batch upload as well", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /Carga por lotes a biblioteca/i })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").length).toBeGreaterThanOrEqual(6);
  });
});
