import { useState } from "react";
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
} from "lucide-react";
import {
  useDialogueSessions,
  useStartDialogue,
  useContinueDialogue,
} from "@/hooks/useDialogue";
import { useApproveProposal, useRejectProposal } from "@/hooks/useProposals";

const agentIcons: Record<string, typeof Brain> = {
  estratega: Brain,
  creativo: Paintbrush,
  critico: Shield,
};

const agentColors: Record<string, string> = {
  estratega: "text-blue-500",
  creativo: "text-purple-500",
  critico: "text-amber-500",
};

export default function MesaDialogo() {
  const { data: sessions, isLoading } = useDialogueSessions();
  const startMutation = useStartDialogue();
  const continueMutation = useContinueDialogue();
  const approveMutation = useApproveProposal();
  const rejectMutation = useRejectProposal();

  const [newTopic, setNewTopic] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const handleStart = () => {
    if (!newTopic.trim()) return;
    startMutation.mutate(newTopic, {
      onSuccess: () => {
        setNewTopic("");
        setDialogOpen(false);
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
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
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
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session: any) => (
            <Card
              key={session.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() =>
                setSelectedSession(
                  selectedSession === session.id ? null : session.id
                )
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {session.topic || "Sin tema"}
                  </CardTitle>
                  <Badge
                    variant={
                      session.status === "completed" ? "default" : "secondary"
                    }
                  >
                    {session.status || "activa"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.created_at).toLocaleString("es-AR")}
                </p>
              </CardHeader>

              {selectedSession === session.id && (
                <CardContent className="space-y-4 border-t pt-4">
                  {/* Feedback input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Dale feedback a los agentes..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleContinue(session.id);
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={() => handleContinue(session.id)}
                      disabled={
                        !feedback.trim() || continueMutation.isPending
                      }
                    >
                      {continueMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Agent messages placeholder */}
                  <p className="text-xs text-muted-foreground">
                    Los mensajes de los agentes aparecerán aquí cuando el
                    backend esté conectado.
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
