import { describe, it, expect } from "vitest";
import {
  generarGuionReel,
  contarPalabras,
  estimarSegundos,
  WPM_DIRECTIVO_DEFAULT,
} from "../reelScriptEngine";

describe("reelScriptEngine (Sprint S+9: Motor de Guiones B2B para Reels / Video Vertical)", () => {
  it("cuenta palabras correctamente en cadenas simples, compuestas y vacías", () => {
    expect(contarPalabras("")).toBe(0);
    expect(contarPalabras("   ")).toBe(0);
    expect(contarPalabras("Hola mundo directivo")).toBe(3);
    expect(contarPalabras("  Tres   palabras   separadas  ")).toBe(3);
  });

  it("estima duración en segundos en base a WPM directivo (135 WPM)", () => {
    expect(estimarSegundos(0)).toBe(0);
    // 135 palabras a 135 WPM = 60s
    expect(estimarSegundos(135, 135)).toBe(60);
    // ~45 palabras a 135 WPM = 20s
    expect(estimarSegundos(45, 135)).toBe(20);
  });

  it("genera un guion estructurado en exactamente 3 bloques cronometrados (Gancho, Metodología, CTA)", () => {
    const input = {
      propuesta_id: "PROP-2026-W01-01",
      titulo_portada: "El cuello de botella sos vos",
      copy_tres_pasos: {
        dolor: "Si cada decisión del día tiene que pasar por tu escritorio, no tenés una empresa.",
        reencuadre: "La claridad directiva comienza por delegar con criterios en lugar de órdenes puntuales.",
        direccion: "Hacé el diagnóstico en mejoraok.com para medir las 4 dimensiones de tu empresa.",
      },
    };

    const guion = generarGuionReel(input);

    expect(guion.propuesta_id).toBe("PROP-2026-W01-01");
    expect(guion.titulo).toBe("El cuello de botella sos vos");
    expect(guion.bloques).toHaveLength(3);

    // Bloque 1: Gancho
    const b1 = guion.bloques[0];
    expect(b1.id).toBe("gancho");
    expect(b1.segundoInicio).toBe(0);
    expect(b1.segundoFin).toBe(5);
    expect(b1.indicacionCamara).toContain("Plano medio corto");
    expect(b1.texto).toContain("escritorio");

    // Bloque 2: Metodología
    const b2 = guion.bloques[1];
    expect(b2.id).toBe("metodologia");
    expect(b2.segundoInicio).toBe(5);
    expect(b2.segundoFin).toBe(45);
    expect(b2.indicacionCamara).toContain("Gesticulación abierta");
    expect(b2.texto).toContain("[PAUSA]");
    expect(b2.texto).toContain("criterios");

    // Bloque 3: CTA
    const b3 = guion.bloques[2];
    expect(b3.id).toBe("cta");
    expect(b3.segundoInicio).toBe(45);
    expect(b3.segundoFin).toBe(60);
    expect(b3.texto).toContain("mejoraok.com");
  });

  it("mantiene el tono institucional de Mejora Continua: nunca culpa a la persona y enfoca en sistemas", () => {
    const input = {
      propuesta_id: "PROP-TEST-02",
      titulo_portada: "Fricción operativa en pymes",
      copy_tres_pasos: {
        dolor: "Tus gerentes no resuelven y terminás apagando incendios los fines de semana.",
        reencuadre: "El problema no es la voluntad del equipo sino la falta de un proceso documentado.",
        direccion: "Completá el autodiagnóstico en mejoraok.com.",
      },
    };

    const guion = generarGuionReel(input);
    const textoCompleto = guion.textoCompletoTeleprompter.toLowerCase();

    // Debe contener términos de sistema, proceso y calidez con verdad
    expect(textoCompleto).toContain("sistema");
    expect(textoCompleto).toContain("proceso");
    // No debe insultar ni agredir al líder
    expect(textoCompleto).not.toContain("incompetente");
    expect(textoCompleto).not.toContain("fracaso");
  });

  it("calcula retención predictiva y WPM recomendado dentro de parámetros directivos", () => {
    const input = {
      propuesta_id: "PROP-TEST-03",
      titulo_portada: "Desacople comercial y operativo",
      copy_tres_pasos: {
        dolor: "Ventas promete entregas en 48 horas y operaciones tarda dos semanas.",
        reencuadre: "Sincronizar el edificio comercial exige acuerdos de nivel de servicio internos.",
        direccion: "Accedé a mejoraok.com para alinear tus áreas.",
      },
    };

    const guion = generarGuionReel(input);

    expect(guion.wpmRecomendado).toBe(WPM_DIRECTIVO_DEFAULT);
    expect(guion.duracionTotalEstimadaSegundos).toBeGreaterThan(35);
    expect(guion.duracionTotalEstimadaSegundos).toBeLessThan(75);
    expect(guion.retencionEstimadaPorcentaje).toBeGreaterThanOrEqual(75);
    expect(guion.retencionEstimadaPorcentaje).toBeLessThanOrEqual(92);
  });

  it("exporta un documento Markdown completo y bien formateado para el director de video", () => {
    const input = {
      propuesta_id: "PROP-TEST-04",
      titulo_portada: "Delegación real vs micromanagement",
    };

    const guion = generarGuionReel(input);
    const md = guion.exportarMarkdown();

    expect(md).toContain("# Guion de Rodaje B2B (Reel 60s)");
    expect(md).toContain("PROP-TEST-04");
    expect(md).toContain("## 1. Gancho de Quiebre (00:00 - 00:05)");
    expect(md).toContain("## 2. Metodología y Sistema (00:05 - 00:45)");
    expect(md).toContain("## 3. Dirección y Cierre (00:45 - 01:00)");
    expect(md).toContain("mejoraok.com");
  });

  it("gestiona fallbacks cuando los campos de entrada son mínimos o vacíos", () => {
    const input = {
      propuesta_id: "PROP-EMPTY",
      titulo_portada: "Título genérico",
    };

    const guion = generarGuionReel(input);

    expect(guion.bloques[0].texto).toContain("Título genérico");
    expect(guion.bloques[1].texto).toContain("arquitectura del flujo de trabajo");
    expect(guion.bloques[2].texto).toContain("mejoraok.com");
  });
});
