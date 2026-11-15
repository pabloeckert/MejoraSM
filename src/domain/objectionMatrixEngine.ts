/**
 * objectionMatrixEngine.ts — Motor de Matriz de Objeciones Directivas Ocultas & Argumentario de Confianza
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Fundamentos Teóricos e Institucionales:
 * 1. David Maister ("The Trusted Advisor"):
 *    - La Ecuación de Confianza: T = (C + R + I) / S.
 *    - Cuando el cliente plantea una fricción, defenderse o confrontar eleva la auto-orientación (S)
 *      y destruye la credibilidad. El asesor de confianza valida la preocupación con empatía íntima.
 * 2. Chris Voss ("Never Split the Difference"):
 *    - Tactical Empathy, Labeling ("Parece que sentís que...") y Mirroring.
 *    - Desactivar las amígdalas del decisor nombrando el miedo oculto antes de proponer cualquier solución.
 * 3. Jeb Blount ("Objections"):
 *    - Marco de 4 pasos: Relajar, Desarmar con validación, Explorar la causa y Reencuadrar con un puente al sistema.
 * 4. Manual de Identidad Verbal de Mejora Continua (AGENTS.md):
 *    - Calidez con Verdad: Calidez en escuchar la preocupación legítima; verdad en no complacer el caos.
 *    - Nunca a la persona / Foco en el sistema: Las objeciones se originan en fallas de métodos previos,
 *      no en terquedad del dueño ni en incompetencia de sus colaboradores.
 *    - Marco de las 4 Dimensiones (Personal, Organizacional, Comercial, Empresarial).
 */

import { type ArquetipoDolor } from "./executiveDiagnosticEngine";
import { auditarBrandVoice, type ResultadoAuditoriaBrandVoice } from "./brandVoiceLinterEngine";

export type IdObjecion =
  | "sin_tiempo_sobrecarga"
  | "rubro_muy_particular"
  | "software_previo_fracasado"
  | "miedo_resistencia_equipo"
  | "incertidumbre_pais_esperar"
  | "miedo_perder_control_calidad"
  | "personalizada";

export interface ObjecionDirectivaInfo {
  id: IdObjecion;
  titulo: string;
  fraseTextualCliente: string;
  miedoOcultoDirectivo: string;
  etiquetadoEmpaticoVoss: string;
  reencuadreSistemicoMaister: string;
  causaRaizSistema: string;
  solucionParametrica4D: string;
  guionLlamada90Segundos: {
    aperturaValidacion: string;
    desarmeTactico: string;
    puenteMetodologico: string;
    preguntaSocraticaCierre: string;
  };
  respuestaWhatsAppDM: string;
  preguntaSocraticaCLevel: string;
  arquetipoAfin: ArquetipoDolor;
  dimensionPrincipal: "personal" | "organizacional" | "comercial" | "empresarial";
}

export interface InputResolucionObjecion {
  idObjecion?: IdObjecion;
  nombreDirectivo?: string;
  empresaNombre?: string;
  arquetipoDolor?: ArquetipoDolor;
  contextoEspecifico?: string;
}

export interface ResultadoResolucionObjecion {
  idResolucion: string;
  objecion: ObjecionDirectivaInfo;
  nombreDirectivo: string;
  empresaNombre: string;
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
// CATÁLOGO DE LAS 6 GRANDES OBJECIONES DIRECTIVAS OCULTAS
// ═══════════════════════════════════════════════════════════════
const CATALOGO_OBJECIONES: Record<Exclude<IdObjecion, "personalizada">, ObjecionDirectivaInfo> = {
  sin_tiempo_sobrecarga: {
    id: "sin_tiempo_sobrecarga",
    titulo: "Falta de Tiempo y Sobrecarga Operativa",
    fraseTextualCliente: "No tenemos tiempo para implementar cambios ahora; estamos tapados apagando urgencias del día a día.",
    miedoOcultoDirectivo: "Temor a que la consultoría sea una carga burocrática adicional de reuniones y planillas que aumente el desborde.",
    etiquetadoEmpaticoVoss: "Parece que sentís que sumar un proyecto más hoy va a terminar de saturar la poca energía que te queda para la operación diaria...",
    reencuadreSistemicoMaister: "Estar tapado de trabajo no es una razón para postergar el orden, es el síntoma inequívoco de que el cuello de botella está absorbiendo al socio.",
    causaRaizSistema: "Inexistencia de un filtro de delegación paramétrica que diferencie urgencias operativas menores de decisiones de dirección.",
    solucionParametrica4D: "El Plan 4D no agrega horas: audita el flujo en el Gemba Walk para quitar de inmediato 4 a 6 horas semanales de bomberismo desde la Semana 2.",
    guionLlamada90Segundos: {
      aperturaValidacion: "Comprendo perfectamente tu posición. Si sentís que no tenés tiempo ni para respirar, lo último que necesitás es alguien que venga a pedirte horas de oficina.",
      desarmeTactico: "Parece que tu mayor temor es que un proceso de orden te robe el poco tiempo que tenés para atender a tus clientes y proveedores clave.",
      puenteMetodologico: "La realidad es que el desborde no se resuelve esperando un momento más tranquilo, porque ese momento nunca llega solo. Nuestro protocolo no te suma trabajo: audita el Gemba Walk en planta para quitarte de inmediato 4 horas semanales de incendios operativos.",
      preguntaSocraticaCierre: "¿Cuántos meses más puede tu salud y tu negocio sostener este nivel de absorción personal antes de que un descuido pase factura?",
    },
    respuestaWhatsAppDM: "Comprendo perfectamente la falta de tiempo, estimado/a. Justamente cuando el socio está tapado de urgencias es cuando el sistema está pidiendo auxilio. Nuestro enfoque no suma reuniones teóricas: intervenimos directamente sobre el flujo de trabajo para devolverte entre 4 y 6 horas semanales desde los primeros 15 días. Si te parece, te comparto la hoja de ruta de desahogo en mejoraok.com/diagnostico.",
    preguntaSocraticaCLevel: "¿Si hoy te ausentaras 10 días de la empresa, qué porcentaje de la operación seguiría funcionando con la misma calidad?",
    arquetipoAfin: "fundador_saturado",
    dimensionPrincipal: "personal",
  },

  rubro_muy_particular: {
    id: "rubro_muy_particular",
    titulo: "Escepticismo del 'Rubro Muy Particular'",
    fraseTextualCliente: "Mi negocio es muy particular; lo que funciona en otras industrias acá no aplica porque los clientes piden todo a medida.",
    miedoOcultoDirectivo: "Miedo a encontrarse con consultores de pizarrón que intenten meter a la fuerza metodologías estándar sin entender el mostrador.",
    etiquetadoEmpaticoVoss: "Parece que en el pasado te presentaron recetas teóricas de manual que no tenían nada que ver con la fricción real de tu oficio...",
    reencuadreSistemicoMaister: "La personalización del producto hacia el cliente es una virtud competitiva; el desorden interno en cómo se cotiza, se entrega y se cobra no es una particularidad, es falta de acuerdos.",
    causaRaizSistema: "Falta de estandarización entre lo que es flexible (el diseño del producto) y lo que debe ser paramétrico (el proceso de despacho y seguimiento).",
    solucionParametrica4D: "Construir acuerdos de área que protejan la singularidad del servicio pero estandaricen el flujo de información y los tiempos de respuesta.",
    guionLlamada90Segundos: {
      aperturaValidacion: "Tenés toda la razón en defender la particularidad de lo que hacés. Cada sector tiene mañas, tiempos y clientes con exigencias que nadie de afuera conoce como vos.",
      desarmeTactico: "Parece que te preocupa que alguien venga a querer meter tu oficio artesanal o especializado en una caja rígida que espante a tus clientes.",
      puenteMetodologico: "Nosotros no tocamos la magia técnica de tu oficio. Lo que ordenamos es la tubería invisible: cómo se transfieren los pedidos de ventas al taller, cómo se controlan los tiempos muertos y cómo se cobra en término. Eso no es teoría: es proteger tu rentabilidad.",
      preguntaSocraticaCierre: "¿Qué parte de los problemas de entrega que tuviste este mes son realmente del rubro, y qué parte son simplemente falta de un acuerdo claro entre áreas?",
    },
    respuestaWhatsAppDM: "Tenés razón en que tu rubro tiene dinámicas únicas que solo quien está en la trinchera conoce. La metodología de Mejora Continua no busca cambiar tu producto ni encorsetarte, sino ordenar la tubería invisible: que los pedidos pasen limpios de ventas a operaciones y que las cobranzas no dependan de tu memoria. Podés ver casos de rubros complejos en mejoraok.com/diagnostico.",
    preguntaSocraticaCLevel: "¿Tus clientes pagan por tu especialización técnica o por las horas que perdés coordinando detalles que deberían salir solos?",
    arquetipoAfin: "calidad_entregas",
    dimensionPrincipal: "organizacional",
  },

  software_previo_fracasado: {
    id: "software_previo_fracasado",
    titulo: "Frustración por Software o ERP Previo Fracasado",
    fraseTextualCliente: "Ya compramos un sistema caro hace un tiempo y nadie lo usó; terminamos volviendo al papel y a los chats de WhatsApp.",
    miedoOcultoDirectivo: "Frustración por haber tirado dinero y tiempo a la basura; desconfianza en cualquier iniciativa que hable de digitalización.",
    etiquetadoEmpaticoVoss: "Parece que viviste la amarga experiencia de pagar licencias caras que prometían soluciones mágicas y terminaron generando más burocracia que resultados...",
    reencuadreSistemicoMaister: "Comprar software sin antes diseñar los procesos es el camino más rápido para informatizar el desorden y multiplicar la frustración.",
    causaRaizSistema: "Haber implementado tecnología como un fin en sí mismo antes de acordar las reglas de trabajo humanas y los umbrales de decisión.",
    solucionParametrica4D: "Método 4D estricto: Primero Diagnóstico y Diseño de acuerdos visuales en papel; solo cuando el hábito de equipo existe se despliega la herramienta.",
    guionLlamada90Segundos: {
      aperturaValidacion: "Te entiendo al 100%. He visto decenas de pymes que compraron un ERP famoso de seis cifras y terminó siendo un elefante blanco que nadie alimenta.",
      desarmeTactico: "Parece que sentís que la tecnología en las pymes genera más resistencia y pérdida de tiempo que soluciones concretas.",
      puenteMetodologico: "El problema nunca fue el software ni la capacidad de tu equipo: fue el orden de los factores. Si ponés software sobre el caos, solo obtenés caos computarizado. En Mejora Continua la regla es inquebrantable: primero se acuerda el proceso en papel y pizarras, y recién cuando funciona solo se automatiza.",
      preguntaSocraticaCierre: "¿Si hoy ordenáramos primero las 3 reglas básicas de entrega entre áreas sin tocar ningún sistema, cuánto tiempo se ahorraría tu equipo?",
    },
    respuestaWhatsAppDM: "Es una frustración totalmente comprensible. Comprar software sin haber ordenado previamente los procesos humanos es la trampa en la que caen el 80% de las pymes. En Mejora Continua no vendemos licencias ni sistemas enlatados: diseñamos primero los acuerdos operativos de piso. La herramienta digital solo entra cuando el proceso ya funciona. Conocé el enfoque 4D en mejoraok.com/diagnostico.",
    preguntaSocraticaCLevel: "¿El sistema anterior fracasó porque la gente no quiso usarlo, o porque les pidieron cargar datos que no resolvían sus urgencias diarias?",
    arquetipoAfin: "estancamiento_comercial",
    dimensionPrincipal: "comercial",
  },

  miedo_resistencia_equipo: {
    id: "miedo_resistencia_equipo",
    titulo: "Temor a la Resistencia o Pérdida del Equipo Clave",
    fraseTextualCliente: "Tengo miedo de que al exigir procesos y controles la gente valiosa se desmotive, se enoje o termine renunciando.",
    miedoOcultoDirectivo: "Miedo al conflicto interno y a la soledad de quedarse sin mandos medios o colaboradores históricos de confianza.",
    etiquetadoEmpaticoVoss: "Parece que temés que ordenar la empresa desate un clima de descontento que termine afectando a tus personas más leales...",
    reencuadreSistemicoMaister: "Los buenos colaboradores no renuncian por tener procesos claros; renuncian por el desgaste de trabajar en el caos, con órdenes contradictorias y apagando incendios ajenos.",
    causaRaizSistema: "Confundir control punitivo de personas con claridad de sistemas y acuerdos de área compartidos.",
    solucionParametrica4D: "Involucrar al equipo en el Gemba Walk para que los acuerdos nazcan de sus propias fricciones, eliminando el retrabajo y desestresando la jornada.",
    guionLlamada90Segundos: {
      aperturaValidacion: "Cuidar a tu equipo habla de tu liderazgo. La gente con experiencia y compromiso es el activo más difícil de reemplazar en una pyme.",
      desarmeTactico: "Parece que te preocupa que la palabra 'proceso' suene a control policial o vigilancia que ofenda a quienes te acompañaron desde el inicio.",
      puenteMetodologico: "La realidad que vemos todos los días en la trinchera es exactamente la contraria: los empleados comprometidos sufren el desorden más que nadie, porque se van a su casa con la angustia de que las cosas no salieron. Cuando implementamos acuerdos paramétricos, el equipo es el primero en respirar aliviado.",
      preguntaSocraticaCierre: "¿Tu gente está cansada de trabajar, o está cansada de tener que rehacer tareas por falta de información clara al arrancar el día?",
    },
    respuestaWhatsAppDM: "Cuidar al equipo es prioritario. Sin embargo, nuestra experiencia en pymes demuestra que el buen personal no renuncia por tener reglas claras; renuncia por el agotamiento del desorden y las urgencias de último minuto. Cuando los acuerdos se diseñan en conjunto en el Gemba Walk, el equipo es el primer agradecido porque se eliminan los reprocesos. Podés ver nuestro protocolo de personas en mejoraok.com/diagnostico.",
    preguntaSocraticaCLevel: "¿Cuántas horas extra de tu equipo este mes fueron para generar valor real, y cuántas fueron para tapar errores de coordinación?",
    arquetipoAfin: "fundador_saturado",
    dimensionPrincipal: "organizacional",
  },

  incertidumbre_pais_esperar: {
    id: "incertidumbre_pais_esperar",
    titulo: "Parálisis por Incertidumbre Económica ('Hay que Esperar')",
    fraseTextualCliente: "Con la incertidumbre económica y política del país, prefiero esperar a que el panorama aclare antes de encarar cualquier proyecto.",
    miedoOcultoDirectivo: "Sensación de pérdida de control ante la macroeconomía y miedo a comprometer recursos cuando no hay previsibilidad.",
    etiquetadoEmpaticoVoss: "Parece que la volatilidad y las reglas cambiantes del entorno te hacen sentir que lo más prudente hoy es quedarse inmóvil...",
    reencuadreSistemicoMaister: "La macroeconomía no está bajo el control de la pyme; la eficiencia de sus procesos internos y la protección de su rentabilidad, sí.",
    causaRaizSistema: "Dejar que la incertidumbre externa justifique la permanencia de fugas operativas internas que devoran el margen.",
    solucionParametrica4D: "Blindar el margen operativo y la liquidez con tableros semanales de control, convirtiendo a la empresa en una estructura ágil y resiliente.",
    guionLlamada90Segundos: {
      aperturaValidacion: "Es totalmente comprensible tener cautela. El contexto económico exige prudencia y cuidar cada peso como oro.",
      desarmeTactico: "Parece que sentís que en este momento cualquier movimiento interno puede sumar riesgo innecesario a la operación.",
      puenteMetodologico: "Pero fijate esta paradoja: el contexto no lo podemos cambiar ni vos ni yo. Lo que sí podemos controlar es si tu empresa pierde o no un 10% de su margen en retrabajos y cotizaciones mal seguidas. En épocas complejas, las empresas desordenadas son las primeras en sufrir; las ordenadas capturan la cuota de mercado que otros dejan.",
      preguntaSocraticaCierre: "¿Si el contexto tarda 12 meses más en acomodarse, podés darte el lujo de seguir perdiendo plata todos los meses por falta de sistema interno?",
    },
    respuestaWhatsAppDM: "La cautela ante el contexto es una virtud del buen directivo. Sin embargo, la macroeconomía no la podemos controlar, mientras que las fugas internas de tu operación sí. En épocas de mercado exigente, la pyme que tiene sus procesos y cobranzas al día no solo resiste, sino que gana participación de mercado frente a competidores desordenados. Te invito a ver la hoja de ruta de blindaje en mejoraok.com/diagnostico.",
    preguntaSocraticaCLevel: "¿Esperar a que el país cambie detiene las fugas de dinero que tu empresa tiene hoy en cobranzas y demoras de entrega?",
    arquetipoAfin: "segunda_generacion",
    dimensionPrincipal: "empresarial",
  },

  miedo_perder_control_calidad: {
    id: "miedo_perder_control_calidad",
    titulo: "Miedo a Delegar y Perder el Control de la Calidad",
    fraseTextualCliente: "Si no estoy yo encima de cada detalle, las cosas no salen con la calidad que nuestros clientes esperan.",
    miedoOcultoDirectivo: "Sensación de que el estándar de la empresa depende de su presencia física y miedo a que otros arruinen su reputación.",
    etiquetadoEmpaticoVoss: "Parece que sentís sobre tus hombros la responsabilidad solitaria de que un error de un colaborador manche los años que te costó construir el prestigio...",
    reencuadreSistemicoMaister: "Estar encima de todo no es control; es ahogo operativo. El verdadero control radica en tener estándares visibles que el equipo pueda auditar sin llamarte.",
    causaRaizSistema: "Confundir delegación con abdicación: no existen umbrales de tolerancia ni tableros de avance físico independientes de la persona.",
    solucionParametrica4D: "Diseñar estándares de trabajo visual en planta y tableros de excepciones de 30 minutos semanales donde el socio gobierna sin microgestionar.",
    guionLlamada90Segundos: {
      aperturaValidacion: "El prestigio de tu empresa existe gracias a tu obsesión por la calidad y el servicio al cliente. Nadie puede quitarte ese mérito.",
      desarmeTactico: "Parece que te preocupa que al soltar el micromanagement diario la calidad baje y los clientes sientan que ya no los atendés vos.",
      puenteMetodologico: "Pero hay una diferencia abismal entre delegar y desentenderse. Hoy sos el control de calidad viviente de tu empresa, y eso pone un techo de cristal a tu crecimiento. Lo que construimos no es que te desentiendas, sino que pongamos tus criterios en tableros visuales y estándares que tus mandos medios puedan aplicar igual o mejor que vos.",
      preguntaSocraticaCierre: "¿Tu objetivo es ser el operario de lujo que revisa cada remito, o el director que construyó un sistema que entrega excelencia sin desgastarlo?",
    },
    respuestaWhatsAppDM: "Tu estándar de calidad es el activo más valioso de la empresa. Pero ser el cuello de botella que debe autorizar y revisar cada detalle limita tu crecimiento y desgasta tu vida. El objetivo de Mejora Continua no es que te desentiendas, sino formalizar tus criterios en estándares visuales y tableros de excepción para que tu equipo entregue con tu misma exigencia. Conocé cómo delegar con control en mejoraok.com/diagnostico.",
    preguntaSocraticaCLevel: "¿Querés que la calidad dependa de que vos no te enfermes nunca, o de un sistema que garantice el estándar todos los días?",
    arquetipoAfin: "calidad_entregas",
    dimensionPrincipal: "personal",
  },
};

/**
 * Normaliza y resuelve la objeción seleccionada
 */
export function resolverObjecionDirectiva(input: InputResolucionObjecion): ResultadoResolucionObjecion {
  const idObj = input.idObjecion && input.idObjecion !== "personalizada" ? input.idObjecion : "sin_tiempo_sobrecarga";
  const objBase = CATALOGO_OBJECIONES[idObj] || CATALOGO_OBJECIONES.sin_tiempo_sobrecarga;

  const nombreDirectivo = input.nombreDirectivo?.trim() || "Director General / Socio";
  const empresaNombre = input.empresaNombre?.trim() || "Empresa PyME";
  const arquetipo = input.arquetipoDolor || objBase.arquetipoAfin;

  // Si hay contexto específico personalizado, enriquecer la información
  const objecionPersonalizada: ObjecionDirectivaInfo = {
    ...objBase,
    arquetipoAfin: arquetipo,
  };

  const idResolucion = `OBJ-${idObj.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Estructura verbal en 3 pasos (Verdad + Causa Raíz de Sistema + Dirección Concreta)
  const estructuraTresPasos = {
    paso1VerdadSinJuzgar: `Es una preocupación totalmente comprensible en ${empresaNombre}: ${objecionPersonalizada.fraseTextualCliente.toLowerCase()}`,
    paso2CausaRaizSistema: `La causa raíz no es falta de capacidad ni de voluntad de ${nombreDirectivo} o su equipo, sino ${objecionPersonalizada.causaRaizSistema.toLowerCase()}`,
    paso3DireccionConcreta: `${objecionPersonalizada.solucionParametrica4D} Hoja de ruta y diagnóstico metodológico disponible en mejoraok.com/diagnostico.`,
  };

  // Resumen formateado para WhatsApp directivo
  const resumenWhatsAppDirectivo =
    `Estimado/a ${nombreDirectivo},\n\n` +
    `Respecto a la situación operativa de *${empresaNombre}*, entiendo perfectamente tu inquietud: *"${objecionPersonalizada.fraseTextualCliente}"*\n\n` +
    `*1. La Verdad de Trinchera:*\n` +
    `${objecionPersonalizada.etiquetadoEmpaticoVoss}\n\n` +
    `*2. El Reencuadre de Sistema:*\n` +
    `${objecionPersonalizada.reencuadreSistemicoMaister}\n\n` +
    `*3. Solución Paramétrica (Metodología 4D):*\n` +
    `${objecionPersonalizada.solucionParametrica4D}\n\n` +
    `*Pregunta de Dirección:* ${objecionPersonalizada.preguntaSocraticaCLevel}\n\n` +
    `Podés revisar el protocolo completo de acompañamiento en: https://mejoraok.com/diagnostico?utm_source=mejora_sm&utm_medium=objection_matrix&utm_campaign=${arquetipo}&obj_id=${idObj}`;

  // Briefing Ejecutivo en Markdown
  const briefingMarkdown = `# ARGUMENTARIO CONSULTIVO DE CONFIANZA & RESOLUCIÓN DE OBJECIONES B2B
**Objeción Clave:** ${objecionPersonalizada.titulo}  
**Interlocutor:** ${nombreDirectivo} | **Empresa:** ${empresaNombre}  
**Dimensión Afectada:** ${objecionPersonalizada.dimensionPrincipal.toUpperCase()} | **Arquetipo:** ${arquetipo.toUpperCase()}  

---

## 1. ANÁLISIS PSICOLÓGICO DEL DECISOR (CHRIS VOSS & DAVID MAISTER)
* **Objeción Declarada:** "${objecionPersonalizada.fraseTextualCliente}"
* **Miedo Oculto Real:** ${objecionPersonalizada.miedoOcultoDirectivo}
* **Etiquetado Empático Táctico:** *"${objecionPersonalizada.etiquetadoEmpaticoVoss}"*

---

## 2. REENCUADRE SISTÉMICO Y CAUSA RAÍZ
* **Reencuadre de Autoridad:** ${objecionPersonalizada.reencuadreSistemicoMaister}
* **Causa Raíz de Proceso:** ${objecionPersonalizada.causaRaizSistema}
* **Solución Paramétrica 4D:** ${objecionPersonalizada.solucionParametrica4D}

---

## 3. GUIÓN DE LLAMADA / REUNIÓN 1 A 1 (90 SEGUNDOS)
1. **Apertura y Validación:** ${objecionPersonalizada.guionLlamada90Segundos.aperturaValidacion}
2. **Desarme Táctico:** ${objecionPersonalizada.guionLlamada90Segundos.desarmeTactico}
3. **Puente Metodológico:** ${objecionPersonalizada.guionLlamada90Segundos.puenteMetodologico}
4. **Cierre Socrático:** ${objecionPersonalizada.guionLlamada90Segundos.preguntaSocraticaCierre}

---

## 4. PREGUNTA SOCRÁTICA C-LEVEL
> "${objecionPersonalizada.preguntaSocraticaCLevel}"

Hoja de ruta institucional: https://mejoraok.com/diagnostico`;

  // Auditoría automática contra el Brand Voice Linter
  const textoAuditar = `${estructuraTresPasos.paso1VerdadSinJuzgar} ${estructuraTresPasos.paso2CausaRaizSistema} ${estructuraTresPasos.paso3DireccionConcreta}`;
  const auditoriaBrandVoice = auditarBrandVoice(textoAuditar);

  return {
    idResolucion,
    objecion: objecionPersonalizada,
    nombreDirectivo,
    empresaNombre,
    estructuraTresPasos,
    resumenWhatsAppDirectivo,
    briefingMarkdown,
    auditoriaBrandVoice,
  };
}

/**
 * Retorna la lista completa de las 6 objeciones predeterminadas
 */
export function listarObjecionesCatalogo(): ObjecionDirectivaInfo[] {
  return Object.values(CATALOGO_OBJECIONES);
}
