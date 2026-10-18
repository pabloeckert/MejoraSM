// src/infrastructure/sqlite/schema.ts
// ESQUEMA DDL CANÓNICO PARA PERSISTENCIA LOCAL EN SQLITE (MejoraSM 2026)
// Motor: node:sqlite (DatabaseSync) sin dependencias externas.

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
  fecha_captura TEXT NOT NULL,
  fecha_actualizacion TEXT NOT NULL,
  sla_limite_calificacion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prospecto_eventos_log (
  evento_id TEXT PRIMARY KEY,
  prospecto_id TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  motivo_catalogo TEXT,
  metadata_json TEXT,
  creado_en TEXT NOT NULL,
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
    'PUBLICADO','REINTENTO','FALLIDO_PERMANENTE','CANCELADO'
  )),
  reintentos_cont INTEGER NOT NULL DEFAULT 0,
  clave_idempotencia TEXT NOT NULL UNIQUE,
  proximo_reintento_at TEXT,
  error_ultimo TEXT,
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prospectos_email ON prospectos(email);
CREATE INDEX IF NOT EXISTS idx_prospectos_estado_sla ON prospectos(estado, sla_limite_calificacion);
CREATE INDEX IF NOT EXISTS idx_outbox_estado_reintento ON outbox_posts(estado_post, proximo_reintento_at);
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
${CREATE_TABLES_V2_SQL}
`;
