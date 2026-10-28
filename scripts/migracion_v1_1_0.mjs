// scripts/migracion_v1_1_0.mjs
// MIGRACIÓN 001 ATÓMICA Y SOBERANA — PARCHE v1.1.0 (FASE 1 SRE HARDENING ZERO-TRUST)
// Motor: node:sqlite nativo (DatabaseSync) · Modo STRICT en todas las tablas
// Idempotencia determinística sha256 con zona horaria America/Argentina/Buenos_Aires
// Validación ISO-8601 UTC ('????-??-??T??:??:??.???Z') · Patrón Lease & Dead-Letter

import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

export const MIN_SQLITE_VERSION = "3.37.0";
export const TARGET_USER_VERSION = 110; // 1.1.0

export function parseSqliteVersion(v) {
  return v.split(".").map(Number);
}

export function isVersionSupported(v) {
  const current = parseSqliteVersion(v);
  const min = parseSqliteVersion(MIN_SQLITE_VERSION);
  for (let i = 0; i < 3; i++) {
    const c = current[i] || 0;
    const m = min[i] || 0;
    if (c > m) return true;
    if (c < m) return false;
  }
  return true;
}

export function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

export function toIsoUtc(dateOrStr) {
  const d = typeof dateOrStr === "string" ? new Date(dateOrStr) : dateOrStr;
  if (isNaN(d.getTime())) {
    throw new Error(`Fecha inválida: ${dateOrStr}`);
  }
  return d.toISOString();
}

export function getFechaProgramadaART(isoDate) {
  const d = new Date(isoDate);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d); // YYYY-MM-DD
}

export function escapeDelimiter(val) {
  return String(val || "")
    .normalize("NFC")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|");
}

export function generarClaveIdempotencia(propuestaId, canal, borradorOpcion, diaProgramadoIso) {
  const normPropuesta = escapeDelimiter(propuestaId);
  const normCanal = escapeDelimiter(canal).toLowerCase();
  const normOpcion = escapeDelimiter(borradorOpcion || "A");
  const fechaART = getFechaProgramadaART(diaProgramadoIso);
  const payload = `${normPropuesta}|${normCanal}|${normOpcion}|${fechaART}`;
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}


export const DDL_STRICT_SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS outbox_transiciones_permitidas (
  estado_origen TEXT NOT NULL,
  estado_destino TEXT NOT NULL,
  PRIMARY KEY (estado_origen, estado_destino)
) STRICT;

INSERT OR IGNORE INTO outbox_transiciones_permitidas (estado_origen, estado_destino) VALUES
  ('BORRADOR', 'APROBADO'),
  ('BORRADOR', 'CANCELADO'),
  ('APROBADO', 'EN_COLA'),
  ('APROBADO', 'CANCELADO'),
  ('EN_COLA', 'DESPACHANDO'),
  ('EN_COLA', 'CANCELADO'),
  ('DESPACHANDO', 'PUBLICADO'),
  ('DESPACHANDO', 'REINTENTO'),
  ('DESPACHANDO', 'DEAD_LETTER'),
  ('DESPACHANDO', 'EN_COLA'),
  ('REINTENTO', 'EN_COLA'),
  ('REINTENTO', 'DEAD_LETTER'),
  ('REINTENTO', 'CANCELADO'),
  ('DEAD_LETTER', 'EN_COLA');

CREATE TABLE IF NOT EXISTS boveda_fichas (
  id TEXT PRIMARY KEY,
  origen_carpeta TEXT NOT NULL,
  dimension TEXT NOT NULL,
  tipo_activo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  contenido_raw TEXT NOT NULL,
  metadatos_multimedia TEXT,
  fase_comercial_sugerida TEXT NOT NULL,
  creado_el TEXT NOT NULL CHECK (creado_el GLOB '????-??-??T??:??:??.???Z')
) STRICT;

CREATE TABLE IF NOT EXISTS propuestas_sm (
  propuesta_id TEXT PRIMARY KEY,
  canal_destino TEXT NOT NULL,
  dia_programado TEXT NOT NULL CHECK (dia_programado GLOB '????-??-??T??:??:??.???Z'),
  origen_boveda_id TEXT NOT NULL,
  imagen_boveda_id TEXT,
  borradores_json TEXT NOT NULL,
  borrador_seleccionado TEXT NOT NULL DEFAULT 'A',
  tratamiento_visual_json TEXT NOT NULL,
  imagen_boveda_json TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente_revision',
  motivo_rechazo TEXT,
  metricas_json TEXT,
  creado_el TEXT NOT NULL CHECK (creado_el GLOB '????-??-??T??:??:??.???Z'),
  actualizado_el TEXT NOT NULL CHECK (actualizado_el GLOB '????-??-??T??:??:??.???Z')
) STRICT;

CREATE TABLE IF NOT EXISTS borradores (
  borrador_id TEXT PRIMARY KEY,
  propuesta_id TEXT NOT NULL,
  opcion TEXT NOT NULL CHECK (opcion IN ('A', 'B', 'C')),
  tipo_formato TEXT NOT NULL,
  estrategia TEXT NOT NULL,
  titulo_portada TEXT NOT NULL,
  cuerpo_texto TEXT NOT NULL,
  copy_tres_pasos_json TEXT NOT NULL,
  copy_cuatro_pasos_json TEXT,
  slides_json TEXT,
  cta_texto TEXT NOT NULL,
  creado_el TEXT NOT NULL CHECK (creado_el GLOB '????-??-??T??:??:??.???Z'),
  FOREIGN KEY (propuesta_id) REFERENCES propuestas_sm(propuesta_id) ON DELETE CASCADE
) STRICT;

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
  registrado_el TEXT NOT NULL CHECK (registrado_el GLOB '????-??-??T??:??:??.???Z'),
  FOREIGN KEY (propuesta_id) REFERENCES propuestas_sm(propuesta_id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS prospectos (
  prospecto_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,
  nombre TEXT NOT NULL,
  empresa TEXT,
  estado TEXT NOT NULL DEFAULT 'CAPTURADO' CHECK (estado IN (
    'CAPTURADO','CALIFICADO','DESCARTADO','EN_SEGUIMIENTO',
    'PROPUESTA_ENVIADA','CERRADO_GANADO','CERRADO_PERDIDO','REACTIVADO'
  )),
  origen_utm TEXT,
  pieza_id_atribucion TEXT NOT NULL,
  perfil_detectado_id TEXT,
  motivo_descarte_id TEXT,
  fecha_captura TEXT NOT NULL CHECK (fecha_captura GLOB '????-??-??T??:??:??.???Z'),
  fecha_actualizacion TEXT NOT NULL CHECK (fecha_actualizacion GLOB '????-??-??T??:??:??.???Z'),
  sla_limite_calificacion TEXT NOT NULL CHECK (sla_limite_calificacion GLOB '????-??-??T??:??:??.???Z')
) STRICT;

CREATE TABLE IF NOT EXISTS prospecto_eventos_log (
  evento_id TEXT PRIMARY KEY,
  prospecto_id TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  motivo_catalogo TEXT,
  metadata_json TEXT,
  creado_en TEXT NOT NULL CHECK (creado_en GLOB '????-??-??T??:??:??.???Z'),
  FOREIGN KEY (prospecto_id) REFERENCES prospectos(prospecto_id)
) STRICT;

CREATE TRIGGER IF NOT EXISTS trg_prospecto_eventos_no_update
BEFORE UPDATE ON prospecto_eventos_log
BEGIN SELECT RAISE(ABORT, 'prospecto_eventos_log es append-only: UPDATE prohibido'); END;

CREATE TRIGGER IF NOT EXISTS trg_prospecto_eventos_no_delete
BEFORE DELETE ON prospecto_eventos_log
BEGIN SELECT RAISE(ABORT, 'prospecto_eventos_log es append-only: DELETE prohibido'); END;

CREATE TABLE IF NOT EXISTS outbox_posts (
  post_id TEXT PRIMARY KEY,
  propuesta_id TEXT NOT NULL,
  canal TEXT NOT NULL,
  borrador_opcion TEXT NOT NULL CHECK (borrador_opcion IN ('A', 'B', 'C')),
  estado_post TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estado_post IN (
    'BORRADOR','APROBADO','EN_COLA','DESPACHANDO',
    'PUBLICADO','REINTENTO','DEAD_LETTER','CANCELADO'
  )),
  reintentos_cont INTEGER NOT NULL DEFAULT 0,
  clave_idempotencia TEXT NOT NULL UNIQUE,
  lease_owner TEXT,
  lease_expira_at TEXT CHECK (lease_expira_at IS NULL OR lease_expira_at GLOB '????-??-??T??:??:??.???Z'),
  proximo_reintento_at TEXT CHECK (proximo_reintento_at IS NULL OR proximo_reintento_at GLOB '????-??-??T??:??:??.???Z'),
  error_ultimo TEXT,
  creado_en TEXT NOT NULL CHECK (creado_en GLOB '????-??-??T??:??:??.???Z'),
  actualizado_en TEXT NOT NULL CHECK (actualizado_en GLOB '????-??-??T??:??:??.???Z'),
  FOREIGN KEY (propuesta_id) REFERENCES propuestas_sm(propuesta_id) ON DELETE CASCADE
) STRICT;

CREATE TRIGGER IF NOT EXISTS trg_outbox_posts_validate_transition
BEFORE UPDATE OF estado_post ON outbox_posts
FOR EACH ROW
WHEN OLD.estado_post != NEW.estado_post
BEGIN
  SELECT RAISE(ABORT, 'Transición de estado no permitida en outbox_posts')
  WHERE NOT EXISTS (
    SELECT 1 FROM outbox_transiciones_permitidas
    WHERE estado_origen = OLD.estado_post AND estado_destino = NEW.estado_post
  );
END;

CREATE TABLE IF NOT EXISTS outbox_eventos_log (
  evento_id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  motivo_catalogo TEXT,
  metadata_json TEXT,
  creado_en TEXT NOT NULL CHECK (creado_en GLOB '????-??-??T??:??:??.???Z'),
  FOREIGN KEY (post_id) REFERENCES outbox_posts(post_id) ON DELETE CASCADE
) STRICT;

CREATE TRIGGER IF NOT EXISTS trg_outbox_eventos_no_update
BEFORE UPDATE ON outbox_eventos_log
BEGIN SELECT RAISE(ABORT, 'outbox_eventos_log es append-only: UPDATE prohibido'); END;

CREATE TRIGGER IF NOT EXISTS trg_outbox_eventos_no_delete
BEFORE DELETE ON outbox_eventos_log
BEGIN SELECT RAISE(ABORT, 'outbox_eventos_log es append-only: DELETE prohibido'); END;

CREATE TABLE IF NOT EXISTS contactos (
  id INTEGER PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT,
  telefono TEXT NOT NULL,
  email TEXT,
  empresa TEXT,
  cargo TEXT,
  origen TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'whatsapp', 'import_excel', 'frontdesk', 'crm', 'web')),
  estado TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'activo', 'inactivo', 'prospecto', 'cliente', 'archivado')),
  notas TEXT,
  creado_el TEXT NOT NULL CHECK (creado_el GLOB '????-??-??T??:??:??.???Z'),
  actualizado_el TEXT NOT NULL CHECK (actualizado_el GLOB '????-??-??T??:??:??.???Z')
) STRICT;

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'vendedor' CHECK (rol IN ('admin', 'dueno', 'gerente', 'vendedor', 'operador')),
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  creado_el TEXT NOT NULL CHECK (creado_el GLOB '????-??-??T??:??:??.???Z'),
  actualizado_el TEXT NOT NULL CHECK (actualizado_el GLOB '????-??-??T??:??:??.???Z')
) STRICT;

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_boveda_dimension ON boveda_fichas(dimension);
CREATE INDEX IF NOT EXISTS idx_boveda_capa ON boveda_fichas(origen_carpeta);
CREATE INDEX IF NOT EXISTS idx_propuestas_estado ON propuestas_sm(estado);
CREATE INDEX IF NOT EXISTS idx_propuestas_dia ON propuestas_sm(dia_programado);
CREATE INDEX IF NOT EXISTS idx_propuestas_estado_dia ON propuestas_sm(estado, dia_programado ASC);
CREATE INDEX IF NOT EXISTS idx_propuestas_boveda ON propuestas_sm(origen_boveda_id);
CREATE INDEX IF NOT EXISTS idx_propuestas_imagen ON propuestas_sm(imagen_boveda_id);
CREATE INDEX IF NOT EXISTS idx_borradores_propuesta ON borradores(propuesta_id, opcion);
CREATE INDEX IF NOT EXISTS idx_metricas_persona ON metricas_atribucion(buyer_persona);
CREATE INDEX IF NOT EXISTS idx_prospectos_email ON prospectos(email);
CREATE INDEX IF NOT EXISTS idx_prospectos_estado_sla ON prospectos(estado, sla_limite_calificacion);
CREATE INDEX IF NOT EXISTS idx_outbox_estado_reintento ON outbox_posts(estado_post, proximo_reintento_at);
CREATE INDEX IF NOT EXISTS idx_outbox_lease ON outbox_posts(estado_post, lease_expira_at);
CREATE INDEX IF NOT EXISTS idx_outbox_eventos_post ON outbox_eventos_log(post_id);
CREATE INDEX IF NOT EXISTS idx_contactos_email ON contactos(email);
CREATE INDEX IF NOT EXISTS idx_contactos_telefono ON contactos(telefono);
`;

export function ejecutarMigracion({
  smDbPath,
  nucleoDbPath,
  destDbPath,
  isEnsayo = false,
}) {
  const logPrefix = isEnsayo ? "[ENSAYO]" : "[MIGRACIÓN REAL]";
  console.log(`${logPrefix} Iniciando proceso de migración v1.1.0...`);

  // 1. Verificar versión SQLite
  const checkDb = new DatabaseSync(":memory:");
  const sqliteVer = checkDb.prepare("SELECT sqlite_version() as v").get().v;
  checkDb.close();
  console.log(`${logPrefix} Versión SQLite detectada: ${sqliteVer}`);
  if (!isVersionSupported(sqliteVer)) {
    throw new Error(`ABORT: sqlite_version ${sqliteVer} es inferior a la mínima requerida ${MIN_SQLITE_VERSION}`);
  }

  // 2. Comprobar existencia de orígenes
  if (!fs.existsSync(smDbPath)) {
    throw new Error(`Base de origen SM no existe: ${smDbPath}`);
  }
  if (!fs.existsSync(nucleoDbPath)) {
    throw new Error(`Base de origen Núcleo no existe: ${nucleoDbPath}`);
  }

  // 3. Generar respaldos mediante VACUUM INTO a destinos .pre_v1.1.0
  const smBackupPath = smDbPath + ".pre_v1.1.0";
  const nucleoBackupPath = nucleoDbPath + ".pre_v1.1.0";

  if (fs.existsSync(smBackupPath)) fs.unlinkSync(smBackupPath);
  if (fs.existsSync(nucleoBackupPath)) fs.unlinkSync(nucleoBackupPath);

  const smDbOrig = new DatabaseSync(smDbPath);
  smDbOrig.exec(`VACUUM INTO '${smBackupPath.replace(/\\/g, "/")}'`);
  smDbOrig.close();

  const nucleoDbOrig = new DatabaseSync(nucleoDbPath);
  nucleoDbOrig.exec(`VACUUM INTO '${nucleoBackupPath.replace(/\\/g, "/")}'`);
  nucleoDbOrig.close();

  const smHash = sha256File(smBackupPath);
  const nucleoHash = sha256File(nucleoBackupPath);
  console.log(`${logPrefix} Respaldo SM: ${smBackupPath} (SHA-256: ${smHash})`);
  console.log(`${logPrefix} Respaldo Núcleo: ${nucleoBackupPath} (SHA-256: ${nucleoHash})`);

  // 4. Crear v2.db limpia con DDL STRICT
  if (fs.existsSync(destDbPath)) fs.unlinkSync(destDbPath);
  for (const ext of ["-wal", "-shm"]) {
    if (fs.existsSync(destDbPath + ext)) fs.unlinkSync(destDbPath + ext);
  }

  const v2Db = new DatabaseSync(destDbPath);
  v2Db.exec("PRAGMA journal_mode = WAL;");
  v2Db.exec("PRAGMA busy_timeout = 5000;");
  v2Db.exec("PRAGMA foreign_keys = ON;");
  v2Db.exec("PRAGMA synchronous = NORMAL;");
  v2Db.exec("PRAGMA journal_size_limit = 67108864;"); // 64MB
  v2Db.exec(DDL_STRICT_SCHEMA);

  // 5. Copiar datos desde mejora_sm.db
  const smDb = new DatabaseSync(smDbPath);
  smDb.exec("PRAGMA foreign_keys = ON;");

  // A. boveda_fichas
  const bovedaRows = smDb.prepare("SELECT * FROM boveda_fichas").all();
  const insertBoveda = v2Db.prepare(`
    INSERT INTO boveda_fichas (
      id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw,
      metadatos_multimedia, fase_comercial_sugerida, creado_el
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of bovedaRows) {
    insertBoveda.run(
      row.id,
      row.origen_carpeta,
      row.dimension,
      row.tipo_activo,
      row.titulo,
      row.contenido_raw,
      row.metadatos_multimedia,
      row.fase_comercial_sugerida,
      toIsoUtc(row.creado_el)
    );
  }

  // B. propuestas_sm y desdoble en borradores
  const propuestasRows = smDb.prepare("SELECT * FROM propuestas_sm").all();
  const insertPropuesta = v2Db.prepare(`
    INSERT INTO propuestas_sm (
      propuesta_id, canal_destino, dia_programado, origen_boveda_id, imagen_boveda_id,
      borradores_json, borrador_seleccionado, tratamiento_visual_json, imagen_boveda_json,
      estado, motivo_rechazo, metricas_json, creado_el, actualizado_el
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBorrador = v2Db.prepare(`
    INSERT INTO borradores (
      borrador_id, propuesta_id, opcion, tipo_formato, estrategia,
      titulo_portada, cuerpo_texto, copy_tres_pasos_json, copy_cuatro_pasos_json,
      slides_json, cta_texto, creado_el
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let borradoresCount = 0;
  for (const row of propuestasRows) {
    let imagenBovedaId = null;
    if (row.imagen_boveda_json) {
      try {
        const parsed = JSON.parse(row.imagen_boveda_json);
        imagenBovedaId = parsed.id || null;
      } catch {
        imagenBovedaId = null;
      }
    }

    const creadoEl = toIsoUtc(row.creado_el);
    const actualizadoEl = toIsoUtc(row.actualizado_el);
    const diaProgramado = toIsoUtc(row.dia_programado);

    insertPropuesta.run(
      row.propuesta_id,
      row.canal_destino,
      diaProgramado,
      row.origen_boveda_id,
      imagenBovedaId,
      row.borradores_json,
      row.borrador_seleccionado || "A",
      row.tratamiento_visual_json,
      row.imagen_boveda_json,
      row.estado,
      row.motivo_rechazo || null,
      row.metricas_json || null,
      creadoEl,
      actualizadoEl
    );

    // Desdoblar borradores
    if (row.borradores_json) {
      try {
        const bList = JSON.parse(row.borradores_json);
        if (Array.isArray(bList)) {
          for (const b of bList) {
            const bId = `${row.propuesta_id}_${b.opcion}`;
            insertBorrador.run(
              bId,
              row.propuesta_id,
              b.opcion,
              b.tipo_formato || "post_directo",
              b.estrategia || "jab_educativo",
              b.titulo_portada || "",
              b.cuerpo_texto || "",
              JSON.stringify(b.copy_tres_pasos || {}),
              b.copy_cuatro_pasos ? JSON.stringify(b.copy_cuatro_pasos) : null,
              b.slides ? JSON.stringify(b.slides) : null,
              b.cta_texto || "",
              creadoEl
            );
            borradoresCount++;
          }
        }
      } catch (err) {
        console.warn(`${logPrefix} Error parseando borradores_json de ${row.propuesta_id}:`, err);
      }
    }
  }

  // C. metricas_atribucion
  const metricasRows = smDb.prepare("SELECT * FROM metricas_atribucion").all();
  const insertMetrica = v2Db.prepare(`
    INSERT INTO metricas_atribucion (
      id, propuesta_id, canal, buyer_persona, dimension, formato,
      dia_semana, horario_publicacion, clics_mejoraok, diagnosticos_completados,
      score_impacto, registrado_el
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of metricasRows) {
    insertMetrica.run(
      row.id,
      row.propuesta_id,
      row.canal,
      row.buyer_persona,
      row.dimension,
      row.formato,
      row.dia_semana,
      row.horario_publicacion,
      row.clics_mejoraok,
      row.diagnosticos_completados,
      row.score_impacto,
      toIsoUtc(row.registrado_el)
    );
  }

  // D. prospectos (si existen en SM)
  let prospectosSmRows = [];
  try {
    prospectosSmRows = smDb.prepare("SELECT * FROM prospectos").all();
  } catch {}
  const insertProspecto = v2Db.prepare(`
    INSERT INTO prospectos (
      prospecto_id, email, telefono, nombre, empresa, estado,
      origen_utm, pieza_id_atribucion, perfil_detectado_id, motivo_descarte_id,
      fecha_captura, fecha_actualizacion, sla_limite_calificacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of prospectosSmRows) {
    insertProspecto.run(
      row.prospecto_id,
      row.email,
      row.telefono || null,
      row.nombre,
      row.empresa || null,
      row.estado,
      row.origen_utm || null,
      row.pieza_id_atribucion,
      row.perfil_detectado_id || null,
      row.motivo_descarte_id || null,
      toIsoUtc(row.fecha_captura),
      toIsoUtc(row.fecha_actualizacion),
      toIsoUtc(row.sla_limite_calificacion)
    );
  }

  // E. prospecto_eventos_log
  let eventosProspectoRows = [];
  try {
    eventosProspectoRows = smDb.prepare("SELECT * FROM prospecto_eventos_log").all();
  } catch {}
  const insertEventoProspecto = v2Db.prepare(`
    INSERT INTO prospecto_eventos_log (
      evento_id, prospecto_id, estado_anterior, estado_nuevo, motivo_catalogo, metadata_json, creado_en
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of eventosProspectoRows) {
    insertEventoProspecto.run(
      row.evento_id,
      row.prospecto_id,
      row.estado_anterior || null,
      row.estado_nuevo,
      row.motivo_catalogo || null,
      row.metadata_json || null,
      toIsoUtc(row.creado_en)
    );
  }

  // F. outbox_posts + outbox_eventos_log
  let outboxRows = [];
  try {
    outboxRows = smDb.prepare("SELECT * FROM outbox_posts").all();
  } catch {}

  const insertOutbox = v2Db.prepare(`
    INSERT INTO outbox_posts (
      post_id, propuesta_id, canal, borrador_opcion, estado_post,
      reintentos_cont, clave_idempotencia, lease_owner, lease_expira_at,
      proximo_reintento_at, error_ultimo, creado_en, actualizado_en
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOutboxLog = v2Db.prepare(`
    INSERT INTO outbox_eventos_log (
      evento_id, post_id, estado_anterior, estado_nuevo, motivo_catalogo, metadata_json, creado_en
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of outboxRows) {
    let estadoPost = row.estado_post;
    let motivoTransicion = null;
    let estadoAnterior = null;

    if (estadoPost === "FALLIDO_PERMANENTE") {
      estadoAnterior = "FALLIDO_PERMANENTE";
      estadoPost = "DEAD_LETTER";
      motivoTransicion = "MIGRACION_V1_1_0";
    }

    const creadoEn = toIsoUtc(row.creado_en);
    const actualizadoEn = toIsoUtc(row.actualizado_en);
    const proximoReintentoAt = row.proximo_reintento_at ? toIsoUtc(row.proximo_reintento_at) : null;
    const leaseExpiraAt = row.lease_expira_at ? toIsoUtc(row.lease_expira_at) : null;

    insertOutbox.run(
      row.post_id,
      row.propuesta_id,
      row.canal,
      row.borrador_opcion,
      estadoPost,
      row.reintentos_cont || 0,
      row.clave_idempotencia,
      row.lease_owner || null,
      leaseExpiraAt,
      proximoReintentoAt,
      row.error_ultimo || null,
      creadoEn,
      actualizadoEn
    );

    if (motivoTransicion) {
      insertOutboxLog.run(
        `EVT-MIG-${row.post_id}`,
        row.post_id,
        estadoAnterior,
        estadoPost,
        motivoTransicion,
        JSON.stringify({ detalle: "Migración histórica a v1.1.0" }),
        new Date().toISOString()
      );
    }
  }

  smDb.close();

  // 6. Copiar datos desde mejora_nucleo.db (contactos y usuarios)
  const nucleoDb = new DatabaseSync(nucleoDbPath);
  const contactosRows = nucleoDb.prepare("SELECT * FROM contactos").all();
  const insertContacto = v2Db.prepare(`
    INSERT INTO contactos (
      id, uuid, nombre, apellido, telefono, email, empresa, cargo, origen, estado, notas, creado_el, actualizado_el
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of contactosRows) {
    insertContacto.run(
      row.id,
      row.uuid,
      row.nombre,
      row.apellido || null,
      row.telefono,
      row.email || null,
      row.empresa || null,
      row.cargo || null,
      row.origen || "manual",
      row.estado || "nuevo",
      row.notas || null,
      toIsoUtc(row.creado_el),
      toIsoUtc(row.actualizado_el)
    );
  }

  const usuariosRows = nucleoDb.prepare("SELECT * FROM usuarios").all();
  const insertUsuario = v2Db.prepare(`
    INSERT INTO usuarios (
      id, uuid, nombre, email, password_hash, rol, activo, creado_el, actualizado_el
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of usuariosRows) {
    insertUsuario.run(
      row.id,
      row.uuid,
      row.nombre,
      row.email,
      row.password_hash,
      row.rol || "vendedor",
      row.activo !== undefined ? row.activo : 1,
      toIsoUtc(row.creado_el),
      toIsoUtc(row.actualizado_el)
    );
  }

  nucleoDb.close();

  // 7. Configurar PRAGMA user_version = 110
  v2Db.exec(`PRAGMA user_version = ${TARGET_USER_VERSION};`);

  // 8. Verificaciones estrictas
  const integrity = v2Db.prepare("PRAGMA integrity_check;").get().integrity_check;
  const foreignKeys = v2Db.prepare("PRAGMA foreign_key_check;").all();
  const finalUserVersion = v2Db.prepare("PRAGMA user_version;").get().user_version;

  const countBoveda = v2Db.prepare("SELECT count(*) as c FROM boveda_fichas").get().c;
  const countPropuestas = v2Db.prepare("SELECT count(*) as c FROM propuestas_sm").get().c;
  const countBorradores = v2Db.prepare("SELECT count(*) as c FROM borradores").get().c;
  const countMetricas = v2Db.prepare("SELECT count(*) as c FROM metricas_atribucion").get().c;
  const countProspectos = v2Db.prepare("SELECT count(*) as c FROM prospectos").get().c;
  const countOutbox = v2Db.prepare("SELECT count(*) as c FROM outbox_posts").get().c;
  const countContactos = v2Db.prepare("SELECT count(*) as c FROM contactos").get().c;
  const countUsuarios = v2Db.prepare("SELECT count(*) as c FROM usuarios").get().c;

  v2Db.close();

  const report = {
    isEnsayo,
    sqliteVer,
    finalUserVersion,
    integrity,
    foreignKeysCount: foreignKeys.length,
    smBackup: { path: smBackupPath, hash: smHash },
    nucleoBackup: { path: nucleoBackupPath, hash: nucleoHash },
    counts: {
      boveda_fichas: { origen: bovedaRows.length, destino: countBoveda },
      propuestas_sm: { origen: propuestasRows.length, destino: countPropuestas },
      borradores: { origen_json: propuestasRows.length * 3, destino: countBorradores },
      metricas_atribucion: { origen: metricasRows.length, destino: countMetricas },
      prospectos: { origen: prospectosSmRows.length, destino: countProspectos },
      outbox_posts: { origen: outboxRows.length, destino: countOutbox },
      contactos: { origen: contactosRows.length, destino: countContactos },
      usuarios: { origen: usuariosRows.length, destino: countUsuarios },
    },
  };

  console.log(`${logPrefix} Verificaciones completadas: integrity_check=${integrity}, foreign_keys_violations=${foreignKeys.length}`);
  if (integrity !== "ok") {
    throw new Error(`${logPrefix} integrity_check falló: ${integrity}`);
  }
  if (foreignKeys.length > 0) {
    throw new Error(`${logPrefix} foreign_key_check reportó violaciones: ${JSON.stringify(foreignKeys)}`);
  }

  return report;
}

// Procedimiento de requeue manual de DEAD_LETTER
export function requeueDeadLetter(db, postId, motivoCatalogo) {
  if (!motivoCatalogo) throw new Error("Se requiere motivo de catálogo para requeue manual");
  const row = db.prepare("SELECT * FROM outbox_posts WHERE post_id = ?").get(postId);
  if (!row) throw new Error(`Post no encontrado: ${postId}`);
  if (row.estado_post !== "DEAD_LETTER") {
    throw new Error(`Solo posts en DEAD_LETTER pueden ser re-encolados (actual: ${row.estado_post})`);
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE outbox_posts
    SET estado_post = 'EN_COLA',
        reintentos_cont = 0,
        lease_owner = NULL,
        lease_expira_at = NULL,
        error_ultimo = NULL,
        actualizado_en = ?
    WHERE post_id = ?
  `).run(now, postId);

  db.prepare(`
    INSERT INTO outbox_eventos_log (
      evento_id, post_id, estado_anterior, estado_nuevo, motivo_catalogo, metadata_json, creado_en
    ) VALUES (?, ?, 'DEAD_LETTER', 'EN_COLA', ?, ?, ?)
  `).run(`EVT-REQ-${Date.now()}`, postId, motivoCatalogo, JSON.stringify({ motivo: motivoCatalogo }), now);
}

// Reaper de leases vencidos en DESPACHANDO (+60s lease, ejecuta cada 30s)
export function runLeaseReaper(db, now = new Date()) {
  const nowIso = now.toISOString();
  const vencidos = db.prepare(`
    SELECT post_id, lease_owner, lease_expira_at
    FROM outbox_posts
    WHERE estado_post = 'DESPACHANDO' AND lease_expira_at <= ?
  `).all(nowIso);

  for (const v of vencidos) {
    db.prepare(`
      UPDATE outbox_posts
      SET estado_post = 'EN_COLA',
          reintentos_cont = reintentos_cont + 1,
          lease_owner = NULL,
          lease_expira_at = NULL,
          actualizado_en = ?
      WHERE post_id = ?
    `).run(nowIso, v.post_id);

    db.prepare(`
      INSERT INTO outbox_eventos_log (
        evento_id, post_id, estado_anterior, estado_nuevo, motivo_catalogo, metadata_json, creado_en
      ) VALUES (?, ?, 'DESPACHANDO', 'EN_COLA', 'LEASE_EXPIRED_REAPED', ?, ?)
    `).run(
      `EVT-REAP-${Date.now()}-${v.post_id}`,
      v.post_id,
      JSON.stringify({ lease_owner: v.lease_owner, expirado_at: v.lease_expira_at }),
      nowIso
    );
  }
  return vencidos.length;
}

// Ejecución interactiva CLI
if (process.argv[1] && process.argv[1].endsWith("migracion_v1_1_0.mjs")) {
  const isEnsayo = process.argv.includes("--ensayo");
  const isReal = process.argv.includes("--real");

  if (!isEnsayo && !isReal) {
    console.log("Uso: node scripts/migracion_v1_1_0.mjs [--ensayo | --real]");
    process.exit(1);
  }

  if (isEnsayo) {
    // Ensayo sobre copias temporales aisladas
    const testDir = path.resolve("data", "ensayo_test");
    fs.mkdirSync(testDir, { recursive: true });

    const smCopy = path.join(testDir, "mejora_sm.test.db");
    const nucleoCopy = path.join(testDir, "mejora_nucleo.test.db");
    const v2Test = path.join(testDir, "mejora_sm.v2.test.db");

    fs.copyFileSync("data/mejora_sm.db", smCopy);
    fs.copyFileSync("data/mejora_nucleo.db", nucleoCopy);

    const res = ejecutarMigracion({
      smDbPath: smCopy,
      nucleoDbPath: nucleoCopy,
      destDbPath: v2Test,
      isEnsayo: true,
    });
    console.log("RESULTADO_ENSAYO_JSON:" + JSON.stringify(res));

    // Limpieza de staging test
    fs.rmSync(testDir, { recursive: true, force: true });
  } else if (isReal) {
    // Migración Real con Swap de Base Atómico
    console.log("[MIGRACIÓN REAL] Ejecutando checkpoint TRUNCATE previo...");
    const smOrig = new DatabaseSync("data/mejora_sm.db");
    smOrig.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    smOrig.close();

    const nucleoOrig = new DatabaseSync("data/mejora_nucleo.db");
    nucleoOrig.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    nucleoOrig.close();

    const destDbPath = path.resolve("data", "mejora_sm.v2.db");
    const res = ejecutarMigracion({
      smDbPath: path.resolve("data", "mejora_sm.db"),
      nucleoDbPath: path.resolve("data", "mejora_nucleo.db"),
      destDbPath,
      isEnsayo: false,
    });

    // Secuencia de Swap Atómico:
    // Mover archivos viejos -wal y -shm fuera de data/
    const backupDir = path.resolve("data", "archived_wal");
    fs.mkdirSync(backupDir, { recursive: true });
    for (const ext of ["-wal", "-shm"]) {
      const walFile = path.resolve("data", `mejora_sm.db${ext}`);
      if (fs.existsSync(walFile)) {
        fs.renameSync(walFile, path.join(backupDir, `mejora_sm.db${ext}.${Date.now()}`));
      }
    }

    // Renombrar mejora_sm.db original a mejora_sm.db.pre_swap
    // Y renombrar mejora_sm.v2.db a mejora_sm.db
    const liveDb = path.resolve("data", "mejora_sm.db");
    const swapOrig = path.resolve("data", "mejora_sm.db.pre_swap");
    if (fs.existsSync(swapOrig)) fs.unlinkSync(swapOrig);
    fs.renameSync(liveDb, swapOrig);
    fs.renameSync(destDbPath, liveDb);

    console.log("[MIGRACIÓN REAL] Swap atómico completado exitosamente.");
    console.log("RESULTADO_REAL_JSON:" + JSON.stringify(res));
  }
}
