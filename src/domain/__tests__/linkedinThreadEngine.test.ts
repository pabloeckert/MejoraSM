// src/domain/__tests__/linkedinThreadEngine.test.ts
import { describe, it, expect } from "vitest";
import { generarHiloLinkedIn, LinkedInThreadInput } from "../linkedinThreadEngine";

describe("Motor de Hilos y Conversación Directiva C-Level para LinkedIn (Sprint S+8)", () => {
  const sampleInput: LinkedInThreadInput = {
    propuesta_id: "PROP-2026-W01-01",
    tema: "Delegación y cuellos de botella",
    titulo_portada: "El cuello de botella sos vos",
    copy_tres_pasos: {
      paso1_dolor: "Tus mandos medios no deciden solos. Todo termina en tu WhatsApp.",
      paso2_reencuadre: "No es falta de compromiso de la gente: es ausencia de una matriz de delegación y protocolos claros.",
      paso3_direccion_web: "Completá el diagnóstico directivo en https://mejoraok.com/diagnostico?utm_source=linkedin&utm_campaign=directivo",
    },
    url_diagnostico_trazable: "https://mejoraok.com/diagnostico?utm_source=linkedin&utm_medium=organic_social&utm_campaign=empresario_saturado&pieza_id=PROP-2026-W01-01",
    arquetipo_target: "fundador_saturado",
    es_right_hook: false,
  };

  it("genera un Post Principal limpio protegiendo el alcance del algoritmo de LinkedIn", () => {
    const thread = generarHiloLinkedIn(sampleInput);

    expect(thread.postPrincipal.hook).toBe("El cuello de botella sos vos");
    expect(thread.postPrincipal.textoCompletoCopiable).toContain("Tus mandos medios no deciden solos");
    expect(thread.postPrincipal.textoCompletoCopiable).toContain("No es falta de compromiso");
    expect(thread.postPrincipal.textoCompletoCopiable).toContain("#Liderazgo");

    // Invariante de algoritmo: Cero URLs en el cuerpo del post principal para evitar penalización
    expect(thread.postPrincipal.hasExternalLinkPenaltyRisk).toBe(false);
    expect(thread.postPrincipal.textoCompletoCopiable).not.toContain("https://");
    expect(thread.postPrincipal.wordCount).toBeGreaterThan(20);
    expect(thread.postPrincipal.engagementPrompt).toContain("directores generales y dueños de PyMEs");
  });

  it("genera el Primer Comentario Estratégico anclado con la URL UTM de conversión", () => {
    const thread = generarHiloLinkedIn(sampleInput);

    expect(thread.primerComentarioEstrategico.urlTrazable).toContain("mejoraok.com/diagnostico");
    expect(thread.primerComentarioEstrategico.urlTrazable).toContain("utm_source=linkedin");
    expect(thread.primerComentarioEstrategico.contenido).toContain("🔗 Dejo acá el enlace directo");
    expect(thread.primerComentarioEstrategico.contenido).toContain(thread.primerComentarioEstrategico.urlTrazable);

    const firstCommentObj = thread.hiloDebateSimulado[0];
    expect(firstCommentObj.esAutor).toBe(true);
    expect(firstCommentObj.esPrimerComentarioEstrategico).toBe(true);
    expect(firstCommentObj.autorNombre).toBe("Mejora Continua");
  });

  it("simula una secuencia de debate C-Level realista con decisores y mandos medios", () => {
    const thread = generarHiloLinkedIn(sampleInput);

    expect(thread.hiloDebateSimulado.length).toBe(4); // 1er comentario + 3 réplicas
    const founderComment = thread.hiloDebateSimulado[1];
    const authorReply = thread.hiloDebateSimulado[2];
    const opsComment = thread.hiloDebateSimulado[3];

    expect(founderComment.autorCargo).toContain("Director General");
    expect(founderComment.contenido).toContain("cuello de botella");

    expect(authorReply.esAutor).toBe(true);
    expect(authorReply.contenido).toContain("desacople entre comercial y operaciones");

    expect(opsComment.autorCargo).toContain("Gerente de Operaciones");
    expect(opsComment.contenido).toContain("control por excepción");
  });

  it("adapta los argumentos del debate según el arquetipo de empresario", () => {
    const inputEsceptico: LinkedInThreadInput = {
      ...sampleInput,
      arquetipo_target: "empresario_mal_asesorado",
    };

    const thread = generarHiloLinkedIn(inputEsceptico);
    const founderComment = thread.hiloDebateSimulado[1];

    expect(founderComment.contenido).toContain("consultores que dejaban carpetas de 200 páginas");
  });

  it("calcula métricas predictivas de rendimiento algorítmico de LinkedIn", () => {
    const thread = generarHiloLinkedIn(sampleInput);

    expect(thread.metricasPredictivas.estimatedDwellTimeSeconds).toBeGreaterThanOrEqual(35);
    expect(thread.metricasPredictivas.ssiBoostScore).toBeGreaterThanOrEqual(7.0);
    expect(thread.metricasPredictivas.viralReachMultiplier).toBeGreaterThanOrEqual(1.6);
    expect(thread.metricasPredictivas.estimatedReactions).toBeGreaterThan(50);
    expect(thread.metricasPredictivas.estimatedComments).toBeGreaterThan(10);
  });

  it("exporta la secuencia completa estructurada en Markdown listo para copiar y publicar", () => {
    const thread = generarHiloLinkedIn(sampleInput);

    expect(thread.textoExportableMarkdown).toContain("# HILO DE AUTORIDAD C-LEVEL PARA LINKEDIN");
    expect(thread.textoExportableMarkdown).toContain("## 1. POST PRINCIPAL");
    expect(thread.textoExportableMarkdown).toContain("## 2. PRIMER COMENTARIO ESTRATÉGICO");
    expect(thread.textoExportableMarkdown).toContain("## 3. SECUENCIA DE DIÁLOGO DIRECTIVO");
  });

  it("maneja de forma segura inputs con URLs directas en los pasos de dolor y reencuadre", () => {
    const inputConUrlEnPaso1: LinkedInThreadInput = {
      ...sampleInput,
      copy_tres_pasos: {
        paso1_dolor: "Visita http://spam.com porque tus comerciales no rinden.",
        paso2_reencuadre: "El sistema no tiene estándares.",
        paso3_direccion_web: "https://mejoraok.com",
      },
    };

    const thread = generarHiloLinkedIn(inputConUrlEnPaso1);
    expect(thread.postPrincipal.textoCompletoCopiable).not.toContain("http://spam.com");
    expect(thread.postPrincipal.hasExternalLinkPenaltyRisk).toBe(false);
  });
});
