// src/infrastructure/sqlite/SqliteOutboxRepository.ts
// OUTBOX TRANSACCIONAL DE POSTS (node:sqlite). Reclamo y transiciones bajo BEGIN IMMEDIATE.

import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { withImmediateTransaction } from "./transaction";
import { createDatabaseConnection } from "./connectionFactory";
import { generarClaveIdempotencia, MAX_REINTENTOS_OUTBOX } from "../../domain/outbox";
import { calcularBackoffConJitter, type BackoffOptions } from "../posting/circuitBreaker";

export type EstadoPostOutbox =
  | "BORRADOR"
  | "APROBADO"
  | "EN_COLA"
  | "DESPACHANDO"
  | "PUBLICADO"
  | "REINTENTO"
  | "FALLIDO_PERMANENTE"
  | "CANCELADO";

export interface OutboxPost {
  post_id: string;
  propuesta_id: string;
  canal: string;
  borrador_opcion: string;
  estado_post: EstadoPostOutbox;
  reintentos_cont: number;
  clave_idempotencia: string;
  lease_owner: string | null;
  lease_expira_at: string | null;
  proximo_reintento_at: string | null;
  error_ultimo: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface EncolarInput {
  propuesta_id: string;
  canal: string;
  borrador_opcion: string;
}

export class SqliteOutboxRepository {
  private db: DatabaseSync;

  constructor(dbOrPath: DatabaseSync | string = "data/mejora_sm.db") {
    if (typeof dbOrPath === "string") {
      this.db = createDatabaseConnection(dbOrPath);
    } else {
      this.db = dbOrPath;
    }
  }

  /**
   * Inserta el post como APROBADO de forma idempotente (INSERT OR IGNORE sobre clave UNIQUE).
   * NO abre transacción: está pensado para invocarse dentro de la transacción de aprobación.
   * Devuelve true si se creó un post nuevo.
   */
  public encolarAprobado(input: EncolarInput, now: Date = new Date()): boolean {
    const ahoraIso = now.toISOString();
    const clave = generarClaveIdempotencia(input.propuesta_id, input.canal, input.borrador_opcion, now);
    const res = this.db
      .prepare(
        `INSERT OR IGNORE INTO outbox_posts
         (post_id, propuesta_id, canal, borrador_opcion, estado_post, reintentos_cont,
          clave_idempotencia, proximo_reintento_at, error_ultimo, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, 'APROBADO', 0, ?, NULL, NULL, ?, ?)`
      )
      .run(randomUUID(), input.propuesta_id, input.canal, input.borrador_opcion, clave, ahoraIso, ahoraIso);
    return Number(res.changes || 0) > 0;
  }

  /**
   * Encola un post para publicación con estado 'EN_COLA' y clave de idempotencia única SHA-256.
   * Si ya existe un registro con la misma clave de idempotencia en estado APROBADO, lo transiciona a EN_COLA.
   */
  public encolarPost(
    input: EncolarInput,
    now: Date = new Date()
  ): { success: boolean; postId: string; claveIdempotencia: string } {
    const ahoraIso = now.toISOString();
    const clave = generarClaveIdempotencia(input.propuesta_id, input.canal, input.borrador_opcion, now);
    const postId = randomUUID();

    return withImmediateTransaction(this.db, () => {
      const existente = this.db
        .prepare("SELECT post_id, estado_post FROM outbox_posts WHERE clave_idempotencia = ?")
        .get(clave) as { post_id: string; estado_post: string } | undefined;

      if (existente) {
        if (existente.estado_post === "APROBADO") {
          this.db
            .prepare("UPDATE outbox_posts SET estado_post = 'EN_COLA', actualizado_en = ? WHERE post_id = ?")
            .run(ahoraIso, existente.post_id);
        }
        return { success: true, postId: existente.post_id, claveIdempotencia: clave };
      }

      this.db
        .prepare(
          `INSERT INTO outbox_posts
           (post_id, propuesta_id, canal, borrador_opcion, estado_post, reintentos_cont,
            clave_idempotencia, proximo_reintento_at, error_ultimo, creado_en, actualizado_en)
           VALUES (?, ?, ?, ?, 'EN_COLA', 0, ?, NULL, NULL, ?, ?)`
        )
        .run(postId, input.propuesta_id, input.canal, input.borrador_opcion, clave, ahoraIso, ahoraIso);

      return { success: true, postId, claveIdempotencia: clave };
    });
  }

  /** Reclama atómicamente hasta `limite` posts listos y los marca DESPACHANDO con lease_owner y lease_expira_at. */
  public reclamarLote(
    limite: number,
    now: Date = new Date(),
    leaseOwner: string = randomUUID(),
    leaseDurationMs: number = 60_000
  ): OutboxPost[] {
    const ahoraIso = now.toISOString();
    const leaseExpiraIso = new Date(now.getTime() + leaseDurationMs).toISOString();

    return withImmediateTransaction(this.db, () => {
      const filas = this.db
        .prepare(
          `SELECT * FROM outbox_posts
           WHERE estado_post IN ('APROBADO','EN_COLA')
              OR (estado_post = 'REINTENTO' AND (proximo_reintento_at IS NULL OR proximo_reintento_at <= ?))
           ORDER BY creado_en ASC, rowid ASC LIMIT ?`
        )
        .all(ahoraIso, limite) as unknown as OutboxPost[];

      const pasarACola = this.db.prepare(
        "UPDATE outbox_posts SET estado_post = 'EN_COLA', actualizado_en = ? WHERE post_id = ? AND estado_post = 'APROBADO'"
      );
      const marcar = this.db.prepare(
        "UPDATE outbox_posts SET estado_post = 'DESPACHANDO', lease_owner = ?, lease_expira_at = ?, actualizado_en = ? WHERE post_id = ?"
      );
      for (const f of filas) {
        if (f.estado_post === "APROBADO") {
          pasarACola.run(ahoraIso, f.post_id);
        }
        marcar.run(leaseOwner, leaseExpiraIso, ahoraIso, f.post_id);
      }
      return filas.map((f) => ({
        ...f,
        estado_post: "DESPACHANDO" as const,
        lease_owner: leaseOwner,
        lease_expira_at: leaseExpiraIso,
        actualizado_en: ahoraIso,
      }));
    });
  }

  /**
   * Commit de resultado PUBLICADO con Compare-And-Set (CAS):
   * UPDATE outbox_posts SET estado_post='PUBLICADO'... WHERE post_id=? AND lease_owner=? AND estado_post='DESPACHANDO'
   */
  public marcarPublicado(
    postId: string,
    now: Date = new Date(),
    leaseOwner?: string | null
  ): { success: boolean; changes: number } {
    const ahoraIso = now.toISOString();
    return withImmediateTransaction(this.db, () => {
      let res: { changes: number | bigint };
      if (leaseOwner) {
        res = this.db
          .prepare(
            `UPDATE outbox_posts
             SET estado_post = 'PUBLICADO',
                 lease_owner = NULL,
                 lease_expira_at = NULL,
                 error_ultimo = NULL,
                 proximo_reintento_at = NULL,
                 actualizado_en = ?
             WHERE post_id = ? AND lease_owner = ? AND estado_post = 'DESPACHANDO'`
          )
          .run(ahoraIso, postId, leaseOwner);
      } else {
        res = this.db
          .prepare(
            `UPDATE outbox_posts
             SET estado_post = 'PUBLICADO',
                 lease_owner = NULL,
                 lease_expira_at = NULL,
                 error_ultimo = NULL,
                 proximo_reintento_at = NULL,
                 actualizado_en = ?
             WHERE post_id = ? AND estado_post = 'DESPACHANDO'`
          )
          .run(ahoraIso, postId);
      }

      const changes = Number(res.changes || 0);
      if (changes === 0) {
        this.db
          .prepare(
            `INSERT INTO outbox_eventos_log (
              evento_id, post_id, estado_anterior, estado_nuevo, motivo_catalogo, metadata_json, creado_en
            ) VALUES (?, ?, 'DESPACHANDO', 'DESPACHANDO', 'CAS_LEASE_MISMATCH_REAPED', ?, ?)`
          )
          .run(
            randomUUID(),
            postId,
            JSON.stringify({ lease_owner: leaseOwner, accion: "marcarPublicado" }),
            ahoraIso
          );
        return { success: false, changes: 0 };
      }

      this.db
        .prepare(
          `INSERT INTO outbox_eventos_log (
            evento_id, post_id, estado_anterior, estado_nuevo, motivo_catalogo, metadata_json, creado_en
          ) VALUES (?, ?, 'DESPACHANDO', 'PUBLICADO', 'PUBLICACION_EXITOSA', NULL, ?)`
        )
        .run(randomUUID(), postId, ahoraIso);

      return { success: true, changes: 1 };
    });
  }

  /** Fallo de envío con Compare-And-Set (CAS). */
  public registrarFallo(
    postId: string,
    error: string,
    now: Date = new Date(),
    opts: {
      maxReintentos?: number;
      backoff?: BackoffOptions;
      leaseOwner?: string | null;
      estadoFinal?: EstadoPostOutbox;
    } = {}
  ): { success: boolean; estado: EstadoPostOutbox; changes: number } {
    const max = opts.maxReintentos ?? MAX_REINTENTOS_OUTBOX;
    const ahoraIso = now.toISOString();

    return withImmediateTransaction(this.db, () => {
      const post = this.obtenerPorId(postId);
      if (!post) throw new Error(`Outbox post ${postId} no encontrado`);
      const intentos = post.reintentos_cont + 1;
      const permanente = intentos >= max;
      const estado: EstadoPostOutbox = permanente ? (opts.estadoFinal ?? "FALLIDO_PERMANENTE") : "REINTENTO";
      const proximo = permanente
        ? null
        : new Date(now.getTime() + calcularBackoffConJitter(intentos, opts.backoff)).toISOString();

      let res: { changes: number | bigint };
      if (opts.leaseOwner) {
        res = this.db
          .prepare(
            `UPDATE outbox_posts
             SET estado_post = ?,
                 reintentos_cont = ?,
                 lease_owner = NULL,
                 lease_expira_at = NULL,
                 proximo_reintento_at = ?,
                 error_ultimo = ?,
                 actualizado_en = ?
             WHERE post_id = ? AND lease_owner = ? AND estado_post = 'DESPACHANDO'`
          )
          .run(estado, intentos, proximo, error, ahoraIso, postId, opts.leaseOwner);
      } else {
        res = this.db
          .prepare(
            `UPDATE outbox_posts
             SET estado_post = ?,
                 reintentos_cont = ?,
                 lease_owner = NULL,
                 lease_expira_at = NULL,
                 proximo_reintento_at = ?,
                 error_ultimo = ?,
                 actualizado_en = ?
             WHERE post_id = ? AND estado_post = 'DESPACHANDO'`
          )
          .run(estado, intentos, proximo, error, ahoraIso, postId);
      }

      const changes = Number(res.changes || 0);
      if (changes === 0) {
        this.db
          .prepare(
            `INSERT INTO outbox_eventos_log (
              evento_id, post_id, estado_anterior, estado_nuevo, motivo_catalogo, metadata_json, creado_en
            ) VALUES (?, ?, 'DESPACHANDO', 'DESPACHANDO', 'CAS_LEASE_MISMATCH_REAPED', ?, ?)`
          )
          .run(
            randomUUID(),
            postId,
            JSON.stringify({ lease_owner: opts.leaseOwner, accion: "registrarFallo", error }),
            ahoraIso
          );
        return { success: false, estado, changes: 0 };
      }

      this.db
        .prepare(
          `INSERT INTO outbox_eventos_log (
            evento_id, post_id, estado_anterior, estado_nuevo, motivo_catalogo, metadata_json, creado_en
          ) VALUES (?, ?, 'DESPACHANDO', ?, 'DESPACHO_FALLIDO', ?, ?)`
        )
        .run(
          randomUUID(),
          postId,
          estado,
          JSON.stringify({ error, reintentos_cont: intentos }),
          ahoraIso
        );

      return { success: true, estado, changes: 1 };
    });
  }

  /** Devuelve el post a REINTENTO SIN penalizar el contador (circuito abierto: no hubo intento real). */
  public liberarSinPenalizar(postId: string, proximoReintento: Date, motivo: string, now: Date = new Date()): void {
    this.db
      .prepare(
        "UPDATE outbox_posts SET estado_post = 'REINTENTO', proximo_reintento_at = ?, error_ultimo = ?, actualizado_en = ? WHERE post_id = ? AND estado_post = 'DESPACHANDO'"
      )
      .run(proximoReintento.toISOString(), motivo, now.toISOString(), postId);
  }

  /** Reaper de leases vencidos: devuelve posts DESPACHANDO expirados a EN_COLA incrementando (+1) reintentos_cont. */
  public liberarLeasesVencidos(now: Date = new Date()): number {
    const ahoraIso = now.toISOString();
    return withImmediateTransaction(this.db, () => {
      const res = this.db
        .prepare(
          `UPDATE outbox_posts
           SET estado_post = 'EN_COLA',
               reintentos_cont = reintentos_cont + 1,
               lease_owner = NULL,
               lease_expira_at = NULL,
               actualizado_en = ?
           WHERE estado_post = 'DESPACHANDO' AND lease_expira_at <= ?`
        )
        .run(ahoraIso, ahoraIso);
      return Number(res.changes || 0);
    });
  }

  public cancelar(postId: string, now: Date = new Date()): boolean {
    const res = this.db
      .prepare(
        "UPDATE outbox_posts SET estado_post = 'CANCELADO', actualizado_en = ? WHERE post_id = ? AND estado_post IN ('BORRADOR','APROBADO','EN_COLA','REINTENTO')"
      )
      .run(now.toISOString(), postId);
    return Number(res.changes || 0) > 0;
  }

  public obtenerPorId(postId: string): OutboxPost | null {
    return (this.db.prepare("SELECT * FROM outbox_posts WHERE post_id = ?").get(postId) as OutboxPost | undefined) ?? null;
  }

  public listarPorPropuesta(propuestaId: string): OutboxPost[] {
    return this.db
      .prepare("SELECT * FROM outbox_posts WHERE propuesta_id = ? ORDER BY creado_en ASC")
      .all(propuestaId) as unknown as OutboxPost[];
  }
}
