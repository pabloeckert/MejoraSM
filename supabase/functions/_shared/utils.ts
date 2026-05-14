// supabase/functions/_shared/utils.ts
// Utilidades compartidas entre todas las Edge Functions

const ALLOWED_ORIGINS = [
  "https://util.mejoraok.com",
  "https://mejorasm.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ProviderError extends Error {
  provider: string;
  status: number;
  constructor(provider: string, status: number, message: string) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = status;
  }
}

export function validateBody(body: Record<string, unknown>, required: string[]): void {
  const missing = required.filter(
    (k) => body[k] === undefined || body[k] === null
  );
  if (missing.length > 0) {
    throw new ValidationError(
      `Campos requeridos faltantes: ${missing.join(", ")}`
    );
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 1000,
  label = "fn"
): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      if (e instanceof ValidationError) throw e;
      if (i === maxRetries) throw e;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        `[${label}] Retry ${i + 1}/${maxRetries} after ${Math.round(delay)}ms: ${msg}`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

export function sanitizeText(text: string, maxLen = 5000): string {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, maxLen).replace(/\0/g, "");
}

export function sanitizeTopic(topic: string): string {
  const clean = sanitizeText(topic, 500);
  if (clean.length === 0)
    throw new ValidationError("El tema no puede estar vacío");
  if (clean.length < 3)
    throw new ValidationError("El tema es muy corto (mínimo 3 caracteres)");
  return clean;
}

export function validateUUID(value: string, fieldName: string): void {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(
      `${fieldName} debe ser un UUID válido, recibido: ${value}`
    );
  }
}

// Structured JSON logger compatible con Supabase edge runtime
export const logger = {
  info: (label: string, msg: string, data?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", label, msg, ...data, ts: new Date().toISOString() })),
  warn: (label: string, msg: string, data?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", label, msg, ...data, ts: new Date().toISOString() })),
  error: (label: string, msg: string, data?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "error", label, msg, ...data, ts: new Date().toISOString() })),
};

export function httpError(
  corsHeaders: Record<string, string>,
  e: unknown,
  defaultStatus = 500
): Response {
  let status = defaultStatus;
  let type = "Error";
  let message = "Error interno del servidor";

  if (e instanceof ValidationError) {
    status = 400;
    type = "ValidationError";
    message = e.message;
  } else if (e instanceof ProviderError) {
    status = e.status >= 500 ? 502 : e.status;
    type = "ProviderError";
    message = e.message;
  } else if (e instanceof Error) {
    message = e.message;
    type = e.name;
  }

  return new Response(JSON.stringify({ error: message, type }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
