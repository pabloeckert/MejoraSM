// src/interfaces/http/router.ts
// ROUTER HTTP LOCAL SOBERANO PARA MejoraSM
// Conexión directa a SqliteBovedaRepository, SqlitePropuestaRepository y optimizador.
// 100% nativo sobre node:http sin dependencias de Express o Fastify.

import type { DatabaseSync } from "node:sqlite";
import { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as zlib from "node:zlib";
import { SqliteBovedaRepository } from "../../infrastructure/sqlite/SqliteBovedaRepository";
import { SqlitePropuestaRepository } from "../../infrastructure/sqlite/SqlitePropuestaRepository";
import { SqliteSMRepository } from "../../infrastructure/sqlite/SqliteSMRepository";
import { SqliteOutboxRepository } from "../../infrastructure/sqlite/SqliteOutboxRepository";
import { generarGrillaEvergreen26Semanas } from "../../domain/gridGenerator";
import {
  type DimensionMC,
  type EstadoPropuesta,
  type CanalDestino,
  type FichaBovedaDTO,
  type PropuestaMejoraSMDTO,
} from "../../domain/types";
import { type CamposEdicionPropuesta } from "../../infrastructure/sqlite/SqlitePropuestaRepository";
import { handleCrmRequest, type CrmServices } from "./crmRoutes";

export const CORS_WHITELIST = [
  "http://localhost:4002",
  "http://localhost:4015",
  "http://127.0.0.1:4002",
  "http://127.0.0.1:4015",
];

export function getCorsOrigin(req?: IncomingMessage): string {
  const origin = req?.headers["origin"];
  if (typeof origin === "string" && CORS_WHITELIST.includes(origin)) {
    return origin;
  }
  return CORS_WHITELIST[0];
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

export function serveStaticDistFile(
  res: ServerResponse,
  pathname: string,
  distDir: string = path.resolve(process.cwd(), "dist"),
  req?: IncomingMessage
): boolean {
  if (!fs.existsSync(distDir)) {
    return false;
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(distDir, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    const indexPath = path.join(distDir, "index.html");
    if (fs.existsSync(indexPath) && !pathname.includes(".")) {
      filePath = indexPath;
    } else {
      return false;
    }
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = fs.readFileSync(filePath);

    const corsOrigin = getCorsOrigin(req);
    const acceptEncoding = (req?.headers["accept-encoding"] || "") as string;
    const baseHeaders: Record<string, string | number> = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": corsOrigin,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    };

    if (ext !== ".html" && content.length > 1024) {
      if (acceptEncoding.includes("br")) {
        const compressed = zlib.brotliCompressSync(content);
        res.writeHead(200, {
          ...baseHeaders,
          "Content-Encoding": "br",
          "Content-Length": compressed.length,
        });
        res.end(compressed);
        return true;
      } else if (acceptEncoding.includes("gzip")) {
        const compressed = zlib.gzipSync(content);
        res.writeHead(200, {
          ...baseHeaders,
          "Content-Encoding": "gzip",
          "Content-Length": compressed.length,
        });
        res.end(compressed);
        return true;
      } else if (acceptEncoding.includes("deflate")) {
        const compressed = zlib.deflateSync(content);
        res.writeHead(200, {
          ...baseHeaders,
          "Content-Encoding": "deflate",
          "Content-Length": compressed.length,
        });
        res.end(compressed);
        return true;
      }
    }

    res.writeHead(200, {
      ...baseHeaders,
      "Content-Length": content.length,
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

export interface SMAppServices extends Partial<CrmServices> {
  bovedaRepo: SqliteBovedaRepository;
  propuestaRepo: SqlitePropuestaRepository;
  smRepo: SqliteSMRepository;
  outboxRepo?: SqliteOutboxRepository;
}

import {
  validateHostAndOrigin,
  defaultTokenManager,
  TokenManager,
} from "./security";

export { defaultTokenManager, TokenManager };

function sendJson(res: ServerResponse, statusCode: number, data: unknown, maybeReq?: IncomingMessage): void {
  const req = maybeReq || (res as unknown as { req?: IncomingMessage }).req;
  const json = JSON.stringify(data);
  const corsOrigin = getCorsOrigin(req);
  const etag = `"${crypto.createHash("sha256").update(json).digest("hex").slice(0, 32)}"`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "ETag": etag,
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, If-None-Match",
  };

  if (req && req.method === "GET") {
    const clientEtag = req.headers["if-none-match"];
    if (clientEtag && (clientEtag === etag || clientEtag === `W/${etag}`)) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
  }

  res.writeHead(statusCode, headers);
  res.end(json);
}

function parseJsonBody<T>(req: IncomingMessage, maxBytes: number = 5 * 1024 * 1024): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(new Error(`Payload too large (> ${maxBytes} bytes)`));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : ({} as T));
      } catch (err) {
        reject(new Error(`JSON inválido: ${(err as Error).message}`));
      }
    });
    req.on("error", (err) => reject(err));
  });
}

export const LOCAL_AUTH_TOKEN =
  process.env.BEARER_TOKEN || process.env.MEJORA_SM_AUTH_TOKEN || defaultTokenManager.getPrimaryToken();

function isAuthorized(req: IncomingMessage): boolean {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader || typeof authHeader !== "string") {
    return false;
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return false;
  }
  const token = match[1].trim();
  return defaultTokenManager.verifyToken(token);
}

export function handleSMHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  services: SMAppServices
): void {
  const method = req.method || "GET";
  const rawUrl = req.url || "/";

  // Validación de seguridad de cabeceras Host y Origin
  const sec = validateHostAndOrigin(req);
  if (!sec.valid) {
    sendJson(res, sec.status ?? 400, { error: sec.error });
    return;
  }

  const parsedUrl = new URL(rawUrl, "http://localhost");
  const pathname = parsedUrl.pathname;

  // Manejo de preflight CORS
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": getCorsOrigin(req),
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, If-None-Match",
    });
    res.end();
    return;
  }

  // Healthcheck local (público para monitores de salud y liveness)
  if (method === "GET" && pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      module: "MejoraSM",
      mode: "local_soberano",
      engine: "node:sqlite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Control de acceso Zero-Trust: exigir Authorization Bearer para toda mutación en /api/*
  // Única excepción: POST /api/crm/lead (formulario público; protegido por anti-bot + rate limit).
  const esLeadPublico = method === "POST" && pathname === "/api/crm/lead";
  if (pathname.startsWith("/api") && !esLeadPublico && ["POST", "PATCH", "DELETE", "PUT"].includes(method)) {
    if (!isAuthorized(req)) {
      sendJson(res, 401, {
        error: "No autorizado: se requiere header Authorization: Bearer <token>",
      });
      return;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CRM: captura de leads y máquina de estados de prospectos
  // ──────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/crm/")) {
    if (!services.prospectoRepo || !services.leadRateLimiter) {
      sendJson(res, 503, { error: "Módulo CRM no configurado en este servidor" });
      return;
    }
    const atendido = handleCrmRequest(
      req,
      res,
      pathname,
      parsedUrl.searchParams,
      { prospectoRepo: services.prospectoRepo, leadRateLimiter: services.leadRateLimiter },
      { sendJson, parseJsonBody }
    );
    if (atendido) return;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BÓVEDA DE CONOCIMIENTO (4 Capas Canónicas)
  // ──────────────────────────────────────────────────────────────────────────

  // GET /api/boveda/fichas o /api/boveda
  if (method === "GET" && (pathname === "/api/boveda/fichas" || pathname === "/api/boveda")) {
    const dimension = (parsedUrl.searchParams.get("dimension") || undefined) as DimensionMC | undefined;
    const origen_carpeta = parsedUrl.searchParams.get("capa") || undefined;
    const fichas = services.bovedaRepo.listar({ dimension, origen_carpeta });
    sendJson(res, 200, fichas);
    return;
  }

  // POST /api/boveda/fichas
  if (method === "POST" && pathname === "/api/boveda/fichas") {
    parseJsonBody<FichaBovedaDTO>(req)
      .then((ficha) => {
        if (!ficha.id || !ficha.titulo || !ficha.contenido_raw) {
          sendJson(res, 400, { error: "Faltan campos obligatorios en FichaBovedaDTO (id, titulo, contenido_raw)" });
          return;
        }
        services.bovedaRepo.guardar(ficha);
        sendJson(res, 201, { success: true, id: ficha.id });
      })
      .catch((err: Error) => sendJson(res, 400, { error: err.message }));
    return;
  }

  // GET /api/boveda/fichas/:id
  const matchBovedaId = pathname.match(/^\/api\/boveda\/fichas\/([^/]+)$/);
  if (method === "GET" && matchBovedaId) {
    const id = decodeURIComponent(matchBovedaId[1]);
    const ficha = services.bovedaRepo.obtenerPorId(id);
    if (!ficha) {
      sendJson(res, 404, { error: "Ficha no encontrada en la Bóveda" });
      return;
    }
    sendJson(res, 200, ficha);
    return;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROPUESTAS MejoraSM (3 Borradores y Lotes)
  // ──────────────────────────────────────────────────────────────────────────

  // GET /api/propuestas o /api/proposals o /api/posts
  if (method === "GET" && (pathname === "/api/propuestas" || pathname === "/api/proposals" || pathname === "/api/posts")) {
    const estado = (parsedUrl.searchParams.get("estado") || undefined) as EstadoPropuesta | undefined;
    const canal = (parsedUrl.searchParams.get("canal") || undefined) as CanalDestino | undefined;
    const limitParam = parsedUrl.searchParams.get("limit");
    const offsetParam = parsedUrl.searchParams.get("offset");
    const limit = limitParam !== null ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam !== null ? parseInt(offsetParam, 10) : undefined;

    const propuestas = services.propuestaRepo.listar({ estado, canal, limit, offset });
    sendJson(res, 200, propuestas, req);
    return;
  }

  // POST /api/propuestas o /api/proposals
  if (method === "POST" && (pathname === "/api/propuestas" || pathname === "/api/proposals")) {
    parseJsonBody<PropuestaMejoraSMDTO>(req)
      .then((propuesta) => {
        if (!propuesta.propuesta_id || !propuesta.borradores) {
          sendJson(res, 400, { error: "Faltan campos obligatorios en PropuestaMejoraSMDTO" });
          return;
        }
        services.propuestaRepo.guardar(propuesta);
        sendJson(res, 201, { success: true, id: propuesta.propuesta_id });
      })
      .catch((err: Error) => sendJson(res, 400, { error: err.message }));
    return;
  }

  // POST /api/propuestas/aprobar-lote o POST /api/approve
  if (method === "POST" && (pathname === "/api/propuestas/aprobar-lote" || pathname === "/api/approve")) {
    parseJsonBody<{ ids?: string[]; id?: string }>(req)
      .then((body) => {
        const ids = body.ids ? body.ids : body.id ? [body.id] : null;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          sendJson(res, 400, { error: "Formato inválido: se espera { ids: string[] } o { id: string }" });
          return;
        }
        const modificadas = services.propuestaRepo.aprobarLote(ids);
        sendJson(res, 200, { success: true, modificadas, ids });
      })
      .catch((err: Error) => sendJson(res, 400, { error: err.message }));
    return;
  }

  // POST /api/publish o POST /api/propuestas/:id/publicar (Encolado asíncrono Outbox)
  if (method === "POST" && (pathname === "/api/publish" || pathname.startsWith("/api/publish/"))) {
    const idFromPath = pathname.replace(/^\/api\/publish\/?/, "");
    parseJsonBody<{ id?: string }>(req)
      .then((body) => {
        const id = idFromPath || body.id;
        if (!id) {
          sendJson(res, 400, { error: "Falta id de propuesta para publicar (se espera { id: string })" });
          return;
        }
        const propuestaExistente = services.propuestaRepo.obtenerPorId(id);
        if (!propuestaExistente) {
          sendJson(res, 404, { error: `Propuesta ${id} no encontrada para publicar` });
          return;
        }
        if (propuestaExistente.estado !== "aprobado") {
          sendJson(res, 409, {
            error: `Transición inválida: la propuesta ${id} debe estar en estado 'aprobado' para ser publicada (estado actual: '${propuestaExistente.estado}')`,
          });
          return;
        }

        const outbox =
          services.outboxRepo ||
          services.propuestaRepo.getOutboxRepo?.() ||
          new SqliteOutboxRepository((services.propuestaRepo as unknown as { db?: DatabaseSync })?.db || "data/mejora_sm.db");
        const encolado = outbox.encolarPost({
          propuesta_id: id,
          canal: propuestaExistente.canal_destino,
          borrador_opcion: propuestaExistente.borrador_seleccionado,
        });

        sendJson(res, 202, {
          success: true,
          id,
          estado: "EN_COLA",
          postId: encolado.postId,
          clave_idempotencia: encolado.claveIdempotencia,
          mensaje: "Post encolado en outbox con estado EN_COLA para despacho asíncrono por el worker",
        });
      })
      .catch((err: Error) => sendJson(res, 400, { error: err.message }));
    return;
  }

  // POST /api/propuestas/generar-grilla
  if (method === "POST" && pathname === "/api/propuestas/generar-grilla") {
    parseJsonBody<{ fechaInicio?: string; guardarEnDb?: boolean }>(req)
      .then((body) => {
        const fecha = body.fechaInicio ? new Date(body.fechaInicio) : new Date();
        const grilla = generarGrillaEvergreen26Semanas(fecha);

        if (body.guardarEnDb !== false) {
          const todas = grilla.semanas.flatMap((s) => s.propuestas);
          services.propuestaRepo.guardarLote(todas);
        }

        sendJson(res, 200, grilla);
      })
      .catch((err: Error) => sendJson(res, 400, { error: err.message }));
    return;
  }

  // PATCH /api/proposals/:id/edit o PATCH /api/propuestas/:id/edit
  const matchEditar = pathname.match(/^\/api\/(?:propuestas|proposals)\/([^/]+)\/edit$/);
  if (method === "PATCH" && matchEditar) {
    const id = decodeURIComponent(matchEditar[1]);
    parseJsonBody<CamposEdicionPropuesta>(req)
      .then((fields) => {
        const actualizada = services.propuestaRepo.editar(id, fields);
        if (!actualizada) {
          sendJson(res, 404, { error: `Propuesta ${id} no encontrada para editar` });
          return;
        }
        sendJson(res, 200, { success: true, id, propuesta: actualizada });
      })
      .catch((err: Error) => sendJson(res, 400, { error: err.message }));
    return;
  }

  // PATCH /api/proposals/:id/reject o PATCH /api/propuestas/:id/reject
  const matchRechazar = pathname.match(/^\/api\/(?:propuestas|proposals)\/([^/]+)\/reject$/);
  if (method === "PATCH" && matchRechazar) {
    const id = decodeURIComponent(matchRechazar[1]);
    parseJsonBody<{ reason?: string; motivo?: string }>(req)
      .then((body) => {
        const motivo = body.reason || body.motivo || "Rechazada por el usuario";
        const ok = services.propuestaRepo.rechazar(id, motivo);
        if (!ok) {
          sendJson(res, 404, { error: `Propuesta ${id} no encontrada para rechazar` });
          return;
        }
        sendJson(res, 200, { success: true, id, estado: "rechazado", motivo_rechazo: motivo });
      })
      .catch((err: Error) => sendJson(res, 400, { error: err.message }));
    return;
  }

  // PATCH /api/propuestas/:id/aprobar o /api/proposals/:id/approve
  const matchAprobar = pathname.match(/^\/api\/(?:propuestas|proposals)\/([^/]+)\/(?:aprobar|approve)$/);
  if (method === "PATCH" && matchAprobar) {
    const id = decodeURIComponent(matchAprobar[1]);
    const propuestaExistente = services.propuestaRepo.obtenerPorId(id);
    if (!propuestaExistente) {
      sendJson(res, 404, { error: "Propuesta no encontrada para aprobar" });
      return;
    }
    if (propuestaExistente.estado === "publicado") {
      sendJson(res, 409, {
        error: `Transición inválida: la propuesta ${id} ya ha sido publicada y no puede ser revertida a 'aprobado'`,
      });
      return;
    }
    const ok = services.propuestaRepo.aprobar(id);
    if (!ok) {
      sendJson(res, 500, { error: `Error al aprobar propuesta ${id}` });
      return;
    }
    sendJson(res, 200, { success: true, id, estado: "aprobado" });
    return;
  }

  // GET /api/propuestas/:id o /api/proposals/:id
  const matchPropuestaId = pathname.match(/^\/api\/(?:propuestas|proposals)\/([^/]+)$/);
  if (method === "GET" && matchPropuestaId) {
    const id = decodeURIComponent(matchPropuestaId[1]);
    const propuesta = services.propuestaRepo.obtenerPorId(id);
    if (!propuesta) {
      sendJson(res, 404, { error: "Propuesta no encontrada" });
      return;
    }
    sendJson(res, 200, propuesta);
    return;
  }

  // GET /api/kpis/optimizacion
  if (method === "GET" && pathname === "/api/kpis/optimizacion") {
    const recomendacion = services.smRepo.optimizarCombinacionComercial();
    sendJson(res, 200, recomendacion);
    return;
  }

  // Servidor de estáticos de producción si existe dist/
  if (method === "GET" && !pathname.startsWith("/api") && pathname !== "/health") {
    const served = serveStaticDistFile(res, pathname, undefined, req);
    if (served) return;
  }

  // Ruta no encontrada
  sendJson(res, 404, { error: `Endpoint no encontrado: ${method} ${pathname}` });
}

