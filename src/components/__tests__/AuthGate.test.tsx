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
    },
  },
}));

const fakeSession = { user: { email: "pablo@mejoraok.com" } } as unknown as Session;

describe("AuthGate", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("muestra Login cuando no hay sesión", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const { AuthGate } = await import("@/components/AuthGate");
    render(
      <AuthGate>
        <div>Contenido protegido</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByText("EDA — MejoraOK")).toBeInTheDocument();
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
    expect(screen.queryByText("EDA — MejoraOK")).not.toBeInTheDocument();
  });

  it("actualiza a Login si onAuthStateChange emite sesión nula (logout)", async () => {
    getSessionMock.mockResolvedValue({ data: { session: fakeSession } });
    let authCallback: ((event: string, session: Session | null) => void) | undefined;
    onAuthStateChangeMock.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { AuthGate } = await import("@/components/AuthGate");
    render(
      <AuthGate>
        <div>Contenido protegido</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
    });

    authCallback?.("SIGNED_OUT", null);

    await waitFor(() => {
      expect(screen.getByText("EDA — MejoraOK")).toBeInTheDocument();
    });
  });
});
