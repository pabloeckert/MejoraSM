import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dialogueApi } from "@/services/supabase";
import { startDialogue, continueDialogue, forceApproveDialogue } from "@/services/ai";

export function useDialogueSessions() {
  return useQuery({
    queryKey: ["dialogue-sessions"],
    queryFn: async () => {
      const { data, error } = await dialogueApi.listSessions();
      if (error) throw error;
      return data;
    },
    // B12 (auditoría 2026-08-31): sin esto, una sesión que terminó server-side
    // seguía mostrando "Activa" y su tarjeta de autopublicación no aparecía
    // hasta navegar afuera y volver. Mientras haya alguna sesión `active`,
    // refetch cada 4s; si no, nada.
    refetchInterval: (query) => {
      const sessions = query.state.data as Array<{ status?: string }> | undefined;
      return sessions?.some((s) => s.status === "active") ? 4000 : false;
    },
  });
}

export function useDialogueSession(id: string) {
  return useQuery({
    queryKey: ["dialogue-sessions", id],
    queryFn: async () => {
      const { data, error } = await dialogueApi.getSession(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// Hallazgo real de auditoría 2026-08-25: esto se llamaba para CADA sesión
// listada (seleccionada o no), con un refetchInterval fijo de 5s sin mirar
// el status — con N sesiones históricas en la lista, eso dispara N queries
// cada 5s indefinidamente mientras la pestaña esté abierta, incluidas
// sesiones aprobadas/rechazadas hace semanas. `enabled` limita el fetch a
// la sesión realmente expandida; el polling se corta apenas la sesión deja
// de estar "active" (aprobada/rechazada no va a recibir mensajes nuevos).
export function useDialogueMessages(sessionId: string, options?: { enabled?: boolean; isActive?: boolean }) {
  const enabled = (options?.enabled ?? true) && !!sessionId;
  const isActive = options?.isActive ?? true;
  return useQuery({
    queryKey: ["dialogue-messages", sessionId],
    queryFn: async () => {
      const { data, error } = await dialogueApi.getMessages(sessionId);
      if (error) throw error;
      return data;
    },
    enabled,
    refetchInterval: isActive ? 5000 : false,
  });
}

export function useStartDialogue() {
  const qc = useQueryClient();
  return useMutation({
    // Fase B (2026-08-31): acepta string (modo dirigido, retrocompat) o
    // { topic, mode } — mode "auto" = modo libre, el sistema propone el tema.
    mutationFn: (arg: string | { topic: string; mode: "dirigido" | "auto" }) =>
      typeof arg === "string" ? startDialogue(arg) : startDialogue(arg.topic, arg.mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dialogue-sessions"] });
      // Hallazgo real 2026-08-26: si el Crítico aprueba y autoagenda
      // (post/carrusel), la propuesta nueva no aparecía en Laboratorio
      // ("Propuestas recientes") ni se podía abrir por id hasta que algo
      // más refetcheara ["proposals"] — esta mutación nunca lo invalidaba.
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useContinueDialogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, feedback }: { sessionId: string; feedback: string }) =>
      continueDialogue(sessionId, feedback),
    // Hallazgo real 2026-08-31 (Pablo: mandó feedback tras un rechazo y la
    // pantalla quedó "igual, como si no hubiera tomado nada"): esto solo
    // invalidaba ["dialogue-sessions"] (la lista) — nunca
    // ["dialogue-messages", sessionId], la query real de los turnos del
    // chat. useDialogueMessages además corta su polling de 5s apenas
    // session.status deja de ser "active" (fix de perf del 2026-08-25), así
    // que sin esta invalidación explícita los turnos nuevos del Creativo/
    // Crítico de la segunda vuelta nunca llegaban a la pantalla — quedaba
    // literalmente congelada en la ronda anterior hasta un F5 manual.
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ["dialogue-sessions"] });
      qc.invalidateQueries({ queryKey: ["dialogue-messages", variables.sessionId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

// Override humano (2026-09-02): Pablo tiene la última palabra sobre el
// Crítico — ver forceApproveDialogue en services/ai.ts.
export function useForceApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => forceApproveDialogue(sessionId),
    onSuccess: (_result, sessionId) => {
      qc.invalidateQueries({ queryKey: ["dialogue-sessions"] });
      qc.invalidateQueries({ queryKey: ["dialogue-messages", sessionId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}
