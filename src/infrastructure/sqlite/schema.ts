// src/infrastructure/sqlite/schema.ts
// ESQUEMA DDL CANÓNICO PARA PERSISTENCIA LOCAL EN SQLITE (MejoraSM 2026)
// Motor: node:sqlite (DatabaseSync) sin dependencias externas.

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
`;
