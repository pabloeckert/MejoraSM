import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
  CheckCircle2,
  Send,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Edit3,
  Calendar,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import {
  useDialogueSessions,
  useDialogueMessages,
  useStartDialogue,
  useContinueDialogue,
  useForceApprove,
} from "@/hooks/useDialogue";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

// ═══════════════════════════════════════
// 4 PILARES DE AUTORIDAD B2B
// ═══════════════════════════════════════
const PILARES_B2B = [
  {
    id: "trinchera",
    num: "1",
    titulo: "Caso en Trinchera",
    subtitulo: "Fricción Operativa Real",
    desc: "Cuellos de botella reales en pymes, saturación del dueño y desconexión entre ventas y entregas.",
    prompt: "Caso en Trinchera: Una pyme donde las ventas crecieron un 30% pero el dueño está desbordado apagando incendios de entrega y calidad.",
  },
  {
    id: "ecosistema",
    num: "2",
    titulo: "Ecosistema y Red",
    subtitulo: "Integración de Sistemas",
    desc: "Mando unificado, datos sincronizados y eliminación de silos entre WhatsApp, CRM y operaciones.",
    prompt: "Ecosistema y Red: Por qué operar con WhatsApp, CRM y facturación en silos desconectados destruye la rentabilidad y la trazabilidad de clientes.",
  },
  {
    id: "metodo4d",
    num: "3",
    titulo: "Método 4D",
    subtitulo: "Diagnóstico a Dirección",
    desc: "Diagnóstico profundo, Diseño de arquitectura, Despliegue de software y Dirección continua.",
    prompt: "Método 4D: El grave error de comprar software sin un diagnóstico previo de procesos y arquitectura comercial.",
  },
  {
    id: "liderazgo",
    num: "4",
    titulo: "Propósito y Liderazgo",
    subtitulo: "Interpelación Directiva",
    desc: "Delegación real, construcción de mandos medios autónomos y decisiones basadas en criterios.",
    prompt: "Propósito y Liderazgo: La diferencia entre ser el bombero permanente de la empresa o construir mandos medios autónomos.",
  },
];

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
  const location = useLocation();
  const { data: sessions, isLoading } = useDialogueSessions();
  const startMutation = useStartDialogue();
  const continueMutation = useContinueDialogue();
  const forceApproveMutation = useForceApprove();

  const [newTopic, setNewTopic] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    const locState = location.state as { prompt?: string } | null;
    const searchParams = new URLSearchParams(location.search);
    const incomingPrompt = locState?.prompt || searchParams.get("prompt");

    if (incomingPrompt) {
      setNewTopic(incomingPrompt);
      setDialogOpen(true);
    }
  }, [location]);

  const handleStart = (mode: "dirigido" | "auto", overrideTopic?: string) => {
    const topicToUse = overrideTopic !== undefined ? overrideTopic : newTopic;
    if (mode === "dirigido" && !topicToUse.trim()) return;

    startMutation.mutate(
      { topic: mode === "dirigido" ? topicToUse : "", mode },
      {
        onSuccess: (result) => {
          setNewTopic("");
          setDialogOpen(false);
          if (mode === "auto" && result.autoTopic) {
            toast({ title: "Tema elegido por el sistema", description: `"${result.autoTopic}"` });
          }
          if (result.autoPublished && result.scheduledAt) {
            toast({
              title: "Aprobado — ya se agendó para publicarse solo",
              description: `Sale el ${formatScheduledAt(result.scheduledAt)}. Podés gestionarlo desde Propuestas.`,
            });
          }
        },
        onError: (e) => {
          toast({
            title: "No se pudo iniciar la sesión",
            description: e instanceof Error ? e.message : "Error desconocido — probá de nuevo.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleContinue = (sessionId: string, feedback: string, onClear: () => void) => {
    if (!feedback.trim()) return;
    continueMutation.mutate(
      { sessionId, feedback },
      {
        onSuccess: onClear,
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

  const handleForceApprove = (sessionId: string) => {
    const ok = window.confirm(
      "¿Aprobar y agendar esta pieza? Se publicará en el horario programado bajo criterio de autoridad B2B."
    );
    if (!ok) return;
    forceApproveMutation.mutate(sessionId, {
      onSuccess: (result) => {
        toast({
          title: "Publicación Aprobada y Agendada",
          description: result.scheduledAt
            ? `Programada para el ${formatScheduledAt(result.scheduledAt)}.`
            : "Quedó lista en tu bandeja de Propuestas.",
        });
      },
      onError: (e) => {
        toast({
          title: "No se pudo aprobar",
          description: e instanceof Error ? e.message : "Error desconocido.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Mesa Ejecutiva de Contenido</h1>
            <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
              Debate IA Multi-Agente
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Estratega, Creativo y Crítico debaten y redactan piezas de autoridad B2B listas para carruseles y posts.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#1A3D84] hover:bg-[#142e63] text-white">
              <Plus className="h-4 w-4" />
              Nueva Sesión
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Iniciar Sesión Ejecutiva</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="topic">Tema o problema a plantear</Label>
                <Textarea
                  id="topic"
                  placeholder="Ej: Por qué las empresas medianas colapsan al superar los 30 empleados sin procesos..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  rows={3}
                />
              </div>

              {startMutation.isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {startMutation.error instanceof Error
                      ? startMutation.error.message
                      : "Error iniciando el debate. Probá de nuevo."}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => handleStart("dirigido")}
                  disabled={!newTopic.trim() || startMutation.isPending}
                  className="bg-[#1A3D84] hover:bg-[#142e63] text-white"
                >
                  {startMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 h-4 w-4" />
                  )}
                  Iniciar con este tema
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStart("auto")}
                  disabled={startMutation.isPending}
                >
                  {startMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Dejar que el sistema elija tema
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 1. BARRA SUPERIOR DE LOS 4 PILARES DE AUTORIDAD B2B */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" /> Pilares de Autoridad B2B (Disparo Rápido)
          </span>
          <span className="text-xs text-muted-foreground">Elegí un pilar para iniciar el debate</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PILARES_B2B.map((pilar) => (
            <div
              key={pilar.id}
              className="flex flex-col justify-between p-4 rounded-xl border bg-card hover:bg-accent/30 hover:border-primary/50 transition-all shadow-sm space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between w-full">
                  <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                    [{pilar.num}. {pilar.titulo}]
                  </Badge>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Pilar B2B</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{pilar.subtitulo}</p>
                </div>
                <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                  {pilar.desc}
                </p>
              </div>

              <div className="flex items-center gap-1.5 pt-2 border-t">
                <Button
                  size="sm"
                  className="w-full text-xs h-8 bg-[#1A3D84] hover:bg-[#15326c] text-white font-medium"
                  disabled={startMutation.isPending}
                  onClick={() => handleStart("dirigido", pilar.prompt)}
                >
                  {startMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
                  )}
                  Debatir ahora
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Editar tema antes de iniciar"
                  onClick={() => {
                    setNewTopic(pilar.prompt);
                    setDialogOpen(true);
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de Sesiones de Debate */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">No hay sesiones aún</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Elegí uno de los 4 Pilares B2B o iniciá una sesión para que los agentes debatan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(sessions as DialogueSession[]).map((session) => {
            const thisIsContinuing =
              continueMutation.isPending && continueMutation.variables?.sessionId === session.id;
            return (
              <SessionCard
                key={session.id}
                session={session}
                isSelected={selectedSession === session.id}
                onSelect={() => setSelectedSession(selectedSession === session.id ? null : session.id)}
                onContinue={handleContinue}
                isContinuing={thisIsContinuing}
                onForceApprove={handleForceApprove}
                isForcingApprove={forceApproveMutation.isPending}
                onRetry={(topic) => handleStart("dirigido", topic)}
                isRetrying={startMutation.isPending}
              />
            );
          })}
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
  onRetry,
  isRetrying,
}: {
  session: DialogueSession;
  isSelected: boolean;
  onSelect: () => void;
  onContinue: (sessionId: string, feedback: string, onClear: () => void) => void;
  isContinuing: boolean;
  onForceApprove?: (sessionId: string) => void;
  isForcingApprove?: boolean;
  onRetry?: (topic: string) => void;
  isRetrying?: boolean;
}) {
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);
  const [isApprovingCustom, setIsApprovingCustom] = useState(false);

  const isStale = session.status === "active" && (Date.now() - new Date(session.created_at).getTime()) > 90_000;

  const { data: messages } = useDialogueMessages(session.id, {
    enabled: isSelected,
    isActive: session.status === "active" || isContinuing,
  });

  const feedbackUsable = session.status !== "approved" && session.status !== "error";

  const send = () => {
    onContinue(session.id, feedback, () => setFeedback(""));
  };

  // ═══════════════════════════════════════
  // ESTADO DE DIAPOSITIVAS DEL CARRUSEL (1 A 5)
  // ═══════════════════════════════════════
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Parsear diapositivas desde hook + body + cta
  const initialSlides = useMemo(() => {
    const proposal = session.metadata?.proposal;
    const hook = proposal?.hook || session.topic || "Portada del Carrusel";
    const body = proposal?.body || "";
    const cta = proposal?.cta || "Escribinos para auditar tus procesos en mejoraok.com";

    // Subdividir body en párrafos o bloques
    const bodyParts = body
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const slide2 = bodyParts[0] || "El Quiebre: Los síntomas visibles que indican que la operación está trabada.";
    const slide3 = bodyParts[1] || "El Error Habitual: Intentar resolver con parches tácticos lo que requiere estructura.";
    const slide4 = bodyParts[2] || "El Enfoque Estratégico: Diseñar un flujo de trabajo predecible y mandos medios autónomos.";
    const slide5 = `${cta}`;

    return [hook, slide2, slide3, slide4, slide5];
  }, [session.metadata?.proposal, session.topic]);

  const [slides, setSlides] = useState<string[]>(initialSlides);

  // Sincronizar si cambia la sesión
  useEffect(() => {
    setSlides(initialSlides);
  }, [initialSlides]);

  const slideTitles = [
    "1. Portada y Gancho",
    "2. El Quiebre Operativo",
    "3. La Fricción Común",
    "4. La Solución Estructural",
    "5. Cierre y Llamado a Acción",
  ];

  const handleUpdateSlideText = (newText: string) => {
    const updated = [...slides];
    updated[currentSlideIndex] = newText;
    setSlides(updated);
  };

  const handleApproveAndSchedule = async () => {
    try {
      setIsApprovingCustom(true);

      // Reconstruir propuesta consolidada con las ediciones del usuario
      const updatedHook = slides[0];
      const updatedBody = `${slides[1]}\n\n${slides[2]}\n\n${slides[3]}`;
      const updatedCta = slides[4];

      // Próxima fecha de publicación sugerida (ej: mañana a las 11:00)
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 1);
      scheduledDate.setHours(11, 0, 0, 0);

      // Si existe propuesta asociada, actualizarla en Supabase
      if (session.metadata?.proposalId) {
        await supabase
          .from("proposals")
          .update({
            hook: updatedHook,
            body: updatedBody,
            cta: updatedCta,
            status: "scheduled",
            scheduled_at: scheduledDate.toISOString(),
          })
          .eq("id", session.metadata.proposalId);
      } else {
        // Crear propuesta vinculada
        await supabase.from("proposals").insert({
          title: updatedHook.slice(0, 80) || "Carrusel Aprobado",
          format: "carrusel",
          hook: updatedHook,
          body: updatedBody,
          cta: updatedCta,
          status: "scheduled",
          scheduled_at: scheduledDate.toISOString(),
          dimension: "empresarial",
        });
      }

      // Marcar sesión de diálogo como aprobada
      await supabase
        .from("dialogue_sessions")
        .update({ status: "approved" })
        .eq("id", session.id);

      await qc.invalidateQueries({ queryKey: ["dialogue-sessions"] });
      await qc.invalidateQueries({ queryKey: ["proposals"] });

      toast({
        title: "Carrusel Aprobado y Agendado",
        description: `Las 5 diapositivas fueron guardadas y programadas para el ${formatScheduledAt(
          scheduledDate.toISOString()
        )}.`,
      });
    } catch (err) {
      console.error("Error al aprobar carrusel:", err);
      toast({
        variant: "destructive",
        title: "Fallo al agendar",
        description: err instanceof Error ? err.message : "Error al actualizar.",
      });
    } finally {
      setIsApprovingCustom(false);
    }
  };

  const statusVariant =
    session.status === "approved"
      ? "default"
      : session.status === "error"
      ? "destructive"
      : session.status === "needs_review"
      ? "secondary"
      : "outline";

  return (
    <Card className="transition-all border-border hover:border-primary/40 shadow-sm">
      <CardHeader className="cursor-pointer pb-3" onClick={onSelect}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <MessageSquare className="h-4 w-4 text-primary shrink-0" />
            <CardTitle className="text-base truncate">{session.topic || "Sin tema"}</CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {session.status === "needs_review" && onForceApprove && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/30 hover:bg-primary/10"
                disabled={isForcingApprove}
                onClick={(e) => {
                  e.stopPropagation();
                  onForceApprove(session.id);
                }}
              >
                {isForcingApprove ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                )}
                Aprobar directo
              </Button>
            )}
            <Badge variant={statusVariant}>
              {session.status === "approved"
                ? "Aprobado"
                : session.status === "error"
                ? "Error"
                : session.status === "needs_review"
                ? "Listo para Revisar"
                : "Debatiendo…"}
            </Badge>
            {isSelected ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Iniciada: {new Date(session.created_at).toLocaleString("es-AR")}
        </p>
      </CardHeader>

      {isSelected && (
        <CardContent className="space-y-6 border-t pt-5">
          {/* AVISO DE ERROR CON REINTENTO VISIBLE */}
          {session.status === "error" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">El debate se interrumpió o no pudo completarse:</p>
                  <p className="text-muted-foreground mt-0.5">
                    {session.metadata?.error || "Los agentes tardaron más de lo esperado o hubo un fallo de conectividad temporal."}
                  </p>
                </div>
              </div>
              {onRetry && session.topic && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/15 font-medium"
                  disabled={isRetrying}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(session.topic!);
                  }}
                >
                  <RotateCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                  Reintentar debate
                </Button>
              )}
            </div>
          )}

          {/* AVISO DE ESTADO EN VIVO O TIMEOUT */}
          {session.status === "active" && (
            isStale ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-semibold">El debate está tardando más de 90 segundos.</p>
                    <p className="text-muted-foreground mt-0.5">
                      Podés esperar unos instantes más o reiniciar el debate si la conexión se interrumpió.
                    </p>
                  </div>
                </div>
                {onRetry && session.topic && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-8 gap-1.5 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 font-medium"
                    disabled={isRetrying}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(session.topic!);
                    }}
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                    Reiniciar debate
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Los agentes están debatiendo el ángulo editorial de la pieza...
              </div>
            )
          )}

          {/* 2. INSPECTOR Y EDITOR INTERACTIVO DE DIAPOSITIVAS DEL CARRUSEL (SLIDES 1 A 5) */}
          <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Carrusel de 5 Diapositivas · Previsualización y Edición Inline
                </p>
                <p className="text-xs text-muted-foreground">
                  Navegá las láminas y editá el texto antes de aprobar.
                </p>
              </div>

              {/* Botones de selección de Slide */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-7 px-2.5 text-xs font-medium rounded-md transition-all ${
                      currentSlideIndex === idx
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Slide {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Vista Previa de la Diapositiva Actual */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Tarjeta Visual de Diapositiva */}
              <div className="md:col-span-5 flex flex-col justify-between h-[230px] rounded-xl bg-gradient-to-br from-[#1A3D84] to-[#0F2552] text-white p-4 shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-semibold text-white/80">
                  <Badge variant="outline" className="text-[10px] border-white/20 bg-white/10 text-white font-normal">
                    {slideTitles[currentSlideIndex]}
                  </Badge>
                  <span>SLIDE {currentSlideIndex + 1} / 5</span>
                </div>

                <div className="my-auto pr-2">
                  <p className="text-[14.5px] font-medium leading-snug line-clamp-5 text-white">
                    {slides[currentSlideIndex] || "Texto de la diapositiva..."}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-white/60 border-t border-white/10 pt-2">
                  <span>Mejora Continua</span>
                  <span>mejoraok.com</span>
                </div>
              </div>

              {/* Editor Inline de la Diapositiva */}
              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5 text-primary" />
                    Editar contenido de {slideTitles[currentSlideIndex]}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={currentSlideIndex === 0}
                      onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-[11px] text-muted-foreground px-1">
                      {currentSlideIndex + 1} de 5
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={currentSlideIndex === 4}
                      onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Textarea
                  rows={5}
                  value={slides[currentSlideIndex]}
                  onChange={(e) => handleUpdateSlideText(e.target.value)}
                  className="text-xs resize-none"
                  placeholder="Escribí el texto para esta diapositiva..."
                />
                <p className="text-[11px] text-muted-foreground">
                  Los cambios se reflejan al instante en la tarjeta visual de la izquierda.
                </p>
              </div>
            </div>

            {/* BOTÓN PROMINENTE DE APROBACIÓN Y AGENDADO */}
            <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Se programará automáticamente en el próximo horario sugerido
              </span>

              <Button
                size="default"
                className="bg-[#1A3D84] hover:bg-[#142e63] text-white font-semibold shadow gap-2"
                disabled={isApprovingCustom || session.status === "approved"}
                onClick={handleApproveAndSchedule}
              >
                {isApprovingCustom ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                {session.status === "approved" ? "Carrusel Ya Aprobado" : "Aprobar y Agendar Publicación"}
              </Button>
            </div>
          </div>

          {/* 3. ACORDEÓN COLAPSABLE PARA OCULTAR LA COMPLEJIDAD TÉCNICA DE LOGS */}
          <div className="rounded-xl border bg-muted/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTechnicalLogs(!showTechnicalLogs)}
              className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Detalle técnico del debate de agentes ({messages?.length || 0} intervenciones registradas)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-normal text-muted-foreground/70">
                  {showTechnicalLogs ? "Ocultar logs" : "Ver deliberación interna"}
                </span>
                {showTechnicalLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {showTechnicalLogs && (
              <div className="p-4 border-t space-y-3 bg-background/60 max-h-96 overflow-y-auto">
                {messages && messages.length > 0 ? (
                  (messages as DialogueMessage[]).map((msg: DialogueMessage) => {
                    const Icon = agentIcons[msg.agent] || Brain;
                    const colorClass = agentColors[msg.agent] || "text-gray-500 bg-gray-500/10";
                    const label = agentLabels[msg.agent] || msg.agent;

                    return (
                      <div key={msg.id} className="flex gap-3 text-xs">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-muted-foreground mb-1">
                            {label} · Turno {msg.turn}
                          </p>
                          <div className="rounded-lg border bg-card p-3 text-foreground whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No hay mensajes técnicos registrados todavía.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Caja de Feedback para re-debate con agentes */}
          {feedbackUsable && (
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-medium text-muted-foreground">
                ¿Querés pedirle un ajuste al equipo de agentes?
              </Label>
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  placeholder="Ej: Hacé el problema más crudo, o enfatizá la falta de números en la pyme... (Enter para enviar)"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="text-xs resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button size="icon" className="shrink-0 h-auto" onClick={send} disabled={!feedback.trim() || isContinuing}>
                  {isContinuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
