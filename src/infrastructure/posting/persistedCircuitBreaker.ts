// src/infrastructure/posting/persistedCircuitBreaker.ts
// CIRCUIT BREAKER PERSISTIDO POR CANAL EN SQLITE (MejoraSM 2026)
// Criterio Zero-Trust Principal SRE:
// 1. Persistencia transaccional de estado por canal ('instagram', 'facebook' (Meta)).
// 2. Errores HTTP 4xx omitidos formalmente como fallas del sistema (son fallas de cliente/formato).
// 3. Fallas 5xx, timeouts y caídas de red incrementan fallas y conmutan a OPEN.
// 4. Fallback garantizado en < 50ms cuando el circuito está abierto.

import { DatabaseSync } from "node:sqlite";
import type { CircuitState, CircuitBreakerOptions, CircuitExecutionResult } from "./circuitBreaker";

export interface ChannelCircuitBreakerRow {
  canal: string;
  estado: CircuitState;
  conteo_fallas: number;
  ultimo_fallo_at: string | null;
  ultimo_exito_at: string | null;
  actualizado_at: string;
}

export class Http4xxError extends Error {
  public readonly status: number;
  public readonly isClientError = true;

  constructor(status: number, message: string) {
    super(`HTTP ${status}: ${message}`);
    this.name = "Http4xxError";
    this.status = status;
  }
}

export function isHttp4xx(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Http4xxError) return true;
  const anyErr = err as { status?: number; statusCode?: number; message?: string };
  const code = anyErr.status ?? anyErr.statusCode;
  if (typeof code === "number" && code >= 400 && code < 500) {
    return true;
  }
  if (typeof anyErr.message === "string") {
    return /\b(400|401|402|403|404|409|422|429)\b/.test(anyErr.message) && !/\b50[0-9]\b/.test(anyErr.message);
  }
  return false;
}

export class PersistedChannelCircuitBreaker {
  public readonly canal: string;
  private readonly db: DatabaseSync;
  private readonly failureThreshold: number;
  private readonly timeoutMs: number;
  private readonly cooldownMs: number;
  private readonly clock: () => number;

  constructor(
    db: DatabaseSync,
    canal: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.db = db;
    this.canal = canal.toLowerCase();
    this.failureThreshold = options.failureThreshold ?? 3;
    this.timeoutMs = options.timeoutMs ?? 1500;
    this.cooldownMs = options.cooldownMs ?? 5000;
    this.clock = options.now ?? Date.now;

    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    const row = this.db
      .prepare("SELECT canal FROM circuit_breaker_canales WHERE canal = ?")
      .get(this.canal);

    if (!row) {
      const nowIso = new Date(this.clock()).toISOString();
      this.db
        .prepare(
          `INSERT INTO circuit_breaker_canales (
            canal, estado, conteo_fallas, ultimo_fallo_at, ultimo_exito_at, actualizado_at
          ) VALUES (?, 'CLOSED', 0, NULL, NULL, ?)`
        )
        .run(this.canal, nowIso);
    }
  }

  public getRow(): ChannelCircuitBreakerRow {
    const row = this.db
      .prepare(
        "SELECT canal, estado, conteo_fallas, ultimo_fallo_at, ultimo_exito_at, actualizado_at FROM circuit_breaker_canales WHERE canal = ?"
      )
      .get(this.canal) as ChannelCircuitBreakerRow | undefined;

    if (!row) {
      this.ensureInitialized();
      return this.getRow();
    }
    return row;
  }

  public getState(): CircuitState {
    const row = this.getRow();
    if (row.estado === "OPEN" && row.ultimo_fallo_at) {
      const lastFail = new Date(row.ultimo_fallo_at).getTime();
      if (this.clock() - lastFail >= this.cooldownMs) {
        this.updateState("HALF_OPEN", row.conteo_fallas, row.ultimo_fallo_at, row.ultimo_exito_at);
        return "HALF_OPEN";
      }
    }
    return row.estado;
  }

  private updateState(
    estado: CircuitState,
    conteo_fallas: number,
    ultimo_fallo_at: string | null,
    ultimo_exito_at: string | null
  ): void {
    const nowIso = new Date(this.clock()).toISOString();
    this.db
      .prepare(
        `UPDATE circuit_breaker_canales 
         SET estado = ?, conteo_fallas = ?, ultimo_fallo_at = ?, ultimo_exito_at = ?, actualizado_at = ?
         WHERE canal = ?`
      )
      .run(estado, conteo_fallas, ultimo_fallo_at, ultimo_exito_at, nowIso, this.canal);
  }

  public trip(): void {
    const row = this.getRow();
    const nowIso = new Date(this.clock()).toISOString();
    this.updateState("OPEN", this.failureThreshold, nowIso, row.ultimo_exito_at);
  }

  public reset(): void {
    this.updateState("CLOSED", 0, null, null);
  }

  public async execute<T>(
    action: (signal: AbortSignal) => Promise<T>,
    fallback: (err: Error) => Promise<T> | T
  ): Promise<CircuitExecutionResult<T>> {
    const state = this.getState();

    // 1. Estado OPEN: Fallback inmediato en < 50ms
    if (state === "OPEN") {
      const t0 = performance.now();
      const circuitErr = new Error(`CircuitBreaker canal '${this.canal}' OPEN: red externa deshabilitada`);
      const result = await fallback(circuitErr);
      const fallbackDurationMs = performance.now() - t0;
      return {
        result,
        fromFallback: true,
        durationMs: fallbackDurationMs,
        fallbackDurationMs,
        error: circuitErr.message,
      };
    }

    // 2. Estado CLOSED o HALF_OPEN
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort(new Error(`Timeout de red (${this.timeoutMs}ms) excedido para canal '${this.canal}'`));
        reject(new Error(`Timeout de red (${this.timeoutMs}ms) excedido para canal '${this.canal}'`));
      }, this.timeoutMs);
    });

    const callStart = performance.now();
    try {
      const result = await Promise.race([action(controller.signal), timeoutPromise]);
      if (timer) clearTimeout(timer);

      // Éxito: cierra circuito y resetea fallas
      const row = this.getRow();
      const nowIso = new Date(this.clock()).toISOString();
      this.updateState("CLOSED", 0, row.ultimo_fallo_at, nowIso);

      return {
        result,
        fromFallback: false,
        durationMs: performance.now() - callStart,
      };
    } catch (rawError: unknown) {
      if (timer) clearTimeout(timer);
      const errorMsg = (rawError as Error)?.message || String(rawError);
      const err = new Error(errorMsg);

      // Criterio Mandatorio: ¿Es error 4xx?
      if (isHttp4xx(rawError)) {
        // Omitir errores 4xx como fallas del sistema: NO se incrementa conteo de fallas
        const t0 = performance.now();
        const result = await fallback(err);
        const fallbackDurationMs = performance.now() - t0;
        return {
          result,
          fromFallback: true,
          durationMs: performance.now() - callStart,
          fallbackDurationMs,
          error: `[4xx Client Error] ${err.message}`,
        };
      }

      // Falla de sistema real (5xx, timeout, abort, caída de socket)
      const row = this.getRow();
      const newFails = row.conteo_fallas + 1;
      const nowIso = new Date(this.clock()).toISOString();
      const nextState: CircuitState =
        state === "HALF_OPEN" || newFails >= this.failureThreshold ? "OPEN" : "CLOSED";

      this.updateState(nextState, newFails, nowIso, row.ultimo_exito_at);

      const t0 = performance.now();
      const result = await fallback(err);
      const fallbackDurationMs = performance.now() - t0;

      return {
        result,
        fromFallback: true,
        durationMs: performance.now() - callStart,
        fallbackDurationMs,
        error: err.message,
      };
    }
  }
}


export const CANALES_META = ["instagram", "facebook"] as const;
export type CanalMeta = (typeof CANALES_META)[number];

export function inicializarCircuitBreakersMeta(
  db: DatabaseSync,
  options?: CircuitBreakerOptions
): Record<CanalMeta, PersistedChannelCircuitBreaker> {
  return {
    instagram: new PersistedChannelCircuitBreaker(db, "instagram", options),
    facebook: new PersistedChannelCircuitBreaker(db, "facebook", options),
  };
}
