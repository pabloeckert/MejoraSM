// src/infrastructure/posting/__tests__/fase2DaemonDispatcher.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { DDL_002_STRICT_SCHEMA } from "../../../../scripts/migracion_002_fechas_estrictas.mjs";
import { SqliteOutboxRepository } from "../../sqlite/SqliteOutboxRepository";
import { despacharPostAZernio } from "../zernioDispatcher";
import { PostingDaemonSupervisor } from "../daemonSupervisor";
import { runLeaseReaper } from "../../../../scripts/migracion_v1_1_0.mjs";
import * as path from "node:path";
import * as fs from "node:fs";

describe("Parche v1.1.0 — FASE 2b: Daemon Desacoplado, Patrón de Despacho y EXPLAIN QUERY PLAN", () => {
  let db: DatabaseSync;
  let outboxRepo: SqliteOutboxRepository;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(DDL_002_STRICT_SCHEMA);
    outboxRepo = new SqliteOutboxRepository(db);

    const now = "2026-10-19T12:00:00.000Z";
    db.prepare(`
      INSERT INTO boveda_fichas (id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw, fase_comercial_sugerida, creado_el)
      VALUES ('BOV-F2', 'constitucion', 'empresarial', 'texto_markdown', 'Titulo', 'Contenido', 'tofu_atraccion', ?)
    `).run(now);
    db.prepare(`
      INSERT INTO propuestas_sm (propuesta_id, canal_destino, dia_programado, origen_boveda_id, borradores_json, tratamiento_visual_json, imagen_boveda_json, creado_el, actualizado_el)
      VALUES ('PROP-F2', 'linkedin', ?, 'BOV-F2', '[]', '{}', '{}', ?, ?)
    `).run(now, now, now);
  });

  // ── 1. PATRÓN INNEGOCIABLE DE DESPACHO A ZERNIO (3 PASOS) ────────────────
  it("ejecuta el patrón de despacho: (1) Claim -> COMMIT, (2) HTTP fuera de tx, (3) Result -> COMMIT", async () => {
    const now = new Date("2026-10-19T12:00:00.000Z");
    outboxRepo.encolarAprobado({ propuesta_id: "PROP-F2", canal: "linkedin", borrador_opcion: "A" }, now);

    // PASO 1: Transacción 1 (Claim) -> COMMIT con lease_owner
    const lote = outboxRepo.reclamarLote(1, now, "worker-prod-1");
    expect(lote).toHaveLength(1);
    const postReclamado = lote[0];
    expect(postReclamado.estado_post).toBe("DESPACHANDO");
    expect(postReclamado.lease_owner).toBe("worker-prod-1");

    // Verificar en SQLite que la transacción 1 cerró y el estado está persistido
    const checkPost1 = outboxRepo.obtenerPorId(postReclamado.post_id);
    expect(checkPost1?.estado_post).toBe("DESPACHANDO");
    expect(checkPost1?.lease_owner).toBe("worker-prod-1");

    // PASO 2 y 3: Despacho a Zernio (HTTP fuera de tx + Transacción 2 Result -> COMMIT)
    const mockPayload = {
      content: "Post content",
      mediaItems: [],
      platforms: [{ platform: "linkedin", accountId: "acc_1" }],
      publishNow: true,
    };

    const res = await despacharPostAZernio(outboxRepo, postReclamado, mockPayload, {
      sandbox: true,
      now,
    });

    expect(res.exito).toBe(true);
    expect(res.estadoFinal).toBe("PUBLICADO");
    expect(res.casSuccess).toBe(true);

    const checkPostFinal = outboxRepo.obtenerPorId(postReclamado.post_id);
    expect(checkPostFinal?.estado_post).toBe("PUBLICADO");
    expect(checkPostFinal?.lease_owner).toBeNull();
  });

  it("registra fallo a REINTENTO cuando la petición HTTP de Zernio falla fuera de transacción", async () => {
    const now = new Date("2026-10-19T12:00:00.000Z");
    outboxRepo.encolarAprobado({ propuesta_id: "PROP-F2", canal: "linkedin", borrador_opcion: "B" }, now);

    const lote = outboxRepo.reclamarLote(1, now, "worker-prod-2");
    const postReclamado = lote[0];

    const mockFetch = vi.fn().mockRejectedValue(new Error("Zernio 503 Service Unavailable"));
    vi.stubGlobal("fetch", mockFetch);

    const res = await despacharPostAZernio(outboxRepo, postReclamado, {} as any, {
      sandbox: false,
      now,
    });

    expect(res.exito).toBe(false);
    expect(res.estadoFinal).toBe("REINTENTO");
    expect(res.casSuccess).toBe(true);

    const checkPost = outboxRepo.obtenerPorId(postReclamado.post_id);
    expect(checkPost?.estado_post).toBe("REINTENTO");
    expect(checkPost?.reintentos_cont).toBe(1);
    expect(checkPost?.lease_owner).toBeNull();
  });

  // ── 2. COMPARE-AND-SET Y RESILIENCIA ANTE RESPUESTA TARDÍA (REAPER) ────────
  it("simula reaper devolviendo post a EN_COLA durante llamada lenta para comprobar que la respuesta tardía no pisa el estado (CAS changes = 0)", async () => {
    const claimTime = new Date("2026-10-19T12:00:00.000Z");
    outboxRepo.encolarAprobado({ propuesta_id: "PROP-F2", canal: "linkedin", borrador_opcion: "C" }, claimTime);

    // 1. Worker reclama el post (lease por 60s vence a las 12:01:00)
    const lote = outboxRepo.reclamarLote(1, claimTime, "worker-lento", 60_000);
    const post = lote[0];
    expect(post.lease_owner).toBe("worker-lento");

    // 2. Simular que transcurren 70 segundos (reaper interviene porque el lease venció)
    const reaperTime = new Date("2026-10-19T12:01:10.000Z");
    const reapedCount = runLeaseReaper(db, reaperTime);
    expect(reapedCount).toBe(1);

    // El post volvió a EN_COLA y reintentos_cont incrementó a 1
    const postReap = outboxRepo.obtenerPorId(post.post_id);
    expect(postReap?.estado_post).toBe("EN_COLA");
    expect(postReap?.lease_owner).toBeNull();
    expect(postReap?.reintentos_cont).toBe(1);

    // 3. Respuesta tardía de Zernio llega al worker-lento
    // Intenta hacer commit del resultado PUBLICADO con Compare-And-Set
    const commitTime = new Date("2026-10-19T12:01:15.000Z");
    const res = await despacharPostAZernio(
      outboxRepo,
      post, // conservaba lease_owner: 'worker-lento'
      { content: "Tardío", mediaItems: [], platforms: [], publishNow: true },
      { sandbox: true, now: commitTime }
    );

    // Compare-and-Set DEBE rechazar el commit porque el lease_owner cambió (changes = 0)
    expect(res.casSuccess).toBe(false);
    expect(res.reconciliacionRequerida).toBe(true);

    // Comprobar que la respuesta tardía NO pisó el estado en SQLite (permanece en EN_COLA)
    const postFinal = outboxRepo.obtenerPorId(post.post_id);
    expect(postFinal?.estado_post).toBe("EN_COLA");

    // Y se registró el evento de CAS mismatch para reconciliación
    const logs = db
      .prepare(
        "SELECT * FROM outbox_eventos_log WHERE post_id = ? AND motivo_catalogo = 'CAS_LEASE_MISMATCH_REAPED'"
      )
      .all(post.post_id);
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });

  // ── 3. ÍNDICE PARCIAL Y EXPLAIN QUERY PLAN (CERO TEMP B-TREE) ─────────────
  it("valida con EXPLAIN QUERY PLAN que el índice parcial idx_outbox_pendientes no genera TEMP B-TREE", () => {
    const query = `
      SELECT post_id, proximo_reintento_at
      FROM outbox_posts INDEXED BY idx_outbox_pendientes
      WHERE estado_post IN ('EN_COLA', 'REINTENTO')
        AND proximo_reintento_at <= '2026-10-19T12:00:00.000Z'
      ORDER BY proximo_reintento_at ASC;
    `;

    const plan = db.prepare("EXPLAIN QUERY PLAN " + query).all() as any[];
    expect(plan.length).toBeGreaterThan(0);

    const usesIndex = plan.some((p) => p.detail.includes("idx_outbox_pendientes"));
    expect(usesIndex).toBe(true);

    const hasTempBTree = plan.some((p) => p.detail.toUpperCase().includes("TEMP B-TREE"));
    expect(hasTempBTree).toBe(false);
  });

  // ── 4. SUPERVISOR DAEMON (PROCESO HIJO, HEARTBEAT Y SIGKILL EN PROCESO COLGADO)
  it("supervisor de daemon detecta proceso hijo colgado (watchdog sin heartbeat) y envía SIGKILL para respawnearlo", async () => {
    const dummyWorkerPath = path.resolve(process.cwd(), "data", "test_worker_hung.mjs");
    fs.writeFileSync(
      dummyWorkerPath,
      `
      process.on("message", (msg) => {
        if (msg.type === "FREEZE") {
          // Simula bloqueo total del event loop: deja de emitir heartbeats
          while(true) {}
        }
      });
      // Emite un único heartbeat inicial
      if (process.send) process.send({ type: "heartbeat", timestamp: Date.now() });
      `
    );

    // Watchdog con chequeo cada 40ms y umbral de 2 intervalos (80ms de silencio = colgado)
    const supervisor = new PostingDaemonSupervisor(dummyWorkerPath, 40, 2);
    supervisor.start();

    // Esperar a que arranque y emita el primer heartbeat (tolerante a carga de CPU)
    const tStart = Date.now();
    while (!supervisor.getStatus().running && Date.now() - tStart < 2500) {
      await new Promise((r) => setTimeout(r, 20));
    }
    const status1 = supervisor.getStatus();
    expect(status1.running).toBe(true);

    // Enviar comando para colgar el proceso
    const child = supervisor.getChild();
    if (child && child.connected) {
      child.send({ type: "FREEZE" });
    }

    // Esperar a que el watchdog detecte la falta de heartbeat y envíe SIGKILL
    const tKill = Date.now();
    while (supervisor.getStatus().respawnCount < 1 && Date.now() - tKill < 3000) {
      await new Promise((r) => setTimeout(r, 30));
    }
    const status2 = supervisor.getStatus();
    expect(status2.respawnCount).toBeGreaterThanOrEqual(1);

    await supervisor.stop();
    if (fs.existsSync(dummyWorkerPath)) fs.unlinkSync(dummyWorkerPath);
  });
});
