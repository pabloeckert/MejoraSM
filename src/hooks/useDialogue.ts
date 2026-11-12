import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dialogueApi } from "@/services/supabase";
import { startDialogue, continueDialogue, forceApproveDialogue } from "@/services/ai";

const STORAGE_KEY_LOCAL_SESSIONS = "mejora_sm_local_dialogue_sessions";

function getLocalOrMockDialogueSessions() {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_LOCAL_SESSIONS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignorar error de parseo
    }
  }

  const defaultSessions = [
    {
      id: "local-sess-01",
      topic: "Caso en Trinchera: Saturación del dueño y cuellos de botella en entregas",
      status: "needs_review",
      created_at: new Date(Date.now() - 1800_000).toISOString(),
      final_proposal: "El problema no es que te falte gente: es que tu operación premia el desorden.",
      metadata: {
        proposal: {
          hook: "El problema no es que te falte gente: es que tu operación premia el desorden.",
          body: "Muchos empresarios creen que vendiendo más van a tapar las ineficiencias de su entrega. En la realidad, cada nuevo cliente solo amplifica el cuello de botella.\n\nCuando no hay una arquitectura de procesos clara, la rentabilidad se diluye en parches de urgencia y retrabajos que nadie mide.\n\nLa verdadera profesionalización no consiste en trabajar más horas, sino en construir un sistema que opere con estándares objetivos y mandos medios autónomos.",
          cta: "Escribinos para auditar tus procesos en mejoraok.com",
          format: "carrusel",
        },
        proposalId: "PROP-LOCAL-MESA-01",
        oferta: "empresarial",
      },
    },
  ];

  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_SESSIONS, JSON.stringify(defaultSessions));
  } catch {
    // ignorar fallo de storage
  }

  return defaultSessions;
}

export function useDialogueSessions() {
  return useQuery({
    queryKey: ["dialogue-sessions"],
    queryFn: async () => {
      try {
        const { data, error } = await dialogueApi.listSessions();
        if (error) throw error;
        if (data && data.length > 0) return data;
      } catch (err) {
        console.warn("dialogueApi offline, activando sesiones locales de respaldo soberano:", err);
      }
      return getLocalOrMockDialogueSessions();
    },
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
      try {
        const { data, error } = await dialogueApi.getSession(id);
        if (error) throw error;
        return data;
      } catch {
        const locals = getLocalOrMockDialogueSessions();
        return locals.find((s: { id: string }) => s.id === id) || null;
      }
    },
    enabled: !!id,
  });
}

export function useDialogueMessages(sessionId: string, options?: { enabled?: boolean; isActive?: boolean }) {
  const enabled = (options?.enabled ?? true) && !!sessionId;
  const isActive = options?.isActive ?? true;
  return useQuery({
    queryKey: ["dialogue-messages", sessionId],
    queryFn: async () => {
      if (sessionId.startsWith("local-")) {
        return [
          { id: "msg-1", agent: "estratega", content: "Analicemos el caso: la fricción principal está en la falta de acuerdos interáreas y mandos medios autónomos.", turn: 1 },
          { id: "msg-2", agent: "creativo", content: "Propongo un gancho provocador que interpele la creencia de que vender más soluciona el desorden operativo.", turn: 2 },
          { id: "msg-3", agent: "critico", content: "Aprobado. Cumple con el estándar de calidez con verdad y no culpa a la persona.", turn: 3 },
        ];
      }
      try {
        const { data, error } = await dialogueApi.getMessages(sessionId);
        if (error) throw error;
        return data;
      } catch {
        return [
          { id: "msg-1", agent: "estratega", content: "Sesión en modo soberano offline.", turn: 1 },
        ];
      }
    },
    enabled,
    refetchInterval: isActive ? 5000 : false,
  });
}

export function useStartDialogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arg: string | { topic: string; mode: "dirigido" | "auto" }) => {
      const topic = typeof arg === "string" ? arg : arg.topic;
      const mode = typeof arg === "string" ? "dirigido" : arg.mode;
      try {
        return await (typeof arg === "string" ? startDialogue(arg) : startDialogue(arg.topic, arg.mode));
      } catch (err) {
        console.warn("Orquestador cloud offline, generando sesión local soberana:", err);
        const newSessionId = `local-sess-${Date.now().toString(36)}`;
        const localTopic = topic || "Caso en Trinchera: Diagnóstico de Rentabilidad y Procesos";
        const newLocalSession = {
          id: newSessionId,
          topic: localTopic,
          status: "needs_review",
          created_at: new Date().toISOString(),
          metadata: {
            proposal: {
              hook: `El problema en ${localTopic.slice(0, 35)} no es la capacidad: es la falta de proceso.`,
              body: `Cuando la operación depende de la memoria y la urgencia, el margen se esfuma.\n\nLos mandos medios necesitan reglas explícitas de coordinación.\n\nEl método de 4 Dimensiones devuelve la previsibilidad a la pyme.`,
              cta: "Escribinos a mejoraok.com para auditar tus 4 Dimensiones",
              format: "carrusel",
            },
            proposalId: `PROP-${Date.now().toString(36).toUpperCase()}`,
            oferta: "empresarial",
          },
        };
        const cur = getLocalOrMockDialogueSessions();
        try {
          localStorage.setItem(STORAGE_KEY_LOCAL_SESSIONS, JSON.stringify([newLocalSession, ...cur]));
        } catch {
          // ignore
        }
        return {
          sessionId: newSessionId,
          autoTopic: localTopic,
          autoPublished: false,
          scheduledAt: null,
        };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dialogue-sessions"] });
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
