import { describe, it, expect } from "vitest";
import {
  generarKickoffBlueprint,
  normalizarArquetipoKickoff,
} from "../kickoffBlueprintEngine";

describe("kickoffBlueprintEngine (Sprint S+20: Onboarding & Plan 30 Días + Gemba Walk 4D)", () => {
  it("genera un protocolo completo para fundador_saturado con ID KICK-2026-*, agenda 90m, Gemba 4D e hitos 30D", () => {
    const bp = generarKickoffBlueprint({
      nombreDirectivo: "Martín Benítez",
      empresa: "Metalúrgica Litoral",
      cargo: "Socio Gerente",
      arquetipoDolor: "fundador_saturado",
      modalidad: "Hibrida (Trinchera + Remoto)",
    });

    expect(bp.idBlueprint).toMatch(/^KICK-2026-FS-\d{3}$/);
    expect(bp.arquetipo).toBe("fundador_saturado");
    expect(bp.agendaKickoff90Min).toHaveLength(4);
    expect(bp.recorridoGemba4D).toHaveLength(4);
    expect(bp.recorridoGemba4D.map((e) => e.dimension)).toEqual([
      "Personal",
      "Organizacional",
      "Comercial",
      "Empresarial",
    ]);
    expect(bp.hitosPrimeros30Dias).toHaveLength(3);
    expect(bp.hitosPrimeros30Dias[0].ventana).toContain("Día 1 a 7");
    expect(bp.hitosPrimeros30Dias[1].ventana).toContain("Día 8 a 15");
    expect(bp.hitosPrimeros30Dias[2].ventana).toContain("Día 16 a 30");
  });

  it("adapta de forma diferenciada el Gemba Walk 4D y Quick Wins para los 4 arquetipos", () => {
    const fs = generarKickoffBlueprint({
      nombreDirectivo: "A",
      arquetipoDolor: "fundador_saturado",
    });
    const sg = generarKickoffBlueprint({
      nombreDirectivo: "A",
      arquetipoDolor: "segunda_generacion",
    });
    const vi = generarKickoffBlueprint({
      nombreDirectivo: "A",
      arquetipoDolor: "ventas_intuitivas",
    });
    const cr = generarKickoffBlueprint({
      nombreDirectivo: "A",
      arquetipoDolor: "calidad_retrabajos",
    });

    expect(fs.idBlueprint).toContain("KICK-2026-FS-");
    expect(sg.idBlueprint).toContain("KICK-2026-SG-");
    expect(vi.idBlueprint).toContain("KICK-2026-EC-");
    expect(cr.idBlueprint).toContain("KICK-2026-CE-");

    const titulosQuickWin = new Set([
      fs.hitosPrimeros30Dias[1].tituloHito,
      sg.hitosPrimeros30Dias[1].tituloHito,
      vi.hitosPrimeros30Dias[1].tituloHito,
      cr.hitosPrimeros30Dias[1].tituloHito,
    ]);
    expect(titulosQuickWin.size).toBe(4);
  });

  it("normaliza correctamente alias comunes y valores canónicos en normalizarArquetipoKickoff", () => {
    expect(normalizarArquetipoKickoff(undefined)).toBe("fundador_saturado");
    expect(normalizarArquetipoKickoff("saturado")).toBe("fundador_saturado");
    expect(normalizarArquetipoKickoff("familiar")).toBe("segunda_generacion");
    expect(normalizarArquetipoKickoff("ventas_intuitivas")).toBe("estancamiento_comercial");
    expect(normalizarArquetipoKickoff("comercial")).toBe("estancamiento_comercial");
    expect(normalizarArquetipoKickoff("calidad_retrabajos")).toBe("calidad_entregas");
    expect(normalizarArquetipoKickoff("retrabajos en planta")).toBe("calidad_entregas");
  });

  it("garantiza el criterio 'Calidez con Verdad' y 'Nunca a la Persona' en la regla de oro y comunicado al equipo", () => {
    const bp = generarKickoffBlueprint({
      nombreDirectivo: "Laura Gómez",
      empresa: "Textil Misiones",
      arquetipoDolor: "calidad_entregas",
    });

    expect(bp.reglaDeOroGemba.toLowerCase()).toContain("sistema");
    expect(bp.reglaDeOroGemba.toLowerCase()).toContain("personas");
    expect(bp.comunicadoInternoEquipo).toContain("Textil Misiones");
    expect(bp.comunicadoInternoEquipo.toLowerCase()).toContain("sistema");
    expect(bp.comunicadoInternoEquipo.toLowerCase()).not.toContain("culpa");
    expect(bp.comunicadoInternoEquipo.toLowerCase()).not.toContain("gratis");
  });

  it("incluye 4 requisitos sin burocracia y resumen WhatsApp con enlace a mejoraok.com", () => {
    const bp = generarKickoffBlueprint({
      nombreDirectivo: "Carlos Pereyra",
      empresa: "Logística Sur",
      arquetipoDolor: "estancamiento_comercial",
    });

    expect(bp.requisitosCeroBurocracia).toHaveLength(4);
    expect(bp.requisitosCeroBurocracia.some((r) => r.obligatorioAntesDeKickoff)).toBe(true);
    expect(bp.resumenWhatsAppBienvenida).toContain("Logística Sur");
    expect(bp.resumenWhatsAppBienvenida).toContain(bp.idBlueprint);
    expect(bp.resumenWhatsAppBienvenida).toContain("mejoraok.com");
  });
});
