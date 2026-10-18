// src/interfaces/http/__tests__/httpSM.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import { createSMServer } from "../server";
import { SqliteSMRepository } from "../../../infrastructure/sqlite/SqliteSMRepository";
import { SqliteBovedaRepository } from "../../../infrastructure/sqlite/SqliteBovedaRepository";
import { SqlitePropuestaRepository } from "../../../infrastructure/sqlite/SqlitePropuestaRepository";
import { type FichaBovedaDTO, type PropuestaMejoraSMDTO } from "../../../domain/types";

describe("Subfase 1.1: Servidor HTTP Local y Persistencia Soberana en SQLite", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Entorno aislado en memoria
    const smRepo = new SqliteSMRepository(":memory:");
    const bovedaRepo = new SqliteBovedaRepository(":memory:");
    const propuestaRepo = new SqlitePropuestaRepository(":memory:");

    server = createSMServer({ smRepo, bovedaRepo, propuestaRepo });
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
        "Authorization": "Bearer mejora_sm_local_bearer_2026",
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
      canal_destino: "linkedin",
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
        "Authorization": "Bearer mejora_sm_local_bearer_2026",
      },
      body: JSON.stringify(p1),
    });
    expect(resPost.status).toBe(201);

    // Guardrail: publicar directamente desde pendiente_revision debe arrojar 409 Conflict
    const resPublishInvalido = await fetch(`${baseUrl}/api/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer mejora_sm_local_bearer_2026",
      },
      body: JSON.stringify({ id: "PROP-E2E-01" }),
    });
    expect(resPublishInvalido.status).toBe(409);

    // Aprobar lote completo
    const resAprobarLote = await fetch(`${baseUrl}/api/propuestas/aprobar-lote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer mejora_sm_local_bearer_2026",
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

    // Publicar ahora sí debe ser exitoso (200 OK)
    const resPublishOk = await fetch(`${baseUrl}/api/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer mejora_sm_local_bearer_2026",
      },
      body: JSON.stringify({ id: "PROP-E2E-01" }),
    });
    expect(resPublishOk.status).toBe(200);

    // Guardrail: revertir a aprobado una propuesta ya publicada debe arrojar 409 Conflict
    const resRevertir = await fetch(`${baseUrl}/api/propuestas/PROP-E2E-01/aprobar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer mejora_sm_local_bearer_2026",
      },
    });
    expect(resRevertir.status).toBe(409);
  });

  it("genera la grilla de 26 semanas y la persiste en base de datos en una llamada", async () => {
    const resGrilla = await fetch(`${baseUrl}/api/propuestas/generar-grilla`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer mejora_sm_local_bearer_2026",
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
});
