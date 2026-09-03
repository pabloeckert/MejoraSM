import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PipelineBadge } from "@/components/PipelineBadge";
import { toast } from "@/components/ui/use-toast";
import {
  CheckCircle,
  XCircle,
  Trash2,
  Pencil,
  Calendar,
  Repeat,
  Copy,
  Check,
  Loader2,
  Info,
  AlertTriangle,
} from "lucide-react";
import {
  useApproveProposal,
  useRejectProposal,
  useCancelProposal,
  useReactivateProposal,
  useScheduleProposal,
  useEditProposal,
  useDeleteProposal,
  useRescheduleProposal,
  useConvertProposalFormat,
} from "@/hooks/useProposals";
import { DIMENSIONES, PIPELINE_FORMATS } from "@/shared/constants";
import { PiecePreview } from "@/components/PiecePreview";
import { ProposalComments } from "@/components/ProposalComments";

// Hallazgo real 2026-08-26: Pablo reportó que en el detalle de una
// propuesta (abierto desde Propuestas o desde "Ver propuesta" en Monitor)
// solo veía el texto (hook/body/cta) y no la imagen final tal cual se ve
// publicada — el dato ya se traía (proposals.rendered_image_path viene con
// el `select("*")` de proposalsApi.list()), pero este diálogo nunca lo
// declaraba en su tipo ni lo renderizaba. Mismo RAW_BASE_URL que ya usa
// Dashboard.tsx para la misma columna.
const RAW_BASE_URL = "https://raw.githubusercontent.com/pabloeckert/MejoraSM/main";

// PM4 (auditoría 2026-08-31): estas listas viven en src/shared/constants.ts.
const OFERTAS = DIMENSIONES.map((d) => ({ value: d.key, label: d.label }));
const CONVERTIBLE_FORMATS = PIPELINE_FORMATS.map((f) => ({ value: f.value, label: f.label }));

export interface ProposalDetail {
  id: string;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  hashtags: string[] | null;
  format: string | null;
  status: string | null;
  rejection_reason: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string | null;
  oferta: string | null;
  zernio_post_id: string | null;
  rendered_image_path: string | null;
  is_test?: boolean | null;
  dialogue_sessions?: { topic: string | null } | null;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Formato datetime-local (sin segundos, hora local) a partir de un ISO real.
function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProposalDetailDialog({
  proposal,
  open,
  onOpenChange,
}: {
  proposal: ProposalDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const approveMutation = useApproveProposal();
  const rejectMutation = useRejectProposal();
  const cancelMutation = useCancelProposal();
  const reactivateMutation = useReactivateProposal();
  const scheduleMutation = useScheduleProposal();
  const editMutation = useEditProposal();
  const deleteMutation = useDeleteProposal();
  const rescheduleMutation = useRescheduleProposal();
  const convertMutation = useConvertProposalFormat();

  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({ title: "", hook: "", body: "", cta: "", hashtags: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleOferta, setScheduleOferta] = useState("");
  const [convertTo, setConvertTo] = useState("");
  const [copied, setCopied] = useState(false);

  // B22 (auditoría 2026-08-31): antes el reset dependía solo de proposal.id,
  // así que abrir la pieza A → Editar → cerrar sin guardar → reabrir la misma A
  // dejaba el modo edición y los cambios stale. Ahora también resetea al
  // cerrar el diálogo.
  useEffect(() => {
    if (!proposal) return;
    setIsEditing(false);
    setShowReject(false);
    setRejectReason("");
    setEditFields({
      title: proposal.title || "",
      hook: proposal.hook || "",
      body: proposal.body || "",
      cta: proposal.cta || "",
      hashtags: (proposal.hashtags || []).join(" "),
    });
    setScheduleDate(toDatetimeLocal(proposal.scheduled_at));
    setScheduleOferta(proposal.oferta || "");
    setConvertTo("");
    // Resetea solo cuando cambia la pieza abierta o el diálogo se abre/cierra
    // — depender de `proposal` entero pisaría una edición en curso en cada
    // refetch de la query (polling/invalidación), no en cada dato nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal?.id, open]);

  if (!proposal) return null;

  const isPublished = proposal.status === "published";
  const isScheduled = proposal.status === "scheduled";
  const isPending = proposal.status === "pending";
  const isApproved = proposal.status === "approved";
  const isRejected = proposal.status === "rejected";

  const fullCopy = [proposal.hook, "", proposal.body, "", proposal.cta, "", ...(proposal.hashtags || [])]
    .filter((l) => l !== null && l !== undefined)
    .join("\n");

  function handleCopy() {
    navigator.clipboard.writeText(fullCopy).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast({ title: "No se pudo copiar", description: "El navegador bloqueó el portapapeles.", variant: "destructive" })
    );
  }

  function handleSaveEdit() {
    editMutation.mutate(
      {
        id: proposal.id,
        fields: {
          title: editFields.title,
          hook: editFields.hook,
          body: editFields.body,
          cta: editFields.cta,
          hashtags: editFields.hashtags.split(/\s+/).filter(Boolean),
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast({ title: "Propuesta actualizada" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleDelete() {
    deleteMutation.mutate(proposal.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        onOpenChange(false);
        toast({ title: "Propuesta borrada" });
      },
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  // B23 (auditoría 2026-08-31): el aviso de "&lt; 30 min" no bloqueaba el submit
  // y no había ninguna validación de fecha pasada — una fecha vencida la
  // publica el cron en la siguiente corrida.
  function isPastDate(v: string) {
    return !v || new Date(v).getTime() <= Date.now();
  }

  function handleReschedule() {
    if (isPastDate(scheduleDate)) {
      toast({ title: "La fecha ya pasó", description: "Elegí una fecha y hora futuras.", variant: "destructive" });
      return;
    }
    rescheduleMutation.mutate(
      { id: proposal.id, date: new Date(scheduleDate).toISOString() },
      {
        onSuccess: () => toast({ title: "Fecha actualizada" }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleSchedule() {
    if (!scheduleOferta) return;
    if (isPastDate(scheduleDate)) {
      toast({ title: "La fecha ya pasó", description: "Elegí una fecha y hora futuras.", variant: "destructive" });
      return;
    }
    scheduleMutation.mutate(
      { id: proposal.id, date: new Date(scheduleDate).toISOString(), oferta: scheduleOferta },
      {
        onSuccess: () => toast({ title: "Propuesta programada" }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  // B3 (auditoría 2026-08-31): convertir una pieza ya `scheduled` hacia/desde
  // `historia` la deja fantasma — la UI la muestra "Se publica solo" pero
  // render-scheduled-posts.mjs solo levanta post/carrusel. Se bloquea ese caso.
  const convertBlocked =
    isScheduled && (convertTo === "historia" || proposal.format === "historia");

  function handleConvert() {
    if (!convertTo || convertTo === proposal.format) return;
    if (convertBlocked) {
      toast({
        title: "No se puede convertir así una pieza programada",
        description:
          "Cambiar de/hacia Story en una pieza ya programada la dejaría sin publicarse. Cancelala primero y volvé a agendarla.",
        variant: "destructive",
      });
      return;
    }
    convertMutation.mutate(
      { id: proposal.id, format: convertTo },
      {
        onSuccess: () => {
          toast({ title: `Formato cambiado a ${convertTo}` });
          setConvertTo("");
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleReactivate() {
    reactivateMutation.mutate(proposal.id, {
      onSuccess: () => toast({ title: "Propuesta reactivada", description: "Volvió a Pendiente — podés aprobarla o agendarla de nuevo." }),
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function handleApprove() {
    approveMutation.mutate(proposal.id, {
      onSuccess: () => toast({ title: "Propuesta aprobada" }),
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function handleReject() {
    rejectMutation.mutate(
      { id: proposal.id, reason: rejectReason },
      {
        onSuccess: () => {
          setShowReject(false);
          setRejectReason("");
          toast({ title: "Propuesta rechazada" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleCancelScheduled() {
    cancelMutation.mutate(proposal.id, {
      onSuccess: () => {
        setConfirmCancel(false);
        toast({ title: "Publicación cancelada", description: "La pieza quedó como Rechazada. Se puede reactivar desde el detalle." });
      },
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="line-clamp-2 text-base leading-snug">
              {proposal.hook || proposal.title || "Sin título"}
            </DialogTitle>
            <DialogDescription className="line-clamp-2">
              {proposal.dialogue_sessions?.topic || "Sin tema asociado"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <PipelineBadge format={proposal.format} />
            <Badge variant="outline">{proposal.format || "post"}</Badge>
            <Badge
              variant={isPublished ? "default" : isRejected ? "destructive" : isScheduled ? "default" : "secondary"}
            >
              {{
                pending: "Pendiente",
                approved: "Aprobada",
                rejected: "Rechazada",
                scheduled: "● En vivo — se publica sola",
                published: "Publicada",
              }[proposal.status || "pending"] || proposal.status}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            {isPublished && proposal.published_at
              ? `Publicada: ${fmtDate(proposal.published_at)}`
              : proposal.scheduled_at
              ? `Programada para: ${fmtDate(proposal.scheduled_at)}`
              : "Sin fecha de publicación ni programación"}
          </p>

          {proposal.rendered_image_path ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Así se ve la pieza, tal cual se publica</p>
              <img
                src={`${RAW_BASE_URL}/${proposal.rendered_image_path}`}
                alt="Imagen final renderizada"
                loading="lazy"
                className={cn(
                  "w-full rounded-md border border-border bg-muted object-contain",
                  proposal.format === "historia" ? "aspect-[9/16]" : "aspect-[4/5]"
                )}
              />
            </div>
          ) : (
            !isRejected && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Cómo va a quedar la pieza</p>
                <PiecePreview format={proposal.format} oferta={proposal.oferta} hook={proposal.hook} body={proposal.body} />
              </div>
            )
          )}

          {isRejected && proposal.rejection_reason && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
              Motivo de rechazo: {proposal.rejection_reason}
            </p>
          )}

          {isPublished && (
            <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Ya está publicada{proposal.zernio_post_id ? ` (Zernio: ${proposal.zernio_post_id})` : ""} — no se
                edita ni se borra desde acá para no desincronizar lo que ya salió en Instagram/Facebook. Para
                corregirla o bajarla, usá "Reintentar"/"Despublicar" desde el Monitor.
              </span>
            </div>
          )}

          {/* CONTENIDO — lectura o edición */}
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={editFields.title} onChange={(e) => setEditFields((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hook</Label>
                <Input value={editFields.hook} onChange={(e) => setEditFields((f) => ({ ...f, hook: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  rows={5}
                  value={editFields.body}
                  onChange={(e) => setEditFields((f) => ({ ...f, body: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CTA</Label>
                <Input value={editFields.cta} onChange={(e) => setEditFields((f) => ({ ...f, cta: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hashtags (separados por espacio)</Label>
                <Input
                  value={editFields.hashtags}
                  onChange={(e) => setEditFields((f) => ({ ...f, hashtags: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={editMutation.isPending}>
                  {editMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {proposal.hook && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">HOOK</p>
                  <p>{proposal.hook}</p>
                </div>
              )}
              {proposal.body && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">BODY</p>
                  <p className="whitespace-pre-wrap">{proposal.body}</p>
                </div>
              )}
              {proposal.cta && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">CTA</p>
                  <p>{proposal.cta}</p>
                </div>
              )}
              {proposal.hashtags && proposal.hashtags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">HASHTAGS</p>
                  <p className="text-muted-foreground">{proposal.hashtags.join(" ")}</p>
                </div>
              )}
            </div>
          )}

          {/* ACCIONES DE ESTADO */}
          {!isPublished && !isEditing && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {isPending && (
                <Button size="sm" onClick={handleApprove} disabled={approveMutation.isPending}>
                  {approveMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Aprobar
                </Button>
              )}
              {(isPending || isApproved) && (
                <Button size="sm" variant="outline" onClick={() => setShowReject((v) => !v)}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5 text-destructive" />
                  Rechazar
                </Button>
              )}
              {isScheduled && (
                <Button size="sm" variant="outline" onClick={() => setConfirmCancel(true)} disabled={cancelMutation.isPending}>
                  {cancelMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Cancelar publicación
                </Button>
              )}
              {isRejected && (
                <Button size="sm" onClick={handleReactivate} disabled={reactivateMutation.isPending}>
                  {reactivateMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Repeat className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Reactivar
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                Copiar
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Borrar
              </Button>
            </div>
          )}

          {showReject && !isPublished && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label>Razón del rechazo (opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Ej: No coincide con el tono de la marca..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>
                  Cancelar
                </Button>
                <Button size="sm" variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
                  {rejectMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Confirmar rechazo
                </Button>
              </div>
            </div>
          )}

          {/* AGENDAR (todavía sin fecha) / REPROGRAMAR (ya programada) */}
          {!isPublished && !isEditing && (isScheduled || isPending || isApproved) && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label className="flex items-center gap-1.5">
                {isScheduled ? <Repeat className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                {isScheduled ? "Reprogramar" : "Agendar"}
              </Label>
              <Input
                type="datetime-local"
                min={toDatetimeLocal(new Date().toISOString())}
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
              {scheduleDate && new Date(scheduleDate).getTime() - Date.now() < 30 * 60 * 1000 && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Esto se publica en menos de 30 minutos, sin más revisión — confirmá que la fecha/hora es la correcta.
                </p>
              )}
              {!isScheduled && (
                <Select value={scheduleOferta} onValueChange={setScheduleOferta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Dimensión del servicio (de dónde sale la foto)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {OFERTAS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex justify-end">
                {isScheduled ? (
                  <Button
                    size="sm"
                    onClick={handleReschedule}
                    disabled={!scheduleDate || rescheduleMutation.isPending}
                  >
                    {rescheduleMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Guardar nueva fecha
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSchedule}
                    disabled={!scheduleDate || !scheduleOferta || scheduleMutation.isPending}
                  >
                    {scheduleMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Programar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* CONVERTIR FORMATO */}
          {!isPublished && !isEditing && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label>Convertir formato</Label>
              <p className="text-[11px] text-muted-foreground">
                Solo cambia el campo format — no agenda ni desagenda la pieza por su cuenta.
                {isScheduled && " En una pieza ya programada no se puede pasar de/hacia Story (la dejaría sin publicarse)."}
              </p>
              <div className="flex gap-2">
                <Select value={convertTo} onValueChange={setConvertTo}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Elegir formato..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONVERTIBLE_FORMATS.filter((f) => f.value !== proposal.format)
                      .filter((f) => !(isScheduled && (f.value === "historia" || proposal.format === "historia")))
                      .map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleConvert}
                  disabled={!convertTo || convertBlocked || convertMutation.isPending}
                >
                  {convertMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Convertir
                </Button>
              </div>
            </div>
          )}

          <ProposalComments proposalId={proposal.id} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Borrar esta propuesta?"
        description="No se puede deshacer. La propuesta se elimina por completo de Supabase."
        confirmText="Borrar"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="¿Cancelar esta publicación?"
        description="La pieza no va a salir. Queda como Rechazada — la podés reactivar después desde su detalle, pero perdés el horario que tenía."
        confirmText="Cancelar publicación"
        variant="destructive"
        onConfirm={handleCancelScheduled}
      />
    </>
  );
}
