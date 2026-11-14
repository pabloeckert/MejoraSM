import { describe, it, expect } from "vitest";
import {
  auditarBrandVoice,
  PRESETS_AUDITORIA_BRAND_VOICE,
} from "../brandVoiceLinterEngine";

describe("brandVoiceLinterEngine ('Calidez con Verdad' & Manual de Marca MC — Sprint S+19)", () => {
  it("detecta ataques personales y lenguaje punitivo clasificando en AGRESION_PUNITIVA", () => {
    const res = auditarBrandVoice(
      "Si tu PyME está estancada es tu culpa porque no sabés liderar a un equipo incompetente."
    );

    expect(res.estadoAprobacion).toBe("RECHAZADO_TONO_NO_ALINEADO");
    expect(res.cuadranteRadicalCandor).toBe("AGRESION_PUNITIVA");
    expect(res.metricasTexto.bloqueantesCount).toBeGreaterThanOrEqual(2);
    expect(
      res.hallazgos.some((h) => h.regla === "sistema_no_persona")
    ).toBe(true);
  });

  it("detecta humo gurú y apelación a venta por precio o descuento", () => {
    const res = auditarBrandVoice(
      "Descubrí nuestra fórmula mágica con éxito garantizado en una oferta imperdible con descuento exclusivo."
    );

    expect(res.estadoAprobacion).toBe("RECHAZADO_TONO_NO_ALINEADO");
    expect(
      res.hallazgos.some((h) => h.regla === "calidez_con_verdad")
    ).toBe(true);
    expect(
      res.hallazgos.some((h) => h.regla === "no_vender_por_precio")
    ).toBe(true);
  });

  it("aprueba con puntaje impecable (100/100) un copy alineado a Sistema + 4 Dimensiones + Dirección", () => {
    const presetImpecable = PRESETS_AUDITORIA_BRAND_VOICE.find(
      (p) => p.id === "borrador_impecable_mc"
    )!;
    const res = auditarBrandVoice(presetImpecable.texto);

    expect(res.scoreGlobal).toBe(100);
    expect(res.estadoAprobacion).toBe("APROBADO_IMPECABLE");
    expect(res.cuadranteRadicalCandor).toBe("CALIDEZ_CON_VERDAD");
    expect(res.hallazgos.length).toBe(0);
    expect(res.metricasTexto.tieneTerminosSistema).toBe(true);
    expect(res.metricasTexto.tieneDireccionConcreta).toBe(true);
  });

  it("identifica COMPLACENCIA_DIFUSA en textos tibios que carecen de sistema y dirección", () => {
    const presetTibio = PRESETS_AUDITORIA_BRAND_VOICE.find(
      (p) => p.id === "borrador_tibio_sin_direccion"
    )!;
    const res = auditarBrandVoice(presetTibio.texto);

    expect(res.cuadranteRadicalCandor).toBe("COMPLACENCIA_DIFUSA");
    expect(res.estadoAprobacion).toBe("APROBADO_CON_AJUSTES");
    expect(res.puntajesPorPilar.estructuraDireccion4D).toBe(0);
  });

  it("calibra quirúrgicamente un borrador con vicios elevándolo a 100/100 al re-auditar", () => {
    const presetVicios = PRESETS_AUDITORIA_BRAND_VOICE.find(
      (p) => p.id === "borrador_con_vicios"
    )!;
    const auditoriaInicial = auditarBrandVoice(presetVicios.texto);
    expect(auditoriaInicial.estadoAprobacion).toBe("RECHAZADO_TONO_NO_ALINEADO");

    // Re-auditar el texto calibrado sugerido
    const reAuditoria = auditarBrandVoice(
      auditoriaInicial.textoCalibradoSugerido
    );
    expect(reAuditoria.scoreGlobal).toBe(100);
    expect(reAuditoria.estadoAprobacion).toBe("APROBADO_IMPECABLE");
    expect(reAuditoria.metricasTexto.bloqueantesCount).toBe(0);
  });

  it("estructura el desglose en 3 pasos (Verdad sin juzgar, Causa Raíz de Sistema, Dirección Concreta)", () => {
    const res = auditarBrandVoice("Texto corto de prueba.");
    expect(res.estructuraTresPasos.paso1VerdadSinJuzgar.length).toBeGreaterThan(10);
    expect(res.estructuraTresPasos.paso2CausaRaizSistema.length).toBeGreaterThan(10);
    expect(res.estructuraTresPasos.paso3DireccionConcreta.length).toBeGreaterThan(10);
  });
});
