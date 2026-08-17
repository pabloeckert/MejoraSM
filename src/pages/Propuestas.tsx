import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  CheckCircle,
  Clock,
  Loader2,
  Calendar,
  Copy,
  Check,
  FileText,
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useProposals, usePendingProposals, useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from "@/hooks/useProposals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/components/ui/use-toast";
import { PipelineBadge } from "@/components/PipelineBadge";
import { ProposalDetailDialog, type ProposalDetail } from "@/components/ProposalDetailDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Filtro por tipo de posteo, sobre el campo proposals.format. "historia" es
// el valor real que usa el código (extractProposal en orchestrator/index.ts)
// para lo que acá se etiqueta "Story". "video" todavía no lo genera nada
// (ni orchestrator ni el pipeline de publicación) — el tab existe igual,
// a propósito, para no ocultar la categoría aunque hoy esté vacía. No es
// convertible (proposals_format_check ni siquiera lo permite).
const FORMATOS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "post", label: "Post Feed" },
  { value: "carrusel", label: "Carrusel" },
  { value: "historia", label: "Story" },
  { value: "video", label: "Video" },
];

const TEMPLATE_FORMATS = FORMATOS.filter((f) => f.value !== "all" && f.value !== "video");

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  approved: { label: "Aprobada", variant: "default" },
  rejected: { label: "Rechazada", variant: "destructive" },
  scheduled: { label: "Programada", variant: "outline" },
  published: { label: "Publicada", variant: "default" },
};

export default function Propuestas() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <PropuestasContent />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

function PropuestasContent() {
  const { data: allProposals, isLoading } = useProposals();
  const { data: pendingProposals } = usePendingProposals();

  // Se guarda el id, no el objeto — así el modal siempre muestra el estado
  // real después de aprobar/reprogramar/convertir sin cerrarlo (antes
  // quedaba mostrando el snapshot viejo de cuando se abrió, aunque la
  // mutación ya hubiera pegado en Supabase).
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<string>("all");

  // Interconexión entre secciones: /propuestas?id=<uuid> abre el detalle
  // directo — lo usa Monitor (y cualquier otro lado que enlace a una pieza
  // puntual) para poder seguirla de punta a punta sin tener que buscarla a
  // mano en la lista.
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setSelectedProposalId(id);
  }, [searchParams]);

  const selectedProposal: ProposalDetail | null = selectedProposalId
    ? (allProposals || []).find((p: ProposalDetail) => p.id === selectedProposalId) ?? null
    : null;

  const handleCopy = (proposal: ProposalDetail) => {
    const text = [proposal.hook, "", proposal.body, "", proposal.cta, "", ...(proposal.hashtags || [])]
      .filter((l) => l !== null && l !== undefined)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedId(proposal.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const matchesFormat = (p: ProposalDetail) => formatFilter === "all" || p.format === formatFilter;
  const filteredProposals: ProposalDetail[] = (allProposals || []).filter(matchesFormat);
  const filteredPending: ProposalDetail[] = (pendingProposals || []).filter(matchesFormat);

  const approved = filteredProposals.filter((p) => p.status === "approved");
  const scheduled = filteredProposals.filter((p) => p.status === "scheduled");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Propuestas de Contenido</h1>
        <p className="mt-1 text-muted-foreground">
          Los posts y carruseles de feed se agendan y publican solos (mirá el badge "Se publica solo" en cada
          pieza). Esta pantalla es el monitor: click en cualquier pieza abre el detalle, con todas las acciones
          reales — aprobar, rechazar, agendar, editar, borrar o convertir formato.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FORMATOS.map((f) => (
          <Button
            key={f.value}
            type="button"
            size="sm"
            variant={formatFilter === f.value ? "default" : "outline"}
            onClick={() => setFormatFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pendientes
            {filteredPending.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {filteredPending.length}
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
          <TabsTrigger value="templates" className="gap-1.5">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPending.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              text={
                formatFilter === "all"
                  ? "No hay propuestas pendientes"
                  : `No hay propuestas pendientes de tipo "${FORMATOS.find((f) => f.value === formatFilter)?.label}"`
              }
              sub="Cuando los agentes generen contenido, aparecerá acá para tu aprobación."
            />
          ) : (
            <div className="space-y-3">
              {filteredPending.map((p) => (
                <ProposalListItem
                  key={p.id}
                  proposal={p}
                  onOpen={() => setSelectedProposalId(p.id)}
                  onCopy={() => handleCopy(p)}
                  copied={copiedId === p.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {approved.length === 0 ? (
            <EmptyState icon={FileText} text="No hay propuestas aprobadas aún." />
          ) : (
            <div className="space-y-3">
              {approved.map((p) => (
                <ProposalListItem
                  key={p.id}
                  proposal={p}
                  onOpen={() => setSelectedProposalId(p.id)}
                  onCopy={() => handleCopy(p)}
                  copied={copiedId === p.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <p className="mb-4 text-xs text-muted-foreground">
            Los posts y carruseles se agendan solos apenas los aprueba el Crítico en Mesa de Diálogo. Abrí la
            pieza para reprogramarla o cancelarla antes de que salga.
          </p>
          {scheduled.length === 0 ? (
            <EmptyState icon={Calendar} text="No hay propuestas programadas." />
          ) : (
            <div className="space-y-3">
              {scheduled.map((p) => (
                <ProposalListItem
                  key={p.id}
                  proposal={p}
                  onOpen={() => setSelectedProposalId(p.id)}
                  onCopy={() => handleCopy(p)}
                  copied={copiedId === p.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {filteredProposals.length === 0 ? (
            <EmptyState
              icon={FileText}
              text={
                formatFilter === "all"
                  ? "No hay propuestas todavía."
                  : `No hay propuestas de tipo "${FORMATOS.find((f) => f.value === formatFilter)?.label}" todavía.`
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredProposals.map((p) => (
                <ProposalListItem
                  key={p.id}
                  proposal={p}
                  onOpen={() => setSelectedProposalId(p.id)}
                  onCopy={() => handleCopy(p)}
                  copied={copiedId === p.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesSection />
        </TabsContent>
      </Tabs>

      <ProposalDetailDialog
        proposal={selectedProposal}
        open={!!selectedProposal}
        onOpenChange={(open) => !open && setSelectedProposalId(null)}
      />
    </div>
  );
}

function EmptyState({ icon: Icon, text, sub }: { icon: typeof FileText; text: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12">
        <Icon className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{text}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground/70">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ProposalListItem({
  proposal,
  onOpen,
  onCopy,
  copied,
}: {
  proposal: ProposalDetail;
  onOpen: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const status = STATUS_META[proposal.status || "pending"] || STATUS_META.pending;

  return (
    <Card className="transition-colors hover:bg-muted/40">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <PipelineBadge format={proposal.format} />
            <Badge variant="outline" className="text-[10px]">
              {proposal.format || "post"}
            </Badge>
            <Badge variant={status.variant} className="text-[10px]">
              {status.label}
            </Badge>
          </div>
          <p className="truncate text-sm font-semibold">{proposal.hook || proposal.title || "Sin título"}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{proposal.body}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {proposal.scheduled_at
              ? `Programada: ${new Date(proposal.scheduled_at).toLocaleDateString("es-AR")}`
              : proposal.created_at
              ? `Creada: ${new Date(proposal.created_at).toLocaleDateString("es-AR")}`
              : null}
          </p>
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════
// PLANTILLAS — solo estructura (listar/crear/editar), sin motor de render
// (ver migración 010_templates.sql). Se conecta a futuro con
// templates/post-template.html y templates/story-template.html.
// ═══════════════════════════════════════

interface TemplateRecord {
  id: string;
  name: string;
  format: string;
  notes: string | null;
}

function TemplatesSection() {
  const { data: templates, isLoading } = useTemplates();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();

  const [editing, setEditing] = useState<TemplateRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TemplateRecord | null>(null);
  const [form, setForm] = useState({ name: "", format: "post", notes: "" });

  const openCreate = () => {
    setForm({ name: "", format: "post", notes: "" });
    setEditing(null);
    setIsCreating(true);
  };

  const openEdit = (t: TemplateRecord) => {
    setForm({ name: t.name, format: t.format, notes: t.notes || "" });
    setEditing(t);
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, fields: form },
        {
          onSuccess: () => {
            setIsCreating(false);
            toast({ title: "Plantilla actualizada" });
          },
          onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          setIsCreating(false);
          toast({ title: "Plantilla creada" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast({ title: "Plantilla borrada" });
      },
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Estructura de plantillas reutilizables — todavía sin motor de render (eso viene después). Real, no de
          mentira: se guardan en Supabase.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nueva plantilla
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState icon={LayoutTemplate} text="Sin plantillas todavía." sub="Creá la primera con el botón de arriba." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t: TemplateRecord) => (
            <Card key={t.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {t.format}
                    </Badge>
                  </div>
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  {t.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <Select value={form.format} onValueChange={(v) => setForm((f) => ({ ...f, format: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea
                rows={3}
                placeholder="Dirección visual, cuándo usarla, etc."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                {editing ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="¿Borrar esta plantilla?"
        description="No se puede deshacer."
        confirmText="Borrar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
