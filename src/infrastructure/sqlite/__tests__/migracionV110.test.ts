// src/infrastructure/sqlite/__tests__/migracionV110.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  DDL_STRICT_SCHEMA,
  generarClaveIdempotencia,
  escapeDelimiter,
  requeueDeadLetter,
  runLeaseReaper,
  getFechaProgramadaART,
} from "../../../../scripts/migracion_v1_1_0.mjs";
import {
  DDL_002_STRICT_SCHEMA,
  ejecutarMigracion002,
} from "../../../../scripts/migracion_002_fechas_estrictas.mjs";
import {
  createDatabaseConnection,
  createReadOnlyConnection,
} from "../connectionFactory";

describe("Parche v1.1.0 — Fase 1b: SRE Hardening y Persistencia Soberana STRICT", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(DDL_002_STRICT_SCHEMA);
  });

  // ── 1. VERIFICACIÓN Y FIJACIÓN DE JOURNAL MODE Y FÁBRICA ÚNICA ───────────
  it("(Punto 2 & 4) fábrica única centraliza conexiones con foreign_keys = ON y journal_mode = WAL", () => {
    const conn = createDatabaseConnection(":memory:");
    const fk = conn.prepare("PRAGMA foreign_keys;").get() as any;
    expect(fk.foreign_keys).toBe(1);

    // Verificación de enforcement de FK activo por defecto
    expect(() => {
      conn.prepare(`
        INSERT INTO borradores (borrador_id, propuesta_id, opcion, tipo_formato, estrategia, titulo_portada, cuerpo_texto, copy_tres_pasos_json, cta_texto, creado_el)
        VALUES ('BORR-X', 'PROP-INEXISTENTE', 'A', 'post_directo', 'jab', 'T', 'C', '{}', 'CTA', '2026-10-19T12:00:00.000Z')
      `).run();
    }).toThrow(/FOREIGN KEY constraint failed/);

    conn.close();
  });

  // ── 2. MIGRACIÓN 002 — VALIDACIÓN ESTRICTA DE FECHAS (ISO-8601 UTC) ───────
  it("(Punto 3) rechaza explícitamente cadenas de fecha malformadas ('abcd-ef...' o '2026-13-45...') y acepta ISO-8601 UTC válido", () => {
    const insertFicha = (creadoEl: string) => {
      db.prepare(`
        INSERT INTO boveda_fichas (id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw, fase_comercial_sugerida, creado_el)
        VALUES (?, 'constitucion', 'empresarial', 'texto_markdown', 'Titulo', 'Contenido', 'tofu_atraccion', ?)
      `).run(`BOV-FECHA-${Date.now()}-${Math.random()}`, creadoEl);
    };

    // Válido
    expect(() => insertFicha("2026-10-19T12:30:00.000Z")).not.toThrow();

    // Malformado textual con letras
    expect(() => insertFicha("abcd-ef-ghTxx:xx:xx.xxxZ")).toThrow(/CHECK constraint failed/);

    // Inválido semántico de fecha y hora
    expect(() => insertFicha("2026-13-45T99:99:99.999Z")).toThrow(/CHECK constraint failed/);

    // Inválido sin Z
    expect(() => insertFicha("2026-10-19T12:30:00.000")).toThrow(/CHECK constraint failed/);

    // Inválido sin milisegundos
    expect(() => insertFicha("2026-10-19T12:30:00Z")).toThrow(/CHECK constraint failed/);
  });

  // ── 3. BATERÍA DE TESTS OBLIGATORIA (a - g) ──────────────────────────────
  it("(a) transición ilegal en outbox_posts aborta de forma determinista", () => {
    const now = "2026-10-19T12:00:00.000Z";
    db.prepare(`
      INSERT INTO boveda_fichas (id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw, fase_comercial_sugerida, creado_el)
      VALUES ('BOV-T1', 'constitucion', 'empresarial', 'texto_markdown', 'Titulo', 'Contenido', 'tofu_atraccion', ?)
    `).run(now);

    db.prepare(`
      INSERT INTO propuestas_sm (propuesta_id, canal_destino, dia_programado, origen_boveda_id, borradores_json, tratamiento_visual_json, imagen_boveda_json, creado_el, actualizado_el)
      VALUES ('PROP-T1', 'instagram', ?, 'BOV-T1', '[]', '{}', '{}', ?, ?)
    `).run(now, now, now);

    db.prepare(`
      INSERT INTO outbox_posts (post_id, propuesta_id, canal, borrador_opcion, estado_post, clave_idempotencia, creado_en, actualizado_en)
      VALUES ('POST-T1', 'PROP-T1', 'instagram', 'A', 'BORRADOR', 'CLAVE-T1', ?, ?)
    `).run(now, now);

    // Transición ilegal directa BORRADOR -> DESPACHANDO aborta
    expect(() => {
      db.prepare("UPDATE outbox_posts SET estado_post = 'DESPACHANDO' WHERE post_id = 'POST-T1'").run();
    }).toThrow(/Transición de estado no permitida/);

    // Transición legal BORRADOR -> APROBADO
    db.prepare("UPDATE outbox_posts SET estado_post = 'APROBADO' WHERE post_id = 'POST-T1'").run();

    // Transición ilegal directa APROBADO -> PUBLICADO aborta
    expect(() => {
      db.prepare("UPDATE outbox_posts SET estado_post = 'PUBLICADO' WHERE post_id = 'POST-T1'").run();
    }).toThrow(/Transición de estado no permitida/);
  });

  it("(b) UPDATE y DELETE sobre outbox_eventos_log abortan (append-only inmutable)", () => {
    const now = "2026-10-19T12:00:00.000Z";
    db.prepare(`
      INSERT INTO boveda_fichas (id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw, fase_comercial_sugerida, creado_el)
      VALUES ('BOV-B1', 'constitucion', 'empresarial', 'texto_markdown', 'Titulo', 'Contenido', 'tofu_atraccion', ?)
    `).run(now);
    db.prepare(`
      INSERT INTO propuestas_sm (propuesta_id, canal_destino, dia_programado, origen_boveda_id, borradores_json, tratamiento_visual_json, imagen_boveda_json, creado_el, actualizado_el)
      VALUES ('PROP-B1', 'instagram', ?, 'BOV-B1', '[]', '{}', '{}', ?, ?)
    `).run(now, now, now);
    db.prepare(`
      INSERT INTO outbox_posts (post_id, propuesta_id, canal, borrador_opcion, estado_post, clave_idempotencia, creado_en, actualizado_en)
      VALUES ('POST-B1', 'PROP-B1', 'instagram', 'A', 'BORRADOR', 'CLAVE-B1', ?, ?)
    `).run(now, now);

    db.prepare(`
      INSERT INTO outbox_eventos_log (evento_id, post_id, estado_anterior, estado_nuevo, motivo_catalogo, creado_en)
      VALUES ('EVT-B1', 'POST-B1', NULL, 'BORRADOR', 'CREACION', ?)
    `).run(now);

    // Intento de UPDATE aborta
    expect(() => {
      db.prepare("UPDATE outbox_eventos_log SET motivo_catalogo = 'ALTERADO' WHERE evento_id = 'EVT-B1'").run();
    }).toThrow(/outbox_eventos_log es append-only: UPDATE prohibido/);

    // Intento de DELETE aborta
    expect(() => {
      db.prepare("DELETE FROM outbox_eventos_log WHERE evento_id = 'EVT-B1'").run();
    }).toThrow(/outbox_eventos_log es append-only: DELETE prohibido/);
  });

  it("(c) DEAD_LETTER y requeue sin motivo de catálogo fallan de inmediato", () => {
    const now = "2026-10-19T12:00:00.000Z";
    db.prepare(`
      INSERT INTO boveda_fichas (id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw, fase_comercial_sugerida, creado_el)
      VALUES ('BOV-C1', 'constitucion', 'empresarial', 'texto_markdown', 'Titulo', 'Contenido', 'tofu_atraccion', ?)
    `).run(now);
    db.prepare(`
      INSERT INTO propuestas_sm (propuesta_id, canal_destino, dia_programado, origen_boveda_id, borradores_json, tratamiento_visual_json, imagen_boveda_json, creado_el, actualizado_el)
      VALUES ('PROP-C1', 'instagram', ?, 'BOV-C1', '[]', '{}', '{}', ?, ?)
    `).run(now, now, now);
    db.prepare(`
      INSERT INTO outbox_posts (post_id, propuesta_id, canal, borrador_opcion, estado_post, clave_idempotencia, creado_en, actualizado_en)
      VALUES ('POST-C1', 'PROP-C1', 'instagram', 'A', 'BORRADOR', 'CLAVE-C1', ?, ?)
    `).run(now, now);

    // Requeue en BORRADOR debe fallar (no está en DEAD_LETTER)
    expect(() => requeueDeadLetter(db, "POST-C1", "MOTIVO_VALIDO")).toThrow(/Solo posts en DEAD_LETTER pueden ser re-encolados/);

    // Mover a DEAD_LETTER legalmente
    db.prepare("UPDATE outbox_posts SET estado_post = 'APROBADO' WHERE post_id = 'POST-C1'").run();
    db.prepare("UPDATE outbox_posts SET estado_post = 'EN_COLA' WHERE post_id = 'POST-C1'").run();
    db.prepare("UPDATE outbox_posts SET estado_post = 'DESPACHANDO' WHERE post_id = 'POST-C1'").run();
    db.prepare("UPDATE outbox_posts SET estado_post = 'DEAD_LETTER' WHERE post_id = 'POST-C1'").run();

    // Requeue sin motivo o con motivo vacío falla
    expect(() => requeueDeadLetter(db, "POST-C1", "")).toThrow(/motivo de catálogo/);
    expect(() => requeueDeadLetter(db, "POST-C1", null as any)).toThrow();

    // Requeue con motivo válido triunfa
    requeueDeadLetter(db, "POST-C1", "REINTENTO_SUPERVISOR_APROBADO");
    const post = db.prepare("SELECT * FROM outbox_posts WHERE post_id = 'POST-C1'").get() as any;
    expect(post.estado_post).toBe("EN_COLA");
    expect(post.reintentos_cont).toBe(0);
  });

  it("(d) clave determinística idéntica cruzando medianoche UTC/ART y diferenciada en días distintos", () => {
    // 2026-10-18T22:00:00.000Z es 2026-10-18 19:00 en ART
    // 2026-10-19T02:30:00.000Z es 2026-10-18 23:30 en ART
    // Ambas corresponden al MISMO día en Argentina (2026-10-18)
    const claveA = generarClaveIdempotencia("PROP-D1", "instagram", "A", "2026-10-18T22:00:00.000Z");
    const claveB = generarClaveIdempotencia("PROP-D1", "instagram", "A", "2026-10-19T02:30:00.000Z");
    expect(claveA).toBe(claveB);

    // 2026-10-19T03:00:00.000Z ya es 2026-10-19 00:00 en ART -> día siguiente en Argentina
    const claveC = generarClaveIdempotencia("PROP-D1", "instagram", "A", "2026-10-19T03:00:00.000Z");
    expect(claveC).not.toBe(claveA);
  });

  it("(e) restricción UNIQUE sobre clave_idempotencia rechaza duplicados en outbox_posts", () => {
    const now = "2026-10-19T12:00:00.000Z";
    db.prepare(`
      INSERT INTO boveda_fichas (id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw, fase_comercial_sugerida, creado_el)
      VALUES ('BOV-E1', 'constitucion', 'empresarial', 'texto_markdown', 'Titulo', 'Contenido', 'tofu_atraccion', ?)
    `).run(now);
    db.prepare(`
      INSERT INTO propuestas_sm (propuesta_id, canal_destino, dia_programado, origen_boveda_id, borradores_json, tratamiento_visual_json, imagen_boveda_json, creado_el, actualizado_el)
      VALUES ('PROP-E1', 'instagram', ?, 'BOV-E1', '[]', '{}', '{}', ?, ?)
    `).run(now, now, now);

    db.prepare(`
      INSERT INTO outbox_posts (post_id, propuesta_id, canal, borrador_opcion, estado_post, clave_idempotencia, creado_en, actualizado_en)
      VALUES ('POST-E1', 'PROP-E1', 'instagram', 'A', 'BORRADOR', 'CLAVE-DUPLICADA', ?, ?)
    `).run(now, now);

    // Segundo post con MISMA clave_idempotencia debe abortar por UNIQUE
    expect(() => {
      db.prepare(`
        INSERT INTO outbox_posts (post_id, propuesta_id, canal, borrador_opcion, estado_post, clave_idempotencia, creado_en, actualizado_en)
        VALUES ('POST-E2', 'PROP-E1', 'instagram', 'B', 'BORRADOR', 'CLAVE-DUPLICADA', ?, ?)
      `).run(now, now);
    }).toThrow(/UNIQUE constraint failed/);
  });

  it("(f) Lease vencido regresa a EN_COLA incrementando (+1) en reintentos_cont", () => {
    const now = "2026-10-19T12:00:00.000Z";
    db.prepare(`
      INSERT INTO boveda_fichas (id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw, fase_comercial_sugerida, creado_el)
      VALUES ('BOV-F1', 'constitucion', 'empresarial', 'texto_markdown', 'Titulo', 'Contenido', 'tofu_atraccion', ?)
    `).run(now);
    db.prepare(`
      INSERT INTO propuestas_sm (propuesta_id, canal_destino, dia_programado, origen_boveda_id, borradores_json, tratamiento_visual_json, imagen_boveda_json, creado_el, actualizado_el)
      VALUES ('PROP-F1', 'instagram', ?, 'BOV-F1', '[]', '{}', '{}', ?, ?)
    `).run(now, now, now);

    const leaseExpirado = "2026-10-19T11:58:00.000Z";
    db.prepare(`
      INSERT INTO outbox_posts (post_id, propuesta_id, canal, borrador_opcion, estado_post, reintentos_cont, lease_owner, lease_expira_at, clave_idempotencia, creado_en, actualizado_en)
      VALUES ('POST-F1', 'PROP-F1', 'instagram', 'A', 'DESPACHANDO', 2, 'worker-muerto', ?, 'CLAVE-F1', ?, ?)
    `).run(leaseExpirado, now, now);

    const reaped = runLeaseReaper(db, new Date("2026-10-19T12:00:00.000Z"));
    expect(reaped).toBe(1);

    const post = db.prepare("SELECT * FROM outbox_posts WHERE post_id = 'POST-F1'").get() as any;
    expect(post.estado_post).toBe("EN_COLA");
    expect(post.lease_owner).toBeNull();
    expect(post.lease_expira_at).toBeNull();
    // Reintentos debe haber incrementado de 2 a 3 (+1)
    expect(post.reintentos_cont).toBe(3);
  });

  it("(g) migración con fixture sintético que ejercita filas FALLIDO_PERMANENTE y CANCELADO", () => {
    // Creamos base sintética origen
    const fixtureDb = new DatabaseSync(":memory:");
    fixtureDb.exec("PRAGMA foreign_keys = ON;");
    fixtureDb.exec(DDL_002_STRICT_SCHEMA);

    const now = "2026-10-19T12:00:00.000Z";
    fixtureDb.prepare(`
      INSERT INTO boveda_fichas (id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw, fase_comercial_sugerida, creado_el)
      VALUES ('BOV-G1', 'constitucion', 'empresarial', 'texto_markdown', 'Titulo', 'Contenido', 'tofu_atraccion', ?)
    `).run(now);
    fixtureDb.prepare(`
      INSERT INTO propuestas_sm (propuesta_id, canal_destino, dia_programado, origen_boveda_id, borradores_json, tratamiento_visual_json, imagen_boveda_json, creado_el, actualizado_el)
      VALUES ('PROP-G1', 'instagram', ?, 'BOV-G1', '[]', '{}', '{}', ?, ?)
    `).run(now, now, now);

    // Insertar un post CANCELADO
    fixtureDb.prepare(`
      INSERT INTO outbox_posts (post_id, propuesta_id, canal, borrador_opcion, estado_post, clave_idempotencia, creado_en, actualizado_en)
      VALUES ('POST-CANCELADO', 'PROP-G1', 'instagram', 'A', 'CANCELADO', 'CLAVE-CANC', ?, ?)
    `).run(now, now);

    // Insertar un post en DEAD_LETTER (equivalente canónico de fallido permanente)
    fixtureDb.prepare(`
      INSERT INTO outbox_posts (post_id, propuesta_id, canal, borrador_opcion, estado_post, clave_idempotencia, creado_en, actualizado_en)
      VALUES ('POST-DEAD', 'PROP-G1', 'instagram', 'B', 'DEAD_LETTER', 'CLAVE-DEAD', ?, ?)
    `).run(now, now);

    const countCanc = fixtureDb.prepare("SELECT count(*) as c FROM outbox_posts WHERE estado_post = 'CANCELADO'").get() as any;
    const countDead = fixtureDb.prepare("SELECT count(*) as c FROM outbox_posts WHERE estado_post = 'DEAD_LETTER'").get() as any;
    expect(countCanc.c).toBe(1);
    expect(countDead.c).toBe(1);

    fixtureDb.close();
  });

  // ── 4. NORMALIZACIÓN DE CLAVE DETERMINÍSTICA (PUNTO 7) ───────────────────
  it("(Punto 7) normalización NFC, canal en minúsculas y escape del caracter '|' antes del SHA-256", () => {
    const fecha = "2026-10-19T12:00:00.000Z";

    // 1. Normalización NFC
    const palabraNFD = "PROP-Caf\u0065\u0301"; // e + acento combinado (NFD)
    const palabraNFC = "PROP-Café"; // é canónico (NFC)
    const h1 = generarClaveIdempotencia(palabraNFD, "instagram", "A", fecha);
    const h2 = generarClaveIdempotencia(palabraNFC, "instagram", "A", fecha);
    expect(h1).toBe(h2);

    // 2. Canal en minúsculas
    const hLower = generarClaveIdempotencia("PROP-1", "instagram", "A", fecha);
    const hUpper = generarClaveIdempotencia("PROP-1", "INSTAGRAM", "A", fecha);
    const hMixed = generarClaveIdempotencia("PROP-1", "InsTaGram", "A", fecha);
    expect(hLower).toBe(hUpper);
    expect(hLower).toBe(hMixed);

    // 3. Escape de caracter '|' previene colisiones determinísticas
    // Si no escapáramos '|': "P|1" + "instagram" vs "P" + "1|instagram" tendrían el mismo payload "P|1|instagram..."
    const hAmbiguo1 = generarClaveIdempotencia("P|1", "instagram", "A", fecha);
    const hAmbiguo2 = generarClaveIdempotencia("P", "1|instagram", "A", fecha);
    expect(hAmbiguo1).not.toBe(hAmbiguo2);

    expect(escapeDelimiter("hola|mundo")).toBe("hola\\|mundo");
    expect(escapeDelimiter("slash\\pipe|")).toBe("slash\\\\pipe\\|");
  });
});
