// src/domain/fatigaAudienceDetector.ts
// DETECTOR ALGORTÍMICO DE FATIGA DE AUDIENCIA B2B (DONELLA MEADOWS)
// Implementa el bucle compensador B1 del pensamiento sistémico para evitar
// el desgaste de ganchos editoriales, saturación temática o sobre-exposición de dimensiones.

import { PropuestaMejoraSMDTO, DimensionMC } from "./types";

export interface AlertaFatigaDTO {
  id: string;
  tipo: "tematica" | "dimension" | "buyer_persona";
  nivel: "advertencia" | "critico";
  titulo: string;
  mensaje: string;
  frecuencia_detectada: number;
  umbral_permitido: number;
  recomendacion_reencuadre: string;
  dimension_sugerida?: DimensionMC;
}

export interface DiagnosticoFatigaAudienceDTO {
  salud_editorial_pct: number; // 0 - 100%
  estado: "optimo" | "atencion" | "saturacion";
  total_piezas_analizadas: number;
  semanas_analizadas: number[];
  alertas: AlertaFatigaDTO[];
  frecuencia_dimensiones: Record<DimensionMC, number>;
  frecuencia_temas_top: Array<{ tema: string; ocurrencias: number }>;
  resumen_recomendacion: string;
}

// Patrones canónicos de dolor recurrente a auditar
const PATRONES_TEMATICOS: Array<{
  clave: string;
  nombre: string;
  terminos: string[];
  reencuadre_sugerido: string;
  dimension_alternativa: DimensionMC;
}> = [
  {
    clave: "cuello_botella",
    nombre: "Cuello de Botella del Fundador",
    terminos: ["cuello de botella", "depende de vos", "autoempleo", "escritorio"],
    reencuadre_sugerido: "Rotar hacia 'Dimensión Organizacional': enfocar en matrices de delegación y protocolos de mandos medios.",
    dimension_alternativa: "organizacional",
  },
  {
    clave: "apagar_incendios",
    nombre: "Apagar Incendios Operativos",
    terminos: ["apagar incendios", "urgencias", "agotado a las 7", "fuego diario"],
    reencuadre_sugerido: "Rotar hacia 'Dimensión Comercial': abordar cómo promesas inviables de ventas saturan la planta u operaciones.",
    dimension_alternativa: "comercial",
  },
  {
    clave: "whatsapp_decisiones",
    nombre: "Decisiones Atrapadas en WhatsApp",
    terminos: ["whatsapp", "audios de urgencia", "preguntan todo", "sin consultarte"],
    reencuadre_sugerido: "Rotar hacia 'Profesionalización': implementar pases de turno y tableros visuales sin intermediación.",
    dimension_alternativa: "profesionalizacion",
  },
  {
    clave: "retrabajo_calidad",
    nombre: "Retrabajos y Calidad Variable",
    terminos: ["hacerlo yo para que salga bien", "retrabajos", "estándar en tu cabeza", "nadie hace las cosas"],
    reencuadre_sugerido: "Rotar hacia 'Dimensión Empresarial': formalizar manuales de una carilla y tableros transparentes.",
    dimension_alternativa: "empresarial",
  },
  {
    clave: "bajar_precios",
    nombre: "Guerra de Precios y Descuentos",
    terminos: ["bajar el precio", "descuentos", "margen en caída", "vender barato"],
    reencuadre_sugerido: "Rotar hacia 'Dimensión Personal': seguridad psicológica y disciplina directiva para defender márgenes.",
    dimension_alternativa: "personal",
  },
];

/**
 * Infiere la dimensión de una propuesta analizando sus textos y borradores
 */
export function inferirDimensionPropuesta(p: PropuestaMejoraSMDTO): DimensionMC {
  const b = p.borradores.find((item) => item.opcion === (p.borrador_seleccionado || "A")) || p.borradores[0];
  const text = `${b?.titulo_portada || ""} ${b?.cuerpo_texto || ""} ${p.borradores[0]?.titulo_portada || ""}`.toLowerCase();

  if (text.includes("precio") || text.includes("margen") || text.includes("comercial") || text.includes("venta")) {
    return "comercial";
  }
  if (text.includes("equipo") || text.includes("mando") || text.includes("organigrama") || text.includes("proceso") || text.includes("roles")) {
    return "organizacional";
  }
  if (text.includes("socio") || text.includes("familia") || text.includes("patrimonio") || text.includes("empresa") || text.includes("ebitda")) {
    return "empresarial";
  }
  return "personal";
}

/**
 * Audita una ventana de propuestas para detectar fatiga de audiencia según Donella Meadows
 */
export function detectarFatigaAudiencia(
  propuestas: PropuestaMejoraSMDTO[],
  semanaCentro: number = 1,
  tamanoVentana: number = 4
): DiagnosticoFatigaAudienceDTO {
  const minSemana = Math.max(1, semanaCentro - Math.floor(tamanoVentana / 2));
  const maxSemana = minSemana + tamanoVentana - 1;
  const semanasVentana = Array.from({ length: tamanoVentana }, (_, i) => minSemana + i);

  // Filtrar propuestas correspondientes a las semanas analizadas
  let piezasVentana = propuestas.filter((p) => {
    return semanasVentana.some((w) => p.propuesta_id.includes(`-W${String(w).padStart(2, "0")}-`));
  });

  // Fallback si no coinciden por nombre de semana o si se pasa una lista plana
  if (piezasVentana.length === 0) {
    piezasVentana = propuestas.slice(0, tamanoVentana * 3);
  }

  const total = piezasVentana.length;
  const frecuencia_dimensiones: Record<DimensionMC, number> = {
    personal: 0,
    organizacional: 0,
    comercial: 0,
    empresarial: 0,
    profesionalizacion: 0,
    networking_y_autoridad: 0,
  };

  const frecuenciaTemasMap = new Map<string, number>();
  const alertas: AlertaFatigaDTO[] = [];

  // 1. Recuento de dimensiones y patrones de texto
  for (const p of piezasVentana) {
    const dim = inferirDimensionPropuesta(p);
    frecuencia_dimensiones[dim] = (frecuencia_dimensiones[dim] || 0) + 1;

    const bSel = p.borradores.find((item) => item.opcion === (p.borrador_seleccionado || "A")) || p.borradores[0];
    const bA = p.borradores[0];
    const fullText = [
      bSel?.titulo_portada || "",
      bSel?.cuerpo_texto || "",
      bSel?.copy_tres_pasos?.paso1_dolor || "",
      bA?.titulo_portada || "",
      bA?.cuerpo_texto || "",
      bA?.copy_tres_pasos?.paso1_dolor || "",
    ]
      .join(" ")
      .toLowerCase();

    for (const pat of PATRONES_TEMATICOS) {
      const match = pat.terminos.some((t) => fullText.includes(t));
      if (match) {
        frecuenciaTemasMap.set(pat.clave, (frecuenciaTemasMap.get(pat.clave) || 0) + 1);
      }
    }
  }

  // 2. Detección de Concentración Excesiva en una Dimensión
  if (total >= 4) {
    for (const [dim, count] of Object.entries(frecuencia_dimensiones)) {
      const pct = count / total;
      // Si una sola dimensión acapara > 55% de la ventana
      if (pct > 0.55 && count >= 3) {
        const d = dim as DimensionMC;
        alertas.push({
          id: `FATIGA-DIM-${d}`,
          tipo: "dimension",
          nivel: pct > 0.70 ? "critico" : "advertencia",
          titulo: `Saturación en Dimensión ${d.toUpperCase()}`,
          mensaje: `El ${Math.round(pct * 100)}% de las publicaciones (${count} de ${total} piezas) se concentran en la dimensión "${d}".`,
          frecuencia_detectada: count,
          umbral_permitido: Math.ceil(total * 0.40),
          recomendacion_reencuadre: `Equilibrar el calendario incorporando piezas de ${d === "personal" ? "Dimensión Organizacional o Comercial" : "Dimensión Personal o Empresarial"}.`,
          dimension_sugerida: d === "personal" ? "organizacional" : "personal",
        });
      }
    }
  }

  // 3. Detección de Fatiga Temática
  for (const pat of PATRONES_TEMATICOS) {
    const hits = frecuenciaTemasMap.get(pat.clave) || 0;
    // Si un mismo gancho temático se repite >= 3 veces en la ventana
    if (hits >= 3) {
      alertas.push({
        id: `FATIGA-TEMA-${pat.clave}`,
        tipo: "tematica",
        nivel: hits >= 5 ? "critico" : "advertencia",
        titulo: `Fatiga Temática: ${pat.nombre}`,
        mensaje: `El gancho de dolor "${pat.nombre}" fue utilizado en ${hits} publicaciones dentro de esta ventana de ${total} piezas.`,
        frecuencia_detectada: hits,
        umbral_permitido: 2,
        recomendacion_reencuadre: pat.reencuadre_sugerido,
        dimension_sugerida: pat.dimension_alternativa,
      });
    }
  }

  // 4. Cálculo de Salud Editorial Global
  let penalizacion = 0;
  for (const a of alertas) {
    penalizacion += a.nivel === "critico" ? 25 : 12;
  }
  const salud_editorial_pct = Math.max(20, Math.min(100, 100 - penalizacion));

  const estado: DiagnosticoFatigaAudienceDTO["estado"] =
    salud_editorial_pct >= 85 ? "optimo" : salud_editorial_pct >= 65 ? "atencion" : "saturacion";

  const frecuencia_temas_top = Array.from(frecuenciaTemasMap.entries())
    .map(([clave, ocurrencias]) => {
      const pat = PATRONES_TEMATICOS.find((p) => p.clave === clave);
      return { tema: pat?.nombre || clave, ocurrencias };
    })
    .sort((a, b) => b.ocurrencias - a.ocurrencias);

  let resumen_recomendacion = "Distribución editorial óptima y balanceada según el modelo de pensamiento sistémico.";
  if (alertas.length > 0) {
    resumen_recomendacion = alertas.map((a) => a.recomendacion_reencuadre).join(" ");
  }

  return {
    salud_editorial_pct,
    estado,
    total_piezas_analizadas: total,
    semanas_analizadas: semanasVentana,
    alertas,
    frecuencia_dimensiones,
    frecuencia_temas_top,
    resumen_recomendacion,
  };
}
