// src/infrastructure/posting/daemonWorker.ts
// PROCESO HIJO DESACOPLADO (child_process.fork) PARA MejoraSM OUTBOX WORKER (2026)
// Características:
//   - Heartbeat periódico hacia el proceso supervisor vía process.send()
//   - Autoterminación inmediata al detectar 'disconnect' del proceso padre
//   - Consumo transaccional de outbox_posts con leases, idempotencia y circuit breaker

import { SqliteOutboxRepository } from "../sqlite/SqliteOutboxRepository";
import { createDatabaseConnection } from "../sqlite/connectionFactory";
import { SqlitePropuestaRepository } from "../sqlite/SqlitePropuestaRepository";
import { despacharPostAZernio, inicializarCircuitBreakersMeta } from "./zernioDispatcher";
import { buildZernioPayload } from "./postingDaemon";

export interface WorkerConfig {
  heartbeatIntervalMs?: number;
  dbPath?: string;
  sandbox?: boolean;
}

export interface OutboxWorkerCycleResult {
  reclamados: number;
  publicados: number;
  reintentos: number;
  fallidos: number;
}

let isTerminating = false;
let heartbeatTimer: NodeJS.Timeout | null = null;

export async function runOutboxWorkerCycle(options: {
  dbPath?: string;
  sandbox?: boolean;
  apiKey?: string;
  limit?: number;
} = {}): Promise<OutboxWorkerCycleResult> {
  const dbPath = options.dbPath || process.env.DB_PATH || "data/mejora_sm.db";
  const sandbox = options.sandbox ?? (process.env.ZERNIO_SANDBOX === "true");
  const apiKey = options.apiKey || process.env.ZERNIO_API_KEY;

  if (!sandbox && !apiKey) {
    throw new Error("Falta ZERNIO_API_KEY requerida para la publicación real del outbox.");
  }

  const db = createDatabaseConnection(dbPath);
  const outboxRepo = new SqliteOutboxRepository(db);
  const propuestaRepo = new SqlitePropuestaRepository(db);

  // 1. Reconciliación de leases expirados (Reaper)
  outboxRepo.liberarLeasesVencidos(new Date());

  // 2. Inicializar Circuit Breakers por canal Meta
  const circuitBreakers = inicializarCircuitBreakersMeta(db);

  // 3. Reclamar lote transaccional
  const lote = outboxRepo.reclamarLote(options.limit ?? 20, new Date());
  let publicados = 0;
  let reintentos = 0;
  let fallidos = 0;

  const accountIds = {
    instagram: process.env.ZERNIO_ACCOUNT_INSTAGRAM || process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID || "",
    facebook: process.env.ZERNIO_ACCOUNT_FACEBOOK || process.env.ZERNIO_FACEBOOK_ACCOUNT_ID || "",
  };

  for (const post of lote) {
    const propuesta = propuestaRepo.obtenerPorId(post.propuesta_id);
    if (!propuesta) {
      outboxRepo.registrarFallo(post.post_id, `Propuesta ${post.propuesta_id} no encontrada en DB`, new Date(), {
        leaseOwner: post.lease_owner,
        estadoFinal: "FALLIDO_PERMANENTE",
      });
      fallidos++;
      continue;
    }

    try {
      const payload = buildZernioPayload(propuesta, accountIds);
      const res = await despacharPostAZernio(outboxRepo, post, payload, {
        sandbox,
        apiKey,
        circuitBreakers,
        now: new Date(),
      });

      if (res.exito) {
        publicados++;
        propuestaRepo.publicar(post.propuesta_id);
      } else {
        if (res.estadoFinal === "FALLIDO_PERMANENTE" || res.estadoFinal === "DEAD_LETTER") {
          fallidos++;
        } else {
          reintentos++;
        }
      }
    } catch (err: unknown) {
      outboxRepo.registrarFallo(post.post_id, (err as Error)?.message || "Error inesperado en despacho", new Date(), {
        leaseOwner: post.lease_owner,
      });
      reintentos++;
    }
  }

  return {
    reclamados: lote.length,
    publicados,
    reintentos,
    fallidos,
  };
}

export function setupWorkerLifecycle(config: WorkerConfig = {}): {
  stop: () => void;
  sendHeartbeat: () => void;
} {
  const heartbeatIntervalMs = config.heartbeatIntervalMs ?? 5000;

  const sendHeartbeat = () => {
    if (process.send && !isTerminating) {
      process.send({
        type: "heartbeat",
        pid: process.pid,
        timestamp: Date.now(),
      });
    }
  };

  // Heartbeat periódico
  heartbeatTimer = setInterval(sendHeartbeat, heartbeatIntervalMs);
  sendHeartbeat();

  // Autoterminación defensiva si el proceso padre se desconecta o muere
  process.on("disconnect", () => {
    isTerminating = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    process.exit(0);
  });

  const stop = () => {
    isTerminating = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  };

  return { stop, sendHeartbeat };
}

// Escuchar mensajes IPC del proceso supervisor
process.on("message", async (msg: unknown) => {
  if (!msg || typeof msg !== "object") return;
  const m = msg as Record<string, unknown>;

  if (m.type === "PING") {
    if (process.send) {
      process.send({ type: "PONG", timestamp: Date.now() });
    }
    return;
  }

  if (m.type === "RUN_CYCLE") {
    try {
      const result = await runOutboxWorkerCycle({
        dbPath: typeof m.dbPath === "string" ? m.dbPath : undefined,
        sandbox: typeof m.sandbox === "boolean" ? m.sandbox : undefined,
      });

      if (process.send) {
        process.send({ type: "CYCLE_COMPLETED", result });
      }
    } catch (err: unknown) {
      if (process.send) {
        process.send({ type: "CYCLE_ERROR", error: (err as Error)?.message });
      }
    }
    return;
  }

  if (m.type === "STOP") {
    isTerminating = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    process.exit(0);
  }
});

if (process.send) {
  setupWorkerLifecycle();
}

// Bucle de despacho continuo de outbox_posts (tanto en modo standalone como bajo supervisión)
const pollIntervalMs = Number(process.env.POSTING_WORKER_POLL_INTERVAL_MS) || 10_000;
console.log(`[MejoraSM Outbox Worker] Activo (intervalo: ${pollIntervalMs}ms, sandbox: ${process.env.ZERNIO_SANDBOX === "true"}).`);

const loop = async () => {
  if (isTerminating) return;
  try {
    const result = await runOutboxWorkerCycle();
    if (result.reclamados > 0) {
      console.log(
        `[MejoraSM Outbox Worker] Ciclo completado: ${result.publicados} publicados, ${result.reintentos} en reintento, ${result.fallidos} fallidos permanentes.`
      );
    }
  } catch (err: unknown) {
    console.error("[MejoraSM Outbox Worker] Error en ciclo de outbox:", (err as Error)?.message);
  }
};

setInterval(loop, pollIntervalMs);
loop();
