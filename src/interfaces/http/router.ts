// src/interfaces/http/router.ts
// ROUTER HTTP LOCAL SOBERANO PARA MejoraSM
// Conexión directa a SqliteBovedaRepository, SqlitePropuestaRepository y optimizador.
// 100% nativo sobre node:http sin dependencias de Express o Fastify.

import { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { SqliteBovedaRepository } from "../../infrastructure/sqlite/SqliteBovedaRepository";
import { SqlitePropuestaRepository } from "../../infrastructure/sqlite/SqlitePropuestaRepository";
import { SqliteSMRepository } from "../../infrastructure/sqlite/SqliteSMRepository";
import { generarGrillaEvergreen26Semanas } from "../../domain/gridGenerator";
import { type FichaBovedaDTO, type PropuestaMejoraSMDTO } from "../../domain/types";

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
  distDir: string = path.resolve(process.cwd(), "dist")
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

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": content.length,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}


export interface SMAppServices {
  bovedaRepo: SqliteBovedaRepository;
  propuestaRepo: SqlitePropuestaRepository;
  smRepo: SqliteSMRepository;
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(json);
}

function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error("Payload too large (> 5MB)"));
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
  process.env.MEJORA_SM_AUTH_TOKEN || "mejora_sm_local_bearer_2026";

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
  const expectedToken = process.env.MEJORA_SM_AUTH_TOKEN || "mejora_sm_local_bearer_2026";
  return token === expectedToken;
}

export function handleSMHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  services: SMAppServices
): void {
  const method = req.method || "GET";
  const rawUrl = req.url || "/";
  const parsedUrl = new URL(rawUrl, "http://localhost");
  const pathname = parsedUrl.pathname;

  // Manejo de preflight CORS
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
  if (pathname.startsWith("/api") && ["POST", "PATCH", "DELETE", "PUT"].includes(method)) {
    if (!isAuthorized(req)) {
      sendJson(res, 401, {
        error: "No autorizado: se requiere header Authorization: Bearer <token>",
      });
      return;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BÓVEDA DE CONOCIMIENTO (4 Capas Canónicas)
  // ──────────────────────────────────────────────────────────────────────────

  // GET /api/boveda/fichas o /api/boveda
  if (method === "GET" && (pathname === "/api/boveda/fichas" || pathname === "/api/boveda")) {
    const dimension = parsedUrl.searchParams.get("dimension") as any;
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
      .catch((err) => sendJson(res, 400, { error: err.message }));
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

  // GET /api/propuestas o /api/posts
  if (method === "GET" && (pathname === "/api/propuestas" || pathname === "/api/posts")) {
    const estado = parsedUrl.searchParams.get("estado") as any;
    const canal = parsedUrl.searchParams.get("canal") as any;
    const propuestas = services.propuestaRepo.listar({ estado, canal });
    sendJson(res, 200, propuestas);
    return;
  }

  // POST /api/propuestas
  if (method === "POST" && pathname === "/api/propuestas") {
    parseJsonBody<PropuestaMejoraSMDTO>(req)
      .then((propuesta) => {
        if (!propuesta.propuesta_id || !propuesta.borradores) {
          sendJson(res, 400, { error: "Faltan campos obligatorios en PropuestaMejoraSMDTO" });
          return;
        }
        services.propuestaRepo.guardar(propuesta);
        sendJson(res, 201, { success: true, id: propuesta.propuesta_id });
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
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
      .catch((err) => sendJson(res, 400, { error: err.message }));
    return;
  }

  // POST /api/publish o POST /api/propuestas/:id/publicar
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
        const ok = services.propuestaRepo.publicar(id);
        if (!ok) {
          sendJson(res, 500, { error: `No se pudo actualizar el estado a 'publicado' para ${id}` });
          return;
        }
        sendJson(res, 200, { success: true, id, estado: "publicado" });
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
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
      .catch((err) => sendJson(res, 400, { error: err.message }));
    return;
  }

  // PATCH /api/propuestas/:id/aprobar
  const matchAprobar = pathname.match(/^\/api\/propuestas\/([^/]+)\/aprobar$/);
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

  // GET /api/propuestas/:id
  const matchPropuestaId = pathname.match(/^\/api\/propuestas\/([^/]+)$/);
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
    const served = serveStaticDistFile(res, pathname);
    if (served) return;
  }

  // Ruta no encontrada
  sendJson(res, 404, { error: `Endpoint no encontrado: ${method} ${pathname}` });
}

