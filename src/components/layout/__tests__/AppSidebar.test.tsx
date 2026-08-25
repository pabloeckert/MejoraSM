import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppSidebar } from "../AppSidebar";

describe("AppSidebar", () => {
  it("renderiza los items de navegación reales, con el activo marcado", () => {
    render(
      <MemoryRouter initialEntries={["/boveda"]}>
        <AppSidebar />
      </MemoryRouter>
    );

    // Se renderiza dos veces (barra mobile con Sheet cerrado + aside de escritorio),
    // pero el aside de escritorio siempre está en el DOM (solo oculto por CSS).
    const bovedaLinks = screen.getAllByRole("link", { name: /Bóveda/i });
    expect(bovedaLinks.length).toBeGreaterThan(0);
    const activeLink = bovedaLinks.find((el) => el.getAttribute("aria-current") === "page");
    expect(activeLink).toBeTruthy();
  });

  it("el botón de menú mobile abre el drawer con la navegación completa", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppSidebar />
      </MemoryRouter>
    );

    const menuButton = screen.getByRole("button", { name: /Abrir menú de navegación/i });
    fireEvent.click(menuButton);

    expect(screen.getByText("Menú de navegación")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Configuración/i }).length).toBeGreaterThan(0);
  });

  it("navegar desde el drawer mobile lo cierra", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppSidebar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Abrir menú de navegación/i }));
    expect(screen.getByText("Menú de navegación")).toBeInTheDocument();

    const monitorLinks = screen.getAllByRole("link", { name: /Monitor/i });
    fireEvent.click(monitorLinks[monitorLinks.length - 1]);

    expect(screen.queryByText("Menú de navegación")).not.toBeInTheDocument();
  });
});
