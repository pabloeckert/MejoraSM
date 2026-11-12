// src/components/__tests__/LinkedInThreadPreview.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LinkedInThreadPreview } from "../LinkedInThreadPreview";
import { LinkedInThreadInput } from "@/domain/linkedinThreadEngine";

describe("LinkedInThreadPreview Component (Sprint S+8)", () => {
  const sampleInput: LinkedInThreadInput = {
    propuesta_id: "PROP-2026-W01-01",
    tema: "Delegación y cuellos de botella",
    titulo_portada: "El cuello de botella sos vos",
    copy_tres_pasos: {
      paso1_dolor: "Tus mandos medios no deciden solos. Todo termina en tu WhatsApp.",
      paso2_reencuadre: "No es falta de compromiso de la gente: es ausencia de una matriz de delegación.",
      paso3_direccion_web: "mejoraok.com",
    },
    url_diagnostico_trazable: "https://mejoraok.com/diagnostico?utm_source=linkedin&utm_medium=organic_social&utm_campaign=empresario_saturado",
    arquetipo_target: "fundador_saturado",
    es_right_hook: false,
  };

  beforeEach(() => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it("renderiza el badge institucional de LinkedIn y la protección Zero-Penalty Reach", () => {
    render(<LinkedInThreadPreview input={sampleInput} />);

    expect(screen.getByText("LinkedIn Thought Leadership")).toBeInTheDocument();
    expect(screen.getByText(/Zero-Penalty Reach:/i)).toBeInTheDocument();
    expect(screen.getByText(/0 Links en Post/i)).toBeInTheDocument();
    expect(screen.getAllByText("Mejora Continua").length).toBeGreaterThanOrEqual(1);
  });

  it("muestra el post principal limpio sin URLs externas", () => {
    render(<LinkedInThreadPreview input={sampleInput} />);

    expect(screen.getByText("El cuello de botella sos vos")).toBeInTheDocument();
    expect(
      screen.getByText("Tus mandos medios no deciden solos. Todo termina en tu WhatsApp.")
    ).toBeInTheDocument();
    expect(screen.getByText("… ver más")).toBeInTheDocument();
  });

  it("permite expandir el cuerpo del post ('… ver más')", () => {
    render(<LinkedInThreadPreview input={sampleInput} />);

    const expandBtn = screen.getByText("… ver más");
    fireEvent.click(expandBtn);

    expect(screen.getByText("ver menos")).toBeInTheDocument();
    expect(screen.getByText(/directores generales y dueños de PyMEs/i)).toBeInTheDocument();
    expect(screen.getByText(/#Liderazgo/i)).toBeInTheDocument();
  });

  it("renderiza el 1er comentario estratégico con el link de conversión y el badge de Autor", () => {
    render(<LinkedInThreadPreview input={sampleInput} />);

    expect(
      screen.getByText("Hilo de Conversación Directiva C-Level")
    ).toBeInTheDocument();
    expect(screen.getByText(/Dwell Time ~/i)).toBeInTheDocument();
    expect(screen.getByText("📌 Comentario de Conversión")).toBeInTheDocument();

    // Link UTM presente en el primer comentario
    expect(screen.getByText(/mejoraok.com\/diagnostico/i)).toBeInTheDocument();
  });

  it("renderiza las réplicas del debate C-Level simulado con perfiles directivos", () => {
    render(<LinkedInThreadPreview input={sampleInput} />);

    expect(screen.getByText("Ing. Martín Rossi")).toBeInTheDocument();
    expect(screen.getByText(/Director General · Rossi Metalúrgica/i)).toBeInTheDocument();
    expect(screen.getByText("Lic. Valeria Benítez")).toBeInTheDocument();
    expect(screen.getByText(/Gerente de Operaciones/i)).toBeInTheDocument();
  });

  it("permite copiar el post principal y el primer comentario al portapapeles", () => {
    render(<LinkedInThreadPreview input={sampleInput} />);

    const copyPostBtn = screen.getByRole("button", { name: /Copiar Post/i });
    fireEvent.click(copyPostBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    const copyCommentBtn = screen.getByRole("button", {
      name: /Copiar 1er Comentario/i,
    });
    fireEvent.click(copyCommentBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
