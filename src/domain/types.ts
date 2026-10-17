// src/domain/types.ts
// CONTRATOS CANÓNICOS DTO Y MODELO DE DOMINIO — MÓDULO MejoraSM (2026)
// Alineado con el Manual de Identidad y los Principios Zero-Trust de Mejora Continua.

export type DimensionMC =
  | "personal"
  | "organizacional"
  | "comercial"
  | "empresarial"
  | "profesionalizacion"
  | "networking_y_autoridad";

export type FaseComercial =
  | "tofu_atraccion"
  | "mofu_educacion"
  | "bofu_conversion";

export type CanalDestino =
  | "linkedin"
  | "instagram"
  | "facebook"
  | "whatsapp";

export type OpcionBorrador = "A" | "B" | "C";

export type TipoFormatoBorrador =
  | "carrusel_pdf"
  | "post_autoridad"
  | "post_directo";

export type EstrategiaEditorial =
  | "jab_educativo"
  | "networking_prueba_social"
  | "right_hook_conversion";

export type EstadoPropuesta =
  | "pendiente_revision"
  | "aprobado"
  | "publicado"
  | "pausado"
  | "rechazado";

// ────────────────────────────────────────────────────────────────────────────
// INPUT DTO: Ficha de Bóveda (4 Capas Canónicas de Conocimiento)
// ────────────────────────────────────────────────────────────────────────────
export interface FichaBovedaDTO {
  id: string; // ej: "BOV-2026-10-001"
  origen_carpeta: "constitucion" | "autoridad" | "experiencia" | "networking_y_autoridad";
  dimension: DimensionMC;
  tipo_activo: "texto_markdown" | "pdf_referencia" | "audio_transcripcion" | "imagen_con_texto";
  titulo: string;
  contenido_raw: string;
  metadatos_multimedia?: {
    ruta_archivo_local: string;
    personas_presentes: string[];
    orientacion_original: "horizontal" | "vertical" | "cuadrada";
    resolucion?: { ancho: number; alto: number };
    locacion?: string;
  };
  fase_comercial_sugerida: FaseComercial;
  creado_el: string;
}

// ────────────────────────────────────────────────────────────────────────────
// ESTRUCTURA DE TEXTO CALIBRADO EN 4 PASOS (Inteligencia Editorial MejoraSM 2026)
// ────────────────────────────────────────────────────────────────────────────
export interface CopyCalibradoCuatroPasos {
  paso1_dolor: string;              // Paso 1: Dolor sin juzgar (Validar tensión sin culpa al líder)
  paso2_reencuadre: string;         // Paso 2: Reencuadre al Sistema (Causa en procesos/estructura)
  paso3_engagement_nativo: string;  // Paso 3: Engagement Nativo (Pregunta/debate en la red)
  paso4_conversion_lead?: string;   // Paso 4: Conversión/Lead (Solo activo en 20% Right Hooks)
}

export interface CopyCalibradoTresPasos {
  paso1_dolor: string;         // Nombrar la fricción o dolor real sin complacencia
  paso2_reencuadre: string;    // Explicación de la causa raíz de sistema o proceso
  paso3_direccion_web: string; // Dirección concreta o engagement nativo
}

// ────────────────────────────────────────────────────────────────────────────
// BORRADOR INDIVIDUAL DE PROPUESTA
// ────────────────────────────────────────────────────────────────────────────
export interface BorradorPropuestaDTO {
  opcion: OpcionBorrador;
  tipo_formato: TipoFormatoBorrador;
  estrategia: EstrategiaEditorial;
  titulo_portada: string;
  cuerpo_texto: string;
  copy_tres_pasos: CopyCalibradoTresPasos;
  copy_cuatro_pasos?: CopyCalibradoCuatroPasos;
  slides?: string[]; // Slides individuales para carruseles PDF
  cta_texto: string;
}

// ────────────────────────────────────────────────────────────────────────────
// TRATAMIENTO VISUAL Y ENCUADRE
// ────────────────────────────────────────────────────────────────────────────
export interface TratamientoVisualDTO {
  marco_expandido_requerido: boolean;
  color_fondo_marco: "#FFFFFF";
  regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo";
  relacion_aspecto_destino: "4:5" | "1:1" | "9:16";
}

// ────────────────────────────────────────────────────────────────────────────
// OUTPUT DTO: Propuesta MejoraSM
// ────────────────────────────────────────────────────────────────────────────
export interface PropuestaMejoraSMDTO {
  propuesta_id: string; // ej: "PROP-2026-W42-01"
  canal_destino: CanalDestino;
  dia_programado: string; // ISO 8601 o fecha legible YYYY-MM-DD
  origen_boveda_id: string;
  borradores: [BorradorPropuestaDTO, BorradorPropuestaDTO, BorradorPropuestaDTO];
  borrador_seleccionado: OpcionBorrador;
  tratamiento_visual: TratamientoVisualDTO;
  imagen_boveda_vinculada: {
    id: string;
    ruta_archivo_local: string;
    titulo?: string;
  };
  estado: EstadoPropuesta;
  motivo_rechazo?: string;
  metricas_atribucion?: {
    clics_mejoraok: number;
    diagnosticos_completados: number;
    buyer_persona_predominante?: "emprendedor_saturado" | "empresario_mal_asesorado" | "orden_para_crecer";
  };
}

// ────────────────────────────────────────────────────────────────────────────
// REGLAS Y DEFINICIÓN DE FORMATOS Y BORRADORES
// ────────────────────────────────────────────────────────────────────────────
export const CONFIGURACION_BORRADORES: Record<
  OpcionBorrador,
  {
    tipo_formato: TipoFormatoBorrador;
    estrategia: EstrategiaEditorial;
    etiqueta: string;
    descripcion: string;
  }
> = {
  A: {
    tipo_formato: "carrusel_pdf",
    estrategia: "jab_educativo",
    etiqueta: "Opción A: Carrusel Educativo",
    descripcion: "Reencuadre didáctico paso a paso. Entrega valor sin pedir nada a cambio (Jab 80%).",
  },
  B: {
    tipo_formato: "post_autoridad",
    estrategia: "networking_prueba_social",
    etiqueta: "Opción B: Autoridad y Networking C-Level",
    descripcion: "Prueba social empresarial y presencia directiva ('mirá con quiénes trabajan') (Jab 80%).",
  },
  C: {
    tipo_formato: "post_directo",
    estrategia: "right_hook_conversion",
    etiqueta: "Opción C: Directo al Diagnóstico",
    descripcion: "Llamado a la acción directo para medir el orden operativo en mejoraok.com (Right Hook 20%).",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// FUNCIONES PURAS DE ADAPTACIÓN Y CONVERSIÓN CANÓNICA
// ────────────────────────────────────────────────────────────────────────────

/**
 * Convierte una propuesta legada (de Supabase o cache local) al contrato estándar PropuestaMejoraSMDTO.
 * Si la propuesta antigua no tiene los 3 borradores, sintetiza las opciones A, B y C
 * respetando las reglas de negocio de Mejora Continua.
 */
export function toCanonicalPropuesta(legacy: any): PropuestaMejoraSMDTO {
  const id = legacy?.id || legacy?.propuesta_id || `PROP-${Date.now()}`;
  const canal: CanalDestino = legacy?.canal_destino || "linkedin";
  const dia = legacy?.dia_programado || legacy?.scheduled_at || new Date().toISOString();
  const bovedaId = legacy?.origen_boveda_id || legacy?.boveda_id || "BOV-2026-DEFAULT";

  const rawHook = legacy?.hook || legacy?.title || "Sin título";
  const rawBody = legacy?.body || "";
  const rawCta = legacy?.cta || "Conocé cómo ordenar tu empresa en mejoraok.com";

  // Desglose del copy en 3 pasos (Dolor -> Reencuadre -> Dirección web)
  const copy3Pasos: CopyCalibradoTresPasos = legacy?.copy_tres_pasos || {
    paso1_dolor: rawHook,
    paso2_reencuadre: rawBody || "El desorden no es falta de capacidad, es falta de método y estructura.",
    paso3_direccion_web: rawCta,
  };

  const borradorA: BorradorPropuestaDTO = legacy?.borradores?.[0] || {
    opcion: "A",
    tipo_formato: "carrusel_pdf",
    estrategia: "jab_educativo",
    titulo_portada: rawHook,
    cuerpo_texto: `${copy3Pasos.paso1_dolor}\n\n${copy3Pasos.paso2_reencuadre}`,
    copy_tres_pasos: { ...copy3Pasos },
    slides: [
      copy3Pasos.paso1_dolor,
      "La trampa operativa de resolver todo sobre la marcha.",
      copy3Pasos.paso2_reencuadre,
      "Hacia un sistema donde el negocio funcione sin depender de vos.",
      copy3Pasos.paso3_direccion_web,
    ],
    cta_texto: copy3Pasos.paso3_direccion_web,
  };

  const borradorB: BorradorPropuestaDTO = legacy?.borradores?.[1] || {
    opcion: "B",
    tipo_formato: "post_autoridad",
    estrategia: "networking_prueba_social",
    titulo_portada: `Autoridad Directiva: ${rawHook}`,
    cuerpo_texto: `Trabajando con directores y dueños de empresas que eligen ordenar su crecimiento.\n\n${copy3Pasos.paso2_reencuadre}`,
    copy_tres_pasos: {
      paso1_dolor: "Crecer sin estructura satura a los mejores líderes.",
      paso2_reencuadre: copy3Pasos.paso2_reencuadre,
      paso3_direccion_web: copy3Pasos.paso3_direccion_web,
    },
    cta_texto: "Sumate a la mesa de trabajo en mejoraok.com",
  };

  const borradorC: BorradorPropuestaDTO = legacy?.borradores?.[2] || {
    opcion: "C",
    tipo_formato: "post_directo",
    estrategia: "right_hook_conversion",
    titulo_portada: "¿Cómo está tu empresa hoy?",
    cuerpo_texto: `${copy3Pasos.paso1_dolor}\n\nNo estás perdido. Estás desordenado.\n\nRealizá tu diagnóstico sin complacencia en mejoraok.com.`,
    copy_tres_pasos: {
      paso1_dolor: copy3Pasos.paso1_dolor,
      paso2_reencuadre: "La claridad comienza por medir objetivamente las 4 dimensiones de tu empresa.",
      paso3_direccion_web: "Completá el diagnóstico ahora en mejoraok.com",
    },
    cta_texto: "Completar diagnóstico en mejoraok.com",
  };

  const estadoMapeado: EstadoPropuesta =
    legacy?.status === "published" || legacy?.estado === "publicado"
      ? "publicado"
      : legacy?.status === "scheduled" || legacy?.status === "approved" || legacy?.estado === "aprobado"
      ? "aprobado"
      : legacy?.status === "rejected" || legacy?.estado === "rechazado"
      ? "rechazado"
      : "pendiente_revision";

  const imgPath = legacy?.rendered_image_path || legacy?.imagen_boveda_vinculada?.ruta_archivo_local || "";

  return {
    propuesta_id: id,
    canal_destino: canal,
    dia_programado: dia,
    origen_boveda_id: bovedaId,
    borradores: [borradorA, borradorB, borradorC],
    borrador_seleccionado: legacy?.borrador_seleccionado || "A",
    tratamiento_visual: legacy?.tratamiento_visual || {
      marco_expandido_requerido: true,
      color_fondo_marco: "#FFFFFF",
      regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
      relacion_aspecto_destino: "4:5",
    },
    imagen_boveda_vinculada: {
      id: legacy?.imagen_boveda_vinculada?.id || bovedaId,
      ruta_archivo_local: imgPath,
      titulo: legacy?.imagen_boveda_vinculada?.titulo || legacy?.title || "Activo de Bóveda",
    },
    estado: estadoMapeado,
    motivo_rechazo: legacy?.rejection_reason || legacy?.motivo_rechazo,
    metricas_atribucion: legacy?.metricas_atribucion || {
      clics_mejoraok: 0,
      diagnosticos_completados: 0,
    },
  };
}

/**
 * Genera el paquete de texto formateado listo para descarga multicanal (WhatsApp / MejoraWS / difusión).
 * Aplica la regla 80/20 de Gary Vee: Jabs no incluyen enlaces externos; Right Hooks incluyen link de conversión.
 */
export function generarPaqueteMulticanal(propuesta: PropuestaMejoraSMDTO): {
  textoWhatsApp: string;
  textoLinkedIn: string;
  metadataJson: string;
  rutaImagen: string;
} {
  const borrador = propuesta.borradores.find((b) => b.opcion === propuesta.borrador_seleccionado) || propuesta.borradores[0];
  const c4 = borrador.copy_cuatro_pasos;
  const esRightHook = borrador.estrategia === "right_hook_conversion";

  let textoWhatsApp: string;
  let textoLinkedIn: string;

  if (c4) {
    if (esRightHook) {
      textoWhatsApp = [
        `*MEJORA CONTINUA — ${borrador.titulo_portada.toUpperCase()}*`,
        ``,
        `📌 *Paso 1: La situación*`,
        c4.paso1_dolor,
        ``,
        `💡 *Paso 2: Reencuadre de proceso*`,
        c4.paso2_reencuadre,
        ``,
        `🚀 *Paso 3: Diagnóstico empresarial*`,
        c4.paso4_conversion_lead || "Hacé el test de diagnóstico de 4 dimensiones sin complacencia en mejoraok.com.",
        ``,
        `🔗 *Diagnóstico online:* https://mejoraok.com`,
      ].join("\n");

      textoLinkedIn = [
        borrador.titulo_portada,
        ``,
        c4.paso1_dolor,
        ``,
        c4.paso2_reencuadre,
        ``,
        c4.paso4_conversion_lead || "Hacé el test de diagnóstico de 4 dimensiones en mejoraok.com.",
        ``,
        `🔗 https://mejoraok.com`,
        ``,
        `#MejoraContinua #Empresas #Liderazgo #Procesos #mejoraok`,
      ].join("\n");
    } else {
      // 80% Jab: 0% enlaces salientes, puro engagement nativo
      textoWhatsApp = [
        `*MEJORA CONTINUA — ${borrador.titulo_portada.toUpperCase()}*`,
        ``,
        `📌 *Paso 1: La situación*`,
        c4.paso1_dolor,
        ``,
        `💡 *Paso 2: Reencuadre de proceso*`,
        c4.paso2_reencuadre,
        ``,
        `💬 *Paso 3: Pregunta de debate*`,
        c4.paso3_engagement_nativo,
      ].join("\n");

      textoLinkedIn = [
        borrador.titulo_portada,
        ``,
        c4.paso1_dolor,
        ``,
        c4.paso2_reencuadre,
        ``,
        c4.paso3_engagement_nativo,
        ``,
        `#MejoraContinua #Empresas #Liderazgo #Procesos`,
      ].join("\n");
    }
  } else {
    // Fallback con copy de 3 pasos
    const c3 = borrador.copy_tres_pasos;
    textoWhatsApp = [
      `*MEJORA CONTINUA — ${borrador.titulo_portada.toUpperCase()}*`,
      ``,
      `🔴 *Paso 1: La situación*`,
      c3.paso1_dolor,
      ``,
      `🔵 *Paso 2: El reencuadre de proceso*`,
      c3.paso2_reencuadre,
      ``,
      esRightHook ? `🟡 *Paso 3: Dirección concreta*\n${c3.paso3_direccion_web}\n\n🔗 https://mejoraok.com` : `💬 *Paso 3: Debate*\n${c3.paso3_direccion_web}`,
    ].join("\n");

    textoLinkedIn = [
      borrador.titulo_portada,
      ``,
      c3.paso1_dolor,
      ``,
      c3.paso2_reencuadre,
      ``,
      c3.paso3_direccion_web,
      ``,
      esRightHook ? `🔗 https://mejoraok.com\n\n#MejoraContinua #Empresas #Liderazgo` : `#MejoraContinua #Empresas #Liderazgo`,
    ].join("\n");
  }

  return {
    textoWhatsApp,
    textoLinkedIn,
    metadataJson: JSON.stringify(propuesta, null, 2),
    rutaImagen: propuesta.imagen_boveda_vinculada.ruta_archivo_local,
  };
}
