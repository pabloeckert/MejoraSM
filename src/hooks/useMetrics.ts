import { useQuery } from "@tanstack/react-query";
import { metricsApi } from "@/services/supabase";

// calendar_events (y sus hooks useCalendarEvents/useCreateCalendarEvent/
// useDeleteCalendarEvent) se retiraron en la Fase 0 del plan estratégico
// 2026-08-16 — tabla legacy confirmada vacía, sin ningún caller real desde
// el rediseño de Calendario del 2026-08-07 (lee proposals.scheduled_at
// directo). Dashboard.tsx ahora deriva "próximos 7 días" de useProposals().

// ═══════════════════════════════════════
// MÉTRICAS
// ═══════════════════════════════════════

export function useLatestMetrics() {
  return useQuery({
    queryKey: ["metrics", "latest"],
    queryFn: async () => {
      const { data, error } = await metricsApi.latest();
      if (error) throw error;
      return data;
    },
  });
}

export function useAllMetrics() {
  return useQuery({
    queryKey: ["metrics", "all"],
    queryFn: async () => {
      const { data, error } = await metricsApi.all();
      if (error) throw error;
      return data;
    },
  });
}

export function useProposalMetrics(proposalId: string) {
  return useQuery({
    queryKey: ["metrics", "proposal", proposalId],
    queryFn: async () => {
      const { data, error } = await metricsApi.byProposal(proposalId);
      if (error) throw error;
      return data;
    },
    enabled: !!proposalId,
  });
}

export function useSuccessRules() {
  return useQuery({
    queryKey: ["success-rules"],
    queryFn: async () => {
      const { data, error } = await metricsApi.successRules();
      if (error) throw error;
      return data;
    },
  });
}
