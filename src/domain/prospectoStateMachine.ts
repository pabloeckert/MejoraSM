// src/domain/prospectoStateMachine.ts
// MÁQUINA DE ESTADOS DECLARATIVA DEL PROSPECTO (8 estados). Dominio puro, sin I/O.

export const ESTADOS_PROSPECTO = [
  "CAPTURADO",
  "CALIFICADO",
  "DESCARTADO",
  "EN_SEGUIMIENTO",
  "PROPUESTA_ENVIADA",
  "CERRADO_GANADO",
  "CERRADO_PERDIDO",
  "REACTIVADO",
] as const;

export type EstadoProspectoV2 = (typeof ESTADOS_PROSPECTO)[number];

export const TRANSICIONES_PERMITIDAS: Readonly<Record<EstadoProspectoV2, readonly EstadoProspectoV2[]>> = {
  CAPTURADO: ["CALIFICADO", "DESCARTADO"],
  CALIFICADO: ["EN_SEGUIMIENTO", "DESCARTADO"],
  DESCARTADO: ["REACTIVADO"],
  EN_SEGUIMIENTO: ["PROPUESTA_ENVIADA", "CERRADO_PERDIDO", "DESCARTADO"],
  PROPUESTA_ENVIADA: ["EN_SEGUIMIENTO", "CERRADO_GANADO", "CERRADO_PERDIDO"],
  CERRADO_GANADO: [],
  CERRADO_PERDIDO: ["REACTIVADO"],
  REACTIVADO: ["CALIFICADO", "EN_SEGUIMIENTO", "DESCARTADO"],
};

/** Transiciones que exigen un motivo de catálogo para auditoría. */
export const ESTADOS_QUE_EXIGEN_MOTIVO: readonly EstadoProspectoV2[] = ["DESCARTADO", "CERRADO_PERDIDO"];

export const SLA_CALIFICACION_HORAS = 48;

export class TransicionInvalidaError extends Error {
  constructor(
    public readonly desde: EstadoProspectoV2,
    public readonly hacia: EstadoProspectoV2,
    detalle?: string
  ) {
    super(detalle ?? `Transición inválida de prospecto: ${desde} -> ${hacia}`);
    this.name = "TransicionInvalidaError";
  }
}

export function esEstadoProspecto(valor: unknown): valor is EstadoProspectoV2 {
  return typeof valor === "string" && (ESTADOS_PROSPECTO as readonly string[]).includes(valor);
}

export function puedeTransicionar(desde: EstadoProspectoV2, hacia: EstadoProspectoV2): boolean {
  return TRANSICIONES_PERMITIDAS[desde].includes(hacia);
}

/** Lanza TransicionInvalidaError si la transición no está declarada o falta el motivo exigido. */
export function validarTransicion(
  desde: EstadoProspectoV2,
  hacia: EstadoProspectoV2,
  motivoCatalogo?: string | null
): void {
  if (!puedeTransicionar(desde, hacia)) {
    throw new TransicionInvalidaError(desde, hacia);
  }
  if (ESTADOS_QUE_EXIGEN_MOTIVO.includes(hacia) && !motivoCatalogo) {
    throw new TransicionInvalidaError(desde, hacia, `La transición ${desde} -> ${hacia} exige motivo_catalogo`);
  }
}

export function calcularSlaCalificacion(fechaCaptura: Date): string {
  return new Date(fechaCaptura.getTime() + SLA_CALIFICACION_HORAS * 3_600_000).toISOString();
}
