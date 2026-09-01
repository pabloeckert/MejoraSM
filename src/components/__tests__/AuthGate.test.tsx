import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";

const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

const fakeSession = { user: { email: "pabloeckert@gmail.com" } } as unknown as Session;

describe("AuthGate", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("muestra el login cuando no hay sesión", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const { AuthGate } = await import("@/components/AuthGate");
    render(
      <AuthGate>
        <div>Contenido protegido</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Usuario (email)")).toBeInTheDocument();
    });
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });

  it("renderiza los children cuando hay sesión válida", async () => {
    getSessionMock.mockResolvedValue({ data: { session: fakeSession } });

    const { AuthGate } = await import("@/components/AuthGate");
    render(
      <AuthGate>
        <div>Contenido protegido</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
    });
  });
});
