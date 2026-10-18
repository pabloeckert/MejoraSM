import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enviarLeadACRM, extraerDatosDeTexto } from "../contactosService";

describe("contactosService en MejoraSM", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extrae correctamente email y teléfono del texto", () => {
    const texto = "Hola! Mi mail es contacto@empresa.com y mi whatsapp es +5493764999999, me pasan info?";
    const datos = extraerDatosDeTexto(texto);
    expect(datos.email).toBe("contacto@empresa.com");
    expect(datos.telefono).toBe("+5493764999999");
  });

  it("envía un lead simulado a contactos-api exitosamente mockeando fetch global (cero llamadas de red reales)", async () => {
    const fakePersonaId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
    let calledUrl = "";
    let calledOptions: RequestInit | undefined;

    const mockFetch = vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
      calledUrl = url;
      calledOptions = options;
      return {
        ok: true,
        status: 201,
        json: async () => ({
          persona_id: fakePersonaId,
          creado: true,
        }),
        text: async () => JSON.stringify({ persona_id: fakePersonaId, creado: true }),
      };
    });

    vi.stubGlobal("fetch", mockFetch);

    const resultado = await enviarLeadACRM({
      source: "mejora_sm",
      email: "lead_sm@empresa.com",
      nombre: "Lead Social Media",
      telefono: "+5493764999999",
      metadata: {
        red: "instagram",
        handle: "cliente_demo",
        thread_id: "thread_test_123",
      },
      nota_referencia: "[MejoraSM] Prueba hermética Mock",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(calledUrl).toContain("/contactos-api");
    expect(calledOptions?.method).toBe("POST");

    const sentPayload = JSON.parse(calledOptions?.body as string);
    expect(sentPayload.email).toBe("lead_sm@empresa.com");
    expect(sentPayload.nombre).toBe("Lead Social Media");
    expect(sentPayload.source).toBe("mejora_sm");
    expect(sentPayload.metadata.red).toBe("instagram");
    expect(sentPayload.metadata.handle).toBe("cliente_demo");

    expect(resultado).toBeDefined();
    expect(resultado.persona_id).toBe(fakePersonaId);
    expect(resultado.creado).toBe(true);
  });
});
