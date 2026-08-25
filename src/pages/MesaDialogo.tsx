import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import {
  useDialogueSessions,
  useDialogueMessages,
  useStartDialogue,
  useContinueDialogue,
} from "@/hooks/useDialogue";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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

const agentLabels: Record<string, string> = {
  estratega: "Estratega",
  creativo: "Creativo",
  critico: "Crítico",
};

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

  const [newTopic, setNewTopic] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const handleStart = () => {
    if (!newTopic.trim()) return;
    startMutation.mutate(newTopic, {
      onSuccess: (result) => {
        setNewTopic("");
        setDialogOpen(false);
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
    });
  };

  const handleContinue = (sessionId: string) => {
    if (!feedback.trim()) return;
    continueMutation.mutate(
      { sessionId, feedback },
      { onSuccess: () => setFeedback("") }
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mesa de Diálogo</h1>
          <p className="mt-1 text-muted-foreground">
            Los agentes debaten y crean contenido basado en tu marca.
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
                <Label>¿Sobre qué tema querés que debatan los agentes?</Label>
                <Textarea
                  placeholder="Ej: Cómo delegar sin perder control, tips para emprendedores que están creciendo..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleStart}
                  disabled={!newTopic.trim() || startMutation.isPending}
                >
                  {startMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Iniciar diálogo
                </Button>
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
          {sessions.map((session: any) => (
            <SessionCard
              key={session.id}
              session={session}
              isSelected={selectedSession === session.id}
              onSelect={() =>
                setSelectedSession(
                  selectedSession === session.id ? null : session.id
                )
              }
              feedback={feedback}
              onFeedbackChange={setFeedback}
              onContinue={handleContinue}
              isContinuing={continueMutation.isPending}
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
  feedback,
  onFeedbackChange,
  onContinue,
  isContinuing,
}: {
  session: any;
  isSelected: boolean;
  onSelect: () => void;
  feedback: string;
  onFeedbackChange: (v: string) => void;
  onContinue: (sessionId: string) => void;
  isContinuing: boolean;
}) {
  const { data: messages } = useDialogueMessages(session.id);

  const statusVariant =
    session.status === "approved"
      ? "default"
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
          {/* Agent messages */}
          {messages && messages.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((msg: any) => {
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
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Los agentes están trabajando...
              </span>
            </div>
          )}

          {/* Evaluation result */}
          {session.metadata?.evaluacion && (
            <Card className={session.metadata.evaluacion.aprobado ? "border-green-500/50" : "border-amber-500/50"}>
              <CardContent className="flex items-center gap-3 p-3">
                {session.metadata.evaluacion.aprobado ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {session.metadata.evaluacion.aprobado ? "Aprobado por el Crítico" : "Necesita revisión"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {session.metadata.evaluacion.feedback}
                  </p>
                </div>
              </CardContent>
            </Card>
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
          <div className="flex gap-2">
            <Input
              placeholder="Dale feedback a los agentes..."
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onContinue(session.id);
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => onContinue(session.id)}
              disabled={!feedback.trim() || isContinuing}
            >
              {isContinuing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
