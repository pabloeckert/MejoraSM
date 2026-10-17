import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsApi, templatesApi } from "@/services/supabase";
import type { ProposalDetail } from "@/components/ProposalDetailDialog";
import {
  getLocalProposals,
  getLocalProposalsAsLegacy,
  approveLocalProposal,
  rejectLocalProposal,
  updateLocalProposal,
  saveLocalProposals,
} from "@/services/localSMService";

async function run(p: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await p;
  if (error) throw new Error(error.message);
}

export function useProposals() {
  return useQuery<ProposalDetail[]>({
    queryKey: ["proposals"],
    queryFn: async (): Promise<ProposalDetail[]> => {
      return getLocalProposalsAsLegacy();
    },
  });
}

export function usePendingProposals() {
  return useQuery<ProposalDetail[]>({
    queryKey: ["proposals", "pending"],
    queryFn: async (): Promise<ProposalDetail[]> => {
      return getLocalProposalsAsLegacy().filter((p) => p.status === "pending");
    },
    refetchInterval: 10000,
  });
}

export function useApproveProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      approveLocalProposal(id);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useRejectProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      rejectLocalProposal(id, reason);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useScheduleProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string; oferta?: string }) => {
      const all = getLocalProposals();
      const updated = all.map((p) =>
        p.propuesta_id === id ? { ...p, dia_programado: date, estado: "aprobado" as const } : p
      );
      saveLocalProposals(updated);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useCancelProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      rejectLocalProposal(id, "Cancelada antes de publicar");
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useReactivateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const all = getLocalProposals();
      const updated = all.map((p) =>
        p.propuesta_id === id
          ? { ...p, estado: "pendiente_revision" as const, motivo_rechazo: undefined }
          : p
      );
      saveLocalProposals(updated);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

// ═══════════════════════════════════════
// MODAL DE DETALLE — acciones reales (rediseño 2026-08-07)
// ═══════════════════════════════════════

export function useEditProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      fields,
    }: {
      id: string;
      fields: Partial<{ title: string; hook: string; body: string; cta: string; hashtags: string[] }>;
    }) => {
      updateLocalProposal(id, {
        title: fields.title,
        hook: fields.hook,
        body: fields.body,
        cta: fields.cta,
      });
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const all = getLocalProposals();
      const updated = all.filter((p) => p.propuesta_id !== id && (p as any).id !== id);
      saveLocalProposals(updated);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useRescheduleProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const all = getLocalProposals();
      const updated = all.map((p) => (p.propuesta_id === id ? { ...p, dia_programado: date } : p));
      saveLocalProposals(updated);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useConvertProposalFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, format }: { id: string; format: string }) => {
      const all = getLocalProposals();
      const updated = all.map((p) =>
        p.propuesta_id === id ? { ...p, canal_destino: (format as any) } : p
      );
      saveLocalProposals(updated);
      return id;
    },
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
    mutationFn: (fields: { name: string; format: string; notes?: string }) =>
      run(templatesApi.create(fields)),
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
    }) => run(templatesApi.update(id, fields)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => run(templatesApi.remove(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}
