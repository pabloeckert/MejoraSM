// src/components/__tests__/SlaAuditSection.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SlaAuditSection } from "../SlaAuditSection";
import * as contactosService from "@/services/contactosService";

describe("SlaAuditSection (Widget de Auditoría de SLAs B2B)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <SlaAuditSection />
      </QueryClientProvider>
    );

  it("renderiza el título institucional y métricas de semáforo", async () => {
    vi.spyOn(contactosService, "obtenerAuditoriaSlaCRM").mockResolvedValue({
      total_capturados: 3,
      pendientes_atencion: 2,
      en_tiempo: 1,
      proximo_vencer: 1,
      vencidos: 0,
      calificados_en_sla: 1,
      calificados_fuera_sla: 0,
      cumplimiento_pct: 100,
      tiempo_promedio_atencion_horas: 14.5,
      prospectos: [
        {
          prospecto_id: "lead-abc-12345678",
          email: "carlos@fundador.com",
          nombre: "Carlos Fundador",
          telefono: "+54 11 5555-1234",
          empresa: "Metalúrgica SA",
          estado: "CAPTURADO",
          origen_utm: "linkedin/social/q4",
          pieza_id_atribucion: "PZ-LI-014",
          perfil_detectado_id: "saturado",
          fecha_captura: "2026-11-11T10:00:00.000Z",
          fecha_actualizacion: "2026-11-11T10:00:00.000Z",
          sla_limite_calificacion: "2026-11-13T10:00:00.000Z",
          horas_transcurridas: 8,
          horas_restantes: 40,
          estado_sla: "en_tiempo",
          atendido_en_sla: null,
        },
      ],
    });

    renderComponent();

    expect(
      screen.getByText(/Auditoría de SLAs de Conversión B2B/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/SLA Máx: 48 Horas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Carlos Fundador")).toBeInTheDocument();
      expect(screen.getByText(/Metalúrgica SA/i)).toBeInTheDocument();
      expect(screen.getByText("PZ-LI-014")).toBeInTheDocument();
      expect(screen.getAllByText(/En Tiempo/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Calificar/i)).toBeInTheDocument();
    });
  });

  it("permite hacer clic en 'Calificar' para detener el reloj de SLA", async () => {
    vi.spyOn(contactosService, "obtenerAuditoriaSlaCRM").mockResolvedValue({
      total_capturados: 1,
      pendientes_atencion: 1,
      en_tiempo: 1,
      proximo_vencer: 0,
      vencidos: 0,
      calificados_en_sla: 0,
      calificados_fuera_sla: 0,
      cumplimiento_pct: 100,
      tiempo_promedio_atencion_horas: 0,
      prospectos: [
        {
          prospecto_id: "lead-qualify-test",
          email: "ana@directora.com",
          nombre: "Ana Directora",
          telefono: null,
          empresa: null,
          estado: "CAPTURADO",
          origen_utm: "instagram",
          pieza_id_atribucion: "PZ-IG-020",
          perfil_detectado_id: "esceptico",
          fecha_captura: "2026-11-11T10:00:00.000Z",
          fecha_actualizacion: "2026-11-11T10:00:00.000Z",
          sla_limite_calificacion: "2026-11-13T10:00:00.000Z",
          horas_transcurridas: 12,
          horas_restantes: 36,
          estado_sla: "en_tiempo",
          atendido_en_sla: null,
        },
      ],
    });

    const calificarSpy = vi
      .spyOn(contactosService, "calificarProspectoCRM")
      .mockResolvedValue(true);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Ana Directora")).toBeInTheDocument();
    });

    const btnCalificar = screen.getByRole("button", { name: /Calificar/i });
    fireEvent.click(btnCalificar);

    await waitFor(() => {
      expect(calificarSpy).toHaveBeenCalledWith("lead-qualify-test");
    });
  });
});
