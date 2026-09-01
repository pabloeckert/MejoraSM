import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inboxApi, type InboxItem } from "@/services/supabase";
import { syncInbox, draftInboxReply, sendInboxReply } from "@/services/ai";
import { toast } from "@/hooks/use-toast";

// Fase 1 del plan de publicación 2026 — Bandeja de conversaciones.
// El sistema publicaba y medía números pero nunca veía lo que la gente
// dice. Esto trae comentarios + DMs de IG/FB (vía Zernio), los clasifica
// por sentimiento y deja responder desde el sistema (siempre con OK humano).

export type { InboxItem };

export interface InboxThread {
  key: string;
  incoming: InboxItem; // el mensaje entrante más reciente sin responder / con respuesta
  history: InboxItem[]; // todo el hilo ordenado por tiempo asc (incluye outgoing)
}

export function useInbox() {
  return useQuery({
    queryKey: ["inbox"],
    queryFn: async () => {
      const { data, error } = await inboxApi.list();
      if (error) throw new Error(error.message);
      return (data || []) as InboxItem[];
    },
    staleTime: 60_000,
  });
}

export function useInboxSyncState() {
  return useQuery({
    queryKey: ["inbox-sync-state"],
    queryFn: async () => {
      const { data, error } = await inboxApi.syncState();
      if (error) throw new Error(error.message);
      return data as { last_synced_at: string | null; last_error: string | null } | null;
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
    mutationFn: (itemId: string) => draftInboxReply(itemId),
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "No se pudo redactar la respuesta", description: err.message }),
  });
}

export function useSendReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, message }: { itemId: string; message: string }) => sendInboxReply(itemId, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toast({ title: "Respuesta enviada" });
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
