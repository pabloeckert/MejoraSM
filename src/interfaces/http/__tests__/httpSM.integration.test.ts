// src/interfaces/http/__tests__/httpSM.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import { createSMServer } from "../server";
import { SqliteSMRepository } from "../../../infrastructure/sqlite/SqliteSMRepository";
import { SqliteBovedaRepository } from "../../../infrastructure/sqlite/SqliteBovedaRepository";
import { SqlitePropuestaRepository } from "../../../infrastructure/sqlite/SqlitePropuestaRepository";
import { defaultTokenManager } from "../security";
import { type FichaBovedaDTO, type PropuestaMejoraSMDTO } from "../../../domain/types";

describe("Subfase 1.1: Servidor HTTP Local y Persistencia Soberana en SQLite", () => {
  let server: Server;
  let baseUrl: string;
  let propuestaRepo: SqlitePropuestaRepository;
  const authHeader = `Bearer ${defaultTokenManager.getPrimaryToken()}`;

  beforeAll(async () => {
    // Entorno aislado en memoria
    const smRepo = new SqliteSMRepository(":memory:");
    const bovedaRepo = new SqliteBovedaRepository(":memory:");
    propuestaRepo = new SqlitePropuestaRepository(":memory:");

    server = createSMServer({ smRepo, bovedaRepo, propuestaRepo, outboxRepo: propuestaRepo.getOutboxRepo() });
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://localhost:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("responde 200 OK en /health indicando modo local_soberano", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.module).toBe("MejoraSM");
    expect(data.mode).toBe("local_soberano");
  });

  it("permite insertar y consultar fichas de Bóveda respetando las 4 capas", async () => {
    const ficha: FichaBovedaDTO = {
      id: "BOV-E2E-001",
      origen_carpeta: "constitucion",
      dimension: "empresarial",
      tipo_activo: "texto_markdown",
      titulo: "Manifiesto de Marca 2026",
      contenido_raw: "Regla irreductible: Nunca a la persona, foco en el proceso.",
      fase_comercial_sugerida: "tofu_atraccion",
      creado_el: new Date().toISOString(),
    };

    const resPost = await fetch(`${baseUrl}/api/boveda/fichas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(ficha),
    });
    expect(resPost.status).toBe(201);

    const resGet = await fetch(`${baseUrl}/api/boveda/fichas/BOV-E2E-001`);
    expect(resGet.status).toBe(200);
    const dataGet = await resGet.json();
    expect(dataGet.id).toBe("BOV-E2E-001");
    expect(dataGet.origen_carpeta).toBe("constitucion");
    expect(dataGet.titulo).toBe("Manifiesto de Marca 2026");
  });

  it("rechaza mutaciones POST sin Authorization Bearer con 401 Unauthorized", async () => {
    const resSinAuth = await fetch(`${baseUrl}/api/propuestas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(resSinAuth.status).toBe(401);
    const err = await resSinAuth.json();
    expect(err.error).toContain("No autorizado");
  });

  it("permite registrar propuestas, consultar listado y aprobar lote completo", async () => {
    const p1: PropuestaMejoraSMDTO = {
      propuesta_id: "PROP-E2E-01",
      canal_destino: "instagram",
      dia_programado: "2026-10-20T09:30:00.000Z",
      origen_boveda_id: "BOV-E2E-001",
      borradores: [
        {
          opcion: "A",
          tipo_formato: "carrusel_pdf",
          estrategia: "jab_educativo",
          titulo_portada: "Liderazgo Directivo",
          cuerpo_texto: "Texto",
          copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
          cta_texto: "CTA",
        },
        {
          opcion: "B",
          tipo_formato: "post_autoridad",
          estrategia: "networking_prueba_social",
          titulo_portada: "Autoridad B",
          cuerpo_texto: "Texto B",
          copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
          cta_texto: "CTA",
        },
        {
          opcion: "C",
          tipo_formato: "post_directo",
          estrategia: "right_hook_conversion",
          titulo_portada: "Diagnóstico C",
          cuerpo_texto: "Texto C",
          copy_tres_pasos: { paso1_dolor: "D", paso2_reencuadre: "R", paso3_direccion_web: "W" },
          cta_texto: "CTA",
        },
      ],
      borrador_seleccionado: "A",
      tratamiento_visual: {
        marco_expandido_requerido: true,
        color_fondo_marco: "#FFFFFF",
        regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
        relacion_aspecto_destino: "4:5",
      },
      imagen_boveda_vinculada: { id: "BOV-E2E-001", ruta_archivo_local: "test.jpg" },
      estado: "pendiente_revision",
    };

    const resPost = await fetch(`${baseUrl}/api/propuestas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(p1),
    });
    expect(resPost.status).toBe(201);

    // Guardrail: publicar directamente desde pendiente_revision debe arrojar 409 Conflict
    const resPublishInvalido = await fetch(`${baseUrl}/api/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({ id: "PROP-E2E-01" }),
    });
    expect(resPublishInvalido.status).toBe(409);

    // Aprobar lote completo
    const resAprobarLote = await fetch(`${baseUrl}/api/propuestas/aprobar-lote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({ ids: ["PROP-E2E-01"] }),
    });
    expect(resAprobarLote.status).toBe(200);
    const dataLote = await resAprobarLote.json();
    expect(dataLote.modificadas).toBe(1);

    // Verificar estado aprobado
    const resGetProp = await fetch(`${baseUrl}/api/propuestas/PROP-E2E-01`);
    expect(resGetProp.status).toBe(200);
    const dataProp = await resGetProp.json();
    expect(dataProp.estado).toBe("aprobado");

    // Publicar ahora encola en outbox_posts y responde 202 Accepted
    const resPublishOk = await fetch(`${baseUrl}/api/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({ id: "PROP-E2E-01" }),
    });
    expect(resPublishOk.status).toBe(202);
    const dataPublish = await resPublishOk.json();
    expect(dataPublish.estado).toBe("EN_COLA");
    expect(dataPublish.clave_idempotencia).toBeDefined();

    // Simular que el worker ejecuta la publicación final
    propuestaRepo.publicar("PROP-E2E-01");

    // Guardrail: revertir a aprobado una propuesta ya publicada debe arrojar 409 Conflict
    const resRevertir = await fetch(`${baseUrl}/api/propuestas/PROP-E2E-01/aprobar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
    });
    expect(resRevertir.status).toBe(409);
  });

  it("genera la grilla de 26 semanas y la persiste en base de datos en una llamada", async () => {
    const resGrilla = await fetch(`${baseUrl}/api/propuestas/generar-grilla`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({ fechaInicio: "2026-10-19T00:00:00.000Z", guardarEnDb: true }),
    });

    expect(resGrilla.status).toBe(200);
    const dataGrilla = await resGrilla.json();
    expect(dataGrilla.total_semanas).toBe(26);
    expect(dataGrilla.total_piezas).toBe(78);
    expect(dataGrilla.jabs_totales).toBe(63);
    expect(dataGrilla.right_hooks_totales).toBe(15);

    // Verificar que se listan propuestas persistidas
    const resLista = await fetch(`${baseUrl}/api/propuestas`);
    const lista = await resLista.json();
    expect(lista.length).toBeGreaterThanOrEqual(78);
  });
  it("Fase 2: /api/posts soporta limit y offset para paginación y cabecera ETag fuerte", async () => {
    // 1. Paginación: limit=5
    const resPaginada = await fetch(`${baseUrl}/api/posts?limit=5&offset=0`);
    expect(resPaginada.status).toBe(200);
    const dataPaginada = await resPaginada.json();
    expect(dataPaginada.length).toBe(5);

    // 2. Presencia de ETag
    const etag = resPaginada.headers.get("etag");
    expect(etag).toBeDefined();
    expect(etag).toMatch(/^"[a-f0-9]+"/);

    // 3. Validación de If-None-Match y 304 Not Modified
    const resCache = await fetch(`${baseUrl}/api/posts?limit=5&offset=0`, {
      headers: { "If-None-Match": etag! },
    });
    expect(resCache.status).toBe(304);

    // 4. Offset: limit=5&offset=5 entrega piezas diferentes
    const resOffset = await fetch(`${baseUrl}/api/posts?limit=5&offset=5`);
    expect(resOffset.status).toBe(200);
    const dataOffset = await resOffset.json();
    expect(dataOffset.length).toBe(5);
    expect(dataOffset[0].propuesta_id).not.toBe(dataPaginada[0].propuesta_id);
  });

  it("Fase 2: CORS restringe a whitelist local y nunca devuelve '*'", async () => {
    // Petición con Origin en whitelist
    const resCors = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "http://localhost:4015" },
    });
    expect(resCors.headers.get("access-control-allow-origin")).toBe("http://localhost:4015");

    // Preflight OPTIONS nunca debe devolver '*'
    const resOptions = await fetch(`${baseUrl}/api/posts`, {
      method: "OPTIONS",
      headers: { Origin: "http://127.0.0.1:4002" },
    });
    expect(resOptions.status).toBe(204);
    expect(resOptions.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:4002");
  });

});
