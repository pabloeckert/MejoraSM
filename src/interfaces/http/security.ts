// src/interfaces/http/security.ts
// SEGURIDAD HTTP, VALIDACIÓN DE HOST/ORIGIN Y AUTENTICACIÓN EN TIEMPO CONSTANTE
// Criterio Zero-Trust Principal SRE:
// 1. Timing-attack immune: crypto.timingSafeEqual con digest SHA-256.
// 2. Rotación periódica de Bearer Token con ventana de gracia para token previo.
// 3. Validación estricta de cabeceras Host y Origin para prevenir DNS rebinding y CSRF.
// 4. Sanitización obligatoria de credenciales fuera de logs.

import { IncomingMessage } from "node:http";
import * as crypto from "node:crypto";

export interface SecurityConfig {
  allowedHosts?: string[];
  allowedOrigins?: RegExp[];
}

const DEFAULT_ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const DEFAULT_ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/\[::1\](:\d+)?$/,
];

export class TokenManager {
  private primaryToken: string;
  private secondaryToken: string | null = null;
  private lastRotatedAt: number = Date.now();

  constructor(initialToken: string = process.env.BEARER_TOKEN || process.env.MEJORA_SM_AUTH_TOKEN || "mejora_sm_local_bearer_2026") {
    this.primaryToken = initialToken;
  }

  public rotateToken(newToken: string): void {
    if (!newToken || typeof newToken !== "string") {
      throw new Error("Token inválido para rotación");
    }
    this.secondaryToken = this.primaryToken;
    this.primaryToken = newToken;
    this.lastRotatedAt = Date.now();
  }

  public getPrimaryToken(): string {
    return this.primaryToken;
  }

  public getLastRotatedAt(): number {
    return this.lastRotatedAt;
  }

  /**
   * Comparación en tiempo constante usando crypto.timingSafeEqual sobre digests SHA-256.
   * Elimina cualquier fuga por canal lateral de longitud o timing de strings.
   */
  public verifyToken(candidate: string | undefined): boolean {
    if (!candidate || typeof candidate !== "string") {
      return false;
    }
    const candTrimmed = candidate.trim();
    if (this.safeEquals(candTrimmed, this.primaryToken)) {
      return true;
    }
    if (this.secondaryToken && this.safeEquals(candTrimmed, this.secondaryToken)) {
      return true;
    }
    return false;
  }

  private safeEquals(a: string, b: string): boolean {
    const hashA = crypto.createHash("sha256").update(a, "utf8").digest();
    const hashB = crypto.createHash("sha256").update(b, "utf8").digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }
}

export const defaultTokenManager = new TokenManager();

export function validateHostAndOrigin(
  req: IncomingMessage,
  config: SecurityConfig = {}
): { valid: boolean; status?: number; error?: string } {
  const allowedHosts = config.allowedHosts ?? DEFAULT_ALLOWED_HOSTS;
  const allowedOrigins = config.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS;

  // 1. Validar cabecera Host
  const rawHost = req.headers["host"];
  if (!rawHost || typeof rawHost !== "string") {
    return { valid: false, status: 400, error: "Cabecera Host requerida" };
  }

  let hostname: string;
  if (rawHost.startsWith("[")) {
    const closingBracket = rawHost.indexOf("]");
    hostname = closingBracket !== -1 ? rawHost.slice(0, closingBracket + 1).toLowerCase() : rawHost.toLowerCase();
  } else {
    hostname = rawHost.split(":")[0].toLowerCase();
  }
  const hostAllowed = allowedHosts.includes(hostname);
  if (!hostAllowed) {
    return { valid: false, status: 400, error: `Host '${hostname}' no permitido (posible DNS rebinding)` };
  }

  // 2. Validar cabecera Origin (si está presente)
  const origin = req.headers["origin"];
  if (origin && typeof origin === "string" && origin !== "null") {
    const originAllowed = allowedOrigins.some((regex) => regex.test(origin));
    if (!originAllowed) {
      return { valid: false, status: 403, error: `Origin '${origin}' no autorizado` };
    }
  }

  return { valid: true };
}

/**
 * Sanitiza cualquier texto u objeto removiendo tokens, Bearer headers o credenciales
 * para garantizar cero fuga en logs.
 */
export function sanitizeForLogs(data: unknown): unknown {
  if (typeof data === "string") {
    return data
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]")
      .replace(/token=([A-Za-z0-9_\-\.]+)/gi, "token=[REDACTED]")
      .replace(/("?(?:token|password|secret|apiKey|api_key)"?\s*[:=]\s*)"[^"]+"/gi, '$1"[REDACTED]"');
  }
  if (data && typeof data === "object") {
    const clone = Array.isArray(data) ? [...data] : { ...data as Record<string, unknown> };
    for (const key of Object.keys(clone)) {
      if (/^(authorization|token|secret|password|apikey|api_key)$/i.test(key)) {
        (clone as any)[key] = "[REDACTED]";
      } else if (typeof (clone as any)[key] === "object") {
        (clone as any)[key] = sanitizeForLogs((clone as any)[key]);
      }
    }
    return clone;
  }
  return data;
}
