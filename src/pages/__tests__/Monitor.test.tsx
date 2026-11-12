// src/pages/__tests__/Monitor.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import Monitor from "../Monitor";
import * as contactosService from "@/services/contactosService";

describe("Monitor Page (Un Solo Panel SRE & SLA)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Monitor />
        </BrowserRouter>
      </QueryClientProvider>
    );

  it("renderiza el título del monitor y el widget de auditoría de SLAs B2B", async () => {
    vi.spyOn(contactosService, "obtenerAuditoriaSlaCRM").mockResolvedValue({
      total_capturados: 2,
      pendientes_atencion: 1,
      en_tiempo: 1,
      proximo_vencer: 0,
      vencidos: 0,
      calificados_en_sla: 1,
      calificados_fuera_sla: 0,
      cumplimiento_pct: 100,
      tiempo_promedio_atencion_horas: 16,
      prospectos: [],
    });

    renderPage();

    expect(screen.getByText(/Monitor de stories y posts/i)).toBeInTheDocument();
    expect(screen.getByText(/Auditoría de SLAs de Conversión B2B/i)).toBeInTheDocument();
    expect(screen.getByText(/SLA Máx: 48 Horas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Cumplimiento Global/i)).toBeInTheDocument();
      expect(screen.getByText(/En Tiempo \(<24h\)/i)).toBeInTheDocument();
    });
  });
});
