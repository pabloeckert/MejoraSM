import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { calendarApi, metricsApi } from "@/services/supabase";
import { supabase } from "@/services/supabase";

// ═══════════════════════════════════════
// CALENDARIO
// ═══════════════════════════════════════

export function useCalendarEvents() {
  return useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const { data, error } = await calendarApi.list();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (event: {
      title: string;
      description?: string;
      date: string;
      format: string;
      proposal_id?: string;
    }) => calendarApi.create(event),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  });
}

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
