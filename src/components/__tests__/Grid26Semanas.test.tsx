import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Grid26Semanas } from "../Grid26Semanas";
import { PropuestaMejoraSMDTO } from "@/domain/types";

const mockPropuestas: PropuestaMejoraSMDTO[] = [
  {
    propuesta_id: "PROP-2026-W01-01",
    dia_programado: "2026-10-19T09:30:00.000Z",
    canal_destino: "linkedin",
    origen_boveda_id: "BOV-2026-NET-001",
    estado: "pendiente_revision",
    borrador_seleccionado: "A",
    borradores: [
      {
        opcion: "A",
        estrategia: "jab_educativo",
        tipo_formato: "carrusel_pdf",
        titulo_portada: "El cuello de botella sos vos (A)",
        copy_tres_pasos: {
          paso1_dolor: "Tu empresa depende de que estés en todo.",
          paso2_reencuadre: "Sin procesos, no sos dueño: sos empleado.",
          paso3_direccion_web: "mejoraok.com/diagnostico",
        },
        cuerpo_texto: "Cuerpo A",
        cta_texto: "CTA A",
      },
      {
        opcion: "B",
        estrategia: "networking_prueba_social",
        tipo_formato: "post_autoridad",
        titulo_portada: "Mesa C-Level en Rosario (B)",
        copy_tres_pasos: {
          paso1_dolor: "La soledad del director en la toma de decisiones.",
          paso2_reencuadre: "Espacios de gobierno corporativo real.",
          paso3_direccion_web: "mejoraok.com/after-office",
        },
        cuerpo_texto: "Cuerpo B",
        cta_texto: "CTA B",
      },
      {
        opcion: "C",
        estrategia: "right_hook_conversion",
        tipo_formato: "post_directo",
        titulo_portada: "Evaluá tu madurez operativa en 10 min (C)",
        copy_tres_pasos: {
          paso1_dolor: "¿Sabés exactamente cuánto dinero perdés por desorden?",
          paso2_reencuadre: "El diagnóstico de 4 dimensiones te da la foto real.",
          paso3_direccion_web: "mejoraok.com/test",
        },
        cuerpo_texto: "Cuerpo C",
        cta_texto: "CTA C",
      },
    ],
    tratamiento_visual: {
      marco_expandido_requerido: true,
      color_fondo_marco: "#FFFFFF",
      regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
      relacion_aspecto_destino: "4:5",
    },
    imagen_boveda_vinculada: {
      id: "BOV-2026-NET-001",
      ruta_archivo_local: "content/boveda/04_networking/img_clevel_rosario_2026.jpg",
      titulo: "Mesa C-Level",
    },
  },
  {
    propuesta_id: "PROP-2026-W01-02",
    dia_programado: "2026-10-21T09:30:00.000Z",
    canal_destino: "whatsapp",
    origen_boveda_id: "BOV-2026-NET-001",
    estado: "aprobado",
    borrador_seleccionado: "A",
    borradores: [
      {
        opcion: "A",
        estrategia: "right_hook_conversion",
        tipo_formato: "post_directo",
        titulo_portada: "Right Hook de Conversión (A)",
        copy_tres_pasos: {
          paso1_dolor: "Dolor conversión",
          paso2_reencuadre: "Reencuadre conversión",
          paso3_direccion_web: "mejoraok.com",
        },
        cuerpo_texto: "Cuerpo RH",
        cta_texto: "CTA RH",
      },
      {
        opcion: "B",
        estrategia: "networking_prueba_social",
        tipo_formato: "post_autoridad",
        titulo_portada: "Borrador B",
        copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
        cuerpo_texto: "C",
        cta_texto: "CTA",
      },
      {
        opcion: "C",
        estrategia: "jab_educativo",
        tipo_formato: "carrusel_pdf",
        titulo_portada: "Borrador C",
        copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
        cuerpo_texto: "C",
        cta_texto: "CTA",
      },
    ],
    tratamiento_visual: {
      marco_expandido_requerido: true,
      color_fondo_marco: "#FFFFFF",
      regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
      relacion_aspecto_destino: "4:5",
    },
    imagen_boveda_vinculada: {
      id: "BOV-2026-NET-001",
      ruta_archivo_local: "content/boveda/04_networking/img_clevel_rosario_2026.jpg",
      titulo: "Mesa C-Level",
    },
  },
];


describe("Grid26Semanas Component", () => {
  it("renderiza las piezas de la grilla con sus identificadores y formatos", () => {
    render(
      <Grid26Semanas
        proposals={mockPropuestas}
        activeWeek={1}
        onApprove={vi.fn()}
        onPublish={vi.fn()}
        onSelectDraft={vi.fn()}
        onOpenDetail={vi.fn()}
      />
    );

    expect(screen.getByText("PROP-2026-W01-01")).toBeInTheDocument();
    expect(screen.getByText("PROP-2026-W01-02")).toBeInTheDocument();
    expect(screen.getByText("El cuello de botella sos vos (A)")).toBeInTheDocument();
    expect(screen.getByText("Jab (80%)")).toBeInTheDocument();
    expect(screen.getByText("Right Hook (20%)")).toBeInTheDocument();
  });

  it("renderiza el Framing Engine visual con la barra tricolor y la regla blur(28px)", () => {
    const { container } = render(
      <Grid26Semanas
        proposals={mockPropuestas}
        activeWeek={1}
        onApprove={vi.fn()}
        onPublish={vi.fn()}
        onSelectDraft={vi.fn()}
        onOpenDetail={vi.fn()}
      />
    );

    // Barra tricolor institucional presente
    const brandBars = container.querySelectorAll(".brand-bar");
    expect(brandBars.length).toBe(2);

    // Contenedor con blur(28px) de fondo
    const blurBackdrops = container.querySelectorAll("[style*='blur(28px)']");
    expect(blurBackdrops.length).toBeGreaterThan(0);

    // Badge 0% recorte presente
    expect(screen.getAllByText(/Marco 4:5 · 0% Recorte/i).length).toBe(2);
  });

  it("permite conmutar la relación de aspecto en el Framing Engine (4:5, 1:1, 9:16) en tiempo real", () => {
    render(
      <Grid26Semanas
        proposals={mockPropuestas}
        activeWeek={1}
        onApprove={vi.fn()}
        onPublish={vi.fn()}
        onSelectDraft={vi.fn()}
        onOpenDetail={vi.fn()}
      />
    );

    // Cambiar a 1:1
    const boton11 = screen.getAllByRole("button", { name: "Cambiar formato a 1:1" })[0];
    fireEvent.click(boton11);

    expect(screen.getByText("Marco 1:1 · 0% Recorte")).toBeInTheDocument();

    // Cambiar a 9:16
    const boton916 = screen.getAllByRole("button", { name: "Cambiar formato a 9:16" })[0];
    fireEvent.click(boton916);

    expect(screen.getByText("Marco 9:16 · 0% Recorte")).toBeInTheDocument();
  });

  it("permite seleccionar borradores paralelos (A, B, C) llamando al handler correspondiente", () => {
    const onSelectDraft = vi.fn();
    render(
      <Grid26Semanas
        proposals={mockPropuestas}
        activeWeek={1}
        onApprove={vi.fn()}
        onPublish={vi.fn()}
        onSelectDraft={onSelectDraft}
        onOpenDetail={vi.fn()}
      />
    );

    const botonB = screen.getByRole("button", { name: "Seleccionar borrador B para PROP-2026-W01-01" });
    fireEvent.click(botonB);

    expect(onSelectDraft).toHaveBeenCalledWith("PROP-2026-W01-01", "B");
  });

  it("emite aprobación y publicación al pulsar los botones correspondientes", () => {
    const onApprove = vi.fn();
    const onPublish = vi.fn();

    render(
      <Grid26Semanas
        proposals={mockPropuestas}
        activeWeek={1}
        onApprove={onApprove}
        onPublish={onPublish}
        onSelectDraft={vi.fn()}
        onOpenDetail={vi.fn()}
      />
    );

    // Aprobar pieza pendiente
    const botonAprobar = screen.getByRole("button", { name: "Aprobar pieza PROP-2026-W01-01" });
    fireEvent.click(botonAprobar);
    expect(onApprove).toHaveBeenCalledWith("PROP-2026-W01-01");

    // Publicar pieza aprobada
    const botonPublicar = screen.getByRole("button", { name: "Publicar pieza PROP-2026-W01-02" });
    fireEvent.click(botonPublicar);
    expect(onPublish).toHaveBeenCalledWith("PROP-2026-W01-02");
  });
});
