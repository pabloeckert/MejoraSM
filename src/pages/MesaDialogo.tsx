import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  MessageSquare,
  Loader2,
  Brain,
  Paintbrush,
  Shield,
  CheckCircle,
  XCircle,
  Send,
  Rocket,
  Gavel,
} from "lucide-react";
import {
  useDialogueSessions,
  useDialogueMessages,
  useStartDialogue,
  useContinueDialogue,
  useForceApprove,
} from "@/hooks/useDialogue";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PiecePreview } from "@/components/PiecePreview";
import { toast } from "@/hooks/use-toast";

function formatScheduledAt(iso: string) {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

const agentIcons: Record<string, typeof Brain> = {
  estratega: Brain,
  creativo: Paintbrush,
  critico: Shield,
};

const agentColors: Record<string, string> = {
  estratega: "text-blue-500 bg-blue-500/10",
  creativo: "text-purple-500 bg-purple-500/10",
  critico: "text-amber-500 bg-amber-500/10",
};

const AGENT_SEQUENCE = ["estratega", "creativo", "critico"];

const agentLabels: Record<string, string> = {
  estratega: "Estratega",
  creativo: "Creativo",
  critico: "Crítico",
};

interface DialogueSession {
  id: string;
  topic: string | null;
  status: string;
  created_at: string;
  final_proposal?: string | null;
  metadata?: {
    error?: string;
    evaluacion?: { aprobado: boolean; feedback: string };
    autoPublished?: boolean;
    scheduledAt?: string | null;
    proposalId?: string | null;
    oferta?: string | null;
    proposal?: { hook?: string; body?: string; cta?: string; format?: string } | null;
  } | null;
}

interface DialogueMessage {
  id: string;
  agent: string;
  content: string;
  turn: number;
}

export default function MesaDialogo() {
  return (
    <ErrorBoundary>
      <MesaDialogoContent />
    </ErrorBoundary>
  );
}

function MesaDialogoContent() {
  const { data: sessions, isLoading } = useDialogueSessions();
  const startMutation = useStartDialogue();
  const continueMutation = useContinueDialogue();
  const forceApproveMutation = useForceApprove();

  const [newTopic, setNewTopic] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Fase B (2026-08-31): dos entradas al mismo flujo. "dirigido" = escribís el
  // tema; "auto" = el sistema lo propone (mode: "auto", topic vacío).
  const handleStart = (mode: "dirigido" | "auto") => {
    if (mode === "dirigido" && !newTopic.trim()) return;
    startMutation.mutate({ topic: mode === "dirigido" ? newTopic : "", mode }, {
      onSuccess: (result) => {
        setNewTopic("");
        setDialogOpen(false);
        if (mode === "auto" && result.autoTopic) {
          toast({ title: "Tema elegido por el sistema", description: `"${result.autoTopic}"` });
        }
        // Hallazgo real de auditoría 2026-08-25: si el Crítico aprueba un
        // post/carrusel acá mismo, el sistema lo agenda solo para publicar
        // sin que nadie lo revise — sin este aviso, no había forma de
        // enterarse desde esta pantalla.
        if (result.autoPublished && result.scheduledAt) {
          toast({
            title: "Aprobado — ya se agendó para publicarse solo",
            description: `Sale el ${formatScheduledAt(result.scheduledAt)}. Podés cancelarlo desde Propuestas si no querés que salga.`,
          });
        }
      },
      // Mismo hallazgo real 2026-08-31 que en handleContinue — sin esto,
      // un fallo acá (timeout de 150s, red) no avisaba nada.
      onError: (e) => {
        toast({
          title: "No se pudo iniciar la sesión",
          description: e instanceof Error ? e.message : "Error desconocido — probá de nuevo.",
          variant: "destructive",
        });
      },
    });
  };

  // B8 (auditoría 2026-08-31): antes el texto del feedback era un solo useState
  // del padre compartido por todas las tarjetas — escribías en la sesión A y
  // aparecía en la B. Ahora cada SessionCard tiene su propio estado y pasa el
  // texto acá. `onClear` lo limpia solo si el envío salió bien.
  const handleContinue = (sessionId: string, feedback: string, onClear: () => void) => {
    if (!feedback.trim()) return;
    continueMutation.mutate(
      { sessionId, feedback },
      {
        onSuccess: onClear,
        // Hallazgo real 2026-08-31: si esto fallaba (timeout de 150s, red),
        // no había ningún aviso — el feedback quedaba tipeado en la caja
        // sin ninguna señal de que no se mandó, indistinguible de un éxito
        // silencioso para quien lo está mirando.
        onError: (e) => {
          toast({
            title: "No se pudo mandar el feedback",
            description: e instanceof Error ? e.message : "Error desconocido — probá de nuevo.",
            variant: "destructive",
          });
        },
      }
    );
  };

  // Override humano (2026-09-02): Pablo tiene la última palabra — si el
  // Crítico rechazó, esto fuerza la aprobación igual, con un confirm
  // explícito porque salta el chequeo automático de criterio de marca.
  const handleForceApprove = (sessionId: string) => {
    const ok = window.confirm(
      "¿Forzar la aprobación de este contenido? El Crítico lo rechazó — se va a publicar de todos modos, bajo tu propio criterio, sin el chequeo automático de marca."
    );
    if (!ok) return;
    forceApproveMutation.mutate(sessionId, {
      onSuccess: (result) => {
        toast({
          title: result.autoPublished ? "Forzado — ya se agendó para publicarse solo" : "Forzado — queda pendiente en Propuestas",
          description:
            result.autoPublished && result.scheduledAt
              ? `Sale el ${formatScheduledAt(result.scheduledAt)}. Podés cancelarlo desde Propuestas si te arrepentís.`
              : "Este formato (historia) no autoagenda — andá a Propuestas para publicarla a mano.",
        });
      },
      onError: (e) => {
        toast({
          title: "No se pudo forzar la aprobación",
          description: e instanceof Error ? e.message : "Error desconocido — probá de nuevo.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mesa de Diálogo</h1>
          <p className="mt-1 text-muted-foreground">
            Le das un tema (o el sistema te propone uno) y los 3 agentes debatan turno a turno
            (Estratega → Creativo → Crítico). Si el Crítico aprueba un post o carrusel, se agenda y publica solo.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva sesión
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva sesión de diálogo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tengo un tema</Label>
                <Textarea
                  placeholder="Ej: Cómo delegar sin perder control, tips para emprendedores que están creciendo..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button onClick={() => handleStart("dirigido")} disabled={!newTopic.trim() || startMutation.isPending}>
                    {startMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar con este tema
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">o</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Proponeme un tema</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  El sistema elige un tema desde lo que ya funcionó, los buyer personas y lo que no se tocó hace poco.
                </p>
                <div className="mt-2 flex justify-end">
                  <Button variant="outline" onClick={() => handleStart("auto")} disabled={startMutation.isPending}>
                    {startMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Que elija el sistema
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {startMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            Error: {startMutation.error?.message}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-5 w-64 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              Ninguna sesión activa
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Inicia una nueva sesión para que el Estratega, Creativo y Crítico
              trabajen juntos.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear primera sesión
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(sessions as DialogueSession[]).map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isSelected={selectedSession === session.id}
              onSelect={() =>
                setSelectedSession(
                  selectedSession === session.id ? null : session.id
                )
              }
              onContinue={handleContinue}
              isContinuing={continueMutation.isPending}
              onForceApprove={handleForceApprove}
              isForcingApprove={forceApproveMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  isSelected,
  onSelect,
  onContinue,
  isContinuing,
  onForceApprove,
  isForcingApprove,
}: {
  session: DialogueSession;
  isSelected: boolean;
  onSelect: () => void;
  onContinue: (sessionId: string, feedback: string, onClear: () => void) => void;
  isContinuing: boolean;
  onForceApprove: (sessionId: string) => void;
  isForcingApprove: boolean;
}) {
  const [feedback, setFeedback] = useState("");
  const { data: messages } = useDialogueMessages(session.id, {
    enabled: isSelected,
    isActive: session.status === "active",
  });

  // UX3 (auditoría 2026-08-31): en una sesión ya aprobada (se publicó/agendó)
  // o con error (el cartel dice "probá una sesión nueva"), la caja de feedback
  // no tiene sentido — mandarla no hace nada útil.
  const feedbackUsable = session.status !== "approved" && session.status !== "error";
  const send = () => onContinue(session.id, feedback, () => setFeedback(""));

  const statusVariant =
    session.status === "approved"
      ? "default"
      : session.status === "error"
      ? "destructive"
      : session.status === "needs_review"
      ? "secondary"
      : "outline";

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardHeader
        className="cursor-pointer pb-3"
        onClick={onSelect}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {session.topic || "Sin tema"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant}>
              {session.status === "approved"
                ? "Aprobado"
                : session.status === "error"
                ? "Error — reintentá"
                : session.status === "needs_review"
                ? "Revisar"
                : "Activa"}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(session.created_at).toLocaleString("es-AR")}
        </p>
      </CardHeader>

      {isSelected && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* Agent messages — hallazgo real de auditoría 2026-08-25: antes
              esto solo mostraba un spinner genérico sin decir cuánto podía
              tardar ni qué agente estaba trabajando. El polling de
              mensajes ya los va guardando turno a turno en tiempo real —
              alcanza con leer cuántos llegaron para mostrar progreso real
              en vez de un spinner ciego. */}
          {messages && messages.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(messages as DialogueMessage[] | undefined ?? []).map((msg) => {
                const Icon = agentIcons[msg.agent] || Brain;
                const colorClass = agentColors[msg.agent] || "text-gray-500 bg-gray-500/10";
                const label = agentLabels[msg.agent] || msg.agent;

                return (
                  <div key={msg.id} className="flex gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {label} · Turno {msg.turn}
                      </p>
                      <div className="rounded-lg border bg-card p-3 text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              {session.status === "active" && messages.length < AGENT_SEQUENCE.length && (
                <div className="flex items-center gap-2 py-2 pl-11 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {agentLabels[AGENT_SEQUENCE[messages.length]]} trabajando…
                </div>
              )}
            </div>
          ) : session.status !== "error" ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-8">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Estratega pensando el ángulo…</span>
              </div>
              <span className="text-xs text-muted-foreground/70">Puede tardar un par de minutos.</span>
            </div>
          ) : null}

          {/* Sesión rota a mitad de debate — hallazgo real de auditoría
              2026-08-25: sin esto, una sesión con 0-2 mensajes que falló
              antes de terminar se veía indistinguible de una realmente en
              curso ("Los agentes están trabajando..." para siempre). */}
          {session.status === "error" && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-start gap-3 p-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium">El debate se cortó a mitad de camino</p>
                  <p className="text-xs text-muted-foreground">
                    {session.metadata?.error || "Error desconocido"} — probá iniciar una sesión nueva con el mismo
                    tema.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation result — Fase B (2026-08-31): + valoración de "vale la
              pena" y preview visual real de la pieza. */}
          {session.metadata?.evaluacion && (
            <Card className={session.metadata.evaluacion.aprobado ? "border-green-500/50" : "border-amber-500/50"}>
              <CardContent className="space-y-3 p-3">
                <div className="flex items-start gap-3">
                  {session.metadata.evaluacion.aprobado ? (
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {session.metadata.evaluacion.aprobado
                        ? "El Crítico la aprobó — vale la pena mandarla"
                        : "El Crítico la frenó — todavía no vale la pena"}
                    </p>
                    <p className="text-xs text-muted-foreground">{session.metadata.evaluacion.feedback}</p>
                  </div>
                </div>

                {session.metadata.proposal && (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
                    <PiecePreview
                      format={session.metadata.proposal.format}
                      oferta={session.metadata.oferta}
                      hook={session.metadata.proposal.hook}
                      body={session.metadata.proposal.body}
                    />
                    <div className="space-y-1.5 text-sm">
                      {session.metadata.proposal.hook && (
                        <p><span className="text-[11px] font-semibold text-muted-foreground">HOOK</span><br />{session.metadata.proposal.hook}</p>
                      )}
                      {session.metadata.proposal.cta && (
                        <p><span className="text-[11px] font-semibold text-muted-foreground">CTA</span><br />{session.metadata.proposal.cta}</p>
                      )}
                      {session.metadata.scheduledAt && (
                        <p className="text-xs text-muted-foreground">
                          Sugerencia de horario: {formatScheduledAt(session.metadata.scheduledAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Forzar aprobación — override humano (2026-09-02): Pablo pidió
              explícitamente tener la última palabra sobre el Crítico. Solo
              tiene sentido con una evaluación real ya rechazada
              ("needs_review") — una sesión recién iniciada o ya aprobada no
              lo necesita. */}
          {session.status === "needs_review" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
              disabled={isForcingApprove}
              onClick={() => onForceApprove(session.id)}
            >
              {isForcingApprove ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Gavel className="mr-1.5 h-3.5 w-3.5" />
              )}
              Forzar aprobación — publicar de todos modos
            </Button>
          )}

          {/* Aviso de autopublicación — hallazgo real de auditoría 2026-08-25:
              esta sesión ya quedó agendada para publicarse sola, sin
              revisión humana; sin este aviso persistente, alguien que
              vuelve a mirar la sesión más tarde no tiene forma de saberlo
              desde acá (solo yendo a Propuestas/Calendario a adivinar). */}
          {session.metadata?.autoPublished && (
            <Card className="border-blue-500/50 bg-blue-500/5">
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                  <Rocket className="h-5 w-5 shrink-0 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Se agendó sola para publicarse</p>
                    <p className="text-xs text-muted-foreground">
                      {session.metadata.scheduledAt
                        ? `Sale el ${formatScheduledAt(session.metadata.scheduledAt)}, sin revisión previa.`
                        : "Sin revisión previa."}
                    </p>
                  </div>
                </div>
                {session.metadata?.proposalId && (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link to={`/propuestas?id=${session.metadata.proposalId}`}>Ver / cancelar</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Feedback input */}
          {feedbackUsable ? (
            <div className="flex gap-2">
              <Textarea
                rows={2}
                placeholder="Dale feedback a los agentes (qué ajustar del hook, el tono, el CTA…). Enter para enviar, Shift+Enter para salto de línea."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[44px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button size="icon" className="shrink-0" onClick={send} disabled={!feedback.trim() || isContinuing}>
                {isContinuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          ) : session.status === "error" ? null : (
            <p className="text-xs text-muted-foreground">
              Esta sesión ya cerró. Para probar otro ángulo, iniciá una sesión nueva.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
