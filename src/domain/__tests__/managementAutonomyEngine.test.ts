/**
 * managementAutonomyEngine.test.ts
 * Pruebas unitarias para el motor de matrices de autonomía de mandos medios y TRM (Sprint S+24)
 */

import { describe, it, expect } from "vitest";
import {
  calcularAutonomiaMandosMedios,
  listarRolesMandosMedios,
} from "../managementAutonomyEngine";

describe("managementAutonomyEngine", () => {
  it("listarRolesMandosMedios retorna el catálogo de 4 roles predefinidos", () => {
    const roles = listarRolesMandosMedios();
    expect(roles.length).toBe(4);
    const ids = roles.map((r) => r.id);
    expect(ids).toContain("jefe_taller_produccion");
    expect(ids).toContain("responsable_ventas_comercial");
    expect(ids).toContain("administracion_finanzas");
    expect(ids).toContain("logistica_despacho");
  });

  it("calcula la matriz para Jefe de Taller con umbrales en 3 niveles", () => {
    const resultado = calcularAutonomiaMandosMedios({
      idRol: "jefe_taller_produccion",
      nombreMandoMedio: "Juan Rossi",
      nombreDirectivo: "Carlos Menéndez",
      empresaNombre: "Metalúrgica del Plata",
      montoLimiteARS: 300_000,
    });

    expect(resultado.idMatriz).toMatch(/^AUTON-JEFE_T-\d{4}$/);
    expect(resultado.nombreMandoMedio).toBe("Juan Rossi");
    expect(resultado.empresaNombre).toBe("Metalúrgica del Plata");
    expect(resultado.rol.nombreRol).toContain("Jefe de Planta / Taller / Producción");
    expect(resultado.umbrales.length).toBe(3);

    // Niveles 1, 2 y 3
    expect(resultado.umbrales[0].tipoAccion).toBe("CONSULTAR_PREVIO");
    expect(resultado.umbrales[1].tipoAccion).toBe("ACTUAR_Y_AVISAR");
    expect(resultado.umbrales[2].tipoAccion).toBe("AUTONOMIA_PLENA");

    // Verifica que el monto dinámico esté reflejado
    expect(resultado.umbrales[0].reglaParametrica).toContain("300.000");
  });

  it("adopta correctamente el estilo de supervisión según el nivel TRM de Andy Grove", () => {
    const resultadoBaja = calcularAutonomiaMandosMedios({
      idRol: "responsable_ventas_comercial",
      nivelTRM: "baja",
    });
    expect(resultadoBaja.estiloSupervisionGrove.enfoque).toContain("Instrucción Paso a Paso");
    expect(resultadoBaja.estiloSupervisionGrove.frecuenciaContacto).toContain("Diario");

    const resultadoAlta = calcularAutonomiaMandosMedios({
      idRol: "administracion_finanzas",
      nivelTRM: "alta",
    });
    expect(resultadoAlta.estiloSupervisionGrove.enfoque).toContain("Delegación Plena");
    expect(resultadoAlta.estiloSupervisionGrove.frecuenciaContacto).toContain("Quincenal");
  });

  it("genera el plan de transición a 60 días en 3 fases estructuradas", () => {
    const resultado = calcularAutonomiaMandosMedios({
      idRol: "logistica_despacho",
      nombreMandoMedio: "Esteban López",
      nombreDirectivo: "Mariano Costa",
      empresaNombre: "Distribuidora Central",
    });

    const p = resultado.planTransicion60Dias;
    expect(p.fase1Dias1a15.nombre).toContain("Días 1 a 15");
    expect(p.fase1Dias1a15.entregables.length).toBeGreaterThanOrEqual(3);

    expect(p.fase2Dias16a30.nombre).toContain("Días 16 a 30");
    expect(p.fase2Dias16a30.entregables.length).toBeGreaterThanOrEqual(3);

    expect(p.fase3Dias31a60.nombre).toContain("Días 31 a 60");
    expect(p.fase3Dias31a60.entregables.length).toBeGreaterThanOrEqual(3);
  });

  it("certifica cumplimiento estricto de Brand Voice 100/100 (Calidez con Verdad)", () => {
    const resultado = calcularAutonomiaMandosMedios({
      idRol: "jefe_taller_produccion",
      nombreMandoMedio: "Carlos",
      nombreDirectivo: "Roberto",
      empresaNombre: "Industrias San Martín",
    });

    expect(resultado.auditoriaBrandVoice.scoreGlobal).toBe(100);
    expect(resultado.auditoriaBrandVoice.cuadranteRadicalCandor).toBe("CALIDEZ_CON_VERDAD");
    expect(resultado.auditoriaBrandVoice.estadoAprobacion).toBe("APROBADO_IMPECABLE");
    expect(resultado.auditoriaBrandVoice.hallazgos.length).toBe(0);
  });

  it("genera el resumen para WhatsApp y el Markdown con los nombres correctos", () => {
    const resultado = calcularAutonomiaMandosMedios({
      idRol: "personalizado",
      nombreMandoMedio: "Lucía Fernández",
      nombreDirectivo: "Guillermo Pérez",
      empresaNombre: "Alimentos del Sur",
      montoLimiteARS: 500_000,
    });

    expect(resultado.resumenWhatsAppDirectivo).toContain("Guillermo Pérez");
    expect(resultado.resumenWhatsAppDirectivo).toContain("Alimentos del Sur");
    expect(resultado.resumenWhatsAppDirectivo).toContain("Lucía Fernández");
    expect(resultado.resumenWhatsAppDirectivo).toContain("mejoraok.com/diagnostico");

    expect(resultado.briefingMarkdown).toContain("# MATRIZ DE AUTONOMÍA Y DELEGACIÓN PARAMÉTRICA");
    expect(resultado.briefingMarkdown).toContain("Alimentos del Sur");
    expect(resultado.briefingMarkdown).toContain("500.000");
  });
});
