// src/infrastructure/sqlite/SqliteOutboxRepository.ts
// OUTBOX TRANSACCIONAL DE POSTS (node:sqlite). Reclamo y transiciones bajo BEGIN IMMEDIATE.

import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { CREATE_TABLES_SQL } from "./schema";
import { withImmediateTransaction } from "./transaction";
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
      this.db = new DatabaseSync(dbOrPath);
      this.db.exec("PRAGMA journal_mode = WAL;");
      this.db.exec("PRAGMA busy_timeout = 5000;");
      this.db.exec(CREATE_TABLES_SQL);
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

  /** Reclama atómicamente hasta `limite` posts listos y los marca DESPACHANDO. */
  public reclamarLote(limite: number, now: Date = new Date()): OutboxPost[] {
    const ahoraIso = now.toISOString();
    return withImmediateTransaction(this.db, () => {
      const filas = this.db
        .prepare(
          `SELECT * FROM outbox_posts
           WHERE estado_post IN ('APROBADO','EN_COLA')
              OR (estado_post = 'REINTENTO' AND (proximo_reintento_at IS NULL OR proximo_reintento_at <= ?))
           ORDER BY creado_en ASC, rowid ASC LIMIT ?`
        )
        .all(ahoraIso, limite) as unknown as OutboxPost[];
      const marcar = this.db.prepare(
        "UPDATE outbox_posts SET estado_post = 'DESPACHANDO', actualizado_en = ? WHERE post_id = ?"
      );
      for (const f of filas) marcar.run(ahoraIso, f.post_id);
      return filas.map((f) => ({ ...f, estado_post: "DESPACHANDO" as const, actualizado_en: ahoraIso }));
    });
  }

  public marcarPublicado(postId: string, now: Date = new Date()): void {
    this.db
      .prepare(
        "UPDATE outbox_posts SET estado_post = 'PUBLICADO', error_ultimo = NULL, proximo_reintento_at = NULL, actualizado_en = ? WHERE post_id = ? AND estado_post = 'DESPACHANDO'"
      )
      .run(now.toISOString(), postId);
  }

  /** Fallo de envío: REINTENTO con backoff exponencial + jitter, o FALLIDO_PERMANENTE al agotar reintentos. */
  public registrarFallo(
    postId: string,
    error: string,
    now: Date = new Date(),
    opts: { maxReintentos?: number; backoff?: BackoffOptions } = {}
  ): EstadoPostOutbox {
    const max = opts.maxReintentos ?? MAX_REINTENTOS_OUTBOX;
    return withImmediateTransaction(this.db, () => {
      const post = this.obtenerPorId(postId);
      if (!post) throw new Error(`Outbox post ${postId} no encontrado`);
      const intentos = post.reintentos_cont + 1;
      const permanente = intentos >= max;
      const estado: EstadoPostOutbox = permanente ? "FALLIDO_PERMANENTE" : "REINTENTO";
      const proximo = permanente
        ? null
        : new Date(now.getTime() + calcularBackoffConJitter(intentos, opts.backoff)).toISOString();
      this.db
        .prepare(
          "UPDATE outbox_posts SET estado_post = ?, reintentos_cont = ?, proximo_reintento_at = ?, error_ultimo = ?, actualizado_en = ? WHERE post_id = ?"
        )
        .run(estado, intentos, proximo, error, now.toISOString(), postId);
      return estado;
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
