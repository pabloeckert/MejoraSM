import { describe, it, expect } from "vitest";
import { generarMeetingDossier } from "../meetingDossierEngine";
import type { ArquetipoDolor } from "../executiveDiagnosticEngine";

describe("meetingDossierEngine — Motor de Dossiers de Preparación para Reuniones 1 a 1", () => {
  it("genera un dossier completo para 'fundador_saturado' con los 6 pilares de preparación", () => {
    const dossier = generarMeetingDossier({
      nombreDirectivo: "Martín Benítez",
      empresa: "Distribuidora San Martín",
      cargo: "Dueño / CEO",
      canal: "Instagram DM",
      arquetipoDolor: "fundador_saturado",
      scoreLead: 100,
    });

    expect(dossier.idDossier).toMatch(/^DOSSIER-/);
    expect(dossier.directivo).toBe("Martín Benítez");
    expect(dossier.empresa).toBe("Distribuidora San Martín");
    expect(dossier.canal).toBe("Instagram DM");
    expect(dossier.scoreLead).toBe(100);

    // Perfil psicológico
    expect(dossier.perfilPsicologicoDirectivo.estiloLiderazgo).toContain("reactivo");
    expect(dossier.perfilPsicologicoDirectivo.cargaMentalEstimada).toContain("Crítica");

    // Guión de apertura
    expect(dossier.guionAperturaChallenger90s).toContain("Martín Benítez");
    expect(dossier.guionAperturaChallenger90s).toContain("Distribuidora San Martín");
    expect(dossier.guionAperturaChallenger90s).toContain("45 minutos");

    // Fricciones ocultas
    expect(dossier.hipotesisFriccionesOcultas.length).toBe(3);

    // 4 Preguntas de trinchera
    expect(dossier.preguntasTrinchera4D).toHaveLength(4);
    const dims = dossier.preguntasTrinchera4D.map((p) => p.dimension);
    expect(dims).toEqual(["Personal", "Organizacional", "Comercial", "Empresarial"]);

    // Objeciones
    expect(dossier.objecionesAnticipadas).toHaveLength(3);
    expect(dossier.objecionesAnticipadas[0].reencuadreConsultivo).toContain("tiempo");

    // Checklist de pre-vuelo
    expect(dossier.checklistPreVuelo10Min.length).toBeGreaterThanOrEqual(5);

    // Resumen copiable
    expect(dossier.guionResumenCopiable).toContain("DOSSIER CONFIDENCIAL PRE-REUNIÓN 1 A 1");
    expect(dossier.guionResumenCopiable).toContain("Martín Benítez");
  });

  it("genera dossiers coherentes para los 4 arquetipos de dolor", () => {
    const arquetipos: ArquetipoDolor[] = [
      "fundador_saturado",
      "segunda_generacion",
      "estancamiento_comercial",
      "calidad_entregas",
    ];

    for (const arq of arquetipos) {
      const d = generarMeetingDossier({
        nombreDirectivo: "Líder Test",
        arquetipoDolor: arq,
      });

      expect(d.arquetipo).toBe(arq);
      expect(d.arquetipoLabel).toBeTruthy();
      expect(d.guionAperturaChallenger90s).toContain("Líder Test");
      expect(d.preguntasTrinchera4D).toHaveLength(4);
      expect(d.objecionesAnticipadas).toHaveLength(3);
      expect(d.propuestaServicioRecomendada.nombreServicio).toBeTruthy();
    }
  });

  it("limita el score de lead dentro de los rangos seguros (30 - 100)", () => {
    const dMin = generarMeetingDossier({
      nombreDirectivo: "Test",
      scoreLead: 10,
    });
    expect(dMin.scoreLead).toBe(30);

    const dMax = generarMeetingDossier({
      nombreDirectivo: "Test",
      scoreLead: 120,
    });
    expect(dMax.scoreLead).toBe(100);
  });
});
