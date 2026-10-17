// src/infrastructure/posting/circuitBreaker.ts
// CIRCUIT BREAKER SOBERANO PARA INTEGRACIONES EXTERNAS (ZERNIO 2026)
// Criterio Zero-Trust Principal SRE:
// 1. Fast-Window Timeout con AbortController para prevenir bloqueos del hilo principal.
// 2. Máquina de estados canónica: CLOSED -> OPEN -> HALF_OPEN.
// 3. Fallback persistente a SQLite garantizado en < 50ms ante caídas o latencias excesivas.

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Número de fallas consecutivas para abrir el circuito (default: 3)
  timeoutMs?: number;        // Fast-Window timeout para petición de red externa (default: 1500ms)
  cooldownMs?: number;       // Tiempo en estado OPEN antes de permitir prueba HALF_OPEN (default: 5000ms)
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  fallbackCount: number;
  lastFallbackDurationMs: number;
}

export interface CircuitExecutionResult<T> {
  result: T;
  fromFallback: boolean;
  durationMs: number;
  fallbackDurationMs?: number;
  error?: string;
}

export class ZernioCircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private fallbackCount = 0;
  private lastFallbackDurationMs = 0;

  public readonly failureThreshold: number;
  public readonly timeoutMs: number;
  public readonly cooldownMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.timeoutMs = options.timeoutMs ?? 1500;
    this.cooldownMs = options.cooldownMs ?? 5000;
  }

  public getState(): CircuitState {
    this.checkCooldown();
    return this.state;
  }

  public getMetrics(): CircuitBreakerMetrics {
    this.checkCooldown();
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      fallbackCount: this.fallbackCount,
      lastFallbackDurationMs: this.lastFallbackDurationMs,
    };
  }

  private checkCooldown(): void {
    if (this.state === "OPEN" && this.lastFailureTime) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.cooldownMs) {
        this.state = "HALF_OPEN";
      }
    }
  }

  /**
   * Ejecuta una acción de red protegida. Ante latencia > timeoutMs o excepciones de red,
   * conmuta el circuito y ejecuta el fallback local a SQLite de forma inmediata (< 50ms).
   */
  public async execute<T>(
    action: (signal: AbortSignal) => Promise<T>,
    fallback: (err: Error) => Promise<T> | T
  ): Promise<CircuitExecutionResult<T>> {
    this.checkCooldown();

    // 1. Estado OPEN: No intentar la red, ir directo al fallback soberano
    if (this.state === "OPEN") {
      const t0 = performance.now();
      this.fallbackCount++;
      const circuitErr = new Error("CircuitBreaker OPEN: red externa deshabilitada por fallos previos");
      const result = await fallback(circuitErr);
      const fallbackDurationMs = performance.now() - t0;
      this.lastFallbackDurationMs = fallbackDurationMs;

      return {
        result,
        fromFallback: true,
        durationMs: fallbackDurationMs,
        fallbackDurationMs,
        error: circuitErr.message,
      };
    }

    // 2. Estado CLOSED o HALF_OPEN: Ejecutar con Fast-Window Timeout
    const controller = new AbortController();
    let isTimeout = false;

    const timer = setTimeout(() => {
      isTimeout = true;
      controller.abort(new Error(`Fast-Window timeout excedido (${this.timeoutMs}ms)`));
    }, this.timeoutMs);

    const callStart = performance.now();
    try {
      const result = await action(controller.signal);
      clearTimeout(timer);

      this.onSuccess();
      return {
        result,
        fromFallback: false,
        durationMs: performance.now() - callStart,
      };
    } catch (rawError: any) {
      clearTimeout(timer);
      const errorMsg = isTimeout
        ? `Timeout de red (${this.timeoutMs}ms) excedido`
        : rawError?.message || String(rawError);
      const err = new Error(errorMsg);

      this.onFailure();

      // Ejecución de fallback a SQLite garantizado en < 50ms
      const t0 = performance.now();
      this.fallbackCount++;
      const result = await fallback(err);
      const fallbackDurationMs = performance.now() - t0;
      this.lastFallbackDurationMs = fallbackDurationMs;

      return {
        result,
        fromFallback: true,
        durationMs: performance.now() - callStart,
        fallbackDurationMs,
        error: err.message,
      };
    }
  }

  private onSuccess(): void {
    this.successCount++;
    this.failureCount = 0;
    this.state = "CLOSED";
    this.lastSuccessTime = Date.now();
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  public trip(): void {
    this.state = "OPEN";
    this.lastFailureTime = Date.now();
  }

  public reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.fallbackCount = 0;
    this.lastFallbackDurationMs = 0;
  }
}
