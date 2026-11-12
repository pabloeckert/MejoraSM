// src/domain/__tests__/fatigaAudienceDetector.test.ts
import { describe, it, expect } from "vitest";
import { detectarFatigaAudiencia, inferirDimensionPropuesta } from "../fatigaAudienceDetector";
import { generarGrillaEvergreen26Semanas } from "../gridGenerator";
import { PropuestaMejoraSMDTO } from "../types";

describe("Detector Algorítmico de Fatiga de Audiencia B2B (Donella Meadows)", () => {
  it("infiere correctamente las dimensiones según el texto de la propuesta", () => {
    const grilla = generarGrillaEvergreen26Semanas();
    const p0 = grilla.semanas[0].propuestas[0];
    const dim = inferirDimensionPropuesta(p0);
    expect(["personal", "organizacional", "comercial", "empresarial"]).toContain(dim);
  });

  it("audita una ventana de 4 semanas de la grilla evergreen con diagnóstico equilibrado", () => {
    const grilla = generarGrillaEvergreen26Semanas();
    const todasLasPropuestas = grilla.semanas.flatMap((s) => s.propuestas);

    const diagnostico = detectarFatigaAudiencia(todasLasPropuestas, 1, 4);

    expect(diagnostico.total_piezas_analizadas).toBe(12); // 4 semanas x 3 piezas = 12 piezas
    expect(diagnostico.semanas_analizadas).toEqual([1, 2, 3, 4]);
    expect(diagnostico.salud_editorial_pct).toBeGreaterThanOrEqual(60);
    expect(diagnostico.frecuencia_dimensiones).toBeDefined();
  });

  it("detecta saturación temática cuando un gancho se repite excesivamente y emite recomendación de rotación", () => {
    const grilla = generarGrillaEvergreen26Semanas();
    const propuestasModificadas: PropuestaMejoraSMDTO[] = JSON.parse(
      JSON.stringify(grilla.semanas.slice(0, 4).flatMap((s) => s.propuestas))
    );

    // Sobreescribir las primeras 5 piezas con el mismo gancho "cuello de botella"
    for (let i = 0; i < 5; i++) {
      propuestasModificadas[i].borradores[0].titulo_portada = "El cuello de botella sos vos siempre";
      propuestasModificadas[i].borradores[0].cuerpo_texto = "Todo depende de vos en tu escritorio.";
      propuestasModificadas[i].borradores[0].copy_tres_pasos.paso1_dolor = "El cuello de botella sos vos.";
    }

    const diagnostico = detectarFatigaAudiencia(propuestasModificadas, 1, 4);

    expect(diagnostico.alertas.length).toBeGreaterThan(0);
    const alertaCuello = diagnostico.alertas.find((a) => a.id.includes("cuello_botella"));
    expect(alertaCuello).toBeDefined();
    expect(alertaCuello?.frecuencia_detectada).toBeGreaterThanOrEqual(3);
    expect(alertaCuello?.dimension_sugerida).toBe("organizacional");
    expect(diagnostico.salud_editorial_pct).toBeLessThan(100);
  });
});
