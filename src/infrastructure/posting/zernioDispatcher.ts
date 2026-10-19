// src/infrastructure/posting/zernioDispatcher.ts
// PATRÓN INNEGOCIABLE DE DESPACHO A ZERNIO (MejoraSM 2026)
// (1) Transacción 1 (Claim): BEGIN IMMEDIATE -> UPDATE outbox_posts SET estado_post = 'DESPACHANDO', lease_owner = ? -> COMMIT
// (2) Petición HTTP fuera de transacción: fetch() a Zernio con timeout (15s < lease 60s) y circuit breaker (cero locks SQLite)
// (3) Transacción 2 (Result): BEGIN IMMEDIATE -> UPDATE outbox_posts SET estado_post = 'PUBLICADO' o 'REINTENTO'/'DEAD_LETTER' WHERE lease_owner = ? -> COMMIT
// Si changes = 0 (CAS mismatch por reaper vencido): NO sobrescribe, registra en outbox_eventos_log y deriva a reconciliación.

import { SqliteOutboxRepository, OutboxPost } from "../sqlite/SqliteOutboxRepository";
import { ZernioCircuitBreaker } from "./circuitBreaker";
import { defaultZernioCircuitBreaker, type ZernioPostPayload } from "./postingDaemon";

export const ZERNIO_HTTP_TIMEOUT_MS = 15_000; // Estrictamente menor que LEASE_DURATION_MS (60s)
export const LEASE_DURATION_MS = 60_000;

export interface DespachoResult {
  postId: string;
  exito: boolean;
  estadoFinal: string;
  error?: string;
  zernioId?: string;
  casSuccess: boolean;
  reconciliacionRequerida?: boolean;
}

export async function despacharPostAZernio(
  outboxRepo: SqliteOutboxRepository,
  post: OutboxPost,
  payload: ZernioPostPayload,
  options: {
    sandbox?: boolean;
    apiKey?: string;
    circuitBreaker?: ZernioCircuitBreaker;
    now?: Date;
    timeoutMs?: number;
  } = {}
): Promise<DespachoResult> {
  const {
    sandbox = false,
    apiKey = "sandbox_key",
    circuitBreaker = defaultZernioCircuitBreaker,
    now = new Date(),
    timeoutMs = ZERNIO_HTTP_TIMEOUT_MS,
  } = options;

  // PASO 2: Petición HTTP FUERA de cualquier transacción de SQLite
  // Con timeout defensivo estrictamente menor que el lease (15s < 60s)
  let httpExito = false;
  let zernioId: string | undefined;
  let errorMsg: string | undefined;

  if (sandbox) {
    httpExito = true;
    zernioId = `zernio_mock_${Date.now()}_${post.post_id}`;
  } else {
    try {
      const execution = await circuitBreaker.execute(
        async (signal) => {
          const timeoutController = new AbortController();
          const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

          try {
            const response = await fetch("https://zernio.com/api/v1/posts", {
              method: "POST",
              signal: timeoutController.signal,
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const errBody = await response.text();
              throw new Error(`Zernio API error ${response.status}: ${errBody}`);
            }

            const data = (await response.json()) as any;
            return data.post?.id || data.id || `zernio_${Date.now()}`;
          } finally {
            clearTimeout(timeoutId);
          }
        },
        (fallbackErr) => {
          errorMsg = `Fallback local: ${fallbackErr.message}`;
          return null;
        }
      );

      if (execution.result) {
        httpExito = true;
        zernioId = execution.result;
      }
    } catch (err: any) {
      httpExito = false;
      errorMsg = err.message;
    }
  }

  // PASO 3: Transacción 2 (Result) -> COMMIT bajo Compare-And-Set (CAS)
  if (httpExito && zernioId) {
    const casResult = outboxRepo.marcarPublicado(post.post_id, now, post.lease_owner);
    return {
      postId: post.post_id,
      exito: true,
      estadoFinal: casResult.success ? "PUBLICADO" : (outboxRepo.obtenerPorId(post.post_id)?.estado_post || "EN_COLA"),
      zernioId,
      casSuccess: casResult.success,
      reconciliacionRequerida: !casResult.success,
    };
  } else {
    const casResult = outboxRepo.registrarFallo(
      post.post_id,
      errorMsg || "Error al contactar API de Zernio",
      now,
      { leaseOwner: post.lease_owner }
    );
    return {
      postId: post.post_id,
      exito: false,
      estadoFinal: casResult.success ? casResult.estado : (outboxRepo.obtenerPorId(post.post_id)?.estado_post || "EN_COLA"),
      error: errorMsg,
      casSuccess: casResult.success,
      reconciliacionRequerida: !casResult.success,
    };
  }
}
