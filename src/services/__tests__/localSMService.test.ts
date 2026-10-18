// src/services/__tests__/localSMService.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getLocalProposals,
  saveLocalProposals,
  updateLocalProposal,
  approveLocalProposal,
  publishLocalProposal,
  LOCAL_HTTP_BASE,
  LOCAL_AUTH_BEARER,
} from "../localSMService";

describe("localSMService (Remediación P0: Seguridad, Resiliencia y Fidelidad de Datos)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("FE-01: updateLocalProposal mapea hook, body y cta explícitamente a copy_tres_pasos", () => {
    const proposals = getLocalProposals();
    const target = proposals[0];
    const targetId = target.propuesta_id;

    const updated = updateLocalProposal(targetId, {
      title: "Nuevo Título Directivo",
      hook: "Gancho de dolor actualizado",
      body: "Reencuadre estratégico actualizado",
      cta: "mejoraok.com/nuevo-cta",
    });

    const modified = updated.find((p) => p.propuesta_id === targetId);
    expect(modified).toBeDefined();

    const borradorA = modified!.borradores.find((b) => b.opcion === "A");
    expect(borradorA?.titulo_portada).toBe("Nuevo Título Directivo");
    expect(borradorA?.copy_tres_pasos.paso1_dolor).toBe("Gancho de dolor actualizado");
    expect(borradorA?.copy_tres_pasos.paso2_reencuadre).toBe("Reencuadre estratégico actualizado");
    expect(borradorA?.copy_tres_pasos.paso3_direccion_web).toBe("mejoraok.com/nuevo-cta");
    expect(borradorA?.cuerpo_texto).toBe("Reencuadre estratégico actualizado");
    expect(borradorA?.cta_texto).toBe("mejoraok.com/nuevo-cta");
  });

  it("FE-04: getLocalProposals respalda raw payload en mejora_sm_proposals_corrupted_backup_* si el JSON está corrupto", () => {
    const corruptedJson = "{ id: 123, invalid_json: ";
    localStorage.setItem("mejora_sm_local_proposals_v2", corruptedJson);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const proposals = getLocalProposals();
    expect(proposals.length).toBe(78); // Grilla regenerada limpia

    // Verificar que se creó la clave de backup con el contenido corrupto
    const keys = Object.keys(localStorage);
    const backupKey = keys.find((k) => k.startsWith("mejora_sm_proposals_corrupted_backup_"));
    expect(backupKey).toBeDefined();
    expect(localStorage.getItem(backupKey!)).toBe(corruptedJson);

    warnSpy.mockRestore();
  });

  it("DOM-01: approveLocalProposal bloquea la reversión de una propuesta ya publicada", () => {
    const proposals = getLocalProposals();
    const targetId = proposals[0].propuesta_id;

    // Simular que fue aprobada y luego publicada
    approveLocalProposal(targetId);
    publishLocalProposal(targetId);

    const afterPublish = getLocalProposals().find((p) => p.propuesta_id === targetId);
    expect(afterPublish?.estado).toBe("publicado");

    // Intentar revertir con approveLocalProposal
    const result = approveLocalProposal(targetId);
    const afterAttempt = result.find((p) => p.propuesta_id === targetId);
    expect(afterAttempt?.estado).toBe("publicado"); // Debe permanecer publicado
  });

  it("DOM-01: publishLocalProposal bloquea la publicación de una propuesta pendiente_revision", () => {
    const proposals = getLocalProposals();
    const targetId = proposals[1].propuesta_id;
    expect(proposals[1].estado).toBe("pendiente_revision");

    // Intentar publicar directamente sin aprobación
    const result = publishLocalProposal(targetId);
    const targetAfter = result.find((p) => p.propuesta_id === targetId);
    expect(targetAfter?.estado).toBe("pendiente_revision"); // No debe mutar a publicado
  });

  it("SEC-02 e INT-01: syncMutationToBackend utiliza la base 4002 y envía Bearer token", async () => {
    let sentHeaders: any = {};
    let sentUrl = "";

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      sentUrl = url;
      sentHeaders = init.headers;
      return { ok: true, json: async () => ({ success: true }) };
    });

    vi.stubGlobal("fetch", mockFetch);

    const proposals = getLocalProposals();
    const targetId = proposals[2].propuesta_id;
    approveLocalProposal(targetId);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(sentUrl).toBe(`${LOCAL_HTTP_BASE}/api/approve`);
    expect(sentHeaders["Authorization"]).toBe(`Bearer ${LOCAL_AUTH_BEARER}`);
  });
});
