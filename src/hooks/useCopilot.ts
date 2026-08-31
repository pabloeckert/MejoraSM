import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCopilotAdvice, sendCopilotMessage, type CopilotChatMessage } from "@/services/ai";

export function useCopilotAdvice() {
  return useQuery({
    queryKey: ["copilot-advice"],
    queryFn: getCopilotAdvice,
    staleTime: 60 * 60 * 1000, // cacheado por fecha en el backend, no hace falta refetch agresivo
  });
}

// Chat stateless (ver migración 015): el historial vive acá, en memoria del
// componente — no hay sesión persistida en el backend, cada mensaje manda
// el historial completo (acotado a los últimos 10 turnos, igual que hace
// el backend con lo que le llega).
export function useCopilotChat() {
  const [messages, setMessages] = useState<CopilotChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isSending) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setIsSending(true);
    setError(null);

    try {
      const { answer } = await sendCopilotMessage(trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error consultando al copiloto");
    } finally {
      setIsSending(false);
    }
  }

  function clear() {
    setMessages([]);
    setError(null);
  }

  return { messages, sendMessage, isSending, error, clear };
}
