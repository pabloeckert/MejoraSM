// src/infrastructure/sqlite/__tests__/nucleoV2.test.ts
// Núcleo mínimo V2: DDL estricto, CRM de prospectos, máquina de estados, outbox e idempotencia.
import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { CREATE_TABLES_SQL } from "../schema";
import { SqliteProspectoRepository, ProspectoNoEncontradoError } from "../SqliteProspectoRepository";
import { SqliteOutboxRepository } from "../SqliteOutboxRepository";
import { SqlitePropuestaRepository } from "../SqlitePropuestaRepository";
import {
  ESTADOS_PROSPECTO,
  TRANSICIONES_PERMITIDAS,
  TransicionInvalidaError,
  puedeTransicionar,
} from "../../../domain/prospectoStateMachine";
import { generarClaveIdempotencia } from "../../../domain/outbox";
import type { PropuestaMejoraSMDTO } from "../../../domain/types";

function nuevaDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(CREATE_TABLES_SQL);
  return db;
}

const LEAD = { email: "Ana@Empresa.com", nombre: "Ana", pieza_id_atribucion: "PZ-2026-001", origen_utm: "linkedin/social/q4" };

function propuesta(id: string): PropuestaMejoraSMDTO {
  const borrador = (opcion: "A" | "B" | "C") => ({
    opcion,
    tipo_formato: "post_directo",
    estrategia: "jab_educativo",
    titulo_portada: `T${opcion}`,
    cuerpo_texto: "c",
    copy_tres_pasos: { paso1_dolor: "1", paso2_reencuadre: "2", paso3_direccion_web: "3" },
    cta_texto: "cta",
  });
  return {
    propuesta_id: id,
    canal_destino: "linkedin",
    dia_programado: "2026-10-18T10:00:00.000Z",
    origen_boveda_id: "BOV-1",
    borradores: [borrador("A"), borrador("B"), borrador("C")],
    borrador_seleccionado: "B",
    tratamiento_visual: { marco_expandido_requerido: false, color_fondo_marco: "#FFFFFF", regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo", relacion_aspecto_destino: "4:5" },
    imagen_boveda_vinculada: { id: "i", ruta_archivo_local: "/x.jpg" },
    estado: "pendiente_revision",
  } as unknown as PropuestaMejoraSMDTO;
}

describe("DDL V2 estricto", () => {
  let db: DatabaseSync;
  beforeEach(() => { db = nuevaDb(); });

  it("crea las 3 tablas y los 3 índices de alta velocidad", () => {
    const nombres = (tipo: string) =>
      (db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all(tipo) as { name: string }[]).map((r) => r.name);
    expect(nombres("table")).toEqual(expect.arrayContaining(["prospectos", "prospecto_eventos_log", "outbox_posts"]));
    expect(nombres("index")).toEqual(
      expect.arrayContaining(["idx_prospectos_email", "idx_prospectos_estado_sla", "idx_outbox_estado_reintento"])
    );
  });

  it("CHECK rechaza estados fuera de los 8 de prospecto y de los 8 de outbox", () => {
    const t = "2026-10-18T00:00:00.000Z";
    expect(() =>
      db.prepare("INSERT INTO prospectos (prospecto_id,email,nombre,estado,pieza_id_atribucion,fecha_captura,fecha_actualizacion,sla_limite_calificacion) VALUES ('p','a@b.co','n','INVENTADO','z',?,?,?)").run(t, t, t)
    ).toThrow(/CHECK/i);
    expect(() =>
      db.prepare("INSERT INTO outbox_posts (post_id,propuesta_id,canal,borrador_opcion,estado_post,clave_idempotencia,creado_en,actualizado_en) VALUES ('o','p','c','A','XX','k',?,?)").run(t, t)
    ).toThrow(/CHECK/i);
  });

  it("email UNIQUE y clave_idempotencia UNIQUE", () => {
    const repo = new SqliteProspectoRepository(db);
    repo.capturarLead(LEAD);
    const t = "2026-10-18T00:00:00.000Z";
    expect(() =>
      db.prepare("INSERT INTO prospectos (prospecto_id,email,nombre,pieza_id_atribucion,fecha_captura,fecha_actualizacion,sla_limite_calificacion) VALUES ('x','ana@empresa.com','n','z',?,?,?)").run(t, t, t)
    ).toThrow(/UNIQUE/i);
  });

  it("prospecto_eventos_log es append-only (UPDATE y DELETE abortan)", () => {
    const repo = new SqliteProspectoRepository(db);
    const { prospecto } = repo.capturarLead(LEAD);
    expect(() => db.prepare("UPDATE prospecto_eventos_log SET estado_nuevo = 'CALIFICADO'").run()).toThrow(/append-only/);
    expect(() => db.prepare("DELETE FROM prospecto_eventos_log WHERE prospecto_id = ?").run(prospecto.prospecto_id)).toThrow(/append-only/);
  });
});

describe("Máquina de estados declarativa (8 estados)", () => {
  it("las 64 combinaciones coinciden exactamente con la tabla declarativa", () => {
    for (const d of ESTADOS_PROSPECTO) {
      for (const h of ESTADOS_PROSPECTO) {
        expect(puedeTransicionar(d, h)).toBe(TRANSICIONES_PERMITIDAS[d].includes(h));
      }
    }
    expect(ESTADOS_PROSPECTO).toHaveLength(8);
    expect(TRANSICIONES_PERMITIDAS.CERRADO_GANADO).toEqual([]);
  });
});

describe("SqliteProspectoRepository: captura, SLA y auditoría", () => {
  let repo: SqliteProspectoRepository;
  beforeEach(() => { repo = new SqliteProspectoRepository(nuevaDb()); });

  it("captura con SLA de 48 h, email normalizado, atribución y evento inicial", () => {
    const t0 = new Date("2026-10-18T12:00:00.000Z");
    const { prospecto, creado } = repo.capturarLead(LEAD, t0);
    expect(creado).toBe(true);
    expect(prospecto.email).toBe("ana@empresa.com");
    expect(prospecto.estado).toBe("CAPTURADO");
    expect(prospecto.pieza_id_atribucion).toBe("PZ-2026-001");
    expect(prospecto.sla_limite_calificacion).toBe("2026-10-20T12:00:00.000Z");
    const eventos = repo.listarEventos(prospecto.prospecto_id);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ estado_anterior: null, estado_nuevo: "CAPTURADO" });
  });

  it("es idempotente por email (no duplica ni muta)", () => {
    const a = repo.capturarLead(LEAD);
    const b = repo.capturarLead({ ...LEAD, nombre: "Otro", pieza_id_atribucion: "PZ-OTRA" });
    expect(b.creado).toBe(false);
    expect(b.prospecto.prospecto_id).toBe(a.prospecto.prospecto_id);
    expect(b.prospecto.pieza_id_atribucion).toBe("PZ-2026-001");
  });

  it("transición válida registra evento; inválida lanza y NO deja rastro (atomicidad)", () => {
    const { prospecto } = repo.capturarLead(LEAD);
    const id = prospecto.prospecto_id;
    repo.transicionar(id, "CALIFICADO", { perfil_detectado_id: "BP-CEO" });
    expect(() => repo.transicionar(id, "CERRADO_GANADO")).toThrow(TransicionInvalidaError);
    expect(repo.obtenerPorId(id)?.estado).toBe("CALIFICADO");
    const eventos = repo.listarEventos(id);
    expect(eventos.map((e) => e.estado_nuevo)).toEqual(["CAPTURADO", "CALIFICADO"]);
    expect(repo.obtenerPorId(id)?.perfil_detectado_id).toBe("BP-CEO");
  });

  it("DESCARTADO exige motivo de catálogo y lo persiste; REACTIVADO es posible después", () => {
    const { prospecto } = repo.capturarLead(LEAD);
    const id = prospecto.prospecto_id;
    expect(() => repo.transicionar(id, "DESCARTADO")).toThrow(/motivo_catalogo/);
    repo.transicionar(id, "DESCARTADO", { motivo_catalogo: "FUERA_DE_PERFIL" });
    expect(repo.obtenerPorId(id)?.motivo_descarte_id).toBe("FUERA_DE_PERFIL");
    repo.transicionar(id, "REACTIVADO");
    expect(repo.listarEventos(id)).toHaveLength(3);
  });

  it("prospecto inexistente => ProspectoNoEncontradoError; listarSlaVencidos detecta SLA vencido", () => {
    expect(() => repo.transicionar("no-existe", "CALIFICADO")).toThrow(ProspectoNoEncontradoError);
    repo.capturarLead(LEAD, new Date("2026-10-10T00:00:00.000Z"));
    expect(repo.listarSlaVencidos(new Date("2026-10-18T00:00:00.000Z"))).toHaveLength(1);
    expect(repo.listarSlaVencidos(new Date("2026-10-11T00:00:00.000Z"))).toHaveLength(0);
  });
});

describe("Outbox transaccional e idempotencia", () => {
  let db: DatabaseSync;
  let propuestas: SqlitePropuestaRepository;
  let outbox: SqliteOutboxRepository;
  beforeEach(() => {
    db = nuevaDb();
    propuestas = new SqlitePropuestaRepository(db);
    outbox = new SqliteOutboxRepository(db);
  });

  it("clave de idempotencia determinista: propuesta+canal+borrador+día", () => {
    const d1 = new Date("2026-10-18T12:00:00Z");
    const d2 = new Date("2026-10-18T23:00:00Z");
    const d3 = new Date("2026-10-19T12:00:00Z");
    const k = generarClaveIdempotencia("P1", "linkedin", "B", d1);
    expect(k).toMatch(/^[0-9a-f]{64}$/);
    expect(generarClaveIdempotencia("P1", "linkedin", "B", d2)).toBe(k);
    expect(generarClaveIdempotencia("P1", "linkedin", "B", d3)).not.toBe(k);
    expect(generarClaveIdempotencia("P1", "linkedin", "A", d1)).not.toBe(k);
    expect(generarClaveIdempotencia("P1", "instagram", "B", d1)).not.toBe(k);
  });

  it("aprobarLote encola un post APROBADO por propuesta en la misma transacción", () => {
    propuestas.guardarLote([propuesta("P1"), propuesta("P2")]);
    expect(propuestas.aprobarLote(["P1", "P2"])).toBe(2);
    const p1 = outbox.listarPorPropuesta("P1");
    expect(p1).toHaveLength(1);
    expect(p1[0]).toMatchObject({ estado_post: "APROBADO", canal: "linkedin", borrador_opcion: "B", reintentos_cont: 0 });
  });

  it("encolar dos veces el mismo día no duplica (INSERT OR IGNORE sobre clave UNIQUE)", () => {
    const t = new Date("2026-10-18T10:00:00Z");
    expect(outbox.encolarAprobado({ propuesta_id: "P9", canal: "linkedin", borrador_opcion: "A" }, t)).toBe(true);
    expect(outbox.encolarAprobado({ propuesta_id: "P9", canal: "linkedin", borrador_opcion: "A" }, t)).toBe(false);
    expect(outbox.listarPorPropuesta("P9")).toHaveLength(1);
  });

  it("las mutaciones en lote usan BEGIN IMMEDIATE y nunca BEGIN TRANSACTION (anti SQLITE_BUSY)", () => {
    const sentencias: string[] = [];
    const exec = db.exec.bind(db);
    db.exec = (sql: string) => { sentencias.push(sql.trim()); return exec(sql); };
    propuestas.guardarLote([propuesta("P1")]);
    propuestas.aprobarLote(["P1"]);
    expect(sentencias.filter((s) => s.startsWith("BEGIN"))).toEqual(["BEGIN IMMEDIATE;", "BEGIN IMMEDIATE;"]);
    expect(sentencias.filter((s) => s.startsWith("COMMIT"))).toHaveLength(2);
  });

  it("rollback: si falla una propuesta del lote no queda ningún post huérfano", () => {
    propuestas.guardarLote([propuesta("P1")]);
    const original = outbox.encolarAprobado.bind(outbox);
    let n = 0;
    (propuestas as unknown as { outbox: SqliteOutboxRepository }).outbox.encolarAprobado = (i, t) => {
      if (++n === 1) throw new Error("fallo simulado");
      return original(i, t);
    };
    expect(() => propuestas.aprobarLote(["P1"])).toThrow(/fallo simulado/);
    expect(outbox.listarPorPropuesta("P1")).toHaveLength(0);
    expect(propuestas.obtenerPorId("P1")?.estado).toBe("pendiente_revision");
  });
});
