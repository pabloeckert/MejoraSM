import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentRoiDashboard } from "../ContentRoiDashboard";
import type { InboxItem } from "@/services/supabase";

describe("ContentRoiDashboard Component (Sprint S+15)", () => {
  const mockInbox: InboxItem[] = [
    {
      id: "1",
      kind: "dm",
      platform: "instagram",
      thread_id: "t1",
      external_id: "m1",
      author_name: "Martín Benítez",
      author_username: "martinb",
      author_is_follower: true,
      text: "Hola, soy dueño de una distribuidora y estoy saturado de apagar incendios. Quiero coordinar una reunión de consultoría.",
      direction: "incoming",
      item_time: "2026-11-10T10:00:00Z",
      archived: false,
      attachment_url: null,
      sentiment: "pregunta",
      sentiment_note: null,
      replied_at: null,
    },
    {
      id: "2",
      kind: "comment",
      platform: "facebook",
      thread_id: "t2",
      external_id: "m2",
      author_name: "Lucía Morales",
      author_username: "luciam",
      author_is_follower: true,
      text: "Excelente enfoque para ordenar procesos y calidad.",
      direction: "incoming",
      item_time: "2026-11-11T12:00:00Z",
      archived: false,
      attachment_url: null,
      sentiment: "positivo",
      sentiment_note: null,
      replied_at: null,
    },
  ];

  it("renderiza correctamente el título institucional y los 4 KPIs superiores", () => {
    render(
      <ContentRoiDashboard
        inboxItems={mockInbox}
        proposalsCount={26}
        totalImpressions={45000}
        totalClicks={1200}
      />
    );

    // Título y Badges
    expect(screen.getByText(/CONTENT ROI & FUNNEL B2B/i)).toBeInTheDocument();
    expect(screen.getByText(/Retorno de Inversión Editorial y Embudo de Conversión/i)).toBeInTheDocument();
    expect(screen.getByText(/Peter Drucker & Marty Cagan/i)).toBeInTheDocument();

    // 4 Tarjetas de Negocio
    expect(screen.getByText(/Pipeline B2B Activo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Decisores Calificados/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Conversión Click-to-Lead/i)).toBeInTheDocument();
    expect(screen.getByText(/Lead-to-Propuesta/i)).toBeInTheDocument();
  });

  it("renderiza las 7 etapas del embudo de trinchera y los 4 arquetipos", () => {
    render(<ContentRoiDashboard inboxItems={mockInbox} />);

    // Etapas del embudo
    expect(screen.getByText(/Publicaciones & Alcance/i)).toBeInTheDocument();
    expect(screen.getByText(/Clicks con Atribución UTM/i)).toBeInTheDocument();
    expect(screen.getByText(/Conversaciones & Leads/i)).toBeInTheDocument();
    expect(screen.getByText(/Acuerdos de Alcance B2B/i)).toBeInTheDocument();

    // Arquetipos de dolor
    expect(screen.getAllByText(/Dueño Atrapado en la Operación/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2da Generación \/ Transición/i)).toBeInTheDocument();
    expect(screen.getByText(/Ventas Intuitivas \/ Sin Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Fricción de Calidad y Retrabajos/i)).toBeInTheDocument();

    // Diagnóstico estratégico
    expect(screen.getByText(/Diagnóstico Estratégico de Embudo/i)).toBeInTheDocument();
    expect(screen.getByText(/Acción de Trinchera Recomendada:/i)).toBeInTheDocument();
  });

  it("permite conmutar entre los filtros de período (Últimos 30 Días, Trimestre, Histórico)", () => {
    render(<ContentRoiDashboard inboxItems={mockInbox} />);

    // Por defecto: Últimos 30 Días
    expect(screen.getByText(/Período:/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Últimos 30 Días/i })).toBeInTheDocument();

    // Clic en Trimestre (90D)
    const btnTrimestre = screen.getByRole("button", { name: /Trimestre \(90D\)/i });
    fireEvent.click(btnTrimestre);
    expect(screen.getByText("Trimestre Actual (90 Días)")).toBeInTheDocument();

    // Clic en Histórico
    const btnHistorico = screen.getByRole("button", { name: /Histórico/i });
    fireEvent.click(btnHistorico);
    expect(screen.getByText("Histórico Consolidado")).toBeInTheDocument();
  });
});
