// src/infrastructure/sqlite/SqliteProspectoRepository.ts
// REPOSITORIO CRM DE PROSPECTOS (node:sqlite). Toda mutación = BEGIN IMMEDIATE +
// registro automático en prospecto_eventos_log dentro de la MISMA transacción.

import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { withImmediateTransaction } from "./transaction";
import { createDatabaseConnection } from "./connectionFactory";
import {
  type EstadoProspectoV2,
  calcularSlaCalificacion,
  validarTransicion,
  esEstadoProspecto,
} from "../../domain/prospectoStateMachine";

export interface ProspectoV2 {
  prospecto_id: string;
  email: string;
  telefono: string | null;
  nombre: string;
  empresa: string | null;
  estado: EstadoProspectoV2;
  origen_utm: string | null;
  pieza_id_atribucion: string;
  perfil_detectado_id: string | null;
  motivo_descarte_id: string | null;
  fecha_captura: string;
  fecha_actualizacion: string;
  sla_limite_calificacion: string;
}

export interface ProspectoEventoLog {
  evento_id: string;
  prospecto_id: string;
  estado_anterior: EstadoProspectoV2 | null;
  estado_nuevo: EstadoProspectoV2;
  motivo_catalogo: string | null;
  metadata_json: string | null;
  creado_en: string;
}

export interface NuevoLeadInput {
  email: string;
  nombre: string;
  telefono?: string | null;
  empresa?: string | null;
  origen_utm?: string | null;
  pieza_id_atribucion: string;
}

export interface TransicionOpciones {
  motivo_catalogo?: string | null;
  metadata?: Record<string, unknown>;
  perfil_detectado_id?: string | null;
}

export class ProspectoNoEncontradoError extends Error {
  constructor(public readonly prospectoId: string) {
    super(`Prospecto ${prospectoId} no encontrado`);
    this.name = "ProspectoNoEncontradoError";
  }
}

export class SqliteProspectoRepository {
  private db: DatabaseSync;

  constructor(dbOrPath: DatabaseSync | string = "data/mejora_sm.db") {
    if (typeof dbOrPath === "string") {
      this.db = createDatabaseConnection(dbOrPath);
    } else {
      this.db = dbOrPath;
    }
  }

  private insertarEvento(
    prospectoId: string,
    anterior: EstadoProspectoV2 | null,
    nuevo: EstadoProspectoV2,
    motivo: string | null,
    metadata: Record<string, unknown> | undefined,
    ahoraIso: string
  ): void {
    this.db
      .prepare(
        `INSERT INTO prospecto_eventos_log
         (evento_id, prospecto_id, estado_anterior, estado_nuevo, motivo_catalogo, metadata_json, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        prospectoId,
        anterior,
        nuevo,
        motivo,
        metadata ? JSON.stringify(metadata) : null,
        ahoraIso
      );
  }

  /** Captura idempotente por email: si ya existe devuelve el prospecto existente sin mutarlo. */
  public capturarLead(input: NuevoLeadInput, now: Date = new Date()): { prospecto: ProspectoV2; creado: boolean } {
    const email = input.email.trim().toLowerCase();
    return withImmediateTransaction(this.db, () => {
      const existente = this.db.prepare("SELECT * FROM prospectos WHERE email = ?").get(email) as
        | ProspectoV2
        | undefined;
      if (existente) return { prospecto: existente, creado: false };

      const ahoraIso = now.toISOString();
      const prospecto: ProspectoV2 = {
        prospecto_id: randomUUID(),
        email,
        telefono: input.telefono ?? null,
        nombre: input.nombre.trim(),
        empresa: input.empresa ?? null,
        estado: "CAPTURADO",
        origen_utm: input.origen_utm ?? null,
        pieza_id_atribucion: input.pieza_id_atribucion,
        perfil_detectado_id: null,
        motivo_descarte_id: null,
        fecha_captura: ahoraIso,
        fecha_actualizacion: ahoraIso,
        sla_limite_calificacion: calcularSlaCalificacion(now),
      };
      this.db
        .prepare(
          `INSERT INTO prospectos (prospecto_id, email, telefono, nombre, empresa, estado, origen_utm,
             pieza_id_atribucion, perfil_detectado_id, motivo_descarte_id, fecha_captura,
             fecha_actualizacion, sla_limite_calificacion)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          prospecto.prospecto_id,
          prospecto.email,
          prospecto.telefono,
          prospecto.nombre,
          prospecto.empresa,
          prospecto.estado,
          prospecto.origen_utm,
          prospecto.pieza_id_atribucion,
          prospecto.perfil_detectado_id,
          prospecto.motivo_descarte_id,
          prospecto.fecha_captura,
          prospecto.fecha_actualizacion,
          prospecto.sla_limite_calificacion
        );
      this.insertarEvento(prospecto.prospecto_id, null, "CAPTURADO", null, {
        origen_utm: prospecto.origen_utm,
        pieza_id_atribucion: prospecto.pieza_id_atribucion,
      }, ahoraIso);
      return { prospecto, creado: true };
    });
  }

  /** Transición validada contra la tabla declarativa + evento de auditoría atómico. */
  public transicionar(
    prospectoId: string,
    nuevoEstado: EstadoProspectoV2,
    opciones: TransicionOpciones = {},
    now: Date = new Date()
  ): ProspectoV2 {
    return withImmediateTransaction(this.db, () => {
      const actual = this.db.prepare("SELECT * FROM prospectos WHERE prospecto_id = ?").get(prospectoId) as
        | ProspectoV2
        | undefined;
      if (!actual) throw new ProspectoNoEncontradoError(prospectoId);
      if (!esEstadoProspecto(actual.estado)) {
        throw new Error(`Estado persistido corrupto para ${prospectoId}: ${String(actual.estado)}`);
      }

      validarTransicion(actual.estado, nuevoEstado, opciones.motivo_catalogo);

      const ahoraIso = now.toISOString();
      const motivoDescarte = nuevoEstado === "DESCARTADO" ? (opciones.motivo_catalogo ?? null) : actual.motivo_descarte_id;
      const perfil = opciones.perfil_detectado_id ?? actual.perfil_detectado_id;
      this.db
        .prepare(
          `UPDATE prospectos SET estado = ?, motivo_descarte_id = ?, perfil_detectado_id = ?, fecha_actualizacion = ?
           WHERE prospecto_id = ?`
        )
        .run(nuevoEstado, motivoDescarte, perfil, ahoraIso, prospectoId);
      this.insertarEvento(
        prospectoId,
        actual.estado,
        nuevoEstado,
        opciones.motivo_catalogo ?? null,
        opciones.metadata,
        ahoraIso
      );
      return { ...actual, estado: nuevoEstado, motivo_descarte_id: motivoDescarte, perfil_detectado_id: perfil, fecha_actualizacion: ahoraIso };
    });
  }

  public obtenerPorId(prospectoId: string): ProspectoV2 | null {
    return (this.db.prepare("SELECT * FROM prospectos WHERE prospecto_id = ?").get(prospectoId) as ProspectoV2 | undefined) ?? null;
  }

  public listarEventos(prospectoId: string): ProspectoEventoLog[] {
    return this.db
      .prepare("SELECT * FROM prospecto_eventos_log WHERE prospecto_id = ? ORDER BY creado_en ASC, rowid ASC")
      .all(prospectoId) as unknown as ProspectoEventoLog[];
  }

  /** Prospectos CAPTURADO cuyo SLA de 48 h para calificar ya venció (usa idx_prospectos_estado_sla). */
  public listarSlaVencidos(now: Date = new Date()): ProspectoV2[] {
    return this.db
      .prepare("SELECT * FROM prospectos WHERE estado = 'CAPTURADO' AND sla_limite_calificacion < ? ORDER BY sla_limite_calificacion ASC")
      .all(now.toISOString()) as unknown as ProspectoV2[];
  }
}
