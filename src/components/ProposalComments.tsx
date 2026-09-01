import { useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getCommentAuthor,
  setCommentAuthor,
  useAddComment,
  useProposalComments,
} from "@/hooks/useProposalComments";

// Fase E del plan de continuación (2026-08-31) — hilo de comentarios de una
// propuesta. Sin auth por persona: el nombre se pide una vez y se guarda en
// localStorage. Ver 022_proposal_comments.sql y el comentario ahí sobre por
// qué el "rol de revisor" real necesita la puerta de acceso primero.
export function ProposalComments({ proposalId }: { proposalId: string }) {
  const { data: comments, isLoading } = useProposalComments(proposalId);
  const addMutation = useAddComment(proposalId);
  const [author, setAuthor] = useState(getCommentAuthor());
  const [body, setBody] = useState("");

  const submit = () => {
    if (!body.trim()) return;
    setCommentAuthor(author);
    addMutation.mutate({ author, body }, { onSuccess: () => setBody("") });
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5" />
        Comentarios {comments && comments.length > 0 ? `(${comments.length})` : ""}
      </p>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : comments && comments.length > 0 ? (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md bg-muted/50 p-2.5 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold">{c.author}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {new Date(c.created_at).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Todavía no hay comentarios en esta pieza.</p>
      )}

      <div className="space-y-2">
        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Tu nombre"
          aria-label="Tu nombre"
          className="h-9 text-sm"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribí un comentario sobre esta pieza…"
          aria-label="Comentario"
          rows={2}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={!body.trim() || addMutation.isPending}>
            {addMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Comentar
          </Button>
        </div>
      </div>
    </div>
  );
}
