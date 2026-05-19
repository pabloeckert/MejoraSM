import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  Copy,
  Check,
  Send,
  FileText,
  Eye,
} from "lucide-react";
import {
  useProposals,
  usePendingProposals,
  useApproveProposal,
  useRejectProposal,
  useScheduleProposal,
} from "@/features/laboratorio/hooks/useProposals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/components/ui/use-toast";

export default function Propuestas() {
  return (
    <ErrorBoundary>
      <PropuestasContent />
    </ErrorBoundary>
  );
}

function PropuestasContent() {
  const { data: allProposals, isLoading } = useProposals();
  const { data: pendingProposals } = usePendingProposals();
  const approveMutation = useApproveProposal();
  const rejectMutation = useRejectProposal();
  const scheduleMutation = useScheduleProposal();

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [previewTarget, setPreviewTarget] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    approveMutation.mutate(id, {
      onSuccess: () => toast({ title: "Propuesta aprobada" }),
      onError: (err: any) =>
        toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    rejectMutation.mutate(
      { id: rejectTarget, reason: rejectReason },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectReason("");
          toast({ title: "Propuesta rechazada" });
        },
        onError: (err: any) =>
          toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleSchedule = () => {
    if (!scheduleTarget || !scheduleDate) return;
    scheduleMutation.mutate(
      { id: scheduleTarget, date: scheduleDate },
      {
        onSuccess: () => {
          setScheduleTarget(null);
          setScheduleDate("");
          toast({ title: "Propuesta programada" });
        },
        onError: (err: any) =>
          toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const approved = (allProposals || []).filter((p: any) => p.status === "approved");
  const rejected = (allProposals || []).filter((p: any) => p.status === "rejected");
  const scheduled = (allProposals || []).filter((p: any) => p.status === "scheduled");
  const published = (allProposals || []).filter((p: any) => p.status === "published");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Propuestas de Contenido</h1>
        <p className="mt-1 text-muted-foreground">
          Revisá, aprobá o rechazá las propuestas generadas por los agentes.
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pendientes
            {pendingProposals && pendingProposals.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {pendingProposals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="h-3.5 w-3.5" />
            Aprobadas
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar className="h-3.5 w-3.5" />
            Programadas
          </TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>

        {/* PENDIENTES */}
        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !pendingProposals || pendingProposals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-16">
                <CheckCircle className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">
                  No hay propuestas pendientes
                </p>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  Cuando los agentes generen contenido, aparecerá acá para tu aprobación.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingProposals.map((p: any) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  onApprove={() => handleApprove(p.id)}
                  onReject={() => setRejectTarget(p.id)}
                  onSchedule={() => setScheduleTarget(p.id)}
                  onPreview={() => setPreviewTarget(p)}
                  onCopy={handleCopy}
                  copiedId={copiedId}
                  isApproving={approveMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* APROBADAS */}
        <TabsContent value="approved" className="mt-6">
          {approved.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <FileText className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No hay propuestas aprobadas aún.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {approved.map((p: any) => (
                <ProposalRow key={p.id} proposal={p} onCopy={handleCopy} copiedId={copiedId} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* PROGRAMADAS */}
        <TabsContent value="scheduled" className="mt-6">
          {scheduled.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Calendar className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No hay propuestas programadas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {scheduled.map((p: any) => (
                <ProposalRow key={p.id} proposal={p} onCopy={handleCopy} copiedId={copiedId} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TODAS */}
        <TabsContent value="all" className="mt-6">
          {!allProposals || allProposals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <FileText className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No hay propuestas todavía.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allProposals.map((p: any) => (
                <ProposalRow key={p.id} proposal={p} onCopy={handleCopy} copiedId={copiedId} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* REJECT DIALOG */}
      <Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar propuesta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Razón del rechazo (opcional)</Label>
              <Textarea
                placeholder="Ej: No coincide con el tono de la marca, el hook no conecta..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SCHEDULE DIALOG */}
      <Dialog open={!!scheduleTarget} onOpenChange={(v) => !v && setScheduleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar publicación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha y hora de publicación</Label>
              <Input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScheduleTarget(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={!scheduleDate || scheduleMutation.isPending}
              >
                {scheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Programar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PREVIEW DIALOG */}
      <Dialog open={!!previewTarget} onOpenChange={(v) => !v && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">HOOK</p>
                <p className="text-sm font-semibold">{previewTarget.hook}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">COPY</p>
                <p className="text-sm whitespace-pre-wrap">{previewTarget.body}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">CTA</p>
                <p className="text-sm">{previewTarget.cta}</p>
              </div>
              {previewTarget.hashtags?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">HASHTAGS</p>
                  <div className="flex flex-wrap gap-1">
                    {previewTarget.hashtags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    handleApprove(previewTarget.id);
                    setPreviewTarget(null);
                  }}
                >
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const full = `${previewTarget.hook}\n\n${previewTarget.body}\n\n${previewTarget.cta}\n\n${previewTarget.hashtags?.join(" ")}`;
                    handleCopy(full, previewTarget.id);
                  }}
                >
                  {copiedId === previewTarget.id ? (
                    <Check className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Copy className="mr-1.5 h-4 w-4" />
                  )}
                  Copiar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProposalCard({
  proposal,
  onApprove,
  onReject,
  onSchedule,
  onPreview,
  onCopy,
  copiedId,
  isApproving,
}: {
  proposal: any;
  onApprove: () => void;
  onReject: () => void;
  onSchedule: () => void;
  onPreview: () => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  isApproving: boolean;
}) {
  const fullCopy = `${proposal.hook || ""}\n\n${proposal.body || ""}\n\n${proposal.cta || ""}`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{proposal.format || "post"}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(proposal.created_at).toLocaleDateString("es-AR")}
              </span>
            </div>
            <p className="text-sm font-semibold truncate">{proposal.hook || proposal.title || "Sin título"}</p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {proposal.body?.slice(0, 150)}...
            </p>
            {proposal.dialogue_sessions?.topic && (
              <p className="mt-1 text-xs text-muted-foreground">
                Tema: {proposal.dialogue_sessions.topic}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" onClick={onApprove} disabled={isApproving}>
              {isApproving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              Aprobar
            </Button>
            <Button size="sm" variant="outline" onClick={onPreview}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Ver
            </Button>
            <Button size="sm" variant="outline" onClick={onSchedule}>
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Agendar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCopy(fullCopy, proposal.id)}
            >
              {copiedId === proposal.id ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              Copiar
            </Button>
            <Button size="sm" variant="ghost" onClick={onReject}>
              <XCircle className="mr-1.5 h-3.5 w-3.5 text-destructive" />
              Rechazar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProposalRow({
  proposal,
  onCopy,
  copiedId,
}: {
  proposal: any;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pending: { label: "Pendiente", variant: "secondary" },
    approved: { label: "Aprobada", variant: "default" },
    rejected: { label: "Rechazada", variant: "destructive" },
    scheduled: { label: "Programada", variant: "outline" },
    published: { label: "Publicada", variant: "default" },
  };

  const status = statusConfig[proposal.status] || statusConfig.pending;
  const fullCopy = `${proposal.hook || ""}\n\n${proposal.body || ""}\n\n${proposal.cta || ""}`;

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {proposal.hook || proposal.title || "Sin título"}
            </p>
            <Badge variant={status.variant} className="text-[10px]">
              {status.label}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {proposal.format || "post"}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            {proposal.body?.slice(0, 120)}...
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          {proposal.scheduled_at && (
            <span className="text-xs text-muted-foreground">
              {new Date(proposal.scheduled_at).toLocaleDateString("es-AR")}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCopy(fullCopy, proposal.id)}
          >
            {copiedId === proposal.id ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
