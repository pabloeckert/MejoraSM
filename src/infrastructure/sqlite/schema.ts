// src/infrastructure/sqlite/schema.ts
// ESQUEMA DDL CANÓNICO PARA PERSISTENCIA LOCAL EN SQLITE (MejoraSM 2026)
// Motor: node:sqlite (DatabaseSync) sin dependencias externas.
// Estricta validación ISO-8601 UTC en todas las columnas temporales.

export const DATE_ISO_UTC_CHECK = (col: string) =>
  `CHECK (${col} GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(${col}) IS NOT NULL)`;

export const NULLABLE_DATE_ISO_UTC_CHECK = (col: string) =>
  `CHECK (${col} IS NULL OR (${col} GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(${col}) IS NOT NULL))`;

// ── NÚCLEO MÍNIMO V2 (P0): CRM de prospectos + Outbox transaccional ─────────
export const CREATE_TABLES_V2_SQL = `
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
  fecha_captura TEXT NOT NULL CHECK (fecha_captura GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(fecha_captura) IS NOT NULL),
  fecha_actualizacion TEXT NOT NULL CHECK (fecha_actualizacion GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(fecha_actualizacion) IS NOT NULL),
  sla_limite_calificacion TEXT NOT NULL CHECK (sla_limite_calificacion GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(sla_limite_calificacion) IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS prospecto_eventos_log (
  evento_id TEXT PRIMARY KEY,
  prospecto_id TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  motivo_catalogo TEXT,
  metadata_json TEXT,
  creado_en TEXT NOT NULL CHECK (creado_en GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(creado_en) IS NOT NULL),
  FOREIGN KEY (prospecto_id) REFERENCES prospectos(prospecto_id)
);

CREATE TRIGGER IF NOT EXISTS trg_eventos_log_no_update
BEFORE UPDATE ON prospecto_eventos_log
BEGIN SELECT RAISE(ABORT, 'prospecto_eventos_log es append-only: UPDATE prohibido'); END;

CREATE TRIGGER IF NOT EXISTS trg_eventos_log_no_delete
BEFORE DELETE ON prospecto_eventos_log
BEGIN SELECT RAISE(ABORT, 'prospecto_eventos_log es append-only: DELETE prohibido'); END;

CREATE TABLE IF NOT EXISTS outbox_posts (
  post_id TEXT PRIMARY KEY,
  propuesta_id TEXT NOT NULL,
  canal TEXT NOT NULL,
  borrador_opcion TEXT NOT NULL,
  estado_post TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estado_post IN (
    'BORRADOR','APROBADO','EN_COLA','DESPACHANDO',
    'PUBLICADO','REINTENTO','FALLIDO_PERMANENTE','DEAD_LETTER','CANCELADO'
  )),
  reintentos_cont INTEGER NOT NULL DEFAULT 0,
  clave_idempotencia TEXT NOT NULL UNIQUE,
  lease_owner TEXT,
  lease_expira_at TEXT CHECK (lease_expira_at IS NULL OR (lease_expira_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(lease_expira_at) IS NOT NULL)),
  proximo_reintento_at TEXT CHECK (proximo_reintento_at IS NULL OR (proximo_reintento_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(proximo_reintento_at) IS NOT NULL)),
  error_ultimo TEXT,
  creado_en TEXT NOT NULL CHECK (creado_en GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(creado_en) IS NOT NULL),
  actualizado_en TEXT NOT NULL CHECK (actualizado_en GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(actualizado_en) IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS outbox_transiciones_permitidas (
  estado_origen TEXT NOT NULL,
  estado_destino TEXT NOT NULL,
  PRIMARY KEY (estado_origen, estado_destino)
);

CREATE TABLE IF NOT EXISTS outbox_eventos_log (
  evento_id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  motivo_catalogo TEXT,
  metadata_json TEXT,
  creado_en TEXT NOT NULL CHECK (creado_en GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(creado_en) IS NOT NULL),
  FOREIGN KEY (post_id) REFERENCES outbox_posts(post_id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS trg_outbox_eventos_no_update
BEFORE UPDATE ON outbox_eventos_log
BEGIN SELECT RAISE(ABORT, 'outbox_eventos_log es append-only: UPDATE prohibido'); END;

CREATE TRIGGER IF NOT EXISTS trg_outbox_eventos_no_delete
BEFORE DELETE ON outbox_eventos_log
BEGIN SELECT RAISE(ABORT, 'outbox_eventos_log es append-only: DELETE prohibido'); END;

CREATE INDEX IF NOT EXISTS idx_prospectos_email ON prospectos(email);
CREATE INDEX IF NOT EXISTS idx_prospectos_estado_sla ON prospectos(estado, sla_limite_calificacion);
CREATE INDEX IF NOT EXISTS idx_outbox_estado_reintento ON outbox_posts(estado_post, proximo_reintento_at);
CREATE INDEX IF NOT EXISTS idx_outbox_lease ON outbox_posts(estado_post, lease_expira_at);
CREATE INDEX IF NOT EXISTS idx_outbox_pendientes ON outbox_posts(proximo_reintento_at) WHERE estado_post IN ('EN_COLA','REINTENTO');
CREATE INDEX IF NOT EXISTS idx_outbox_leases ON outbox_posts(lease_expira_at) WHERE estado_post='DESPACHANDO';
CREATE INDEX IF NOT EXISTS idx_outbox_propuesta ON outbox_posts(propuesta_id);

CREATE TABLE IF NOT EXISTS circuit_breaker_canales (
  canal TEXT PRIMARY KEY,
  estado TEXT NOT NULL CHECK (estado IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  conteo_fallas INTEGER NOT NULL DEFAULT 0,
  ultimo_fallo_at TEXT CHECK (ultimo_fallo_at IS NULL OR (ultimo_fallo_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(ultimo_fallo_at) IS NOT NULL)),
  ultimo_exito_at TEXT CHECK (ultimo_exito_at IS NULL OR (ultimo_exito_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(ultimo_exito_at) IS NOT NULL)),
  actualizado_at TEXT NOT NULL CHECK (actualizado_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(actualizado_at) IS NOT NULL)
);
`;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS boveda_fichas (
  id TEXT PRIMARY KEY,
  origen_carpeta TEXT NOT NULL,
  dimension TEXT NOT NULL,
  tipo_activo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  contenido_raw TEXT NOT NULL,
  metadatos_multimedia TEXT,
  fase_comercial_sugerida TEXT NOT NULL,
  creado_el TEXT NOT NULL CHECK (creado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(creado_el) IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS propuestas_sm (
  propuesta_id TEXT PRIMARY KEY,
  canal_destino TEXT NOT NULL,
  dia_programado TEXT NOT NULL CHECK (dia_programado GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(dia_programado) IS NOT NULL),
  origen_boveda_id TEXT NOT NULL,
  imagen_boveda_id TEXT,
  borradores_json TEXT NOT NULL,
  borrador_seleccionado TEXT NOT NULL DEFAULT 'A',
  tratamiento_visual_json TEXT NOT NULL,
  imagen_boveda_json TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente_revision',
  motivo_rechazo TEXT,
  metricas_json TEXT,
  creado_el TEXT NOT NULL CHECK (creado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(creado_el) IS NOT NULL),
  actualizado_el TEXT NOT NULL CHECK (actualizado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(actualizado_el) IS NOT NULL)
);

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
  creado_el TEXT NOT NULL CHECK (creado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(creado_el) IS NOT NULL),
  FOREIGN KEY (propuesta_id) REFERENCES propuestas_sm(propuesta_id) ON DELETE CASCADE
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
  registrado_el TEXT NOT NULL CHECK (registrado_el GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND datetime(registrado_el) IS NOT NULL),
  FOREIGN KEY (propuesta_id) REFERENCES propuestas_sm(propuesta_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_boveda_dimension ON boveda_fichas(dimension);
CREATE INDEX IF NOT EXISTS idx_boveda_capa ON boveda_fichas(origen_carpeta);
CREATE INDEX IF NOT EXISTS idx_propuestas_estado ON propuestas_sm(estado);
CREATE INDEX IF NOT EXISTS idx_propuestas_dia ON propuestas_sm(dia_programado);
CREATE INDEX IF NOT EXISTS idx_propuestas_imagen ON propuestas_sm(imagen_boveda_id);
CREATE INDEX IF NOT EXISTS idx_borradores_propuesta ON borradores(propuesta_id, opcion);
CREATE INDEX IF NOT EXISTS idx_metricas_persona ON metricas_atribucion(buyer_persona);
${CREATE_TABLES_V2_SQL}
`;
