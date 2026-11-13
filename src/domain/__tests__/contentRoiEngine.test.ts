import { describe, it, expect } from "vitest";
import {
  calcularContentRoi,
  formatearMoneda,
  type InputCalculoRoi,
} from "../contentRoiEngine";
import type { InboxItem } from "@/services/supabase";

describe("contentRoiEngine — Motor de Métricas de Conversión y Retorno de Contenido (Sprint S+15)", () => {
  it("calcula el embudo completo B2B de 7 etapas con coherencia matemática y tasas válidas", () => {
    const input: InputCalculoRoi = {
      proposalsCount: 26,
      totalImpressions: 48000,
      totalClicks: 1200,
      filtroPeriodo: "ultimos_30_dias",
    };

    const resultado = calcularContentRoi(input);

    expect(resultado.filtroPeriodo).toBe("ultimos_30_dias");
    expect(resultado.periodoLabel).toBe("Últimos 30 Días");
    expect(resultado.etapasEmbudo).toHaveLength(7);

    // Verificar nombres de etapas en orden
    const nombresEtapas = resultado.etapasEmbudo.map((e) => e.etapa);
    expect(nombresEtapas[0]).toContain("Publicaciones");
    expect(nombresEtapas[1]).toContain("Clicks");
    expect(nombresEtapas[2]).toContain("Leads");
    expect(nombresEtapas[3]).toContain("Decisores Calificados");
    expect(nombresEtapas[4]).toContain("Diagnósticos");
    expect(nombresEtapas[5]).toContain("Dossiers");
    expect(nombresEtapas[6]).toContain("Acuerdos de Alcance");

    // Verificar métricas acumuladas
    expect(resultado.metricasTotales.publicaciones).toBeGreaterThanOrEqual(12);
    expect(resultado.metricasTotales.impresiones).toBeGreaterThanOrEqual(15000);
    expect(resultado.metricasTotales.clicksUtm).toBeGreaterThanOrEqual(450);
    expect(resultado.metricasTotales.leadsTotales).toBeGreaterThanOrEqual(10);
    expect(resultado.metricasTotales.leadsCalificados).toBeGreaterThan(0);
    expect(resultado.metricasTotales.propuestasEmitidas).toBeGreaterThan(0);
    expect(resultado.metricasTotales.valorTotalPipeline).toBeGreaterThan(0);

    // Tasas de conversión válidas entre 0 y 100
    expect(resultado.metricasTotales.tasaClickToLead).toBeGreaterThan(0);
    expect(resultado.metricasTotales.tasaClickToLead).toBeLessThanOrEqual(100);
    expect(resultado.metricasTotales.tasaLeadToPropuesta).toBeGreaterThan(0);
    expect(resultado.metricasTotales.tasaLeadToPropuesta).toBeLessThanOrEqual(100);
  });

  it("desglosa el rendimiento y pipeline por los 4 arquetipos de dolor directivo", () => {
    const resultado = calcularContentRoi({});

    expect(resultado.metricasPorArquetipo).toHaveLength(4);
    const arquetipos = resultado.metricasPorArquetipo.map((m) => m.arquetipo);
    expect(arquetipos).toContain("fundador_saturado");
    expect(arquetipos).toContain("segunda_generacion");
    expect(arquetipos).toContain("estancamiento_comercial");
    expect(arquetipos).toContain("calidad_entregas");

    // Cada arquetipo debe tener un valor de pipeline calculado
    resultado.metricasPorArquetipo.forEach((arq) => {
      expect(arq.valorPipeline).toBeGreaterThanOrEqual(0);
      expect(arq.color).toBeTruthy();
      expect(arq.label).toBeTruthy();
    });

    // Diagnóstico estratégico
    expect(resultado.diagnosticoEstrategico.arquetipoMasRentable).toBeTruthy();
    expect(resultado.diagnosticoEstrategico.cuelloDeBotellaDetectado).toBeTruthy();
    expect(resultado.diagnosticoEstrategico.accionSugerida).toBeTruthy();
  });

  it("clasifica adecuadamente los cuadrantes de leads (Calificados, En Nutrición, Comunidad)", () => {
    const mockInbox: InboxItem[] = [
      {
        id: "1",
        kind: "dm",
        platform: "instagram",
        thread_id: "t1",
        external_id: "m1",
        author_name: "Martín Benítez",
        author_username: "martinb",
        author_is_follower: true,
        text: "Hola, soy dueño de una distribuidora y estoy saturado de apagar incendios. Necesito delegar urgente y quiero coordinar una reunión de consultoría.",
        direction: "incoming",
        item_time: "2026-11-10T10:00:00Z",
        archived: false,
        attachment_url: null,
        sentiment: "pregunta",
        sentiment_note: null,
        replied_at: null,
      },
      {
        id: "2",
        kind: "comment",
        platform: "facebook",
        thread_id: "t2",
        external_id: "m2",
        author_name: "Carlos Gómez",
        author_username: "carlosg",
        author_is_follower: false,
        text: "Muy buen post sobre procesos de calidad.",
        direction: "incoming",
        item_time: "2026-11-11T12:00:00Z",
        archived: false,
        attachment_url: null,
        sentiment: "positivo",
        sentiment_note: null,
        replied_at: null,
      },
    ];

    const resultado = calcularContentRoi({
      inboxItems: mockInbox,
      filtroPeriodo: "ultimos_30_dias",
    });

    expect(resultado.cuadrantesLead.calificadosAltos).toBeGreaterThanOrEqual(1);
    expect(resultado.cuadrantesLead.comunidad).toBeGreaterThanOrEqual(1);
  });

  it("escala las métricas proporcionalmente al seleccionar 'trimestre_actual' o 'historico_completo'", () => {
    const rMes = calcularContentRoi({ filtroPeriodo: "ultimos_30_dias", proposalsCount: 20 });
    const rTrimestre = calcularContentRoi({ filtroPeriodo: "trimestre_actual", proposalsCount: 20 });
    const rHistorico = calcularContentRoi({ filtroPeriodo: "historico_completo", proposalsCount: 20 });

    expect(rTrimestre.metricasTotales.publicaciones).toBe(rMes.metricasTotales.publicaciones * 3);
    expect(rHistorico.metricasTotales.publicaciones).toBe(rMes.metricasTotales.publicaciones * 6);
  });

  it("formatearMoneda formatea valores monetarios en ARS correctamente", () => {
    const str = formatearMoneda(1800000);
    expect(str).toContain("1.800.000");
  });
});
