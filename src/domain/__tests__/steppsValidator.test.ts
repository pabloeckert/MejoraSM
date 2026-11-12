// src/domain/__tests__/steppsValidator.test.ts
import { describe, it, expect } from "vitest";
import { evaluarBorradorStepps, enriquecerBorradorConStepps } from "../steppsValidator";
import { BorradorPropuestaDTO } from "../types";

describe("Marco STEPPS de Jonah Berger: Validador de Viralidad y Retención B2B", () => {
  it("audita las 6 dimensiones de un borrador de alta autoridad para PyMEs", () => {
    const input = {
      titulo_portada: "El cuello de botella sos vos",
      cuerpo_texto: "Si cada decisión del día tiene que pasar por tu escritorio, no tenés una empresa: tenés un autoempleo de alto riesgo.\n\nEl liderazgo profesional no consiste en controlar cada paso, sino en diseñar procesos donde el equipo sepa qué hacer sin consultarte.",
      copy_tres_pasos: {
        paso1_dolor: "Tus mandos medios no deciden solos. Todo termina en tu WhatsApp.",
        paso2_reencuadre: "No es falta de compromiso de la gente: es ausencia de una matriz de delegación y protocolos claros.",
        paso3_direccion_web: "Medí tu nivel de dependencia personal en el diagnóstico de mejoraok.com",
      },
      cta_texto: "Comentá CRITERIO para recibir la guía directiva",
    };

    const evaluacion = evaluarBorradorStepps(input);

    // Verificación de dimensiones STEPPS
    expect(evaluacion.moneda_social).toBeGreaterThanOrEqual(7);
    expect(evaluacion.disparadores).toBeGreaterThanOrEqual(7);
    expect(evaluacion.emocion_desculpabilizadora).toBeGreaterThanOrEqual(7);
    expect(evaluacion.publico_visual).toBeGreaterThanOrEqual(6);
    expect(evaluacion.valor_practico).toBeGreaterThanOrEqual(7);
    expect(evaluacion.historias_troya).toBeGreaterThanOrEqual(6);

    // Score global y aprobación
    expect(evaluacion.score_global).toBeGreaterThanOrEqual(7.0);
    expect(evaluacion.aprobado_stepps).toBe(true);
    expect(evaluacion.feedback_editorial.length).toBeGreaterThan(10);
  });

  it("enriquece un BorradorPropuestaDTO asignando la evaluación STEPPS", () => {
    const borradorBase: BorradorPropuestaDTO = {
      opcion: "A",
      tipo_formato: "carrusel_pdf",
      estrategia: "jab_educativo",
      titulo_portada: "La trampa de apagar incendios",
      cuerpo_texto: "Apagar incendios no es trabajar: es síntoma de desorden operativo.",
      copy_tres_pasos: {
        paso1_dolor: "Llegás exhausto a las 7 de la tarde.",
        paso2_reencuadre: "El sistema no tiene estándares.",
        paso3_direccion_web: "mejoraok.com",
      },
      cta_texto: "Deslizá para ordenar tu proceso",
    };

    const enriquecido = enriquecerBorradorConStepps(borradorBase);

    expect(enriquecido.stepps_evaluacion).toBeDefined();
    expect(enriquecido.stepps_evaluacion?.score_global).toBeGreaterThan(0);
    expect(enriquecido.stepps_evaluacion?.aprobado_stepps).toBe(true);
  });
});
