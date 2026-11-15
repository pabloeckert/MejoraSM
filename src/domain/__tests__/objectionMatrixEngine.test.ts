/**
 * objectionMatrixEngine.test.ts
 * Pruebas unitarias para el motor de Matriz de Objeciones Directivas Ocultas B2B
 */

import { describe, it, expect } from "vitest";
import {
  listarObjecionesCatalogo,
  resolverObjecionDirectiva,
  type InputResolucionObjecion,
} from "../objectionMatrixEngine";

describe("objectionMatrixEngine", () => {
  it("retorna el catálogo completo de las 6 objeciones directivas predeterminadas", () => {
    const catalogo = listarObjecionesCatalogo();
    expect(catalogo.length).toBe(6);

    const ids = catalogo.map((o) => o.id);
    expect(ids).toContain("sin_tiempo_sobrecarga");
    expect(ids).toContain("rubro_muy_particular");
    expect(ids).toContain("software_previo_fracasado");
    expect(ids).toContain("miedo_resistencia_equipo");
    expect(ids).toContain("incertidumbre_pais_esperar");
    expect(ids).toContain("miedo_perder_control_calidad");

    for (const obj of catalogo) {
      expect(obj.titulo).toBeTruthy();
      expect(obj.fraseTextualCliente).toBeTruthy();
      expect(obj.miedoOcultoDirectivo).toBeTruthy();
      expect(obj.etiquetadoEmpaticoVoss).toBeTruthy();
      expect(obj.reencuadreSistemicoMaister).toBeTruthy();
      expect(obj.causaRaizSistema).toBeTruthy();
      expect(obj.solucionParametrica4D).toBeTruthy();
      expect(obj.guionLlamada90Segundos.aperturaValidacion).toBeTruthy();
      expect(obj.guionLlamada90Segundos.desarmeTactico).toBeTruthy();
      expect(obj.guionLlamada90Segundos.puenteMetodologico).toBeTruthy();
      expect(obj.guionLlamada90Segundos.preguntaSocraticaCierre).toBeTruthy();
    }
  });

  it("resuelve la objeción sin_tiempo_sobrecarga con estructura en 3 pasos", () => {
    const input: InputResolucionObjecion = {
      idObjecion: "sin_tiempo_sobrecarga",
      nombreDirectivo: "Martín Benítez",
      empresaNombre: "Metalúrgica Litoral",
      arquetipoDolor: "fundador_saturado",
    };

    const res = resolverObjecionDirectiva(input);

    expect(res.idResolucion).toMatch(/^OBJ-[A-Z0-9]+-\d{4}$/);
    expect(res.nombreDirectivo).toBe("Martín Benítez");
    expect(res.empresaNombre).toBe("Metalúrgica Litoral");
    expect(res.objecion.id).toBe("sin_tiempo_sobrecarga");

    // Estructura de 3 pasos
    expect(res.estructuraTresPasos.paso1VerdadSinJuzgar).toContain("Metalúrgica Litoral");
    expect(res.estructuraTresPasos.paso2CausaRaizSistema).toContain("no es falta de capacidad");
    expect(res.estructuraTresPasos.paso3DireccionConcreta).toContain("mejoraok.com/diagnostico");
  });

  it("resuelve la objeción software_previo_fracasado destacando que el software sin proceso automatiza el caos", () => {
    const input: InputResolucionObjecion = {
      idObjecion: "software_previo_fracasado",
      nombreDirectivo: "Carlos Menéndez",
      empresaNombre: "Distribuidora del Centro",
    };

    const res = resolverObjecionDirectiva(input);

    expect(res.objecion.reencuadreSistemicoMaister).toContain("informatizar el desorden");
    expect(res.objecion.solucionParametrica4D).toContain("Método 4D");
    expect(res.resumenWhatsAppDirectivo).toContain("Distribuidora del Centro");
    expect(res.resumenWhatsAppDirectivo).toContain("https://mejoraok.com/diagnostico");
  });

  it("resuelve la objeción miedo_perder_control_calidad distinguiendo delegar de desentenderse", () => {
    const input: InputResolucionObjecion = {
      idObjecion: "miedo_perder_control_calidad",
      nombreDirectivo: "Ing. Laura Gómez",
      empresaNombre: "Plásticos Industriales",
    };

    const res = resolverObjecionDirectiva(input);

    expect(res.objecion.reencuadreSistemicoMaister).toContain("Estar encima de todo no es control");
    expect(res.objecion.dimensionPrincipal).toBe("personal");
    expect(res.briefingMarkdown).toContain("Plásticos Industriales");
  });

  it("proporciona guión de llamada de 90 segundos con los 4 pasos de Jeb Blount y Chris Voss", () => {
    const res = resolverObjecionDirectiva({
      idObjecion: "miedo_resistencia_equipo",
    });

    const guion = res.objecion.guionLlamada90Segundos;
    expect(guion.aperturaValidacion).toBeTruthy();
    expect(guion.desarmeTactico).toContain("Parece");
    expect(guion.puenteMetodologico).toContain("acuerdos");
    expect(guion.preguntaSocraticaCierre).toContain("?");
  });

  it("supera la auditoría de Brand Voice con calificación APROBADO_IMPECABLE", () => {
    const res = resolverObjecionDirectiva({
      idObjecion: "incertidumbre_pais_esperar",
      empresaNombre: "Tecnología Aplicada",
      nombreDirectivo: "Lic. Pablo Rossi",
    });

    expect(res.auditoriaBrandVoice.estadoAprobacion).toBe("APROBADO_IMPECABLE");
    expect(res.auditoriaBrandVoice.scoreGlobal).toBe(100);
    expect(res.auditoriaBrandVoice.cuadranteRadicalCandor).toBe("CALIDEZ_CON_VERDAD");
    expect(res.auditoriaBrandVoice.hallazgos.length).toBe(0);
  });
});
