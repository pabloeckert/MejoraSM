import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commentsApi } from "@/services/supabase";
import { toast } from "@/hooks/use-toast";

// Fase E del plan de continuación (2026-08-31) — comentarios anclados a una
// propuesta, para que Pablo y Sindy discutan una pieza dentro del sistema.
// Sin auth por persona todavía: el nombre del autor se recuerda en
// localStorage (ver useCommentAuthor).

export interface ProposalComment {
  id: string;
  proposal_id: string;
  author: string;
  body: string;
  created_at: string;
}

const AUTHOR_KEY = "mejorasm_comment_author";

export function getCommentAuthor(): string {
  try {
    return localStorage.getItem(AUTHOR_KEY) || "";
  } catch {
    return "";
  }
}

export function setCommentAuthor(name: string) {
  try {
    localStorage.setItem(AUTHOR_KEY, name);
  } catch {
    /* modo privado / storage bloqueado — el nombre se pide de nuevo */
  }
}

export function useProposalComments(proposalId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["proposal-comments", proposalId],
    queryFn: async () => {
      const { data, error } = await commentsApi.list(proposalId!);
      if (error) throw new Error(error.message);
      return (data || []) as ProposalComment[];
    },
    enabled: !!proposalId && enabled,
    staleTime: 30_000,
  });
}

export function useAddComment(proposalId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ author, body }: { author: string; body: string }) => {
      if (!proposalId) throw new Error("Falta la propuesta");
      const { data, error } = await commentsApi.add(proposalId, author.trim() || "anónimo", body.trim());
      if (error) throw new Error(error.message);
      return data as ProposalComment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal-comments", proposalId] }),
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "No se pudo publicar el comentario", description: err.message }),
  });
}
