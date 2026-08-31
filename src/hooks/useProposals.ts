import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsApi, templatesApi } from "@/services/supabase";

// El cliente de Supabase NO rechaza la promesa cuando la query falla: devuelve
// { data, error }. Hasta la auditoría del 2026-08-31 las mutaciones hacían
// `mutationFn: (id) => proposalsApi.x(id)` sin mirar `error`, así que onSuccess
// disparaba siempre — el toast decía "guardado" aunque el RLS, un constraint o
// la red hubieran tumbado el UPDATE ("falso guardado", B1). Este helper hace
// throw en error real, y con eso los onError que ya existen en la UI empiezan a
// funcionar. Se hace acá (no en services/supabase.ts) para no romper los tests
// de integración que esperan el chain sincrónico de PostgREST.
async function run(p: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await p;
  if (error) throw new Error(error.message);
}

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
    mutationFn: (id: string) => run(proposalsApi.approve(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useRejectProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      run(proposalsApi.reject(id, reason)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useScheduleProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date, oferta }: { id: string; date: string; oferta: string }) =>
      run(proposalsApi.schedule(id, date, oferta)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useCancelProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => run(proposalsApi.cancel(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

// Recuperar una propuesta rechazada/cancelada (B2): hasta la auditoría del
// 2026-08-31, cancelar mandaba a `rejected` sin ninguna forma de volver desde
// la UI — la acción menos reversible del sistema era la única sin freno.
export function useReactivateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => run(proposalsApi.reactivate(id)),
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
    }) => run(proposalsApi.edit(id, fields)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => run(proposalsApi.remove(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useRescheduleProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => run(proposalsApi.reschedule(id, date)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useConvertProposalFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: string }) =>
      run(proposalsApi.convertFormat(id, format)),
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
