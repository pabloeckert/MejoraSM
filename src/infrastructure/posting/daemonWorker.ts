// src/infrastructure/posting/daemonWorker.ts
// PROCESO HIJO DESACOPLADO (child_process.fork) PARA MejoraSM POSTING DAEMON (2026)
// Características:
//   - Heartbeat periódico hacia el proceso supervisor vía process.send()
//   - Autoterminación inmediata al detectar 'disconnect' del proceso padre
//   - Ejecución atómica de ciclos de posting / outbox sin interferir con el hilo HTTP

import { runPostingCycle, type PostingCycleResult } from "./postingDaemon";
import { SqliteSMRepository } from "../sqlite/SqliteSMRepository";

export interface WorkerConfig {
  heartbeatIntervalMs?: number;
  dbPath?: string;
  sandbox?: boolean;
}

let isTerminating = false;
let heartbeatTimer: NodeJS.Timeout | null = null;

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
process.on("message", async (msg: any) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "PING") {
    if (process.send) {
      process.send({ type: "PONG", timestamp: Date.now() });
    }
    return;
  }

  if (msg.type === "RUN_CYCLE") {
    try {
      const repo = new SqliteSMRepository(msg.dbPath || "data/mejora_sm.db");
      const result: PostingCycleResult = await runPostingCycle({
        repository: repo,
        sandbox: msg.sandbox ?? true,
      });
      repo.close();

      if (process.send) {
        process.send({ type: "CYCLE_COMPLETED", result });
      }
    } catch (err: any) {
      if (process.send) {
        process.send({ type: "CYCLE_ERROR", error: err.message });
      }
    }
    return;
  }

  if (msg.type === "STOP") {
    isTerminating = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    process.exit(0);
  }
});

if (process.send) {
  setupWorkerLifecycle();
}
