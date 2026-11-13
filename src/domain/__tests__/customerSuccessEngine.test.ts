import { describe, it, expect } from "vitest";
import {
  normalizarArquetipoCaso,
  obtenerCasosExitoBiblioteca,
  obtenerCasoPorArquetipo,
  generarCasoExito,
  formatearCasoWhatsApp,
  formatearCasoParaCarrusel,
} from "../customerSuccessEngine";

describe("CustomerSuccessEngine (Sprint S+16: StoryBrand & Social Proof)", () => {
  it("normaliza cadenas de arquetipos a los 4 tipos oficiales B2B", () => {
    expect(normalizarArquetipoCaso("fundador_saturado")).toBe("fundador_saturado");
    expect(normalizarArquetipoCaso("dueño saturado")).toBe("fundador_saturado");
    expect(normalizarArquetipoCaso("2da generacion")).toBe("segunda_generacion");
    expect(normalizarArquetipoCaso("transicion familiar")).toBe("segunda_generacion");
    expect(normalizarArquetipoCaso("ventas intuitivas")).toBe("ventas_intuitivas");
    expect(normalizarArquetipoCaso("sin pipeline comercial")).toBe("ventas_intuitivas");
    expect(normalizarArquetipoCaso("calidad y retrabajos")).toBe("calidad_retrabajos");
    expect(normalizarArquetipoCaso("errores de proceso")).toBe("calidad_retrabajos");
    expect(normalizarArquetipoCaso(undefined)).toBe("fundador_saturado");
  });

  it("retorna los 4 casos calibrados de la biblioteca con métricas de trinchera", () => {
    const casos = obtenerCasosExitoBiblioteca();
    expect(casos).toHaveLength(4);

    for (const caso of casos) {
      expect(caso.titulo).toBeTruthy();
      expect(caso.empresa).toBeTruthy();
      expect(caso.rubro).toBeTruthy();
      expect(caso.tamano).toBeTruthy();
      expect(caso.rolProtagonista).toBeTruthy();

      // Marco StoryBrand
      expect(caso.problemaStoryBrand.externo).toBeTruthy();
      expect(caso.problemaStoryBrand.interno).toBeTruthy();
      expect(caso.problemaStoryBrand.filosofico).toBeTruthy();

      // Guía y Metodología 4D
      expect(caso.guiaYPlan.plan4D.personal).toBeTruthy();
      expect(caso.guiaYPlan.plan4D.organizacional).toBeTruthy();
      expect(caso.guiaYPlan.plan4D.comercial).toBeTruthy();
      expect(caso.guiaYPlan.plan4D.empresarial).toBeTruthy();

      // Métricas cuantitativas (Cialdini)
      expect(caso.metricasImpacto.length).toBeGreaterThanOrEqual(3);
      for (const m of caso.metricasImpacto) {
        expect(m.metrica).toBeTruthy();
        expect(m.antes).toBeTruthy();
        expect(m.despues).toBeTruthy();
        expect(m.cambio).toBeTruthy();
      }

      // Transformación y citas
      expect(caso.transformacion.estadoAnterior).toBeTruthy();
      expect(caso.transformacion.estadoActual).toBeTruthy();
      expect(caso.transformacion.citaHeroe).toBeTruthy();
      expect(caso.leccionesDirectivas.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("permite conmutar la anonimización institucional (Trusted Advisor)", () => {
    const casoAnon = obtenerCasoPorArquetipo("fundador_saturado", true);
    expect(casoAnon.anonimizado).toBe(true);
    expect(casoAnon.empresa).toBe("Distribuidora Mayorista de Insumos");

    const casoReal = obtenerCasoPorArquetipo("fundador_saturado", false);
    expect(casoReal.anonimizado).toBe(false);
    expect(casoReal.empresa).toBe("Distribuidora Centro SA");
  });

  it("personaliza y genera un caso a medida conservando la arquitectura de valor", () => {
    const custom = generarCasoExito({
      arquetipo: "segunda_generacion",
      empresa: "Metalúrgica Andina",
      rubro: "Manufactura Pesada",
      tamano: "60 operarios",
      rolProtagonista: "Director Ejecutivo",
      anonimizado: false,
    });

    expect(custom.empresa).toBe("Metalúrgica Andina");
    expect(custom.rubro).toBe("Manufactura Pesada");
    expect(custom.tamano).toBe("60 operarios");
    expect(custom.rolProtagonista).toBe("Director Ejecutivo");
    expect(custom.arquetipo).toBe("segunda_generacion");
    expect(custom.problemaStoryBrand.externo).toContain("estilos de liderazgo");
  });

  it("genera formatos de distribución rápida (WhatsApp y Carrusel LinkedIn)", () => {
    const caso = obtenerCasoPorArquetipo("ventas_intuitivas");

    // Snippet WhatsApp
    const wa = formatearCasoWhatsApp(caso);
    expect(wa).toContain("pipeline activo");
    expect(wa).toContain("Acuerdos de Alcance 4D");
    expect(wa).toContain("20 minutos");

    // Carrusel LinkedIn
    const carrusel = formatearCasoParaCarrusel(caso);
    expect(carrusel).toContain("# Carrusel LinkedIn:");
    expect(carrusel).toContain("Diapositiva 1:");
    expect(carrusel).toContain("Diapositiva 5:");
    expect(carrusel).toContain("Nota visual:");
  });
});
