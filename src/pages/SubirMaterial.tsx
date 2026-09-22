import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Check,
  Loader2,
  ImageOff,
  MonitorPlay,
  ExternalLink,
  Sparkles,
  X,
  RotateCw,
  Camera,
  MessageSquare,
  FileImage,
  HardDrive,
  CheckSquare,
  Square as SquareIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { github } from "@/services/github";
import { useDirListing, usePhotoUpload } from "@/hooks/useGithubUpload";
import { suggestPhotoDimension } from "@/services/ai";
import { toast } from "@/hooks/use-toast";
import { DIMENSIONES, dimensionLabel } from "@/shared/constants";
import { PublishNowCard } from "@/components/PublishNowCard";
import { DriveSyncDialog } from "@/components/DriveSyncDialog";
import { ContentFormatModal, type SelectedPhotoItem } from "@/components/ContentFormatModal";

const OFERTAS = DIMENSIONES.map((d) => ({ key: d.key, kicker: d.label, title: d.title }));
const KICKER = dimensionLabel;

const MAX_FILE_MB = 25;
const HEIC_RE = /\.(heic|heif)$/i;
const IMG_RE = /\.(jpe?g|png|webp)$/i;

function inferSituation(filename: string): string {
  const f = filename.toLowerCase();
  if (/pizarra|mapa|flujo|esquema|kpi|matriz/i.test(f)) return "Pizarra/Esquema";
  if (/1a1|diagnostico|lider|entrevista|socio/i.test(f)) return "Consultoría 1 a 1";
  return "Taller/Equipo";
}

function inferTitle(filename: string, dimension: string): string {
  const base = filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^\d{8}-\d{6}-[a-z0-9]+-/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (!base || base.length < 3) {
    return `Caso Operativo en ${dimensionLabel(dimension)}`;
  }
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function inferTrenchPain(filename: string, dimension: string): string {
  const sit = inferSituation(filename);
  if (sit === "Pizarra/Esquema") {
    return "Cuellos de botella en la transición entre áreas y falta de visibilidad del flujo de valor.";
  }
  if (sit === "Consultoría 1 a 1") {
    return "El líder absorbe decisiones operativas cotidianas sin reglas claras de delegación.";
  }
  return `Desalineación de objetivos en mandos medios y fricción en la coordinación de ${dimensionLabel(dimension)}.`;
}

function PhotoGrid({
  dimension,
  folder,
  emptyLabel,
  selectedPhotos = [],
  onToggleSelect,
  onCreateContent,
}: {
  dimension: string;
  folder: "inbox" | "used";
  emptyLabel: string;
  selectedPhotos?: SelectedPhotoItem[];
  onToggleSelect?: (item: SelectedPhotoItem) => void;
  onCreateContent?: (item: SelectedPhotoItem) => void;
}) {
  const path = `content/${folder}/${dimension}`;
  const { data: entries, isLoading, isError } = useDirListing(path);
  const photos = (entries || []).filter((e) => e.type === "file" && IMG_RE.test(e.name));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }
  if (isError) {
    return <p className="text-xs text-muted-foreground">No se pudo consultar esta carpeta ahora mismo.</p>;
  }
  if (!photos.length) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
      {photos.map((p) => {
        const url = github.rawUrl(p.path);
        const situation = inferSituation(p.name);
        const operationalTitle = inferTitle(p.name, dimension);
        const trenchPain = inferTrenchPain(p.name, dimension);
        const item: SelectedPhotoItem = {
          id: p.path,
          name: p.name,
          url,
          dimension,
          situation,
          operationalTitle,
          trenchPain,
        };
        const isSelected = selectedPhotos.some((s) => s.id === p.path);

        return (
          <div
            key={p.path}
            className={cn(
              "group relative flex flex-col justify-between rounded-lg border bg-card p-2.5 transition-all shadow-sm hover:shadow-md",
              isSelected
                ? "border-primary bg-primary/[0.03] ring-2 ring-primary/30"
                : "border-border hover:border-primary/40"
            )}
          >
            {/* FOTO CON BADGES FLOTANTES */}
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-muted">
              <img
                src={url}
                alt={p.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = "none";
                  const parent = el.parentElement;
                  if (parent && !parent.querySelector(".img-fallback")) {
                    const span = document.createElement("span");
                    span.className =
                      "img-fallback absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground";
                    span.textContent = "Foto no disponible";
                    parent.appendChild(span);
                  }
                }}
              />

              {/* CHECKBOX DE SELECCIÓN MÚLTIPLE */}
              {onToggleSelect && (
                <button
                  type="button"
                  onClick={() => onToggleSelect(item)}
                  aria-label={`Seleccionar foto ${p.name}`}
                  className="absolute top-2 left-2 p-1 rounded bg-background/90 text-foreground hover:bg-background shadow transition-transform active:scale-95"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <SquareIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              )}

              {/* BADGES EN ESQUINA SUPERIOR DERECHA */}
              <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold bg-background/90 backdrop-blur shadow-sm px-1.5 py-0"
                >
                  {situation}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[9px] font-bold uppercase bg-primary text-white border-none shadow-sm px-1.5 py-0"
                >
                  {KICKER(dimension)}
                </Badge>
              </div>
            </div>

            {/* CONTENIDO EDITORIAL DE TRINCHERA */}
            <div className="pt-2.5 pb-1 space-y-1 flex-1">
              <h4 className="text-xs font-bold text-foreground line-clamp-1" title={operationalTitle}>
                {operationalTitle}
              </h4>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight" title={trenchPain}>
                {trenchPain}
              </p>
            </div>

            {/* BOTÓN DE ACCIÓN RÁPIDA */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1 mt-1">
              <span className="text-[10px] text-muted-foreground truncate max-w-[110px]" title={p.name}>
                {p.name}
              </span>
              {onCreateContent && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onCreateContent(item)}
                  className="h-6 px-2 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Crear pieza
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

async function downscaleForClassify(file: File): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await readAsDataUrl(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("no image"));
      el.src = dataUrl;
    });
    const max = 1280;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL("image/jpeg", 0.8);
    return { base64: out.slice(out.indexOf(",") + 1), mimeType: "image/jpeg" };
  } catch {
    return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), mimeType: file.type || "image/jpeg" };
  }
}

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  dimension: string;
  suggested: string | null;
  suggesting: boolean;
}

export default function SubirMaterial() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedDim, setSelectedDim] = useState("personal");
  const { uploads, uploadFiles, retryUpload, clearUploads } = usePhotoUpload(() => setTimeout(clearUploads, 2500));
  const [dragActive, setDragActive] = useState(false);
  const [pending, setPending] = useState<PendingPhoto[] | null>(null);

  // Estado para la galería y creación de contenido
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhotoItem[]>([]);
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);
  const [formatModalOpen, setFormatModalOpen] = useState(false);

  function handleToggleSelect(item: SelectedPhotoItem) {
    setSelectedPhotos((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) {
        return prev.filter((p) => p.id !== item.id);
      }
      return [...prev, item];
    });
  }

  function handleCreateSingleContent(item: SelectedPhotoItem) {
    setSelectedPhotos([item]);
    setFormatModalOpen(true);
  }

  // Estado para la Subida Unitaria Rápida (Instantánea de Trabajo)
  const [instantFile, setInstantFile] = useState<File | null>(null);
  const [instantPreview, setInstantPreview] = useState<string | null>(null);
  const [instantNote, setInstantNote] = useState("");
  const [instantDim, setInstantDim] = useState("organizacional");
  const [instantSuggesting, setInstantSuggesting] = useState(false);
  const [instantSuggestedDim, setInstantSuggestedDim] = useState<string | null>(null);
  const [instantUploading, setInstantUploading] = useState(false);
  const [instantDragActive, setInstantDragActive] = useState(false);

  function handleInstantFile(file: File) {
    if (!file.type.startsWith("image/") && !HEIC_RE.test(file.name)) {
      toast({ variant: "destructive", title: "Formato no compatible", description: "Seleccioná un archivo de imagen (JPG, PNG o WebP)." });
      return;
    }
    if (HEIC_RE.test(file.name)) {
      toast({ variant: "destructive", title: "Formato HEIC", description: "Convertí la captura a JPG antes de subir." });
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({ variant: "destructive", title: "Archivo demasiado pesado", description: `El archivo supera el límite de ${MAX_FILE_MB}MB.` });
      return;
    }

    setInstantFile(file);
    if (instantPreview) URL.revokeObjectURL(instantPreview);
    const prev = URL.createObjectURL(file);
    setInstantPreview(prev);
    setInstantSuggestedDim(null);

    // Sugerencia de dimensión automática vía IA
    setInstantSuggesting(true);
    downscaleForClassify(file)
      .then(({ base64, mimeType }) => suggestPhotoDimension(base64, mimeType))
      .then((res) => {
        if (res.dimension) {
          setInstantSuggestedDim(res.dimension);
        }
      })
      .catch(() => {})
      .finally(() => setInstantSuggesting(false));
  }

  function clearInstantFile() {
    if (instantPreview) URL.revokeObjectURL(instantPreview);
    setInstantFile(null);
    setInstantPreview(null);
    setInstantSuggestedDim(null);
  }

  async function handleInstantSubmit() {
    if (!instantFile) {
      toast({ variant: "destructive", title: "Sin archivo", description: "Por favor seleccioná o arrastrá una foto o captura." });
      return;
    }

    setInstantUploading(true);
    try {
      const dataUrl = await readAsDataUrl(instantFile);
      const extMatch = instantFile.name.match(/\.[a-z0-9]+$/i);
      const ext = (extMatch ? extMatch[0] : ".jpg").toLowerCase();
      const base = instantFile.name
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 35) || "instantanea";
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
      const rnd = Math.random().toString(36).slice(2, 6);
      const filename = `${stamp}-${rnd}-${base}${ext}`;

      const targetDim = instantSuggestedDim || instantDim;

      // 1. Guardar la imagen en content/inbox/${targetDim}/
      await github.commitPhoto(targetDim, filename, dataUrl);

      // 2. Guardar metadatos contextuales
      const meta = {
        filename,
        originalName: instantFile.name,
        contextNote: instantNote.trim(),
        dimension: targetDim,
        uploadedAt: new Date().toISOString(),
        source: "instantanea_de_trinchera",
      };
      await github.putJsonFile(
        `content/inbox/${targetDim}/${filename}.json`,
        meta,
        `metadata instantanea: ${filename}`
      );

      toast({
        title: "Instantánea guardada ✓",
        description: "Redirigiendo a Mesa Ejecutiva para debatir la pieza...",
      });

      // 3. Redirigir a /mesa con el prompt pre-cargado
      const promptText = instantNote.trim()
        ? `[Instantánea de Trabajo - ${KICKER(targetDim)}] ${instantNote.trim()}`
        : `[Instantánea de Trabajo - ${KICKER(targetDim)}] Caso operativo de trinchera capturado en foto (${instantFile.name})`;

      setTimeout(() => {
        navigate("/mesa", {
          state: {
            prompt: promptText,
            source: "instantanea",
            filename,
            dimension: targetDim,
          },
        });
      }, 600);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al guardar instantánea",
        description: err instanceof Error ? err.message : "No se pudo subir el material.",
      });
      setInstantUploading(false);
    }
  }

  async function handleFilesSelected(fileList: FileList | File[]) {
    const all = Array.from(fileList);
    const rejected: string[] = [];
    const files = all.filter((f) => {
      if (!f.type.startsWith("image/") && !HEIC_RE.test(f.name)) {
        rejected.push(`${f.name}: no es una imagen`);
        return false;
      }
      if (HEIC_RE.test(f.name)) {
        rejected.push(`${f.name}: HEIC no se puede usar (convertila a JPG en el celu primero)`);
        return false;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        rejected.push(`${f.name}: pesa ${(f.size / 1024 / 1024).toFixed(1)}MB (máx ${MAX_FILE_MB}MB)`);
        return false;
      }
      return true;
    });

    if (rejected.length) {
      toast({
        variant: "destructive",
        title: rejected.length === all.length ? "No se puede usar ninguno" : "Algunas fotos quedaron afuera",
        description: rejected.slice(0, 4).join(" · "),
      });
    }
    if (!files.length) return;

    const items: PendingPhoto[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      dimension: selectedDim,
      suggested: null,
      suggesting: true,
    }));
    setPending(items);

    await Promise.allSettled(
      items.map(async (it) => {
        try {
          const { base64, mimeType } = await downscaleForClassify(it.file);
          const res = await suggestPhotoDimension(base64, mimeType);
          setPending((prev) =>
            prev
              ? prev.map((p) => (p.id === it.id ? { ...p, suggested: res.dimension, suggesting: false } : p))
              : prev
          );
        } catch {
          setPending((prev) => (prev ? prev.map((p) => (p.id === it.id ? { ...p, suggesting: false } : p)) : prev));
        }
      })
    );
  }

  function setPendingDimension(id: string, dimension: string) {
    setPending((prev) => (prev ? prev.map((p) => (p.id === id ? { ...p, dimension } : p)) : prev));
  }

  function confirmUpload() {
    if (!pending) return;
    uploadFiles(pending.map((p) => ({ file: p.file, dimension: p.dimension })));
    pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPending(null);
  }

  function cancelUpload() {
    pending?.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPending(null);
  }

  const anySuggesting = !!pending?.some((p) => p.suggesting);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Subir material</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ingresá material visual desde trinchera, elegí la dimensión y guardá todo en el pipeline institucional.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={() => setDriveDialogOpen(true)}
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/5 font-semibold text-xs shadow-sm flex items-center gap-2 h-9"
          >
            <HardDrive className="h-4 w-4 text-primary" />
            Sincronizar Google Drive
          </Button>
          <Link to="/monitor" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
            <MonitorPlay className="h-4 w-4" />
            Ver historial en el Monitor
          </Link>
        </div>
      </div>

      {/* TARJETA DESTACADA: SUBIDA UNITARIA RÁPIDA (INSTANTÁNEA DE TRABAJO) */}
      <Card className="border-primary/30 shadow-md bg-gradient-to-br from-card to-primary/[0.03] overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Instantánea de Trabajo
                  <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                    Trinchera Operativa
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Foto de pizarra, captura de pantalla o fricción operativa real para debatir de inmediato en la Mesa de Diálogo.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Dropzone unitario */}
            <div className="md:col-span-5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Archivo Visual (Foto o Captura)
              </Label>

              {instantFile && instantPreview ? (
                <div className="relative rounded-lg border border-border bg-background p-3 flex flex-col items-center gap-2 group">
                  <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted flex items-center justify-center">
                    <img src={instantPreview} alt="Vista previa instantánea" className="h-full w-full object-contain" />
                    <button
                      type="button"
                      onClick={clearInstantFile}
                      className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm"
                      title="Quitar imagen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="w-full flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="truncate font-medium text-foreground max-w-[200px]" title={instantFile.name}>
                      {instantFile.name}
                    </span>
                    <span>{(instantFile.size / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
              ) : (
                <label
                  onDrop={(e) => {
                    e.preventDefault();
                    setInstantDragActive(false);
                    if (e.dataTransfer.files?.[0]) handleInstantFile(e.dataTransfer.files[0]);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setInstantDragActive(true);
                  }}
                  onDragLeave={() => setInstantDragActive(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all min-h-[160px]",
                    instantDragActive ? "border-primary bg-primary/5" : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <FileImage className="h-8 w-8 text-primary/70" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Arrastrá una foto o captura acá</p>
                    <p className="text-xs text-muted-foreground mt-0.5">o hacé clic para explorar tus archivos</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground/80">JPG, PNG o WebP (hasta 25MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleInstantFile(e.target.files[0])}
                  />
                </label>
              )}
            </div>

            {/* Contexto operativo y acción */}
            <div className="md:col-span-7 space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="instant-note" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Contexto o nota operativa
                </Label>
                <Textarea
                  id="instant-note"
                  rows={3}
                  value={instantNote}
                  onChange={(e) => setInstantNote(e.target.value)}
                  placeholder="Ej: Taller de mandos medios sobre desconexión de objetivos entre comercial y producción. Los jefes de área sienten que ventas promete plazos imposibles."
                  className="text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Dimensión asignada</Label>
                  <select
                    value={instantSuggestedDim || instantDim}
                    onChange={(e) => {
                      setInstantDim(e.target.value);
                      setInstantSuggestedDim(null);
                    }}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
                  >
                    {OFERTAS.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.kicker} — {o.title}
                      </option>
                    ))}
                  </select>
                  {instantSuggesting && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" /> Analizando imagen con IA…
                    </span>
                  )}
                  {instantSuggestedDim && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
                      <Sparkles className="h-3 w-3" /> Sugerido por IA: {KICKER(instantSuggestedDim)}
                    </span>
                  )}
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleInstantSubmit}
                    disabled={!instantFile || instantUploading}
                    className="w-full bg-[#1A3D84] hover:bg-[#142e63] text-white font-medium shadow-sm h-10"
                  >
                    {instantUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="mr-2 h-4 w-4" />
                    )}
                    Guardar e iniciar debate en Mesa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN TRADICIONAL: SUBIDA POR LOTES POR DIMENSIÓN */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Carga por lotes a biblioteca</h2>
            <p className="text-xs text-muted-foreground">Elegí la dimensión para subir múltiples fotos a su carpeta del repositorio.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dimensión del servicio">
          {OFERTAS.map((o) => (
            <button
              key={o.key}
              role="tab"
              aria-selected={selectedDim === o.key}
              onClick={() => setSelectedDim(o.key)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                selectedDim === o.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {o.kicker}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{OFERTAS.find((o) => o.key === selectedDim)?.title}</span> — la
              foto se guarda en <code className="rounded bg-muted px-1 py-0.5 text-xs">content/inbox/{selectedDim}/</code>.
            </p>

            {pending ? (
              <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  {anySuggesting ? (
                    <span className="text-muted-foreground">Mirando cada foto para sugerir su dimensión…</span>
                  ) : (
                    <span>
                      Cada foto se guarda en <b>{OFERTAS.find((o) => o.key === selectedDim)?.kicker}</b> (la dimensión elegida
                      arriba). Si el sistema cree que alguna va en otra, te lo avisa — vos decidís.
                    </span>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {pending.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-md bg-background p-2">
                      <img
                        src={p.previewUrl}
                        alt={p.file.name}
                        className="h-14 w-14 shrink-0 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{p.file.name}</p>
                        {p.suggesting ? (
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> analizando…
                          </p>
                        ) : (
                          <>
                            <select
                              value={p.dimension}
                              onChange={(e) => setPendingDimension(p.id, e.target.value)}
                              aria-label={`Dimensión de ${p.file.name}`}
                              className="mt-0.5 w-full rounded border border-input bg-background px-1.5 py-1 text-xs"
                            >
                              {OFERTAS.map((o) => (
                                <option key={o.key} value={o.key}>
                                  {o.kicker}
                                </option>
                              ))}
                            </select>
                            {p.suggested && p.suggested !== p.dimension && (
                              <button
                                type="button"
                                onClick={() => setPendingDimension(p.id, p.suggested!)}
                                className="mt-1 text-[11px] text-primary underline underline-offset-2"
                              >
                                El sistema cree que es de {dimensionLabel(p.suggested)} — usar esa
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={confirmUpload} disabled={anySuggesting}>
                    Subir {pending.length} foto{pending.length > 1 ? "s" : ""}
                  </Button>
                  <Button variant="outline" onClick={cancelUpload}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <label
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  handleFilesSelected(e.dataTransfer.files);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <Upload className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium">Arrastrá tus fotos acá o tocá para elegir</p>
                <p className="text-xs text-muted-foreground">jpg, png, webp — se pueden subir varias juntas</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                />
              </label>
            )}

            {uploads.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {uploads.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                    <span className="truncate">
                      {u.fileName} <span className="text-muted-foreground">→ {KICKER(u.dimension)}</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {u.status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      {u.status === "done" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                      {u.status === "error" && (
                        <>
                          <span className="text-destructive">{u.error || "Error"}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            aria-label={`Reintentar subir ${u.fileName}`}
                            title="Reintentar"
                            onClick={() => retryUpload(u.id)}
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PublishNowCard dimension={selectedDim} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-medium">Pendientes en {KICKER(selectedDim)}</p>
            <PhotoGrid
              dimension={selectedDim}
              folder="inbox"
              emptyLabel="Nada pendiente todavía — subí una foto arriba o sincronizá desde Google Drive."
              selectedPhotos={selectedPhotos}
              onToggleSelect={handleToggleSelect}
              onCreateContent={handleCreateSingleContent}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <ImageOff className="h-3.5 w-3.5" />
              Ya usadas en {KICKER(selectedDim)}
            </p>
            <PhotoGrid
              dimension={selectedDim}
              folder="used"
              emptyLabel="Todavía no se usó ninguna foto de esta dimensión."
              selectedPhotos={selectedPhotos}
              onToggleSelect={handleToggleSelect}
              onCreateContent={handleCreateSingleContent}
            />
          </CardContent>
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
        Por ahora solo se procesan fotos (jpg/png/webp). Los videos y las capturas HEIC del celular todavía no arman
        una pieza — convertí el HEIC a JPG antes de subir.
      </p>

      {/* BARRA FLOTANTE DE ACCIÓN PARA FOTOS SELECCIONADAS */}
      {selectedPhotos.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background/95 backdrop-blur-md border border-primary/40 shadow-2xl rounded-full px-5 py-2.5 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-primary text-white font-bold px-2 py-0.5 text-xs">
              {selectedPhotos.length}
            </Badge>
            <span className="text-xs font-semibold text-foreground">
              foto{selectedPhotos.length > 1 ? "s" : ""} seleccionada{selectedPhotos.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            size="sm"
            onClick={() => setFormatModalOpen(true)}
            className="bg-[#1A3D84] hover:bg-[#142e63] text-white text-xs font-bold shadow h-8 px-3"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-yellow-400" />
            Crear contenido ({selectedPhotos.length})
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedPhotos([])}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
          >
            Limpiar
          </Button>
        </div>
      )}

      {/* DIÁLOGO DE SINCRONIZACIÓN GOOGLE DRIVE */}
      <DriveSyncDialog
        open={driveDialogOpen}
        onOpenChange={setDriveDialogOpen}
        onSyncSuccess={() => {
          qc.invalidateQueries({ queryKey: ["github", "dir"] });
        }}
      />

      {/* MODAL ASISTENTE DE FORMATO Y LAYOUTS VISUALES */}
      <ContentFormatModal
        open={formatModalOpen}
        onOpenChange={setFormatModalOpen}
        photos={selectedPhotos}
      />
    </div>
  );
}
