// src/infrastructure/sqlite/SqliteBovedaRepository.ts
import { DatabaseSync } from "node:sqlite";
import { createDatabaseConnection } from "./connectionFactory";
import { type FichaBovedaDTO, type DimensionMC, type FaseComercial } from "../../domain/types";

interface FichaBovedaRow {
  id: string;
  origen_carpeta: string;
  dimension: string;
  tipo_activo: string;
  titulo: string;
  contenido_raw: string;
  metadatos_multimedia: string | null;
  fase_comercial_sugerida: string;
  creado_el: string;
}

export class SqliteBovedaRepository {
  private db: DatabaseSync;

  constructor(dbOrPath: DatabaseSync | string = "data/mejora_sm.db") {
    if (typeof dbOrPath === "string") {
      this.db = createDatabaseConnection(dbOrPath);
    } else {
      this.db = dbOrPath;
    }
  }

  public guardar(ficha: FichaBovedaDTO): void {
    const stmt = this.db.prepare(`
      INSERT INTO boveda_fichas (
        id, origen_carpeta, dimension, tipo_activo, titulo, contenido_raw,
        metadatos_multimedia, fase_comercial_sugerida, creado_el
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        origen_carpeta = excluded.origen_carpeta,
        dimension = excluded.dimension,
        tipo_activo = excluded.tipo_activo,
        titulo = excluded.titulo,
        contenido_raw = excluded.contenido_raw,
        metadatos_multimedia = excluded.metadatos_multimedia,
        fase_comercial_sugerida = excluded.fase_comercial_sugerida;
    `);

    stmt.run(
      ficha.id,
      ficha.origen_carpeta,
      ficha.dimension,
      ficha.tipo_activo,
      ficha.titulo,
      ficha.contenido_raw,
      ficha.metadatos_multimedia ? JSON.stringify(ficha.metadatos_multimedia) : null,
      ficha.fase_comercial_sugerida,
      ficha.creado_el
    );
  }

  public obtenerPorId(id: string): FichaBovedaDTO | null {
    const stmt = this.db.prepare("SELECT * FROM boveda_fichas WHERE id = ?");
    const row = stmt.get(id) as FichaBovedaRow | undefined;
    if (!row) return null;

    return {
      id: row.id,
      origen_carpeta: row.origen_carpeta as FichaBovedaDTO["origen_carpeta"],
      dimension: row.dimension as DimensionMC,
      tipo_activo: row.tipo_activo as FichaBovedaDTO["tipo_activo"],
      titulo: row.titulo,
      contenido_raw: row.contenido_raw,
      metadatos_multimedia: row.metadatos_multimedia ? JSON.parse(row.metadatos_multimedia) : undefined,
      fase_comercial_sugerida: row.fase_comercial_sugerida as FaseComercial,
      creado_el: row.creado_el,
    };
  }

  public listar(filtro?: { dimension?: DimensionMC; origen_carpeta?: string }): FichaBovedaDTO[] {
    let query = "SELECT * FROM boveda_fichas WHERE 1=1";
    const params: string[] = [];

    if (filtro?.dimension) {
      query += " AND dimension = ?";
      params.push(filtro.dimension);
    }
    if (filtro?.origen_carpeta) {
      query += " AND origen_carpeta = ?";
      params.push(filtro.origen_carpeta);
    }
    query += " ORDER BY creado_el DESC";

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as unknown as FichaBovedaRow[];

    return rows.map((row) => ({
      id: row.id,
      origen_carpeta: row.origen_carpeta as FichaBovedaDTO["origen_carpeta"],
      dimension: row.dimension as DimensionMC,
      tipo_activo: row.tipo_activo as FichaBovedaDTO["tipo_activo"],
      titulo: row.titulo,
      contenido_raw: row.contenido_raw,
      metadatos_multimedia: row.metadatos_multimedia ? JSON.parse(row.metadatos_multimedia) : undefined,
      fase_comercial_sugerida: row.fase_comercial_sugerida as FaseComercial,
      creado_el: row.creado_el,
    }));
  }

  public eliminar(id: string): boolean {
    const stmt = this.db.prepare("DELETE FROM boveda_fichas WHERE id = ?");
    const res = stmt.run(id);
    return Number(res.changes || 0) > 0;
  }

  public contarPorCapa(): Record<string, number> {
    const stmt = this.db.prepare(`
      SELECT origen_carpeta, COUNT(*) as cantidad
      FROM boveda_fichas
      GROUP BY origen_carpeta
    `);
    const rows = stmt.all() as unknown as Array<{ origen_carpeta: string; cantidad: number }>;
    const result: Record<string, number> = {
      constitucion: 0,
      autoridad: 0,
      experiencia: 0,
      networking_y_autoridad: 0,
    };
    for (const r of rows) {
      result[r.origen_carpeta] = Number(r.cantidad);
    }
    return result;
  }

  public insertarOActualizarFicha(ficha: FichaBovedaDTO): void {
    this.guardar(ficha);
  }

  public listarFichas(filtro?: { dimension?: DimensionMC; origen_carpeta?: string }): FichaBovedaDTO[] {
    return this.listar(filtro);
  }

  public obtenerFichaPorId(id: string): FichaBovedaDTO | null {
    return this.obtenerPorId(id);
  }

  public close(): void {
    this.db.close();
  }
}

