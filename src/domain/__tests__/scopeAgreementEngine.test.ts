import { describe, it, expect } from "vitest";
import {
  generarAcuerdoAlcance,
  normalizarArquetipoAcuerdo,
  type InputAcuerdoAlcance,
} from "../scopeAgreementEngine";

describe("scopeAgreementEngine — Motor de Acuerdos de Alcance y Propuestas B2B (Sprint S+14)", () => {
  it("genera un acuerdo de alcance completo con las 3 fases, 4 dimensiones y compromisos mutuos", () => {
    const input: InputAcuerdoAlcance = {
      nombreDirectivo: "Martín Benítez",
      empresa: "Distribuidora San Martín",
      cargo: "Dueño / CEO",
      canal: "Instagram",
      arquetipoDolor: "fundador_saturado",
      mesesDuracion: 3,
      modalidad: "Hibrida (Trinchera + Remoto)",
    };

    const acuerdo = generarAcuerdoAlcance(input);

    // Verificación de datos de cabecera
    expect(acuerdo.idAcuerdo).toMatch(/^ACUERDO-[A-Z0-9]+-\d+$/);
    expect(acuerdo.directivo).toBe("Martín Benítez");
    expect(acuerdo.empresa).toBe("Distribuidora San Martín");
    expect(acuerdo.validezDias).toBe(15);
    expect(acuerdo.arquetipo).toBe("fundador_saturado");

    // Diagnóstico y objetivo
    expect(acuerdo.diagnosticoSituacional).toContain("Martín Benítez");
    expect(acuerdo.diagnosticoSituacional).toContain("Distribuidora San Martín");
    expect(acuerdo.objetivoGeneral).toContain("Distribuidora San Martín");

    // 3 fases de intervención a 90 días
    expect(acuerdo.fasesIntervencion).toHaveLength(3);
    expect(acuerdo.fasesIntervencion[0].fase).toBe("Fase 1");
    expect(acuerdo.fasesIntervencion[0].nombre).toContain("Mapeo");
    expect(acuerdo.fasesIntervencion[0].entregables.length).toBeGreaterThanOrEqual(2);
    expect(acuerdo.fasesIntervencion[1].fase).toBe("Fase 2");
    expect(acuerdo.fasesIntervencion[2].fase).toBe("Fase 3");

    // Entregables en las 4 Dimensiones
    expect(acuerdo.entregablesPorDimension).toHaveLength(4);
    const dimensiones = acuerdo.entregablesPorDimension.map((d) => d.dimension);
    expect(dimensiones).toEqual(["Personal", "Organizacional", "Comercial", "Empresarial"]);

    // Compromisos mutuos (David Maister)
    expect(acuerdo.compromisosMutuos).toHaveLength(2);
    expect(acuerdo.compromisosMutuos[0].actor).toContain("Mejora Continua");
    expect(acuerdo.compromisosMutuos[1].actor).toContain("La Dirección");

    // Esquema de inversión y resumen WhatsApp
    expect(acuerdo.esquemaInversion.duracionMeses).toBe(3);
    expect(acuerdo.esquemaInversion.modalidad).toBe("Hibrida (Trinchera + Remoto)");
    expect(acuerdo.resumenWhatsApp).toContain("Hola Martín");
    expect(acuerdo.resumenWhatsApp).toContain("Distribuidora San Martín");
  });

  it("normaliza arquetipos legacy o variantes de texto correctamente", () => {
    expect(normalizarArquetipoAcuerdo("comercial")).toBe("estancamiento_comercial");
    expect(normalizarArquetipoAcuerdo("ventas")).toBe("estancamiento_comercial");
    expect(normalizarArquetipoAcuerdo("calidad")).toBe("calidad_entregas");
    expect(normalizarArquetipoAcuerdo("retrabajos")).toBe("calidad_entregas");
    expect(normalizarArquetipoAcuerdo("segunda_generacion")).toBe("segunda_generacion");
    expect(normalizarArquetipoAcuerdo("familia")).toBe("segunda_generacion");
    expect(normalizarArquetipoAcuerdo("arbitrario_desconocido")).toBe("fundador_saturado");
    expect(normalizarArquetipoAcuerdo(undefined)).toBe("fundador_saturado");
  });

  it("se adapta correctamente a los 4 arquetipos de trinchera sin fallos ni valores undefined", () => {
    const arquetipos = [
      "fundador_saturado",
      "segunda_generacion",
      "estancamiento_comercial",
      "calidad_entregas",
    ] as const;

    for (const arq of arquetipos) {
      const acuerdo = generarAcuerdoAlcance({
        nombreDirectivo: "Roberto Rossi",
        empresa: "Metalúrgica Rossi",
        arquetipoDolor: arq,
      });

      expect(acuerdo.arquetipo).toBe(arq);
      expect(acuerdo.arquetipoLabel).toBeTruthy();
      expect(acuerdo.diagnosticoSituacional).toBeTruthy();
      expect(acuerdo.objetivoGeneral).toBeTruthy();
      expect(acuerdo.fasesIntervencion).toHaveLength(3);
      expect(acuerdo.entregablesPorDimension).toHaveLength(4);
      expect(acuerdo.esquemaInversion.inversionMensual).toBeTruthy();
    }
  });
});
