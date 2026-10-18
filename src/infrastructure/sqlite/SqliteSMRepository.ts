// src/infrastructure/sqlite/SqliteSMRepository.ts
// REPOSITORIO PERSISTENTE LOCAL EN SQLITE PARA MejoraSM
// Motor: node:sqlite (DatabaseSync nativo en Node.js 24) sin dependencias externas.

import { DatabaseSync } from "node:sqlite";
import { CREATE_TABLES_SQL } from "./schema";
import { withImmediateTransaction } from "./transaction";
import { SqliteOutboxRepository } from "./SqliteOutboxRepository";
import {
  type FichaBovedaDTO,
  type PropuestaMejoraSMDTO,
  type EstadoPropuesta,
  type DimensionMC,
  type CanalDestino,
  type OpcionBorrador,
} from "../../domain/types";

export interface MetricaRegistroDTO {
  id: string;
  propuesta_id: string;
  canal: CanalDestino;
  buyer_persona: string;
  dimension: DimensionMC;
  formato: string;
  dia_semana: string;
  horario_publicacion: string;
  clics_mejoraok: number;
  diagnosticos_completados: number;
  score_impacto: number;
  registrado_el: string;
}

export interface RecomendacionComercialDTO {
  mejorDia: string;
  mejorHorario: string;
  mejorFormato: string;
  mejorDimension: string;
  scorePromedio: number;
}

export interface RankingBuyerPersonaDTO {
  buyer_persona: string;
  total_clics: number;
  total_diagnosticos: number;
  tasa_conversion: number;
  score_promedio: number;
}

export interface RankingPiezaDTO {
  propuesta_id: string;
  canal: CanalDestino;
  buyer_persona: string;
  formato: string;
  clics_mejoraok: number;
  diagnosticos_completados: number;
  score_impacto: number;
}


export class SqliteSMRepository {
  private db: DatabaseSync;

  constructor(dbPath: string = ":memory:") {
    this.db = new DatabaseSync(dbPath);
    this.init();
  }

  private init(): void {
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
    this.db.exec(CREATE_TABLES_SQL);
  }

  public close(): void {
    this.db.close();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BÓVEDA DE CONOCIMIENTO (4 Capas Canónicas)
  // ──────────────────────────────────────────────────────────────────────────

  public guardarFichaBoveda(ficha: FichaBovedaDTO): void {
    const stmt = this.db.prepare(`
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

    stmt.run(
      ficha.id,
      ficha.origen_carpeta,
      ficha.dimension,
      ficha.tipo_activo,
      ficha.titulo,
      ficha.contenido_raw,
      ficha.metadatos_multimedia ? JSON.stringify(ficha.metadatos_multimedia) : null,
      ficha.fase_comercial_sugerida,
      ficha.creado_el
    );
  }

  public obtenerFichaBoveda(id: string): FichaBovedaDTO | null {
    const stmt = this.db.prepare("SELECT * FROM boveda_fichas WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      origen_carpeta: row.origen_carpeta,
      dimension: row.dimension,
      tipo_activo: row.tipo_activo,
      titulo: row.titulo,
      contenido_raw: row.contenido_raw,
      metadatos_multimedia: row.metadatos_multimedia ? JSON.parse(row.metadatos_multimedia) : undefined,
      fase_comercial_sugerida: row.fase_comercial_sugerida,
      creado_el: row.creado_el,
    };
  }

  public listarFichasBoveda(filtro?: { dimension?: DimensionMC; capa?: string }): FichaBovedaDTO[] {
    let query = "SELECT * FROM boveda_fichas WHERE 1=1";
    const params: string[] = [];

    if (filtro?.dimension) {
      query += " AND dimension = ?";
      params.push(filtro.dimension);
    }
    if (filtro?.capa) {
      query += " AND origen_carpeta = ?";
      params.push(filtro.capa);
    }
    query += " ORDER BY creado_el DESC";

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      origen_carpeta: row.origen_carpeta,
      dimension: row.dimension,
      tipo_activo: row.tipo_activo,
      titulo: row.titulo,
      contenido_raw: row.contenido_raw,
      metadatos_multimedia: row.metadatos_multimedia ? JSON.parse(row.metadatos_multimedia) : undefined,
      fase_comercial_sugerida: row.fase_comercial_sugerida,
      creado_el: row.creado_el,
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROPUESTAS MejoraSM (3 Borradores + Estado de Lote)
  // ──────────────────────────────────────────────────────────────────────────

  public guardarPropuesta(propuesta: PropuestaMejoraSMDTO): void {
    const stmt = this.db.prepare(`
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

    const now = new Date().toISOString();
    stmt.run(
      propuesta.propuesta_id,
      propuesta.canal_destino,
      propuesta.dia_programado,
      propuesta.origen_boveda_id,
      JSON.stringify(propuesta.borradores),
      propuesta.borrador_seleccionado,
      JSON.stringify(propuesta.tratamiento_visual),
      JSON.stringify(propuesta.imagen_boveda_vinculada),
      propuesta.estado,
      propuesta.motivo_rechazo || null,
      propuesta.metricas_atribucion ? JSON.stringify(propuesta.metricas_atribucion) : null,
      now,
      now
    );
  }

  public obtenerPropuesta(id: string): PropuestaMejoraSMDTO | null {
    const stmt = this.db.prepare("SELECT * FROM propuestas_sm WHERE propuesta_id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      propuesta_id: row.propuesta_id,
      canal_destino: row.canal_destino as CanalDestino,
      dia_programado: row.dia_programado,
      origen_boveda_id: row.origen_boveda_id,
      borradores: JSON.parse(row.borradores_json),
      borrador_seleccionado: row.borrador_seleccionado as OpcionBorrador,
      tratamiento_visual: JSON.parse(row.tratamiento_visual_json),
      imagen_boveda_vinculada: JSON.parse(row.imagen_boveda_json),
      estado: row.estado as EstadoPropuesta,
      motivo_rechazo: row.motivo_rechazo || undefined,
      metricas_atribucion: row.metricas_json ? JSON.parse(row.metricas_json) : undefined,
    };
  }

  public listarPropuestas(filtro?: { estado?: EstadoPropuesta; canal?: CanalDestino }): PropuestaMejoraSMDTO[] {
    let query = "SELECT * FROM propuestas_sm WHERE 1=1";
    const params: string[] = [];

    if (filtro?.estado) {
      query += " AND estado = ?";
      params.push(filtro.estado);
    }
    if (filtro?.canal) {
      query += " AND canal_destino = ?";
      params.push(filtro.canal);
    }
    query += " ORDER BY dia_programado ASC";

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      propuesta_id: row.propuesta_id,
      canal_destino: row.canal_destino as CanalDestino,
      dia_programado: row.dia_programado,
      origen_boveda_id: row.origen_boveda_id,
      borradores: JSON.parse(row.borradores_json),
      borrador_seleccionado: row.borrador_seleccionado as OpcionBorrador,
      tratamiento_visual: JSON.parse(row.tratamiento_visual_json),
      imagen_boveda_vinculada: JSON.parse(row.imagen_boveda_json),
      estado: row.estado as EstadoPropuesta,
      motivo_rechazo: row.motivo_rechazo || undefined,
      metricas_atribucion: row.metricas_json ? JSON.parse(row.metricas_json) : undefined,
    }));
  }

  public aprobarPropuesta(id: string): void {
    this.actualizarEstadoPropuesta(id, "aprobado");
  }

  public actualizarEstadoPropuesta(id: string, nuevoEstado: EstadoPropuesta, motivoRechazo?: string): void {
    const stmt = this.db.prepare(`
      UPDATE propuestas_sm
      SET estado = ?, motivo_rechazo = ?, actualizado_el = ?
      WHERE propuesta_id = ?;
    `);
    stmt.run(nuevoEstado, motivoRechazo || null, new Date().toISOString(), id);
  }


  /**
   * Aprueba en una sola transacción atómica el lote completo de propuestas pendientes.
   */
  public aprobarLoteCompleto(ids: string[]): number {
    if (ids.length === 0) return 0;

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE propuestas_sm
      SET estado = 'aprobado', actualizado_el = ?
      WHERE propuesta_id = ? AND estado = 'pendiente_revision';
    `);

    return withImmediateTransaction(this.db, () => {
      let modificadas = 0;
      const outbox = new SqliteOutboxRepository(this.db);
      const nowDate = new Date(now);
      const datos = this.db.prepare("SELECT canal_destino, borrador_seleccionado FROM propuestas_sm WHERE propuesta_id = ?");
      for (const id of ids) {
        const res = stmt.run(now, id);
        if (Number(res.changes || 0) > 0) {
          modificadas++;
          const row = datos.get(id) as { canal_destino: string; borrador_seleccionado: string } | undefined;
          if (row) {
            outbox.encolarAprobado(
              { propuesta_id: id, canal: row.canal_destino, borrador_opcion: row.borrador_seleccionado },
              nowDate
            );
          }
        }
      }
      return modificadas;
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CEREBRO DE KPIS Y ATRIBUCIÓN COMERCIAL (Loop de Retroalimentación)
  // ──────────────────────────────────────────────────────────────────────────

  public registrarMetricaAtribucion(m: MetricaRegistroDTO): void {
    const stmt = this.db.prepare(`
      INSERT INTO metricas_atribucion (
        id, propuesta_id, canal, buyer_persona, dimension, formato,
        dia_semana, horario_publicacion, clics_mejoraok, diagnosticos_completados,
        score_impacto, registrado_el
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      m.id,
      m.propuesta_id,
      m.canal,
      m.buyer_persona,
      m.dimension,
      m.formato,
      m.dia_semana,
      m.horario_publicacion,
      m.clics_mejoraok,
      m.diagnosticos_completados,
      m.score_impacto,
      m.registrado_el
    );
  }

  /**
   * Algoritmo de retroalimentación local: calcula la combinación óptima de
   * Día + Horario + Tema + Formato que maximiza la tasa de conversión comercial
   * hacia diagnósticos en mejoraok.com.
   */
  public optimizarCombinacionComercial(): RecomendacionComercialDTO {
    const stmtDia = this.db.prepare(`
      SELECT dia_semana, AVG(score_impacto) as promedio
      FROM metricas_atribucion
      GROUP BY dia_semana
      ORDER BY promedio DESC
      LIMIT 1;
    `);
    const mejorDiaRow = stmtDia.get() as any;

    const stmtHorario = this.db.prepare(`
      SELECT horario_publicacion, AVG(score_impacto) as promedio
      FROM metricas_atribucion
      GROUP BY horario_publicacion
      ORDER BY promedio DESC
      LIMIT 1;
    `);
    const mejorHorarioRow = stmtHorario.get() as any;

    const stmtFormato = this.db.prepare(`
      SELECT formato, AVG(score_impacto) as promedio
      FROM metricas_atribucion
      GROUP BY formato
      ORDER BY promedio DESC
      LIMIT 1;
    `);
    const mejorFormatoRow = stmtFormato.get() as any;

    const stmtDimension = this.db.prepare(`
      SELECT dimension, AVG(score_impacto) as promedio
      FROM metricas_atribucion
      GROUP BY dimension
      ORDER BY promedio DESC
      LIMIT 1;
    `);
    const mejorDimRow = stmtDimension.get() as any;

    return {
      mejorDia: mejorDiaRow?.dia_semana || "Miércoles",
      mejorHorario: mejorHorarioRow?.horario_publicacion || "09:30",
      mejorFormato: mejorFormatoRow?.formato || "carrusel_pdf",
      mejorDimension: mejorDimRow?.dimension || "empresarial",
      scorePromedio: mejorDiaRow?.promedio || 0.0,
    };
  }

  public obtenerRankingPorBuyerPersona(): RankingBuyerPersonaDTO[] {
    const stmt = this.db.prepare(`
      SELECT
        buyer_persona,
        SUM(clics_mejoraok) as total_clics,
        SUM(diagnosticos_completados) as total_diagnosticos,
        AVG(score_impacto) as score_promedio
      FROM metricas_atribucion
      GROUP BY buyer_persona
      ORDER BY total_diagnosticos DESC, total_clics DESC;
    `);

    const rows = stmt.all() as any[];
    return rows.map((r) => {
      const clics = Number(r.total_clics || 0);
      const diag = Number(r.total_diagnosticos || 0);
      return {
        buyer_persona: r.buyer_persona,
        total_clics: clics,
        total_diagnosticos: diag,
        tasa_conversion: clics > 0 ? Math.round((diag / clics) * 1000) / 10 : 0,
        score_promedio: Math.round(Number(r.score_promedio || 0) * 100) / 100,
      };
    });
  }

  public obtenerRankingPiezas(limite: number = 10): RankingPiezaDTO[] {
    const stmt = this.db.prepare(`
      SELECT
        propuesta_id,
        canal,
        buyer_persona,
        formato,
        clics_mejoraok,
        diagnosticos_completados,
        score_impacto
      FROM metricas_atribucion
      ORDER BY diagnosticos_completados DESC, score_impacto DESC
      LIMIT ?;
    `);

    const rows = stmt.all(limite) as any[];
    return rows.map((r) => ({
      propuesta_id: r.propuesta_id,
      canal: r.canal,
      buyer_persona: r.buyer_persona,
      formato: r.formato,
      clics_mejoraok: Number(r.clics_mejoraok || 0),
      diagnosticos_completados: Number(r.diagnosticos_completados || 0),
      score_impacto: Number(r.score_impacto || 0),
    }));
  }
}

