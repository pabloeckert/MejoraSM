// src/infrastructure/posting/postingDaemon.ts
// EJECUTOR / DAEMON LOCAL DE AUTO-POSTING PARA MejoraSM VIA ZERNIO (2026)
// Despacha propuestas aprobadas según fecha y canal a la API de Zernio.
// Incluye modo Sandbox/Zero-Trust para ejecución offline soberana.

import { SqliteSMRepository } from "../sqlite/SqliteSMRepository";
import {
  PropuestaMejoraSMDTO,
  CanalDestino,
} from "../../domain/types";
import { ZernioCircuitBreaker } from "./circuitBreaker";

export interface ZernioPlatformConfig {
  platform: string;
  accountId: string;
}

export interface ZernioPostPayload {
  content: string;
  mediaItems: Array<{ type: "image"; url: string }>;
  platforms: ZernioPlatformConfig[];
  publishNow: boolean;
}

export interface PostingCycleOptions {
  repository: SqliteSMRepository;
  now?: Date;
  sandbox?: boolean;
  apiKey?: string;
  circuitBreaker?: ZernioCircuitBreaker;
  accountIds?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
}

export interface PostingCycleResult {
  propuestasProcesadas: number;
  publicadasExitosamente: number;
  encoladasFallbackLocal: number;
  fallidas: number;
  detalles: Array<{
    propuestaId: string;
    canal: CanalDestino;
    postId?: string;
    error?: string;
    payload?: ZernioPostPayload;
  }>;
}

export const CANALES_PLATAFORMA_MAP: Record<string, string> = {
  instagram: "instagram",
  facebook: "facebook",
  whatsapp: "whatsapp",
};

/**
 * Construye el payload canónico para la API de Zernio a partir de una propuesta de MejoraSM.
 */
export function buildZernioPayload(
  propuesta: PropuestaMejoraSMDTO,
  accountIds: Record<string, string> = {}
): ZernioPostPayload {
  const borrador =
    propuesta.borradores.find((b) => b.opcion === propuesta.borrador_seleccionado) ||
    propuesta.borradores[0];

  const canalKey = propuesta.canal_destino as string;
  const plataformaZernio = CANALES_PLATAFORMA_MAP[canalKey] || "instagram";
  const accountId = accountIds[canalKey] || accountIds[plataformaZernio];
  if (!accountId) {
    throw new Error(`Falta ID de cuenta real de Zernio para el canal '${canalKey}'.`);
  }

  // Para WhatsApp se formatea con negritas de WhatsApp (*texto*)
  // Para redes Meta se estructura con saltos limpios y hashtags
  let content = "";
  if (canalKey === "whatsapp") {
    content = `*${borrador.titulo_portada}*\n\n${borrador.copy_tres_pasos.paso1_dolor}\n\n${borrador.copy_tres_pasos.paso2_reencuadre}\n\n👉 *${borrador.copy_tres_pasos.paso3_direccion_web}*`;
  } else {
    content = `${borrador.titulo_portada}\n\n${borrador.copy_tres_pasos.paso1_dolor}\n\n${borrador.copy_tres_pasos.paso2_reencuadre}\n\n${borrador.copy_tres_pasos.paso3_direccion_web}\n\n#MejoraContinua #OrdenOperativo #LiderazgoDirectivo`;
  }

  const mediaUrl =
    propuesta.imagen_boveda_vinculada?.ruta_archivo_local ||
    "https://raw.githubusercontent.com/pabloeckert/MejoraSM/main/templates/assets/foto_default.jpg";

  return {
    content,
    mediaItems: [{ type: "image", url: mediaUrl }],
    platforms: [{ platform: plataformaZernio, accountId }],
    publishNow: true,
  };
}

export const defaultZernioCircuitBreaker = new ZernioCircuitBreaker();

/**
 * Ejecuta un ciclo de despacho de propuestas aprobadas listas para publicación.
 */
export async function runPostingCycle(
  options: PostingCycleOptions
): Promise<PostingCycleResult> {
  const {
    repository,
    now = new Date(),
    sandbox = process.env.ZERNIO_SANDBOX === "true",
    apiKey = process.env.ZERNIO_API_KEY,
    circuitBreaker = defaultZernioCircuitBreaker,
    accountIds = {
      instagram: process.env.ZERNIO_ACCOUNT_INSTAGRAM || process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID,
      facebook: process.env.ZERNIO_ACCOUNT_FACEBOOK || process.env.ZERNIO_FACEBOOK_ACCOUNT_ID,
      whatsapp: process.env.ZERNIO_WHATSAPP_ACCOUNT_ID,
    },
  } = options;

  if (!sandbox && !apiKey) {
    throw new Error("Falta ZERNIO_API_KEY requerida para la publicación real.");
  }

  const todasAprobadas = repository.listarPropuestas({ estado: "aprobado" });
  // Filtrar las que tienen fecha programada alcanzada o vencida
  const ahoraIso = now.toISOString();
  const aDespachar = todasAprobadas.filter((p) => {
    if (!p.dia_programado) return false;
    return p.dia_programado <= ahoraIso;
  });

  const result: PostingCycleResult = {
    propuestasProcesadas: aDespachar.length,
    publicadasExitosamente: 0,
    encoladasFallbackLocal: 0,
    fallidas: 0,
    detalles: [],
  };

  for (const propuesta of aDespachar) {
    const payload = buildZernioPayload(propuesta, accountIds as Record<string, string>);

    try {
      let postId: string;

      if (sandbox) {
        // En modo Sandbox, no se realiza llamada de red externa
        postId = `zernio_mock_${Date.now()}_${propuesta.propuesta_id}`;
        repository.actualizarEstadoPropuesta(propuesta.propuesta_id, "publicado");
        result.publicadasExitosamente++;
      } else {
        const execution = await circuitBreaker.execute(
          async (signal) => {
            const response = await fetch("https://zernio.com/api/v1/posts", {
              method: "POST",
              signal,
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const errBody = await response.text();
              throw new Error(`Zernio API error ${response.status}: ${errBody}`);
            }

            const data = (await response.json()) as { post?: { id?: string }; id?: string };
            return data.post?.id || data.id || `zernio_${Date.now()}`;
          },
          (fallbackErr) => {
            // Fallback resiliente a SQLite: registrar para no perder la pieza
            repository.actualizarEstadoPropuesta(
              propuesta.propuesta_id,
              "aprobado",
              `Fallback local (Zernio offline): ${fallbackErr.message}`
            );
            return `fallback_sqlite_${Date.now()}_${propuesta.propuesta_id}`;
          }
        );

        postId = execution.result;
        if (!execution.fromFallback) {
          repository.actualizarEstadoPropuesta(propuesta.propuesta_id, "publicado");
          result.publicadasExitosamente++;
        } else {
          result.encoladasFallbackLocal++;
        }
      }

      result.detalles.push({
        propuestaId: propuesta.propuesta_id,
        canal: propuesta.canal_destino,
        postId,
        payload,
      });
    } catch (err: unknown) {
      result.fallidas++;
      result.detalles.push({
        propuestaId: propuesta.propuesta_id,
        canal: propuesta.canal_destino,
        error: err instanceof Error ? err.message : String(err),
        payload,
      });
    }
  }

  return result;
}
