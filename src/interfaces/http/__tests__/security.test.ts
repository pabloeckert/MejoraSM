// src/interfaces/http/__tests__/security.test.ts
import { describe, it, expect } from "vitest";
import { IncomingMessage } from "node:http";
import {
  TokenManager,
  validateHostAndOrigin,
  sanitizeForLogs,
} from "../security";

describe("Fase 3: Seguridad HTTP, Host/Origin y Token en Tiempo Constante", () => {
  describe("TokenManager (tiempo constante y rotación periódica)", () => {
    it("valida tokens correctos y rechaza incorrectos", () => {
      const tm = new TokenManager("token_secreto_2026");
      expect(tm.verifyToken("token_secreto_2026")).toBe(true);
      expect(tm.verifyToken(" token_secreto_2026 ")).toBe(true);
      expect(tm.verifyToken("token_falso")).toBe(false);
      expect(tm.verifyToken("")).toBe(false);
      expect(tm.verifyToken(undefined as unknown as string)).toBe(false);
    });

    it("rotación de token: permite token nuevo y mantiene ventana para token previo", () => {
      const tm = new TokenManager("token_v1");
      expect(tm.verifyToken("token_v1")).toBe(true);

      // Rotación periódica a token_v2
      tm.rotateToken("token_v2");

      // Ambos son válidos durante la ventana de gracia
      expect(tm.verifyToken("token_v2")).toBe(true);
      expect(tm.verifyToken("token_v1")).toBe(true);

      // Rotación siguiente a token_v3: token_v1 queda revocado
      tm.rotateToken("token_v3");
      expect(tm.verifyToken("token_v3")).toBe(true);
      expect(tm.verifyToken("token_v2")).toBe(true);
      expect(tm.verifyToken("token_v1")).toBe(false);
    });
  });

  describe("validateHostAndOrigin", () => {
    function mockReq(headers: Record<string, string>): IncomingMessage {
      return { headers } as unknown as IncomingMessage;
    }

    it("permite hosts locales legítimos (localhost, 127.0.0.1, [::1]) con o sin puerto", () => {
      expect(validateHostAndOrigin(mockReq({ host: "localhost:4015" })).valid).toBe(true);
      expect(validateHostAndOrigin(mockReq({ host: "127.0.0.1:4002" })).valid).toBe(true);
      expect(validateHostAndOrigin(mockReq({ host: "127.0.0.1" })).valid).toBe(true);
      expect(validateHostAndOrigin(mockReq({ host: "[::1]:4015" })).valid).toBe(true);
    });

    it("rechaza cabecera Host maliciosa con 400 Bad Request", () => {
      const res = validateHostAndOrigin(mockReq({ host: "attacker.com" }));
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain("no permitido");
    });

    it("rechaza falta de cabecera Host con 400 Bad Request", () => {
      const res = validateHostAndOrigin(mockReq({}));
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
    });

    it("permite Origin local legítimo y rechaza Origin externo con 403 Forbidden", () => {
      expect(
        validateHostAndOrigin(mockReq({ host: "localhost:4015", origin: "http://localhost:5173" })).valid
      ).toBe(true);
      expect(
        validateHostAndOrigin(mockReq({ host: "127.0.0.1:4002", origin: "http://127.0.0.1:4002" })).valid
      ).toBe(true);

      const rej = validateHostAndOrigin(
        mockReq({ host: "localhost:4015", origin: "http://malicious-site.com" })
      );
      expect(rej.valid).toBe(false);
      expect(rej.status).toBe(403);
      expect(rej.error).toContain("Origin");
    });
  });

  describe("sanitizeForLogs (credenciales fuera de logs)", () => {
    it("remueve tokens Bearer de strings", () => {
      const log = "Petición HTTP con Authorization: Bearer super_secret_token_123 procesada";
      const sanitized = sanitizeForLogs(log) as string;
      expect(sanitized).not.toContain("super_secret_token_123");
      expect(sanitized).toContain("Bearer [REDACTED]");
    });

    it("enmascara campos sensibles en objetos", () => {
      const payload = {
        user: "pablo",
        authorization: "Bearer secret",
        apiKey: "api_9999",
        data: { token: "tok_abc" },
      };
      const sanitized = sanitizeForLogs(payload) as Record<string, unknown> & { data: Record<string, unknown> };
      expect(sanitized.authorization).toBe("[REDACTED]");
      expect(sanitized.apiKey).toBe("[REDACTED]");
      expect(sanitized.data.token).toBe("[REDACTED]");
      expect(sanitized.user).toBe("pablo");
    });
  });
});
