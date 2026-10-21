// src/interfaces/http/server.ts
// SERVIDOR HTTP LOCAL SOBERANO PARA MejoraSM
// Motor: node:http nativo con desacoplamiento de lectura (readOnly: true)
// y escrituras cortas bajo BEGIN IMMEDIATE y busy_timeout <= 250ms.

import { createServer, Server } from "node:http";
import { handleSMHttpRequest, type SMAppServices } from "./router";
import { SqliteBovedaRepository } from "../../infrastructure/sqlite/SqliteBovedaRepository";
import { SqlitePropuestaRepository } from "../../infrastructure/sqlite/SqlitePropuestaRepository";
import { SqliteSMRepository } from "../../infrastructure/sqlite/SqliteSMRepository";
import { SqliteProspectoRepository } from "../../infrastructure/sqlite/SqliteProspectoRepository";
import {
  createDatabaseConnection,
  createReadOnlyConnection,
  createShortWriteConnection,
} from "../../infrastructure/sqlite/connectionFactory";
import { SlidingWindowRateLimiter } from "./rateLimiter";

export function createDefaultServices(dbPath: string = "data/mejora_sm.db"): SMAppServices {
  if (dbPath === ":memory:") {
    const memDb = createDatabaseConnection(":memory:");
    return {
      bovedaRepo: new SqliteBovedaRepository(memDb),
      propuestaRepo: new SqlitePropuestaRepository(memDb),
      smRepo: new SqliteSMRepository(memDb),
      prospectoRepo: new SqliteProspectoRepository(memDb),
      leadRateLimiter: new SlidingWindowRateLimiter(5, 60_000),
    };
  }

  // Desacoplamiento HTTP: Lecturas con readOnly: true para aislamiento total
  const readConn = createReadOnlyConnection(dbPath);
  // Escrituras con conexión dedicada de corta duración (busy_timeout <= 250ms)
  const writeConn = createShortWriteConnection(dbPath, 250);

  const bovedaRepo = new SqliteBovedaRepository(readConn);
  const smRepo = new SqliteSMRepository(writeConn);
  const propuestaRepo = new SqlitePropuestaRepository(writeConn);
  const prospectoRepo = new SqliteProspectoRepository(writeConn);
  const leadRateLimiter = new SlidingWindowRateLimiter(5, 60_000);

  return { bovedaRepo, propuestaRepo, smRepo, prospectoRepo, leadRateLimiter };
}

export function createSMServer(customServices?: SMAppServices): Server {
  const services = customServices || createDefaultServices();
  const server = createServer((req, res) => {
    handleSMHttpRequest(req, res, services);
  });
  return server;
}

// Punto de entrada si se ejecuta directamente con Node
if (process.argv[1] && process.argv[1].endsWith("server.ts")) {
  const PORT = Number(process.env.PORT) || Number(process.env.MEJORA_SM_PORT) || 4002;
  const server = createSMServer();
  const HOST = "127.0.0.1";
  server.listen(PORT, HOST, () => {
    console.log(`[MejoraSM] Servidor local soberano corriendo en http://${HOST}:${PORT}`);
    console.log(`[MejoraSM] Endpoints disponibles: /health, /api/boveda/fichas, /api/propuestas, /api/kpis/optimizacion`);
  });
}
