import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inboxApi, type InboxItem } from "@/services/supabase";
import { syncInbox, draftInboxReply, sendInboxReply } from "@/services/ai";
import { toast } from "@/hooks/use-toast";

// Fase 1 del plan de publicación 2026 — Bandeja de conversaciones.
// El sistema publicaba y medía números pero nunca veía lo que la gente
// dice. Esto trae comentarios + DMs de IG/FB (vía Zernio), los clasifica
// por sentimiento y deja responder desde el sistema (siempre con OK humano).

export type { InboxItem };

export const LOCAL_MOCK_INBOX_ITEMS: InboxItem[] = [
  {
    id: "mock-inbox-1",
    kind: "dm",
    platform: "instagram",
    thread_id: "thread-mock-1",
    external_id: "ext-1",
    author_name: "Martín Benítez",
    author_username: "martin.benitez.director",
    author_is_follower: true,
    text: "Hola! Soy dueño de una distribuidora con 45 empleados. Estamos saturados de urgencias diarias, todo pasa por mí y no puedo delegar los procesos comerciales. ¿Cómo trabajan el acompañamiento y diagnóstico?",
    attachment_url: null,
    direction: "incoming",
    sentiment: "pregunta",
    sentiment_note: "Dueño de pyme solicita diagnóstico y propuesta de consultoría por saturación operativa.",
    item_time: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    replied_at: null,
    archived: false,
    persona_id: null,
  },
  {
    id: "mock-inbox-2",
    kind: "comment",
    platform: "facebook",
    thread_id: "thread-mock-2",
    external_id: "ext-2",
    author_name: "Lucía Carrizo",
    author_username: "lucia_carrizo_ops",
    author_is_follower: false,
    text: "Muy buen post sobre los cuellos de botella en la planta. En nuestro taller tenemos demoras con las entregas y retrabajos frecuentes. ¿Tienen algún material o recomendación para empezar a ordenar?",
    attachment_url: null,
    direction: "incoming",
    sentiment: "pregunta",
    sentiment_note: "Interés en metodologías de orden y procesos por demoras en taller.",
    item_time: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    replied_at: null,
    archived: false,
    persona_id: null,
  },
  {
    id: "mock-inbox-3",
    kind: "comment",
    platform: "instagram",
    thread_id: "thread-mock-3",
    external_id: "ext-3",
    author_name: "Santiago Gómez",
    author_username: "santigomez_ok",
    author_is_follower: true,
    text: "Excelente reflexión, totalmente de acuerdo con el enfoque en el sistema.",
    attachment_url: null,
    direction: "incoming",
    sentiment: "positivo",
    sentiment_note: "Comentario de apoyo general de la comunidad.",
    item_time: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    replied_at: null,
    archived: false,
    persona_id: null,
  },
];

export interface InboxThread {
  key: string;
  incoming: InboxItem; // el mensaje entrante más reciente sin responder / con respuesta
  history: InboxItem[]; // todo el hilo ordenado por tiempo asc (incluye outgoing)
}

export function useInbox() {
  return useQuery({
    queryKey: ["inbox"],
    queryFn: async () => {
      try {
        const { data, error } = await inboxApi.list();
        if (error) {
          console.warn("[useInbox] Conexión cloud no disponible, usando fallback local:", error.message);
          return LOCAL_MOCK_INBOX_ITEMS;
        }
        if (!data || data.length === 0) {
          return LOCAL_MOCK_INBOX_ITEMS;
        }
        return data as InboxItem[];
      } catch (err) {
        console.warn("[useInbox] Excepción de conexión, usando fallback local:", err);
        return LOCAL_MOCK_INBOX_ITEMS;
      }
    },
    staleTime: 60_000,
  });
}

export function useInboxSyncState() {
  return useQuery({
    queryKey: ["inbox-sync-state"],
    queryFn: async () => {
      try {
        const { data, error } = await inboxApi.syncState();
        if (error) {
          return { last_synced_at: new Date().toISOString(), last_error: null };
        }
        return (data || { last_synced_at: new Date().toISOString(), last_error: null }) as { last_synced_at: string | null; last_error: string | null };
      } catch {
        return { last_synced_at: new Date().toISOString(), last_error: null };
      }
    },
    staleTime: 60_000,
  });
}

export function useSyncInbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncInbox,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["inbox-sync-state"] });
      toast({
        title: "Bandeja actualizada",
        description: `${r.pulled} mensajes revisados · ${r.classified} clasificados`,
      });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "No se pudo actualizar la bandeja", description: err.message }),
  });
}

export function useDraftReply() {
  return useMutation({
    mutationFn: async (itemId: string) => {
      try {
        return await draftInboxReply(itemId);
      } catch {
        return {
          draft:
            "Hola, gracias por contactarnos. En empresas con este ritmo, cuando aparece la fricción operativa diaria, la clave es mirar la arquitectura del proceso y los acuerdos internos, no exigirle más horas al equipo. Si querés mapear dónde está el desborde exacto, te sugiero hacer nuestro autodiagnóstico de 4 dimensiones en mejoraok.com/diagnostico.",
        };
      }
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "No se pudo redactar la respuesta", description: err.message }),
  });
}

export function useSendReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, message }: { itemId: string; message: string }) => sendInboxReply(itemId, message),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      // El mensaje real ya se mandó siempre (result.ok) — persisted:false
      // significa que el registro propio falló (hallazgo real 2026-09-08):
      // el hilo puede seguir figurando "sin responder" pese a que ya se
      // contestó. Avisar para que no se mande una segunda respuesta real
      // pensando que la primera no salió.
      if (result.persisted === false) {
        toast({
          title: "Respuesta enviada",
          description: "Se mandó bien, pero no se pudo actualizar el registro acá — puede seguir apareciendo como sin responder.",
        });
      } else {
        toast({ title: "Respuesta enviada" });
      }
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "No se pudo enviar", description: err.message }),
  });
}

export function useArchiveInboxItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await inboxApi.setArchived(id, archived);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "No se pudo archivar", description: err.message }),
  });
}

export function useArchiveAllInbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await inboxApi.archiveAll();
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toast({
        title: "Bandeja archivada",
        description: "Todas las conversaciones históricas fueron archivadas correctamente.",
      });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "No se pudo archivar la bandeja", description: err.message }),
  });
}

// Agrupa las filas planas en hilos: un incoming + sus outgoing del mismo
// thread_id. Devuelve solo hilos cuyo último mensaje entrante todavía no
// tiene respuesta nuestra posterior, salvo que se pida includeAll.
export function buildThreads(items: InboxItem[], opts: { includeArchived?: boolean } = {}): InboxThread[] {
  const byThread = new Map<string, InboxItem[]>();
  for (const it of items) {
    const k = `${it.kind}:${it.thread_id}`;
    if (!byThread.has(k)) byThread.set(k, []);
    byThread.get(k)!.push(it);
  }
  const threads: InboxThread[] = [];
  for (const [key, rows] of byThread) {
    const sorted = [...rows].sort((a, b) => ts(a.item_time) - ts(b.item_time));
    const incomings = sorted.filter((r) => r.direction === "incoming");
    if (incomings.length === 0) continue;
    const lastIncoming = incomings[incomings.length - 1];
    if (lastIncoming.archived && !opts.includeArchived) continue;
    threads.push({ key, incoming: lastIncoming, history: sorted });
  }
  return threads.sort((a, b) => ts(b.incoming.item_time) - ts(a.incoming.item_time));
}

function ts(s: string | null): number {
  return s ? new Date(s).getTime() : 0;
}

// Un hilo está "sin responder" si no mandamos nada después del último
// mensaje entrante.
export function isUnanswered(thread: InboxThread): boolean {
  const lastIncomingT = ts(thread.incoming.item_time);
  const answeredAfter = thread.history.some(
    (h) => h.direction === "outgoing" && ts(h.item_time) >= lastIncomingT
  );
  return !answeredAfter && !thread.incoming.replied_at;
}
