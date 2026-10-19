import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState, useMemo } from "react";
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
  Download,
  CheckSquare,
  Share2,
  ThumbsUp,
  MessageCircle,
  Send,
  Bookmark,
  Heart,
  Globe,
  Eye,
} from "lucide-react";
import JSZip from "jszip";
import {
  useApproveProposal,
  useRejectProposal,
  useCancelProposal,
  useReactivateProposal,
  useScheduleProposal,
  useEditProposal,
  useDeleteProposal,
  useRescheduleProposal,
} from "@/hooks/useProposals";
import { DIMENSIONES } from "@/shared/constants";
import { ProposalComments } from "@/components/ProposalComments";
import {
  toCanonicalPropuesta,
  generarPaqueteMulticanal,
  CONFIGURACION_BORRADORES,
  type PropuestaMejoraSMDTO,
  type OpcionBorrador,
  type CopyCalibradoTresPasos,
} from "@/domain/types";
import { approveLocalProposal } from "@/services/localSMService";

// Resuelve URLs locales relativas o remotas con integridad
export function getAssetUrl(ruta: string): string {
  if (!ruta) return "";
  if (ruta.startsWith("http://") || ruta.startsWith("https://")) return ruta;
  return ruta.startsWith("/") ? ruta : `/${ruta}`;
}

const OFERTAS = DIMENSIONES.map((d) => ({ value: d.key, label: d.label }));

// Fotos reales verificadas existentes en disco en content/boveda/04_networking/
const FOTOS_BOVEDA_DISPONIBLES = [
  { id: "BOV-2026-NET-001", titulo: "Encuentro Directivo C-Level Rosario", ruta: "content/boveda/04_networking/img_clevel_rosario_2026.jpg" },
  { id: "BOV-2026-NET-002", titulo: "Recorrida de Planta Operativa", ruta: "content/boveda/04_networking/visita_planta_industrial_2026.jpg" },
  { id: "BOV-2026-NET-003", titulo: "Mesa de Trabajo Estratégica", ruta: "content/boveda/04_networking/mesa_liderazgo_foco_2026.jpg" },
  { id: "BOV-2026-NET-004", titulo: "Negociación y Alianzas B2B C-Level", ruta: "content/boveda/04_networking/alianza_comercial_b2b_2026.jpg" },
  { id: "BOV-2026-NET-005", titulo: "Tableros de Control Directivo y Profesionalización", ruta: "content/boveda/04_networking/tablero_control_directivo_2026.jpg" },
  { id: "BOV-2026-NET-006", titulo: "After Office Directivo (Regla 12x12)", ruta: "content/boveda/04_networking/after_office_directivo_2026.jpg" },
];

export interface ProposalDetail {
  id: string;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  hashtags: string[] | null;
  format: string;
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
  propuesta_id?: string;
  borradores?: any[];
  borrador_seleccionado?: OpcionBorrador;
  tratamiento_visual?: any;
  imagen_boveda_vinculada?: any;
  buyer_persona?: string | null;
  dimension?: string | null;
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
  onApproveBatch,
  totalLote = 0,
  onApprove,
}: {
  proposal: ProposalDetail | PropuestaMejoraSMDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproveBatch?: () => void;
  totalLote?: number;
  onApprove?: (id: string) => void;
}) {
  if (!proposal) return null;

  return (
    <ProposalDetailModal
      proposal={proposal}
      open={open}
      onOpenChange={onOpenChange}
      onApproveBatch={onApproveBatch}
      totalLote={totalLote}
      onApprove={onApprove}
    />
  );
}

function ProposalDetailModal({
  proposal: rawProp,
  open,
  onOpenChange,
  onApproveBatch,
  totalLote = 0,
  onApprove,
}: {
  proposal: ProposalDetail | PropuestaMejoraSMDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproveBatch?: () => void;
  totalLote?: number;
  onApprove?: (id: string) => void;
}) {
  const approveMutation = useApproveProposal();
  const rejectMutation = useRejectProposal();
  const cancelMutation = useCancelProposal();
  const reactivateMutation = useReactivateProposal();
  const scheduleMutation = useScheduleProposal();
  const editMutation = useEditProposal();
  const deleteMutation = useDeleteProposal();
  const rescheduleMutation = useRescheduleProposal();

  // Adaptación canónica garantizada no nula
  const canonical: PropuestaMejoraSMDTO = useMemo(() => {
    return toCanonicalPropuesta(rawProp);
  }, [rawProp]);

  // Selección de borrador activo (Opción A, B o C)
  const [selectedOpcion, setSelectedOpcion] = useState<OpcionBorrador>("A");

  // Edición del texto en 3 pasos
  const [isEditing, setIsEditing] = useState(false);
  const [editCopy3Pasos, setEditCopy3Pasos] = useState<CopyCalibradoTresPasos>({
    paso1_dolor: "",
    paso2_reencuadre: "",
    paso3_direccion_web: "",
  });
  const [editTitulo, setEditTitulo] = useState("");

  // Imagen vinculada de la Bóveda
  const [imagenVinculada, setImagenVinculada] = useState<string>("");
  const [selectorImagenAbierto, setSelectorImagenAbierto] = useState(false);

  // Estados de control y modales secundarios
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmApproveBatch, setConfirmApproveBatch] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleOferta, setScheduleOferta] = useState("");
  const [copied, setCopied] = useState(false);

  // Inicialización al abrir la propuesta
  useEffect(() => {
    setIsEditing(false);
    setShowReject(false);
    setRejectReason("");
    setSelectedOpcion(canonical.borrador_seleccionado || "A");

    const borradorActivo =
      canonical.borradores.find((b) => b.opcion === (canonical.borrador_seleccionado || "A")) ||
      canonical.borradores[0];

    setEditTitulo(borradorActivo.titulo_portada);
    setEditCopy3Pasos({ ...borradorActivo.copy_tres_pasos });
    setImagenVinculada(
      canonical.imagen_boveda_vinculada.ruta_archivo_local || (rawProp as ProposalDetail)?.rendered_image_path || ""
    );
    setScheduleDate(toDatetimeLocal(canonical.dia_programado));
    setScheduleOferta((rawProp as ProposalDetail)?.oferta || "");
  }, [canonical, rawProp, open]);

  // Al conmutar entre borradores A, B y C
  const handleSelectOpcion = (opcion: OpcionBorrador) => {
    setSelectedOpcion(opcion);
    const borrador = canonical.borradores.find((b) => b.opcion === opcion) || canonical.borradores[0];
    setEditTitulo(borrador.titulo_portada);
    setEditCopy3Pasos({ ...borrador.copy_tres_pasos });
  };

  const currentBorrador =
    canonical.borradores.find((b) => b.opcion === selectedOpcion) || canonical.borradores[0];

  const isPublished = canonical.estado === "publicado";
  const isApproved = canonical.estado === "aprobado";
  const isPending = canonical.estado === "pendiente_revision";
  const isRejected = canonical.estado === "rechazado";
  const isScheduled = isApproved && Boolean(canonical.dia_programado);

  // Paquete multicanal generado en 1 clic
  const paqueteMulticanal = generarPaqueteMulticanal({
    ...canonical,
    borrador_seleccionado: selectedOpcion,
    imagen_boveda_vinculada: {
      ...canonical.imagen_boveda_vinculada,
      ruta_archivo_local: imagenVinculada,
    },
  });

  function handleCopyMulticanal(tipo: "whatsapp" | "linkedin") {
    const texto = tipo === "whatsapp" ? paqueteMulticanal.textoWhatsApp : paqueteMulticanal.textoLinkedIn;
    navigator.clipboard.writeText(texto).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: `Copiado para ${tipo === "whatsapp" ? "WhatsApp" : "LinkedIn"}` });
      },
      () => toast({ title: "Error", description: "El navegador bloqueó el portapapeles.", variant: "destructive" })
    );
  }

  const [canalPreview, setCanalPreview] = useState<"linkedin" | "instagram" | "facebook">("linkedin");
  const [downloadingZip, setDownloadingZip] = useState(false);

  async function handleDownloadPaquete() {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();

      // 1. Copy formateado para WhatsApp (con asteriscos, emojis oficiales y regla 80/20)
      zip.file(`${canonical.propuesta_id}_whatsapp.txt`, paqueteMulticanal.textoWhatsApp);

      // 2. Copy formateado para LinkedIn y Redes
      zip.file(`${canonical.propuesta_id}_redes.txt`, paqueteMulticanal.textoLinkedIn);

      // 3. Metadata canónica JSON
      zip.file(`${canonical.propuesta_id}_metadata.json`, paqueteMulticanal.metadataJson);

      // 4. Archivo de imagen de Bóveda
      const imgUrl = getAssetUrl(imagenVinculada);
      if (imgUrl) {
        try {
          const res = await fetch(imgUrl);
          if (res.ok) {
            const blob = await res.blob();
            const ext = imgUrl.endsWith(".png") ? "png" : "jpg";
            zip.file(`${canonical.propuesta_id}_foto_boveda.${ext}`, blob);
          }
        } catch (fetchErr) {
          console.warn("[ProposalDetailDialog] No se pudo adjuntar imagen binaria al ZIP:", fetchErr);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${canonical.propuesta_id}_paquete_completo.zip`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "📥 Paquete Completo Descargado (ZIP)",
        description: "Contiene la imagen de Bóveda y el copy formateado para WhatsApp.",
      });
    } catch (err) {
      console.error("Error generando ZIP:", err);
      // Fallback a descarga de texto directo
      const blob = new Blob([paqueteMulticanal.textoWhatsApp], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${canonical.propuesta_id}_whatsapp.txt`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Paquete descargado en 1 clic" });
    } finally {
      setDownloadingZip(false);
    }
  }

  function handleSaveEdit() {
    const fullBody = `${editCopy3Pasos.paso1_dolor}\n\n${editCopy3Pasos.paso2_reencuadre}\n\n${editCopy3Pasos.paso3_direccion_web}`;
    editMutation.mutate(
      {
        id: canonical.propuesta_id,
        fields: {
          title: editTitulo,
          hook: editCopy3Pasos.paso1_dolor,
          body: fullBody,
          cta: editCopy3Pasos.paso3_direccion_web,
          hashtags: ["#MejoraContinua", "#Empresas", "#Liderazgo"],
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast({ title: "Texto calibrado actualizado" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleDelete() {
    deleteMutation.mutate(canonical.propuesta_id, {
      onSuccess: () => {
        setConfirmDelete(false);
        onOpenChange(false);
        toast({ title: "Propuesta eliminada" });
      },
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function isPastDate(v: string) {
    return !v || new Date(v).getTime() <= Date.now();
  }

  function handleReschedule() {
    if (isPastDate(scheduleDate)) {
      toast({ title: "La fecha ya pasó", description: "Elegí una fecha y hora futuras.", variant: "destructive" });
      return;
    }
    rescheduleMutation.mutate(
      { id: canonical.propuesta_id, date: new Date(scheduleDate).toISOString() },
      {
        onSuccess: () => toast({ title: "Fecha de publicación actualizada" }),
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
      { id: canonical.propuesta_id, date: new Date(scheduleDate).toISOString(), oferta: scheduleOferta },
      {
        onSuccess: () => toast({ title: "Propuesta programada con éxito" }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleApprove() {
    approveLocalProposal(canonical.propuesta_id);
    if (onApprove) {
      onApprove(canonical.propuesta_id);
    }
    approveMutation.mutate(canonical.propuesta_id, {
      onSuccess: () => {
        toast({ title: "Propuesta aprobada individualmente" });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Propuesta aprobada individualmente" });
        onOpenChange(false);
      },
    });
  }

  function handleApproveAllBatch() {
    if (onApproveBatch) {
      onApproveBatch();
      setConfirmApproveBatch(false);
      onOpenChange(false);
      toast({ title: "Lote completo aprobado con éxito" });
    } else {
      handleApprove();
      setConfirmApproveBatch(false);
    }
  }

  function handleReject() {
    rejectMutation.mutate(
      { id: canonical.propuesta_id, reason: rejectReason },
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

  function handleReactivate() {
    reactivateMutation.mutate(canonical.propuesta_id, {
      onSuccess: () => toast({ title: "Propuesta reactivada" }),
      onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl flex flex-col p-0 overflow-hidden bg-white text-foreground border border-slate-200 shadow-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-blue-800 tracking-wider">
                {canonical.propuesta_id}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs uppercase font-semibold text-slate-700">
                  {canonical.canal_destino}
                </Badge>
                <Badge
                  variant={isPublished ? "default" : isRejected ? "destructive" : isApproved ? "default" : "secondary"}
                >
                  {{
                    pendiente_revision: "Pendiente de Revisión",
                    aprobado: "Aprobada",
                    publicado: "Publicada",
                    rechazado: "Rechazada",
                    pausado: "Pausada",
                  }[canonical.estado]}
                </Badge>
              </div>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 pt-1 line-clamp-2">
              {currentBorrador.titulo_portada}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {canonical.dia_programado ? `Programado: ${fmtDate(canonical.dia_programado)}` : "Sin fecha programada"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* BARRA SUPERIOR DE ACCIONES DE LOTE, DESCARGA Y PESTAÑAS */}
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={downloadingZip}
                onClick={handleDownloadPaquete}
                className="bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800"
              >
                {downloadingZip ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-blue-700" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5 text-blue-700" />
                )}
                Descarga Multicanal (1 Clic)
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyMulticanal("whatsapp")}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                {copied ? <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                WhatsApp
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <TabsList className="h-8 bg-slate-200/80 p-0.5">
                <TabsTrigger value="preview" className="text-xs font-semibold gap-1 px-2.5 py-1 data-[state=active]:bg-white data-[state=active]:text-blue-900 shadow-xs">
                  <Eye className="h-3 w-3" />
                  Previsualización
                </TabsTrigger>
                <TabsTrigger value="copy" className="text-xs font-semibold gap-1 px-2.5 py-1 data-[state=active]:bg-white data-[state=active]:text-blue-900 shadow-xs">
                  <Pencil className="h-3 w-3" />
                  Copy en 3 Pasos
                </TabsTrigger>
              </TabsList>

              {onApproveBatch && !isPublished && (
                <Button
                  size="sm"
                  onClick={() => setConfirmApproveBatch(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                >
                  <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                  Aprobar Lote Completo {totalLote > 0 ? `(${totalLote})` : ""}
                </Button>
              )}
            </div>
          </div>

          {/* CONTENEDOR CENTRAL CON SCROLL RESPONSIVO */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* CONMUTADOR DE 3 BORRADORES DE LA IA (A / B / C) */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Borradores Disponibles de la IA (3 Opciones Paralelas)
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(["A", "B", "C"] as OpcionBorrador[]).map((op) => {
                const isSelected = selectedOpcion === op;
                return (
                  <button
                    key={op}
                    type="button"
                    onClick={() => handleSelectOpcion(op)}
                    className={cn(
                      "flex flex-col items-start p-2.5 rounded-lg border text-left transition-all",
                      isSelected
                        ? "border-blue-700 bg-blue-50/50 shadow-sm ring-1 ring-blue-700"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-blue-900">Opción {op}</span>
                      <Badge
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          op === "A"
                            ? "bg-blue-800 text-white"
                            : op === "B"
                            ? "bg-slate-800 text-white"
                            : "bg-red-700 text-white"
                        )}
                      >
                        {op === "A" ? "Carrusel (80%)" : op === "B" ? "Autoridad (80%)" : "Directo (20%)"}
                      </Badge>
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 line-clamp-1 mt-1">
                      {op === "A" ? "Carrusel Educativo" : op === "B" ? "Networking C-Level" : "Diagnóstico Web"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 italic">
              {CONFIGURACION_BORRADORES[selectedOpcion].descripcion}
            </p>
          </div>

          <TabsContent value="preview" forceMount className="data-[state=inactive]:hidden space-y-3 mt-0">
          {/* SELECTOR DE VISTA PREVIA POR RED SOCIAL Y MARCO EXPANDIDO */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-blue-700" />
                Previsualización en Red Social
              </span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCanalPreview("linkedin")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                    canalPreview === "linkedin"
                      ? "bg-blue-800 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => setCanalPreview("instagram")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                    canalPreview === "instagram"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Instagram
                </button>
                <button
                  type="button"
                  onClick={() => setCanalPreview("facebook")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                    canalPreview === "facebook"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Facebook
                </button>
              </div>
            </div>

            {/* MOCKUP DINÁMICO DE RED SOCIAL SEGÚN PESTAÑA */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              {/* VISTA LINKEDIN */}
              {canalPreview === "linkedin" && (
                <div className="p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      MC
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 leading-tight">Pablo Eckert</p>
                      <p className="text-[10px] text-slate-500 truncate">Director en Mejora Continua | Transformación de PyMEs</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{fmtDate(canonical.dia_programado) || "Programado"}</span>
                        <span>•</span>
                        <Globe className="h-2.5 w-2.5" />
                      </p>
                    </div>
                  </div>

                  <div className="text-slate-800 space-y-1.5 leading-relaxed">
                    <p className="font-bold text-slate-900 text-sm">{currentBorrador.titulo_portada}</p>
                    <p>{currentBorrador.copy_tres_pasos.paso1_dolor}</p>
                    <p>{currentBorrador.copy_tres_pasos.paso2_reencuadre}</p>
                    <p className="font-medium text-blue-900">{currentBorrador.copy_tres_pasos.paso3_direccion_web}</p>
                    <p className="text-blue-700 text-[11px]">#MejoraContinua #Empresas #Liderazgo #Procesos</p>
                  </div>

                  {/* Canvas Gráfico Marco Desenfocado */}
                  {imagenVinculada && (
                    <div className="relative aspect-[4/5] max-h-64 w-full overflow-hidden rounded-md border border-slate-200 bg-white flex items-center justify-center">
                      <div className="absolute top-0 left-0 right-0 h-1.5 z-30 flex">
                        <div className="w-[60%] bg-[#1A3D84]" />
                        <div className="w-[20%] bg-[#E1061E]" />
                        <div className="w-[20%] bg-[#F7CC13]" />
                      </div>
                      <div
                        className="absolute inset-[-20px] bg-cover bg-center filter opacity-75 scale-110"
                        style={{
                          backgroundImage: `url(${getAssetUrl(imagenVinculada)})`,
                          filter: "blur(28px) brightness(0.85)",
                        }}
                      />
                      <div className="relative z-10 w-full h-full p-2.5 flex items-center justify-center">
                        <img
                          src={getAssetUrl(imagenVinculada)}
                          alt="Activo de Bóveda"
                          className="max-h-full max-w-full object-contain border-2 border-white shadow-md rounded-sm"
                        />
                      </div>
                      <div className="absolute bottom-2 right-2 z-20 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-700 border border-slate-200">
                        Marco 4:5 · 0% Recorte
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-600 text-[11px] font-semibold">
                    <span className="flex items-center gap-1 hover:text-blue-800 cursor-pointer"><ThumbsUp className="h-3.5 w-3.5" /> Recomendar</span>
                    <span className="flex items-center gap-1 hover:text-blue-800 cursor-pointer"><MessageCircle className="h-3.5 w-3.5" /> Comentar</span>
                    <span className="flex items-center gap-1 hover:text-blue-800 cursor-pointer"><Share2 className="h-3.5 w-3.5" /> Compartir</span>
                    <span className="flex items-center gap-1 hover:text-blue-800 cursor-pointer"><Send className="h-3.5 w-3.5" /> Enviar</span>
                  </div>
                </div>
              )}

              {/* VISTA INSTAGRAM */}
              {canalPreview === "instagram" && (
                <div className="p-3.5 space-y-2.5 text-xs bg-slate-900 text-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-500 to-fuchsia-600">
                        <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center font-bold text-[9px] text-white">
                          MC
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">mejora_continua_ok</p>
                        <p className="text-[9px] text-slate-400">Rosario, Santa Fe</p>
                      </div>
                    </div>
                    <span className="text-slate-400 font-bold">•••</span>
                  </div>

                  {/* Imagen Prioritaria IG */}
                  {imagenVinculada && (
                    <div className="relative aspect-[4/5] max-h-72 w-full overflow-hidden rounded border border-slate-800 bg-black flex items-center justify-center">
                      <div className="absolute top-0 left-0 right-0 h-1.5 z-30 flex">
                        <div className="w-[60%] bg-[#1A3D84]" />
                        <div className="w-[20%] bg-[#E1061E]" />
                        <div className="w-[20%] bg-[#F7CC13]" />
                      </div>
                      <div
                        className="absolute inset-[-20px] bg-cover bg-center filter opacity-75 scale-110"
                        style={{
                          backgroundImage: `url(${getAssetUrl(imagenVinculada)})`,
                          filter: "blur(28px) brightness(0.85)",
                        }}
                      />
                      <div className="relative z-10 w-full h-full p-2 flex items-center justify-center">
                        <img
                          src={getAssetUrl(imagenVinculada)}
                          alt="Activo de Bóveda"
                          className="max-h-full max-w-full object-contain border-2 border-white/80 shadow-lg rounded-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-200 pt-0.5">
                    <div className="flex items-center gap-3">
                      <Heart className="h-4 w-4 hover:text-red-500 cursor-pointer" />
                      <MessageCircle className="h-4 w-4 cursor-pointer" />
                      <Send className="h-4 w-4 cursor-pointer" />
                    </div>
                    <Bookmark className="h-4 w-4 cursor-pointer" />
                  </div>

                  <div className="text-[11px] leading-relaxed text-slate-200">
                    <span className="font-bold mr-1.5 text-white">mejora_continua_ok</span>
                    <span>{currentBorrador.copy_tres_pasos.paso1_dolor.slice(0, 80)}… </span>
                    <span className="text-slate-400 cursor-pointer font-medium">más</span>
                  </div>
                </div>
              )}

              {/* VISTA FACEBOOK */}
              {canalPreview === "facebook" && (
                <div className="p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      MC
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Mejora Continua</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>{fmtDate(canonical.dia_programado) || "Programado"}</span>
                        <span>•</span>
                        <Globe className="h-2.5 w-2.5" />
                      </p>
                    </div>
                  </div>

                  <div className="text-slate-800 space-y-1 leading-relaxed">
                    <p className="font-bold text-sm text-slate-900">{currentBorrador.titulo_portada}</p>
                    <p>{currentBorrador.copy_tres_pasos.paso1_dolor}</p>
                    <p>{currentBorrador.copy_tres_pasos.paso2_reencuadre}</p>
                    <p className="font-medium text-blue-900">{currentBorrador.copy_tres_pasos.paso3_direccion_web}</p>
                  </div>

                  {imagenVinculada && (
                    <div className="relative aspect-[4/5] max-h-64 w-full overflow-hidden rounded-md border border-slate-200 bg-white flex items-center justify-center">
                      <div className="absolute top-0 left-0 right-0 h-1.5 z-30 flex">
                        <div className="w-[60%] bg-[#1A3D84]" />
                        <div className="w-[20%] bg-[#E1061E]" />
                        <div className="w-[20%] bg-[#F7CC13]" />
                      </div>
                      <div
                        className="absolute inset-[-20px] bg-cover bg-center filter opacity-75 scale-110"
                        style={{
                          backgroundImage: `url(${getAssetUrl(imagenVinculada)})`,
                          filter: "blur(28px) brightness(0.85)",
                        }}
                      />
                      <div className="relative z-10 w-full h-full p-2 flex items-center justify-center">
                        <img
                          src={getAssetUrl(imagenVinculada)}
                          alt="Activo de Bóveda"
                          className="max-h-full max-w-full object-contain border-2 border-white shadow-md rounded-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-around border-t border-slate-100 pt-2 text-slate-600 text-[11px] font-semibold">
                    <span className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"><ThumbsUp className="h-3.5 w-3.5" /> Me gusta</span>
                    <span className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"><MessageCircle className="h-3.5 w-3.5" /> Comentar</span>
                    <span className="flex items-center gap-1 hover:text-blue-600 cursor-pointer"><Share2 className="h-3.5 w-3.5" /> Compartir</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 font-mono">
                {canonical.tratamiento_visual.regla_color_aplicada}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectorImagenAbierto(true)}
                className="h-7 text-xs bg-white text-blue-800 border-blue-200 hover:bg-blue-50"
              >
                Cambiar Imagen de Bóveda
              </Button>
            </div>
          </div>

          {/* SELECTOR MODAL DE IMÁGENES DE BÓVEDA */}
          {selectorImagenAbierto && (
            <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-blue-900">
                  Elegir activo de Bóveda (Networking y Autoridad C-Level)
                </Label>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSelectorImagenAbierto(false)}>
                  Cerrar
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {FOTOS_BOVEDA_DISPONIBLES.map((foto) => (
                  <button
                    key={foto.id}
                    type="button"
                    onClick={() => {
                      setImagenVinculada(foto.ruta);
                      setSelectorImagenAbierto(false);
                      toast({ title: "Imagen de Bóveda vinculada", description: foto.titulo });
                    }}
                    className={cn(
                      "p-2 text-left rounded border text-xs bg-white hover:bg-blue-50 transition-colors",
                      imagenVinculada === foto.ruta ? "border-blue-700 font-semibold text-blue-900" : "border-slate-200"
                    )}
                  >
                    <p className="line-clamp-1">{foto.titulo}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{foto.id}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          </TabsContent>

          <TabsContent value="copy" forceMount className="data-[state=inactive]:hidden space-y-3 mt-0">
          {/* CONTENIDO EDITABLE CALIBRADO EN 3 PASOS */}
          {isEditing ? (
            <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/20 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-blue-900 flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Editando Copy Calibrado en 3 Pasos ({selectedOpcion})
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Título / Hook de Portada</Label>
                <Input
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  className="bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-red-700 flex items-center gap-1">
                  <span>Paso 1: Nombrar el Dolor / Fricción Real</span>
                  <span className="text-[10px] text-slate-500 font-normal">(sin complacencia)</span>
                </Label>
                <Textarea
                  rows={2}
                  value={editCopy3Pasos.paso1_dolor}
                  onChange={(e) => setEditCopy3Pasos((prev) => ({ ...prev, paso1_dolor: e.target.value }))}
                  className="bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                  <span>Paso 2: Reencuadre y Causa Raíz</span>
                  <span className="text-[10px] text-slate-500 font-normal">(proceso y sistema, nunca a la persona)</span>
                </Label>
                <Textarea
                  rows={3}
                  value={editCopy3Pasos.paso2_reencuadre}
                  onChange={(e) => setEditCopy3Pasos((prev) => ({ ...prev, paso2_reencuadre: e.target.value }))}
                  className="bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                  <span>Paso 3: Dirección Web Concreta</span>
                  <span className="text-[10px] text-slate-500 font-normal">(llamado a mejoraok.com o diagnóstico)</span>
                </Label>
                <Input
                  value={editCopy3Pasos.paso3_direccion_web}
                  onChange={(e) => setEditCopy3Pasos((prev) => ({ ...prev, paso3_direccion_web: e.target.value }))}
                  className="bg-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={editMutation.isPending} className="bg-blue-800 text-white">
                  {editMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-800">
              <div className="border-l-2 border-red-600 pl-2.5 space-y-0.5">
                <span className="font-bold text-[11px] text-red-700 uppercase tracking-wide">
                  Paso 1 · Dolor / Situación
                </span>
                <p className="text-slate-800 leading-relaxed">{currentBorrador.copy_tres_pasos.paso1_dolor}</p>
              </div>

              <div className="border-l-2 border-blue-800 pl-2.5 space-y-0.5">
                <span className="font-bold text-[11px] text-blue-800 uppercase tracking-wide">
                  Paso 2 · Reencuadre de Sistema
                </span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{currentBorrador.copy_tres_pasos.paso2_reencuadre}</p>
              </div>

              <div className="border-l-2 border-amber-500 pl-2.5 space-y-0.5">
                <span className="font-bold text-[11px] text-amber-700 uppercase tracking-wide">
                  Paso 3 · Dirección a la Web
                </span>
                <p className="text-slate-800 font-medium">{currentBorrador.copy_tres_pasos.paso3_direccion_web}</p>
              </div>

              {currentBorrador.slides && currentBorrador.slides.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wide block mb-1">
                    Slides de Carrusel ({currentBorrador.slides.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {currentBorrador.slides.map((s, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] text-slate-600 bg-slate-50">
                        Slide {idx + 1}: {s.slice(0, 24)}…
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          </TabsContent>
          </div>

          {/* FOOTER FIJO INFERIOR CON ACCIONES PRINCIPALES */}
          {/* ACCIONES DE ESTADO Y FLUJO */}
          {!isPublished && !isEditing && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/90 shrink-0 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {isPending && (
                  <Button size="sm" onClick={handleApprove} disabled={approveMutation.isPending} className="bg-blue-800 hover:bg-blue-900 text-white">
                    {approveMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
                    Aprobar Esta Propuesta
                  </Button>
                )}
                {(isPending || isApproved) && (
                  <Button size="sm" variant="outline" onClick={() => setShowReject((v) => !v)} className="text-red-700 border-red-200 hover:bg-red-50">
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Rechazar
                  </Button>
                )}
                {isScheduled && (
                  <Button size="sm" variant="outline" onClick={() => setConfirmCancel(true)} disabled={cancelMutation.isPending}>
                    {cancelMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Cancelar Publicación
                  </Button>
                )}
                {isRejected && (
                  <Button size="sm" onClick={handleReactivate} disabled={reactivateMutation.isPending}>
                    {reactivateMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Repeat className="mr-1.5 h-3.5 w-3.5" />}
                    Reactivar
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* MOTIVO DE RECHAZO */}
          {showReject && !isPublished && (
            <div className="space-y-2 rounded-md border border-red-200 bg-red-50/50 p-3">
              <Label className="text-xs font-semibold text-red-900">Razón del rechazo</Label>
              <Textarea
                rows={2}
                placeholder="Ej: No coincide con el tono de calidez con verdad..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="bg-white text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>
                  Cancelar
                </Button>
                <Button size="sm" variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
                  {rejectMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Confirmar Rechazo
                </Button>
              </div>
            </div>
          )}

          {/* PROGRAMACIÓN / REPROGRAMACIÓN */}
          {!isPublished && !isEditing && (isScheduled || isPending || isApproved) && (
            <div className="space-y-2 rounded-md border border-slate-200 p-3 bg-slate-50/30">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-blue-700" />
                {isScheduled ? "Reprogramar Fecha de Publicación" : "Agendar Publicación"}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  min={toDatetimeLocal(new Date().toISOString())}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="bg-white text-xs"
                />
                {!isScheduled && (
                  <Select value={scheduleOferta} onValueChange={setScheduleOferta}>
                    <SelectTrigger className="bg-white text-xs">
                      <SelectValue placeholder="Dimensión de servicio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OFERTAS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {isScheduled ? (
                  <Button size="sm" onClick={handleReschedule} disabled={!scheduleDate || rescheduleMutation.isPending}>
                    {rescheduleMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Guardar
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSchedule} disabled={!scheduleDate || !scheduleOferta || scheduleMutation.isPending} className="bg-blue-800 text-white">
                    {scheduleMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Programar
                  </Button>
                )}
              </div>
            </div>
          )}

          <ProposalComments proposalId={canonical.propuesta_id} />
        </Tabs>
      </DialogContent>
      </Dialog>

      {/* DIÁLOGOS DE CONFIRMACIÓN */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Borrar esta propuesta?"
        description="Esta acción elimina la propuesta de la planificación."
        confirmText="Borrar"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="¿Cancelar publicación?"
        description="La pieza no se publicará y quedará en estado Rechazada."
        confirmText="Cancelar publicación"
        variant="destructive"
        onConfirm={() => cancelMutation.mutate(canonical.propuesta_id)}
      />

      <ConfirmDialog
        open={confirmApproveBatch}
        onOpenChange={setConfirmApproveBatch}
        title="¿Aprobar el lote completo de propuestas?"
        description="Todas las propuestas pendientes de la semana quedarán aprobadas y listas para su despacho según la grilla programada."
        confirmText="Aprobar Lote Completo"
        onConfirm={handleApproveAllBatch}
      />
    </>
  );
}
