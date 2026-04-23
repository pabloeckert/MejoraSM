import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dialogueApi } from "@/services/supabase";
import { startDialogue, continueDialogue } from "@/services/ai";

export function useDialogueSessions() {
  return useQuery({
    queryKey: ["dialogue-sessions"],
    queryFn: async () => {
      const { data, error } = await dialogueApi.listSessions();
      if (error) throw error;
      return data;
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

export function useDialogueMessages(sessionId: string) {
  return useQuery({
    queryKey: ["dialogue-messages", sessionId],
    queryFn: async () => {
      const { data, error } = await dialogueApi.getMessages(sessionId);
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
    refetchInterval: 5000, // Poll while dialogue is active
  });
}

export function useStartDialogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topic: string) => startDialogue(topic),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dialogue-sessions"] }),
  });
}

export function useContinueDialogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, feedback }: { sessionId: string; feedback: string }) =>
      continueDialogue(sessionId, feedback),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dialogue-sessions"] }),
  });
}
