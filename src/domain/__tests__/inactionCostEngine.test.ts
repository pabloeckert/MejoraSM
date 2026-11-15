/**
 * inactionCostEngine.test.ts
 * Pruebas unitarias para el motor de Costo de Inacción Operativa & Retorno B2B
 */

import { describe, it, expect } from "vitest";
import {
  calcularCostoInaccion,
  formatearMonedaARS,
  type InputCostoInaccion,
} from "../inactionCostEngine";

describe("inactionCostEngine", () => {
  it("calcula el costo de inacción con parámetros por defecto para fundador_saturado", () => {
    const input: InputCostoInaccion = {
      facturacionMensualARS: 40_000_000,
      tamanoEquipo: 15,
      arquetipoDolor: "fundador_saturado",
    };

    const resultado = calcularCostoInaccion(input);

    expect(resultado.idCalculo).toMatch(/^COI-[A-Z0-9]+-\d{4}$/);
    expect(resultado.facturacionMensualARS).toBe(40_000_000);
    expect(resultado.facturacionAnualARS).toBe(480_000_000);
    expect(resultado.horasSemanalesBomberismo).toBe(16); // default fundador_saturado
    expect(resultado.horasMensualesBomberismo).toBe(69); // 16 * 4.33 redondeado
    expect(resultado.horasAnualesBomberismo).toBe(832); // 16 * 52

    // Verificar componentes del costo
    expect(resultado.drenajeDirectivoMensualARS).toBeGreaterThan(0);
    expect(resultado.costoRetrabajosMensualARS).toBeGreaterThan(0);
    expect(resultado.lucroCesanteComercialMensualARS).toBeGreaterThan(0);

    // Suma consolidada
    const sumaEsperada =
      resultado.drenajeDirectivoMensualARS +
      resultado.costoRetrabajosMensualARS +
      resultado.lucroCesanteComercialMensualARS;
    expect(resultado.costoInaccionMensualARS).toBe(sumaEsperada);
    expect(resultado.costoInaccionAnualARS).toBe(sumaEsperada * 12);
    expect(resultado.porcentajeSobreFacturacion).toBeGreaterThan(0);
  });

  it("calcula con inputs personalizados y arquetipo calidad_entregas", () => {
    const input: InputCostoInaccion = {
      facturacionMensualARS: 80_000_000,
      tamanoEquipo: 35,
      arquetipoDolor: "calidad_entregas",
      horasSemanalesBomberismo: 20,
      valorHoraDirectivaARS: 50_000,
      porcentajeRetrabajosYFriccion: 12,
      cotizacionesMensualesSinSeguimiento: 8,
      ticketPromedioARS: 3_000_000,
      empresaNombre: "Metalúrgica Andina",
      nombreDirectivo: "Ing. Roberto Calvo",
    };

    const res = calcularCostoInaccion(input);

    expect(res.empresaNombre).toBe("Metalúrgica Andina");
    expect(res.nombreDirectivo).toBe("Ing. Roberto Calvo");
    expect(res.arquetipoDolor).toBe("calidad_entregas");
    expect(res.horasSemanalesBomberismo).toBe(20);
    expect(res.horasMensualesBomberismo).toBe(87); // 20 * 4.33
    expect(res.drenajeDirectivoMensualARS).toBe(87 * Math.round(50_000 * 1.1));

    // Desglose de 4 dimensiones completo
    expect(res.desgloseDimensiones.personal.dimension).toBe("personal");
    expect(res.desgloseDimensiones.organizacional.dimension).toBe("organizacional");
    expect(res.desgloseDimensiones.comercial.dimension).toBe("comercial");
    expect(res.desgloseDimensiones.empresarial.dimension).toBe("empresarial");

    // Verificar que los textos están orientados a sistemas y no culpan al equipo
    expect(res.desgloseDimensiones.personal.causaRaizSistema).toContain("delegación");
    expect(res.desgloseDimensiones.organizacional.solucionSistemica4D).toContain("Gemba Walk");
  });

  it("proyecta la recuperación a 90 días y el ROI conservador", () => {
    const res = calcularCostoInaccion({
      facturacionMensualARS: 30_000_000,
      tamanoEquipo: 10,
    });

    expect(res.proyeccionRecuperacion.ahorroMensualProyectadoARS).toBeGreaterThan(0);
    expect(res.proyeccionRecuperacion.ahorroAnualProyectadoARS).toBe(
      res.proyeccionRecuperacion.ahorroMensualProyectadoARS * 12
    );
    expect(res.proyeccionRecuperacion.horasDirectivasLiberadasMes).toBeGreaterThan(0);
    expect(res.proyeccionRecuperacion.reduccionRetrabajosPct).toBe(50);
    expect(res.proyeccionRecuperacion.roiEstimadoRatio).toContain("x");
  });

  it("formatea moneda argentina con separador de miles", () => {
    expect(formatearMonedaARS(1500000)).toMatch(/\$\s*1\.500\.000/);
    expect(formatearMonedaARS(35420100)).toMatch(/\$\s*35\.420\.100/);
  });

  it("genera resúmenes ejecutivos en WhatsApp y Markdown con estructura de 3 pasos", () => {
    const res = calcularCostoInaccion({
      facturacionMensualARS: 50_000_000,
      tamanoEquipo: 20,
      empresaNombre: "Distribuidora Litoral",
      nombreDirectivo: "Carlos Menéndez",
    });

    // Estructura de 3 pasos
    expect(res.estructuraTresPasos.paso1VerdadSinJuzgar).toContain("Distribuidora Litoral");
    expect(res.estructuraTresPasos.paso2CausaRaizSistema).toContain("no responde a falta de capacidad");
    expect(res.estructuraTresPasos.paso3DireccionConcreta).toContain("mejoraok.com/diagnostico");

    // Resumen WhatsApp
    expect(res.resumenWhatsApp).toContain("Estimado/a Carlos Menéndez");
    expect(res.resumenWhatsApp).toContain("La Verdad de Trinchera");
    expect(res.resumenWhatsApp).toContain("https://mejoraok.com/diagnostico");

    // Markdown
    expect(res.briefingMarkdown).toContain("# CÁLCULO DE COSTO DE INACCIÓN OPERATIVA");
    expect(res.briefingMarkdown).toContain("Distribuidora Litoral");
  });

  it("supera la auditoría de Brand Voice con calificación APROBADO_IMPECABLE", () => {
    const res = calcularCostoInaccion({
      facturacionMensualARS: 60_000_000,
      tamanoEquipo: 25,
      arquetipoDolor: "estancamiento_comercial",
    });

    expect(res.auditoriaBrandVoice.estadoAprobacion).toBe("APROBADO_IMPECABLE");
    expect(res.auditoriaBrandVoice.scoreGlobal).toBe(100);
    expect(res.auditoriaBrandVoice.cuadranteRadicalCandor).toBe("CALIDEZ_CON_VERDAD");
    expect(res.auditoriaBrandVoice.hallazgos.length).toBe(0);
  });
});
