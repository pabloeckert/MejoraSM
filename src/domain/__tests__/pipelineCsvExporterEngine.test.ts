import { describe, it, expect } from "vitest";
import {
  sanitizarCeldaCsv,
  escaparCeldaCsv,
  generarCsvDataset,
  generarPaqueteCsvCompleto,
  type TipoDatasetExportacion,
} from "../pipelineCsvExporterEngine";

describe("pipelineCsvExporterEngine (Martin Kleppmann DDIA & OWASP CSV Security)", () => {
  it("incluye UTF-8 BOM (\\uFEFF) y saltos de línea RFC 4180 (\\r\\n) en los 4 datasets", () => {
    const tipos: TipoDatasetExportacion[] = [
      "embudo_roi",
      "prospectos_sla",
      "grilla_editorial_26s",
      "memo_grove_socios",
    ];

    for (const tipo of tipos) {
      const res = generarCsvDataset(tipo, { fechaReferencia: "2026-11-13" });
      expect(res.csvContent.startsWith("\uFEFF")).toBe(true);
      expect(res.csvContent).toContain("\r\n");
      expect(res.filas.length).toBeGreaterThan(0);
      expect(res.headers.length).toBeGreaterThan(0);
      expect(res.nombreArchivo).toContain("2026-11-13");
      expect(res.nombreArchivo.endsWith(".csv")).toBe(true);
    }
  });

  it("sanitiza payloads peligrosos contra OWASP CSV Formula Injection prefijando comilla simple", () => {
    expect(sanitizarCeldaCsv("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(sanitizarCeldaCsv("+SUM(A1:A10)")).toBe("'+SUM(A1:A10)");
    expect(sanitizarCeldaCsv("-2+3")).toBe("'-2+3");
    expect(sanitizarCeldaCsv("@IMPORTXML(\"http://evil.com\",\"//a\")")).toBe(
      "'@IMPORTXML(\"http://evil.com\",\"//a\")"
    );
    expect(sanitizarCeldaCsv("\tHYPERLINK")).toBe("'\tHYPERLINK");
    expect(sanitizarCeldaCsv("\rFORMULA")).toBe("' FORMULA");
    expect(sanitizarCeldaCsv(null)).toBe("");
    expect(sanitizarCeldaCsv(undefined)).toBe("");
    expect(sanitizarCeldaCsv("Línea 1\nLínea 2")).toBe("Línea 1 Línea 2");
  });

  it("escapa correctamente comillas dobles y comas dentro de celdas CSV según RFC 4180", () => {
    expect(escaparCeldaCsv('Empresa "Líder", S.A.', ",")).toBe(
      '"Empresa ""Líder"", S.A."'
    );
    expect(escaparCeldaCsv("Texto simple sin signos", ",")).toBe(
      "Texto simple sin signos"
    );
    expect(escaparCeldaCsv("=1+1, peligro", ",")).toBe('"\'=1+1, peligro"');
  });

  it("genera tsvContent separado por tabuladores (\\t) y sin BOM para pegado limpio en Google Sheets", () => {
    const res = generarCsvDataset("prospectos_sla", {
      fechaReferencia: "2026-11-13",
    });
    expect(res.tsvContent.startsWith("\uFEFF")).toBe(false);
    const lineas = res.tsvContent.split("\n");
    expect(lineas.length).toBe(res.filas.length + 1); // header + rows
    expect(lineas[0].split("\t")).toEqual(res.headers);
  });

  it("genera datos precisos y consistentes en embudo_roi, prospectos_sla, grilla_editorial_26s y memo_grove_socios", () => {
    const roiCsv = generarCsvDataset("embudo_roi", {
      filtroPeriodo: "trimestre_actual",
      fechaReferencia: "2026-11-13",
    });
    expect(roiCsv.subtitulo).toContain("Trimestre Actual");
    expect(roiCsv.csvContent).toContain("TOTAL PIPELINE ACTIVO");
    expect(roiCsv.resumenMetricas.valorPipelineTotalARS).toBeGreaterThan(0);

    const prosCsv = generarCsvDataset("prospectos_sla", {
      fechaReferencia: "2026-11-13",
      prospectos: [
        {
          id: "P-99",
          fechaCaptura: "2026-11-13",
          autor: "Carlos =Malicioso",
          empresa: "PyME Industrial, S.R.L.",
          canal: "LinkedIn",
          arquetipo: "Dueño Atrapado",
          score: 88,
          cuadrante: "CALIFICADO_ALTO",
          estadoSla: "EN_TIEMPO",
          horasTranscurridas: 1.5,
          horasRestantes: 46.5,
          email: "carlos@pyme.com",
          telefono: "+54911",
          valorEstimadoARS: 1800000,
        },
      ],
    });
    expect(prosCsv.resumenMetricas.totalFilas).toBe(1);
    expect(prosCsv.resumenMetricas.valorPipelineTotalARS).toBe(1800000);
    expect(prosCsv.csvContent).toContain('"PyME Industrial, S.R.L."');

    const grillaCsv = generarCsvDataset("grilla_editorial_26s", {
      fechaReferencia: "2026-11-13",
    });
    expect(grillaCsv.resumenMetricas.totalFilas).toBe(12);
    expect(grillaCsv.csvContent).toContain("utm_source=mejora_sm");

    const memoCsv = generarCsvDataset("memo_grove_socios", {
      semanaMemo: 46,
      fechaReferencia: "2026-11-13",
    });
    expect(memoCsv.titulo).toContain("2026-W46");
    expect(memoCsv.csvContent).toContain("Publicaciones & Ritmo");
    expect(memoCsv.csvContent).toContain("Prioridad #1");
  });

  it("compila el paquete maestro consolidado 4 en 1 con los 4 bloques y único BOM inicial", () => {
    const paquete = generarPaqueteCsvCompleto({
      fechaReferencia: "2026-11-13",
      semanaMemo: 46,
    });

    expect(paquete.nombreArchivoMaestro).toBe(
      "MejoraSM_Reporte_Maestro_4en1_2026-11-13.csv"
    );
    expect(paquete.csvMaestroConsolidado.startsWith("\uFEFF")).toBe(true);
    // Verifica que no haya BOMs duplicados en el medio del archivo maestro
    expect(paquete.csvMaestroConsolidado.slice(1)).not.toContain("\uFEFF");
    expect(paquete.csvMaestroConsolidado).toContain("EMBUDO B2B & RETORNO DE CONTENIDO");
    expect(paquete.csvMaestroConsolidado).toContain("AUDITORÍA DE PROSPECTOS B2B");
    expect(paquete.csvMaestroConsolidado).toContain("GRILLA EDITORIAL EVERGREEN");
    expect(paquete.csvMaestroConsolidado).toContain("MEMORANDO OPERATIVO EJECUTIVO DE SOCIOS");
  });
});
