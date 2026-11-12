import { describe, it, expect } from "vitest";
import { calcularLeadScoring, InputLeadScoring } from "../leadScoringEngine";

describe("leadScoringEngine (Sprint S+11: Calificación y Scoring Predictivo B2B)", () => {
  it("clasifica como CALIFICADO_ALTO (Score >= 70) a un dueño de empresa con dolor operativo que pide diagnóstico o reunión", () => {
    const input: InputLeadScoring = {
      nombreRemitente: "Carlos Rossi",
      cargoRemitente: "Socio Fundador",
      textoMensaje:
        "Hola! Soy dueño de una fábrica metalúrgica con 45 empleados. Tenemos un cuello de botella terrible en entregas y todo pasa por mí. ¿Cómo trabajan en consultoría o podemos hacer un diagnóstico?",
      canal: "linkedin",
      seguidor: true,
    };

    const resultado = calcularLeadScoring(input);

    expect(resultado.scoreTotal).toBeGreaterThanOrEqual(70);
    expect(resultado.cuadrante).toBe("CALIFICADO_ALTO");
    expect(resultado.prioridadCrm).toBe("ALTA");
    expect(resultado.slaHorasRecomendado).toBe(2);
    expect(resultado.fitRolDetectado).toContain("Dueño / Socio");
    expect(resultado.doloresDetectados).toContain("cuello de botella");
    expect(resultado.intencionesDetectadas.length).toBeGreaterThan(0);
    expect(resultado.enriquecimientoCrm.prioridad).toBe("ALTA");
    expect(resultado.enriquecimientoCrm.slaLimiteHoras).toBe(2);
  });

  it("clasifica como EN_NUTRICION (Score 35-69) a un mando medio que indaga sobre metodologías", () => {
    const input: InputLeadScoring = {
      nombreRemitente: "Laura Méndez",
      cargoRemitente: "Coordinadora de Operaciones",
      textoMensaje:
        "Buen día, en nuestro equipo sufrimos con los retrabajos y la falta de procesos claros. ¿Qué recomiendan o por dónde arrancar para ordenar el flujo?",
      canal: "instagram",
      seguidor: false,
    };

    const resultado = calcularLeadScoring(input);

    expect(resultado.scoreTotal).toBeGreaterThanOrEqual(35);
    expect(resultado.scoreTotal).toBeLessThan(70);
    expect(resultado.cuadrante).toBe("EN_NUTRICION");
    expect(resultado.prioridadCrm).toBe("MEDIA");
    expect(resultado.slaHorasRecomendado).toBe(24);
    expect(resultado.fitRolDetectado).toContain("Mando Medio");
    expect(resultado.doloresDetectados).toContain("retrabajos");
  });

  it("clasifica como COMUNIDAD (Score < 35) a un mensaje de mero elogio o networking social", () => {
    const input: InputLeadScoring = {
      nombreRemitente: "Matías",
      textoMensaje: "¡Excelente post! Muy claro como siempre 👏",
      canal: "facebook",
      seguidor: true,
    };

    const resultado = calcularLeadScoring(input);

    expect(resultado.scoreTotal).toBeLessThan(35);
    expect(resultado.cuadrante).toBe("COMUNIDAD");
    expect(resultado.prioridadCrm).toBe("BAJA");
    expect(resultado.slaHorasRecomendado).toBe(48);
  });

  it("genera las 3 respuestas consultivas deterministas con la voz institucional 'Calidez con Verdad'", () => {
    const input: InputLeadScoring = {
      nombreRemitente: "Esteban Gómez",
      textoMensaje: "En mi empresa no puedo delegar, todo el mundo me busca para apagar incendios.",
    };

    const resultado = calcularLeadScoring(input);

    expect(resultado.respuestasSugeridas).toHaveLength(3);

    const [respDiag, respPreg, respPriv] = resultado.respuestasSugeridas;

    // 1. Diagnóstico
    expect(respDiag.id).toBe("diagnostico");
    expect(respDiag.texto).toContain("Hola Esteban");
    expect(respDiag.texto).toContain("mejoraok.com/diagnostico");

    // 2. Pregunta de Trinchera
    expect(respPreg.id).toBe("pregunta_trinchera");
    expect(respPreg.texto).toContain("Hola Esteban");
    expect(respPreg.texto).toContain("¿notás que");

    // 3. Canal Privado
    expect(respPriv.id).toBe("canal_privado");
    expect(respPriv.texto).toContain("WhatsApp");
    expect(respPriv.texto).toContain("mejoraok.com/contacto");
  });

  it("prepara un enriquecimiento de CRM completo con arquetipo inferido y nota de scoring", () => {
    const input: InputLeadScoring = {
      nombreRemitente: "Ana",
      textoMensaje: "Quiero consultar honorarios para ordenar mi área comercial y de ventas.",
    };

    const resultado = calcularLeadScoring(input);

    expect(resultado.enriquecimientoCrm.arquetipoSugerido).toBe("director_comercial");
    expect(resultado.enriquecimientoCrm.notaScoring).toContain("LeadScoring");
  });
});
