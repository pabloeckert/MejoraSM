/**
 * customerSuccessEngine.ts
 *
 * Motor de Generación y Estructuración de Casos de Éxito B2B (Social Proof & StoryBrand).
 *
 * Fundamentos Teóricos y de Metodología:
 * 1. Donald Miller ("Building a StoryBrand"):
 *    - El Cliente es el Héroe, NO la marca.
 *    - Mejora Continua es el Guía (Empatía + Autoridad).
 *    - Estructura de 7 Partes: Personaje (Dueño/Director) tiene un Problema (Externo, Interno,
 *      Filosófico) -> Conoce a un Guía -> Quien le entrega un Plan (Metodología 4D) ->
 *      Llamado a la Acción -> Éxito Transformador y Prevención del Fracaso.
 * 2. Robert Cialdini ("Influence: The Psychology of Persuasion - Social Proof"):
 *    - Prueba Social de Pares (Peer-to-Peer B2B Proof): Directivos se convencen viendo a
 *      empresas de su mismo tamaño, complejidad y sector que ya resolvieron el problema.
 *    - Especificidad métrica: Datos cuantitativos verificables ("De 14h diarias a 3 reuniones",
 *      "-42% reclamos", "+28% rentabilidad") multiplican la credibilidad.
 * 3. David Maister ("The Trusted Advisor"):
 *    - Discreción, confidencialidad y rigor: Respeto absoluto a la privacidad empresarial, con
 *      toggle de anonimización institucional (ej. "Distribuidora Mayorista Centro").
 * 4. Principios Institucionales de Mejora Continua:
 *    - "Calidez con Verdad" y "Nunca a la persona": Se audita el sistema, el flujo y los procesos;
 *      jamás la capacidad del líder fundador.
 */

export type ArquetipoCaso =
  | "fundador_saturado"
  | "segunda_generacion"
  | "ventas_intuitivas"
  | "calidad_retrabajos";

export interface MetricaImpacto {
  metrica: string;
  antes: string;
  despues: string;
  cambio: string;
  destaque: boolean;
}

export interface Plan4DCase {
  personal: string;
  organizacional: string;
  comercial: string;
  empresarial: string;
}

export interface SlideCarrusel {
  slide: number;
  titulo: string;
  contenido: string;
  notaVisual: string;
}

export interface CustomerCase {
  id: string;
  titulo: string;
  arquetipo: ArquetipoCaso;
  empresa: string;
  empresaNombreReal: string;
  rubro: string;
  tamano: string;
  ubicacion: string;
  rolProtagonista: string;
  anonimizado: boolean;
  
  // Marco StoryBrand (Donald Miller)
  problemaStoryBrand: {
    externo: string;      // Síntoma operativo visible
    interno: string;      // Sobrecarga emocional / angustia del líder
    filosofico: string;   // "Hacer crecer una empresa no debería costarte la salud o la familia"
  };
  
  // El Guía y el Plan (Mejora Continua & Metodología 4D)
  guiaYPlan: {
    rolGuia: string;
    diagnosticoRaiz: string;
    plan4D: Plan4DCase;
    duracionSemanas: number;
  };

  // Resultados Cuantitativos (Cialdini - Social Proof)
  metricasImpacto: MetricaImpacto[];

  // Transformación Cualitativa (Antes vs Después)
  transformacion: {
    estadoAnterior: string;
    estadoActual: string;
    citaHeroe: string;
  };

  // Lecciones de Trinchera para Otros Directivos
  leccionesDirectivas: string[];

  // Formatos Listos para Acción Rápida (1 Clic)
  formatos: {
    whatsappSnippet: string;
    carruselLinkedIn: SlideCarrusel[];
    postPlaca: {
      encabezado: string;
      cita: string;
      autor: string;
    };
  };
}

export interface GenerarCasoParams {
  arquetipo?: string;
  empresa?: string;
  rubro?: string;
  tamano?: string;
  rolProtagonista?: string;
  anonimizado?: boolean;
}

export const CASOS_BIBLIOTECA_CALIBRADOS: Record<ArquetipoCaso, CustomerCase> = {
  fundador_saturado: {
    id: "case-fundador-saturado-01",
    titulo: "De apagar incendios 14 horas al día a liderar con tablero semanal",
    arquetipo: "fundador_saturado",
    empresa: "Distribuidora Mayorista de Insumos",
    empresaNombreReal: "Distribuidora Centro SA",
    rubro: "Distribución Mayorista y Logística",
    tamano: "48 colaboradores · 2 centros de distribución",
    ubicacion: "Córdoba, Argentina",
    rolProtagonista: "Fundador y Director General",
    anonimizado: true,
    problemaStoryBrand: {
      externo: "Todas las decisiones operativas, compras y listas de precios pasaban por el escritorio del fundador. Jornadas de 14 horas sin tiempo para pensar en el negocio.",
      interno: "Sensación constante de asfixia y culpa familiar. El temor oculto de que si se tomaba una semana de vacaciones, la empresa se paralizaba.",
      filosofico: "Haber creado una empresa exitosa con empuje no debería convertirse en una condena de trabajo esclavo para su fundador.",
    },
    guiaYPlan: {
      rolGuia: "Mejora Continua intervino como guía estratégico externo, aportando método de gobierno y desculpabilizando al líder: la saturación no es falta de capacidad, es falta de arquitectura de procesos.",
      diagnosticoRaiz: "Ausencia de mandos medios empoderados y falta de reglas de decisión documentadas. La empresa creció en facturación pero mantuvo la estructura de decisión unipersonal.",
      plan4D: {
        personal: "Agenda directiva protegida: bloqueo de 4 horas semanales para pensamiento estratégico y desconexión total los fines de semana.",
        organizacional: "Creación del Comité Operativo Semanal (COS) de 45 minutos y matriz RACI de delegación de compras y logística.",
        comercial: "Criterios claros de precios y descuentos sin necesidad de autorización del dueño para el 90% de las operaciones.",
        empresarial: "Tablero de comando con 5 indicadores clave de flujo de caja, margen bruto y cumplimiento de entregas.",
      },
      duracionSemanas: 12,
    },
    metricasImpacto: [
      { metrica: "Horas operativas del fundador", antes: "14 hs / día", despues: "6 hs / día", cambio: "-57% sobrecarga", destaque: true },
      { metrica: "Consultas diarias al dueño", antes: "45 interrupciones", despues: "4 consultas clave", cambio: "-91% fricción", destaque: true },
      { metrica: "Efectividad de entregas a término", antes: "78%", despues: "94.5%", cambio: "+16.5 pp", destaque: false },
      { metrica: "Margen operativo neto", antes: "11.2%", despues: "14.8%", cambio: "+3.6 pp", destaque: false },
    ],
    transformacion: {
      estadoAnterior: "Directivo sobrepasado, contestando WhatsApps de clientes y choferes a las 23:00 hs sin claridad de rentabilidad real.",
      estadoActual: "Líder enfocado en alianzas comerciales y expansión, con un equipo autónomo que rinde cuentas con datos los lunes.",
      citaHeroe: "Por primera vez en 12 años me fui 10 días de vacaciones con mi familia sin mirar el teléfono cada 10 minutos. La empresa no solo funcionó, sino que entregó mejor.",
    },
    leccionesDirectivas: [
      "Delegar no es tirar la tarea y esperar que salga bien; es diseñar el sistema para que equivocarse sea visible a tiempo.",
      "El cuello de botella de una empresa que no escala casi siempre tiene la misma cara: la del dueño que no suelta el control operativo.",
      "La tranquilidad del fundador no se compra con más esfuerzo personal, se construye con método y reglas escritas.",
    ],
    formatos: {
      whatsappSnippet: `Hola! Te comparto un caso real muy similar a lo que me comentás:
Una distribuidora de 48 colaboradores donde todo pasaba por el dueño (14h diarias de incendios).
En 90 días con el marco 4D:
• Bajó de 45 interrupciones diarias a 4 mediante un Comité Semanal de 45 minutos.
• El dueño recuperó 8 horas diarias de su vida y hoy la empresa opera con tableros.
¿Querés que veamos si en tu estructura aplica el mismo plan de desahogo?`,
      carruselLinkedIn: [
        { slide: 1, titulo: "De trabajar 14 horas al día a tomarse 10 días de vacaciones sin mirar el celular.", contenido: "El caso real de una distribuidora de 48 empleados que ordenó su gobierno en 90 días.", notaVisual: "Titular Swiss en Bw Modelica Bold con badge de caso verificado" },
        { slide: 2, titulo: "El Síntoma Invisible", contenido: "Toda decisión pasaba por el fundador: desde compras mayores hasta qué flete mandar. El éxito en ventas se convirtió en una trampa de saturación operativa.", notaVisual: "Contraste visual de fricción y sobrecarga" },
        { slide: 3, titulo: "El Reencuadre Sistémico (El Guía)", contenido: "El problema no era la falta de compromiso del equipo, sino la ausencia de reglas de juego claras. Implementamos las 4 Dimensiones de Mejora Continua.", notaVisual: "Esquema modular de las 4 Dimensiones" },
        { slide: 4, titulo: "Los Resultados en 90 Días", contenido: "• -57% horas operativas del dueño\n• -91% interrupciones diarias\n• 94.5% entregas a término (vs 78% previo)\n• Comité de 45 min los lunes.", notaVisual: "Tabla comparativa de impacto antes vs después" },
        { slide: 5, titulo: "La Regla de Trinchera", contenido: "Tu empresa no necesita que trabajes más horas. Necesita que el sistema resuelva lo predecible para que vos decidas lo estratégico.", notaVisual: "Cierre institucional con barra tricolor y CTA a mejoraok.com/diagnostico" },
      ],
      postPlaca: {
        encabezado: "CASO DE ÉXITO B2B · DISTRIBUCIÓN Y GOBIERNO",
        cita: "Por primera vez en 12 años me fui 10 días de vacaciones sin mirar el teléfono cada 10 minutos. La empresa no solo funcionó, sino que entregó mejor.",
        autor: "Fundador y Director General · Distribuidora de 48 colaboradores",
      },
    },
  },

  segunda_generacion: {
    id: "case-segunda-gen-02",
    titulo: "Profesionalizar la empresa familiar sin quebrar la confianza ni la cultura",
    arquetipo: "segunda_generacion",
    empresa: "Industria Metalmecánica Regional",
    empresaNombreReal: "Metalmecánica del Sur SRL",
    rubro: "Manufactura Metalúrgica y Agropartes",
    tamano: "35 operarios y técnicos · Planta propia",
    ubicacion: "Santa Fe, Argentina",
    rolProtagonista: "Gerente General (Segunda Generación)",
    anonimizado: true,
    problemaStoryBrand: {
      externo: "Coexistencia de dos estilos de liderazgo: la gestión intuitiva del fundador de 70 años y la necesidad de sistemas y datos de la 2da generación.",
      interno: "Tensión constante en las reuniones de directorio. Miedo a que plantear cambios de gestión sea interpretado como un desprecio al esfuerzo del fundador.",
      filosofico: "Evolucionar hacia la profesionalización no debe significar faltarle el respeto a los cimientos que construyeron la empresa.",
    },
    guiaYPlan: {
      rolGuia: "Mejora Continua actuó como facilitador neutral y metodológico, separando las relaciones de familia de las decisiones de gobierno operativo.",
      diagnosticoRaiz: "Falta de un espacio formal de transición y roles superpuestos. Ambos líderes daban directivas contradictorias a los mismos supervisores.",
      plan4D: {
        personal: "Alineación de expectativas intergeneracionales: el fundador asume rol de Presidente Honorario y Mentor Técnico; la 2da gen lidera la gestión ejecutiva.",
        organizacional: "Definición de organigrama formal de planta y canales únicos de comunicación para órdenes de producción.",
        comercial: "Implementación de cotizador estructurado de piezas y costos estándar para terminar con la venta 'por intuición'.",
        empresarial: "Protocolo de acuerdos de socios y tablero mensual de dividendos y reinversión.",
      },
      duracionSemanas: 16,
    },
    metricasImpacto: [
      { metrica: "Conflictos de directivas en planta", antes: "8 semanales", despues: "0 órdenes cruzadas", cambio: "-100% fricción", destaque: true },
      { metrica: "Tiempo de cotización de piezas", antes: "5 días hábiles", despues: "24 horas", cambio: "-80% ciclo", destaque: true },
      { metrica: "Productividad horas-hombre", antes: "62%", despues: "81%", cambio: "+19 pp", destaque: false },
      { metrica: "Rentabilidad por línea de producto", antes: "Desconocida", despues: "100% costeada", cambio: "Control total", destaque: false },
    ],
    transformacion: {
      estadoAnterior: "Planta confundida por órdenes dobles, discusiones familiares en los pasillos y retrasos en entregas de agropartes.",
      estadoActual: "Fundador orgulloso y enfocado en I+D técnico, 2da generación administrando con software y métricas en paz familiar.",
      citaHeroe: "El acompañamiento nos permitió hablar de números y roles sin herir susceptibilidades. Mi padre sintió que cuidábamos su legado, no que lo desplazábamos.",
    },
    leccionesDirectivas: [
      "La profesionalización de una PyME familiar no se impone por decreto: se construye honrando el origen mientras se ordenan las cuentas.",
      "Cuando los operarios reciben dos órdenes distintas de dos familiares, el problema nunca es el operario; es el vacío de gobierno.",
      "Tener datos objetivos en la mesa apaga las discusiones emocionales de sobremesa.",
    ],
    formatos: {
      whatsappSnippet: `Hola! Entiendo perfecto la fricción de la transición generacional.
Acompañamos a una metalúrgica de 35 personas con exactamente este desafío:
• Logramos eliminar el 100% de las órdenes cruzadas entre el fundador y la 2da generación.
• Redujeron el tiempo de cotización de 5 días a 24 horas con un cotizador estándar.
• Y lo más valioso: el fundador se sintió cuidado y hoy participa como mentor técnico.
¿Te gustaría que revisemos un esquema de transición similar para tu empresa?`,
      carruselLinkedIn: [
        { slide: 1, titulo: "¿Cómo profesionalizar la empresa de tu familia sin pelearte con tu viejo?", contenido: "El caso de una industria de 35 operarios que ordenó su transición generacional.", notaVisual: "Tipografía sobria institucional con alto contraste" },
        { slide: 2, titulo: "La Trampa de las Órdenes Cruzadas", contenido: "El fundador decía una cosa en el taller; la segunda generación pedía otra en la oficina. Los mandos medios quedaban paralizados en el medio.", notaVisual: "Esquema de interferencia de comunicación" },
        { slide: 3, titulo: "Separar la Familia de la Gestión", contenido: "Mejora Continua diseñó el protocolo operativo: roles claros, cotizador único y respeto total por el legado técnico del fundador.", notaVisual: "Matriz de gobierno y roles familiares" },
        { slide: 4, titulo: "Resultados Tangibles", contenido: "• 0 órdenes cruzadas en planta\n• Cotizaciones de 5 días a 24 horas\n• +19% de productividad global\n• Paz en las comidas de domingo.", notaVisual: "Gráfico comparativo de impacto" },
        { slide: 5, titulo: "Criterio Directivo", contenido: "Honrar el pasado de la empresa es darle un sistema sólido para que dure los próximos 30 años sin depender de una sola persona.", notaVisual: "Cierre suizo y llamado a la acción" },
      ],
      postPlaca: {
        encabezado: "CASO DE ÉXITO B2B · EMPRESA FAMILIAR & TRANSICIÓN",
        cita: "Mi padre sintió que estábamos cuidando su legado para los próximos 30 años, no que lo estábamos desplazando.",
        autor: "Gerente General (2da Generación) · Industria Metalúrgica",
      },
    },
  },

  ventas_intuitivas: {
    id: "case-ventas-intuitivas-03",
    titulo: "De depender de la suerte y el 'boca a boca' a un pipeline comercial predecible",
    arquetipo: "ventas_intuitivas",
    empresa: "Empresa de Ingeniería y Servicios B2B",
    empresaNombreReal: "Ingeniería & Automatismos SA",
    rubro: "Servicios Técnicos e Ingeniería Industrial",
    tamano: "22 profesionales y técnicos",
    ubicacion: "Buenos Aires, Argentina",
    rolProtagonista: "Socio Comercial y Director de Operaciones",
    anonimizado: true,
    problemaStoryBrand: {
      externo: "Facturación en montaña rusa. Meses de récord de proyectos seguidos de sequías angustiantes sin prospectos calificados en cola.",
      interno: "Estrés constante a fin de mes. Incapacidad de proyectar inversiones o contrataciones por no saber cuánto se iba a facturar en 90 días.",
      filosofico: "Un excelente servicio técnico no debería vivir con la soga al cuello comercial por falta de un método sistemático de captación.",
    },
    guiaYPlan: {
      rolGuia: "Mejora Continua estructuró la máquina comercial B2B, transformando propuestas informales en acuerdos de alto valor consultivo.",
      diagnosticoRaiz: "El dueño vendía solo cuando faltaba trabajo. Cuando había proyectos, dejaba de prospectar, generando un ciclo de paro y arranque vicioso.",
      plan4D: {
        personal: "Disciplina comercial: 3 horas semanales fijas de seguimiento directivo a decisores C-Level.",
        organizacional: "Definición del proceso de ventas en 5 etapas (Captura, Diagnóstico A4, Dossier 1 a 1, Propuesta y Cierre).",
        comercial: "Construcción de matriz de problemas de trinchera y acuerdos de alcance con honorarios basados en valor.",
        empresarial: "Forecast comercial predecible a 90 días con control semanal de pipeline activo.",
      },
      duracionSemanas: 12,
    },
    metricasImpacto: [
      { metrica: "Pipeline B2B activo ponderado", antes: "$ 1.2M", despues: "$ 8.4M", cambio: "7x volumen", destaque: true },
      { metrica: "Tasa de cierre de propuestas", antes: "22%", despues: "54%", cambio: "+32 pp", destaque: true },
      { metrica: "Ticket promedio de contrato", antes: "$ 450.000", despues: "$ 1.250.000", cambio: "+177% valor", destaque: false },
      { metrica: "Predecibilidad de ingresos a 90D", antes: "Nula", despues: "85% acertado", cambio: "Tranquilidad", destaque: false },
    ],
    transformacion: {
      estadoAnterior: "Cotizaciones enviadas en PDF largo que nadie leía, descuentos excesivos para cerrar y meses de sequía total.",
      estadoActual: "Pipeline comercial continuo, propuestas de 2 páginas con diagnósticos previos y selección de clientes rentables.",
      citaHeroe: "Pasamos de desesperarnos cuando terminaba una obra a tener que programar proyectos con 60 días de anticipación.",
    },
    leccionesDirectivas: [
      "Vender en B2B no es tener carisma ni hablar rápido; es hacer las preguntas de diagnóstico que nadie se anima a hacer.",
      "El mejor momento para prospectar es cuando estás tapado de trabajo, no cuando tu cuenta bancaria está en cero.",
      "Cuando tu propuesta demuestra que entendés el dolor del cliente mejor que él mismo, el precio pasa a segundo plano.",
    ],
    formatos: {
      whatsappSnippet: `Hola! Lo que me contás de los altibajos en ventas lo vimos mil veces en empresas de servicios técnicos.
Fijate este caso de una empresa de ingeniería de 22 personas:
• Pasaron de cotizar tarde y 'a ojo' a tener un pipeline activo de $ 8.4M constante.
• Duplicaron su tasa de cierre (de 22% a 54%) cambiando presupuestos técnicos por Acuerdos de Alcance 4D.
• Hoy tienen visibilidad de facturación a 90 días vista.
Si querés, podemos revisar tus números actuales en 20 minutos sin compromiso.`,
      carruselLinkedIn: [
        { slide: 1, titulo: "¿Por qué las mejores empresas de servicios técnicos sufren para vender?", contenido: "El caso de una firma de ingeniería que multiplicó por 7 su pipeline comercial.", notaVisual: "Gráfico de embudo con estilo suizo minimalista" },
        { slide: 2, titulo: "La Montaña Rusa Comercial", contenido: "Mes 1: tapados de obras, nadie prospecta.\nMes 2: se entregan las obras, entra el pánico.\nMes 3: descuentos desesperados para poder pagar sueldos.", notaVisual: "Esquema del ciclo vicioso de parada y arranque" },
        { slide: 3, titulo: "La Solución: Proceso B2B Consultivo", contenido: "Dejamos de mandar presupuestos fríos de 12 páginas. Implementamos el Diagnóstico A4 y Acuerdos de Alcance basados en valor.", notaVisual: "Muestra visual de propuesta ejecutiva A4" },
        { slide: 4, titulo: "El Impacto en 12 Semanas", contenido: "• Pipeline 7x mayor ($ 8.4M)\n• Tasa de cierre del 22% al 54%\n• Ticket promedio +177%\n• Visibilidad financiera real.", notaVisual: "Métricas destacadas con fondo contrastante" },
        { slide: 5, titulo: "Criterio Directivo", contenido: "La tranquilidad financiera de una empresa no depende de cuánto factura en su mejor mes, sino de qué tan predecible es su sistema de captación.", notaVisual: "Cierre institucional con barra tricolor" },
      ],
      postPlaca: {
        encabezado: "CASO DE ÉXITO B2B · PROCESO COMERCIAL CONSULTIVO",
        cita: "Pasamos de desesperarnos cuando terminaba una obra a programar proyectos con 60 días de anticipación.",
        autor: "Director Comercial · Empresa de Servicios de Ingeniería",
      },
    },
  },

  calidad_retrabajos: {
    id: "case-calidad-retrabajos-04",
    titulo: "Frenar los retrabajos y reclamos operativos para recuperar el margen perdido",
    arquetipo: "calidad_retrabajos",
    empresa: "Planta Elaboradora de Alimentos",
    empresaNombreReal: "Alimentos del Centro SA",
    rubro: "Industria Alimenticia y Envasado",
    tamano: "55 colaboradores en 2 turnos",
    ubicacion: "Entre Ríos, Argentina",
    rolProtagonista: "Director de Operaciones y Calidad",
    anonimizado: true,
    problemaStoryBrand: {
      externo: "Reclamos recurrentes de clientes mayoristas por errores de rotulado, lotes no conformes y demoras en despachos.",
      interno: "Frustración extrema del equipo de planta. Sensación de que 'la gente no presta atención' y desgaste en discusiones diarias.",
      filosofico: "Los colaboradores no se levantan a la mañana con ganas de hacer mal su trabajo; el desorden ocurre cuando el proceso no ayuda a no equivocarse.",
    },
    guiaYPlan: {
      rolGuia: "Mejora Continua aplicó metodologías de manufactura esbelta (Lean & Poka-Yoke), enfocando la atención en el diseño de puestos y no en la culpa individual.",
      diagnosticoRaiz: "Instrucciones de trabajo verbales y controles de calidad ubicados al final de la línea, cuando el costo de descarte ya era irreversible.",
      plan4D: {
        personal: "Cultura de no culpabilidad: reporte abierto de desvíos sin represalias para detectar fallas antes de que lleguen al cliente.",
        organizacional: "Puntos de control de calidad en origen (etapas tempranas) y checklists visuales de un minuto por puesto.",
        comercial: "Protocolo de respuesta inmediata y garantía técnica que transformó quejas en lealtad comercial.",
        empresarial: "Tablero de Costos de No Calidad (scrap, horas extra de retrabajo, fletes de recupero) visible en la gerencia.",
      },
      duracionSemanas: 12,
    },
    metricasImpacto: [
      { metrica: "Costo mensual de no calidad", antes: "$ 2.800.000", despues: "$ 650.000", cambio: "-76% pérdidas", destaque: true },
      { metrica: "Reclamos de clientes por lote", antes: "8.5%", despues: "1.2%", cambio: "-7.3 pp", destaque: true },
      { metrica: "Horas extra por retrabajos", antes: "160 hs / mes", despues: "25 hs / mes", cambio: "-84% sobrecosto", destaque: false },
      { metrica: "Clima laboral de operarios", antes: "Tensión alta", despues: "Autonomía y orden", cambio: "Cultura sana", destaque: false },
    ],
    transformacion: {
      estadoAnterior: "Camiones devueltos, discusiones a los gritos en planta y márgenes evaporados en horas extras de reprocesamiento.",
      estadoActual: "Planta ordenada, controles de calidad automáticos en cada puesto y clientes felicitando la consistencia de entrega.",
      citaHeroe: "Descubrimos que no teníamos malos empleados, teníamos malos procesos. Cuando les dimos herramientas claras, la calidad subió sola.",
    },
    leccionesDirectivas: [
      "La calidad no se inspecciona al final; se diseña en cada paso del proceso.",
      "Culpar a la persona solo garantiza que el próximo error se oculte debajo de la alfombra hasta que explote en el cliente.",
      "Reducir el retrabajo es la forma más rápida y barata de aumentar la rentabilidad de una empresa sin vender un solo peso más.",
    ],
    formatos: {
      whatsappSnippet: `Hola! Entiendo perfectamente la angustia de los retrabajos y reclamos.
Te comparto el caso de una planta elaboradora de 55 personas que tenía el mismo dolor:
• Redujeron el costo de no calidad de $ 2.8M a $ 650.000 mensuales en solo 90 días (-76%).
• Los reclamos de clientes cayeron del 8.5% al 1.2% implementando control en origen (Poka-Yoke).
• Lo central: el foco nunca fue castigar personas, sino rediseñar el proceso para que equivocarse sea casi imposible.
¿Querés que veamos cómo mapear los puntos críticos de tu operación?`,
      carruselLinkedIn: [
        { slide: 1, titulo: "¿Cuánto dinero pierde tu empresa por errores que se podrían evitar?", contenido: "El caso de una planta de 55 empleados que bajó 76% sus costos de retrabajo.", notaVisual: "Gráfico de impacto en rentabilidad y desperdicio" },
        { slide: 2, titulo: "La Falacia de 'La culpa es de la gente'", contenido: "Cuando hay errores recurrentes, la reacción común es culpar al operario. La realidad: si el sistema permite que el error pase, el problema es de diseño.", notaVisual: "Cita destacada con contraste tipográfico" },
        { slide: 3, titulo: "Control en Origen (Lean B2B)", contenido: "Movimos la calidad del final de la línea a cada puesto individual. Checklists visuales de 1 minuto y reporte sin castigo.", notaVisual: "Diagrama de flujo de control temprano" },
        { slide: 4, titulo: "Impacto en Números", contenido: "• -76% costo de no calidad\n• Reclamos bajaron de 8.5% a 1.2%\n• -84% horas extra de fin de semana\n• Clima de respeto en planta.", notaVisual: "Métricas en tarjetas con colores de marca" },
        { slide: 5, titulo: "Criterio Directivo", contenido: "Dejar de cometer errores cuesta mucho menos que salir a vender más para tapar las pérdidas operativas.", notaVisual: "Cierre institucional con barra tricolor" },
      ],
      postPlaca: {
        encabezado: "CASO DE ÉXITO B2B · CONTROL OPERATIVO & CALIDAD",
        cita: "Descubrimos que no teníamos malos empleados, teníamos malos procesos. Cuando les dimos herramientas claras, la calidad subió sola.",
        autor: "Director de Operaciones · Planta Elaboradora de Alimentos",
      },
    },
  },
};

/**
 * Normaliza cualquier string de arquetipo al conjunto válido de 4 arquetipos B2B.
 */
export function normalizarArquetipoCaso(arquetipo?: string): ArquetipoCaso {
  if (!arquetipo) return "fundador_saturado";
  const s = arquetipo.toLowerCase().trim();
  if (s.includes("segunda") || s.includes("2da") || s.includes("transicion") || s.includes("generacion")) {
    return "segunda_generacion";
  }
  if (s.includes("venta") || s.includes("comercial") || s.includes("pipeline") || s.includes("intuitiv")) {
    return "ventas_intuitivas";
  }
  if (s.includes("calidad") || s.includes("retrabajo") || s.includes("proceso") || s.includes("friccion")) {
    return "calidad_retrabajos";
  }
  return "fundador_saturado";
}

/**
 * Retorna todos los casos calibrados de la biblioteca institucional de autoridad.
 */
export function obtenerCasosExitoBiblioteca(): CustomerCase[] {
  return Object.values(CASOS_BIBLIOTECA_CALIBRADOS);
}

/**
 * Obtiene el caso calibrado correspondiente a un arquetipo, permitiendo personalizar o anonimizar.
 */
export function obtenerCasoPorArquetipo(
  arquetipoInput?: string,
  anonimizar: boolean = true
): CustomerCase {
  const arq = normalizarArquetipoCaso(arquetipoInput);
  const base = CASOS_BIBLIOTECA_CALIBRADOS[arq];

  return {
    ...base,
    anonimizado: anonimizar,
    empresa: anonimizar ? base.empresa : base.empresaNombreReal,
  };
}

/**
 * Genera un caso de estudio adaptado dinámicamente con parámetros específicos del prospecto o cliente.
 */
export function generarCasoExito(params: GenerarCasoParams): CustomerCase {
  const arq = normalizarArquetipoCaso(params.arquetipo);
  const base = CASOS_BIBLIOTECA_CALIBRADOS[arq];
  const anon = params.anonimizado !== false;

  return {
    ...base,
    id: `case-${arq}-${Date.now().toString(36)}`,
    empresa: params.empresa || (anon ? base.empresa : base.empresaNombreReal),
    rubro: params.rubro || base.rubro,
    tamano: params.tamano || base.tamano,
    rolProtagonista: params.rolProtagonista || base.rolProtagonista,
    anonimizado: anon,
  };
}

/**
 * Formatea el caso como texto listo para enviar por WhatsApp o DM.
 */
export function formatearCasoWhatsApp(caso: CustomerCase): string {
  return caso.formatos.whatsappSnippet;
}

/**
 * Formatea el caso como guión Markdown estructurado para carrusel LinkedIn de 5 diapositivas.
 */
export function formatearCasoParaCarrusel(caso: CustomerCase): string {
  const lineas: string[] = [
    `# Carrusel LinkedIn: ${caso.titulo}`,
    `**Empresa:** ${caso.empresa} (${caso.tamano})`,
    `**Arquetipo:** ${caso.arquetipo}`,
    "",
  ];

  caso.formatos.carruselLinkedIn.forEach((slide) => {
    lineas.push(`---`);
    lineas.push(`### Diapositiva ${slide.slide}: ${slide.titulo}`);
    lineas.push(slide.contenido);
    lineas.push(`*Nota visual:* ${slide.notaVisual}`);
    lineas.push("");
  });

  return lineas.join("\n");
}
