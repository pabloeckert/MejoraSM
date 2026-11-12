// src/interfaces/http/__tests__/p0_p1_evolution.test.ts
// TEST SUITE: EVOLUCIÓN P0 Y P1 — OFFLINE FALLBACK, LINKEDIN Y OUTBOX DRAWER
import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { generarGrillaEvergreen26Semanas } from "../../../domain/gridGenerator";
import { calculateContainmentGeometry, CANVAS_DIMENSIONS } from "../../../domain/framingEngine";
import { generarPaqueteMulticanal } from "../../../domain/types";
import { CREATE_TABLES_SQL } from "../../../infrastructure/sqlite/schema";
import { SqliteSMRepository } from "../../../infrastructure/sqlite/SqliteSMRepository";
import { SqliteOutboxRepository } from "../../../infrastructure/sqlite/SqliteOutboxRepository";

describe("Plan Maestro P0 & P1: Evolución Soberana de MejoraSM", () => {
  let db: DatabaseSync;
  let smRepo: SqliteSMRepository;
  let outboxRepo: SqliteOutboxRepository;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec(CREATE_TABLES_SQL);
    db.exec("PRAGMA foreign_keys = ON;");
    smRepo = new SqliteSMRepository(db);
    outboxRepo = new SqliteOutboxRepository(db);
  });

  // ── 1. FASE 1 (P0): OFFLINE FALLBACK PARA CONFIGURACIÓN Y MONITOR ─────────
  describe("Fase 1 (P0): Configuración y Monitor en SQLite Local", () => {
    it("obtenerConfigAgentes devuelve la configuración inicial por defecto con los 3 agentes", () => {
      const configs = smRepo.obtenerConfigAgentes();
      expect(configs).toHaveLength(3);

      const estratega = configs.find((c) => c.id === "estratega");
      const creativo = configs.find((c) => c.id === "creativo");
      const critico = configs.find((c) => c.id === "critico");

      expect(estratega).toBeDefined();
      expect(estratega?.temperature).toBe(0.7);
      expect(creativo).toBeDefined();
      expect(creativo?.temperature).toBe(0.8);
      expect(critico).toBeDefined();
      expect(critico?.temperature).toBe(0.2);
    });

    it("guardarConfigAgentes persiste mutaciones en SQLite local y las recupera inmediatamente", () => {
      const nuevoPrompt = "Nuevo prompt auditado del Estratega B2B";
      const ok = smRepo.guardarConfigAgentes([
        {
          id: "estratega",
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          temperature: 0.65,
          system_prompt: nuevoPrompt,
        },
      ]);
      expect(ok).toBe(true);

      const configs = smRepo.obtenerConfigAgentes();
      const estratega = configs.find((c) => c.id === "estratega");
      expect(estratega?.system_prompt).toBe(nuevoPrompt);
      expect(estratega?.temperature).toBe(0.65);
    });

    it("historial_cache almacena, recupera y elimina publicaciones en SQLite", () => {
      const dummyPosts = [
        { id: "post-1", platform: "instagram", status: "published" },
        { id: "post-2", platform: "linkedin", status: "published" },
      ];
      smRepo.guardarHistorialCache({ synced_at: "2026-11-11T20:00:00.000Z", posts: dummyPosts });

      const cache = smRepo.obtenerHistorialCache();
      expect(cache.posts).toHaveLength(2);

      const borrado = smRepo.eliminarPostHistorial("post-1");
      expect(borrado).toBe(true);

      const cachePostBorrado = smRepo.obtenerHistorialCache();
      expect(cachePostBorrado.posts).toHaveLength(1);
      expect((cachePostBorrado.posts[0] as { id: string }).id).toBe("post-2");
    });
  });

  // ── 2. FASE 2 (P1): DRAWER VISUAL DE OUTBOX Y CIRCUIT BREAKER ─────────────
  describe("Fase 2 (P1): Supervisión de Outbox y Circuit Breakers", () => {
    it("obtenerEstadoResumen contabiliza correctamente piezas en cola y reporta los 3 canales", () => {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO boveda_fichas (id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw, fase_comercial_sugerida, creado_el)
        VALUES ('BOV-TEST', 'constitucion', 'empresarial', 'texto_markdown', 'Titulo', 'Contenido', 'tofu_atraccion', ?)
      `).run(now);
      db.prepare(`
        INSERT INTO propuestas_sm (propuesta_id, canal_destino, dia_programado, origen_boveda_id, borradores_json, tratamiento_visual_json, imagen_boveda_json, creado_el, actualizado_el)
        VALUES ('PROP-2026-W01-01', 'instagram', ?, 'BOV-TEST', '[]', '{}', '{}', ?, ?)
      `).run(now, now, now);
      db.prepare(`
        INSERT INTO propuestas_sm (propuesta_id, canal_destino, dia_programado, origen_boveda_id, borradores_json, tratamiento_visual_json, imagen_boveda_json, creado_el, actualizado_el)
        VALUES ('PROP-2026-W01-02', 'linkedin', ?, 'BOV-TEST', '[]', '{}', '{}', ?, ?)
      `).run(now, now, now);

      outboxRepo.encolarPost({
        propuesta_id: "PROP-2026-W01-01",
        canal: "instagram",
        borrador_opcion: "A",
      });
      outboxRepo.encolarPost({
        propuesta_id: "PROP-2026-W01-02",
        canal: "linkedin",
        borrador_opcion: "B",
      });

      const resumen = outboxRepo.obtenerEstadoResumen();
      expect(resumen.conteos.en_cola).toBe(2);
      expect(resumen.conteos.total).toBe(2);
      expect(resumen.posts).toHaveLength(2);

      // Debe incluir los 3 canales de Circuit Breaker (Instagram, Facebook, LinkedIn)
      expect(resumen.circuitBreakers).toHaveLength(3);
      const canales = resumen.circuitBreakers.map((cb) => cb.canal);
      expect(canales).toContain("instagram");
      expect(canales).toContain("facebook");
      expect(canales).toContain("linkedin");
    });
  });

  // ── 3. FASE 3 (P1): SOPORTE NATIVO DE LINKEDIN Y RATIO 1200x627 ───────────
  describe("Fase 3 (P1): LinkedIn como Canal Prioritario P1", () => {
    it("la grilla evergreen incluye propuestas con canal_destino 'linkedin'", () => {
      const grilla = generarGrillaEvergreen26Semanas(new Date("2026-10-19T00:00:00.000Z"));
      const todas = grilla.semanas.flatMap((s) => s.propuestas);
      const propuestasLinkedIn = todas.filter((p) => p.canal_destino === "linkedin");

      expect(propuestasLinkedIn.length).toBeGreaterThan(15);
      // Las piezas de LinkedIn deben tener tratamiento 1200:627
      expect(propuestasLinkedIn[0].tratamiento_visual.relacion_aspecto_destino).toBe("1200:627");
    });

    it("el Framing Engine soporta el ratio '1200:627' conservando 0% de recorte facial", () => {
      expect(CANVAS_DIMENSIONS["1200:627"]).toEqual({ width: 1200, height: 627, ratio: "1200:627" });

      const geo = calculateContainmentGeometry(1920, 1080, "1200:627");
      expect(geo.croppedPixels).toBe(0);
      expect(geo.aspectRatioPreserved).toBe(true);
      expect(geo.canvasWidth).toBe(1200);
      expect(geo.canvasHeight).toBe(627);
    });

    it("generarPaqueteMulticanal exporta textoLinkedIn con formato ejecutivo", () => {
      const grilla = generarGrillaEvergreen26Semanas(new Date("2026-10-19T00:00:00.000Z"));
      const piezaLinkedIn = grilla.semanas[0].propuestas.find((p) => p.canal_destino === "linkedin") || grilla.semanas[0].propuestas[0];

      const paquete = generarPaqueteMulticanal(piezaLinkedIn);
      expect(paquete.textoLinkedIn).toBeDefined();
      expect(paquete.textoLinkedIn).toContain("MejoraContinua");
      expect(paquete.textoLinkedIn).toContain("Liderazgo");
    });
  });

  // ── 4. FASE 4 (P1): TRAZABILIDAD DE ATRIBUCIÓN CON MEJORADIAGNOSTICO ──────
  describe("Fase 4 (P1): Parámetros UTM Estrictos en Right Hooks", () => {
    it("todos los Right Hooks inyectan utm_source=mejora_sm, arquetipo y pieza_id", () => {
      const grilla = generarGrillaEvergreen26Semanas(new Date("2026-10-19T00:00:00.000Z"));
      const rightHooks = grilla.semanas
        .flatMap((s) => s.propuestas)
        .filter((p) => p.borradores.some((b) => b.estrategia === "right_hook_conversion"));

      expect(rightHooks.length).toBe(15);

      for (const rh of rightHooks) {
        const borradorC = rh.borradores.find((b) => b.opcion === "C") || rh.borradores[0];
        const copyDir = borradorC.copy_tres_pasos.paso3_direccion_web;
        expect(copyDir).toContain("https://mejoraok.com/diagnostico");
        expect(copyDir).toContain("utm_source=mejora_sm");
        expect(copyDir).toContain("utm_medium=organic_social");
        expect(copyDir).toContain(`pieza_id=${rh.propuesta_id}`);
      }
    });
  });
});
