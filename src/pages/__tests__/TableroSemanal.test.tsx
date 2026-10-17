import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TableroSemanal from "../TableroSemanal";

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

function renderTablero() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <TableroSemanal />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("TableroSemanal (Mesa de Revisión y Control)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el título institucional y métricas de la grilla evergreen", () => {
    renderTablero();

    expect(screen.getByText("Mesa de Revisión y Control — MejoraSM")).toBeInTheDocument();
    expect(screen.getByText("Modo Local Soberano (SQLite Activo)")).toBeInTheDocument();
    expect(screen.getAllByText(/26 Semanas/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Semana 1 de 26/i)).toBeInTheDocument();
  });

  it("muestra las piezas de la semana activa con el copy en 3 pasos (Dolor, Reencuadre, Dirección)", () => {
    renderTablero();

    expect(screen.getAllByText(/1\. Dolor/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\. Reencuadre/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3\. Dirección/i).length).toBeGreaterThan(0);
  });

  it("abre el diálogo ProposalDetailDialog al hacer clic en Revisar / Editar", () => {
    renderTablero();

    const botonesRevisar = screen.getAllByText(/Revisar \/ Editar/i);
    expect(botonesRevisar.length).toBeGreaterThan(0);

    fireEvent.click(botonesRevisar[0]);

    // Modal ProposalDetailDialog abierto con los 3 borradores
    expect(screen.getByText("Borradores Disponibles de la IA (3 Opciones Paralelas)")).toBeInTheDocument();
    expect(screen.getByText("Opción A")).toBeInTheDocument();
    expect(screen.getByText("Opción B")).toBeInTheDocument();
    expect(screen.getByText("Opción C")).toBeInTheDocument();
  });

  it("aprueba una propuesta individualmente desde la tarjeta cambiando el badge a Aprobada al instante", () => {
    renderTablero();

    const botonesAprobar = screen.getAllByRole("button", { name: /Aprobar pieza/i });
    expect(botonesAprobar.length).toBeGreaterThan(0);

    fireEvent.click(botonesAprobar[0]);

    // La tarjeta pasa a estado Aprobada
    expect(screen.getAllByText("Aprobada").length).toBeGreaterThan(0);
  });

  it("aprueba el lote completo de la semana activa desde el botón global de lote", () => {
    renderTablero();

    const botonLote = screen.getByText(/Aprobar Lote Completo/i);
    fireEvent.click(botonLote);

    // Diálogo de confirmación
    const botonConfirmar = screen.getByText("Confirmar Aprobación de Lote");
    fireEvent.click(botonConfirmar);

    // Todas las piezas de la semana quedan aprobadas
    const aprobadas = screen.getAllByText("Aprobada");
    expect(aprobadas.length).toBeGreaterThanOrEqual(3);
  });
});
