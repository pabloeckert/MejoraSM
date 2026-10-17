// scripts/poblar-boveda-sqlite.mjs
// SCRIPT DE POBLAMIENTO Y BOOTSTRAP DE LA BASE LOCAL SOBERANA EN SQLITE (MejoraSM 2026)
// Ingesta 78 piezas reales de contenido (26 semanas x 3 días) bajo la Bóveda de Conocimiento.
// Estructura de 4 pasos (Dolor, Reencuadre, Engagement, Conversión) y segmentación por Buyer Persona.

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "data", "mejora_sm.db");

// Asegurar directorio data/
fs.mkdirSync(path.join(ROOT_DIR, "data"), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

// 1. Crear Esquema
const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS boveda_fichas (
  id TEXT PRIMARY KEY,
  origen_carpeta TEXT NOT NULL,
  dimension TEXT NOT NULL,
  tipo_activo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  contenido_raw TEXT NOT NULL,
  metadatos_multimedia TEXT,
  fase_comercial_sugerida TEXT NOT NULL,
  creado_el TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS propuestas_sm (
  propuesta_id TEXT PRIMARY KEY,
  canal_destino TEXT NOT NULL,
  dia_programado TEXT NOT NULL,
  origen_boveda_id TEXT NOT NULL,
  borradores_json TEXT NOT NULL,
  borrador_seleccionado TEXT NOT NULL DEFAULT 'A',
  tratamiento_visual_json TEXT NOT NULL,
  imagen_boveda_json TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente_revision',
  motivo_rechazo TEXT,
  metricas_json TEXT,
  creado_el TEXT NOT NULL,
  actualizado_el TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metricas_atribucion (
  id TEXT PRIMARY KEY,
  propuesta_id TEXT NOT NULL,
  canal TEXT NOT NULL,
  buyer_persona TEXT NOT NULL,
  dimension TEXT NOT NULL,
  formato TEXT NOT NULL,
  dia_semana TEXT NOT NULL,
  horario_publicacion TEXT NOT NULL,
  clics_mejoraok INTEGER NOT NULL DEFAULT 0,
  diagnosticos_completados INTEGER NOT NULL DEFAULT 0,
  score_impacto REAL NOT NULL DEFAULT 0.0,
  registrado_el TEXT NOT NULL,
  FOREIGN KEY (propuesta_id) REFERENCES propuestas_sm(propuesta_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_boveda_dimension ON boveda_fichas(dimension);
CREATE INDEX IF NOT EXISTS idx_boveda_capa ON boveda_fichas(origen_carpeta);
CREATE INDEX IF NOT EXISTS idx_propuestas_estado ON propuestas_sm(estado);
CREATE INDEX IF NOT EXISTS idx_propuestas_dia ON propuestas_sm(dia_programado);
CREATE INDEX IF NOT EXISTS idx_metricas_persona ON metricas_atribucion(buyer_persona);
`;

db.exec(CREATE_TABLES_SQL);

// 2. Importar o invocar la lógica canónica de la Grilla 26 semanas
const FOTOS_REALES_BOVEDA = [
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

// Fichas de Bóveda Canónicas (4 Capas: Constitución, Autoridad, Experiencia, Networking)
const FICHAS_BOVEDA = [
  {
    id: "BOV-2026-CONST-001",
    origen_carpeta: "constitucion",
    dimension: "empresarial",
    tipo_activo: "texto_markdown",
    titulo: "Manifiesto de Marca: Calidez con Verdad y Nunca a la Persona",
    contenido_raw: "En Mejora Continua no juzgamos a los fundadores ni a los líderes. La fricción operativa no se debe a que la persona no sepa trabajar, sino a que los sistemas y estructuras actuales quedaron chicos frente al crecimiento.",
    fase_comercial_sugerida: "tofu_atraccion",
    creado_el: "2026-10-15T10:00:00.000Z",
  },
  {
    id: "BOV-2026-AUTO-001",
    origen_carpeta: "autoridad",
    dimension: "profesionalizacion",
    tipo_activo: "texto_markdown",
    titulo: "Metodología de Profesionalización PyME en 4 Dimensiones",
    contenido_raw: "El salto de la empresa intuitiva a la empresa profesional se apoya en 4 pilares: Personal (despegar al dueño), Organizacional (roles y procesos documentados), Comercial (embudo y valor sin descuento), y Empresarial (caja libre y rentabilidad).",
    fase_comercial_sugerida: "mofu_educacion",
    creado_el: "2026-10-15T11:00:00.000Z",
  },
  {
    id: "BOV-2026-EXP-001",
    origen_carpeta: "experiencia",
    dimension: "comercial",
    tipo_activo: "texto_markdown",
    titulo: "Casos Reales de Transformación Operativa en Plantas Industriales",
    contenido_raw: "Análisis forense de cuellos de botella en plantas metalmecánicas y alimenticias. Cómo reducir el tiempo de ciclo en un 35% implementando tableros visuales y reuniones operativas de 15 minutos sin burocracia.",
    fase_comercial_sugerida: "mofu_educacion",
    creado_el: "2026-10-15T12:00:00.000Z",
  },
  {
    id: "BOV-2026-NET-001",
    origen_carpeta: "networking_y_autoridad",
    dimension: "networking_y_autoridad",
    tipo_activo: "imagen_con_texto",
    titulo: "Mesa Directiva C-Level Rosario: Gobierno Corporativo",
    contenido_raw: "Encuentro reservado de 14 directores generales. La soledad del líder se resuelve compartiendo desafíos de escala con pares del mismo nivel.",
    metadatos_multimedia: {
      ruta_archivo_local: "content/boveda/04_networking/img_clevel_rosario_2026.jpg",
      personas_presentes: ["Pablo (Director Mejora Continua)", "Presidentes de Compañías PyME"],
      orientacion_original: "horizontal",
    },
    fase_comercial_sugerida: "mofu_educacion",
    creado_el: "2026-10-15T18:30:00.000Z",
  },
];

// Guardar Fichas de Bóveda
const stmtFicha = db.prepare(`
  INSERT INTO boveda_fichas (
    id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw,
    metadatos_multimedia, fase_comercial_sugerida, creado_el
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    origen_carpeta = excluded.origen_carpeta,
    dimension = excluded.dimension,
    tipo_activo = excluded.tipo_activo,
    titulo = excluded.titulo,
    contenido_raw = excluded.contenido_raw,
    metadatos_multimedia = excluded.metadatos_multimedia,
    fase_comercial_sugerida = excluded.fase_comercial_sugerida;
`);

for (const f of FICHAS_BOVEDA) {
  stmtFicha.run(
    f.id,
    f.origen_carpeta,
    f.dimension,
    f.tipo_activo,
    f.titulo,
    f.contenido_raw,
    f.metadatos_multimedia ? JSON.stringify(f.metadatos_multimedia) : null,
    f.fase_comercial_sugerida,
    f.creado_el
  );
}

// 3. Generar las 78 piezas reales
const MATRIZ_TEMAS = {
  personal: [
    {
      titulo: "El cuello de botella sos vos",
      dolor: "Si cada decisión del día tiene que pasar por tu escritorio, no tenés una empresa: tenés un autoempleo de alto riesgo.",
      reencuadre: "El liderazgo profesional no consiste en controlar cada paso, sino en diseñar procesos donde el equipo sepa qué hacer sin consultarte.",
      persona: "emprendedor_saturado",
    },
    {
      titulo: "La trampa de apagar incendios",
      dolor: "Llegás a las 7 de la tarde agotado habiendo resuelto mil urgencias, pero sin haber movido un milímetro la estrategia.",
      reencuadre: "Apagar incendios no es trabajar: es el síntoma de no tener protocolos de delegación y orden operativo.",
      persona: "emprendedor_saturado",
    },
    {
      titulo: "Foco o dispersión",
      dolor: "Saltar de idea en idea genera entusiasmo en el líder pero parálisis y frustración en el equipo.",
      reencuadre: "La claridad directiva se mide por lo que decidís NO hacer esta semana.",
      persona: "orden_para_crecer",
    },
  ],
  organizacional: [
    {
      titulo: "¿Por qué nadie hace las cosas como vos?",
      dolor: "Decís 'lo tengo que hacer yo para que salga bien' y terminás rehaciendo el trabajo de los demás.",
      reencuadre: "No es que a la gente no le importe; es que el estándar de calidad vive en tu cabeza y nunca fue documentado en un proceso transferible.",
      persona: "orden_para_crecer",
    },
    {
      titulo: "Roles claros vs. culpas compartidas",
      dolor: "Cuando algo sale mal, todos se miran entre sí y nadie se hace responsable.",
      reencuadre: "Donde todos son responsables, nadie es responsable. La claridad de roles es el primer acto de cuidado hacia el equipo.",
      persona: "empresario_mal_asesorado",
    },
    {
      titulo: "Cultura de resultados sin miedo",
      dolor: "Tus colaboradores ocultan los problemas hasta que ya es demasiado tarde y el cliente se queja.",
      reencuadre: "Si penalizás la verdad, premiás el silencio. Calidez con verdad significa mirar los datos duros sin agredir a la persona.",
      persona: "orden_para_crecer",
    },
  ],
  comercial: [
    {
      titulo: "No se vende por precio",
      dolor: "Tus comerciales bajan el margen apenas el cliente duda o pide descuento.",
      reencuadre: "Bajar el precio es el camino más rápido para fundirse trabajando el doble. Se vende por valor, previsibilidad y cumplimiento.",
      persona: "empresario_mal_asesorado",
    },
    {
      titulo: "Pipeline comercial sin adivinanzas",
      dolor: "No sabés cuánto vas a facturar el mes que viene hasta que no entran los cobros del banco.",
      reencuadre: "La facturación no es suerte: es la consecuencia matemática de prospectos calificados y seguimiento riguroso.",
      persona: "orden_para_crecer",
    },
    {
      titulo: "El seguimiento que no es molestia",
      dolor: "El 80% de las operaciones se pierden porque nadie volvió a llamar después del primer presupuesto.",
      reencuadre: "Seguimiento no es insistir; es acompañar la decisión del cliente con datos de valor y criterio.",
      persona: "emprendedor_saturado",
    },
  ],
  empresarial: [
    {
      titulo: "Facturar más no es ganar más",
      dolor: "Récord de ventas en el año, pero la cuenta bancaria sigue en rojo y no alcanza para reinvertir.",
      reencuadre: "El crecimiento sin rentabilidad no es éxito: es acelerar hacia el abismo. El modelo de negocio se mide en caja libre, no en vanidad.",
      persona: "empresario_mal_asesorado",
    },
    {
      titulo: "Dejar de financiar a tus clientes",
      dolor: "Entregás la mercadería o el servicio hoy, y te pagan a 60 días sin interés mientras pagás sueldos al contado.",
      reencuadre: "Tu empresa no es un banco. La política de cobranzas debe ser tan firme como la promesa de entrega.",
      persona: "empresario_mal_asesorado",
    },
    {
      titulo: "Construir valor patrimonial",
      dolor: "¿Tu empresa vale algo si mañana vos no vas a trabajar por 3 meses?",
      reencuadre: "Una empresa vale por sus sistemas, sus clientes recurrentes y sus contratos, no por la presencia física de su fundador.",
      persona: "orden_para_crecer",
    },
  ],
  profesionalizacion: [
    {
      titulo: "El salto de pyme intuitiva a empresa profesional",
      dolor: "Llegaste a un techo de facturación y cada nuevo cliente genera más caos que beneficio.",
      reencuadre: "Lo que te trajo hasta acá no es lo que te va a llevar al siguiente nivel. Se requiere pasar de la intuición al método.",
      persona: "orden_para_crecer",
    },
    {
      titulo: "Tableros de control con números que no mienten",
      dolor: "Tomás decisiones en base a sensaciones o estados de ánimo en lugar de indicadores objetivos.",
      reencuadre: "Lo que no se mide no se gestiona. Cinco números semanales claros superan a 200 informes que nadie lee.",
      persona: "emprendedor_saturado",
    },
    {
      titulo: "Reuniones de 30 minutos que resuelven",
      dolor: "Horas de reuniones eternas donde se habla mucho y nadie ejecuta nada.",
      reencuadre: "Una reunión sin agenda previa, sin responsable de acta y sin fecha límite no es trabajo: es pérdida de dinero.",
      persona: "empresario_mal_asesorado",
    },
  ],
  networking_y_autoridad: [
    {
      titulo: "En la mesa con quienes deciden el rumbo",
      dolor: "Muchos empresarios intentan resolver solos problemas que otros pares ya superaron con éxito.",
      reencuadre: "La soledad del líder se cura compartiendo mesa de trabajo con pares directivos de su mismo nivel de desafío.",
      persona: "empresario_mal_asesorado",
    },
    {
      titulo: "Visita a plantas: Donde se ve la verdad de las operaciones",
      dolor: "Las teorías de gestión suenan bien en un libro, pero chocan con la realidad del piso de planta.",
      reencuadre: "Acompañamos a dueños y directores en el terreno, donde los procesos cobran vida y los cuellos de botella se resuelven.",
      persona: "orden_para_crecer",
    },
    {
      titulo: "Alianzas estratégicas C-Level sin intermediarios",
      dolor: "Hacer networking tradicional de tarjetas de presentación rara vez genera negocios de fondo.",
      reencuadre: "La autoridad empresarial se construye resolviendo problemas reales junto a los líderes que transforman industrias.",
      persona: "emprendedor_saturado",
    },
  ],
};

const DIMENSIONES = ["personal", "organizacional", "comercial", "empresarial", "profesionalizacion", "networking_y_autoridad"];
const CANALES = ["linkedin", "instagram", "facebook", "whatsapp"];
const SEMANAS_RIGHT_HOOK = new Set([1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 25, 26]);

const stmtPropuesta = db.prepare(`
  INSERT INTO propuestas_sm (
    propuesta_id, canal_destino, dia_programado, origen_boveda_id,
    borradores_json, borrador_seleccionado, tratamiento_visual_json,
    imagen_boveda_json, estado, motivo_rechazo, metricas_json,
    creado_el, actualizado_el
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(propuesta_id) DO UPDATE SET
    canal_destino = excluded.canal_destino,
    dia_programado = excluded.dia_programado,
    borradores_json = excluded.borradores_json,
    borrador_seleccionado = excluded.borrador_seleccionado,
    tratamiento_visual_json = excluded.tratamiento_visual_json,
    imagen_boveda_json = excluded.imagen_boveda_json,
    estado = excluded.estado,
    motivo_rechazo = excluded.motivo_rechazo,
    metricas_json = excluded.metricas_json,
    actualizado_el = excluded.actualizado_el;
`);

const stmtMetrica = db.prepare(`
  INSERT INTO metricas_atribucion (
    id, propuesta_id, canal, buyer_persona, dimension, formato,
    dia_semana, horario_publicacion, clics_mejoraok, diagnosticos_completados,
    score_impacto, registrado_el
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    clics_mejoraok = excluded.clics_mejoraok,
    diagnosticos_completados = excluded.diagnosticos_completados,
    score_impacto = excluded.score_impacto;
`);

let totalJabs = 0;
let totalHooks = 0;
let globalIndex = 0;
const cursorDate = new Date("2026-10-19T09:30:00.000Z");

for (let s = 1; s <= 26; s++) {
  const inicioSemana = new Date(cursorDate);
  const diasOffsets = [0, 2, 4];
  const nombresDias = ["Lunes", "Miércoles", "Viernes"];

  for (let p = 0; p < 3; p++) {
    globalIndex++;
    const diaPieza = new Date(inicioSemana);
    diaPieza.setDate(diaPieza.getDate() + diasOffsets[p]);
    diaPieza.setHours(9, 30, 0, 0);

    const esRightHook = p === 2 && SEMANAS_RIGHT_HOOK.has(s);
    if (esRightHook) totalHooks++;
    else totalJabs++;

    const dimIndex = (globalIndex - 1) % DIMENSIONES.length;
    const dimension = DIMENSIONES[dimIndex];
    const temas = MATRIZ_TEMAS[dimension];
    const tema = temas[Math.floor((globalIndex - 1) / DIMENSIONES.length) % temas.length];

    const canal = CANALES[p % CANALES.length];
    const propId = `PROP-2026-W${String(s).padStart(2, "0")}-${String(p + 1).padStart(2, "0")}`;
    const bovedaId = `BOV-2026-${dimension.slice(0, 3).toUpperCase()}-${String(globalIndex).padStart(3, "0")}`;
    const foto = FOTOS_REALES_BOVEDA[(globalIndex - 1) % FOTOS_REALES_BOVEDA.length];

    const engagementNativo = canal === "linkedin"
      ? "¿Tu equipo vive esta fricción en la diaria? Dejanos tu punto de vista en los comentarios o reposteá si tu equipo necesita este debate."
      : canal === "instagram"
      ? "Comentá 'PROCESO' y te enviamos la plantilla práctica por mensaje privado. Guardá este posteo para tu próxima reunión directiva."
      : canal === "facebook"
      ? "¿Cómo resuelven este desafío en tu empresa? Contanos tu experiencia en los comentarios."
      : "¿Te pasa esto en tu empresa? Respondé a este mensaje para analizar cómo ordenarlo.";

    const conversionLead = "Hacé el test de diagnóstico de 4 dimensiones sin complacencia en mejoraok.com y detectá tus cuellos de botella.";

    const c4A = {
      paso1_dolor: tema.dolor,
      paso2_reencuadre: tema.reencuadre,
      paso3_engagement_nativo: engagementNativo,
      paso4_conversion_lead: esRightHook ? conversionLead : undefined,
    };

    const c4B = {
      paso1_dolor: `En empresas consolidadas, ${tema.dolor.toLowerCase()}`,
      paso2_reencuadre: tema.reencuadre,
      paso3_engagement_nativo: "¿Coincidís con esta perspectiva directiva? Compartí tu opinión abajo.",
      paso4_conversion_lead: esRightHook ? conversionLead : undefined,
    };

    const c4C = {
      paso1_dolor: tema.dolor,
      paso2_reencuadre: "La claridad directiva comienza por medir con números duros las 4 dimensiones de tu empresa.",
      paso3_engagement_nativo: esRightHook ? "Completá el test diagnóstico para recibir el informe." : engagementNativo,
      paso4_conversion_lead: esRightHook ? conversionLead : undefined,
    };

    const borradorA = {
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
      slides: [tema.titulo, tema.dolor, "La causa raíz operativa que no se suele mirar.", tema.reencuadre, esRightHook ? "Diagnóstico en mejoraok.com" : engagementNativo],
      cta_texto: esRightHook ? "Completar diagnóstico en mejoraok.com" : "Deslizá para ordenar tu proceso directivo",
    };

    const borradorB = {
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

    const borradorC = {
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

    const tratamientoVisual = {
      marco_expandido_requerido: true,
      color_fondo_marco: "#FFFFFF",
      regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
      relacion_aspecto_destino: "4:5",
    };

    const imagenBoveda = {
      id: foto.id,
      ruta_archivo_local: foto.ruta,
      titulo: foto.titulo,
    };

    const metricas = {
      clics_mejoraok: esRightHook ? Math.floor(Math.random() * 45) + 12 : 0,
      diagnosticos_completados: esRightHook ? Math.floor(Math.random() * 15) + 3 : 0,
      buyer_persona_predominante: tema.persona,
    };

    const now = new Date().toISOString();
    stmtPropuesta.run(
      propId,
      canal,
      diaPieza.toISOString(),
      bovedaId,
      JSON.stringify([borradorA, borradorB, borradorC]),
      esRightHook ? "C" : p % 2 === 0 ? "A" : "B",
      JSON.stringify(tratamientoVisual),
      JSON.stringify(imagenBoveda),
      "pendiente_revision",
      null,
      JSON.stringify(metricas),
      now,
      now
    );

    // Métrica de atribución
    const scoreImpacto = esRightHook ? (metricas.clics_mejoraok * 1.5 + metricas.diagnosticos_completados * 10) : (Math.floor(Math.random() * 25) + 5);
    stmtMetrica.run(
      `MET-${propId}`,
      propId,
      canal,
      tema.persona,
      dimension,
      borradorA.tipo_formato,
      nombresDias[p],
      "09:30",
      metricas.clics_mejoraok,
      metricas.diagnosticos_completados,
      scoreImpacto,
      diaPieza.toISOString()
    );
  }

  cursorDate.setDate(cursorDate.getDate() + 7);
}

// 4. Verificación
const countPropuestas = db.prepare("SELECT count(*) as total FROM propuestas_sm").get().total;
const countFichas = db.prepare("SELECT count(*) as total FROM boveda_fichas").get().total;
const countMetricas = db.prepare("SELECT count(*) as total FROM metricas_atribucion").get().total;

console.log("==================================================");
console.log(" POBLAMIENTO SOBERANO EN SQLITE COMPLETADO");
console.log("==================================================");
console.log(`Base de datos: ${DB_PATH}`);
console.log(`Propuestas SM creadas: ${countPropuestas} (63 Jabs, 15 Right Hooks)`);
console.log(`Fichas de Bóveda: ${countFichas}`);
console.log(`Registros de Métricas: ${countMetricas}`);
console.log(`Balance: Jabs: ${totalJabs} (${Math.round((totalJabs / countPropuestas) * 100)}%), Right Hooks: ${totalHooks} (${Math.round((totalHooks / countPropuestas) * 100)}%)`);
console.log("==================================================");

db.close();
