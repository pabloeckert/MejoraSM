import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Plug,
  Check,
  Loader2,
  AlertCircle,
  ImageOff,
  MonitorPlay,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { github } from "@/services/github";
import { useGithubConnection, useDirListing, usePhotoUpload } from "@/hooks/useGithubUpload";
import { suggestPhotoDimension, type DimensionSuggestion } from "@/services/ai";

// Rediseño 2026-08-17, a pedido directo de Pablo: "Subir material" dejó de
// ser 5 links a la UI cruda de upload de GitHub — ahora es una interfaz
// propia, con el mismo UX/UI que el resto del EDA, que además deja VER lo
// que ya se subió (pendiente y ya usado por el pipeline) y da acceso al
// historial real (Monitor). Usa el mismo cliente de GitHub y la MISMA
// clave de localStorage que la Biblioteca (src/services/github.ts) — una
// sola sesión de GitHub para todo el sitio.
//
// Ajustado el mismo día tras el Taller de la Oferta (artifact respondido
// por Pablo y Sindy juntos): "Oferta" confundía — se renombró a "Dimensión
// del servicio" en toda la UI. Se agregó "Sociales" como 6ta dimensión, la
// única que NO es de servicio (es la vida social/de equipo de la marca —
// After Office, alianzas, celebraciones). La lista queda estática a
// propósito ("los Servicios deberían ser estático hoy" — respuesta real).
const OFERTAS = [
  { key: "personal", kicker: "Personal", title: "Liderazgo y foco" },
  { key: "organizacional", kicker: "Organizacional", title: "Equipo y cultura" },
  { key: "comercial", kicker: "Comercial", title: "Ventas y negociación" },
  { key: "empresarial", kicker: "Empresarial", title: "Modelo de negocio" },
  { key: "profesionalizacion", kicker: "Profesionalización", title: "Nivel integrador" },
  { key: "sociales", kicker: "Sociales", title: "Equipo, alianzas y celebraciones" },
];

function ConnectGithubDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { checking, error, connect } = useGithubConnection();
  const [token, setToken] = useState("");

  async function handleConnect() {
    const r = await connect(token.trim());
    if (r.ok) {
      setToken("");
      onOpenChange(false);
      window.location.reload(); // refresca el estado de conexión en toda la pantalla
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar con GitHub</DialogTitle>
          <DialogDescription>
            Para guardar fotos de verdad en el repo hace falta un token personal tuyo de GitHub. Queda solo en este
            navegador — nunca se sube ni se comparte.
          </DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
          <li>
            Abrí{" "}
            <a
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              github.com/settings/tokens
            </a>{" "}
            → Generate new token (fine-grained).
          </li>
          <li>
            En Repository access elegí Only select repositories → {github.owner}/{github.repo}.
          </li>
          <li>En Permissions → Repository → Contents ponelo en Read and write.</li>
          <li>Generá el token, copialo y pegalo acá abajo.</li>
        </ol>
        <Input
          type="password"
          autoComplete="off"
          placeholder="github_pat_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleConnect} disabled={checking || !token.trim()}>
          {checking && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Conectar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function PhotoGrid({ dimension, folder, emptyLabel }: { dimension: string; folder: "inbox" | "used"; emptyLabel: string }) {
  const path = `content/${folder}/${dimension}`;
  const { data: entries, isLoading, isError } = useDirListing(path);
  const photos = (entries || []).filter((e) => e.type === "file");

  if (isLoading) {
    return <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />)}</div>;
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
        <a
          key={p.path}
          href={`https://github.com/${github.owner}/${github.repo}/blob/main/${p.path}`}
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
              (e.currentTarget as HTMLImageElement).style.display = "none";
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

export default function Hub() {
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedDim, setSelectedDim] = useState("personal");
  const connected = github.isConnected();
  const { uploads, uploadFiles, clearUploads } = usePhotoUpload(selectedDim, () => setTimeout(clearUploads, 2500));
  const [dragActive, setDragActive] = useState(false);

  // "El sistema propone" — respuesta real de Pablo y Sindy al Taller de la
  // Oferta (2026-08-17): antes de commitear, se sugiere la dimensión
  // mirando la foto real (classify-photo, Claude con visión), pre-seleccionando
  // la pestaña — el humano confirma o corrige antes de que se guarde, nunca
  // se decide sola.
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [suggestion, setSuggestion] = useState<DimensionSuggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  async function handleFilesSelected(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setPendingFiles(files);
    setSuggestion(null);
    setSuggesting(true);
    try {
      const dataUrl = await readAsDataUrl(files[0]);
      const mimeType = files[0].type || "image/jpeg";
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const result = await suggestPhotoDimension(base64, mimeType);
      setSuggestion(result);
      setSelectedDim(result.dimension);
    } catch {
      // Si la sugerencia falla (red, IA no disponible, etc.) no bloquea el
      // flujo — el humano sigue pudiendo elegir la dimensión a mano y confirmar.
    } finally {
      setSuggesting(false);
    }
  }

  function confirmUpload() {
    if (!pendingFiles) return;
    uploadFiles(pendingFiles);
    setPendingFiles(null);
    setSuggestion(null);
  }

  function cancelUpload() {
    setPendingFiles(null);
    setSuggestion(null);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-medium leading-tight text-primary">Subir material</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Elegí la dimensión del servicio, subí la foto y quedá guardada de verdad en el repo — sin salir del panel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/monitor" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
            <MonitorPlay className="h-4 w-4" />
            Ver historial en el Monitor
          </Link>
          {connected ? (
            <Badge variant="secondary" className="gap-1.5">
              <Check className="h-3 w-3" /> GitHub conectado
            </Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConnectOpen(true)}>
              <Plug className="mr-1.5 h-3.5 w-3.5" />
              Conectar GitHub
            </Button>
          )}
        </div>
      </div>

      <ConnectGithubDialog open={connectOpen} onOpenChange={setConnectOpen} />

      <div className="flex flex-wrap gap-2">
        {OFERTAS.map((o) => (
          <button
            key={o.key}
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

          {!connected ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Conectá GitHub para poder subir fotos de verdad al repo.
              </p>
              <Button size="sm" onClick={() => setConnectOpen(true)}>
                <Plug className="mr-1.5 h-3.5 w-3.5" />
                Conectar GitHub
              </Button>
            </div>
          ) : pendingFiles ? (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-5">
              <p className="text-sm font-medium">
                {pendingFiles.length} foto{pendingFiles.length > 1 ? "s" : ""} lista{pendingFiles.length > 1 ? "s" : ""} para subir a{" "}
                <span className="text-primary">{OFERTAS.find((o) => o.key === selectedDim)?.kicker}</span>
              </p>

              <div className="flex items-start gap-2 rounded-md bg-background p-3 text-sm">
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                {suggesting ? (
                  <span className="text-muted-foreground">Mirando la primera foto para sugerir la dimensión…</span>
                ) : suggestion ? (
                  <span>
                    El sistema sugiere <strong>{OFERTAS.find((o) => o.key === suggestion.dimension)?.kicker}</strong> — {suggestion.reason}
                    {" "}
                    <span className="text-muted-foreground">Elegí otra pestaña arriba si no es correcto.</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    No se pudo sugerir la dimensión automáticamente — elegí la correcta arriba antes de confirmar.
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={confirmUpload} disabled={suggesting}>
                  Confirmar y subir a {OFERTAS.find((o) => o.key === selectedDim)?.kicker}
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
              {uploads.map((u, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                  <span className="truncate">{u.fileName}</span>
                  {u.status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  {u.status === "done" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  {u.status === "error" && <span className="text-destructive">{u.error || "Error"}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-medium">Pendientes en {OFERTAS.find((o) => o.key === selectedDim)?.kicker}</p>
            <PhotoGrid dimension={selectedDim} folder="inbox" emptyLabel="Nada pendiente todavía — subí una foto arriba." />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <ImageOff className="h-3.5 w-3.5" />
              Ya usadas en {OFERTAS.find((o) => o.key === selectedDim)?.kicker}
            </p>
            <PhotoGrid dimension={selectedDim} folder="used" emptyLabel="Todavía no se usó ninguna foto de esta dimensión." />
          </CardContent>
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
        Por ahora solo se procesan fotos. Los videos se pueden subir igual desde{" "}
        <a href={`https://github.com/${github.owner}/${github.repo}/upload/main/content/inbox/${selectedDim}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          la UI de GitHub
        </a>{" "}
        — quedan guardados, pero todavía no se arma una pieza con ellos.
      </p>
    </div>
  );
}
