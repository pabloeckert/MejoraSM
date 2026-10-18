// src/interfaces/http/crmRoutes.ts
// ENDPOINTS CRM: captura pública de leads (anti-bot + rate limit + atribución obligatoria)
// y transición de estado de prospectos (autenticada por el middleware Bearer del router).

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  SqliteProspectoRepository,
  ProspectoNoEncontradoError,
} from "../../infrastructure/sqlite/SqliteProspectoRepository";
import { SlidingWindowRateLimiter } from "./rateLimiter";
import { TransicionInvalidaError, esEstadoProspecto } from "../../domain/prospectoStateMachine";

export interface CrmServices {
  prospectoRepo: SqliteProspectoRepository;
  leadRateLimiter: SlidingWindowRateLimiter;
}

export interface HttpHelpers {
  sendJson: (res: ServerResponse, status: number, data: unknown) => void;
  parseJsonBody: <T>(req: IncomingMessage, maxBytes?: number) => Promise<T>;
}

export const LEAD_MAX_BODY_BYTES = 16 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TEL_RE = /^[+0-9()\s-]{6,25}$/;
const PIEZA_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const UTM_TOKEN_RE = /^[A-Za-z0-9_.:+ -]{1,64}$/;
const BOT_UA_RE = /bot|crawl|spider|headless|python-requests|scrapy|httpclient/i;
const MIN_FORM_FILL_MS = 1500;

interface LeadBody {
  email?: unknown;
  nombre?: unknown;
  telefono?: unknown;
  empresa?: unknown;
  utm_content?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  website?: unknown; // honeypot: los humanos no lo ven ni lo completan
  form_rendered_at?: unknown; // epoch ms de render del form (opcional)
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function utmToken(v: unknown): string | null {
  const s = str(v);
  return s && UTM_TOKEN_RE.test(s) ? s : null;
}

/** Devuelve true si la petición fue atendida por el módulo CRM. */
export function handleCrmRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  searchParams: URLSearchParams,
  crm: CrmServices,
  http: HttpHelpers,
  now: () => number = Date.now
): boolean {
  const method = req.method || "GET";

  // POST /api/crm/lead (público: sin Bearer, protegido por anti-bot + rate limit)
  if (method === "POST" && pathname === "/api/crm/lead") {
    const ip = req.socket.remoteAddress || "desconocida";
    if (!crm.leadRateLimiter.permitir(ip)) {
      res.setHeader("Retry-After", "60");
      http.sendJson(res, 429, { error: "Demasiadas solicitudes. Intentá nuevamente en un minuto." });
      return true;
    }
    const ua = String(req.headers["user-agent"] || "");
    if (!ua || BOT_UA_RE.test(ua)) {
      http.sendJson(res, 403, { error: "Solicitud rechazada (anti-bot)" });
      return true;
    }
    http
      .parseJsonBody<LeadBody>(req, LEAD_MAX_BODY_BYTES)
      .then((body) => {
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          http.sendJson(res, 400, { error: "Body JSON inválido" });
          return;
        }
        if (str(body.website) !== null) {
          http.sendJson(res, 403, { error: "Solicitud rechazada (anti-bot)" });
          return;
        }
        if (typeof body.form_rendered_at === "number" && now() - body.form_rendered_at < MIN_FORM_FILL_MS) {
          http.sendJson(res, 403, { error: "Solicitud rechazada (anti-bot)" });
          return;
        }

        const email = str(body.email);
        const nombre = str(body.nombre);
        if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
          http.sendJson(res, 400, { error: "email inválido" });
          return;
        }
        if (!nombre || nombre.length > 120) {
          http.sendJson(res, 400, { error: "nombre obligatorio (máx. 120 caracteres)" });
          return;
        }
        const telefono = str(body.telefono);
        if (telefono && !TEL_RE.test(telefono)) {
          http.sendJson(res, 400, { error: "telefono inválido" });
          return;
        }
        const empresa = str(body.empresa);
        if (empresa && empresa.length > 120) {
          http.sendJson(res, 400, { error: "empresa excede 120 caracteres" });
          return;
        }

        // Atribución obligatoria: pieza_id_atribucion ← utm_content (body o querystring)
        const piezaId = str(body.utm_content) ?? str(searchParams.get("utm_content"));
        if (!piezaId || !PIEZA_RE.test(piezaId)) {
          http.sendJson(res, 400, { error: "utm_content obligatorio y válido (identifica la pieza de atribución)" });
          return;
        }
        const source = utmToken(body.utm_source) ?? utmToken(searchParams.get("utm_source"));
        const medium = utmToken(body.utm_medium) ?? utmToken(searchParams.get("utm_medium"));
        const campaign = utmToken(body.utm_campaign) ?? utmToken(searchParams.get("utm_campaign"));
        const origenUtm = source || medium || campaign ? `${source ?? "-"}/${medium ?? "-"}/${campaign ?? "-"}` : null;

        const { prospecto, creado } = crm.prospectoRepo.capturarLead({
          email,
          nombre,
          telefono,
          empresa,
          origen_utm: origenUtm,
          pieza_id_atribucion: piezaId,
        });
        http.sendJson(res, creado ? 201 : 200, {
          success: true,
          duplicado: !creado,
          prospecto_id: prospecto.prospecto_id,
          estado: prospecto.estado,
          sla_limite_calificacion: prospecto.sla_limite_calificacion,
        });
      })
      .catch((err: Error) => {
        const tooLarge = /too large/i.test(err.message);
        http.sendJson(res, tooLarge ? 413 : 400, { error: err.message });
      });
    return true;
  }

  // PATCH /api/crm/prospectos/:id/estado (Bearer exigido por el router)
  const matchEstado = pathname.match(/^\/api\/crm\/prospectos\/([^/]+)\/estado$/);
  if (method === "PATCH" && matchEstado) {
    const id = decodeURIComponent(matchEstado[1]);
    http
      .parseJsonBody<{
        estado?: unknown;
        motivo_catalogo?: unknown;
        metadata?: unknown;
        perfil_detectado_id?: unknown;
      }>(req, LEAD_MAX_BODY_BYTES)
      .then((body) => {
        if (!esEstadoProspecto(body.estado)) {
          http.sendJson(res, 400, { error: "estado inválido: debe ser uno de los 8 estados canónicos" });
          return;
        }
        const metadata =
          typeof body.metadata === "object" && body.metadata !== null && !Array.isArray(body.metadata)
            ? (body.metadata as Record<string, unknown>)
            : undefined;
        try {
          const actualizado = crm.prospectoRepo.transicionar(id, body.estado, {
            motivo_catalogo: str(body.motivo_catalogo),
            perfil_detectado_id: str(body.perfil_detectado_id),
            metadata,
          });
          http.sendJson(res, 200, { success: true, prospecto_id: id, estado: actualizado.estado });
        } catch (err) {
          if (err instanceof ProspectoNoEncontradoError) {
            http.sendJson(res, 404, { error: err.message });
          } else if (err instanceof TransicionInvalidaError) {
            http.sendJson(res, 409, { error: err.message });
          } else {
            console.error("[crm] error inesperado en transición:", (err as Error).message);
            http.sendJson(res, 500, { error: "Error interno al transicionar el prospecto" });
          }
        }
      })
      .catch((err: Error) => http.sendJson(res, 400, { error: err.message }));
    return true;
  }

  return false;
}
