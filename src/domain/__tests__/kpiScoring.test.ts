// src/domain/__tests__/kpiScoring.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { generarGrillaEvergreen26Semanas } from "../gridGenerator";
import { SqliteSMRepository, MetricaRegistroDTO } from "../../infrastructure/sqlite/SqliteSMRepository";
import { PropuestaMejoraSMDTO } from "../types";

describe("Subfase 1.5: Planificador Evergreen 26 Semanas y Cerebro de KPIs Local", () => {
  const testDbPath = path.join(process.cwd(), "data", "test_kpi_scoring_subfase_1_5.db");
  let repo: SqliteSMRepository;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore Windows lock
      }
    }
    repo = new SqliteSMRepository(testDbPath);
  });

  afterEach(() => {
    if (repo) {
      repo.close();
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore Windows lock
      }
    }
  });

  function insertarPropuestaBase(id: string, canal: any = "linkedin") {
    const p: PropuestaMejoraSMDTO = {
      propuesta_id: id,
      canal_destino: canal,
      dia_programado: new Date().toISOString(),
      origen_boveda_id: "BOV-001",
      borradores: [
        {
          opcion: "A",
          tipo_formato: "carrusel_pdf",
          estrategia: "jab_educativo",
          titulo_portada: "Título A",
          cuerpo_texto: "Texto A",
          copy_tres_pasos: {
            paso1_dolor: "Dolor",
            paso2_reencuadre: "Reencuadre",
            paso3_direccion_web: "mejoraok.com",
          },
          cta_texto: "CTA A",
        },
        {
          opcion: "B",
          tipo_formato: "post_autoridad",
          estrategia: "networking_prueba_social",
          titulo_portada: "Título B",
          cuerpo_texto: "Texto B",
          copy_tres_pasos: {
            paso1_dolor: "Dolor B",
            paso2_reencuadre: "Reencuadre B",
            paso3_direccion_web: "mejoraok.com",
          },
          cta_texto: "CTA B",
        },
        {
          opcion: "C",
          tipo_formato: "post_directo",
          estrategia: "right_hook_conversion",
          titulo_portada: "Título C",
          cuerpo_texto: "Texto C",
          copy_tres_pasos: {
            paso1_dolor: "Dolor C",
            paso2_reencuadre: "Reencuadre C",
            paso3_direccion_web: "mejoraok.com",
          },
          cta_texto: "CTA C",
        },
      ],
      borrador_seleccionado: "A",
      tratamiento_visual: {
        marco_expandido_requerido: true,
        color_fondo_marco: "#FFFFFF",
        regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
        relacion_aspecto_destino: "4:5",
      },
      imagen_boveda_vinculada: {
        id: "BOV-IMG-01",
        ruta_archivo_local: "content/inbox/test.jpg",
      },
      estado: "aprobado",
    };
    repo.guardarPropuesta(p);
  }

  it("genera una grilla evergreen completa de 26 semanas (6 meses) balanceada al 80% Jabs / 20% Right Hooks", () => {
    const fechaInicio = new Date("2026-10-19T00:00:00Z");
    const grilla = generarGrillaEvergreen26Semanas(fechaInicio);

    expect(grilla.total_semanas).toBe(26);
    expect(grilla.total_piezas).toBe(78); // 3 piezas por semana

    const pctJabs = (grilla.jabs_totales / grilla.total_piezas) * 100;
    const pctHooks = (grilla.right_hooks_totales / grilla.total_piezas) * 100;

    // Regla 80/20 balanceada
    expect(pctJabs).toBeGreaterThanOrEqual(79);
    expect(pctJabs).toBeLessThanOrEqual(82);
    expect(pctHooks).toBeGreaterThanOrEqual(18);
    expect(pctHooks).toBeLessThanOrEqual(21);
  });

  it("registra clics a mejoraok.com y conversiones a MejoraDiagnostico por Buyer Persona", () => {
    insertarPropuestaBase("PROP-W42-01", "linkedin");
    insertarPropuestaBase("PROP-W42-02", "linkedin");
    insertarPropuestaBase("PROP-W42-03", "whatsapp");

    const ahora = new Date().toISOString();

    const metricasSemilla: MetricaRegistroDTO[] = [
      {
        id: "MET-001",
        propuesta_id: "PROP-W42-01",
        canal: "linkedin",
        buyer_persona: "emprendedor_saturado",
        dimension: "organizacional",
        formato: "carrusel_pdf",
        dia_semana: "Martes",
        horario_publicacion: "08:30",
        clics_mejoraok: 120,
        diagnosticos_completados: 18,
        score_impacto: 8.5,
        registrado_el: ahora,
      },
      {
        id: "MET-002",
        propuesta_id: "PROP-W42-02",
        canal: "linkedin",
        buyer_persona: "empresario_mal_asesorado",
        dimension: "empresarial",
        formato: "post_autoridad",
        dia_semana: "Jueves",
        horario_publicacion: "18:30",
        clics_mejoraok: 85,
        diagnosticos_completados: 14,
        score_impacto: 9.2,
        registrado_el: ahora,
      },
      {
        id: "MET-003",
        propuesta_id: "PROP-W42-03",
        canal: "whatsapp",
        buyer_persona: "orden_para_crecer",
        dimension: "comercial",
        formato: "post_directo",
        dia_semana: "Viernes",
        horario_publicacion: "11:00",
        clics_mejoraok: 60,
        diagnosticos_completados: 6,
        score_impacto: 7.0,
        registrado_el: ahora,
      },
    ];

    for (const m of metricasSemilla) {
      repo.registrarMetricaAtribucion(m);
    }

    const ranking = repo.obtenerRankingPorBuyerPersona();
    expect(ranking).toHaveLength(3);

    // El primer lugar en diagnósticos completados debe ser emprendedor_saturado
    expect(ranking[0].buyer_persona).toBe("emprendedor_saturado");
    expect(ranking[0].total_clics).toBe(120);
    expect(ranking[0].total_diagnosticos).toBe(18);
    expect(ranking[0].tasa_conversion).toBe(15.0); // 18 / 120 * 100

    // Ranking de piezas individuales
    const rankingPiezas = repo.obtenerRankingPiezas(5);
    expect(rankingPiezas).toHaveLength(3);
    expect(rankingPiezas[0].propuesta_id).toBe("PROP-W42-01");
    expect(rankingPiezas[0].diagnosticos_completados).toBe(18);
  });

  it("calcula la recomendación de combinación comercial óptima", () => {
    insertarPropuestaBase("PROP-01", "linkedin");
    const ahora = new Date().toISOString();

    repo.registrarMetricaAtribucion({
      id: "MET-OPT-1",
      propuesta_id: "PROP-01",
      canal: "linkedin",
      buyer_persona: "empresario_mal_asesorado",
      dimension: "empresarial",
      formato: "post_autoridad",
      dia_semana: "Jueves",
      horario_publicacion: "18:30",
      clics_mejoraok: 90,
      diagnosticos_completados: 20,
      score_impacto: 9.8,
      registrado_el: ahora,
    });

    const opt = repo.optimizarCombinacionComercial();
    expect(opt.mejorDia).toBe("Jueves");
    expect(opt.mejorHorario).toBe("18:30");
    expect(opt.mejorDimension).toBe("empresarial");
    expect(opt.mejorFormato).toBe("post_autoridad");
    expect(opt.scorePromedio).toBeGreaterThan(9.0);
  });
});
