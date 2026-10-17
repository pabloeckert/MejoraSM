// src/interfaces/http/server.ts
// SERVIDOR HTTP LOCAL SOBERANO PARA MejoraSM
// Motor: node:http nativo

import { createServer, Server } from "node:http";
import { handleSMHttpRequest, type SMAppServices } from "./router";
import { SqliteBovedaRepository } from "../../infrastructure/sqlite/SqliteBovedaRepository";
import { SqlitePropuestaRepository } from "../../infrastructure/sqlite/SqlitePropuestaRepository";
import { SqliteSMRepository } from "../../infrastructure/sqlite/SqliteSMRepository";

export function createDefaultServices(dbPath: string = "data/mejora_sm.db"): SMAppServices {
  const smRepo = new SqliteSMRepository(dbPath);
  const bovedaRepo = new SqliteBovedaRepository(dbPath);
  const propuestaRepo = new SqlitePropuestaRepository(dbPath);

  return { bovedaRepo, propuestaRepo, smRepo };
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
  const PORT = Number(process.env.MEJORA_SM_PORT) || 4002;
  const server = createSMServer();
  server.listen(PORT, () => {
    console.log(`[MejoraSM] Servidor local soberano corriendo en http://localhost:${PORT}`);
    console.log(`[MejoraSM] Endpoints disponibles: /health, /api/boveda/fichas, /api/propuestas, /api/kpis/optimizacion`);
  });
}
