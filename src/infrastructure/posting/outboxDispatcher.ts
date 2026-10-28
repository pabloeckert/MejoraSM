// src/infrastructure/posting/outboxDispatcher.ts
// DESPACHADOR DEL OUTBOX con Circuit Breaker V2. El transporte (`sender`) es inyectado:
// este módulo NO realiza llamadas de red por sí mismo (tests 100% herméticos).

import {
  SqliteOutboxRepository,
  type OutboxPost,
} from "../sqlite/SqliteOutboxRepository";
import { ZernioCircuitBreaker } from "./circuitBreaker";

export type OutboxSender = (post: OutboxPost, signal: AbortSignal) => Promise<string>;

export interface OutboxDispatchOptions {
  outbox: SqliteOutboxRepository;
  sender: OutboxSender;
  circuitBreaker: ZernioCircuitBreaker;
  now?: () => Date;
  limite?: number;
  maxReintentos?: number;
}

export interface OutboxDispatchResult {
  reclamados: number;
  publicados: number;
  reintentos: number;
  fallidosPermanentes: number;
  diferidosPorCircuitoAbierto: number;
}

type SendOutcome = { ok: true; externalId: string } | { ok: false; error: string };

export async function dispatchOutbox(opts: OutboxDispatchOptions): Promise<OutboxDispatchResult> {
  const { outbox, sender, circuitBreaker } = opts;
  const clock = opts.now ?? (() => new Date());
  const result: OutboxDispatchResult = {
    reclamados: 0,
    publicados: 0,
    reintentos: 0,
    fallidosPermanentes: 0,
    diferidosPorCircuitoAbierto: 0,
  };

  // Circuito abierto: ni siquiera se reclaman posts (no se consume ningún intento).
  if (circuitBreaker.getState() === "OPEN") return result;

  const lote = outbox.reclamarLote(opts.limite ?? 20, clock());
  result.reclamados = lote.length;

  for (const post of lote) {
    if (circuitBreaker.getState() === "OPEN") {
      const ahora = clock();
      outbox.liberarSinPenalizar(
        post.post_id,
        new Date(ahora.getTime() + circuitBreaker.cooldownMs),
        "Circuit Breaker OPEN: diferido sin consumir reintento",
        ahora
      );
      result.diferidosPorCircuitoAbierto++;
      continue;
    }

    const exec = await circuitBreaker.execute<SendOutcome>(
      async (signal) => ({ ok: true, externalId: await sender(post, signal) }),
      (err) => ({ ok: false, error: err.message })
    );

    if (exec.result.ok) {
      outbox.marcarPublicado(post.post_id, clock());
      result.publicados++;
    } else {
      const falloRes = outbox.registrarFallo(post.post_id, exec.result.error, clock(), {
        maxReintentos: opts.maxReintentos,
      });
      const estadoPost = falloRes.estado;
      if (estadoPost === "FALLIDO_PERMANENTE") result.fallidosPermanentes++;
      else result.reintentos++;
    }
  }
  return result;
}
