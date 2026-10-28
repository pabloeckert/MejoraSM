// scripts/migracion_002_fechas_estrictas.mjs
// MIGRACIÓN 002: VALIDACIÓN ESTRICTA DE FECHAS (ISO-8601 UTC)
// Motor: node:sqlite (DatabaseSync) · Modo STRICT
// Restricción: CHECK (col GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(col) IS NOT NULL)
// Compatible con ensayo (--ensayo) y ejecución real (--real) con swap atómico.

import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

export const TARGET_USER_VERSION_002 = 111;

export function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

export const DDL_002_STRICT_SCHEMA = `
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
  creado_el TEXT NOT NULL CHECK (
    creado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(creado_el) IS NOT NULL
  )
) STRICT;

CREATE TABLE IF NOT EXISTS propuestas_sm (
  propuesta_id TEXT PRIMARY KEY,
  canal_destino TEXT NOT NULL,
  dia_programado TEXT NOT NULL CHECK (
    dia_programado GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(dia_programado) IS NOT NULL
  ),
  origen_boveda_id TEXT NOT NULL,
  imagen_boveda_id TEXT,
  borradores_json TEXT NOT NULL,
  borrador_seleccionado TEXT NOT NULL DEFAULT 'A',
  tratamiento_visual_json TEXT NOT NULL,
  imagen_boveda_json TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente_revision',
  motivo_rechazo TEXT,
  metricas_json TEXT,
  creado_el TEXT NOT NULL CHECK (
    creado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(creado_el) IS NOT NULL
  ),
  actualizado_el TEXT NOT NULL CHECK (
    actualizado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(actualizado_el) IS NOT NULL
  )
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
  creado_el TEXT NOT NULL CHECK (
    creado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(creado_el) IS NOT NULL
  ),
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
  registrado_el TEXT NOT NULL CHECK (
    registrado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(registrado_el) IS NOT NULL
  ),
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
  fecha_captura TEXT NOT NULL CHECK (
    fecha_captura GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(fecha_captura) IS NOT NULL
  ),
  fecha_actualizacion TEXT NOT NULL CHECK (
    fecha_actualizacion GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(fecha_actualizacion) IS NOT NULL
  ),
  sla_limite_calificacion TEXT NOT NULL CHECK (
    sla_limite_calificacion GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(sla_limite_calificacion) IS NOT NULL
  )
) STRICT;

CREATE TABLE IF NOT EXISTS prospecto_eventos_log (
  evento_id TEXT PRIMARY KEY,
  prospecto_id TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  motivo_catalogo TEXT,
  metadata_json TEXT,
  creado_en TEXT NOT NULL CHECK (
    creado_en GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(creado_en) IS NOT NULL
  ),
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
    'PUBLICADO','REINTENTO','FALLIDO_PERMANENTE','DEAD_LETTER','CANCELADO'
  )),
  reintentos_cont INTEGER NOT NULL DEFAULT 0,
  clave_idempotencia TEXT NOT NULL UNIQUE,
  lease_owner TEXT,
  lease_expira_at TEXT CHECK (
    lease_expira_at IS NULL OR (
      lease_expira_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
      AND datetime(lease_expira_at) IS NOT NULL
    )
  ),
  proximo_reintento_at TEXT CHECK (
    proximo_reintento_at IS NULL OR (
      proximo_reintento_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
      AND datetime(proximo_reintento_at) IS NOT NULL
    )
  ),
  error_ultimo TEXT,
  creado_en TEXT NOT NULL CHECK (
    creado_en GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(creado_en) IS NOT NULL
  ),
  actualizado_en TEXT NOT NULL CHECK (
    actualizado_en GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(actualizado_en) IS NOT NULL
  ),
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
  creado_en TEXT NOT NULL CHECK (
    creado_en GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(creado_en) IS NOT NULL
  ),
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
  creado_el TEXT NOT NULL CHECK (
    creado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(creado_el) IS NOT NULL
  ),
  actualizado_el TEXT NOT NULL CHECK (
    actualizado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(actualizado_el) IS NOT NULL
  )
) STRICT;

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'vendedor' CHECK (rol IN ('admin', 'dueno', 'gerente', 'vendedor', 'operador')),
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  creado_el TEXT NOT NULL CHECK (
    creado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(creado_el) IS NOT NULL
  ),
  actualizado_el TEXT NOT NULL CHECK (
    actualizado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z'
    AND datetime(actualizado_el) IS NOT NULL
  )
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
CREATE INDEX IF NOT EXISTS idx_outbox_pendientes ON outbox_posts(proximo_reintento_at) WHERE estado_post IN ('EN_COLA','REINTENTO');
CREATE INDEX IF NOT EXISTS idx_outbox_leases ON outbox_posts(lease_expira_at) WHERE estado_post='DESPACHANDO';
`;

/**
 * Ejecuta la migración 002 desde una base origen a una base destino limpia.
 */
export function ejecutarMigracion002({ srcDbPath, destDbPath, isEnsayo = false }) {
  const logPrefix = isEnsayo ? "[ENSAYO 002]" : "[MIGRACIÓN REAL 002]";
  console.log(`${logPrefix} Iniciando migración 002 (fechas estrictas ISO-8601 UTC)...`);

  if (!fs.existsSync(srcDbPath)) {
    throw new Error(`Base origen no existe: ${srcDbPath}`);
  }

  // Crear base destino limpia
  if (fs.existsSync(destDbPath)) fs.unlinkSync(destDbPath);
  for (const ext of ["-wal", "-shm"]) {
    if (fs.existsSync(destDbPath + ext)) fs.unlinkSync(destDbPath + ext);
  }

  const destDb = new DatabaseSync(destDbPath);
  destDb.exec("PRAGMA journal_mode = WAL;");
  destDb.exec("PRAGMA busy_timeout = 5000;");
  destDb.exec("PRAGMA foreign_keys = ON;");
  destDb.exec("PRAGMA synchronous = NORMAL;");
  destDb.exec(DDL_002_STRICT_SCHEMA);

  const srcDb = new DatabaseSync(srcDbPath);
  srcDb.exec("PRAGMA foreign_keys = ON;");

  const tables = [
    "boveda_fichas",
    "propuestas_sm",
    "borradores",
    "metricas_atribucion",
    "prospectos",
    "prospecto_eventos_log",
    "outbox_posts",
    "outbox_eventos_log",
    "contactos",
    "usuarios",
  ];

  const counts = {};

  for (const table of tables) {
    let rows = [];
    try {
      rows = srcDb.prepare(`SELECT * FROM ${table}`).all();
    } catch {
      rows = [];
    }
    counts[table] = rows.length;

    if (rows.length > 0) {
      const keys = Object.keys(rows[0]);
      const placeholders = keys.map(() => "?").join(", ");
      const insertStmt = destDb.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`);
      for (const row of rows) {
        const values = keys.map((k) => row[k]);
        insertStmt.run(...values);
      }
    }
  }

  srcDb.close();

  // Establecer user_version = 111
  destDb.exec(`PRAGMA user_version = ${TARGET_USER_VERSION_002};`);

  // Validaciones
  const integrity = destDb.prepare("PRAGMA integrity_check;").get().integrity_check;
  const fkCheck = destDb.prepare("PRAGMA foreign_key_check;").all();
  const jm = destDb.prepare("PRAGMA journal_mode;").get().journal_mode;
  const uv = destDb.prepare("PRAGMA user_version;").get().user_version;

  destDb.close();

  if (integrity !== "ok") {
    throw new Error(`ABORT: integrity_check falló: ${integrity}`);
  }
  if (fkCheck.length > 0) {
    throw new Error(`ABORT: foreign_key_check detectó inconsistencias: ${JSON.stringify(fkCheck)}`);
  }

  return {
    srcDbPath,
    destDbPath,
    isEnsayo,
    user_version: uv,
    journal_mode: jm,
    integrity_check: integrity,
    foreign_key_violations: fkCheck.length,
    counts,
  };
}

// Ejecución CLI
if (process.argv[1] && process.argv[1].endsWith("migracion_002_fechas_estrictas.mjs")) {
  const isEnsayo = process.argv.includes("--ensayo");
  const isReal = process.argv.includes("--real");

  if (!isEnsayo && !isReal) {
    console.log("Uso: node scripts/migracion_002_fechas_estrictas.mjs [--ensayo | --real]");
    process.exit(1);
  }

  const liveDbPath = path.resolve("data", "mejora_sm.db");

  if (isEnsayo) {
    const testDir = path.resolve("data", "ensayo_002");
    fs.mkdirSync(testDir, { recursive: true });
    const smCopy = path.join(testDir, "mejora_sm.copy.db");
    const smDest = path.join(testDir, "mejora_sm.002.db");

    fs.copyFileSync(liveDbPath, smCopy);
    const result = ejecutarMigracion002({ srcDbPath: smCopy, destDbPath: smDest, isEnsayo: true });
    console.log("RESULTADO_ENSAYO_002_JSON:" + JSON.stringify(result));
    fs.rmSync(testDir, { recursive: true, force: true });
  } else if (isReal) {
    console.log("[MIGRACIÓN REAL 002] Ejecutando checkpoint TRUNCATE previo...");
    const smOrig = new DatabaseSync(liveDbPath);
    smOrig.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    smOrig.close();

    const backupPath = path.resolve("data", `mejora_sm.db.pre_002_${Date.now()}`);
    fs.copyFileSync(liveDbPath, backupPath);
    console.log(`[MIGRACIÓN REAL 002] Respaldo generado: ${backupPath} (SHA: ${sha256File(backupPath)})`);

    const destPath = path.resolve("data", "mejora_sm.002.temp.db");
    const result = ejecutarMigracion002({ srcDbPath: liveDbPath, destDbPath: destPath, isEnsayo: false });

    // Swap atómico
    const preSwapPath = path.resolve("data", "mejora_sm.db.pre_002");
    if (fs.existsSync(preSwapPath)) fs.unlinkSync(preSwapPath);
    fs.renameSync(liveDbPath, preSwapPath);
    fs.renameSync(destPath, liveDbPath);

    console.log("[MIGRACIÓN REAL 002] Swap atómico completado exitosamente.");
    console.log("RESULTADO_REAL_002_JSON:" + JSON.stringify(result));
  }
}
