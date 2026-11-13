import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomerSuccessModal } from "../CustomerSuccessModal";
import * as pdfService from "@/services/customerSuccessPdfGenerator";

describe("CustomerSuccessModal Component (Sprint S+16: StoryBrand & Social Proof)", () => {
  it("renderiza correctamente el modal con sus badges institucionales cuando está abierto", () => {
    render(
      <CustomerSuccessModal
        open={true}
        onOpenChange={() => {}}
        initialData={{ arquetipo: "fundador_saturado" }}
      />
    );

    expect(screen.getByText(/CASO DE ÉXITO & PRUEBA SOCIAL B2B/i)).toBeInTheDocument();
    expect(screen.getByText(/Donald Miller & Robert Cialdini/i)).toBeInTheDocument();
    expect(screen.getByText(/Prueba de Pares/i)).toBeInTheDocument();
    expect(screen.getByText(/De apagar incendios 14 horas al día a liderar con tablero semanal/i)).toBeInTheDocument();
    expect(screen.getByText(/Distribuidora Mayorista de Insumos/i)).toBeInTheDocument();
  });

  it("permite conmutar entre las 4 pestañas de navegación (Historia, Métricas, Formatos, Lecciones)", () => {
    render(
      <CustomerSuccessModal
        open={true}
        onOpenChange={() => {}}
        initialData={{ arquetipo: "fundador_saturado" }}
      />
    );

    // Pestaña por defecto: Historia
    expect(screen.getByText(/El Problema del Héroe/i)).toBeInTheDocument();
    expect(screen.getByText(/La Intervención del Guía/i)).toBeInTheDocument();

    // Clic en Métricas & Resultados
    const tabMetricas = screen.getByRole("button", { name: /2\. Métricas & Resultados/i });
    fireEvent.click(tabMetricas);
    expect(screen.getByText(/Impacto Cuantitativo Verificable/i)).toBeInTheDocument();
    expect(screen.getByText(/Testimonio del Protagonista/i)).toBeInTheDocument();

    // Clic en Formatos Listos
    const tabFormatos = screen.getByRole("button", { name: /3\. Formatos Listos/i });
    fireEvent.click(tabFormatos);
    expect(screen.getByText(/Respuesta Consultiva para WhatsApp \/ DM/i)).toBeInTheDocument();
    expect(screen.getByText(/Guión Estructurado para Carrusel LinkedIn/i)).toBeInTheDocument();

    // Clic en Criterio & Lecciones
    const tabLecciones = screen.getByRole("button", { name: /4\. Criterio & Lecciones/i });
    fireEvent.click(tabLecciones);
    expect(screen.getByText(/Lecciones de Trinchera para la Dirección General/i)).toBeInTheDocument();
    expect(screen.getByText(/Puente Consultivo hacia la Acción/i)).toBeInTheDocument();
  });

  it("cambia reactivamente el caso al seleccionar otro arquetipo de trinchera", () => {
    render(
      <CustomerSuccessModal
        open={true}
        onOpenChange={() => {}}
        initialData={{ arquetipo: "fundador_saturado" }}
      />
    );

    // Seleccionar 2da Generación
    const btn2daGen = screen.getByRole("button", { name: /2\. 2da Generación/i });
    fireEvent.click(btn2daGen);

    expect(
      screen.getByText(/Profesionalizar la empresa familiar sin quebrar la confianza ni la cultura/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Industria Metalmecánica Regional/i)).toBeInTheDocument();
  });

  it("permite conmutar la anonimización de la razón social", () => {
    render(
      <CustomerSuccessModal
        open={true}
        onOpenChange={() => {}}
        initialData={{ arquetipo: "fundador_saturado" }}
      />
    );

    // Por defecto anonimizado
    expect(screen.getByText("Distribuidora Mayorista de Insumos")).toBeInTheDocument();

    // Clic en botón toggle anonimización
    const btnToggle = screen.getByTitle(/Nombre comercial anonimizado por confidencialidad/i);
    fireEvent.click(btnToggle);

    // Debe mostrar la razón social real
    expect(screen.getByText("Distribuidora Centro SA")).toBeInTheDocument();
    expect(screen.getByText("Razón Social Real")).toBeInTheDocument();
  });

  it("invoca la descarga de PDF al hacer clic en el botón correspondiente", () => {
    const downloadSpy = vi.spyOn(pdfService, "descargarCasoExitoPDF").mockImplementation(() => {});

    render(
      <CustomerSuccessModal
        open={true}
        onOpenChange={() => {}}
        initialData={{ arquetipo: "fundador_saturado" }}
      />
    );

    const btnDescargar = screen.getByRole("button", { name: /Descargar Caso A4 \(PDF\)/i });
    fireEvent.click(btnDescargar);

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    downloadSpy.mockRestore();
  });
});
