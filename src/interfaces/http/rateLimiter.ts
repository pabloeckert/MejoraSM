// src/interfaces/http/rateLimiter.ts
// Rate limiter de ventana deslizante en memoria (por clave, p. ej. IP). Reloj inyectable.

export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limite: number,
    private readonly ventanaMs: number,
    private readonly now: () => number = Date.now
  ) {}

  /** Registra un intento. Devuelve true si está permitido, false si excede el límite. */
  public permitir(clave: string): boolean {
    const t = this.now();
    const vigentes = (this.hits.get(clave) ?? []).filter((x) => t - x < this.ventanaMs);
    if (vigentes.length >= this.limite) {
      this.hits.set(clave, vigentes);
      return false;
    }
    vigentes.push(t);
    this.hits.set(clave, vigentes);
    // Higiene de memoria: purga cuando el mapa crece demasiado.
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) {
        if (v.every((x) => t - x >= this.ventanaMs)) this.hits.delete(k);
      }
    }
    return true;
  }
}
