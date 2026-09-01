import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInsights, sendInsightFeedback } from "@/services/ai";

// Fase A del plan de continuación (2026-08-31) — motor de insights del
// Dashboard. La Edge Function cachea por semana, así que un staleTime largo
// alcanza; el recálculo real lo hace el cron semanal.
export function useInsights() {
  return useQuery({
    queryKey: ["insights"],
    queryFn: getInsights,
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });
}

export function useInsightFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ insightId, weekStart, useful }: { insightId: string; weekStart: string; useful: boolean }) =>
      sendInsightFeedback(insightId, weekStart, useful),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights"] }),
  });
}
