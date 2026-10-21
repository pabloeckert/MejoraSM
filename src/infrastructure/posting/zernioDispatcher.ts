// src/infrastructure/posting/zernioDispatcher.ts
// PATRÓN INNEGOCIABLE DE DESPACHO A ZERNIO CON RECONCILIACIÓN ACTIVA (MejoraSM 2026)
// (1) Transacción 1 (Claim): BEGIN IMMEDIATE -> UPDATE outbox_posts SET estado_post = 'DESPACHANDO', lease_owner = ? -> COMMIT
// (2) Reconciliación Activa (Effectively-Once): Si es un reintento (reintentos_cont > 0), consulta la API de Zernio por clave_idempotencia.
//     Si ya existe en la plataforma remota, actualiza estado a PUBLICADO sin re-publicar.
// (3) Petición HTTP fuera de transacción: fetch() a Zernio con timeout (15s < lease 60s), header Idempotency-Key y circuit breaker.
// (4) Transacción 2 (Result): BEGIN IMMEDIATE -> UPDATE outbox_posts SET estado_post = 'PUBLICADO' o 'REINTENTO'/'DEAD_LETTER' WHERE lease_owner = ? -> COMMIT
// Si changes = 0 (CAS mismatch por reaper vencido): NO sobrescribe, registra en outbox_eventos_log y deriva a reconciliación.

import { SqliteOutboxRepository, OutboxPost } from "../sqlite/SqliteOutboxRepository";
import { ZernioCircuitBreaker } from "./circuitBreaker";
import { defaultZernioCircuitBreaker, type ZernioPostPayload } from "./postingDaemon";
import { inicializarCircuitBreakersMeta, PersistedChannelCircuitBreaker, type CanalMeta } from "./persistedCircuitBreaker";
export { inicializarCircuitBreakersMeta };

export const ZERNIO_HTTP_TIMEOUT_MS = 15_000; // Estrictamente menor que LEASE_DURATION_MS (60s)
export const LEASE_DURATION_MS = 60_000;

export interface ZernioReconciliationClient {
  consultarPorClaveIdempotencia: (
    claveIdempotencia: string
  ) => Promise<{ existe: boolean; zernioId?: string } | null>;
}

export interface DespachoResult {
  postId: string;
  exito: boolean;
  estadoFinal: string;
  error?: string;
  zernioId?: string;
  casSuccess: boolean;
  reconciliacionRequerida?: boolean;
  reconciliadoPreviamente?: boolean;
}

export async function despacharPostAZernio(
  outboxRepo: SqliteOutboxRepository,
  post: OutboxPost,
  payload: ZernioPostPayload,
  options: {
    sandbox?: boolean;
    apiKey?: string;
    circuitBreaker?: ZernioCircuitBreaker | PersistedChannelCircuitBreaker;
    circuitBreakers?: Record<CanalMeta, PersistedChannelCircuitBreaker>;
    now?: Date;
    timeoutMs?: number;
    reconciliationClient?: ZernioReconciliationClient;
  } = {}
): Promise<DespachoResult> {
  const {
    sandbox = false,
    apiKey = "sandbox_key",
    circuitBreaker = defaultZernioCircuitBreaker,
    now = new Date(),
    timeoutMs = ZERNIO_HTTP_TIMEOUT_MS,
    reconciliationClient,
  } = options;

  // DIRECTIVA FASE 4: RECONCILIACIÓN ACTIVA CON ZERNIO (EFFECTIVELY-ONCE)
  // Antes de cada REINTENTO por timeout, consultar la API de Zernio mediante la clave_idempotencia o Idempotency-Key.
  // Si el post ya existe en la plataforma remota, actualizar el estado local a PUBLICADO sin re-publicar.
  if (post.reintentos_cont > 0 && reconciliationClient) {
    try {
      const remoto = await reconciliationClient.consultarPorClaveIdempotencia(post.clave_idempotencia);
      if (remoto && remoto.existe && remoto.zernioId) {
        const casResult = outboxRepo.marcarPublicado(post.post_id, now, post.lease_owner);
        return {
          postId: post.post_id,
          exito: true,
          estadoFinal: casResult.success ? "PUBLICADO" : (outboxRepo.obtenerPorId(post.post_id)?.estado_post || "EN_COLA"),
          zernioId: remoto.zernioId,
          casSuccess: casResult.success,
          reconciliacionRequerida: !casResult.success,
          reconciliadoPreviamente: true,
        };
      }
    } catch {
      // Si la consulta falla por red, continuamos con el intento normal
    }
  }

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
      if (post.canal === 'linkedin') {
        throw new Error("Canal 'linkedin' no admitido en el despachador. Operación exclusiva Meta ('instagram' | 'facebook').");
      }
      const activeBreaker = (options.circuitBreakers && (options.circuitBreakers as any)[post.canal]) || circuitBreaker;
      const execution = await activeBreaker.execute(
        async () => {
          const timeoutController = new AbortController();
          const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

          try {
            const response = await fetch("https://zernio.com/api/v1/posts", {
              method: "POST",
              signal: timeoutController.signal,
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Idempotency-Key": post.clave_idempotencia,
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
