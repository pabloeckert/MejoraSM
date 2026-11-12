// src/domain/__tests__/prospectoSla.test.ts
import { describe, it, expect } from "vitest";
import {
  calcularVencimientoSLA,
  determinarEstadoSLA,
  inferirArquetipoMensaje,
  calcularMetricasSla,
  type ProspectoBaseSla,
} from "../prospectoSla";

describe("Dominio Prospecto SLA 48h (Service Blueprint)", () => {
  it("calcularVencimientoSLA suma exactamente 48 horas en formato ISO", () => {
    const base = new Date("2026-11-10T10:00:00.000Z");
    const vencimiento = calcularVencimientoSLA(base, 48);
    expect(vencimiento).toBe("2026-11-12T10:00:00.000Z");
  });

  describe("determinarEstadoSLA (Semáforo de 3 Estados)", () => {
    const t0 = new Date("2026-11-10T12:00:00.000Z");

    it("clasifica como 'en_tiempo' cuando transcurrieron menos de 24 horas", () => {
      const ahora = new Date("2026-11-10T22:00:00.000Z"); // 10h transcurridas
      const res = determinarEstadoSLA(t0, ahora);
      expect(res.estado).toBe("en_tiempo");
      expect(res.horas_transcurridas).toBe(10);
      expect(res.horas_restantes).toBe(38);
    });

    it("clasifica como 'proximo_vencer' cuando transcurrieron entre 24 y 48 horas", () => {
      const ahora = new Date("2026-11-11T18:00:00.000Z"); // 30h transcurridas
      const res = determinarEstadoSLA(t0, ahora);
      expect(res.estado).toBe("proximo_vencer");
      expect(res.horas_transcurridas).toBe(30);
      expect(res.horas_restantes).toBe(18);
    });

    it("clasifica como 'vencido' cuando transcurrieron 48 horas o más (alerta de fuga)", () => {
      const ahora = new Date("2026-11-12T15:00:00.000Z"); // 51h transcurridas
      const res = determinarEstadoSLA(t0, ahora);
      expect(res.estado).toBe("vencido");
      expect(res.horas_transcurridas).toBe(51);
      expect(res.horas_restantes).toBe(-3);
    });
  });

  describe("inferirArquetipoMensaje", () => {
    it("detecta arquetipo 'saturado' en mensajes con palabras clave operativas", () => {
      expect(inferirArquetipoMensaje("No tengo tiempo, vivo apagando incendios en el taller")).toBe("saturado");
      expect(inferirArquetipoMensaje("Estoy totalmente desbordado de trabajo y no puedo delegar")).toBe("saturado");
    });

    it("detecta arquetipo 'esceptico' en consultas de precio, costo o dudas", () => {
      expect(inferirArquetipoMensaje("¿Cuánto sale la consultoría? ¿Qué garantía tengo?")).toBe("esceptico");
      expect(inferirArquetipoMensaje("Tengo dudas de si esto funciona para mi rubro")).toBe("esceptico");
    });

    it("detecta 'orden_para_crecer' por defecto en consultas generales", () => {
      expect(inferirArquetipoMensaje("Hola, quisiera saber más sobre la metodología 4D")).toBe("orden_para_crecer");
      expect(inferirArquetipoMensaje("")).toBe("orden_para_crecer");
    });
  });

  describe("calcularMetricasSla", () => {
    it("calcula métricas consolidadas, tiempos promedio y porcentaje de cumplimiento", () => {
      const ahora = new Date("2026-11-11T12:00:00.000Z");

      const muestra: ProspectoBaseSla[] = [
        // 1. Pendiente capturado hace 6h -> en_tiempo
        {
          prospecto_id: "P1",
          email: "p1@e.com",
          nombre: "L1",
          telefono: null,
          empresa: null,
          estado: "CAPTURADO",
          origen_utm: "linkedin",
          pieza_id_atribucion: "PZ-01",
          perfil_detectado_id: "saturado",
          fecha_captura: "2026-11-11T06:00:00.000Z",
          fecha_actualizacion: "2026-11-11T06:00:00.000Z",
          sla_limite_calificacion: "2026-11-13T06:00:00.000Z",
        },
        // 2. Pendiente capturado hace 30h -> proximo_vencer
        {
          prospecto_id: "P2",
          email: "p2@e.com",
          nombre: "L2",
          telefono: null,
          empresa: null,
          estado: "CAPTURADO",
          origen_utm: "instagram",
          pieza_id_atribucion: "PZ-02",
          perfil_detectado_id: "esceptico",
          fecha_captura: "2026-11-10T06:00:00.000Z",
          fecha_actualizacion: "2026-11-10T06:00:00.000Z",
          sla_limite_calificacion: "2026-11-12T06:00:00.000Z",
        },
        // 3. Pendiente capturado hace 55h -> vencido
        {
          prospecto_id: "P3",
          email: "p3@e.com",
          nombre: "L3",
          telefono: null,
          empresa: null,
          estado: "CAPTURADO",
          origen_utm: "facebook",
          pieza_id_atribucion: "PZ-03",
          perfil_detectado_id: "orden_para_crecer",
          fecha_captura: "2026-11-09T05:00:00.000Z",
          fecha_actualizacion: "2026-11-09T05:00:00.000Z",
          sla_limite_calificacion: "2026-11-11T05:00:00.000Z",
        },
        // 4. Calificado a las 12 horas de captura -> calificados_en_sla
        {
          prospecto_id: "P4",
          email: "p4@e.com",
          nombre: "L4",
          telefono: null,
          empresa: null,
          estado: "CALIFICADO",
          origen_utm: "linkedin",
          pieza_id_atribucion: "PZ-04",
          perfil_detectado_id: "saturado",
          fecha_captura: "2026-11-10T00:00:00.000Z",
          fecha_actualizacion: "2026-11-10T12:00:00.000Z", // 12h después
          sla_limite_calificacion: "2026-11-12T00:00:00.000Z",
        },
      ];

      const resumen = calcularMetricasSla(muestra, ahora);
      expect(resumen.total_capturados).toBe(4);
      expect(resumen.pendientes_atencion).toBe(3);
      expect(resumen.en_tiempo).toBe(1);
      expect(resumen.proximo_vencer).toBe(1);
      expect(resumen.vencidos).toBe(1);
      expect(resumen.calificados_en_sla).toBe(1);
      expect(resumen.calificados_fuera_sla).toBe(0);
      expect(resumen.tiempo_promedio_atencion_horas).toBe(12);
      // Casos exitosos = 1 (en tiempo) + 1 (calificado en sla) = 2 de 4 -> 50%
      expect(resumen.cumplimiento_pct).toBe(50);
    });
  });
});
