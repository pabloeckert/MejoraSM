import { describe, it, expect } from "vitest";
import {
  generarPiezaCoyuntura,
  obtenerCatalogoCoyunturas,
} from "../trenchCoyunturaEngine";

describe("trenchCoyunturaEngine (Sprint S+21: Trench Context & Reactive Newsjacking)", () => {
  it("obtiene el catálogo completo de las 6 coyunturas PyME estructuradas", () => {
    const catalogo = obtenerCatalogoCoyunturas();
    expect(catalogo).toHaveLength(6);

    const ids = catalogo.map((c) => c.id);
    expect(ids).toContain("cierre_mes_liquidez");
    expect(ids).toContain("aguinaldos_sac");
    expect(ids).toContain("temporada_alta_cuello");
    expect(ids).toContain("inflacion_costos_listas");
    expect(ids).toContain("vacaciones_ausentismo");
    expect(ids).toContain("balance_societario_fin_ano");
  });

  it("genera una pieza reactiva completa para cierre_mes_liquidez con 3 hooks y estructura 3 pasos", () => {
    const pieza = generarPiezaCoyuntura({ idCoyuntura: "cierre_mes_liquidez" });

    expect(pieza.idPieza).toMatch(/^COY-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(pieza.coyuntura.id).toBe("cierre_mes_liquidez");
    expect(pieza.hooks).toHaveLength(3);
    expect(pieza.hooks.map((h) => h.tipo)).toEqual([
      "quiebre_provocador",
      "situacional_trinchera",
      "pregunta_socratica",
    ]);

    expect(pieza.estructuraTresPasos.paso1Verdad).toContain("Este desgaste no ocurre por falta de voluntad");
    expect(pieza.estructuraTresPasos.paso2CausaRaiz).toContain("La causa raíz");
    expect(pieza.estructuraTresPasos.paso3Direccion4D).toContain("La salida profesional no es exigir más horas");
  });

  it("permite seleccionar un hook específico por índice y actualizar el copy", () => {
    const piezaDefault = generarPiezaCoyuntura({
      idCoyuntura: "aguinaldos_sac",
      indiceHookPreferido: 0,
    });
    const piezaSituacional = generarPiezaCoyuntura({
      idCoyuntura: "aguinaldos_sac",
      indiceHookPreferido: 1,
    });

    expect(piezaDefault.hookSeleccionado.tipo).toBe("quiebre_provocador");
    expect(piezaSituacional.hookSeleccionado.tipo).toBe("situacional_trinchera");
    expect(piezaSituacional.copyPostCompleto.startsWith(piezaSituacional.hookSeleccionado.textoHook)).toBe(true);
  });

  it("soporta coyunturas de trinchera personalizadas manteniendo el rigor metodológico", () => {
    const pieza = generarPiezaCoyuntura({
      idCoyuntura: "personalizada",
      contextoEspecifico: "Reestructuración de turnos nocturnos en planta metalúrgica",
      arquetipoDolor: "calidad_entregas",
    });

    expect(pieza.coyuntura.titulo).toBe("Reestructuración de turnos nocturnos en planta metalúrgica");
    expect(pieza.arquetipo).toBe("calidad_entregas");
    expect(pieza.hooks).toHaveLength(3);
    expect(pieza.copyPostCompleto).toContain("4D");
  });

  it("genera carrusel de 5 slides y guion de reel cronometrado con pausas de teleprompter", () => {
    const pieza = generarPiezaCoyuntura({ idCoyuntura: "temporada_alta_cuello" });

    expect(pieza.carrusel5Slides).toHaveLength(5);
    expect(pieza.carrusel5Slides[0].tipo).toBe("portada");
    expect(pieza.carrusel5Slides[4].tipo).toBe("decision_directiva");

    expect(pieza.guionReel60s.gancho0a5s).toBeTruthy();
    expect(pieza.guionReel60s.desarrollo5a45s).toContain("[PAUSA]");
    expect(pieza.guionReel60s.cierre45a60s).toContain("mejoraok.com");
    expect(pieza.guionReel60s.textoCompletoTeleprompter).toContain("[00:00 - 00:05 | GANCHO]");
  });

  it("garantiza Zero-Penalty Reach en LinkedIn y aprobación de Brand Voice", () => {
    const pieza = generarPiezaCoyuntura({ idCoyuntura: "inflacion_costos_listas" });

    // El post principal no debe tener http:// para proteger el alcance algorítmico en LinkedIn
    expect(pieza.copyPostCompleto).not.toContain("http://");
    expect(pieza.copyPostCompleto).not.toContain("https://");

    // El primer comentario anclado sí lleva la URL con UTMs
    expect(pieza.primerComentarioLinkedin).toContain("mejoraok.com/diagnostico?utm_source=mejora_sm");
    expect(pieza.primerComentarioLinkedin).toContain("utm_campaign=inflacion_costos_listas");

    // Auditoría de Brand Voice (respetando los 4 pilares de Marca)
    expect(pieza.auditoriaBrandVoice.scoreGlobal).toBeGreaterThanOrEqual(90);
    expect(pieza.auditoriaBrandVoice.estadoAprobacion).toBe("APROBADO_IMPECABLE");
  });
});
