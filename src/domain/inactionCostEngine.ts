/**
 * inactionCostEngine.ts — Motor de Cálculo de Costo de Inacción Operativa & Retorno B2B
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Fundamentos Teóricos e Institucionales:
 * 1. Matthew Dixon & Brent Adamson ("The Challenger Sale"):
 *    - "Constructive Tension" & "Commercial Teaching".
 *    - El decisor B2B pragmático cambia cuando comprende que el costo de no intervenir
 *      (el statu quo) es significativamente mayor que la inversión en consultoría.
 * 2. Peter Drucker ("Managing for Results" & "La Gerencia"):
 *    - El costo de oportunidad de la alta dirección: cada hora apagando incendios operativos
 *      es una hora sustraída del desarrollo de clientes y la rentabilidad estructural.
 * 3. Eliyahu Goldratt ("The Goal" - Teoría de Restricciones):
 *    - Una hora perdida en el paso limitante de una PyME es una hora perdida para toda la organización.
 * 4. Manual de Identidad Verbal de Mejora Continua (AGENTS.md):
 *    - Calidez con Verdad: Números crudos pero fundamentados con cuidado hacia el líder.
 *    - Nunca a la persona / Foco en el sistema: La fuga económica se debe a la ausencia
 *      de procesos, tableros y acuerdos paramétricos, jamás a la capacidad del dueño.
 *    - No se vende por precio: La consultoría se justifica por el retorno de detener la hemorragia.
 *    - Marco de las 4 Dimensiones (Personal, Organizacional, Comercial, Empresarial).
 */

import { type ArquetipoDolor } from "./executiveDiagnosticEngine";
import { auditarBrandVoice, type ResultadoAuditoriaBrandVoice } from "./brandVoiceLinterEngine";

export interface InputCostoInaccion {
  facturacionMensualARS: number;
  tamanoEquipo: number;
  arquetipoDolor?: ArquetipoDolor;
  horasSemanalesBomberismo?: number;
  valorHoraDirectivaARS?: number;
  porcentajeRetrabajosYFriccion?: number;
  cotizacionesMensualesSinSeguimiento?: number;
  ticketPromedioARS?: number;
  empresaNombre?: string;
  nombreDirectivo?: string;
}

export interface DesgloseDimensionInaccion {
  dimension: "personal" | "organizacional" | "comercial" | "empresarial";
  titulo: string;
  friccionDetectada: string;
  impactoCuantitativo: string;
  causaRaizSistema: string;
  solucionSistemica4D: string;
  costoMensualARS: number;
}

export interface ProyeccionRecuperacion90Dias {
  ahorroMensualProyectadoARS: number;
  ahorroAnualProyectadoARS: number;
  horasDirectivasLiberadasMes: number;
  reduccionRetrabajosPct: number;
  cotizacionesRecuperadasMes: number;
  roiEstimadoRatio: string;
  descripcionPlan: string;
}

export interface ResultadoCostoInaccion {
  idCalculo: string;
  fechaCalculo: string;
  empresaNombre: string;
  nombreDirectivo: string;
  arquetipoDolor: ArquetipoDolor;
  
  // Parámetros Base
  facturacionMensualARS: number;
  facturacionAnualARS: number;
  tamanoEquipo: number;
  horasSemanalesBomberismo: number;
  horasMensualesBomberismo: number;
  horasAnualesBomberismo: number;
  equivalenciaSemanasCompletasAnuales: number;
  valorHoraDirectivaARS: number;

  // Drenajes Parciales Mensuales
  drenajeDirectivoMensualARS: number;
  costoRetrabajosMensualARS: number;
  lucroCesanteComercialMensualARS: number;

  // Totales de Inacción
  costoInaccionMensualARS: number;
  costoInaccionAnualARS: number;
  porcentajeSobreFacturacion: number;

  // Desglose por las 4 Dimensiones
  desgloseDimensiones: Record<"personal" | "organizacional" | "comercial" | "empresarial", DesgloseDimensionInaccion>;

  // Escenario de Recuperación con Mejora Continua
  proyeccionRecuperacion: ProyeccionRecuperacion90Dias;

  // Estructura Verbal en 3 Pasos (Verdad, Sistema, Dirección)
  estructuraTresPasos: {
    paso1VerdadSinJuzgar: string;
    paso2CausaRaizSistema: string;
    paso3DireccionConcreta: string;
  };

  // Formatos Listos para Conversión
  resumenWhatsApp: string;
  briefingMarkdown: string;

  // Auditoría Brand Voice
  auditoriaBrandVoice: ResultadoAuditoriaBrandVoice;
}

// ═══════════════════════════════════════════════════════════════
// VALORES POR DEFECTO SEGÚN ARQUETIPO DIRECTIVO
// ═══════════════════════════════════════════════════════════════
const DEFAULTS_POR_ARQUETIPO: Record<
  ArquetipoDolor,
  {
    horasBomberismo: number;
    porcentajeRetrabajo: number;
    cotizacionesFuga: number;
    factorHoraMultiplicador: number; // Multiplicador sobre base de sueldo directivo
  }
> = {
  fundador_saturado: {
    horasBomberismo: 16,
    porcentajeRetrabajo: 8,
    cotizacionesFuga: 6,
    factorHoraMultiplicador: 1.2,
  },
  segunda_generacion: {
    horasBomberismo: 12,
    porcentajeRetrabajo: 10,
    cotizacionesFuga: 5,
    factorHoraMultiplicador: 1.1,
  },
  estancamiento_comercial: {
    horasBomberismo: 10,
    porcentajeRetrabajo: 6,
    cotizacionesFuga: 12,
    factorHoraMultiplicador: 1.0,
  },
  calidad_entregas: {
    horasBomberismo: 18,
    porcentajeRetrabajo: 14,
    cotizacionesFuga: 4,
    factorHoraMultiplicador: 1.1,
  },
};

/**
 * Infiere un valor de hora directiva razonable según la facturación mensual
 * si el usuario no especifica uno explícitamente.
 */
function inferirValorHoraDirectiva(facturacionMensualARS: number): number {
  if (facturacionMensualARS <= 20_000_000) return 22_000;
  if (facturacionMensualARS <= 50_000_000) return 32_000;
  if (facturacionMensualARS <= 120_000_000) return 45_000;
  return 65_000;
}

/**
 * Infiere un ticket promedio de cotización según la facturación mensual
 */
function inferirTicketPromedio(facturacionMensualARS: number): number {
  if (facturacionMensualARS <= 20_000_000) return 900_000;
  if (facturacionMensualARS <= 50_000_000) return 1_800_000;
  if (facturacionMensualARS <= 120_000_000) return 4_200_000;
  return 8_500_000;
}

/**
 * Formatea moneda argentina ($ ARS) para visualización clara
 */
export function formatearMonedaARS(monto: number): string {
  const rounded = Math.round(monto);
  return `$ ${rounded.toLocaleString("es-AR")}`;
}

/**
 * Genera un ID determinista o único para el cálculo
 */
function generarIdCalculo(empresa: string, facturacion: number): string {
  const clean = empresa.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "PYME";
  const num = (facturacion % 9999).toString().padStart(4, "0");
  return `COI-${clean}-${num}`;
}

// ═══════════════════════════════════════════════════════════════
// MOTOR PRINCIPAL DE CÁLCULO
// ═══════════════════════════════════════════════════════════════

export function calcularCostoInaccion(input: InputCostoInaccion): ResultadoCostoInaccion {
  const facturacionMensual = Math.max(1_000_000, input.facturacionMensualARS || 35_000_000);
  const facturacionAnual = facturacionMensual * 12;
  const tamanoEquipo = Math.max(1, input.tamanoEquipo || 12);
  const arquetipo: ArquetipoDolor = input.arquetipoDolor || "fundador_saturado";
  const defaults = DEFAULTS_POR_ARQUETIPO[arquetipo];

  const empresaNombre = input.empresaNombre?.trim() || "Empresa PyME";
  const nombreDirectivo = input.nombreDirectivo?.trim() || "Director General / Socio";

  // 1. Horas y Drenaje Directivo
  const horasSemanales = Math.max(1, input.horasSemanalesBomberismo ?? defaults.horasBomberismo);
  const horasMensuales = Math.round(horasSemanales * 4.33);
  const horasAnuales = Math.round(horasSemanales * 52);
  const semanasCompletasAnuales = Number((horasAnuales / 40).toFixed(1));

  const valorHoraBase = input.valorHoraDirectivaARS ?? inferirValorHoraDirectiva(facturacionMensual);
  const valorHoraDirectiva = Math.round(valorHoraBase * defaults.factorHoraMultiplicador);
  const drenajeDirectivoMensual = Math.round(horasMensuales * valorHoraDirectiva);

  // 2. Pérdida Operativa por Retrabajos y Fricción de Piso
  // En PyMEs, la base de costos directos (sueldos de piso + materiales + gastos operativos)
  // representa típicamente el 65% de la facturación.
  const baseCostosDirectosMensual = facturacionMensual * 0.65;
  const pctRetrabajo = Math.max(1, Math.min(40, input.porcentajeRetrabajosYFriccion ?? defaults.porcentajeRetrabajo));
  const costoRetrabajosMensual = Math.round(baseCostosDirectosMensual * (pctRetrabajo / 100));

  // 3. Lucro Cesante Comercial (Fuga de Oportunidades en Embudo)
  const cotizacionesFugaMensual = Math.max(0, input.cotizacionesMensualesSinSeguimiento ?? defaults.cotizacionesFuga);
  const ticketPromedio = Math.max(50_000, input.ticketPromedioARS ?? inferirTicketPromedio(facturacionMensual));
  // Con seguimiento sistemático en 48h, una PyME suele cerrar al menos el 22% de lo cotizado que hoy se enfría.
  const tasaCierreRecuperable = 0.22;
  const volumenVentasPerdidas = cotizacionesFugaMensual * tasaCierreRecuperable * ticketPromedio;
  // Margen de contribución neto esperado sobre esas ventas (35%)
  const margenContribucion = 0.35;
  const lucroCesanteComercialMensual = Math.round(volumenVentasPerdidas * margenContribucion);

  // 4. Totales Consolidados
  const costoInaccionMensual = drenajeDirectivoMensual + costoRetrabajosMensual + lucroCesanteComercialMensual;
  const costoInaccionAnual = costoInaccionMensual * 12;
  const porcentajeSobreFacturacion = Number(((costoInaccionMensual / facturacionMensual) * 100).toFixed(1));

  // 5. Desglose en las 4 Dimensiones de Mejora Continua
  const desgloseDimensiones: Record<"personal" | "organizacional" | "comercial" | "empresarial", DesgloseDimensionInaccion> = {
    personal: {
      dimension: "personal",
      titulo: "Dimensión Personal (Sobrecarga Directiva)",
      friccionDetectada: `${horasSemanales} horas por semana dedicadas a resolver contingencias operativas urgentes en lugar de liderar el negocio.`,
      impactoCuantitativo: `${horasMensuales}h/mes absorbidas · Equivalente a ${semanasCompletasAnuales} semanas laborales completas al año.`,
      causaRaizSistema: "Ausencia de protocolos paramétricos de delegación y umbrales claros de toma de decisión para mandos medios.",
      solucionSistemica4D: "Definir matrices de decisión autónoma y rutinas de alineación semanal de 30 minutos.",
      costoMensualARS: drenajeDirectivoMensual,
    },
    organizacional: {
      dimension: "organizacional",
      titulo: "Dimensión Organizacional (Retrabajos & Fricción de Piso)",
      friccionDetectada: `Un ${pctRetrabajo}% de la operación incurre en reprocesos, demoras de entrega o aclaraciones reiteradas.`,
      impactoCuantitativo: `${formatearMonedaARS(costoRetrabajosMensual)} mensuales perdidos en horas improductivas y materiales.`,
      causaRaizSistema: "Falta de tableros visuales de avance y manuales operativos vivos accesibles en el punto de trabajo.",
      solucionSistemica4D: "Implementar estándares de trabajo visual (Gemba Walk) y tableros de estado de orden sin intermediarios.",
      costoMensualARS: costoRetrabajosMensual,
    },
    comercial: {
      dimension: "comercial",
      titulo: "Dimensión Comercial (Fuga en Seguimiento de Cotizaciones)",
      friccionDetectada: `Aproximadamente ${cotizacionesFugaMensual} cotizaciones por mes quedan sin seguimiento estructurado en 48 horas.`,
      impactoCuantitativo: `${formatearMonedaARS(lucroCesanteComercialMensual)} mensuales de margen neto no capturado por enfriamiento comercial.`,
      causaRaizSistema: "Gestión comercial dispersa en chats individuales de WhatsApp sin CRM integrado ni alertas automáticas de caducidad.",
      solucionSistemica4D: "Desplegar pipeline unificado con regla de contacto en menos de 48 horas y plantillas consultivas.",
      costoMensualARS: lucroCesanteComercialMensual,
    },
    empresarial: {
      dimension: "empresarial",
      titulo: "Dimensión Empresarial (Erosión del Valor de la Firma)",
      friccionDetectada: "El negocio depende de la presencia física permanente del socio para mantener el margen operativo.",
      impactoCuantitativo: `Hemorragia anualizada estimada en ${formatearMonedaARS(costoInaccionAnual)} (${porcentajeSobreFacturacion}% de la facturación bruta).`,
      causaRaizSistema: "Inexistencia de un sistema de gobierno empresarial con indicadores desacoplados de la intuición personal.",
      solucionSistemica4D: "Arquitectura integral 4D: Tablero de Dirección, Gobierno de Mandos y Acuerdos de Gestión periódicos.",
      costoMensualARS: Math.round(costoInaccionMensual * 0.15), // Factor de riesgo estructural
    },
  };

  // 6. Proyección de Recuperación con Mejora Continua (Plan 4D a 90 Días)
  // Metas conservadoras comprobadas en pymes:
  // - 50% reducción de horas de bomberismo del socio
  // - 50% reducción del costo de retrabajos
  // - 40% recuperación de margen en cotizaciones
  const ahorroHorasDirectivas = Math.round(drenajeDirectivoMensual * 0.50);
  const ahorroRetrabajos = Math.round(costoRetrabajosMensual * 0.50);
  const recuperacionComercial = Math.round(lucroCesanteComercialMensual * 0.40);

  const ahorroMensualProyectado = ahorroHorasDirectivas + ahorroRetrabajos + recuperacionComercial;
  const ahorroAnualProyectado = ahorroMensualProyectado * 12;
  const horasLiberadasMes = Math.round(horasMensuales * 0.50);

  const proyeccionRecuperacion: ProyeccionRecuperacion90Dias = {
    ahorroMensualProyectadoARS: ahorroMensualProyectado,
    ahorroAnualProyectadoARS: ahorroAnualProyectado,
    horasDirectivasLiberadasMes: horasLiberadasMes,
    reduccionRetrabajosPct: 50,
    cotizacionesRecuperadasMes: Math.max(1, Math.round(cotizacionesFugaMensual * tasaCierreRecuperable)),
    roiEstimadoRatio: "5.2x a 7.8x",
    descripcionPlan:
      "Despliegue ordenado en 90 días: Matriz Gemba en Planta/Operaciones, Protocolo Comercial de Seguimiento 48h y Tablero Ejecutivo de Desahogo Directivo.",
  };

  // 7. Estructura Verbal en 3 Pasos (Verdad, Sistema, Dirección)
  const estructuraTresPasos = {
    paso1VerdadSinJuzgar: `En ${empresaNombre}, el costo de mantener el statu quo operativo asciende a ${formatearMonedaARS(costoInaccionMensual)} por mes (${formatearMonedaARS(costoInaccionAnual)} al año), consumiendo ${horasSemanales} horas semanales de dirección en apagar incendios.`,
    paso2CausaRaizSistema: `Esta fuga no responde a falta de capacidad del equipo, sino a la carencia de acuerdos de delegación claros, tableros visuales de piso y un protocolo de seguimiento comercial en menos de 48 horas.`,
    paso3DireccionConcreta: `Con la implementación de la Metodología 4D de Mejora Continua a 90 días, la empresa proyecta recuperar ${formatearMonedaARS(ahorroMensualProyectado)} mensuales y liberar ${horasLiberadasMes} horas de dirección al mes para proyectos estratégicos. Hoja de ruta en mejoraok.com/diagnostico.`,
  };

  // 8. Resumen para WhatsApp Directivo (Calidez con Verdad)
  const resumenWhatsApp = `Estimado/a ${nombreDirectivo},\n\n` +
    `Estuvimos analizando los números operativos de *${empresaNombre}* bajo el marco de Costo de Inacción de Mejora Continua:\n\n` +
    `*1. La Verdad de Trinchera:*\n` +
    `El costo de sostener la operación actual sin un sistema formalizado representa un drenaje estimado de *${formatearMonedaARS(costoInaccionMensual)} por mes* (aprox. *${formatearMonedaARS(costoInaccionAnual)} al año*), equivalente al *${porcentajeSobreFacturacion}% de tu facturación*.\n\n` +
    `*2. Dónde se filtra el recurso:*\n` +
    `• *Dirección:* ${horasSemanales}h semanales apagando urgencias (${semanasCompletasAnuales} semanas de tu año absorbidas).\n` +
    `• *Piso:* ${pctRetrabajo}% de fricción y retrabajos operativos (${formatearMonedaARS(costoRetrabajosMensual)}/mes).\n` +
    `• *Comercial:* ${cotizacionesFugaMensual} cotizaciones mensuales sin seguimiento estructurado en 48h.\n\n` +
    `*3. Causa Raíz:* El equipo no es el problema; la fricción surge porque no hay acuerdos paramétricos ni tableros de avance que ordenen el trabajo diario.\n\n` +
    `*4. Dirección Propuesta (Plan 4D a 90 Días):*\n` +
    `Intervenir el sistema permite recuperar un estimado de *${formatearMonedaARS(ahorroMensualProyectado)} por mes* y devolverte *${horasLiberadasMes} horas mensuales* para liderar.\n\n` +
    `Podés revisar el desglose metodológico completo y agendar la sesión de devolución técnica en: https://mejoraok.com/diagnostico?utm_source=mejora_sm&utm_medium=calculator&utm_campaign=${arquetipo}&calc_id=${generarIdCalculo(empresaNombre, facturacionMensual)}`;

  // 9. Briefing Ejecutivo en Markdown
  const briefingMarkdown = `# CÁLCULO DE COSTO DE INACCIÓN OPERATIVA & RETORNO 4D
**Empresa:** ${empresaNombre} | **Interlocutor:** ${nombreDirectivo}  
**Arquetipo:** ${arquetipo.toUpperCase()} | **Equipo:** ${tamanoEquipo} personas  
**Facturación Mensual Base:** ${formatearMonedaARS(facturacionMensual)}  

---

## 1. DRENAJE OPERATIVO CONSOLIDADO (STATU QUO)
* **Costo de Inacción Mensual:** **${formatearMonedaARS(costoInaccionMensual)}** (${porcentajeSobreFacturacion}% de facturación).
* **Costo de Inacción Anualizado:** **${formatearMonedaARS(costoInaccionAnual)}**.
* **Tiempo Directivo Absorbido:** ${horasSemanales} horas/semana (${horasMensuales}h/mes) = **${semanasCompletasAnuales} semanas de trabajo al año**.

---

## 2. DESGLOSE EN LAS 4 DIMENSIONES DE MEJORA CONTINUA
1. **Personal (${formatearMonedaARS(drenajeDirectivoMensual)}/mes):** ${desgloseDimensiones.personal.friccionDetectada}
2. **Organizacional (${formatearMonedaARS(costoRetrabajosMensual)}/mes):** ${desgloseDimensiones.organizacional.friccionDetectada}
3. **Comercial (${formatearMonedaARS(lucroCesanteComercialMensual)}/mes):** ${desgloseDimensiones.comercial.friccionDetectada}
4. **Empresarial (${formatearMonedaARS(desgloseDimensiones.empresarial.costoMensualARS)}/mes):** ${desgloseDimensiones.empresarial.friccionDetectada}

---

## 3. PROYECCIÓN DE RECUPERACIÓN (PLAN MEJORA CONTINUA 90 DÍAS)
* **Ahorro Estimado Mensual:** **${formatearMonedaARS(ahorroMensualProyectado)}**.
* **Ahorro Estimado Anual:** **${formatearMonedaARS(ahorroAnualProyectado)}**.
* **Horas de Dirección Recuperadas:** **${horasLiberadasMes} horas/mes**.
* **Retorno sobre Inversión Estimado (ROI):** **${proyeccionRecuperacion.roiEstimadoRatio}**.

> **Criterio Institucional Mejora Continua:** No se interviene para juzgar a las personas, sino para dotar a la organización de acuerdos y procesos que funcionen sin depender de la presencia permanente del fundador.
> Hoja de ruta: https://mejoraok.com/diagnostico`;

  // 10. Auditoría de Brand Voice
  const textoParaAuditar = `${estructuraTresPasos.paso1VerdadSinJuzgar} ${estructuraTresPasos.paso2CausaRaizSistema} ${estructuraTresPasos.paso3DireccionConcreta}`;
  const auditoriaBrandVoice = auditarBrandVoice(textoParaAuditar);

  return {
    idCalculo: generarIdCalculo(empresaNombre, facturacionMensual),
    fechaCalculo: new Date().toISOString(),
    empresaNombre,
    nombreDirectivo,
    arquetipoDolor: arquetipo,

    facturacionMensualARS: facturacionMensual,
    facturacionAnualARS: facturacionAnual,
    tamanoEquipo,
    horasSemanalesBomberismo: horasSemanales,
    horasMensualesBomberismo: horasMensuales,
    horasAnualesBomberismo: horasAnuales,
    equivalenciaSemanasCompletasAnuales: semanasCompletasAnuales,
    valorHoraDirectivaARS: valorHoraDirectiva,

    drenajeDirectivoMensualARS: drenajeDirectivoMensual,
    costoRetrabajosMensualARS: costoRetrabajosMensual,
    lucroCesanteComercialMensualARS: lucroCesanteComercialMensual,

    costoInaccionMensualARS: costoInaccionMensual,
    costoInaccionAnualARS: costoInaccionAnual,
    porcentajeSobreFacturacion: porcentajeSobreFacturacion,

    desgloseDimensiones,
    proyeccionRecuperacion,

    estructuraTresPasos,
    resumenWhatsApp,
    briefingMarkdown,
    auditoriaBrandVoice,
  };
}
