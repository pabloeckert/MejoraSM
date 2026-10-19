// src/infrastructure/sqlite/SqlitePropuestaRepository.ts
import { DatabaseSync } from "node:sqlite";
import { CREATE_TABLES_SQL } from "./schema";
import { withImmediateTransaction } from "./transaction";
import { SqliteOutboxRepository } from "./SqliteOutboxRepository";
import { createDatabaseConnection } from "./connectionFactory";
import {
  type PropuestaMejoraSMDTO,
  type EstadoPropuesta,
  type CanalDestino,
  type OpcionBorrador,
} from "../../domain/types";

export class SqlitePropuestaRepository {
  private db: DatabaseSync;
  private outbox: SqliteOutboxRepository;

  constructor(dbOrPath: DatabaseSync | string = "data/mejora_sm.db") {
    if (typeof dbOrPath === "string") {
      this.db = createDatabaseConnection(dbOrPath);
    } else {
      this.db = dbOrPath;
    }
    this.outbox = new SqliteOutboxRepository(this.db);
  }

  /** Encola en outbox_posts la propuesta recién aprobada. Debe invocarse dentro de la transacción de aprobación. */
  private encolarEnOutbox(id: string, now: Date): void {
    const row = this.db
      .prepare("SELECT canal_destino, borrador_seleccionado FROM propuestas_sm WHERE propuesta_id = ?")
      .get(id) as { canal_destino: string; borrador_seleccionado: string } | undefined;
    if (!row) return;
    this.outbox.encolarAprobado(
      { propuesta_id: id, canal: row.canal_destino, borrador_opcion: row.borrador_seleccionado },
      now
    );
  }

  public guardar(propuesta: PropuestaMejoraSMDTO): void {
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
    const diaProgramadoIso = new Date(propuesta.dia_programado).toISOString();
    stmt.run(
      propuesta.propuesta_id,
      propuesta.canal_destino,
      diaProgramadoIso,
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

  public guardarLote(propuestas: PropuestaMejoraSMDTO[]): void {
    withImmediateTransaction(this.db, () => {
      for (const p of propuestas) {
        this.guardar(p);
      }
    });
  }

  public obtenerPorId(id: string): PropuestaMejoraSMDTO | null {
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

  public listar(filtro?: { estado?: EstadoPropuesta; canal?: CanalDestino }): PropuestaMejoraSMDTO[] {
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

  public aprobar(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE propuestas_sm
      SET estado = 'aprobado', actualizado_el = ?
      WHERE propuesta_id = ? AND estado != 'publicado';
    `);
    return withImmediateTransaction(this.db, () => {
      const now = new Date();
      const res = stmt.run(now.toISOString(), id);
      const ok = Number(res.changes || 0) > 0;
      if (ok) this.encolarEnOutbox(id, now);
      return ok;
    });
  }

  public rechazar(id: string, motivo: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE propuestas_sm
      SET estado = 'rechazado', motivo_rechazo = ?, actualizado_el = ?
      WHERE propuesta_id = ?;
    `);
    const res = stmt.run(motivo, new Date().toISOString(), id);
    return Number(res.changes || 0) > 0;
  }

  public publicar(id: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE propuestas_sm
      SET estado = 'publicado', actualizado_el = ?
      WHERE propuesta_id = ? AND estado = 'aprobado';
    `);
    const res = stmt.run(new Date().toISOString(), id);
    return Number(res.changes || 0) > 0;
  }

  public aprobarLote(ids: string[]): number {
    if (ids.length === 0) return 0;

    const nowDate = new Date();
    const now = nowDate.toISOString();
    const stmt = this.db.prepare(`
      UPDATE propuestas_sm
      SET estado = 'aprobado', actualizado_el = ?
      WHERE propuesta_id = ? AND estado = 'pendiente_revision';
    `);

    return withImmediateTransaction(this.db, () => {
      let modificadas = 0;
      for (const id of ids) {
        const res = stmt.run(now, id);
        if (Number(res.changes || 0) > 0) {
          modificadas++;
          this.encolarEnOutbox(id, nowDate);
        }
      }
      return modificadas;
    });
  }

  public eliminar(id: string): boolean {
    const stmt = this.db.prepare("DELETE FROM propuestas_sm WHERE propuesta_id = ?");
    const res = stmt.run(id);
    return Number(res.changes || 0) > 0;
  }
}
