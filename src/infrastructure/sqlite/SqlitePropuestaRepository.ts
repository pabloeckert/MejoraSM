// src/infrastructure/sqlite/SqlitePropuestaRepository.ts
import { DatabaseSync } from "node:sqlite";
import { withImmediateTransaction } from "./transaction";
import { SqliteOutboxRepository } from "./SqliteOutboxRepository";
import { createDatabaseConnection } from "./connectionFactory";
import {
  type PropuestaMejoraSMDTO,
  type EstadoPropuesta,
  type CanalDestino,
  type OpcionBorrador,
  type BorradorPropuestaDTO,
  type CopyCalibradoTresPasos,
} from "../../domain/types";

export interface CamposEdicionPropuesta {
  title?: string;
  hook?: string;
  body?: string;
  cta?: string;
  copy_tres_pasos?: CopyCalibradoTresPasos;
  imagen_boveda_vinculada?: { id: string; ruta_archivo_local: string; titulo?: string };
  borrador_seleccionado?: OpcionBorrador;
}

interface PropuestaRow {
  propuesta_id: string;
  canal_destino: string;
  dia_programado: string;
  origen_boveda_id: string;
  borradores_json: string;
  borrador_seleccionado: string;
  tratamiento_visual_json: string;
  imagen_boveda_json: string;
  estado: string;
  motivo_rechazo: string | null;
  metricas_json: string | null;
  creado_el: string;
  actualizado_el: string;
}

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

  public getOutboxRepo(): SqliteOutboxRepository {
    return this.outbox;
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
    const row = stmt.get(id) as PropuestaRow | undefined;
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

  public editar(id: string, fields: CamposEdicionPropuesta): PropuestaMejoraSMDTO | null {
    const p = this.obtenerPorId(id);
    if (!p) return null;

    const borradorActivo = fields.borrador_seleccionado || p.borrador_seleccionado || "A";
    const nuevosBorradores = p.borradores.map((b) => {
      if (b.opcion === borradorActivo) {
        const nuevoCopyTresPasos: CopyCalibradoTresPasos = fields.copy_tres_pasos
          ? { ...fields.copy_tres_pasos }
          : {
              paso1_dolor: fields.hook !== undefined ? fields.hook : b.copy_tres_pasos.paso1_dolor,
              paso2_reencuadre: fields.body !== undefined ? fields.body : b.copy_tres_pasos.paso2_reencuadre,
              paso3_direccion_web: fields.cta !== undefined ? fields.cta : b.copy_tres_pasos.paso3_direccion_web,
            };

        const nuevoCuerpo = fields.copy_tres_pasos
          ? `${fields.copy_tres_pasos.paso1_dolor}\n\n${fields.copy_tres_pasos.paso2_reencuadre}`
          : fields.body !== undefined
          ? fields.body
          : b.cuerpo_texto;

        const nuevoCta =
          fields.copy_tres_pasos?.paso3_direccion_web ??
          (fields.cta !== undefined ? fields.cta : b.cta_texto);

        return {
          ...b,
          titulo_portada: fields.title ?? b.titulo_portada,
          copy_tres_pasos: nuevoCopyTresPasos,
          cuerpo_texto: nuevoCuerpo,
          cta_texto: nuevoCta,
        };
      }
      return b;
    }) as [BorradorPropuestaDTO, BorradorPropuestaDTO, BorradorPropuestaDTO];

    const propuestaActualizada: PropuestaMejoraSMDTO = {
      ...p,
      borradores: nuevosBorradores,
      borrador_seleccionado: fields.borrador_seleccionado ?? p.borrador_seleccionado,
      imagen_boveda_vinculada: fields.imagen_boveda_vinculada
        ? {
            ...p.imagen_boveda_vinculada,
            ...fields.imagen_boveda_vinculada,
          }
        : p.imagen_boveda_vinculada,
    };

    this.guardar(propuestaActualizada);
    return propuestaActualizada;
  }

  public listar(filtro?: { estado?: EstadoPropuesta; canal?: CanalDestino; limit?: number; offset?: number }): PropuestaMejoraSMDTO[] {
    let query = "SELECT * FROM propuestas_sm WHERE 1=1";
    const params: (string | number)[] = [];

    if (filtro?.estado) {
      query += " AND estado = ?";
      params.push(filtro.estado);
    }
    if (filtro?.canal) {
      query += " AND canal_destino = ?";
      params.push(filtro.canal);
    }
    query += " ORDER BY dia_programado ASC";

    if (filtro?.limit !== undefined && filtro.limit > 0) {
      query += " LIMIT ?";
      params.push(filtro.limit);
      if (filtro?.offset !== undefined && filtro.offset > 0) {
        query += " OFFSET ?";
        params.push(filtro.offset);
      }
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as unknown as PropuestaRow[];

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
