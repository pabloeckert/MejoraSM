import { describe, it, expect } from "vitest";
import {
  calcularExecutiveOperationsMemo,
  formatearMemoMarkdown,
  formatearMemoWhatsApp,
  formatearMonedaARS,
} from "../executiveOperationsMemoEngine";

describe("ExecutiveOperationsMemoEngine (Sprint S+17: Andy Grove & Peter Drucker)", () => {
  it("calcula y genera el memorando operativo con indicadores completos de gobernanza", () => {
    const memo = calcularExecutiveOperationsMemo({
      semana: 46,
      periodo: "10 Nov - 16 Nov 2026",
      proposalsCount: 3,
      publishedCount: 3,
      clicksUtm: 1280,
      leadsCount: 14,
      qualifiedLeadsCount: 5,
    });

    expect(memo.semana).toBe("2026-W46");
    expect(memo.numeroSemana).toBe(46);
    expect(memo.periodo).toBe("10 Nov - 16 Nov 2026");
    expect(memo.emisor).toContain("Pablo Eckert");
    expect(memo.destinatarios).toHaveLength(2);

    // Indicadores Grove
    const ind = memo.indicadores;
    expect(ind.publicaciones.publicadas).toBe(3);
    expect(ind.publicaciones.tasaCumplimientoPct).toBe(100);
    expect(ind.traficoYAtribucion.clicksUtm).toBe(1280);
    expect(ind.conversionYLeads.leadsTotales).toBe(14);
    expect(ind.conversionYLeads.calificadosAltos).toBe(5);
    expect(ind.saludSla.cumplimientoSlaPct).toBe(100);
    expect(ind.pipelineEstimadoARS).toBeGreaterThan(0);
    expect(ind.tiempoAprobacionMinutos).toBeLessThan(5);

    // Arquetipos de trinchera
    expect(memo.desgloseArquetipos).toHaveLength(4);
    expect(memo.desgloseArquetipos.some((a) => a.arquetipo === "fundador_saturado")).toBe(true);

    // Paso limitante (Andy Grove)
    expect(memo.pasoLimitante.pasoLimitante).toBeTruthy();
    expect(memo.pasoLimitante.impactoEnNegocio).toBeTruthy();
    expect(memo.pasoLimitante.accionInmediata).toBeTruthy();

    // Prioridades y alertas
    expect(memo.alertasYFricciones.length).toBeGreaterThanOrEqual(2);
    expect(memo.prioridadesSemanaSiguiente).toHaveLength(3);
  });

  it("formatea moneda en pesos argentinos (ARS)", () => {
    const formato = formatearMonedaARS(1800000);
    expect(formato).toContain("1.800.000");
  });

  it("genera el formato Markdown con estructura ejecutiva para Notion y reportes", () => {
    const memo = calcularExecutiveOperationsMemo();
    const md = formatearMemoMarkdown(memo);

    expect(md).toContain("# MEMORANDO OPERATIVO EJECUTIVO DE SOCIOS");
    expect(md).toContain("## 1. RESUMEN EJECUTIVO");
    expect(md).toContain("## 2. INDICADORES CLAVE DE GOBIERNO (GROVE INDICATORS)");
    expect(md).toContain("## 3. CONTRIBUCIÓN POR ARQUETIPO DE DOLOR DIRECTIVO");
    expect(md).toContain("## 4. EL PASO LIMITANTE (CUELLO DE BOTELLA OPERATIVO)");
    expect(md).toContain("## 5. ALERTAS Y FRICCIONES DEL SISTEMA");
    expect(md).toContain("## 6. PRIORIDADES DIRECTIVAS PARA LA PRÓXIMA SEMANA");
    expect(md).toContain("mejoraok.com");
  });

  it("genera el resumen compacto de WhatsApp para el lunes por la mañana", () => {
    const memo = calcularExecutiveOperationsMemo();
    const wa = formatearMemoWhatsApp(memo);

    expect(wa).toContain("📊 *MEMO OPERATIVO SEMANAL");
    expect(wa).toContain("*1. Pulso de Resultados:*");
    expect(wa).toContain("*2. Foco Limitante:*");
    expect(wa).toContain("*3. Prioridades de la Semana:*");
    expect(wa).toContain("Pipeline Activo:");
  });
});
