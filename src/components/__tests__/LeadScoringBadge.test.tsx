// src/components/__tests__/LeadScoringBadge.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadScoringBadge } from "../LeadScoringBadge";
import { calcularLeadScoring } from "@/domain/leadScoringEngine";

describe("LeadScoringBadge Component", () => {
  it("renders a hot lead badge with SLA <2h and Decisor Calificado", () => {
    const scoring = calcularLeadScoring({
      nombreRemitente: "Marcos",
      cargoRemitente: "Dueño",
      textoMensaje: "Tenemos un cuello de botella grave en planta y queremos pedir presupuesto de consultoría.",
    });

    render(<LeadScoringBadge scoring={scoring} />);

    expect(screen.getByText(/pts/i)).toBeInTheDocument();
    expect(screen.getByText(/· Decisor Calificado/i)).toBeInTheDocument();
    expect(screen.getByText(/SLA <2h/i)).toBeInTheDocument();
  });

  it("renders a nutrition lead badge with SLA <24h", () => {
    const scoring = calcularLeadScoring({
      nombreRemitente: "Lucía",
      cargoRemitente: "Coordinadora",
      textoMensaje: "¿Qué recomiendan para ordenar los procedimientos internos?",
    });

    render(<LeadScoringBadge scoring={scoring} />);

    expect(screen.getByText(/· En Nutrición/i)).toBeInTheDocument();
    expect(screen.getByText(/SLA <24h/i)).toBeInTheDocument();
  });

  it("renders a community lead badge with SLA <48h", () => {
    const scoring = calcularLeadScoring({
      nombreRemitente: "Pedro",
      textoMensaje: "Buenísimo el contenido!",
    });

    render(<LeadScoringBadge scoring={scoring} />);

    expect(screen.getByText(/· Comunidad/i)).toBeInTheDocument();
    expect(screen.getByText(/SLA <48h/i)).toBeInTheDocument();
  });
});
