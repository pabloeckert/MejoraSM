/**
 * managementAutonomyEngine.ts
 * MOTOR DE MATRICES DE AUTONOMÍA Y PLANES DE DELEGACIÓN PARA MANDOS MEDIOS (SPRINT S+24)
 * Basado en:
 * - Andy Grove (High Output Management: Task-Relevant Maturity - TRM).
 * - Peter Drucker (The Effective Executive: Concentración en la contribución directiva).
 * - Michael Gerber (The E-Myth Revisited: De técnico a constructor de sistemas).
 * - David Maister (The Trusted Advisor: Acuerdos de confianza directivos).
 * - Manual de Identidad Verbal Mejora Continua (AGENTS.md: Calidez con Verdad,
 *   Foco en Procesos / Nunca a la Persona, No se Vende por Precio, Estructura 3 Pasos).
 */

import { auditarBrandVoice, type ResultadoAuditoriaBrandVoice } from "./brandVoiceLinterEngine";

export type IdRolMandoMedio =
  | "jefe_taller_produccion"
  | "responsable_ventas_comercial"
  | "administracion_finanzas"
  | "logistica_despacho"
  | "personalizado";

export type NivelTRM = "baja" | "media" | "alta";

export interface UmbralDecision {
  nivel: 1 | 2 | 3;
  tipoAccion: "CONSULTAR_PREVIO" | "ACTUAR_Y_AVISAR" | "AUTONOMIA_PLENA";
  etiqueta: string;
  reglaParametrica: string;
  ejemploConcreto: string;
}

export interface RolMandoMedioInfo {
  id: IdRolMandoMedio;
  nombreRol: string;
  dimensionPrincipal: "personal" | "organizacional" | "comercial" | "empresarial";
  misionCritica: string;
  sintomaMicromanagement: string;
  causaRaizFaltaAcuerdos: string;
  nivelTRMSugerido: NivelTRM;
  umbralesSugeridos: UmbralDecision[];
  indicadorGrovePrincipal: string;
  frecuenciaSupervisionRecomendada: string;
}

export interface EntradaCalculoAutonomia {
  idRol: IdRolMandoMedio;
  nombreMandoMedio?: string;
  nombreDirectivo?: string;
  empresaNombre?: string;
  nivelTRM?: NivelTRM;
  montoLimiteARS?: number;
}

export interface ResultadoAutonomiaMandos {
  idMatriz: string;
  rol: RolMandoMedioInfo;
  nombreMandoMedio: string;
  nombreDirectivo: string;
  empresaNombre: string;
  nivelTRM: NivelTRM;
  estiloSupervisionGrove: {
    enfoque: string;
    frecuenciaContacto: string;
    rolDelLider: string;
    riesgoAEvitar: string;
  };
  umbrales: UmbralDecision[];
  planTransicion60Dias: {
    fase1Dias1a15: {
      nombre: string;
      objetivo: string;
      entregables: string[];
    };
    fase2Dias16a30: {
      nombre: string;
      objetivo: string;
      entregables: string[];
    };
    fase3Dias31a60: {
      nombre: string;
      objetivo: string;
      entregables: string[];
    };
  };
  estructuraTresPasos: {
    paso1VerdadSinJuzgar: string;
    paso2CausaRaizSistema: string;
    paso3DireccionConcreta: string;
  };
  resumenWhatsAppDirectivo: string;
  briefingMarkdown: string;
  auditoriaBrandVoice: ResultadoAuditoriaBrandVoice;
}

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE ROLES TÍPICOS DE MANDOS MEDIOS PYME
// ═══════════════════════════════════════════════════════════════
const CATALOGO_ROLES: Record<Exclude<IdRolMandoMedio, "personalizado">, RolMandoMedioInfo> = {
  jefe_taller_produccion: {
    id: "jefe_taller_produccion",
    nombreRol: "Jefe de Planta / Taller / Producción",
    dimensionPrincipal: "organizacional",
    misionCritica: "Garantizar el cumplimiento del programa semanal de entregas con cero retrabajos y seguridad de equipo.",
    sintomaMicromanagement: "El dueño pasa horas en planta diciendo quién hace qué trabajo y resolviendo imprevistos mecánicos menores.",
    causaRaizFaltaAcuerdos: "Inexistencia de un tablero de secuenciación visual y falta de umbral monetario para compras de repuestos menores.",
    nivelTRMSugerido: "media",
    umbralesSugeridos: [
      {
        nivel: 1,
        tipoAccion: "CONSULTAR_PREVIO",
        etiqueta: "Decisiones con Impacto Crítico (Nivel 1)",
        reglaParametrica: "Paradas de línea no programadas > 2 horas o compras de repuestos que superen el límite acordado.",
        ejemploConcreto: "Reparación mayor de torno/máquina principal o contratación de operario eventual.",
      },
      {
        nivel: 2,
        tipoAccion: "ACTUAR_Y_AVISAR",
        etiqueta: "Decisiones Operativas con Registro Diario (Nivel 2)",
        reglaParametrica: "Reasignación de puestos de trabajo entre operarios o insumos de desgaste hasta el límite diario.",
        ejemploConcreto: "Rotar al operario B a pulido para destrabar un cuello de botella urgente e informar en la minuta.",
      },
      {
        nivel: 3,
        tipoAccion: "AUTONOMIA_PLENA",
        etiqueta: "Decisiones Autónomas sin Consulta (Nivel 3)",
        reglaParametrica: "Secuenciación de órdenes de trabajo ya aprobadas y pausas técnicas de mantenimiento preventivo.",
        ejemploConcreto: "Decidir el orden de corte de chapas según el estándar visual de entrega sin consultar al dueño.",
      },
    ],
    indicadorGrovePrincipal: "OTIF (On-Time In-Full) % de órdenes despachadas en fecha acordada.",
    frecuenciaSupervisionRecomendada: "Reunión de Gemba Walk semanal de 25 minutos con tablero visual.",
  },

  responsable_ventas_comercial: {
    id: "responsable_ventas_comercial",
    nombreRol: "Responsable Comercial / Ejecutivo de Cuentas",
    dimensionPrincipal: "comercial",
    misionCritica: "Asegurar que cada cotización emitida tenga seguimiento en < 48 horas y sostener la rentabilidad de las listas.",
    sintomaMicromanagement: "El dueño responde personalmente consultas comerciales, aprueba cada descuento y atiende quejas de cotizaciones.",
    causaRaizFaltaAcuerdos: "Falta de una política de descuentos por rangos de volumen y ausencia de un CRM con alertas de estancamiento.",
    nivelTRMSugerido: "media",
    umbralesSugeridos: [
      {
        nivel: 1,
        tipoAccion: "CONSULTAR_PREVIO",
        etiqueta: "Decisiones Comerciales Estratégicas (Nivel 1)",
        reglaParametrica: "Descuentos superiores al margen estándar o clientes especiales con plazos de pago > 60 días.",
        ejemploConcreto: "Oferta por licitación especial o bonificación superior al 7% sobre lista oficial.",
      },
      {
        nivel: 2,
        tipoAccion: "ACTUAR_Y_AVISAR",
        etiqueta: "Ajustes Operativos de Venta (Nivel 2)",
        reglaParametrica: "Bonificaciones de flete o plazos de entrega preferenciales para clientes recurrentes.",
        ejemploConcreto: "Compromiso de entrega en 72h con stock disponible registrando la condición en el sistema.",
      },
      {
        nivel: 3,
        tipoAccion: "AUTONOMIA_PLENA",
        etiqueta: "Gestión Autónoma de Pipeline (Nivel 3)",
        reglaParametrica: "Cotizaciones dentro de lista de precios y cadencia obligatoria de seguimiento a 48h.",
        ejemploConcreto: "Enviar cotización estándar y agendar llamada de cierre sin pedir autorización al dueño.",
      },
    ],
    indicadorGrovePrincipal: "Tasa de conversión de cotizaciones y tiempo promedio de primer contacto (< 24h).",
    frecuenciaSupervisionRecomendada: "Revisión comercial semanal de 30 minutos sobre el embudo activo.",
  },

  administracion_finanzas: {
    id: "administracion_finanzas",
    nombreRol: "Responsable de Administración y Cobranzas",
    dimensionPrincipal: "empresarial",
    misionCritica: "Mantener el flujo de caja proyectado a 30 días, la conciliación bancaria al día y las cuentas corrientes saneadas.",
    sintomaMicromanagement: "El dueño autoriza cada factura menor por WhatsApp y tiene que llamar él mismo a clientes morosos para cobrar.",
    causaRaizFaltaAcuerdos: "Falta de un semáforo de crédito automático y ausencia de un calendario cerrado de pagos a proveedores.",
    nivelTRMSugerido: "alta",
    umbralesSugeridos: [
      {
        nivel: 1,
        tipoAccion: "CONSULTAR_PREVIO",
        etiqueta: "Decisiones Financieras Estructurales (Nivel 1)",
        reglaParametrica: "Pagos fuera de presupuesto asignado o acuerdos de refinanciación de deuda bancaria/impositiva.",
        ejemploConcreto: "Inversión en activo fijo o refinanciación de cliente con mora superior a 90 días.",
      },
      {
        nivel: 2,
        tipoAccion: "ACTUAR_Y_AVISAR",
        etiqueta: "Gestión de Flujo y Pagos Corrientes (Nivel 2)",
        reglaParametrica: "Pagos a proveedores homologados dentro del presupuesto semanal aprobado por el socio.",
        ejemploConcreto: "Liberar transferencias de servicios e insumos de oficina cargando comprobante en el drive común.",
      },
      {
        nivel: 3,
        tipoAccion: "AUTONOMIA_PLENA",
        etiqueta: "Cobranzas y Facturación de Rutina (Nivel 3)",
        reglaParametrica: "Envío de recordatorios de cobro a 7 días y emisión de facturas electrónicas de órdenes conformadas.",
        ejemploConcreto: "Enviar estado de cuenta a clientes con factura por vencer y registrar fecha estimada de cobro.",
      },
    ],
    indicadorGrovePrincipal: "Días en Calle (DSO) y saldo proyectado de caja libre a 30 días.",
    frecuenciaSupervisionRecomendada: "Cierre financiero quincenal de 45 minutos con tablero de tesorería.",
  },

  logistica_despacho: {
    id: "logistica_despacho",
    nombreRol: "Responsable de Logística, Almacén y Despacho",
    dimensionPrincipal: "organizacional",
    misionCritica: "Garantizar que los pedidos armados salgan sin faltantes, con remito conformado y trazabilidad de fletes.",
    sintomaMicromanagement: "El dueño atiende quejas telefónicas de clientes que no recibieron su pedido y va al depósito a buscar bultos.",
    causaRaizFaltaAcuerdos: "Falta de control de inventario rotativo y ausencia de una ventana horaria fija para recepción y corte de despacho.",
    nivelTRMSugerido: "media",
    umbralesSugeridos: [
      {
        nivel: 1,
        tipoAccion: "CONSULTAR_PREVIO",
        etiqueta: "Riesgos de Flete o Faltantes Mayores (Nivel 1)",
        reglaParametrica: "Contratación de fletes expresos con sobrecosto o reclamos de rotura que superen el seguro.",
        ejemploConcreto: "Contratar transporte dedicado urgente por demora imputable a fábrica.",
      },
      {
        nivel: 2,
        tipoAccion: "ACTUAR_Y_AVISAR",
        etiqueta: "Ruteo y Logística Operativa (Nivel 2)",
        reglaParametrica: "Consolidación de entregas por zonas geográficas y cambio de proveedor logístico estándar.",
        ejemploConcreto: "Unificar dos entregas en zona norte para optimizar el viaje notificando al comercial.",
      },
      {
        nivel: 3,
        tipoAccion: "AUTONOMIA_PLENA",
        etiqueta: "Despacho y Control de Bultos (Nivel 3)",
        reglaParametrica: "Armado de remitos, embalaje según protocolo de protección y control de ingreso de mercadería.",
        ejemploConcreto: "Liberar camión con remito firmado y archivar escaneo en el sistema sin consulta.",
      },
    ],
    indicadorGrovePrincipal: "Tasa de reclamos por faltante/rotura en entrega (% sobre envíos totales < 1%).",
    frecuenciaSupervisionRecomendada: "Revisión logística semanal de 20 minutos con métricas de entrega.",
  },
};

// ═══════════════════════════════════════════════════════════════
// ESTILOS DE SUPERVISIÓN SEGÚN TRM (ANDY GROVE)
// ═══════════════════════════════════════════════════════════════
function obtenerEstiloSupervisionGrove(nivel: NivelTRM) {
  switch (nivel) {
    case "baja":
      return {
        enfoque: "Estructurado / Instrucción Paso a Paso",
        frecuenciaContacto: "Diario / Check-in de 10 minutos al inicio y cierre del turno",
        rolDelLider: "Enseñar el método, definir el 'qué, cómo y cuándo' con precisión y verificar el estándar.",
        riesgoAEvitar: "No asumir conocimientos previos ni delegar sin acompañar; la frustración nace de la ambigüedad.",
      };
    case "media":
      return {
        enfoque: "Comunicación Bidireccional / Fijación Conjunta de Objetivos",
        frecuenciaContacto: "Semanal / Reunión estructurada de 30 minutos con tablero",
        rolDelLider: "Escuchar alternativas, calibrar el criterio de decisión y actuar como facilitador de recursos.",
        riesgoAEvitar: "No volver al micromanagement ante el primer error; convertir el desvío en aprendizaje de proceso.",
      };
    case "alta":
      return {
        enfoque: "Delegación Plena con Supervisión por Excepción",
        frecuenciaContacto: "Quincenal o Mensual / Revisión de Indicador Grove",
        rolDelLider: "Alinear metas estratégicas, acordar presupuesto y evaluar únicamente el resultado final.",
        riesgoAEvitar: "No caer en el abandono: el mando con alta TRM necesita reconocimiento y visión de futuro del negocio.",
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// MOTOR PRINCIPAL DETERMINISTA
// ═══════════════════════════════════════════════════════════════
export function calcularAutonomiaMandosMedios(
  entrada: EntradaCalculoAutonomia
): ResultadoAutonomiaMandos {
  const nombreMandoMedio = (entrada.nombreMandoMedio || "Responsable de Área").trim();
  const nombreDirectivo = (entrada.nombreDirectivo || "Director / Socio").trim();
  const empresaNombre = (entrada.empresaNombre || "Empresa PyME").trim();
  const montoLimiteARS = entrada.montoLimiteARS || 250_000;

  // Obtener rol base
  let rolBase: RolMandoMedioInfo;
  if (entrada.idRol === "personalizado" || !CATALOGO_ROLES[entrada.idRol]) {
    rolBase = {
      id: "personalizado",
      nombreRol: "Coordinador / Mando Medio Clave",
      dimensionPrincipal: "organizacional",
      misionCritica: "Organizar y liderar la operación del sector liberando al dueño de la toma de decisiones diarias menores.",
      sintomaMicromanagement: "El socio gerente es consultado decenas de veces al día para autorizar tareas de rutina.",
      causaRaizFaltaAcuerdos: "Ausencia de umbrales paramétricos de decisión que definan qué se resuelve en el área y qué escala al directorio.",
      nivelTRMSugerido: "media",
      umbralesSugeridos: [
        {
          nivel: 1,
          tipoAccion: "CONSULTAR_PREVIO",
          etiqueta: "Decisiones con Impacto Crítico (Nivel 1)",
          reglaParametrica: `Decisiones con impacto financiero superior a $${montoLimiteARS.toLocaleString("es-AR")} o cambios normativos.`,
          ejemploConcreto: "Contratación de servicios externos o modificaciones de políticas de entrega.",
        },
        {
          nivel: 2,
          tipoAccion: "ACTUAR_Y_AVISAR",
          etiqueta: "Decisiones Operativas con Registro Diario (Nivel 2)",
          reglaParametrica: `Gastos o compras de operación hasta $${montoLimiteARS.toLocaleString("es-AR")} y reasignaciones internas.`,
          ejemploConcreto: "Resolver contingencias del día e informar en el resumen de fin de jornada.",
        },
        {
          nivel: 3,
          tipoAccion: "AUTONOMIA_PLENA",
          etiqueta: "Decisiones Autónomas sin Consulta (Nivel 3)",
          reglaParametrica: "Secuenciación de tareas rutinarias y coordinación del equipo dentro del estándar acordado.",
          ejemploConcreto: "Definir prioridades de trabajo diario sin requerir confirmación del dueño.",
        },
      ],
      indicadorGrovePrincipal: "Cumplimiento del plan semanal acordado (% de entregas a término).",
      frecuenciaSupervisionRecomendada: "Reunión semanal de sincronización de 30 minutos.",
    };
  } else {
    rolBase = CATALOGO_ROLES[entrada.idRol];
  }

  const nivelTRM = entrada.nivelTRM || rolBase.nivelTRMSugerido;
  const estiloSupervisionGrove = obtenerEstiloSupervisionGrove(nivelTRM);

  // Umbrales adaptados con el monto dinámico
  const umbrales: UmbralDecision[] = rolBase.umbralesSugeridos.map((u) => {
    if (u.nivel === 1) {
      return {
        ...u,
        reglaParametrica: u.reglaParametrica.replace(/límite acordado|límite diario/g, `$${montoLimiteARS.toLocaleString("es-AR")}`),
      };
    }
    return u;
  });

  // Generador de ID determinista
  const hashId = Math.abs(
    (empresaNombre + rolBase.id + nivelTRM).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  )
    .toString()
    .slice(-4)
    .padStart(4, "7");
  const idMatriz = `AUTON-${rolBase.id.toUpperCase().slice(0, 6)}-${hashId}`;

  // Plan de Transición 60 Días de Andy Grove y Michael Gerber
  const planTransicion60Dias = {
    fase1Dias1a15: {
      nombre: "Fase 1: Mapeo de Umbrales & Gemba Walk (Días 1 a 15)",
      objetivo: `Formalizar en un acuerdo de una página las decisiones de Nivel 1, 2 y 3 para ${rolBase.nombreRol}.`,
      entregables: [
        `Reunión inicial de 45 minutos entre ${nombreDirectivo} y ${nombreMandoMedio} para validar los 3 niveles de decisión.`,
        `Fijación del umbral financiero de $${montoLimiteARS.toLocaleString("es-AR")} para gastos operativos directos.`,
        "Puesta en marcha del cuaderno o canal de 'Actuar y Avisar' para eliminar las consultas verbales al paso.",
      ],
    },
    fase2Dias16a30: {
      nombre: "Fase 2: Despliegue de Tablero Visual & Reunión Semanal (Días 16 a 30)",
      objetivo: "Implementar el tablero de control de área y establecer el hábito de la reunión semanal de 25 minutos.",
      entregables: [
        `Diseño del tablero visual de piso con el Indicador Grove principal: ${rolBase.indicadorGrovePrincipal}.`,
        "Cero interrupciones al dueño fuera del horario de reunión para temas de Nivel 2 y 3.",
        "Bitácora de desvíos: registrar cada error no como culpa, sino como oportunidad de afinar el parámetro.",
      ],
    },
    fase3Dias31a60: {
      nombre: "Fase 3: Autonomía Paramétrica Consolidada (Días 31 a 60)",
      objetivo: `Consolidar la autonomía plena del rol y devolver al menos 4 horas semanales de tiempo estratégico a ${nombreDirectivo}.`,
      entregables: [
        `Evaluación conjunta de madurez TRM: confirmar si ${nombreMandoMedio} pasa a supervisión por excepción.`,
        "Revisión y ajuste del umbral de decisión si el flujo operativo demostró estabilidad.",
        "Auditoría de desahogo: verificar que el socio ya no responde urgencias del área en fines de semana.",
      ],
    },
  };

  // Estructura verbal en 3 pasos (Constitución Verbal de Mejora Continua)
  const estructuraTresPasos = {
    paso1VerdadSinJuzgar: `En ${empresaNombre}, el rol de ${rolBase.nombreRol} (${nombreMandoMedio}) suele absorber horas de consulta permanente al socio porque no están formalizadas las fronteras de lo que se puede resolver de inmediato.`,
    paso2CausaRaizSistema: `La causa raíz no es la falta de iniciativa del equipo ni la desconfianza del dueño, sino la ausencia de una matriz de procesos y umbrales paramétricos que diferencie decisiones de impacto crítico de las decisiones de piso.`,
    paso3DireccionConcreta: `La solución de la Metodología 4D consiste en implementar 3 niveles de delegación con un límite de $${montoLimiteARS.toLocaleString("es-AR")} y una reunión semanal de 25 minutos con tablero visual para ordenar la operación hacia https://mejoraok.com/diagnostico.`,
  };

  // Resumen formateado para WhatsApp / DM Directivo
  const resumenWhatsAppDirectivo =
    `Estimado/a *${nombreDirectivo}*,\n\n` +
    `Te comparto la *Matriz de Autonomía y Delegación Paramétrica* diseñada para el rol de *${rolBase.nombreRol}* (${nombreMandoMedio}) en *${empresaNombre}*:\n\n` +
    `🎯 *Nivel de Madurez Operativa (TRM Andy Grove):* ${nivelTRM.toUpperCase()} — ${estiloSupervisionGrove.enfoque}.\n` +
    `⏱️ *Frecuencia de Supervisión:* ${estiloSupervisionGrove.frecuenciaContacto}.\n\n` +
    `📋 *Matriz de Umbrales de Decisión:*\n` +
    `🔴 *Nivel 1 (Consultar antes):* ${umbrales[0].reglaParametrica}\n` +
    `🟡 *Nivel 2 (Actuar y avisar):* ${umbrales[1].reglaParametrica}\n` +
    `🟢 *Nivel 3 (Autonomía plena):* ${umbrales[2].reglaParametrica}\n\n` +
    `📊 *Indicador Clave de Control:* ${rolBase.indicadorGrovePrincipal}\n` +
    `🚀 *Impacto Esperado:* Recuperar entre 4 y 6 horas semanales de bomberismo del socio desde las primeras 3 semanas.\n\n` +
    `Podés profundizar en este modelo de acuerdos en: mejoraok.com/diagnostico`;

  // Briefing Markdown para actas de gestión
  const briefingMarkdown =
    `# MATRIZ DE AUTONOMÍA Y DELEGACIÓN PARAMÉTRICA — MEJORA CONTINUA\n` +
    `**Código de Matriz:** ${idMatriz}\n` +
    `**Empresa:** ${empresaNombre}\n` +
    `**Directivo Sponsor:** ${nombreDirectivo}\n` +
    `**Mando Medio Responsable:** ${nombreMandoMedio} (${rolBase.nombreRol})\n` +
    `**Dimensión Principal:** ${rolBase.dimensionPrincipal.toUpperCase()}\n\n` +
    `---\n\n` +
    `## 1. DIAGNÓSTICO SITUACIONAL Y SÍNTOMA DE TRINCHERA\n` +
    `- **Misión Crítica:** ${rolBase.misionCritica}\n` +
    `- **Síntoma Visible:** ${rolBase.sintomaMicromanagement}\n` +
    `- **Causa Raíz Sistémica:** ${rolBase.causaRaizFaltaAcuerdos}\n\n` +
    `## 2. ESTILO DE SUPERVISIÓN (TASK-RELEVANT MATURITY - ANDY GROVE)\n` +
    `- **Nivel TRM:** ${nivelTRM.toUpperCase()} (${estiloSupervisionGrove.enfoque})\n` +
    `- **Cadencia Recomendada:** ${estiloSupervisionGrove.frecuenciaContacto}\n` +
    `- **Rol del Líder:** ${estiloSupervisionGrove.rolDelLider}\n` +
    `- **Riesgo Operativo a Evitar:** ${estiloSupervisionGrove.riesgoAEvitar}\n\n` +
    `## 3. MATRIZ DE UMBRALES PARAMÉTRICOS DE DECISIÓN\n` +
    `| Nivel | Tipo de Acción | Regla Paramétrica | Ejemplo Concreto |\n` +
    `| :--- | :--- | :--- | :--- |\n` +
    umbrales
      .map(
        (u) =>
          `| **Nivel ${u.nivel}** | \`${u.tipoAccion}\` | ${u.reglaParametrica} | ${u.ejemploConcreto} |`
      )
      .join("\n") +
    `\n\n` +
    `## 4. PLAN DE TRANSICIÓN DE 60 DÍAS\n` +
    `### ${planTransicion60Dias.fase1Dias1a15.nombre}\n` +
    `*Objetivo:* ${planTransicion60Dias.fase1Dias1a15.objetivo}\n` +
    planTransicion60Dias.fase1Dias1a15.entregables.map((e) => `- ${e}`).join("\n") +
    `\n\n` +
    `### ${planTransicion60Dias.fase2Dias16a30.nombre}\n` +
    `*Objetivo:* ${planTransicion60Dias.fase2Dias16a30.objetivo}\n` +
    planTransicion60Dias.fase2Dias16a30.entregables.map((e) => `- ${e}`).join("\n") +
    `\n\n` +
    `### ${planTransicion60Dias.fase3Dias31a60.nombre}\n` +
    `*Objetivo:* ${planTransicion60Dias.fase3Dias31a60.objetivo}\n` +
    planTransicion60Dias.fase3Dias31a60.entregables.map((e) => `- ${e}`).join("\n") +
    `\n\n` +
    `---\n` +
    `*Documento emitido según los estándares de Dirección y Organización de Mejora Continua (mejoraok.com).*`;

  // Auditoría Brand Voice automática
  const textoParaAuditoria = `${estructuraTresPasos.paso1VerdadSinJuzgar} ${estructuraTresPasos.paso2CausaRaizSistema} ${estructuraTresPasos.paso3DireccionConcreta}`;
  const auditoriaBrandVoice = auditarBrandVoice(textoParaAuditoria);

  return {
    idMatriz,
    rol: rolBase,
    nombreMandoMedio,
    nombreDirectivo,
    empresaNombre,
    nivelTRM,
    estiloSupervisionGrove,
    umbrales,
    planTransicion60Dias,
    estructuraTresPasos,
    resumenWhatsAppDirectivo,
    briefingMarkdown,
    auditoriaBrandVoice,
  };
}

export function listarRolesMandosMedios(): RolMandoMedioInfo[] {
  return Object.values(CATALOGO_ROLES);
}
