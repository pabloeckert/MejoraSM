import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomerSuccessSection } from "../CustomerSuccessSection";

describe("CustomerSuccessSection Component (Sprint S+16: Authority Vault)", () => {
  it("renderiza correctamente el título de la sección y las 4 tarjetas de casos", () => {
    render(<CustomerSuccessSection />);

    expect(screen.getByText(/CASOS DE ÉXITO DE AUTORIDAD B2B/i)).toBeInTheDocument();
    expect(screen.getByText(/Donald Miller & Robert Cialdini/i)).toBeInTheDocument();
    expect(screen.getByText(/4 Arquetipos de Trinchera/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Biblioteca de Prueba Social & Transformación Directiva/i)
    ).toBeInTheDocument();

    // Las 4 empresas calibradas
    expect(screen.getByText("Distribuidora Mayorista de Insumos")).toBeInTheDocument();
    expect(screen.getByText("Industria Metalmecánica Regional")).toBeInTheDocument();
    expect(screen.getByText("Empresa de Ingeniería y Servicios B2B")).toBeInTheDocument();
    expect(screen.getByText("Planta Elaboradora de Alimentos")).toBeInTheDocument();
  });

  it("abre el modal de caso completo al hacer clic en 'Ver Caso Completo'", () => {
    render(<CustomerSuccessSection />);

    const btnsVer = screen.getAllByRole("button", { name: /Ver Caso Completo/i });
    expect(btnsVer.length).toBe(4);

    fireEvent.click(btnsVer[0]);

    // Modal se despliega
    expect(screen.getByText(/CASO DE ÉXITO & PRUEBA SOCIAL B2B/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1\. Historia StoryBrand/i })).toBeInTheDocument();
  });

  it("copia el texto de WhatsApp al hacer clic en el botón de copiar", () => {
    const clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardSpy,
      },
    });

    render(<CustomerSuccessSection />);

    const btnsCopiar = screen.getAllByTitle(/Copiar texto para WhatsApp/i);
    expect(btnsCopiar.length).toBe(4);

    fireEvent.click(btnsCopiar[0]);
    expect(clipboardSpy).toHaveBeenCalledTimes(1);
    expect(clipboardSpy).toHaveBeenCalledWith(
      expect.stringContaining("distribuidora de 48 colaboradores")
    );
  });
});
