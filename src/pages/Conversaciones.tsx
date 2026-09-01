import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Loader2,
  MessageCircle,
  AtSign,
  Sparkles,
  Send,
  Archive,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  useInbox,
  useInboxSyncState,
  useSyncInbox,
  useDraftReply,
  useSendReply,
  useArchiveInboxItem,
  buildThreads,
  isUnanswered,
  type InboxThread,
} from "@/hooks/useInbox";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";

const PLATFORM_LABEL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook" };

const SENTIMENT_STYLE: Record<string, { label: string; className: string }> = {
  pregunta: { label: "Pregunta", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  negativo: { label: "Negativo", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  positivo: { label: "Positivo", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
  neutral: { label: "Neutral", className: "bg-muted text-muted-foreground" },
};

type SentimentFilter = "todos" | "pregunta" | "negativo" | "positivo" | "neutral";
type PlatformFilter = "todas" | "instagram" | "facebook";

export default function Conversaciones() {
  const { data: items = [], isLoading } = useInbox();
  const { data: syncState } = useInboxSyncState();
  const sync = useSyncInbox();

  const [onlyUnanswered, setOnlyUnanswered] = useState(true);
  const [sentiment, setSentiment] = useState<SentimentFilter>("todos");
  const [platform, setPlatform] = useState<PlatformFilter>("todas");
  const [showArchived, setShowArchived] = useState(false);

  const threads = useMemo(() => {
    let t = buildThreads(items, { includeArchived: showArchived });
    if (showArchived) t = t.filter((x) => x.incoming.archived);
    if (onlyUnanswered && !showArchived) t = t.filter(isUnanswered);
    if (platform !== "todas") t = t.filter((x) => x.incoming.platform === platform);
    if (sentiment !== "todos") t = t.filter((x) => x.incoming.sentiment === sentiment);
    return t;
  }, [items, onlyUnanswered, sentiment, platform, showArchived]);

  const unansweredCount = useMemo(
    () => buildThreads(items).filter(isUnanswered).length,
    [items]
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Conversaciones</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Comentarios y mensajes directos de Instagram y Facebook — traídos desde Zernio, con una etiqueta de
            sentimiento. Responder acá manda la respuesta a la red.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={() => sync.mutate()} disabled={sync.isPending} className="h-11">
            {sync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
          {syncState?.last_synced_at && (
            <span className="text-[11px] text-muted-foreground">
              Última sincronización {formatDistanceToNow(new Date(syncState.last_synced_at), { addSuffix: true, locale: es })}
            </span>
          )}
          {syncState?.last_error && (
            <span className="text-[11px] text-red-600 dark:text-red-400">Error: {syncState.last_error}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={onlyUnanswered && !showArchived} onClick={() => { setOnlyUnanswered((v) => !v); setShowArchived(false); }}>
          Sin responder{unansweredCount > 0 && ` (${unansweredCount})`}
        </FilterChip>
        <div className="mx-1 h-5 w-px bg-border" />
        {(["todas", "instagram", "facebook"] as PlatformFilter[]).map((p) => (
          <FilterChip key={p} active={platform === p} onClick={() => setPlatform(p)}>
            {p === "todas" ? "Todas" : p === "instagram" ? "Instagram" : "Facebook"}
          </FilterChip>
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        {(["todos", "pregunta", "negativo", "positivo", "neutral"] as SentimentFilter[]).map((s) => (
          <FilterChip key={s} active={sentiment === s} onClick={() => setSentiment(s)}>
            {s === "todos" ? "Todo sentimiento" : SENTIMENT_STYLE[s]?.label ?? s}
          </FilterChip>
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        <FilterChip active={showArchived} onClick={() => setShowArchived((v) => !v)}>
          Archivadas
        </FilterChip>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            {items.length === 0
              ? "Todavía no hay conversaciones sincronizadas. Tocá “Actualizar” para traerlas."
              : "Nada que mostrar con estos filtros."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <ThreadCard key={t.key} thread={t} archivedView={showArchived} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function ThreadCard({ thread, archivedView }: { thread: InboxThread; archivedView: boolean }) {
  const { incoming, history } = thread;
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const draftMut = useDraftReply();
  const sendMut = useSendReply();
  const archiveMut = useArchiveInboxItem();
  const [confirm, ConfirmUI] = useConfirm();

  const answered = !isUnanswered(thread);
  const platformLabel = PLATFORM_LABEL[incoming.platform] ?? incoming.platform;
  const sent = incoming.sentiment ? SENTIMENT_STYLE[incoming.sentiment] : null;

  async function handleSend() {
    if (!draft.trim()) return;
    const ok = await confirm({
      title: incoming.kind === "comment" ? "Responder el comentario" : "Enviar el mensaje",
      description: `Se va a publicar en ${platformLabel} tal cual:\n\n“${draft.trim()}”`,
      confirmText: "Enviar",
    });
    if (!ok) return;
    await sendMut.mutateAsync({ itemId: incoming.id, message: draft.trim() });
    setReplyOpen(false);
    setDraft("");
  }

  return (
    <Card className={cn(answered && !archivedView && "opacity-70")}>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 font-medium text-foreground">
            {incoming.kind === "comment" ? <MessageCircle className="h-3.5 w-3.5" /> : <AtSign className="h-3.5 w-3.5" />}
            {incoming.kind === "comment" ? "Comentario" : "Mensaje directo"}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Badge variant="outline" className="border-border font-normal">{platformLabel}</Badge>
            {incoming.author_name || incoming.author_username || "Anónimo"}
            {incoming.author_is_follower && <span className="text-muted-foreground/70">· sigue la cuenta</span>}
          </span>
          {sent && <Badge className={cn("border-0", sent.className)}>{sent.label}</Badge>}
          {incoming.sentiment_note && <span className="text-muted-foreground/80">{incoming.sentiment_note}</span>}
          {incoming.item_time && (
            <span className="ml-auto text-muted-foreground/70">
              {formatDistanceToNow(new Date(incoming.item_time), { addSuffix: true, locale: es })}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {history.map((h) => (
            <div
              key={h.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                h.direction === "outgoing"
                  ? "ml-8 bg-primary/10 text-foreground"
                  : "mr-8 bg-muted text-foreground"
              )}
            >
              {h.direction === "outgoing" && (
                <p className="mb-0.5 text-[11px] font-semibold text-primary">Mejora Continua</p>
              )}
              {h.text || (h.attachment_url ? "[adjunto]" : "")}
              {h.attachment_url && (
                <a
                  href={h.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-[11px] text-primary underline"
                >
                  ver adjunto
                </a>
              )}
            </div>
          ))}
        </div>

        {answered && !archivedView && (
          <p className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Respondido
          </p>
        )}

        {!replyOpen ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={answered ? "outline" : "default"}
              size="sm"
              className="h-9"
              onClick={() => {
                setReplyOpen(true);
                if (!draft) draftMut.mutate(incoming.id, { onSuccess: (r) => setDraft(r.draft) });
              }}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {answered ? "Responder de nuevo" : "Redactar respuesta"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => archiveMut.mutate({ id: incoming.id, archived: !incoming.archived })}
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              {incoming.archived ? "Desarchivar" : "Archivar"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder={draftMut.isPending ? "Redactando sugerencia…" : "Escribí la respuesta…"}
              disabled={draftMut.isPending}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" className="h-9" onClick={handleSend} disabled={sendMut.isPending || !draft.trim()}>
                {sendMut.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                Enviar a {platformLabel}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9"
                onClick={() => draftMut.mutate(incoming.id, { onSuccess: (r) => setDraft(r.draft) })}
                disabled={draftMut.isPending}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Otra sugerencia
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => setReplyOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      {ConfirmUI}
    </Card>
  );
}
