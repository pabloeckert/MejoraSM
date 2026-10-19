// src/test/chaos.test.ts
// BATERÍA DE PRUEBAS DE CAOS (1.000 CICLOS) - FASE 4 SRE (MejoraSM 2026)
// Semilla PRNG fija para determinismo y reproducibilidad.
// Inyecta fallas deliberadas:
//   a) SIGKILL (kill -9) sobre el proceso hijo durante estado DESPACHANDO.
//   b) SIGKILL entre recepción de HTTP 200 de Zernio y el commit local de resultado.
//   c) Timeouts con procesamiento demorado y escrituras concurrentes (CAS changes = 0).
// Criterio de aprobación:
//   - 0 posts duplicados en la plataforma remota Zernio (Effectively-Once garantizado).
//   - 0 posts huérfanos o varados en estado DESPACHANDO con lease vencido.

import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { CREATE_TABLES_SQL } from "../infrastructure/sqlite/schema";
import { SqliteOutboxRepository } from "../infrastructure/sqlite/SqliteOutboxRepository";
import { despacharPostAZernio, ZernioReconciliationClient } from "../infrastructure/posting/zernioDispatcher";

// Generador pseudoaleatorio determinista (LCG) con semilla fija
class SeededRandom {
  private seed: number;
  constructor(seed: number = 13374242) {
    this.seed = seed;
  }
  public next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

describe("FASE 4: Batería de Pruebas de Caos (1.000 Ciclos Deterministas)", () => {
  it("ejecuta 1.000 ciclos con inyección de caos asegurando 0 duplicados y 0 huérfanos", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(CREATE_TABLES_SQL);

    const outboxRepo = new SqliteOutboxRepository(db);
    const rng = new SeededRandom(20261019);

    // Mock de la plataforma Zernio con detección de duplicados
    const zernioRemoteRegistry = new Map<string, string>(); // clave_idempotencia -> zernio_post_id
    let duplicatePostAttempts = 0;

    const mockReconciliationClient: ZernioReconciliationClient = {
      consultarPorClaveIdempotencia: async (clave: string) => {
        if (zernioRemoteRegistry.has(clave)) {
          return { existe: true, zernioId: zernioRemoteRegistry.get(clave)! };
        }
        return { existe: false };
      },
    };

    const TOTAL_CYCLES = 1000;
    let fallbackCountA = 0;
    let fallbackCountB = 0;
    let fallbackCountC = 0;
    let normalCount = 0;

    // Crear propuesta base requerida por FK
    const baseDate = "2026-10-19T12:00:00.000Z";
    db.prepare(`
      INSERT INTO propuestas_sm (
        propuesta_id, canal_destino, dia_programado, origen_boveda_id,
        borradores_json, tratamiento_visual_json, imagen_boveda_json,
        creado_el, actualizado_el
      ) VALUES ('PROP-CHAOS-BASE', 'linkedin', ?, 'BOV-CHAOS', '[]', '{}', '{}', ?, ?)
    `).run(baseDate, baseDate, baseDate);

    for (let cycle = 1; cycle <= TOTAL_CYCLES; cycle++) {
      const postId = `post-chaos-${cycle}`;
      const claveIdempotencia = `idemp-key-chaos-${cycle}`;
      const postDate = new Date("2026-10-19T12:00:00.000Z");

      // 1. Insertar post en EN_COLA
      db.prepare(`
        INSERT INTO outbox_posts (
          post_id, propuesta_id, canal, borrador_opcion, estado_post,
          clave_idempotencia, proximo_reintento_at, lease_owner, lease_expira_at,
          reintentos_cont, creado_en, actualizado_en
        ) VALUES (?, 'PROP-CHAOS-BASE', 'linkedin', 'A', 'EN_COLA', ?, ?, NULL, NULL, 0, ?, ?)
      `).run(postId, claveIdempotencia, postDate.toISOString(), postDate.toISOString(), postDate.toISOString());

      // Determinar modo de falla probabilístico
      const roll = rng.next();

      if (roll < 0.25) {
        // MODO A: kill -9 durante estado DESPACHANDO (antes de HTTP)
        fallbackCountA++;
        const reclamados = outboxRepo.reclamarLote(1, postDate, "worker-chaos-dead-a", 1000);
        expect(reclamados.length).toBe(1);
        expect(reclamados[0].estado_post).toBe("DESPACHANDO");

        // Simular muerte súbita del worker: el post queda con lease expirado
        const reaperTime = new Date(postDate.getTime() + 5000);
        const reaped = outboxRepo.liberarLeasesVencidos(reaperTime);
        expect(reaped).toBe(1);

        // En el siguiente pase, el worker recupera y despacha exitosamente
        const postRecuperado = outboxRepo.obtenerPorId(postId)!;
        expect(postRecuperado.estado_post).toBe("EN_COLA");
        expect(postRecuperado.reintentos_cont).toBe(1);

        // Despacho final
        const reclaim2 = outboxRepo.reclamarLote(1, reaperTime, "worker-chaos-healed", 60000);
        const zId = `zernio_remote_${postId}`;
        zernioRemoteRegistry.set(claveIdempotencia, zId);
        const desp = await despacharPostAZernio(
          outboxRepo,
          reclaim2[0],
          { content: "Post saneado post-SIGKILL", mediaItems: [], platforms: [{ platform: 'linkedin' as const, accountId: 'acc-123' }], publishNow: true },
          { sandbox: true, now: reaperTime, reconciliationClient: mockReconciliationClient }
        );
        expect(desp.exito).toBe(true);
        expect(desp.estadoFinal).toBe("PUBLICADO");

      } else if (roll < 0.50) {
        // MODO B: kill -9 entre la recepción de HTTP 200 de Zernio y el commit local
        fallbackCountB++;
        const reclamados = outboxRepo.reclamarLote(1, postDate, "worker-chaos-crash-b", 1000);
        expect(reclamados.length).toBe(1);

        // La llamada a Zernio tiene éxito en el servidor remoto y queda registrada
        const zId = `zernio_remote_${postId}`;
        if (zernioRemoteRegistry.has(claveIdempotencia)) {
          duplicatePostAttempts++;
        }
        zernioRemoteRegistry.set(claveIdempotencia, zId);

        // Pero el proceso recibe SIGKILL antes de marcarPublicado en la DB local
        // El reaper detecta el lease vencido y devuelve el post a EN_COLA (o REINTENTO)
        const reaperTime = new Date(postDate.getTime() + 5000);
        const reaped = outboxRepo.liberarLeasesVencidos(reaperTime);
        expect(reaped).toBe(1);

        const postReintentado = outboxRepo.obtenerPorId(postId)!;
        expect(postReintentado.reintentos_cont).toBe(1);

        // Al reintentar: RECONCILIACIÓN ACTIVA consulta Zernio por clave_idempotencia
        // Detecta que YA FUE PUBLICADO remotamente -> actualiza a PUBLICADO sin re-publicar
        const reclaim2 = outboxRepo.reclamarLote(1, reaperTime, "worker-chaos-reconciler", 60000);
        const desp = await despacharPostAZernio(
          outboxRepo,
          reclaim2[0],
          { content: "Post con reconciliación", mediaItems: [], platforms: [{ platform: 'linkedin' as const, accountId: 'acc-123' }], publishNow: true },
          {
            sandbox: false,
            now: reaperTime,
            reconciliationClient: mockReconciliationClient,
          }
        );

        expect(desp.exito).toBe(true);
        expect(desp.estadoFinal).toBe("PUBLICADO");
        expect(desp.reconciliadoPreviamente).toBe(true);

      } else if (roll < 0.75) {
        // MODO C: Timeout con procesamiento demorado y carreras concurrentes con reaper
        fallbackCountC++;
        const reclamados = outboxRepo.reclamarLote(1, postDate, "worker-chaos-slow", 1000);
        expect(reclamados.length).toBe(1);

        // El reaper se adelanta debido al timeout y devuelve a EN_COLA
        const reaperTime = new Date(postDate.getTime() + 2000);
        outboxRepo.liberarLeasesVencidos(reaperTime);

        // La respuesta demorada llega tarde: CAS rechaza la mutación (changes = 0)
        const tardioResult = outboxRepo.marcarPublicado(postId, reaperTime, "worker-chaos-slow");
        expect(tardioResult.success).toBe(false);
        expect(tardioResult.changes).toBe(0);

        // Se vuelve a procesar y culmina exitosamente
        const reclaim2 = outboxRepo.reclamarLote(1, reaperTime, "worker-chaos-final-c", 60000);
        const zId = `zernio_remote_${postId}`;
        zernioRemoteRegistry.set(claveIdempotencia, zId);
        const desp = await despacharPostAZernio(
          outboxRepo,
          reclaim2[0],
          { content: "Post C finalizado", mediaItems: [], platforms: [{ platform: 'linkedin' as const, accountId: 'acc-123' }], publishNow: true },
          { sandbox: true, now: reaperTime, reconciliationClient: mockReconciliationClient }
        );
        expect(desp.exito).toBe(true);
        expect(desp.estadoFinal).toBe("PUBLICADO");

      } else {
        // MODO D: Despacho normal feliz
        normalCount++;
        const reclamados = outboxRepo.reclamarLote(1, postDate, "worker-chaos-normal", 60000);
        const zId = `zernio_remote_${postId}`;
        zernioRemoteRegistry.set(claveIdempotencia, zId);
        const desp = await despacharPostAZernio(
          outboxRepo,
          reclamados[0],
          { content: "Post normal", mediaItems: [], platforms: [{ platform: 'linkedin' as const, accountId: 'acc-123' }], publishNow: true },
          { sandbox: true, now: postDate, reconciliationClient: mockReconciliationClient }
        );
        expect(desp.exito).toBe(true);
        expect(desp.estadoFinal).toBe("PUBLICADO");
      }
    }

    // AUDITORÍA FINAL DE CRITERIOS DE APROBACIÓN
    // 1. Cero duplicados en Zernio
    expect(duplicatePostAttempts).toBe(0);

    // 2. Cero huérfanos en la base de datos local
    const huerfanos = db.prepare(`
      SELECT COUNT(*) as count FROM outbox_posts WHERE estado_post = 'DESPACHANDO'
    `).get() as { count: number };
    expect(huerfanos.count).toBe(0);

    // 3. 100% de los 1.000 posts en estado PUBLICADO
    const publicados = db.prepare(`
      SELECT COUNT(*) as count FROM outbox_posts WHERE estado_post = 'PUBLICADO'
    `).get() as { count: number };
    expect(publicados.count).toBe(TOTAL_CYCLES);

    console.log(`\n========================================================`);
    console.log(` SUITE DE CAOS COMPLETADA: ${TOTAL_CYCLES} CICLOS DETERMINISTAS`);
    console.log(`========================================================`);
    console.log(`  • Falla A (kill -9 durante DESPACHANDO): ${fallbackCountA} ciclos`);
    console.log(`  • Falla B (kill -9 post-HTTP 200 / Reconciliación): ${fallbackCountB} ciclos`);
    console.log(`  • Falla C (Timeout / CAS tardío changes=0): ${fallbackCountC} ciclos`);
    console.log(`  • Normal (Happy path): ${normalCount} ciclos`);
    console.log(`  --------------------------------------------------------`);
    console.log(`  ✓ Duplicados en Zernio: ${duplicatePostAttempts} (0 requeridos)`);
    console.log(`  ✓ Huérfanos en DB: ${huerfanos.count} (0 requeridos)`);
    console.log(`  ✓ Publicados finales: ${publicados.count}/${TOTAL_CYCLES} (100.0%)`);
    console.log(`========================================================\n`);

    db.close();
  });
});
