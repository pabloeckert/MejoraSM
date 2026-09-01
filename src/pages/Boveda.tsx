import { useState, useRef } from "react";
import JSZip from "jszip";
import type { DocRow } from "@/shared/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, Loader2, Search, RotateCw, AlertTriangle, FileArchive } from "lucide-react";
import { useDocuments, useUploadDocument, useDeleteDocument, useProcessDocument, useSetDocumentCategory } from "@/hooks/useVault";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DOC_CATEGORIES, docCategoryLabel } from "@/shared/constants";

// Mismo límite que supabase/functions/vault-process/index.ts
// (MAX_FILE_SIZE_BYTES) — validar acá también evita subir un archivo que
// de todas formas va a fallar del lado del servidor, y avisa antes en vez
// de después (hallazgo real de auditoría 2026-08-25).
const MAX_FILE_SIZE_MB = 20;

// Extensiones que vault-process sabe extraer. Todo lo demás (imágenes,
// binarios sueltos dentro de un .zip, etc.) se ignora en silencio.
const SUPPORTED_EXT = [".pdf", ".docx", ".txt", ".md"];
const ACCEPT = ".pdf,.docx,.txt,.md,.zip";

type ProcessingStatus =
  | "pending"
  | "extracting"
  | "chunking"
  | "embedding"
  | "ready"
  | "ready_no_search"
  | "error";

const STATUS_META: Record<ProcessingStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; spinning?: boolean }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  extracting: { label: "Extrayendo texto…", variant: "secondary", spinning: true },
  chunking: { label: "Troceando…", variant: "secondary", spinning: true },
  embedding: { label: "Generando embeddings…", variant: "secondary", spinning: true },
  ready: { label: "Procesado", variant: "default" },
  ready_no_search: { label: "Procesado — sin búsqueda semántica", variant: "outline" },
  error: { label: "Error", variant: "destructive" },
};

function isSupported(name: string) {
  const lower = name.toLowerCase();
  return SUPPORTED_EXT.some((ext) => lower.endsWith(ext));
}

export default function Boveda() {
  return (
    <ErrorBoundary>
      <BovedaContent />
    </ErrorBoundary>
  );
}

function BovedaContent() {
  const { data: documents, isLoading } = useDocuments();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const processMutation = useProcessDocument();
  const categoryMutation = useSetDocumentCategory();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [unzipping, setUnzipping] = useState(false);

  // Fase C (2026-08-31): un .zip con todo el brand kit se descomprime en el
  // navegador (JSZip) y cada archivo soportado se sube por separado al mismo
  // pipeline de vault-process — que además ahora clasifica el tipo de cada
  // documento (manual / buyer persona / tono / ejemplo) con un llamado corto
  // al LLM. UX10 (auditoría 2026-08-31) ya había abierto el multi-upload.
  const expandFiles = async (files: File[]): Promise<File[]> => {
    const out: File[] = [];
    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        setUnzipping(true);
        try {
          const zip = await JSZip.loadAsync(file);
          const entries = Object.values(zip.files).filter(
            (e) => !e.dir && isSupported(e.name) && !e.name.split("/").pop()!.startsWith(".")
          );
          if (entries.length === 0) {
            toast({ variant: "destructive", title: `"${file.name}" no tenía documentos soportados`, description: "PDF, DOCX, TXT o MD." });
          }
          for (const entry of entries) {
            const blob = await entry.async("blob");
            out.push(new File([blob], entry.name.split("/").pop() || entry.name, { type: blob.type }));
          }
        } catch (e) {
          toast({ variant: "destructive", title: `No se pudo abrir "${file.name}"`, description: e instanceof Error ? e.message : "Archivo dañado o no es un .zip." });
        } finally {
          setUnzipping(false);
        }
      } else {
        out.push(file);
      }
    }
    return out;
  };

  const uploadFiles = async (rawFiles: File[]) => {
    const files = await expandFiles(rawFiles);
    const tooBig = files.filter((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (tooBig.length) {
      toast({
        variant: "destructive",
        title: tooBig.length === files.length ? "Los archivos son muy grandes" : "Algunos archivos quedaron afuera",
        description: `${tooBig.map((f) => f.name).join(", ")} — el máximo es ${MAX_FILE_SIZE_MB}MB por archivo.`,
      });
    }
    const ok = files.filter((f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024 && isSupported(f.name));
    for (const file of ok) {
      // vault-process no está pensado para escrituras en paralelo — de a uno.
      await new Promise<void>((resolve) => uploadMutation.mutate(file, { onSettled: () => resolve() }));
    }
    if (ok.length > 1) toast({ title: `${ok.length} documentos subidos`, description: "El sistema los está clasificando y procesando." });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) void uploadFiles(files);
  };

  const [dragActive, setDragActive] = useState(false);

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget, {
        onSettled: () => setDeleteTarget(null),
      });
    }
  };

  const filteredDocs = (documents as DocRow[] | undefined)?.filter((d) =>
    d.title?.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupado por categoría — el orden es el de DOC_CATEGORIES, con "Sin
  // clasificar" (categoría nula, aún procesando o clasificación fallida) al final.
  const groups: { key: string; label: string; docs: DocRow[] }[] = [
    ...DOC_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      docs: (filteredDocs || []).filter((d) => d.category === c.key),
    })),
    { key: "__none__", label: "Sin clasificar", docs: (filteredDocs || []).filter((d) => !d.category) },
  ].filter((g) => g.docs.length > 0);

  const busy = uploadMutation.isPending || unzipping;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manual de Identidad de Marca</h1>
          <p className="mt-1 text-muted-foreground">
            Todo lo que define la voz de la marca: manual y criterio, buyer personas, tono, ejemplos. El sistema clasifica
            cada documento al subirlo — podés corregirlo. Máximo {MAX_FILE_SIZE_MB}MB por archivo — PDF, DOCX, TXT, MD o un .zip con todo.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            accept={ACCEPT}
            onChange={handleUpload}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {unzipping ? "Descomprimiendo…" : "Subir documentos"}
          </Button>
        </div>
      </div>

      <label
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length) void uploadFiles(files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        )}
      >
        <div className="flex gap-2 text-primary">
          <Upload className="h-6 w-6" />
          <FileArchive className="h-6 w-6" />
        </div>
        Arrastrá documentos o un .zip con todo el brand kit, o tocá para elegir
        <span className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD, ZIP — hasta {MAX_FILE_SIZE_MB}MB c/u</span>
        <input type="file" multiple accept={ACCEPT} className="hidden" onChange={handleUpload} />
      </label>

      {documents && documents.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de documento..."
            aria-label="Buscar documentos por nombre"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-20 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filteredDocs || filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              {search ? "No se encontraron documentos" : "No hay documentos aún"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {search
                ? "Intenta con otro término de búsqueda."
                : "Subí tu primer documento para alimentar el criterio de los agentes."}
            </p>
            {!search && (
              <Button variant="outline" className="mt-4" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Subir primer documento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</h2>
                <span className="text-xs text-muted-foreground/60">{group.docs.length}</span>
              </div>
              <div className="grid gap-3">
                {group.docs.map((doc: DocRow) => {
                  const status: ProcessingStatus = (doc.processing_status as ProcessingStatus) || (doc.content ? "ready" : "pending");
                  const meta = STATUS_META[status] || STATUS_META.pending;
                  // B18 (auditoría 2026-08-31): reprocesar desde cualquier estado
                  // que no sea "ready" ni un estado activo con spinner.
                  const canRetry = status !== "ready" && !meta.spinning;
                  return (
                    <Card key={doc.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.file_type || "documento"} ·{" "}
                              {new Date(doc.created_at).toLocaleDateString("es-AR")}
                              {doc.word_count ? ` · ${doc.word_count} palabras` : ""}
                            </p>
                            {status === "error" && doc.processing_error && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {doc.processing_error}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={doc.category || "otro"}
                            onValueChange={(v) => categoryMutation.mutate({ id: doc.id, category: v })}
                          >
                            <SelectTrigger className="h-8 w-[170px] text-xs" aria-label={`Categoría de ${doc.title}`}>
                              <SelectValue>{docCategoryLabel(doc.category)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {DOC_CATEGORIES.map((c) => (
                                <SelectItem key={c.key} value={c.key} className="text-xs">
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge variant={meta.variant}>
                            {meta.spinning && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                            {meta.label}
                          </Badge>
                          {canRetry && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Reprocesar ${doc.title}`}
                              title="Reprocesar documento"
                              onClick={() =>
                                processMutation.mutate(doc.id, {
                                  onSuccess: () => toast({ title: "Reprocesando", description: `"${doc.title}" está procesándose de nuevo.` }),
                                })
                              }
                              disabled={processMutation.isPending && processMutation.variables === doc.id}
                            >
                              <RotateCw
                                className={
                                  processMutation.isPending && processMutation.variables === doc.id
                                    ? "h-4 w-4 animate-spin"
                                    : "h-4 w-4"
                                }
                              />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar ${doc.title}`}
                            onClick={() => setDeleteTarget(doc.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            Error al subir: {uploadMutation.error?.message}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar documento"
        description="¿Estás seguro de que querés eliminar este documento? Esta acción no se puede deshacer y se perderán todos los chunks y embeddings asociados."
        confirmText="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
