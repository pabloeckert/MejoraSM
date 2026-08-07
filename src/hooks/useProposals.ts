import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsApi, templatesApi } from "@/services/supabase";

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
    mutationFn: ({ id, date, oferta }: { id: string; date: string; oferta: string }) =>
      proposalsApi.schedule(id, date, oferta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useCancelProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => proposalsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

// ═══════════════════════════════════════
// MODAL DE DETALLE — acciones reales (rediseño 2026-08-07)
// ═══════════════════════════════════════

export function useEditProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string;
      fields: Partial<{ title: string; hook: string; body: string; cta: string; hashtags: string[] }>;
    }) => proposalsApi.edit(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => proposalsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useRescheduleProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => proposalsApi.reschedule(id, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useConvertProposalFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: string }) => proposalsApi.convertFormat(id, format),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

// ═══════════════════════════════════════
// PLANTILLAS
// ═══════════════════════════════════════

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await templatesApi.list();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: { name: string; format: string; notes?: string }) => templatesApi.create(fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string;
      fields: Partial<{ name: string; format: string; notes: string }>;
    }) => templatesApi.update(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templatesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}
