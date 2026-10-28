// src/services/localSMService.ts
// SERVICIO DE DATOS LOCAL SOBERANO PARA MejoraSM (2026)
// Provee persistencia offline reactiva basada en la grilla evergreen canónica de 26 semanas
// y en la base local SQLite, garantizando funcionalidad completa sin Supabase.

import {
  generarGrillaEvergreen26Semanas,
} from "@/domain/gridGenerator";
import {
  PropuestaMejoraSMDTO,
  BorradorPropuestaDTO,
  OpcionBorrador,
  CopyCalibradoTresPasos,
  CopyCalibradoCuatroPasos,
  generarPaqueteMulticanal,
  toCanonicalPropuesta,
} from "@/domain/types";
import type { ProposalDetail } from "@/components/ProposalDetailDialog";

const STORAGE_KEY_PROPOSALS = "mejora_sm_local_proposals_v2";

/**
 * Mapea una propuesta canónica de la Fase 1 al formato ProposalDetail
 * para interoperabilidad total con componentes legacy (Dashboard, Propuestas, Calendario).
 */
export function toLegacyProposal(p: PropuestaMejoraSMDTO): ProposalDetail {
  const selDraft = p.borradores?.find((b) => b.opcion === p.borrador_seleccionado) || p.borradores?.[0];
  const statusMap: Record<string, string> = {
    pendiente_revision: "pending",
    aprobado: "scheduled",
    publicado: "published",
    rechazado: "rejected",
  };
  const copy4 = (selDraft as { copy_cuatro_pasos?: CopyCalibradoCuatroPasos } | undefined)?.copy_cuatro_pasos;
  const copy3 = selDraft?.copy_tres_pasos;
  const bodyText = copy4
    ? `${copy4.paso1_dolor}\n\n${copy4.paso2_reencuadre}\n\n${copy4.paso3_engagement_nativo}${copy4.paso4_conversion_lead ? `\n\n${copy4.paso4_conversion_lead}` : ""}`
    : copy3
    ? `${copy3.paso1_dolor}\n\n${copy3.paso2_reencuadre}\n\n${copy3.paso3_direccion_web}`
    : (selDraft?.cuerpo_texto || null);

  return {
    id: p.propuesta_id,
    propuesta_id: p.propuesta_id,
    title: selDraft?.titulo_portada || p.propuesta_id,
    hook: copy4?.paso1_dolor || copy3?.paso1_dolor || null,
    body: bodyText,
    cta: copy4?.paso4_conversion_lead || copy4?.paso3_engagement_nativo || selDraft?.cta_texto || copy3?.paso3_direccion_web || null,
    hashtags: ["#MejoraContinua", "#EstrategiaEmpresarial", "#Liderazgo"],
    format: "post",
    status: statusMap[p.estado] || "pending",
    rejection_reason: p.motivo_rechazo || null,
    scheduled_at: p.dia_programado,
    published_at: p.estado === "publicado" ? p.dia_programado : null,
    created_at: p.dia_programado,
    oferta: null,
    zernio_post_id: null,
    rendered_image_path: p.imagen_boveda_vinculada?.ruta_archivo_local || null,
    is_test: false,
    dialogue_sessions: { topic: p.metricas_atribucion?.buyer_persona_predominante || "General" },
    borradores: p.borradores,
    borrador_seleccionado: p.borrador_seleccionado,
    tratamiento_visual: p.tratamiento_visual,
    imagen_boveda_vinculada: p.imagen_boveda_vinculada,
    buyer_persona: p.metricas_atribucion?.buyer_persona_predominante || "orden_para_crecer",
    dimension: "empresarial",
  };
}

/**
 * Devuelve todas las propuestas locales convertidas a ProposalDetail.
 */
export function getLocalProposalsAsLegacy(): ProposalDetail[] {
  return getLocalProposals().map(toLegacyProposal);
}

/**
 * Inicializa y devuelve la colección canónica de propuestas en memoria/localStorage.
 */
export function getLocalProposals(): PropuestaMejoraSMDTO[] {
  let raw: string | null = null;
  try {
    raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY_PROPOSALS) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => toCanonicalPropuesta(p));
      }
      // Si parsed no es un array válido no vacío, se considera estructura corrupta
      if (typeof localStorage !== "undefined") {
        const backupKey = `mejora_sm_proposals_corrupted_backup_${Date.now()}`;
        try {
          localStorage.setItem(backupKey, raw);
          console.warn(`[localSMService] Contenido inválido en localStorage respaldado en '${backupKey}'`);
        } catch {
          // ignore storage quota error
        }
      }
    }
  } catch (err) {
    if (raw && typeof localStorage !== "undefined") {
      const backupKey = `mejora_sm_proposals_corrupted_backup_${Date.now()}`;
      try {
        localStorage.setItem(backupKey, raw);
        console.warn(`[localSMService] JSON corrupto respaldado en '${backupKey}'`);
      } catch {
        // ignore storage quota error
      }
    }
    console.warn("[localSMService] Error leyendo localStorage, regenerando grilla:", err);
  }

  // Generar la grilla evergreen canónica de 26 semanas (78 piezas balanceadas 80/20)
  const fechaInicio = new Date("2026-10-19T09:30:00.000Z");
  const grilla = generarGrillaEvergreen26Semanas(fechaInicio);

  const flatList: PropuestaMejoraSMDTO[] = [];
  for (const sem of grilla.semanas) {
    for (const prop of sem.propuestas) {
      flatList.push(prop);
    }
  }

  saveLocalProposals(flatList);
  return flatList;
}

/**
 * Guarda el conjunto de propuestas en localStorage de forma atómica.
 */
export function saveLocalProposals(proposals: PropuestaMejoraSMDTO[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROPOSALS, JSON.stringify(proposals));
  } catch (err) {
    console.error("[localSMService] Error guardando propuestas en localStorage:", err);
  }
}

export const LOCAL_HTTP_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_LOCAL_API_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_LOCAL_API_URL) ||
  "http://127.0.0.1:4002";

export const getLocalAuthBearer = (): string => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem("mejora_sm_auth_token") || "";
  }
  if (typeof process !== "undefined") {
    return process.env?.BEARER_TOKEN || process.env?.MEJORA_SM_AUTH_TOKEN || "";
  }
  return "";
};

export const LOCAL_AUTH_BEARER = getLocalAuthBearer();

export async function syncMutationToBackend(
  endpoint: string,
  payload: unknown,
  method: "POST" | "PATCH" = "POST",
  retries: number = 2
): Promise<boolean> {
  if (typeof fetch === "undefined") {
    return false;
  }

  const token = getLocalAuthBearer() || LOCAL_AUTH_BEARER;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  for (let intento = 0; intento <= retries; intento++) {
    try {
      const res = await fetch(`${LOCAL_HTTP_BASE}${endpoint}`, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return true;
      }
      if (res.status >= 400 && res.status < 500 && res.status !== 408) {
        const errText = await res.text();
        console.warn(`[localSMService] Rechazado por el backend (${res.status}): ${errText}`);
        return false;
      }
    } catch (err: unknown) {
      if (intento === retries) {
        console.warn("[localSMService] Aviso: backend local no respondió a la sincronización:", (err as Error)?.message || err);
        return false;
      }
      await new Promise((r) => setTimeout(r, 50 * Math.pow(2, intento)));
    }
  }
  return false;
}

/**
 * Consulta la fuente de verdad en el servidor y sincroniza con localStorage como caché.
 */
export async function fetchServerProposals(): Promise<PropuestaMejoraSMDTO[]> {
  if (typeof fetch === "undefined") {
    return getLocalProposals();
  }
  try {
    const token = getLocalAuthBearer() || LOCAL_AUTH_BEARER;
    const res = await fetch(`${LOCAL_HTTP_BASE}/api/propuestas`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = (await res.json()) as PropuestaMejoraSMDTO[];
      if (Array.isArray(data) && data.length > 0) {
        saveLocalProposals(data);
        return data;
      }
    }
  } catch (err: unknown) {
    console.warn("[localSMService] Servidor offline, leyendo desde caché local:", (err as Error)?.message || err);
  }
  return getLocalProposals();
}

export async function fetchServerProposalsAsLegacy(): Promise<ProposalDetail[]> {
  const proposals = await fetchServerProposals();
  return proposals.map(toLegacyProposal);
}

/**
 * Aprueba una propuesta individualmente y sincroniza con el backend local.
 * Guardrail DOM-01: Prohibido revertir propuestas ya publicadas.
 */
export function approveLocalProposal(id: string): PropuestaMejoraSMDTO[] {
  const all = getLocalProposals();
  const target = all.find((p) => p.propuesta_id === id || (p as unknown as { id?: string }).id === id);
  if (target && target.estado === "publicado") {
    console.warn(`[localSMService] Transición rechazada: propuesta ${id} ya está en estado 'publicado'`);
    return all;
  }

  const updated = all.map((p) => {
    if (p.propuesta_id === id || (p as unknown as { id?: string }).id === id) {
      return { ...p, estado: "aprobado" as const };
    }
    return p;
  });
  saveLocalProposals(updated);
  syncMutationToBackend("/api/approve", { id });
  return updated;
}

/**
 * Publica una propuesta individualmente y sincroniza con el backend local.
 * Guardrail DOM-01: Exige que la propuesta esté previamente en estado 'aprobado'.
 */
export function publishLocalProposal(id: string): PropuestaMejoraSMDTO[] {
  const all = getLocalProposals();
  const target = all.find((p) => p.propuesta_id === id || (p as unknown as { id?: string }).id === id);
  if (target && target.estado !== "aprobado") {
    console.warn(
      `[localSMService] Transición rechazada: propuesta ${id} debe estar en estado 'aprobado' para publicarse (actual: '${target?.estado}')`
    );
    return all;
  }

  const updated = all.map((p) => {
    if (p.propuesta_id === id || (p as unknown as { id?: string }).id === id) {
      return { ...p, estado: "publicado" as const };
    }
    return p;
  });
  saveLocalProposals(updated);
  syncMutationToBackend("/api/publish", { id });
  return updated;
}

/**
 * Aprueba un lote completo de propuestas pendientes y sincroniza con el backend local.
 */
export function approveBatchLocalProposals(filterWeek?: number): { updated: PropuestaMejoraSMDTO[]; count: number } {
  const all = getLocalProposals();
  let count = 0;
  const approvedIds: string[] = [];
  const updated = all.map((p) => {
    const matchesWeek = filterWeek
      ? p.propuesta_id.includes(`-W${String(filterWeek).padStart(2, "0")}-`)
      : true;

    if (matchesWeek && p.estado === "pendiente_revision") {
      count++;
      approvedIds.push(p.propuesta_id);
      return { ...p, estado: "aprobado" as const };
    }
    return p;
  });

  saveLocalProposals(updated);
  if (approvedIds.length > 0) {
    syncMutationToBackend("/api/approve", { ids: approvedIds });
  }
  return { updated, count };
}

export const approveProposal = approveLocalProposal;
export const approveAllProposals = approveBatchLocalProposals;
export const publishProposal = publishLocalProposal;


/**
 * Guarda cambios en el texto en 3 pasos, título o imagen de la propuesta y sincroniza con la API.
 */
export function updateLocalProposal(
  id: string,
  fields: {
    title?: string;
    hook?: string;
    body?: string;
    cta?: string;
    copy_tres_pasos?: CopyCalibradoTresPasos;
    imagen_boveda_vinculada?: { id: string; ruta_archivo_local: string; titulo?: string };
    borrador_seleccionado?: OpcionBorrador;
  }
): PropuestaMejoraSMDTO[] {
  const all = getLocalProposals();
  const updated = all.map((p) => {
    if (p.propuesta_id === id || (p as unknown as { id?: string }).id === id) {
      const borradorActivo = fields.borrador_seleccionado || p.borrador_seleccionado || "A";
      const nuevosBorradores = p.borradores.map((b) => {
        if (b.opcion === borradorActivo) {
          const nuevoCopyTresPasos: CopyCalibradoTresPasos = fields.copy_tres_pasos
            ? { ...fields.copy_tres_pasos }
            : {
                paso1_dolor: fields.hook !== undefined ? fields.hook : b.copy_tres_pasos.paso1_dolor,
                paso2_reencuadre: fields.body !== undefined ? fields.body : b.copy_tres_pasos.paso2_reencuadre,
                paso3_direccion_web: fields.cta !== undefined ? fields.cta : b.copy_tres_pasos.paso3_direccion_web,
              };

          const nuevoCuerpo = fields.copy_tres_pasos
            ? `${fields.copy_tres_pasos.paso1_dolor}\n\n${fields.copy_tres_pasos.paso2_reencuadre}`
            : fields.body !== undefined
            ? fields.body
            : b.cuerpo_texto;

          const nuevoCta = fields.copy_tres_pasos?.paso3_direccion_web ?? (fields.cta !== undefined ? fields.cta : b.cta_texto);

          return {
            ...b,
            titulo_portada: fields.title ?? b.titulo_portada,
            copy_tres_pasos: nuevoCopyTresPasos,
            cuerpo_texto: nuevoCuerpo,
            cta_texto: nuevoCta,
          };
        }
        return b;
      }) as [BorradorPropuestaDTO, BorradorPropuestaDTO, BorradorPropuestaDTO];

      return {
        ...p,
        borradores: nuevosBorradores,
        borrador_seleccionado: fields.borrador_seleccionado ?? p.borrador_seleccionado,
        imagen_boveda_vinculada: fields.imagen_boveda_vinculada ?? p.imagen_boveda_vinculada,
      };
    }
    return p;
  });

  saveLocalProposals(updated);
  syncMutationToBackend(`/api/proposals/${encodeURIComponent(id)}/edit`, fields, "PATCH");
  return updated;
}

/**
 * Rechaza una propuesta con motivo y sincroniza con la API.
 */
export function rejectLocalProposal(id: string, reason: string): PropuestaMejoraSMDTO[] {
  const all = getLocalProposals();
  const updated = all.map((p) => {
    if (p.propuesta_id === id || (p as unknown as { id?: string }).id === id) {
      return { ...p, estado: "rechazado" as const, motivo_rechazo: reason };
    }
    return p;
  });
  saveLocalProposals(updated);
  syncMutationToBackend(`/api/proposals/${encodeURIComponent(id)}/reject`, { reason }, "PATCH");
  return updated;
}

/**
 * Descarga el paquete multicanal estructurado en un solo clic.
 */
export function triggerPackageDownload(propuesta: PropuestaMejoraSMDTO): void {
  const paquete = generarPaqueteMulticanal(propuesta);
  const blob = new Blob([paquete.textoWhatsApp + "\n\n---\n\n" + (paquete.textoMeta)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `paquete_${propuesta.propuesta_id}_multicanal.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Descarga todo el lote de propuestas de la semana como archivo consolidado para WhatsApp/MejoraWS.
 */
export function triggerBatchPackageDownload(proposals: PropuestaMejoraSMDTO[], weekLabel: string): void {
  const lines: string[] = [
    `======================================================`,
    `MEJORA CONTINUA — DESPACHO MULTICANAL ${weekLabel.toUpperCase()}`,
    `Total piezas en paquete: ${proposals.length}`,
    `Generado: ${new Date().toLocaleString("es-AR")}`,
    `======================================================\n`,
  ];

  proposals.forEach((p, index) => {
    const pkg = generarPaqueteMulticanal(p);
    lines.push(`------------------------------------------------------`);
    lines.push(`PIEZA ${index + 1}/${proposals.length}: [${p.propuesta_id}] - CANAL: ${p.canal_destino.toUpperCase()}`);
    lines.push(`Fecha sugerida: ${p.dia_programado}`);
    lines.push(`Activo Bóveda: ${p.imagen_boveda_vinculada.ruta_archivo_local}`);
    lines.push(`\n>>> TEXTO PARA WHATSAPP:`);
    lines.push(pkg.textoWhatsApp);
    lines.push(`\n>>> TEXTO PARA META (INSTAGRAM / FACEBOOK):`);
    lines.push(pkg.textoMeta);
    lines.push(`\n`);
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lote_multicanal_${weekLabel.toLowerCase().replace(/\s+/g, "_")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
