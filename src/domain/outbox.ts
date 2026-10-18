// src/domain/outbox.ts
// Dominio puro del Outbox transaccional: clave de idempotencia determinista.

import { createHash } from "node:crypto";

export const MAX_REINTENTOS_OUTBOX = 5;

/** Día UTC (YYYY-MM-DD) usado como componente temporal de la clave. */
export function timestampDia(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/**
 * Clave única por post: sha256(propuesta_id | canal | borrador | día UTC).
 * Reaprobar la misma pieza el mismo día jamás genera un segundo post.
 */
export function generarClaveIdempotencia(
  propuestaId: string,
  canal: string,
  borrador: string,
  fecha: Date
): string {
  return createHash("sha256")
    .update(`${propuestaId}|${canal}|${borrador}|${timestampDia(fecha)}`)
    .digest("hex");
}
