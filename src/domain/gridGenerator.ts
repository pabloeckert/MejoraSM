// src/domain/gridGenerator.ts
// GENERADOR DE GRILLA MAESTRO EVERGREEN A 26 SEMANAS (6 MESES)
// Balance estricto: 80% Jabs (Educación, Reencuadre, Autoridad) / 20% Right Hooks (Conversión a mejoraok.com).
// Dirigido a los 3 Buyer Personas: Emprendedor Saturado, Empresario Mal Asesorado, El que Necesita Orden para Crecer.

import {
  type PropuestaMejoraSMDTO,
  type DimensionMC,
  type CanalDestino,
  type BorradorPropuestaDTO,
  type CopyCalibradoCuatroPasos,
  toCanonicalPropuesta,
} from "./types";

export type BuyerPersonaMC =
  | "emprendedor_saturado"
  | "empresario_mal_asesorado"
  | "orden_para_crecer";

export interface SemanaPlanificadaDTO {
  numero_semana: number; // 1 a 26
  rango_fechas: { inicio: string; fin: string };
  proporcion_editorial: { jabs_pct: number; right_hooks_pct: number };
  propuestas: PropuestaMejoraSMDTO[];
}

export interface Grilla26SemanasDTO {
  total_semanas: 26;
  total_piezas: number;
  jabs_totales: number;
  right_hooks_totales: number;
  semanas: SemanaPlanificadaDTO[];
  resumen_por_dimension: Record<DimensionMC, number>;
  resumen_por_buyer_persona: Record<BuyerPersonaMC, number>;
}

// Matriz de temas estratégicos por dimensión
const MATRIZ_TEMAS_DIMENSIONES: Record<
  DimensionMC,
  Array<{
    titulo: string;
    dolor: string;
    reencuadre: string;
    web: string;
    persona: BuyerPersonaMC;
  }>
> = {
  personal: [
    {
      titulo: "El cuello de botella sos vos",
      dolor: "Si cada decisión del día tiene que pasar por tu escritorio, no tenés una empresa: tenés un autoempleo de alto riesgo.",
      reencuadre: "El liderazgo profesional no consiste en controlar cada paso, sino en diseñar procesos donde el equipo sepa qué hacer sin consultarte.",
      web: "Medí tu nivel de dependencia personal en el diagnóstico de mejoraok.com",
      persona: "emprendedor_saturado",
    },
    {
      titulo: "La trampa de apagar incendios",
      dolor: "Llegás a las 7 de la tarde agotado habiendo resuelto mil urgencias, pero sin haber movido un milímetro la estrategia.",
      reencuadre: "Apagar incendios no es trabajar: es el síntoma de no tener protocolos de delegación y orden operativo.",
      web: "Recuperá tu tiempo directivo. Conocé el método en mejoraok.com",
      persona: "emprendedor_saturado",
    },
    {
      titulo: "Foco o dispersión",
      dolor: "Saltar de idea en idea genera entusiasmo en el líder pero parálisis y frustración en el equipo.",
      reencuadre: "La claridad directiva se mide por lo que decidís NO hacer esta semana.",
      web: "Establecé prioridades de verdad en mejoraok.com",
      persona: "orden_para_crecer",
    },
  ],
  organizacional: [
    {
      titulo: "¿Por qué nadie hace las cosas como vos?",
      dolor: "Decís 'lo tengo que hacer yo para que salga bien' y terminás rehaciendo el trabajo de los demás.",
      reencuadre: "No es que a la gente no le importe; es que el estándar de calidad vive en tu cabeza y nunca fue documentado en un proceso transferible.",
      web: "Documentá y profesionalizá tu equipo con las guías de mejoraok.com",
      persona: "orden_para_crecer",
    },
    {
      titulo: "Roles claros vs. culpas compartidas",
      dolor: "Cuando algo sale mal, todos se miran entre sí y nadie se hace responsable.",
      reencuadre: "Donde todos son responsables, nadie es responsable. La claridad de roles es el primer acto de cuidado hacia el equipo.",
      web: "Estructurá tu organigrama operativo en mejoraok.com",
      persona: "empresario_mal_asesorado",
    },
    {
      titulo: "Cultura de resultados sin miedo",
      dolor: "Tus colaboradores ocultan los problemas hasta que ya es demasiado tarde y el cliente se queja.",
      reencuadre: "Si penalizás la verdad, premiás el silencio. Calidez con verdad significa mirar los datos duros sin agredir a la persona.",
      web: "Implementá tableros transparentes con mejoraok.com",
      persona: "orden_para_crecer",
    },
  ],
  comercial: [
    {
      titulo: "No se vende por precio",
      dolor: "Tus comerciales bajan el margen apenas el cliente duda o pide descuento.",
      reencuadre: "Bajar el precio es el camino más rápido para fundirse trabajando el doble. Se vende por valor, previsibilidad y cumplimiento.",
      web: "Defendé tu margen con criterio comercial en mejoraok.com",
      persona: "empresario_mal_asesorado",
    },
    {
      titulo: "Pipeline comercial sin adivinanzas",
      dolor: "No sabés cuánto vas a facturar el mes que viene hasta que no entran los cobros del banco.",
      reencuadre: "La facturación no es suerte: es la consecuencia matemática de prospectos calificados y seguimiento riguroso.",
      web: "Ordená tu embudo de ventas en mejoraok.com",
      persona: "orden_para_crecer",
    },
    {
      titulo: "El seguimiento que no es molestia",
      dolor: "El 80% de las operaciones se pierden porque nadie volvió a llamar después del primer presupuesto.",
      reencuadre: "Seguimiento no es insistir; es acompañar la decisión del cliente con datos de valor y criterio.",
      web: "Sistematizá tu ciclo comercial en mejoraok.com",
      persona: "emprendedor_saturado",
    },
  ],
  empresarial: [
    {
      titulo: "Facturar más no es ganar más",
      dolor: "Récord de ventas en el año, pero la cuenta bancaria sigue en rojo y no alcanza para reinvertir.",
      reencuadre: "El crecimiento sin rentabilidad no es éxito: es acelerar hacia el abismo. El modelo de negocio se mide en caja libre, no en vanidad.",
      web: "Auditá tu modelo de rentabilidad en mejoraok.com",
      persona: "empresario_mal_asesorado",
    },
    {
      titulo: "Dejar de financiar a tus clientes",
      dolor: "Entregás la mercadería o el servicio hoy, y te pagan a 60 días sin interés mientras pagás sueldos al contado.",
      reencuadre: "Tu empresa no es un banco. La política de cobranzas debe ser tan firme como la promesa de entrega.",
      web: "Protegé el flujo de fondos de tu pyme en mejoraok.com",
      persona: "empresario_mal_asesorado",
    },
    {
      titulo: "Construir valor patrimonial",
      dolor: "¿Tu empresa vale algo si mañana vos no vas a trabajar por 3 meses?",
      reencuadre: "Una empresa vale por sus sistemas, sus clientes recurrentes y sus contratos, no por la presencia física de su fundador.",
      web: "Hacé que tu empresa sea transferible y valiosa en mejoraok.com",
      persona: "orden_para_crecer",
    },
  ],
  profesionalizacion: [
    {
      titulo: "El salto de pyme intuitiva a empresa profesional",
      dolor: "Llegaste a un techo de facturación y cada nuevo cliente genera más caos que beneficio.",
      reencuadre: "Lo que te trajo hasta acá no es lo que te va a llevar al siguiente nivel. Se requiere pasar de la intuición al método.",
      web: "Conocé el programa de Profesionalización en mejoraok.com",
      persona: "orden_para_crecer",
    },
    {
      titulo: "Tableros de control con números que no mienten",
      dolor: "Tomás decisiones en base a sensaciones o estados de ánimo en lugar de indicadores objetivos.",
      reencuadre: "Lo que no se mide no se gestiona. Cinco números semanales claros superan a 200 informes que nadie lee.",
      web: "Diseñá tu tablero de comando directivo en mejoraok.com",
      persona: "emprendedor_saturado",
    },
    {
      titulo: "Reuniones de 30 minutos que resuelven",
      dolor: "Horas de reuniones eternas donde se habla mucho y nadie ejecuta nada.",
      reencuadre: "Una reunión sin agenda previa, sin responsable de acta y sin fecha límite no es trabajo: es pérdida de dinero.",
      web: "Optimizá tus reuniones de directorio en mejoraok.com",
      persona: "empresario_mal_asesorado",
    },
  ],
  networking_y_autoridad: [
    {
      titulo: "En la mesa con quienes deciden el rumbo",
      dolor: "Muchos empresarios intentan resolver solos problemas que otros pares ya superaron con éxito.",
      reencuadre: "La soledad del líder se cura compartiendo mesa de trabajo con pares directivos de su mismo nivel de desafío.",
      web: "Participá del próximo After Office directivo (Regla 12x12) en mejoraok.com",
      persona: "empresario_mal_asesorado",
    },
    {
      titulo: "Visita a plantas: Donde se ve la verdad de las operaciones",
      dolor: "Las teorías de gestión suenan bien en un libro, pero chocan con la realidad del piso de planta.",
      reencuadre: "Acompañamos a dueños y directores en el terreno, donde los procesos cobran vida y los cuellos de botella se resuelven.",
      web: "Mirá los casos de transformación en planta en mejoraok.com",
      persona: "orden_para_crecer",
    },
    {
      titulo: "Alianzas estratégicas C-Level sin intermediarios",
      dolor: "Hacer networking tradicional de tarjetas de presentación rara vez genera negocios de fondo.",
      reencuadre: "La autoridad empresarial se construye resolviendo problemas reales junto a los líderes que transforman industrias.",
      web: "Sumate al ecosistema de directores en mejoraok.com",
      persona: "emprendedor_saturado",
    },
  ],
};

const DIMENSIONES_ORDEN: DimensionMC[] = [
  "personal",
  "organizacional",
  "comercial",
  "empresarial",
  "profesionalizacion",
  "networking_y_autoridad",
];

const CANALES: CanalDestino[] = ["linkedin", "instagram", "facebook", "whatsapp"];

// Semanas específicas (15 semanas de las 26) donde el Viernes se ejecuta un Right Hook de conversión
const SEMANAS_RIGHT_HOOK = new Set([
  1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 25, 26,
]);

// Fotos reales verificadas de la Bóveda de Conocimiento (existentes en disco local)
export const FOTOS_REALES_BOVEDA = [
  {
    id: "BOV-2026-NET-001",
    titulo: "Encuentro Directivo C-Level Rosario",
    ruta: "content/boveda/04_networking/img_clevel_rosario_2026.jpg",
  },
  {
    id: "BOV-2026-NET-002",
    titulo: "Inspección de Planta y Operaciones Industriales",
    ruta: "content/boveda/04_networking/visita_planta_industrial_2026.jpg",
  },
  {
    id: "BOV-2026-NET-003",
    titulo: "Mesa de Trabajo Estratégica y Liderazgo",
    ruta: "content/boveda/04_networking/mesa_liderazgo_foco_2026.jpg",
  },
  {
    id: "BOV-2026-NET-004",
    titulo: "Negociación y Alianzas B2B C-Level",
    ruta: "content/boveda/04_networking/alianza_comercial_b2b_2026.jpg",
  },
  {
    id: "BOV-2026-NET-005",
    titulo: "Tableros de Control Directivo y Profesionalización",
    ruta: "content/boveda/04_networking/tablero_control_directivo_2026.jpg",
  },
  {
    id: "BOV-2026-NET-006",
    titulo: "After Office Directivo (Regla 12x12)",
    ruta: "content/boveda/04_networking/after_office_directivo_2026.jpg",
  },
];

function obtenerEngagementNativo(canal: CanalDestino, _persona: BuyerPersonaMC): string {
  switch (canal) {
    case "linkedin":
      return "¿Tu equipo vive esta fricción en la diaria? Dejanos tu punto de vista en los comentarios o reposteá si tu equipo necesita este debate.";
    case "instagram":
      return "Comentá 'PROCESO' y te enviamos la plantilla práctica por mensaje privado. Guardá este posteo para tu próxima reunión directiva.";
    case "facebook":
      return "¿Cómo resuelven este desafío en tu empresa? Contanos tu experiencia en los comentarios.";
    case "whatsapp":
      return "¿Te pasa esto en tu empresa? Respondé a este mensaje para analizar cómo ordenarlo.";
    default:
      return "Dejanos tu punto de vista en los comentarios.";
  }
}

/**
 * Genera la grilla de contenidos a 26 semanas balanceada al 80% Jabs / 20% Right Hooks.
 * 3 publicaciones por semana (Lunes, Miércoles, Viernes) = 78 publicaciones totales.
 * - 63 Jabs (Lunes, Miércoles y 11 Viernes): 0% enlaces salientes a mejoraok.com, interacción nativa.
 * - 15 Right Hooks (15 Viernes): CTA directo al test de diagnóstico de 4 dimensiones.
 */
export function generarGrillaEvergreen26Semanas(fechaInicio: Date = new Date()): Grilla26SemanasDTO {
  const semanas: SemanaPlanificadaDTO[] = [];
  let jabsTotales = 0;
  let rightHooksTotales = 0;

  const resumenDimension: Record<DimensionMC, number> = {
    personal: 0,
    organizacional: 0,
    comercial: 0,
    empresarial: 0,
    profesionalizacion: 0,
    networking_y_autoridad: 0,
  };

  const resumenBuyerPersona: Record<BuyerPersonaMC, number> = {
    emprendedor_saturado: 0,
    empresario_mal_asesorado: 0,
    orden_para_crecer: 0,
  };

  let globalPieceIndex = 0;
  const cursorDate = new Date(fechaInicio);

  for (let s = 1; s <= 26; s++) {
    const inicioSemana = new Date(cursorDate);
    const finSemana = new Date(cursorDate);
    finSemana.setDate(finSemana.getDate() + 6);

    const propuestasSemana: PropuestaMejoraSMDTO[] = [];
    let jabsSemana = 0;
    let rightHooksSemana = 0;

    // 3 piezas por semana (Lunes = 0, Miércoles = 2, Viernes = 4)
    const diasOffsets = [0, 2, 4];

    for (let p = 0; p < 3; p++) {
      globalPieceIndex++;
      const diaPieza = new Date(inicioSemana);
      diaPieza.setDate(diaPieza.getDate() + diasOffsets[p]);
      diaPieza.setHours(9, 30, 0, 0);

      // Regla 80/20: Lunes (p=0) y Miércoles (p=1) son 100% Jabs.
      // Viernes (p=2) es Right Hook si la semana pertenece a SEMANAS_RIGHT_HOOK (15 semanas en total)
      const esRightHook = p === 2 && SEMANAS_RIGHT_HOOK.has(s);

      if (esRightHook) {
        rightHooksSemana++;
        rightHooksTotales++;
      } else {
        jabsSemana++;
        jabsTotales++;
      }

      // Rotación balanceada de dimensiones
      const dimIndex = (globalPieceIndex - 1) % DIMENSIONES_ORDEN.length;
      const dimension = DIMENSIONES_ORDEN[dimIndex];
      resumenDimension[dimension]++;

      const temas = MATRIZ_TEMAS_DIMENSIONES[dimension];
      const tema = temas[(Math.floor((globalPieceIndex - 1) / DIMENSIONES_ORDEN.length)) % temas.length];
      resumenBuyerPersona[tema.persona]++;

      const canal = CANALES[p % CANALES.length];
      const propId = `PROP-2026-W${String(s).padStart(2, "0")}-${String(p + 1).padStart(2, "0")}`;
      const bovedaId = `BOV-2026-${dimension.slice(0, 3).toUpperCase()}-${String(globalPieceIndex).padStart(3, "0")}`;

      // Asignar activo fotográfico real existente en la Bóveda de disco
      const fotoBoveda = FOTOS_REALES_BOVEDA[(globalPieceIndex - 1) % FOTOS_REALES_BOVEDA.length];

      const opcionDefault = esRightHook ? "C" : p % 2 === 0 ? "A" : "B";
      const engagementNativo = obtenerEngagementNativo(canal, tema.persona);
      const conversionLeadText = "Hacé el test de diagnóstico de 4 dimensiones sin complacencia en mejoraok.com y detectá tus cuellos de botella.";

      const c4A: CopyCalibradoCuatroPasos = {
        paso1_dolor: tema.dolor,
        paso2_reencuadre: tema.reencuadre,
        paso3_engagement_nativo: engagementNativo,
        paso4_conversion_lead: esRightHook ? conversionLeadText : undefined,
      };

      const c4B: CopyCalibradoCuatroPasos = {
        paso1_dolor: `En empresas consolidadas, ${tema.dolor.toLowerCase()}`,
        paso2_reencuadre: tema.reencuadre,
        paso3_engagement_nativo: "¿Coincidís con esta perspectiva directiva? Compartí tu opinión abajo.",
        paso4_conversion_lead: esRightHook ? conversionLeadText : undefined,
      };

      const c4C: CopyCalibradoCuatroPasos = {
        paso1_dolor: tema.dolor,
        paso2_reencuadre: "La claridad directiva comienza por medir con números duros las 4 dimensiones de tu empresa.",
        paso3_engagement_nativo: esRightHook ? "Completá el test diagnóstico para recibir el informe." : engagementNativo,
        paso4_conversion_lead: esRightHook ? conversionLeadText : undefined,
      };

      const borradorA: BorradorPropuestaDTO = {
        opcion: "A",
        tipo_formato: "carrusel_pdf",
        estrategia: esRightHook ? "right_hook_conversion" : "jab_educativo",
        titulo_portada: tema.titulo,
        cuerpo_texto: `${tema.dolor}\n\n${tema.reencuadre}`,
        copy_cuatro_pasos: c4A,
        copy_tres_pasos: {
          paso1_dolor: tema.dolor,
          paso2_reencuadre: tema.reencuadre,
          paso3_direccion_web: esRightHook ? "Hacé el test de diagnóstico en mejoraok.com" : engagementNativo,
        },
        slides: [
          tema.titulo,
          tema.dolor,
          "La causa raíz operativa que no se suele mirar.",
          tema.reencuadre,
          esRightHook ? "Diagnóstico en mejoraok.com" : engagementNativo,
        ],
        cta_texto: esRightHook ? "Completar diagnóstico en mejoraok.com" : "Deslizá para ordenar tu proceso directivo",
      };

      const borradorB: BorradorPropuestaDTO = {
        opcion: "B",
        tipo_formato: "post_autoridad",
        estrategia: esRightHook ? "right_hook_conversion" : "networking_prueba_social",
        titulo_portada: `Autoridad Directiva: ${tema.titulo}`,
        cuerpo_texto: `Conversaciones con líderes C-Level en visitas operativas.\n\n${tema.reencuadre}`,
        copy_cuatro_pasos: c4B,
        copy_tres_pasos: {
          paso1_dolor: c4B.paso1_dolor,
          paso2_reencuadre: c4B.paso2_reencuadre,
          paso3_direccion_web: esRightHook ? "Hacé el test de diagnóstico en mejoraok.com" : "¿Coincidís con esta perspectiva directiva? Compartí tu opinión abajo.",
        },
        cta_texto: esRightHook ? "Diagnóstico directivo en mejoraok.com" : "Dejanos tu punto de vista en los comentarios",
      };

      const borradorC: BorradorPropuestaDTO = {
        opcion: "C",
        tipo_formato: "post_directo",
        estrategia: esRightHook ? "right_hook_conversion" : "jab_educativo",
        titulo_portada: esRightHook ? "¿Cómo está tu empresa hoy? (Diagnóstico 2026)" : tema.titulo,
        cuerpo_texto: esRightHook
          ? `${tema.dolor}\n\nNo estás perdido. Estás desordenado.\n\nCompletá el diagnóstico sin complacencia en mejoraok.com.`
          : `${tema.dolor}\n\n${tema.reencuadre}`,
        copy_cuatro_pasos: c4C,
        copy_tres_pasos: {
          paso1_dolor: c4C.paso1_dolor,
          paso2_reencuadre: c4C.paso2_reencuadre,
          paso3_direccion_web: esRightHook ? "Completá el diagnóstico en mejoraok.com" : engagementNativo,
        },
        cta_texto: esRightHook ? "Completar diagnóstico ahora en mejoraok.com" : "Comentá tu experiencia abajo",
      };

      const propuesta: PropuestaMejoraSMDTO = {
        propuesta_id: propId,
        canal_destino: canal,
        dia_programado: diaPieza.toISOString(),
        origen_boveda_id: bovedaId,
        borradores: [borradorA, borradorB, borradorC],
        borrador_seleccionado: opcionDefault,
        tratamiento_visual: {
          marco_expandido_requerido: true,
          color_fondo_marco: "#FFFFFF",
          regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
          relacion_aspecto_destino: "4:5",
        },
        imagen_boveda_vinculada: {
          id: fotoBoveda.id,
          ruta_archivo_local: fotoBoveda.ruta,
          titulo: fotoBoveda.titulo,
        },
        estado: "pendiente_revision",
        metricas_atribucion: {
          clics_mejoraok: 0,
          diagnosticos_completados: 0,
          buyer_persona_predominante: tema.persona,
        },
      };

      propuestasSemana.push(propuesta);
    }

    const totalPiezasSemana = propuestasSemana.length;
    semanas.push({
      numero_semana: s,
      rango_fechas: {
        inicio: inicioSemana.toISOString().split("T")[0],
        fin: finSemana.toISOString().split("T")[0],
      },
      proporcion_editorial: {
        jabs_pct: Math.round((jabsSemana / totalPiezasSemana) * 100),
        right_hooks_pct: Math.round((rightHooksSemana / totalPiezasSemana) * 100),
      },
      propuestas: propuestasSemana,
    });

    // Avanzar 7 días para la próxima semana
    cursorDate.setDate(cursorDate.getDate() + 7);
  }

  return {
    total_semanas: 26,
    total_piezas: globalPieceIndex,
    jabs_totales: jabsTotales,
    right_hooks_totales: rightHooksTotales,
    semanas,
    resumen_por_dimension: resumenDimension,
    resumen_por_buyer_persona: resumenBuyerPersona,
  };
}
