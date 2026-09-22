import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContentFormatModal, type SelectedPhotoItem } from "@/components/ContentFormatModal";

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
    getTextFile: vi.fn().mockResolvedValue("<html><body>{{HEADLINE}} - {{LAYOUT}}</body></html>"),
    rawUrl: (p: string) => `https://example.com/${p}`,
  },
}));

vi.mock("@/services/supabase", () => ({
  proposalsApi: {
    create: vi.fn().mockResolvedValue({ data: { id: "prop-new" }, error: null }),
  },
}));

const mockPhotos: SelectedPhotoItem[] = [
  {
    id: "content/inbox/organizacional/photo-1.jpg",
    name: "photo-1.jpg",
    url: "https://example.com/photo-1.jpg",
    dimension: "organizacional",
    situation: "Taller/Equipo",
    operationalTitle: "Desconexión entre Ventas y Producción",
    trenchPain: "Fricción en plazos y entrega.",
  },
  {
    id: "content/inbox/organizacional/photo-2.jpg",
    name: "photo-2.jpg",
    url: "https://example.com/photo-2.jpg",
    dimension: "organizacional",
    situation: "Pizarra/Esquema",
    operationalTitle: "Flujo de Valor",
    trenchPain: "Cuellos de botella.",
  },
];

function renderModal(props: { open: boolean; photos?: SelectedPhotoItem[] }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <ContentFormatModal
          open={props.open}
          onOpenChange={vi.fn()}
          photos={props.photos || mockPhotos}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("ContentFormatModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders format selector with Story, Post de Feed and Carrusel", () => {
    renderModal({ open: true });

    expect(screen.getByText("Crear Contenido con Fotos Reales")).toBeInTheDocument();
    expect(screen.getByText("Story Vertical")).toBeInTheDocument();
    expect(screen.getByText("Post de Feed")).toBeInTheDocument();
    expect(screen.getByText("Carrusel B2B")).toBeInTheDocument();
  });

  it("renders all 5 visual layout options under MejoraSM identity", () => {
    renderModal({ open: true });

    expect(screen.getByText("Layout 1: Full Bleed")).toBeInTheDocument();
    expect(screen.getByText("Layout 2: Foto destacada")).toBeInTheDocument();
    expect(screen.getByText("Layout 3: Doble Foco")).toBeInTheDocument();
    expect(screen.getByText("Layout 4: Mosaico Tríptico")).toBeInTheDocument();
    expect(screen.getByText("Layout 5: Collage Multiequipo")).toBeInTheDocument();
  });

  it("pre-loads operational title and trench pain from selected photo", () => {
    renderModal({ open: true });

    const headlineInput = screen.getByLabelText(/Título Operativo/i) as HTMLInputElement;
    const subtextInput = screen.getByLabelText(/Dolor de Trinchera/i) as HTMLTextAreaElement;

    expect(headlineInput.value).toBe("Desconexión entre Ventas y Producción");
    expect(subtextInput.value).toBe("Fricción en plazos y entrega.");
  });

  it("navigates to Mesa Ejecutiva with prefilled parameters on click", () => {
    renderModal({ open: true });

    const sendBtn = screen.getByRole("button", { name: /Enviar a Mesa Ejecutiva/i });
    fireEvent.click(sendBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/mesa",
      expect.objectContaining({
        state: expect.objectContaining({
          source: "real_photos_pipeline",
          format: "post",
          operationalTitle: "Desconexión entre Ventas y Producción",
          photoCount: 2,
        }),
      })
    );
  });
});
