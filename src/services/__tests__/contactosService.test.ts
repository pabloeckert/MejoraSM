import { describe, it, expect } from "vitest";
import { enviarLeadACRM, extraerDatosDeTexto } from "../contactosService";

describe("contactosService en MejoraSM", () => {
  it("extrae correctamente email y teléfono del texto", () => {
    const texto = "Hola! Mi mail es contacto@empresa.com y mi whatsapp es +5493764999999, me pasan info?";
    const datos = extraerDatosDeTexto(texto);
    expect(datos.email).toBe("contacto@empresa.com");
    expect(datos.telefono).toBe("+5493764999999");
  });

  it("envía un lead simulado a contactos-api exitosamente (HTTP 201/200)", async () => {
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
      nota_referencia: "[MejoraSM] Prueba de integración Día 5",
    });

    expect(resultado).toBeDefined();
    expect(resultado.persona_id).toBeDefined();
    expect(resultado.persona_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(typeof resultado.creado).toBe("boolean");
  });
});
