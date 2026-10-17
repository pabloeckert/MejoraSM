// src/domain/__tests__/gridGenerator.test.ts
import { describe, it, expect } from "vitest";
import { generarGrillaEvergreen26Semanas } from "../gridGenerator";
import { generarPaqueteMulticanal, toCanonicalPropuesta } from "../types";

describe("Motor de Grilla Evergreen 26 Semanas (80/20 Rule)", () => {
  it("genera exactamente 26 semanas planificadas con 78 piezas en total", () => {
    const grilla = generarGrillaEvergreen26Semanas(new Date("2026-10-19T00:00:00.000Z"));

    expect(grilla.total_semanas).toBe(26);
    expect(grilla.total_piezas).toBe(78);
    expect(grilla.semanas).toHaveLength(26);

    // 3 publicaciones por semana (Lun, Mié, Vie)
    for (const sem of grilla.semanas) {
      expect(sem.propuestas).toHaveLength(3);
    }
  });

  it("mantiene el balance de ~80% Jabs y ~20% Right Hooks en todo el período", () => {
    const grilla = generarGrillaEvergreen26Semanas();

    const pctJabs = (grilla.jabs_totales / grilla.total_piezas) * 100;
    const pctHooks = (grilla.right_hooks_totales / grilla.total_piezas) * 100;

    // Con 78 piezas (15 right hooks y 63 jabs), 15/78 = 19.23% y 63/78 = 80.77%
    expect(pctJabs).toBeGreaterThanOrEqual(79);
    expect(pctJabs).toBeLessThanOrEqual(82);
    expect(pctHooks).toBeGreaterThanOrEqual(18);
    expect(pctHooks).toBeLessThanOrEqual(21);
  });

  it("distribuye equilibradamente las 5 dimensiones + Networking C-Level", () => {
    const grilla = generarGrillaEvergreen26Semanas();

    expect(grilla.resumen_por_dimension.personal).toBeGreaterThan(10);
    expect(grilla.resumen_por_dimension.organizacional).toBeGreaterThan(10);
    expect(grilla.resumen_por_dimension.comercial).toBeGreaterThan(10);
    expect(grilla.resumen_por_dimension.empresarial).toBeGreaterThan(10);
    expect(grilla.resumen_por_dimension.profesionalizacion).toBeGreaterThan(10);
    expect(grilla.resumen_por_dimension.networking_y_autoridad).toBeGreaterThan(10);
  });

  it("orienta las piezas a los 3 Buyer Personas prioritarios", () => {
    const grilla = generarGrillaEvergreen26Semanas();

    expect(grilla.resumen_por_buyer_persona.emprendedor_saturado).toBeGreaterThan(15);
    expect(grilla.resumen_por_buyer_persona.empresario_mal_asesorado).toBeGreaterThan(15);
    expect(grilla.resumen_por_buyer_persona.orden_para_crecer).toBeGreaterThan(15);
  });

  it("cada propuesta contiene 3 borradores calibrados con copy en 3 pasos", () => {
    const grilla = generarGrillaEvergreen26Semanas();
    const primera = grilla.semanas[0].propuestas[0];

    expect(primera.borradores).toHaveLength(3);

    const [bA, bB, bC] = primera.borradores;
    expect(bA.opcion).toBe("A");
    expect(bA.tipo_formato).toBe("carrusel_pdf");
    expect(bA.slides).toBeDefined();

    expect(bB.opcion).toBe("B");
    expect(bB.tipo_formato).toBe("post_autoridad");

    expect(bC.opcion).toBe("C");
    expect(bC.tipo_formato).toBe("post_directo");

    for (const b of [bA, bB, bC]) {
      expect(b.copy_tres_pasos.paso1_dolor).toBeTruthy();
      expect(b.copy_tres_pasos.paso2_reencuadre).toBeTruthy();
      expect(b.copy_tres_pasos.paso3_direccion_web).toBeTruthy();
    }
  });

  it("exporta correctamente el paquete multicanal para WhatsApp y LinkedIn según regla 80/20", () => {
    const grilla = generarGrillaEvergreen26Semanas();
    // Pieza 0: Lunes (Jab - 100% valor, 0% links)
    const piezaJab = grilla.semanas[0].propuestas[0];
    const paqueteJab = generarPaqueteMulticanal(piezaJab);

    expect(paqueteJab.textoWhatsApp).toContain("MEJORA CONTINUA");
    expect(paqueteJab.textoWhatsApp).toContain("Paso 1: La situación");
    expect(paqueteJab.textoWhatsApp).toContain("Paso 2: Reencuadre de proceso");
    expect(paqueteJab.textoWhatsApp).toContain("Paso 3: Pregunta de debate");
    // Regla de Oro: Prohibido incluir links externos en Jabs
    expect(paqueteJab.textoWhatsApp).not.toContain("mejoraok.com");
    expect(paqueteJab.textoLinkedIn).toContain("#MejoraContinua");

    // Buscar una pieza Right Hook de conversión (Viernes)
    const piezaRightHook = grilla.semanas
      .flatMap((s) => s.propuestas)
      .find((p) => p.borradores.some((b) => b.estrategia === "right_hook_conversion"));

    expect(piezaRightHook).toBeDefined();
    if (piezaRightHook) {
      piezaRightHook.borrador_seleccionado = "C";
      const paqueteHook = generarPaqueteMulticanal(piezaRightHook);
      expect(paqueteHook.textoWhatsApp).toContain("mejoraok.com");
      expect(paqueteHook.textoLinkedIn).toContain("mejoraok.com");
    }
  });
});
