// src/domain/outbox.ts
// Dominio puro del Outbox transaccional: clave de idempotencia determinista.
// Normalización estricta: NFC, canal en minúsculas, escape de '|', zona horaria ART.

import { createHash } from "node:crypto";

export const MAX_REINTENTOS_OUTBOX = 5;

/**
 * Calcula la fecha programada en formato YYYY-MM-DD en la zona horaria de Buenos Aires (ART, UTC-3).
 */
export function getFechaProgramadaART(isoDateOrDate: string | Date): string {
  const d = typeof isoDateOrDate === "string" ? new Date(isoDateOrDate) : isoDateOrDate;
  if (isNaN(d.getTime())) {
    throw new Error(`Fecha inválida: ${isoDateOrDate}`);
  }
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d); // YYYY-MM-DD
}

/** Escapa backslashes y el delimitador '|' para prevenir colisiones determinísticas */
export function escapeDelimiter(val: string): string {
  return String(val || "")
    .normalize("NFC")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|");
}

/**
 * Clave única e inmutable por post:
 * sha256(normNFC(propuesta_id)|normNFC(canal_lower)|normNFC(opcion)|fecha_ART).
 * Reaprobar la misma pieza el mismo día jamás genera un segundo post.
 */
export function generarClaveIdempotencia(
  propuestaId: string,
  canal: string,
  borradorOpcion: string,
  fecha: string | Date
): string {
  const normPropuesta = escapeDelimiter(propuestaId);
  const normCanal = escapeDelimiter(canal).toLowerCase();
  const normOpcion = escapeDelimiter(borradorOpcion || "A");
  const fechaART = getFechaProgramadaART(fecha);
  const payload = `${normPropuesta}|${normCanal}|${normOpcion}|${fechaART}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
