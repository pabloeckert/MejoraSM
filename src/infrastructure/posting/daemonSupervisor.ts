// src/infrastructure/posting/daemonSupervisor.ts
// SUPERVISOR DE PROCESO HIJO (child_process.fork) PARA MejoraSM (2026)
// Supervisa el ciclo de vida del postingDaemon:
//   - Watchdog de heartbeat: detecta procesos colgados tras N intervalos => SIGKILL
//   - Respawn con backoff exponencial topado (anti crash-loop)
//   - Autoterminación del hijo si el padre se desconecta ('disconnect')
//   - Desacople total del hilo principal del servidor HTTP

import { fork, ChildProcess } from "node:child_process";
import * as path from "node:path";

export interface SupervisorStatus {
  running: boolean;
  pid: number | null;
  respawnCount: number;
  lastHeartbeat: number | null;
  workerPath: string;
  isHungKilled: boolean;
}

export class PostingDaemonSupervisor {
  private child: ChildProcess | null = null;
  private workerPath: string;
  private respawnCount: number = 0;
  private lastHeartbeat: number | null = null;
  private isShuttingDown: boolean = false;
  private heartbeatIntervalMs: number;
  private maxMissedHeartbeats: number;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private isHungKilled: boolean = false;
  private baseBackoffMs: number = 50;
  private maxBackoffMs: number = 2000;

  constructor(
    workerPath?: string,
    heartbeatIntervalMs: number = 1000,
    maxMissedHeartbeats: number = 3
  ) {
    this.workerPath =
      workerPath || path.resolve(__dirname, "daemonWorker.ts");
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.maxMissedHeartbeats = maxMissedHeartbeats;
  }

  public start(): void {
    if (this.child && !this.child.killed) {
      return;
    }

    this.isShuttingDown = false;
    this.spawnWorker();
    this.startWatchdog();
  }

  private startWatchdog(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      if (this.isShuttingDown || !this.child) return;

      const now = Date.now();
      if (
        this.lastHeartbeat &&
        now - this.lastHeartbeat > this.heartbeatIntervalMs * this.maxMissedHeartbeats
      ) {
        // Proceso hijo colgado detectado (evento loop congelado o bloqueo de CPU)
        this.isHungKilled = true;
        this.respawnCount++;
        try {
          if (!this.child.killed) {
            this.child.kill("SIGKILL");
          }
        } catch (_err) {
          // ignore kill failure if process already died
        }
      }
    }, this.heartbeatIntervalMs);
  }

  private spawnWorker(): void {
    const ext = path.extname(this.workerPath);
    const execArgv = ext === ".ts" ? ["--import", "tsx"] : [];

    this.child = fork(this.workerPath, [], {
      execArgv,
      stdio: ["pipe", "pipe", "pipe", "ipc"],
    });

    this.lastHeartbeat = Date.now();

    this.child.on("error", (_err) => {});

    this.child.on("message", (msg: unknown) => {
      if (msg && typeof msg === "object") {
        const m = msg as Record<string, unknown>;
        if (m.type === "heartbeat") {
          this.lastHeartbeat = typeof m.timestamp === "number" ? m.timestamp : Date.now();
        }
      }
    });

    this.child.on("exit", (_code, _signal) => {
      this.child = null;
      if (!this.isShuttingDown) {
        if (!this.isHungKilled) {
          this.respawnCount++;
        }
        this.isHungKilled = false;

        // Respawn con backoff exponencial topado
        const backoff = Math.min(
          this.baseBackoffMs * Math.pow(2, Math.min(this.respawnCount, 6)),
          this.maxBackoffMs
        );
        setTimeout(() => {
          if (!this.isShuttingDown) {
            this.spawnWorker();
          }
        }, backoff);
      }
    });
  }

  public async stop(graceMs: number = 2000): Promise<void> {
    this.isShuttingDown = true;
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    if (!this.child) return;

    const child = this.child;
    return new Promise<void>((resolve) => {
      let resolved = false;

      const finish = () => {
        if (!resolved) {
          resolved = true;
          this.child = null;
          resolve();
        }
      };

      child.once("exit", finish);

      try {
        if (child.connected) {
          child.send({ type: "STOP" }, (_err) => {});
        }
      } catch (_err) {
        // ignore send error on shutdown
      }

      setTimeout(() => {
        try {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        } catch (_err) {
          // ignore kill error
        }
        finish();
      }, graceMs);
    });
  }

  public getStatus(): SupervisorStatus {
    return {
      running: Boolean(this.child && !this.child.killed),
      pid: this.child?.pid || null,
      respawnCount: this.respawnCount,
      lastHeartbeat: this.lastHeartbeat,
      workerPath: this.workerPath,
      isHungKilled: this.isHungKilled,
    };
  }

  public getChild(): ChildProcess | null {
    return this.child;
  }
}
