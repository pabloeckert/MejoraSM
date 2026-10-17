// src/infrastructure/sqlite/__tests__/SqliteSMRepository.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteSMRepository } from "../SqliteSMRepository";
import { type FichaBovedaDTO, type PropuestaMejoraSMDTO } from "../../../domain/types";

describe("SqliteSMRepository (Persistencia Local Soberana con node:sqlite)", () => {
  let repo: SqliteSMRepository;

  beforeEach(() => {
    repo = new SqliteSMRepository(":memory:");
  });

  afterEach(() => {
    repo.close();
  });

  it("almacena y recupera fichas de Bóveda respetando las 4 capas canónicas", () => {
    const ficha: FichaBovedaDTO = {
      id: "BOV-2026-NET-001",
      origen_carpeta: "networking_y_autoridad",
      dimension: "networking_y_autoridad",
      tipo_activo: "imagen_con_texto",
      titulo: "Reunión de Directorio con Directores C-Level",
      contenido_raw: "Encuentro de trabajo sobre profesionalización de operaciones y gobierno corporativo.",
      metadatos_multimedia: {
        ruta_archivo_local: "content/inbox/networking_y_autoridad/reunion_directorio.jpg",
        personas_presentes: ["Pablo Eckert", "Director de Operaciones", "CEO"],
        orientacion_original: "horizontal",
        locacion: "Planta Industrial",
      },
      fase_comercial_sugerida: "tofu_atraccion",
      creado_el: "2026-10-16T12:00:00.000Z",
    };

    repo.guardarFichaBoveda(ficha);
    const recuperada = repo.obtenerFichaBoveda(ficha.id);

    expect(recuperada).not.toBeNull();
    expect(recuperada?.id).toBe("BOV-2026-NET-001");
    expect(recuperada?.origen_carpeta).toBe("networking_y_autoridad");
    expect(recuperada?.metadatos_multimedia?.personas_presentes).toContain("Pablo Eckert");
    expect(recuperada?.metadatos_multimedia?.orientacion_original).toBe("horizontal");

    const lista = repo.listarFichasBoveda({ dimension: "networking_y_autoridad" });
    expect(lista).toHaveLength(1);
    expect(lista[0].titulo).toBe("Reunión de Directorio con Directores C-Level");
  });

  it("gestiona propuestas completas con los 3 borradores paralelos y copy calibrado en 3 pasos", () => {
    const propuesta: PropuestaMejoraSMDTO = {
      propuesta_id: "PROP-2026-W42-01",
      canal_destino: "linkedin",
      dia_programado: "2026-10-19T09:30:00.000Z",
      origen_boveda_id: "BOV-2026-NET-001",
      borradores: [
        {
          opcion: "A",
          tipo_formato: "carrusel_pdf",
          estrategia: "jab_educativo",
          titulo_portada: "El cuello de botella sos vos",
          cuerpo_texto: "Si cada decisión del día tiene que pasar por tu escritorio...",
          copy_tres_pasos: {
            paso1_dolor: "Si cada decisión depende de vos, no tenés empresa.",
            paso2_reencuadre: "El liderazgo profesional consiste en diseñar procesos transferibles.",
            paso3_direccion_web: "Medí tu dependencia en mejoraok.com",
          },
          slides: ["Slide 1", "Slide 2", "Slide 3"],
          cta_texto: "Deslizá para ordenar tu empresa",
        },
        {
          opcion: "B",
          tipo_formato: "post_autoridad",
          estrategia: "networking_prueba_social",
          titulo_portada: "Autoridad Directiva en Planta",
          cuerpo_texto: "Acompañando a directores en el terreno...",
          copy_tres_pasos: {
            paso1_dolor: "En empresas medianas, el desorden se paga caro.",
            paso2_reencuadre: "El orden operativo comienza en el liderazgo directivo.",
            paso3_direccion_web: "Conocé más en mejoraok.com",
          },
          cta_texto: "Sumate al After Office directivo",
        },
        {
          opcion: "C",
          tipo_formato: "post_directo",
          estrategia: "right_hook_conversion",
          titulo_portada: "¿Cómo está tu empresa hoy?",
          cuerpo_texto: "No estás perdido. Estás desordenado.",
          copy_tres_pasos: {
            paso1_dolor: "No estás perdido. Estás desordenado.",
            paso2_reencuadre: "La claridad comienza por medir objetivamente las 4 dimensiones.",
            paso3_direccion_web: "Completá el diagnóstico en mejoraok.com",
          },
          cta_texto: "Completar diagnóstico ahora en mejoraok.com",
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
        id: "BOV-2026-NET-001",
        ruta_archivo_local: "content/inbox/networking_y_autoridad/reunion_directorio.jpg",
        titulo: "Reunión C-Level",
      },
      estado: "pendiente_revision",
      metricas_atribucion: {
        clics_mejoraok: 0,
        diagnosticos_completados: 0,
      },
    };

    repo.guardarPropuesta(propuesta);
    const recuperada = repo.obtenerPropuesta(propuesta.propuesta_id);

    expect(recuperada).not.toBeNull();
    expect(recuperada?.propuesta_id).toBe("PROP-2026-W42-01");
    expect(recuperada?.borradores).toHaveLength(3);
    expect(recuperada?.borradores[0].copy_tres_pasos.paso1_dolor).toBe("Si cada decisión depende de vos, no tenés empresa.");
    expect(recuperada?.tratamiento_visual.marco_expandido_requerido).toBe(true);
    expect(recuperada?.estado).toBe("pendiente_revision");
  });

  it("permite la aprobación individual y la aprobación atómica de lote completo", () => {
    // Insertamos 3 propuestas pendientes
    for (let i = 1; i <= 3; i++) {
      repo.guardarPropuesta({
        propuesta_id: `PROP-TEST-0${i}`,
        canal_destino: "linkedin",
        dia_programado: `2026-10-2${i}T09:30:00.000Z`,
        origen_boveda_id: "BOV-TEST",
        borradores: [
          {
            opcion: "A",
            tipo_formato: "carrusel_pdf",
            estrategia: "jab_educativo",
            titulo_portada: `Test ${i}`,
            cuerpo_texto: "Body",
            copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
            cta_texto: "CTA",
          },
          {
            opcion: "B",
            tipo_formato: "post_autoridad",
            estrategia: "networking_prueba_social",
            titulo_portada: `Test B ${i}`,
            cuerpo_texto: "Body B",
            copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
            cta_texto: "CTA",
          },
          {
            opcion: "C",
            tipo_formato: "post_directo",
            estrategia: "right_hook_conversion",
            titulo_portada: `Test C ${i}`,
            cuerpo_texto: "Body C",
            copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
            cta_texto: "CTA",
          },
        ],
        borrador_seleccionado: "A",
        tratamiento_visual: {
          marco_expandido_requerido: true,
          color_fondo_marco: "#FFFFFF",
          regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
          relacion_aspecto_destino: "4:5",
        },
        imagen_boveda_vinculada: { id: "BOV-TEST", ruta_archivo_local: "test.jpg" },
        estado: "pendiente_revision",
      });
    }

    // Aprobación individual
    repo.aprobarPropuesta("PROP-TEST-01");
    expect(repo.obtenerPropuesta("PROP-TEST-01")?.estado).toBe("aprobado");
    expect(repo.obtenerPropuesta("PROP-TEST-02")?.estado).toBe("pendiente_revision");

    // Aprobación de lote completo
    const aprobadas = repo.aprobarLoteCompleto(["PROP-TEST-02", "PROP-TEST-03"]);
    expect(aprobadas).toBe(2);
    expect(repo.obtenerPropuesta("PROP-TEST-02")?.estado).toBe("aprobado");
    expect(repo.obtenerPropuesta("PROP-TEST-03")?.estado).toBe("aprobado");
  });

  it("ejecuta el algoritmo local de retroalimentación comercial para optimizar Día + Horario + Tema + Formato", () => {
    // Insertamos propuesta base
    repo.guardarPropuesta({
      propuesta_id: "PROP-BASE-01",
      canal_destino: "linkedin",
      dia_programado: "2026-10-19T09:30:00.000Z",
      origen_boveda_id: "BOV-TEST",
      borradores: [
        {
          opcion: "A",
          tipo_formato: "carrusel_pdf",
          estrategia: "jab_educativo",
          titulo_portada: "Base",
          cuerpo_texto: "Body",
          copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
          cta_texto: "CTA",
        },
        {
          opcion: "B",
          tipo_formato: "post_autoridad",
          estrategia: "networking_prueba_social",
          titulo_portada: "Base B",
          cuerpo_texto: "Body B",
          copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
          cta_texto: "CTA",
        },
        {
          opcion: "C",
          tipo_formato: "post_directo",
          estrategia: "right_hook_conversion",
          titulo_portada: "Base C",
          cuerpo_texto: "Body C",
          copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
          cta_texto: "CTA",
        },
      ],
      borrador_seleccionado: "A",
      tratamiento_visual: {
        marco_expandido_requerido: true,
        color_fondo_marco: "#FFFFFF",
        regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
        relacion_aspecto_destino: "4:5",
      },
      imagen_boveda_vinculada: { id: "BOV-TEST", ruta_archivo_local: "test.jpg" },
      estado: "publicado",
    });

    // Registramos métricas simuladas de impacto
    repo.registrarMetricaAtribucion({
      id: "MET-01",
      propuesta_id: "PROP-BASE-01",
      canal: "linkedin",
      buyer_persona: "emprendedor_saturado",
      dimension: "empresarial",
      formato: "carrusel_pdf",
      dia_semana: "Miércoles",
      horario_publicacion: "09:30",
      clics_mejoraok: 45,
      diagnosticos_completados: 12,
      score_impacto: 9.2,
      registrado_el: "2026-10-14T10:00:00.000Z",
    });

    repo.registrarMetricaAtribucion({
      id: "MET-02",
      propuesta_id: "PROP-BASE-01",
      canal: "instagram",
      buyer_persona: "orden_para_crecer",
      dimension: "personal",
      formato: "post_directo",
      dia_semana: "Viernes",
      horario_publicacion: "18:00",
      clics_mejoraok: 10,
      diagnosticos_completados: 1,
      score_impacto: 2.5,
      registrado_el: "2026-10-15T19:00:00.000Z",
    });

    const recomendacion = repo.optimizarCombinacionComercial();

    expect(recomendacion.mejorDia).toBe("Miércoles");
    expect(recomendacion.mejorHorario).toBe("09:30");
    expect(recomendacion.mejorFormato).toBe("carrusel_pdf");
    expect(recomendacion.mejorDimension).toBe("empresarial");
    expect(recomendacion.scorePromedio).toBeGreaterThan(5.0);
  });
});
