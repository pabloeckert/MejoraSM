/**
 * contentTransmutationEngine.ts — Motor de Transmutación y Repurposing Multicanal B2B
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - Gary Vaynerchuk (The Content Pyramid): Una idea pilar transmutada en 5 micro-contenidos nativos.
 * - Eric Ries (The Lean Startup): Reutilización de valor validado con ciclo de feedback rápido.
 * - Martin Kleppmann (DDIA): Modelado inmutable y composable de datos derivados.
 */

import { generarGuionReel, GuionReelCompleto } from "./reelScriptEngine";
import { generarHiloLinkedIn, LinkedInThreadData } from "./linkedinThreadEngine";

export type HiloLinkedInCompleto = LinkedInThreadData;

export interface InputTransmutacion {
  propuesta_id: string;
  titulo_portada: string;
  cuerpo_texto?: string;
  copy_tres_pasos?: {
    dolor?: string;
    reencuadre?: string;
    direccion?: string;
    paso1_dolor?: string;
    paso2_reencuadre?: string;
    paso3_direccion_web?: string;
  };
  copy_calibrado?: {
    dolor?: string;
    reencuadre?: string;
    direccion?: string;
    paso1_dolor?: string;
    paso2_reencuadre?: string;
    paso3_direccion_web?: string;
  };
  oferta?: string;
  formatoOriginal?: string;
  hook_aprobado?: string;
  buyer_persona?: string;
  dimension_servicio?: string;
}

export type TransmutationInput = InputTransmutacion;

export interface PlacaCitaTransmutada {
  aforismo: string;
  subtexto: string;
  autor: string;
  cargo: string;
  ratioSugerido: "1:1" | "9:16";
  textoParaCopiar: string;
  textoCita: string;
  autorInstitucional: string;
  subtituloAforismo: string;
  copyPostSoporte: string;
  specsDiseno: {
    fuente: string;
    fondo: string;
    espacioNegativoMinimo: string;
    colorAcento: string;
  };
}

export interface MensajeWhatsAppTransmutado {
  textoFormateado: string;
  titular: string;
  cuerpo: string;
  cta: string;
  longitudCaracteres: number;
  textoMensaje: string;
  linkLlamadaAccion: string;
}

export interface LaminaCarruselDetalle {
  numero: number;
  tipo: "portada" | "dolor" | "reencuadre" | "metodo" | "cta";
  titulo: string;
  cuerpo: string;
  pie: string;
  kicker?: string;
}

export interface CarruselMetadataTransmutado {
  titulo: string;
  totalSlides: number;
  slides: string[];
  ratio: "1080x1350";
  formato: "carrusel_pdf";
}

export interface CarruselEnriquecidoTransmutado {
  laminas: LaminaCarruselDetalle[];
  specsTecnicas: {
    dimensiones: string;
    relacionAspecto: string;
    estiloPie: string;
  };
  textoEstructuraMarkdown: string;
}

export interface PaqueteTransmutado {
  propuesta_id: string;
  tituloOriginal: string;
  multiplicadorAlcanceEstimado: number; // e.g. 3.8x
  horasAhorradasEstimadas: number; // e.g. 4.5h
  carruselPdf: CarruselMetadataTransmutado;
  guionReel: GuionReelCompleto;
  hiloLinkedIn: HiloLinkedInCompleto;
  placaCita: PlacaCitaTransmutada;
  mensajeWhatsApp: MensajeWhatsAppTransmutado;
  resumenEjecutivo: string;

  // Propiedades enriquecidas para UI y Repurposing
  metricasConsolidadas: {
    alcanceMultiplicador: number;
    tiempoAhorradoHoras: number;
    piezasTotalesGeneradas: number;
    canalesCubiertos: string[];
  };
  asset1_carrusel: CarruselEnriquecidoTransmutado;
  asset2_guionReel: GuionReelCompleto;
  asset3_hiloLinkedIn: HiloLinkedInCompleto;
  asset4_placaCita: PlacaCitaTransmutada;
  asset5_whatsappB2B: MensajeWhatsAppTransmutado;
  paqueteCompletoMarkdown: string;
}

export type TransmutationResult = PaqueteTransmutado;

/**
 * Transmuta una propuesta base en 5 activos derivados listos para publicar
 */
export function transmutarContenido(input: InputTransmutacion): PaqueteTransmutado {
  const dolor =
    input.copy_tres_pasos?.dolor ||
    input.copy_tres_pasos?.paso1_dolor ||
    input.copy_calibrado?.dolor ||
    input.copy_calibrado?.paso1_dolor ||
    input.cuerpo_texto ||
    input.hook_aprobado ||
    input.titulo_portada;

  const reencuadre =
    input.copy_tres_pasos?.reencuadre ||
    input.copy_tres_pasos?.paso2_reencuadre ||
    input.copy_calibrado?.reencuadre ||
    input.copy_calibrado?.paso2_reencuadre ||
    "La claridad directiva se construye rediseñando la arquitectura del flujo de trabajo, no exigiendo más horas al líder.";

  const direccion =
    input.copy_tres_pasos?.direccion ||
    input.copy_tres_pasos?.paso3_direccion_web ||
    input.copy_calibrado?.direccion ||
    input.copy_calibrado?.paso3_direccion_web ||
    "https://mejoraok.com/diagnostico";

  const dimension = input.dimension_servicio || input.oferta || "organizacional";

  // 1. ACTIVO A: CARRUSEL PDF B2B (1080x1350)
  const slides = [
    input.titulo_portada,
    `1. El Quiebre en Trinchera:\n${dolor}`,
    `2. La Causa Raíz:\n${reencuadre}`,
    `3. La Solución Sistémica:\nImplementar acuerdos de servicio internos, visibilidad de métricas duras y delegación basada en criterios.`,
    `4. Próximo Paso Directivo:\nCompletá el autodiagnóstico de 4 dimensiones en ${direccion}`,
  ];

  const carruselPdf: CarruselMetadataTransmutado = {
    titulo: input.titulo_portada,
    totalSlides: 5,
    slides,
    ratio: "1080x1350",
    formato: "carrusel_pdf",
  };

  const laminasCarrusel: LaminaCarruselDetalle[] = [
    {
      numero: 1,
      tipo: "portada",
      titulo: input.titulo_portada,
      cuerpo: input.hook_aprobado || "Criterio de gestión para directores y mandos medios.",
      pie: "Mejora Continua • Gestión de Procesos",
      kicker: `Dimensión ${dimension.toUpperCase()}`,
    },
    {
      numero: 2,
      tipo: "dolor",
      titulo: "1. La Fricción Operativa en Trinchera",
      cuerpo: dolor,
      pie: "Desglose Operativo",
    },
    {
      numero: 3,
      tipo: "reencuadre",
      titulo: "2. El Reencuadre Estructural",
      cuerpo: reencuadre,
      pie: "Causa Raíz Sistémica",
    },
    {
      numero: 4,
      tipo: "metodo",
      titulo: "3. La Arquitectura de Procesos",
      cuerpo:
        "Implementar acuerdos de servicio internos (SLA), visibilidad de métricas duras y protocolos de escalamiento sin depender de la memoria de las personas.",
      pie: "Método de Mejora Continua",
    },
    {
      numero: 5,
      tipo: "cta",
      titulo: "4. Diagnóstico de Eficiencia",
      cuerpo: `Evaluá la madurez de tus procesos y detectá cuellos de botella en ${direccion}`,
      pie: "mejoraok.com • Criterio Directivo",
      kicker: "ACCIÓN INMEDIATA",
    },
  ];

  const textoEstructuraCarrusel = [
    `# CARRUSEL PDF B2B (1080x1350 - 5 LÁMINAS)`,
    `Título: ${input.titulo_portada}`,
    `Eje: Dimensión ${dimension.toUpperCase()}`,
    ``,
    ...laminasCarrusel.map(
      (l) =>
        `--- LÁMINA ${l.numero} (${l.tipo.toUpperCase()}) ---\n` +
        (l.kicker ? `Kicker: ${l.kicker}\n` : "") +
        `Título: ${l.titulo}\n` +
        `Cuerpo: ${l.cuerpo}\n` +
        `Pie: ${l.pie}\n`
    ),
  ].join("\n");

  const asset1_carrusel: CarruselEnriquecidoTransmutado = {
    laminas: laminasCarrusel,
    specsTecnicas: {
      dimensiones: "1080 x 1350 px",
      relacionAspecto: "4:5 (Vertical LinkedIn / Instagram)",
      estiloPie: "Tricolor Swiss (#1A3D84 / #E1061E / #F7CC13)",
    },
    textoEstructuraMarkdown: textoEstructuraCarrusel,
  };

  // 2. ACTIVO B: GUION DE REEL DE 60S CON TELEPROMPTER
  const rawGuionReel = generarGuionReel({
    propuesta_id: input.propuesta_id,
    titulo_portada: input.titulo_portada,
    cuerpo_texto: input.cuerpo_texto,
    copy_tres_pasos: {
      paso1_dolor: dolor,
      paso2_reencuadre: reencuadre,
      paso3_direccion_web: direccion,
    },
    buyer_persona: input.buyer_persona,
    dimension_servicio: dimension,
  });

  // 3. ACTIVO C: HILO DIRECTIVO C-LEVEL PARA LINKEDIN
  const hiloLinkedIn = generarHiloLinkedIn({
    propuesta_id: input.propuesta_id,
    tema: dimension || "Gestión de Procesos B2B",
    titulo_portada: input.titulo_portada,
    cuerpo_texto: input.cuerpo_texto,
    copy_tres_pasos: {
      paso1_dolor: dolor,
      paso2_reencuadre: reencuadre,
      paso3_direccion_web: direccion,
    },
    arquetipo_target: input.buyer_persona,
  });

  // 4. ACTIVO D: PLACA DE CITA / AFORISMO (1080x1080)
  let aforismo = reencuadre;
  if (aforismo.length > 120) {
    const primeraOracion = aforismo.split(/[.?!]/)[0];
    aforismo = primeraOracion ? `${primeraOracion.trim()}.` : aforismo.slice(0, 110) + "...";
  }

  const copyPostSoporte =
    `Cuando un proceso depende exclusivamente de urgencias o memoria, el cuello de botella siempre termina en el dueño.\n\n` +
    `La solución nunca es exigirle más horas al equipo: es rediseñar los acuerdos internos y la visibilidad de los datos.\n\n` +
    `¿En tu empresa delegás con criterios o apagás incendios diarios? Leemos reflexiones en comentarios.`;

  const placaCita: PlacaCitaTransmutada = {
    aforismo,
    subtexto: "La causa nunca es la voluntad del equipo; siempre es la falta de un proceso claro.",
    autor: "Mejora Continua",
    cargo: "Consultoría de Dirección de Empresas & Procesos",
    ratioSugerido: "1:1",
    textoParaCopiar: `"${aforismo}"\n\n— Mejora Continua (mejoraok.com)\nArquitectura de Procesos & Profesionalización PyME.`,
    textoCita: aforismo,
    autorInstitucional: "Mejora Continua",
    subtituloAforismo: `Criterio de Gestión • Dimensión ${dimension.toUpperCase()}`,
    copyPostSoporte,
    specsDiseno: {
      fuente: "Bw Modelica Extra Bold (Titular)",
      fondo: "#FFFFFF puro",
      espacioNegativoMinimo: "80%",
      colorAcento: "#1A3D84 (Primario) / #E1061E (Acento)",
    },
  };

  // 5. ACTIVO E: MENSAJE DE DIFUSIÓN DE WHATSAPP
  const linkWeb = direccion.includes("http") ? direccion : `https://${direccion}`;
  const textoWhatsApp =
    `*${input.titulo_portada.toUpperCase()}*\n\n` +
    `💡 *El síntoma operativo:* ${dolor}\n\n` +
    `🔍 *El reencuadre:* ${reencuadre}\n\n` +
    `📌 *Criterio de acción:* Cuando un proceso depende exclusivamente de urgencias o memoria, el cuello de botella siempre termina en el dueño.\n\n` +
    `👉 Hacé el diagnóstico de 4 dimensiones de tu empresa aquí:\n${linkWeb}`;

  const mensajeWhatsApp: MensajeWhatsAppTransmutado = {
    titular: input.titulo_portada,
    cuerpo: `${dolor}\n\n${reencuadre}`,
    cta: `Diagnóstico: ${linkWeb}`,
    textoFormateado: textoWhatsApp,
    longitudCaracteres: textoWhatsApp.length,
    textoMensaje: textoWhatsApp,
    linkLlamadaAccion: linkWeb,
  };

  // PAQUETE COMPLETO EN MARKDOWN
  const paqueteCompletoMarkdown = [
    `# PAQUETE DE TRANSMUTACIÓN MULTICANAL B2B (THE CONTENT PYRAMID)`,
    `Propuesta ID: ${input.propuesta_id}`,
    `Fecha: ${new Date().toISOString().split("T")[0]}`,
    `Multiplicador de Alcance: 3.8x | Horas Ahorradas Estimadas: 4.5h`,
    ``,
    `============================================================`,
    `ACTIVO 1: CARRUSEL PDF B2B (1080x1350 - 5 LÁMINAS)`,
    `============================================================`,
    textoEstructuraCarrusel,
    ``,
    `============================================================`,
    `ACTIVO 2: GUION DE REEL 60S (TELEPROMPTER)`,
    `============================================================`,
    rawGuionReel.textoCompletoTeleprompter,
    ``,
    `============================================================`,
    `ACTIVO 3: HILO DIRECTIVO C-LEVEL LINKEDIN (ZERO-PENALTY)`,
    `============================================================`,
    hiloLinkedIn.textoExportableMarkdown,
    ``,
    `============================================================`,
    `ACTIVO 4: PLACA DE CITA / AFORISMO (1080x1080)`,
    `============================================================`,
    `Cita: "${aforismo}"`,
    `Autor: Mejora Continua`,
    `Copy:\n${copyPostSoporte}`,
    ``,
    `============================================================`,
    `ACTIVO 5: MENSAJE DE DIFUSIÓN WHATSAPP B2B`,
    `============================================================`,
    textoWhatsApp,
  ].join("\n");

  return {
    propuesta_id: input.propuesta_id,
    tituloOriginal: input.titulo_portada,
    multiplicadorAlcanceEstimado: 3.8,
    horasAhorradasEstimadas: 4.5,
    carruselPdf,
    guionReel: rawGuionReel,
    hiloLinkedIn,
    placaCita,
    mensajeWhatsApp,
    resumenEjecutivo: `1 idea transmutada en 5 activos omnicanal: Carrusel PDF (LinkedIn/IG), Guion Reel 60s (Teleprompter), Hilo C-Level (LinkedIn Zero-Penalty), Placa de Citas (Stories) y Mensaje WhatsApp.`,
    metricasConsolidadas: {
      alcanceMultiplicador: 3.8,
      tiempoAhorradoHoras: 4.5,
      piezasTotalesGeneradas: 5,
      canalesCubiertos: [
        "LinkedIn Document (PDF)",
        "Instagram / TikTok Reel",
        "LinkedIn Feed (Hilo)",
        "Instagram Feed / Stories (Placa)",
        "WhatsApp Directivo (VIP)",
      ],
    },
    asset1_carrusel,
    asset2_guionReel: rawGuionReel,
    asset3_hiloLinkedIn: hiloLinkedIn,
    asset4_placaCita: placaCita,
    asset5_whatsappB2B: mensajeWhatsApp,
    paqueteCompletoMarkdown,
  };
}
