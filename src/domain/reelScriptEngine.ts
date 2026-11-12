/**
 * reelScriptEngine.ts — Motor de Generación y Cronometraje de Guiones B2B
 * Sistema Autónomo MejoraSM · Ecosistema Mejora Continua (mejoraok.com)
 *
 * Basado en:
 * - Gary Vaynerchuk (Jab, Jab, Jab, Right Hook): Micro-contenido de video vertical 9:16 (1080x1920)
 * - Jonah Berger (Contagioso - STEPPS): Hooks de quiebre emocional y disparadores de trinchera
 * - Donald Miller (Building a StoryBrand): Estructura Problema -> Guía con Plan -> Éxito
 * - Principios de Marca: Nunca a la persona, calidez con verdad, foco en procesos y sistemas
 */

export interface InputGuionReel {
  propuesta_id: string;
  tema?: string;
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
  buyer_persona?: string;
  dimension_servicio?: string;
}

export interface BloqueGuion {
  id: "gancho" | "metodologia" | "cta";
  nombre: string;
  segundoInicio: number;
  segundoFin: number;
  duracionSegundos: number;
  indicacionCamara: string;
  texto: string;
  palabras: number;
  notasDirector: string;
}

export interface GuionReelCompleto {
  propuesta_id: string;
  titulo: string;
  duracionTotalEstimadaSegundos: number;
  totalPalabras: number;
  wpmRecomendado: number;
  retencionEstimadaPorcentaje: number;
  bloques: BloqueGuion[];
  textoCompletoTeleprompter: string;
  resumenDirector: string;
  ctaCanonica: string;
  exportarMarkdown: () => string;
}

/**
 * Cadencia estándar para oratoria directiva de autoridad B2B:
 * 135 palabras por minuto (~2.25 palabras por segundo).
 * Permite pausas de respiración y énfasis sin sonar apresurado.
 */
export const WPM_DIRECTIVO_DEFAULT = 135;

/**
 * Cuenta palabras limpias separadas por espacios
 */
export function contarPalabras(texto: string): number {
  if (!texto) return 0;
  return texto
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Calcula la duración estimada en segundos a partir de palabras y WPM
 */
export function estimarSegundos(palabras: number, wpm = WPM_DIRECTIVO_DEFAULT): number {
  if (palabras <= 0) return 0;
  return Math.round((palabras / wpm) * 60);
}

/**
 * Genera el guion estructurado de 60 segundos para Reel B2B
 */
export function generarGuionReel(input: InputGuionReel): GuionReelCompleto {
  const dolor =
    input.copy_tres_pasos?.dolor ||
    input.copy_tres_pasos?.paso1_dolor ||
    input.cuerpo_texto ||
    input.titulo_portada;
  const reencuadre =
    input.copy_tres_pasos?.reencuadre ||
    input.copy_tres_pasos?.paso2_reencuadre ||
    "La claridad directiva no se logra exigiendo más esfuerzo, sino rediseñando la arquitectura del flujo de trabajo.";
  const direccion =
    input.copy_tres_pasos?.direccion ||
    input.copy_tres_pasos?.paso3_direccion_web ||
    "Completá el diagnóstico de 4 dimensiones en mejoraok.com para identificar la fuga exacta de tiempo.";

  // 1. BLOQUE 1: GANCHO DE QUIEBRE (0s - 5s)
  // Máximo impacto, detiene el scroll de decisores C-Level sin rodeos
  let textoGancho = dolor;
  if (!textoGancho.endsWith(".")) textoGancho += ".";
  // Si es muy largo, sintetizar para mantenerlo en ~15 palabras
  const palabrasGancho = contarPalabras(textoGancho);
  if (palabrasGancho > 22) {
    const recorte = textoGancho.split(/\s+/).slice(0, 18).join(" ");
    textoGancho = `${recorte}... ¿Te suena familiar?`;
  }

  const bloqueGancho: BloqueGuion = {
    id: "gancho",
    nombre: "Gancho de Quiebre (0-5s)",
    segundoInicio: 0,
    segundoFin: 5,
    duracionSegundos: 5,
    indicacionCamara: "Plano medio corto. Mirada directa y serena a la lente. Sin saludos ni presentaciones.",
    texto: textoGancho,
    palabras: contarPalabras(textoGancho),
    notasDirector: "Énfasis en la última frase. Detener el scroll nombrando la fricción real.",
  };

  // 2. BLOQUE 2: REENCUADRE Y METODOLOGÍA (5s - 45s)
  // Desarrollo en 3 tiempos con ritmo claro y pausas marcadas
  const textoMetodologia =
    `El error no está en la capacidad de tu equipo, sino en el sistema que los coordina. [PAUSA] ` +
    `${reencuadre} ` +
    `Cuando un proceso depende exclusivamente de la memoria o de urgencias por WhatsApp, el cuello de botella siempre termina en la dirección. [PAUSA] ` +
    `Para destrabarlo, se necesitan tres cosas: visibilidad de métricas duras, acuerdos de servicio internos y delegación por criterios en lugar de órdenes puntuales.`;

  const bloqueMetodologia: BloqueGuion = {
    id: "metodologia",
    nombre: "Metodología y Sistema (5-45s)",
    segundoInicio: 5,
    segundoFin: 45,
    duracionSegundos: 40,
    indicacionCamara: "Plano medio. Gesticulación abierta a la altura del pecho. Pausas marcadas en los corchetes.",
    texto: textoMetodologia,
    palabras: contarPalabras(textoMetodologia),
    notasDirector: "Tono de calidez con verdad. Cero culpas al líder; el foco absoluto es el diseño del proceso.",
  };

  // 3. BLOQUE 3: DIRECCIÓN Y CTA (45s - 60s)
  // Instrucción clara y profesional hacia el diagnóstico en mejoraok.com
  let textoCTA = direccion;
  if (!textoCTA.toLowerCase().includes("mejoraok.com")) {
    textoCTA += " Podés hacer el autodiagnóstico en mejoraok.com para medir las 4 dimensiones de tu empresa.";
  }

  const bloqueCTA: BloqueGuion = {
    id: "cta",
    nombre: "Dirección y Llamado a la Acción (45-60s)",
    segundoInicio: 45,
    segundoFin: 60,
    duracionSegundos: 15,
    indicacionCamara: "Leve acercamiento hacia la cámara. Cierre directivo firme, sereno y profesional.",
    texto: textoCTA,
    palabras: contarPalabras(textoCTA),
    notasDirector: "No vender por precio ni urgencia barata. Señalar el siguiente paso con sobriedad.",
  };

  const bloques = [bloqueGancho, bloqueMetodologia, bloqueCTA];
  const totalPalabras = bloques.reduce((acc, b) => acc + b.palabras, 0);
  const duracionTotalEstimadaSegundos = estimarSegundos(totalPalabras, WPM_DIRECTIVO_DEFAULT);

  // Estimación de retención predictiva: 60s conciso con 3 bloques retiene ~84% en video B2B
  const retencionEstimadaPorcentaje = Math.min(
    92,
    Math.max(75, 88 - Math.max(0, duracionTotalEstimadaSegundos - 60) * 1.5)
  );

  const textoCompletoTeleprompter = bloques
    .map((b) => `[${b.nombre} · ${b.segundoInicio}s-${b.segundoFin}s]\n${b.texto}`)
    .join("\n\n");

  const exportarMarkdown = (): string => {
    return `# Guion de Rodaje B2B (Reel 60s)
**Pieza:** ${input.propuesta_id}
**Título:** ${input.titulo_portada}
**Duración Total Estimada:** ${duracionTotalEstimadaSegundos}s (${totalPalabras} palabras a ${WPM_DIRECTIVO_DEFAULT} WPM)
**Retención Estimada:** ${retencionEstimadaPorcentaje}%

---

## 1. Gancho de Quiebre (00:00 - 00:05)
* **Cámara:** ${bloqueGancho.indicacionCamara}
* **Dirección:** ${bloqueGancho.notasDirector}
> "${bloqueGancho.texto}"

---

## 2. Metodología y Sistema (00:05 - 00:45)
* **Cámara:** ${bloqueMetodologia.indicacionCamara}
* **Dirección:** ${bloqueMetodologia.notasDirector}
> "${bloqueMetodologia.texto}"

---

## 3. Dirección y Cierre (00:45 - 01:00)
* **Cámara:** ${bloqueCTA.indicacionCamara}
* **Dirección:** ${bloqueCTA.notasDirector}
> "${bloqueCTA.texto}"

---
*Generado automáticamente por MejoraSM — Motor de Redes B2B*
`;
  };

  return {
    propuesta_id: input.propuesta_id,
    titulo: input.titulo_portada,
    duracionTotalEstimadaSegundos,
    totalPalabras,
    wpmRecomendado: WPM_DIRECTIVO_DEFAULT,
    retencionEstimadaPorcentaje,
    bloques,
    textoCompletoTeleprompter,
    resumenDirector: `${totalPalabras} palabras (~${duracionTotalEstimadaSegundos}s de rodaje). Ritmo sereno de 135 WPM con pausas de énfasis directivo.`,
    ctaCanonica: textoCTA,
    exportarMarkdown,
  };
}
