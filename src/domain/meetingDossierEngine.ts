/**
 * meetingDossierEngine.ts — Motor de Dossiers de Preparación para Reuniones 1 a 1
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - Andy Grove (High Output Management): El principio del alto apalancamiento gerencial
 *   en reuniones 1 a 1 (1:1s de alto impacto).
 * - Matthew Dixon & Brent Adamson (The Challenger Sale): Guiones de apertura, reencuadre
 *   de sesgos del decisor y preguntas de diagnóstico constructivo.
 * - David Maister (The Trusted Advisor): Credibilidad, empatía sin juicio y orientación
 *   exclusiva hacia la salud del sistema del cliente.
 * - Principios Institucionales de Mejora Continua: Calidez con Verdad, 4 Dimensiones.
 */

import { ArquetipoDolor } from "./executiveDiagnosticEngine";

export interface InputMeetingDossier {
  nombreDirectivo: string;
  empresa?: string;
  cargo?: string;
  canal?: string;
  arquetipoDolor?: ArquetipoDolor;
  scoreLead?: number;
  historialMensajes?: string;
  fechaReunion?: string;
}

export interface PreguntaTrinchera4D {
  dimension: "Personal" | "Organizacional" | "Comercial" | "Empresarial";
  pregunta: string;
  objetivoDiagnostico: string;
  queEscuchar: string;
}

export interface ObjecionAnticipada {
  objecionTipica: string;
  miedoSubyacente: string;
  reencuadreConsultivo: string;
}

export interface MeetingDossier {
  idDossier: string;
  fechaGeneracion: string;
  directivo: string;
  empresa: string;
  cargo: string;
  canal: string;
  arquetipo: ArquetipoDolor;
  arquetipoLabel: string;
  scoreLead: number;
  perfilPsicologicoDirectivo: {
    estiloLiderazgo: string;
    cargaMentalEstimada: string;
    focoPrincipal: string;
  };
  guionAperturaChallenger90s: string;
  hipotesisFriccionesOcultas: string[];
  preguntasTrinchera4D: PreguntaTrinchera4D[];
  objecionesAnticipadas: ObjecionAnticipada[];
  propuestaServicioRecomendada: {
    nombreServicio: string;
    duracionEstimada: string;
    focoIntervencion: string;
    cierreSugerido: string;
  };
  checklistPreVuelo10Min: string[];
  guionResumenCopiable: string;
}

const PERFILES_POR_ARQUETIPO: Record<
  ArquetipoDolor,
  {
    label: string;
    estiloLiderazgo: string;
    cargaMental: string;
    foco: string;
    friccionesOcultas: string[];
    preguntas: PreguntaTrinchera4D[];
    objeciones: ObjecionAnticipada[];
    servicio: {
      nombre: string;
      duracion: string;
      foco: string;
      cierre: string;
    };
    guionApertura: (directivo: string, empresa: string) => string;
  }
> = {
  fundador_saturado: {
    label: "Dueño / Fundador Atrapado en la Operación Diaria",
    estiloLiderazgo: "Omnipresente, heroico y altamente reactivo. Gran compromiso pero agotado por la microgestión.",
    cargaMental: "Crítica. Siente que si no está encima de cada detalle, las cosas no salen o se cometen errores costosos.",
    foco: "Desahogo de agenda personal, estructuración de mandos medios y delegación con tranquilidad.",
    friccionesOcultas: [
      "No tiene tiempo para pensar en la estrategia del próximo año porque atiende urgencias operativas de hace 2 horas.",
      "Tiene colaboradores valiosos pero sin facultades reales de decisión, lo que genera una parálisis aprendida en el equipo.",
      "El estrés laboral está erosionando su calidad de vida familiar y teme que la empresa no pueda funcionar sin su presencia física.",
    ],
    preguntas: [
      {
        dimension: "Personal",
        pregunta: "¿Cuántas horas reales por semana estás dedicando a apagar incendios que sentís que otro debería resolver?",
        objetivoDiagnostico: "Cuantificar el costo personal y la pérdida de tiempo reflexivo del fundador.",
        queEscuchar: "Sensación de culpa por no llegar, cansancio físico y frustración por falta de autonomía de otros.",
      },
      {
        dimension: "Organizacional",
        pregunta: "Si mañana te tomás 15 días sin celular en una isla sin señal, ¿qué es lo primero que se traba en la empresa?",
        objetivoDiagnostico: "Identificar los cuellos de botella exactos dependientes de la memoria del dueño.",
        queEscuchar: "Mención de compras, pagos, cotizaciones especiales o reclamos difíciles de clientes.",
      },
      {
        dimension: "Comercial",
        pregunta: "¿Qué porcentaje de las ventas o cuentas clave dependen exclusivamente de que vos estés en la reunión de cierre?",
        objetivoDiagnostico: "Evaluar la transferibilidad del proceso de ingresos de la empresa.",
        queEscuchar: "Si el dueño es el único cerrador o si los vendedores solo pasan presupuestos.",
      },
      {
        dimension: "Empresarial",
        pregunta: "¿Tenés un tablero con 3 números que mirás todos los lunes o gestionás según el saldo del banco al fin del día?",
        objetivoDiagnostico: "Determinar el nivel de gobierno corporativo y anticipación financiera.",
        queEscuchar: "Gestión por saldo bancario versus métricas de proceso y margen operativo.",
      },
    ],
    objeciones: [
      {
        objecionTipica: "No tengo tiempo ahora para implementar procesos, estamos tapados de trabajo.",
        miedoSubyacente: "Miedo a que la consultoría sea una carga teórica pesada que le robe más horas a su día ya colapsado.",
        reencuadreConsultivo:
          "Justamente porque no tenés tiempo es que tenés que ordenar los procesos. No vamos a pedirte 10 horas extras: vamos a rediseñar cómo se gestiona lo que ya hacés hoy para recuperar 10 horas semanales desde el primer mes.",
      },
      {
        objecionTipica: "Mi rubro es muy dinámico y no se puede estandarizar.",
        miedoSubyacente: "Miedo a la rigidez burocrática y a perder agilidad frente a clientes exigentes.",
        reencuadreConsultivo:
          "Estandarizar no es llenar la empresa de manuales que nadie lee; es acordar cómo se toman las decisiones repetitivas para que tu energía quede libre para lo verdaderamente imprevisto.",
      },
      {
        objecionTipica: "Ya intenté delegar y me fue mal, tuve que volver a meterme yo.",
        miedoSubyacente: "Sensación de desengaño y temor a que el equipo falle frente a un cliente clave.",
        reencuadreConsultivo:
          "Delegar sin acuerdos explícitos de control y límites de decisión no es delegar, es tirar la pelota. Diseñamos el puente paso a paso con puntos de control sin que pierdas el timón.",
      },
    ],
    servicio: {
      nombre: "Programa de Profesionalización y Desahogo Directivo (4 Dimensiones)",
      duracion: "3 a 6 meses de acompañamiento en trinchera",
      foco: "Estructuración de procesos troncales, formación de mandos medios y liberación de 15h semanales del dueño.",
      cierre: "Proponer un autodiagnóstico de profundidad de 1 jornada para mapear la arquitectura antes de presupuestar.",
    },
    guionApertura: (dir, emp) =>
      `"Hola ${dir}, un gusto conversar. Sé que tu tiempo vale oro y que dirigir ${emp} demanda una energía enorme. Quiero ser muy claro con el propósito de estos 45 minutos: mi rol hoy no es venderte un curso ni darte consejos teóricos desde un escritorio. Vengo a escuchar la realidad de tu trinchera operativa, entender dónde están los cuellos de botella que hoy te roban horas de vida y ver si nuestro método de 4 dimensiones tiene sentido para la etapa actual de tu empresa. Si vemos que podemos ayudarte, te lo digo con números; y si vemos que necesitás otra cosa, te lo digo con la misma honestidad. ¿Te parece bien este encuadre?"`,
  },

  segunda_generacion: {
    label: "Segunda Generación & Mandos Medios en Transición",
    estiloLiderazgo: "Técnico, modernizador, consciente de la necesidad de sistemas pero atrapado entre dos visiones.",
    cargaMental: "Emocional y política. Tensión entre honrar lo construido por los fundadores y la urgencia de profesionalizar.",
    foco: "Legitimación del liderazgo, acuerdos intergeneracionales y despersonalización de las decisiones.",
    friccionesOcultas: [
      "Las decisiones estratégicas se rediscuten en la cena familiar o en pasillos sin reglas claras de gobierno.",
      "Los colaboradores de mayor antigüedad eluden a los mandos jóvenes y van directo al fundador para destrabar excepciones.",
      "Falta de datos objetivos para justificar cambios tecnológicos o de procesos frente al directorio.",
    ],
    preguntas: [
      {
        dimension: "Personal",
        pregunta: "¿Sentís que tu energía se va más en negociar internamente con la familia/socios que en hacer crecer el negocio?",
        objetivoDiagnostico: "Evaluar el desgaste de rol y la necesidad de un tercero neutral de autoridad.",
        queEscuchar: "Dificultad para separar los roles afectivos de los roles de gobierno de la empresa.",
      },
      {
        dimension: "Organizacional",
        pregunta: "¿Qué pasa cuando vos definís un procedimiento y un colaborador histórico va a quejarse con el fundador?",
        objetivoDiagnostico: "Mapear la fisura de autoridad y la falta de protocolos de mando unificado.",
        queEscuchar: "Doble comando, desautorización involuntaria y frustración de mandos medios.",
      },
      {
        dimension: "Comercial",
        pregunta: "¿Los clientes eligen a la empresa por la marca y el servicio o siguen pidiendo hablar con 'el dueño original'?",
        objetivoDiagnostico: "Determinar el grado de institucionalización de la relación con clientes.",
        queEscuchar: "Dependencia de vínculos personales del fundador versus confianza en la estructura de la empresa.",
      },
      {
        dimension: "Empresarial",
        pregunta: "¿Tienen un comité de dirección formal con orden del día o los temas se hablan según la urgencia del día?",
        objetivoDiagnostico: "Revisar la madurez de los órganos de gobierno corporativo.",
        queEscuchar: "Ausencia de actas, reuniones caóticas y falta de seguimiento de acuerdos.",
      },
    ],
    objeciones: [
      {
        objecionTipica: "Los fundadores nunca van a aceptar que venga alguien de afuera a decirles cómo hacer las cosas.",
        miedoSubyacente: "Miedo a generar un conflicto familiar que dañe la armonía personal o sea vivido como deslealtad.",
        reencuadreConsultivo:
          "Nosotros no venimos a decirles qué hacer ni a cuestionar su mérito: los fundadores levantaron la empresa con su intuición y esfuerzo. Venimos a cuidar su legado para que lo que construyeron no se pierda y sea sustentable en el tiempo.",
      },
      {
        objecionTipica: "La gente histórica no se va a adaptar a sistemas nuevos.",
        miedoSubyacente: "Temor a la resistencia al cambio del personal con más antigüedad.",
        reencuadreConsultivo:
          "El personal histórico se resiste cuando siente que un sistema viene a vigilarlos. Cuando los involucrás en el rediseño para sacarles trabas a su propio día a día, son los primeros en agradecer el orden.",
      },
      {
        objecionTipica: "Ya probamos con un consultor y nos dejó un informe teórico que quedó en un cajón.",
        miedoSubyacente: "Escepticismo hacia consultores tradicionales que no entienden la trinchera de una pyme.",
        reencuadreConsultivo:
          "Eso pasa porque la consultoría académica trabaja sobre manuales de pizarrón. Nosotros trabajamos sobre acuerdos operativos reales en el piso de la empresa, midiendo resultados cada 15 días.",
      },
    ],
    servicio: {
      nombre: "Programa de Transición y Gobierno para Empresas de Segunda Generación",
      duracion: "4 a 8 meses",
      foco: "Mesa directiva, código de convivencia operativa, despersonalización de procesos y liderazgo legítimo.",
      cierre: "Ofrecer una primera reunión facilitada de alineación de expectativas con los socios fundadores.",
    },
    guionApertura: (dir, emp) =>
      `"Hola ${dir}, muchas gracias por este espacio. Sé muy bien el desafío que implica estar al frente de una empresa como ${emp}, donde hay una historia fuerte construida y al mismo tiempo la necesidad imperiosa de llevar la operación al siguiente nivel de profesionalización. Mi objetivo hoy no es traer recetas mágicas ni crear fricciones con la historia de la empresa, sino entender dónde están hoy los desacoples operativos y de roles para ver si nuestro marco de trabajo puede aportarles claridad y paz operativa. Vamos directo a los puntos neurálgicos, ¿te parece?"`,
  },

  estancamiento_comercial: {
    label: "Empresa con Buen Producto pero Proceso Comercial Intuitivo",
    estiloLiderazgo: "Orientado al producto o al servicio técnico. Orgulloso de la calidad pero frustrado con las ventas.",
    cargaMental: "Incertidumbre financiera recurrente. Sensación de que el mercado no valora adecuadamente su propuesta.",
    foco: "Previsibilidad de ingresos, embudo B2B con etapas claras y cierre de ventas sin rebajas de precio.",
    friccionesOcultas: [
      "Cotizan a cualquiera que pida precio sin calificar si tiene presupuesto o urgencia real de compra.",
      "El equipo comercial o técnico gasta semanas armando propuestas personalizadas que terminan en la nada.",
      "Venden por precio o descuentos en lugar de posicionarse como autoridad y socios estratégicos.",
    ],
    preguntas: [
      {
        dimension: "Personal",
        pregunta: "¿Cuánto te desgasta emocionalmente tener meses con facturación récord y al mes siguiente sufrir para pagar los sueldos?",
        objetivoDiagnostico: "Visibilizar el dolor de los ingresos en serrucho y la falta de flujo predecible.",
        queEscuchar: "Angustia a fin de mes, estrés financiero y sensación de empezar de cero todos los días.",
      },
      {
        dimension: "Organizacional",
        pregunta: "Cuando un prospecto pide una cotización, ¿cuánto tiempo exacto tarda la empresa en responder?",
        objetivoDiagnostico: "Medir el SLA comercial y la eficiencia interna de presupuestación.",
        queEscuchar: "Demoras de 3 a 7 días en cotizar, falta de plantillas y cuellos de botella técnicos.",
      },
      {
        dimension: "Comercial",
        pregunta: "¿Tienen definido con precisión quién NO es cliente de ustedes o le cotizan a todo el que pregunta?",
        objetivoDiagnostico: "Evaluar el criterio de calificación y el filtro de clientes de alto valor.",
        queEscuchar: "Cotizar a cualquiera, miedo a decir que no a proyectos no rentables.",
      },
      {
        dimension: "Empresarial",
        pregunta: "¿Qué porcentaje de tus clientes te compran de forma recurrente versus ventas puntuales aisladas?",
        objetivoDiagnostico: "Analizar el modelo de ingresos recurrentes y el valor de vida del cliente (LTV).",
        queEscuchar: "Ventas de una sola vez versus contratos de servicio o recurrencia estructurada.",
      },
    ],
    objeciones: [
      {
        objecionTipica: "En este país nadie planifica, las ventas siempre van a ser inestables.",
        miedoSubyacente: "Desesperanza aprendida y justificación del caos comercial por el contexto macroeconómico.",
        reencuadreConsultivo:
          "El contexto macroeconómico es el mismo para todos, pero las empresas que tienen un proceso estructurado de prospección y SLAs estrictos cierran 3 veces más que las que esperan sentadas a que suene el teléfono.",
      },
      {
        objecionTipica: "Si no bajamos los precios, la competencia se queda con el cliente.",
        miedoSubyacente: "Miedo a perder volumen de ventas y falta de diferenciación en la propuesta de valor.",
        reencuadreConsultivo:
          "Bajar el precio cuando tenés buen producto no atrae mejores clientes: atrae a los más quejosos y destruye tu margen operativo. Se vende por claridad en el diagnóstico, no por descuento.",
      },
      {
        objecionTipica: "Los vendedores no tienen ganas de vender.",
        miedoSubyacente: "Frustración con el equipo y atribución del problema a la actitud individual.",
        reencuadreConsultivo:
          "Si le das a un vendedor un proceso sin calificación y sin herramientas, es como mandarlo a la guerra con un tenedor. Cuando el sistema califica antes, el vendedor cierra con confianza.",
      },
    ],
    servicio: {
      nombre: "Programa de Arquitectura Comercial B2B y Generación Predecible",
      duracion: "3 a 6 meses",
      foco: "Matriz de Lead Scoring, proceso de ventas en 4 etapas, SLAs de contacto <2h y propuesta de valor de autoridad.",
      cierre: "Proponer una auditoría de la tasa de conversión histórica del embudo comercial.",
    },
    guionApertura: (dir, emp) =>
      `"Hola ${dir}, gracias por este tiempo. Sé que en ${emp} tienen un producto y un nivel técnico de primer nivel, pero muchas veces la traba no está en la capacidad de entrega sino en la imprevisibilidad del flujo comercial. En estos 45 minutos no vengo a hablarte de fórmulas mágicas de marketing ni de recetas vacías, sino de ingeniería de procesos comerciales: cómo calificar antes, cómo reducir el tiempo de cotización y cómo lograr que la venta sea un sistema y no una lotería. ¿Arrancamos por ahí?"`,
  },

  calidad_entregas: {
    label: "Desorden Operativo, Demoras y Retrabajos Frecuentes",
    estiloLiderazgo: "Operativo, enfocado en solucionar problemas pero atrapado en la corrección continua en lugar de la prevención.",
    cargaMental: "Tensión constante con clientes insatisfechos. Miedo a que un reclamo grave destruya una cuenta corporativa.",
    foco: "Estandarización de trinchera, reducción de errores y cumplimiento estricto de plazos de entrega.",
    friccionesOcultas: [
      "Las instrucciones a los operarios se dan de forma verbal o por audios de WhatsApp sin respaldo formal.",
      "No existen puntos de control intermedios: los errores se descubren cuando el trabajo ya está terminado o entregado.",
      "Se gastan miles de dólares en horas extras y compras de emergencia para compensar la falta de planificación.",
    ],
    preguntas: [
      {
        dimension: "Personal",
        pregunta: "¿Cuánto tiempo pasás al día atendiendo reclamos o dando explicaciones por cosas que salieron mal?",
        objetivoDiagnostico: "Medir el desgaste emocional del directivo por fallas operativas evitables.",
        queEscuchar: "Vergüenza ante clientes, bronca con el equipo y agotamiento por apagar fuegos.",
      },
      {
        dimension: "Organizacional",
        pregunta: "¿Tienen un estándar escrito de cómo se hace cada tarea o cada uno hace su propia versión del trabajo?",
        objetivoDiagnostico: "Identificar la dispersión metodológica y la falta de criterios homogéneos.",
        queEscuchar: "Variabilidad de calidad según quién esté de turno o quién haga el trabajo.",
      },
      {
        dimension: "Comercial",
        pregunta: "¿Qué porcentaje de las órdenes se entregan exactamente en la fecha y hora que se prometió al cliente?",
        objetivoDiagnostico: "Determinar el índice OTIF (On-Time In-Full) real de la empresa.",
        queEscuchar: "Demoras crónicas, pedidos de disculpas frecuentes y clientes molestos.",
      },
      {
        dimension: "Empresarial",
        pregunta: "¿Cuánto dinero estimás que pierde la empresa por mes en materiales tirados, fletes de urgencia y retrabajos?",
        objetivoDiagnostico: "Monetizar el costo oculto de la no-calidad en la cuenta de resultados.",
        queEscuchar: "Desconocimiento del número exacto pero certeza de que se pierde una fortuna.",
      },
    ],
    objeciones: [
      {
        objecionTipica: "A los operarios no les interesa hacer las cosas bien, no hay compromiso.",
        miedoSubyacente: "Resignación ante la falta de cultura de calidad y desconfianza en el factor humano.",
        reencuadreConsultivo:
          "Nadie va a trabajar pensando 'hoy me voy a equivocar a propósito'. Los errores casi siempre ocurren porque las instrucciones son ambiguas o las herramientas no son las correctas. Cuando el proceso es claro, el 90% de los errores desaparece.",
      },
      {
        objecionTipica: "Si ponemos controles intermedios vamos a ir más despacio.",
        miedoSubyacente: "Temor a que la verificación demore la entrega y baje la productividad.",
        reencuadreConsultivo:
          "Ir rápido para equivocarse y tener que rehacer todo desde cero es la forma más cara y lenta de trabajar. Un control de 2 minutos ahorra 8 horas de retrabajo.",
      },
      {
        objecionTipica: "Hacer procedimientos lleva meses y nadie los lee.",
        miedoSubyacente: "Experiencia negativa con normas ISO pesadas y burocráticas.",
        reencuadreConsultivo:
          "Nosotros no hacemos manuales de 100 páginas. Hacemos listas de verificación visuales de 1 página que se pegan en el puesto de trabajo y se chequean en 30 segundos.",
      },
    ],
    servicio: {
      nombre: "Programa de Estandarización Operativa y Cero Retrabajos (Kaizen B2B)",
      duracion: "3 a 6 meses",
      foco: "Mapeo de flujo de valor, estándares visuales de trinchera, autocontrol y reuniones de stand-up diarias.",
      cierre: "Plantear una caminata de trinchera (Gemba Walk) para identificar los 3 focos de desperdicio más costosos.",
    },
    guionApertura: (dir, emp) =>
      `"Hola ${dir}, gracias por este encuentro. Sé que en ${emp} hay un esfuerzo enorme puesto en la producción y en sacar el trabajo adelante todos los días, pero también veo que cuando la operación se acelera, aparecen fricciones de calidad, demoras y retrabajos que terminan golpeando la rentabilidad y quemando la cabeza de todos. Hoy vengo a hablar de procesos y de acuerdos de piso: no a buscar culpables, sino a entender dónde el sistema está fallando para que podamos blindar la entrega sin necesidad de vivir a las corridas. ¿Te parece bien?"`,
  },
};

/**
 * Normaliza cualquier entrada de texto o arquetipo hacia uno de los 4 arquetipos soportados.
 */
export function normalizarArquetipo(arquetipo?: string): ArquetipoDolor {
  if (!arquetipo) return "fundador_saturado";
  if (arquetipo in PERFILES_POR_ARQUETIPO) {
    return arquetipo as ArquetipoDolor;
  }
  const low = arquetipo.toLowerCase();
  if (low.includes("comercial") || low.includes("ventas") || low.includes("estancamiento")) {
    return "estancamiento_comercial";
  }
  if (low.includes("calidad") || low.includes("entrega") || low.includes("proceso")) {
    return "calidad_entregas";
  }
  if (
    low.includes("segunda") ||
    low.includes("familia") ||
    low.includes("socio") ||
    low.includes("generacion") ||
    low.includes("generación")
  ) {
    return "segunda_generacion";
  }
  return "fundador_saturado";
}

/**
 * Genera el Dossier Confidencial de Preparación para la Reunión 1 a 1
 */
export function generarMeetingDossier(input: InputMeetingDossier): MeetingDossier {
  const directivo = input.nombreDirectivo?.trim() || "Colega Directivo";
  const empresa = input.empresa?.trim() || "Empresa PyME";
  const cargo = input.cargo?.trim() || "Director General / Socio Gerente";
  const canal = input.canal || "Instagram";
  const scoreLead = Math.min(100, Math.max(30, input.scoreLead ?? 85));
  const arquetipo = normalizarArquetipo(input.arquetipoDolor);

  const datos = PERFILES_POR_ARQUETIPO[arquetipo] || PERFILES_POR_ARQUETIPO["fundador_saturado"];
  const idDossier = `DOSSIER-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  const fechaGeneracion = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const checklist = [
    `Revisar los últimos mensajes y comentarios del directivo (${directivo}) en ${canal}.`,
    `Tener a mano el Diagnóstico Ejecutivo A4 (${datos.label}) pre-generado.`,
    `Verificar conexión de cámara HD, audio limpio y fondo institucional neutro.`,
    `Interiorizar el Guión de Apertura de 90 segundos: no interrumpir al prospecto durante sus primeros 10 minutos de desahogo.`,
    `Anotar las 4 Preguntas de Trinchera en una libreta física para no perder contacto visual en pantalla.`,
    `Recordar el principio de Calidez con Verdad: nunca culpar a la persona, poner el foco 100% en el sistema de acuerdos.`,
  ];

  const guionApertura = datos.guionApertura(directivo, empresa);

  const resumenTexto = `*DOSSIER CONFIDENCIAL PRE-REUNIÓN 1 A 1 — MEJORA CONTINUA*
_Uso Interno Exclusivo Pablo Eckert · Ref: ${idDossier}_

*DIRECTIVO:* ${directivo} (${cargo}) · *EMPRESA:* ${empresa}
*CANAL:* ${canal} · *SCORE LEAD:* ${scoreLead}/100 · *ARQUETIPO:* ${datos.label}

*1. PERFIL PSICOLÓGICO Y FOCO:*
• Estilo: ${datos.estiloLiderazgo}
• Carga Mental: ${datos.cargaMental}
• Foco Clave: ${datos.foco}

*2. GUIÓN DE APERTURA (PRIMEROS 90 SEGUNDOS):*
${guionApertura}

*3. PREGUNTAS CLAVE DE TRINCHERA (4 DIMENSIONES):*
${datos.preguntas.map((p) => `• *[${p.dimension}]:* "${p.pregunta}"\n  _Escuchar:_ ${p.queEscuchar}`).join("\n")}

*4. OBJECIONES ESPERADAS Y REENCUADRES:*
${datos.objeciones.map((o) => `• *Objeción:* "${o.objecionTipica}"\n  _Reencuadre:_ ${o.reencuadreConsultivo}`).join("\n")}

*5. SERVICIO RECOMENDADO:*
• ${datos.servicio.nombre} (${datos.servicio.duracion})
• Cierre Sugerido: ${datos.servicio.cierre}
`;

  return {
    idDossier,
    fechaGeneracion,
    directivo,
    empresa,
    cargo,
    canal,
    arquetipo,
    arquetipoLabel: datos.label,
    scoreLead,
    perfilPsicologicoDirectivo: {
      estiloLiderazgo: datos.estiloLiderazgo,
      cargaMentalEstimada: datos.cargaMental,
      focoPrincipal: datos.foco,
    },
    guionAperturaChallenger90s: guionApertura,
    hipotesisFriccionesOcultas: datos.friccionesOcultas,
    preguntasTrinchera4D: datos.preguntas,
    objecionesAnticipadas: datos.objeciones,
    propuestaServicioRecomendada: {
      nombreServicio: datos.servicio.nombre,
      duracionEstimada: datos.servicio.duracion,
      focoIntervencion: datos.servicio.foco,
      cierreSugerido: datos.servicio.cierre,
    },
    checklistPreVuelo10Min: checklist,
    guionResumenCopiable: resumenTexto,
  };
}
