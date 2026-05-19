import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsApi } from "@/services/supabase";

export function useProposals() {
  return useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const { data, error } = await proposalsApi.list();
      if (error) throw error;
      return data;
    },
  });
}

export function usePendingProposals() {
  return useQuery({
    queryKey: ["proposals", "pending"],
    queryFn: async () => {
      const { data, error } = await proposalsApi.pending();
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useApproveProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => proposalsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useRejectProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      proposalsApi.reject(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useScheduleProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      proposalsApi.schedule(id, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}
