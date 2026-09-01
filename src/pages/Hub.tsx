import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { github } from "@/services/github";
import { useDirListing, usePhotoUpload } from "@/hooks/useGithubUpload";
import { suggestPhotoDimension } from "@/services/ai";
import { toast } from "@/hooks/use-toast";
import { DIMENSIONES, dimensionLabel } from "@/shared/constants";
import { PublishNowCard } from "@/components/PublishNowCard";

// Rediseño 2026-08-17: "Subir material" dejó de ser 5 links a la UI cruda de
// upload de GitHub — interfaz propia.
//
// 2026-09-01, pedido explícito de Pablo ("que en ninguna [pantalla] se vea
// github, que todo pase por MejoraSM"): se sacó el flujo de "Conectar con
// GitHub" (pegar un token personal a mano) — src/services/github.ts ahora
// habla con la Edge Function `repo`, que guarda el token del lado del
// servidor. Ya no hay nada que conectar ni reconectar: si estás logueado en
// MejoraSM, subir fotos y usar "Publicar ahora" ya funciona.
//
// Auditoría 2026-08-31:
//  B9  — antes classify-photo miraba solo la 1ra foto del lote y la dimensión
//        se aplicaba a todas. Ahora se clasifica cada foto y hay un selector
//        de dimensión por foto en el paso de confirmación, con thumbnail.
//  B10 — la dimensión viaja pegada a cada foto (ver useGithubUpload), no del
//        estado del componente.
const OFERTAS = DIMENSIONES.map((d) => ({ key: d.key, kicker: d.label, title: d.title }));
const KICKER = dimensionLabel;

// El límite real hoy es el tamaño de request que acepta la Edge Function
// (algunos MB de sobra para una foto de celular); y las fotos en HEIC no las
// renderiza ni el navegador ni el pipeline (Chromium).
const MAX_FILE_MB = 25;
const HEIC_RE = /\.(heic|heif)$/i;

function PhotoGrid({ dimension, folder, emptyLabel }: { dimension: string; folder: "inbox" | "used"; emptyLabel: string }) {
  const path = `content/${folder}/${dimension}`;
  const { data: entries, isLoading, isError } = useDirListing(path);
  const photos = (entries || []).filter((e) => e.type === "file");

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />
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
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {photos.map((p) => (
        // Abre la imagen directa (raw), no una página de GitHub — solo la foto.
        <a
          key={p.path}
          href={github.rawUrl(p.path)}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative aspect-square overflow-hidden rounded-md bg-muted"
          title={p.name}
        >
          <img
            src={github.rawUrl(p.path)}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = "none";
              const parent = el.parentElement;
              if (parent && !parent.querySelector(".img-fallback")) {
                const span = document.createElement("span");
                span.className =
                  "img-fallback absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground";
                span.textContent = "no disponible";
                parent.appendChild(span);
              }
            }}
          />
        </a>
      ))}
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

// Reduce la imagen a ~1280px de lado mayor antes de mandarla a classify-photo —
// una foto de celular en full res son varios MB de base64 al pedo para una
// clasificación (B14/perf, auditoría 2026-08-31).
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

export default function Hub() {
  const [selectedDim, setSelectedDim] = useState("personal");
  const { uploads, uploadFiles, retryUpload, clearUploads } = usePhotoUpload(() => setTimeout(clearUploads, 2500));
  const [dragActive, setDragActive] = useState(false);

  const [pending, setPending] = useState<PendingPhoto[] | null>(null);

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

    // B9: clasificar cada foto, en paralelo. Si falla una, queda con la
    // dimensión de la pestaña seleccionada — el humano confirma o corrige.
    await Promise.allSettled(
      items.map(async (it) => {
        try {
          const { base64, mimeType } = await downscaleForClassify(it.file);
          const res = await suggestPhotoDimension(base64, mimeType);
          setPending((prev) =>
            prev
              ? prev.map((p) => (p.id === it.id ? { ...p, dimension: res.dimension, suggested: res.dimension, suggesting: false } : p))
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
            Elegí la dimensión del servicio, subí la foto y quedá guardada de verdad — sin salir del panel.
          </p>
        </div>
        <Link to="/monitor" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <MonitorPlay className="h-4 w-4" />
          Ver historial en el Monitor
        </Link>
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
                    Revisá la dimensión de cada foto antes de confirmar. Lo que sugirió el sistema está pre-elegido —
                    cambialo si no corresponde.
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
                        <select
                          value={p.dimension}
                          onChange={(e) => setPendingDimension(p.id, e.target.value)}
                          aria-label={`Dimensión de ${p.file.name}`}
                          className="mt-0.5 w-full rounded border border-input bg-background px-1.5 py-1 text-xs"
                        >
                          {OFERTAS.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.kicker}
                              {p.suggested === o.key ? " (sugerida)" : ""}
                            </option>
                          ))}
                        </select>
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

      <PublishNowCard dimension={selectedDim} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-medium">Pendientes en {KICKER(selectedDim)}</p>
            <PhotoGrid dimension={selectedDim} folder="inbox" emptyLabel="Nada pendiente todavía — subí una foto arriba." />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <ImageOff className="h-3.5 w-3.5" />
              Ya usadas en {KICKER(selectedDim)}
            </p>
            <PhotoGrid dimension={selectedDim} folder="used" emptyLabel="Todavía no se usó ninguna foto de esta dimensión." />
          </CardContent>
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
        Por ahora solo se procesan fotos (jpg/png/webp). Los videos y las capturas HEIC del celular todavía no arman
        una pieza — convertí el HEIC a JPG antes de subir.
      </p>
    </div>
  );
}
