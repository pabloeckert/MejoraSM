import { describe, it, expect } from "vitest";
import {
  generarDiagnosticoEjecutivo,
  inferirArquetipoDolor,
  type ArquetipoDolor,
} from "../executiveDiagnosticEngine";

describe("executiveDiagnosticEngine — Motor de Diagnósticos Ejecutivos B2B", () => {
  it("infiere correctamente el arquetipo de dolor a partir de síntomas o texto", () => {
    expect(inferirArquetipoDolor("Problemas familiares con fundadores históricos")).toBe("segunda_generacion");
    expect(inferirArquetipoDolor("No vendemos suficiente, cotizaciones sin respuesta")).toBe("estancamiento_comercial");
    expect(inferirArquetipoDolor("Muchos retrabajos y quejas por fallas de calidad")).toBe("calidad_entregas");
    expect(inferirArquetipoDolor("Estoy desbordado y saturado de urgencias")).toBe("fundador_saturado");
  });

  it("genera un diagnóstico completo para 'fundador_saturado' con los 4 pilares estructurales", () => {
    const diag = generarDiagnosticoEjecutivo({
      nombreDirectivo: "Martín Benítez",
      empresa: "Distribuidora San Martín",
      arquetipoDolor: "fundador_saturado",
      scoreLead: 95,
    });

    expect(diag.id).toMatch(/^DIAG-/);
    expect(diag.directivo).toBe("Martín Benítez");
    expect(diag.empresa).toBe("Distribuidora San Martín");
    expect(diag.arquetipo).toBe("fundador_saturado");
    expect(diag.scoreOportunidad).toBe(95);

    // Reencuadre Challenger
    expect(diag.reencuadreChallenger.premisaFalsa).toContain("Me faltan horas en el día");
    expect(diag.reencuadreChallenger.verdadSistemica).toContain("acuerdos operativos explícitos");
    expect(diag.reencuadreChallenger.paradojaDirectiva).toContain("trinchera");

    // Matriz Causa Raíz: 3 filas
    expect(diag.matrizCausaRaiz).toHaveLength(3);
    expect(diag.matrizCausaRaiz[0].sintomaVisible).toContain("incendios");

    // 4 Dimensiones
    expect(diag.cuatroDimensiones).toHaveLength(4);
    const ids = diag.cuatroDimensiones.map((d) => d.id);
    expect(ids).toEqual(["personal", "organizacional", "comercial", "empresarial"]);

    // Hoja de ruta a 90 días: 3 fases
    expect(diag.hojaDeRuta90Dias).toHaveLength(3);
    expect(diag.hojaDeRuta90Dias[0].periodo).toBe("Días 1 a 30");
    expect(diag.hojaDeRuta90Dias[2].periodo).toBe("Días 61 a 90");

    // CTA
    expect(diag.ctaAgendamiento.url).toContain("mejoraok.com/diagnostico");
  });

  it("genera el resumen copiable para WhatsApp/Email respetando los lineamientos de marca", () => {
    const diag = generarDiagnosticoEjecutivo({
      nombreDirectivo: "Lucía Carrizo",
      empresa: "Metalúrgica Del Sur",
      arquetipoDolor: "calidad_entregas",
    });

    const texto = diag.diagnosticoResumenTexto;
    expect(texto).toContain("*Diagnóstico Preliminar Directivo — Mejora Continua*");
    expect(texto).toContain("Lucía Carrizo");
    expect(texto).toContain("Metalúrgica Del Sur");
    expect(texto).toContain("1. El Reencuadre Sistémico:");
    expect(texto).toContain("2. Causa Raíz Identificada en Trinchera:");
    expect(texto).toContain("3. Plan de Desahogo a 90 Días:");
    expect(texto).toContain("https://mejoraok.com/diagnostico?ref=");
  });

  it("garantiza que todos los arquetipos estén totalmente poblados y coherentes", () => {
    const arquetipos: ArquetipoDolor[] = [
      "fundador_saturado",
      "segunda_generacion",
      "estancamiento_comercial",
      "calidad_entregas",
    ];

    for (const arq of arquetipos) {
      const diag = generarDiagnosticoEjecutivo({
        nombreDirectivo: "Directivo Test",
        arquetipoDolor: arq,
      });

      expect(diag.arquetipoLabel).toBeTruthy();
      expect(diag.reencuadreChallenger.verdadSistemica).toBeTruthy();
      expect(diag.matrizCausaRaiz.length).toBe(3);
      expect(diag.cuatroDimensiones.length).toBe(4);
      expect(diag.hojaDeRuta90Dias.length).toBe(3);
    }
  });

  it("aplica límites seguros (clamp) al score de oportunidad", () => {
    const diagBajo = generarDiagnosticoEjecutivo({
      nombreDirectivo: "Test",
      scoreLead: 10,
    });
    expect(diagBajo.scoreOportunidad).toBe(30);

    const diagAlto = generarDiagnosticoEjecutivo({
      nombreDirectivo: "Test",
      scoreLead: 150,
    });
    expect(diagAlto.scoreOportunidad).toBe(100);
  });
});
