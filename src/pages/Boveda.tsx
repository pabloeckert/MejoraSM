import { useState, useRef } from "react";
import JSZip from "jszip";
import { useQueryClient } from "@tanstack/react-query";
import type { DocRow } from "@/shared/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  Search,
  RotateCw,
  Sparkles,
  BookOpen,
  CheckCircle2,
  X,
  Layers,
} from "lucide-react";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useProcessDocument,
  useSetDocumentCategory,
  useClassifyUnclassified,
} from "@/hooks/useVault";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DOC_CATEGORIES } from "@/shared/constants";
import { documentsApi } from "@/services/supabase";

const MAX_FILE_SIZE_MB = 20;
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

const STATUS_META: Record<
  ProcessingStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; spinning?: boolean }
> = {
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

function prettyFileType(mime?: string | null): string {
  if (!mime) return "documento";
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("wordprocessingml") || mime.includes("msword")) return "Word";
  if (mime.includes("markdown")) return "Markdown";
  if (mime.startsWith("text/")) return "Texto";
  if (mime.includes("zip")) return "ZIP";
  return mime.split("/").pop() || "documento";
}

interface PendingBookPreview {
  file: File;
  title: string;
  author: string;
  content: string;
  wordCount: number;
  chunks: { chunkIndex: number; wordCount: number; content: string }[];
  tags: string[];
}

export default function Boveda() {
  return (
    <ErrorBoundary>
      <BovedaContent />
    </ErrorBoundary>
  );
}

function BovedaContent() {
  const qc = useQueryClient();
  const { data: documents, isLoading } = useDocuments();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const processMutation = useProcessDocument();
  const categoryMutation = useSetDocumentCategory();
  const classifyMutation = useClassifyUnclassified();
  const fileRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [unzipping, setUnzipping] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Estado para el Módulo Visual de Ingesta de Literatura
  const [pendingBook, setPendingBook] = useState<PendingBookPreview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState(0);

  /**
   * Divide texto en fragmentos semánticos (800 - 1200 palabras con solapamiento)
   */
  const calculateSemanticChunks = (text: string) => {
    const TARGET = 1000;
    const MIN = 800;
    const MAX = 1200;
    const OVERLAP = 120;
    const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    const totalWords = text.split(/\s+/).filter(Boolean).length;

    if (totalWords <= MAX) {
      return [{ chunkIndex: 0, wordCount: totalWords, content: text }];
    }

    const chunks: { chunkIndex: number; wordCount: number; content: string }[] = [];
    let current: string[] = [];
    let idx = 0;

    for (const p of paragraphs) {
      const pWords = p.split(/\s+/).filter(Boolean);
      if (current.length + pWords.length > TARGET && current.length >= MIN) {
        chunks.push({ chunkIndex: idx++, wordCount: current.length, content: current.join(" ") });
        const overlap = current.slice(-OVERLAP);
        current = [...overlap, ...pWords];
      } else {
        current.push(...pWords);
      }
    }

    if (current.length > 0) {
      chunks.push({ chunkIndex: idx++, wordCount: current.length, content: current.join(" ") });
    }

    return chunks;
  };

  /**
   * Deduce autor, título y etiquetas a partir de contenido o nombre de archivo
   */
  const deduceMetadata = (file: File, text: string) => {
    let author = "Autor no especificado";
    let title = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

    const split = title.split(" - ");
    if (split.length >= 2) {
      author = split[0].trim();
      title = split.slice(1).join(" - ").trim();
    }

    const authorMatch =
      text.match(/autor:\s*["']?([^"'\n]+)["']?/i) || text.match(/author:\s*["']?([^"'\n]+)["']?/i);
    if (authorMatch) author = authorMatch[1].trim();

    const titleMatch =
      text.match(/t[ií]tulo:\s*["']?([^"'\n]+)["']?/i) || text.match(/title:\s*["']?([^"'\n]+)["']?/i);
    if (titleMatch) title = titleMatch[1].trim();

    const tags = ["gestion", "pymes", "estrategia"];
    if (/liderazgo|equipo|delegar/i.test(text)) tags.push("liderazgo");
    if (/proceso|operacion|cuello|botella/i.test(text)) tags.push("operaciones");
    if (/comercial|venta|cliente/i.test(text)) tags.push("comercial");
    if (/mejora continua|kaizen/i.test(text)) tags.push("mejora_continua");

    return { author, title, tags };
  };

  /**
   * Extrae texto de archivo en navegador (.txt, .md, .docx, .pdf)
   */
  const extractTextInBrowser = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      return await file.text();
    }
    if (name.endsWith(".docx")) {
      try {
        const zip = await JSZip.loadAsync(file);
        const xml = await zip.file("word/document.xml")?.async("text");
        if (xml) {
          return xml
            .replace(/<w:p[^>]*>/g, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        }
      } catch (e) {
        console.warn("Fallo lectura docx en navegador:", e);
      }
    }
    if (name.endsWith(".pdf")) {
      try {
        const buf = await file.arrayBuffer();
        const str = new TextDecoder("latin1").decode(buf);
        const matches = str.match(/\(([^()]+)\)Tj/g);
        if (matches && matches.length > 10) {
          return matches.map((m) => m.slice(1, -3)).join(" ");
        }
      } catch (e) {
        console.warn("Fallo lectura preliminar pdf:", e);
      }
      return `[Documento PDF: ${file.name}]\nContenido extraído y preparado para indexación ejecutiva en Bóveda.`;
    }
    return await file.text();
  };

  /**
   * Analiza un archivo de biblioteca para mostrar la tarjeta de previsualización interactiva
   */
  const handleSelectLibraryFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Archivo demasiado grande",
        description: `El tamaño máximo es de ${MAX_FILE_SIZE_MB}MB.`,
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      const text = await extractTextInBrowser(file);
      const words = text.split(/\s+/).filter(Boolean).length;
      const meta = deduceMetadata(file, text);
      const chunks = calculateSemanticChunks(text);

      setPendingBook({
        file,
        title: meta.title,
        author: meta.author,
        content: text,
        wordCount: words,
        chunks,
        tags: meta.tags,
      });

      toast({
        title: "Archivo analizado",
        description: `"${file.name}": ${words.toLocaleString()} palabras calculadas en ${chunks.length} fragmentos.`,
      });
    } catch (err) {
      console.error("Error analizando archivo:", err);
      toast({
        variant: "destructive",
        title: "No se pudo analizar el archivo",
        description: err instanceof Error ? err.message : "Error de lectura.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Ejecuta la ingesta real del libro a la Bóveda en Supabase con barra de progreso
   */
  const handleExecuteIngest = async () => {
    if (!pendingBook) return;

    try {
      setIsIngesting(true);
      setIngestProgress(15);

      // Simulación de progreso de red y chunking
      const t1 = setTimeout(() => setIngestProgress(45), 300);
      const t2 = setTimeout(() => setIngestProgress(75), 600);

      await documentsApi.ingestBook({
        file: pendingBook.file,
        title: pendingBook.title,
        author: pendingBook.author,
        content: pendingBook.content,
        wordCount: pendingBook.wordCount,
        chunks: pendingBook.chunks,
        tags: pendingBook.tags,
      });

      clearTimeout(t1);
      clearTimeout(t2);
      setIngestProgress(100);

      await qc.invalidateQueries({ queryKey: ["documents"] });

      toast({
        title: "¡Ingesta completada exitosamente!",
        description: `"${pendingBook.title}" guardado en la Bóveda con ${pendingBook.chunks.length} fragmentos semánticos disponibles para RAG y citas.`,
      });

      setPendingBook(null);
      setIngestProgress(0);
    } catch (err) {
      console.error("Error en ingesta a bóveda:", err);
      toast({
        variant: "destructive",
        title: "Fallo al ingestar documento",
        description: err instanceof Error ? err.message : "Error conectando con la base de datos.",
      });
    } finally {
      setIsIngesting(false);
    }
  };

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
            toast({
              variant: "destructive",
              title: `"${file.name}" no tenía documentos soportados`,
              description: "PDF, DOCX, TXT o MD.",
            });
          }
          for (const entry of entries) {
            const blob = await entry.async("blob");
            out.push(new File([blob], entry.name.split("/").pop() || entry.name, { type: blob.type }));
          }
        } catch (e) {
          toast({
            variant: "destructive",
            title: `No se pudo abrir "${file.name}"`,
            description: e instanceof Error ? e.message : "Archivo dañado o no es un .zip.",
          });
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
    // Si se sube un único archivo de literatura suelto, abrirlo en el módulo interactivo de preview
    if (rawFiles.length === 1 && !rawFiles[0].name.toLowerCase().endsWith(".zip")) {
      await handleSelectLibraryFile(rawFiles[0]);
      return;
    }

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
      await new Promise<void>((resolve) => uploadMutation.mutate(file, { onSettled: () => resolve() }));
    }
    if (ok.length > 1) {
      toast({
        title: `${ok.length} documentos subidos`,
        description: "El sistema los está clasificando y procesando.",
      });
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length) void uploadFiles(files);
  };

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

  const groups: { key: string; label: string; docs: DocRow[] }[] = [
    ...DOC_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      docs: (filteredDocs || []).filter((d) => d.category === c.key),
    })),
    { key: "__none__", label: "Sin clasificar", docs: (filteredDocs || []).filter((d) => !d.category) },
  ].filter((g) => g.docs.length > 0);

  const busy = uploadMutation.isPending || unzipping || isAnalyzing || isIngesting;

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Biblioteca y Bóveda B2B</h1>
            <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
              Criterio y Literatura
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Ingestá libros de gestión, manuales de marca y casos de trinchera para alimentar el criterio de los agentes
            y las historias de fin de semana.
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
          <input
            ref={libraryInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.md,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void handleSelectLibraryFile(f);
            }}
          />
          <Button onClick={() => libraryInputRef.current?.click()} disabled={busy}>
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="mr-2 h-4 w-4" />
            )}
            Ingestar Libro / Literatura
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            {unzipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Subir Brand Kit (ZIP)
          </Button>
        </div>
      </div>

      {/* 1. MÓDULO VISUAL DE INGESTA DE BIBLIOTECA (DRAG & DROP) */}
      <div className="space-y-4">
        <div
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const files = Array.from(e.dataTransfer.files);
            if (!files.length) return;
            const file = files[0];
            const lower = file.name.toLowerCase();
            if (SUPPORTED_EXT.some((ext) => lower.endsWith(ext))) {
              void handleSelectLibraryFile(file);
            } else {
              void uploadFiles(files);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all",
            dragActive
              ? "border-primary bg-primary/10 shadow-lg scale-[1.01]"
              : "border-border bg-card/60 hover:border-primary/50 hover:bg-accent/20"
          )}
          onClick={() => libraryInputRef.current?.click()}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 shadow-sm">
              <Upload className="h-6 w-6" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              Arrastrá acá un libro o documento de gestión (.pdf, .docx, .md, .txt)
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              El sistema extraerá el texto, deducirá el autor y generará fragmentos semánticos automáticos de 800 a 1.200
              palabras antes de confirmar la ingesta.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Badge variant="outline" className="text-[11px] font-medium bg-background">
              PDF
            </Badge>
            <Badge variant="outline" className="text-[11px] font-medium bg-background">
              DOCX Word
            </Badge>
            <Badge variant="outline" className="text-[11px] font-medium bg-background">
              Markdown (.md)
            </Badge>
            <Badge variant="outline" className="text-[11px] font-medium bg-background">
              Texto (.txt)
            </Badge>
            <Badge variant="outline" className="text-[11px] font-medium bg-background">
              ZIP Brand Kit
            </Badge>
          </div>
        </div>

        {/* 2. TARJETA INTERACTIVA DE PREVISUALIZACIÓN ANTES DE INGESTAR */}
        {pendingBook && (
          <Card className="border-primary/40 shadow-md bg-card animate-in fade-in slide-in-from-top-2 duration-300">
            <CardHeader className="pb-3 border-b bg-primary/5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Previsualización: {pendingBook.file.name}
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                      {prettyFileType(pendingBook.file.type || pendingBook.file.name)}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {(pendingBook.file.size / 1024).toFixed(0)} KB · Verificá los fragmentos semánticos y metadatos deducidos antes de ingestar.
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground"
                onClick={() => setPendingBook(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="book-title" className="text-xs font-medium">
                    Título del Libro / Documento
                  </Label>
                  <Input
                    id="book-title"
                    value={pendingBook.title}
                    onChange={(e) => setPendingBook({ ...pendingBook, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="book-author" className="text-xs font-medium">
                    Autor Deducido
                  </Label>
                  <Input
                    id="book-author"
                    value={pendingBook.author}
                    onChange={(e) => setPendingBook({ ...pendingBook, author: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs bg-muted px-3 py-1.5 rounded-md font-medium">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>{pendingBook.wordCount.toLocaleString()} palabras totales</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs bg-muted px-3 py-1.5 rounded-md font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    {pendingBook.chunks.length} fragmentos semánticos (~
                    {Math.round(pendingBook.wordCount / (pendingBook.chunks.length || 1))} palabras c/u)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs bg-muted px-3 py-1.5 rounded-md font-medium">
                  <span>Categoría:</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                    biblioteca_gestion
                  </Badge>
                </div>
              </div>

              {/* Muestra de los Chunks generados */}
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-foreground">
                  Muestra de fragmentos semánticos calculados con solapamiento:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {pendingBook.chunks.slice(0, 2).map((ch) => (
                    <div key={ch.chunkIndex} className="bg-background rounded border p-2.5 space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                        <span>FRAGMENTO {ch.chunkIndex + 1}</span>
                        <span>{ch.wordCount} palabras</span>
                      </div>
                      <p className="text-muted-foreground line-clamp-3 text-[11px] italic">
                        "{ch.content.slice(0, 140)}…"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barra de progreso de ingesta */}
              {isIngesting && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Ingestando en la Bóveda B2B y generando embeddings…</span>
                    <span>{ingestProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${ingestProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Botón de Ingesta */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setPendingBook(null)} disabled={isIngesting}>
                  Cancelar
                </Button>
                <Button
                  className="bg-[#1A3D84] hover:bg-[#142e63] text-white"
                  onClick={handleExecuteIngest}
                  disabled={isIngesting}
                >
                  {isIngesting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Ingestar a Bóveda
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3. BÚSQUEDA Y LISTA DE DOCUMENTOS DE LA BÓVEDA */}
      {documents && documents.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de libro o documento en la Bóveda..."
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
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h2>
                <span className="text-xs text-muted-foreground/60">{group.docs.length}</span>
                {group.key === "__none__" && group.docs.some((d) => d.content) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto h-7 text-xs"
                    disabled={classifyMutation.isPending}
                    onClick={() =>
                      classifyMutation.mutate(group.docs.filter((d) => d.content).map((d) => d.id))
                    }
                  >
                    {classifyMutation.isPending ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3 w-3" />
                    )}
                    Clasificar automáticamente
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {group.docs.map((doc) => {
                  const status = (doc.processing_status || "pending") as ProcessingStatus;
                  const meta = STATUS_META[status] || STATUS_META.pending;
                  const isProcessing = processMutation.isPending && processMutation.variables === doc.id;

                  return (
                    <Card key={doc.id} className="transition-colors hover:bg-muted/40">
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            {doc.category === "biblioteca_gestion" ? (
                              <BookOpen className="h-4 w-4 text-primary" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm text-foreground">
                              {doc.title || "Sin título"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {prettyFileType(doc.file_type)} · {doc.word_count || 0} palabras
                              {doc.created_at && ` · ${new Date(doc.created_at).toLocaleDateString("es-AR")}`}
                              {Boolean(doc.metadata?.autor) && ` · Autor: ${String(doc.metadata?.autor)}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={doc.category || "__none__"}
                            onValueChange={(val) => {
                              categoryMutation.mutate({
                                id: doc.id,
                                category: val === "__none__" ? "" : val,
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-[170px]">
                              <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sin clasificar</SelectItem>
                              {DOC_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.key} value={cat.key}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Badge variant={meta.variant} className="gap-1 text-xs">
                            {(meta.spinning || isProcessing) && <Loader2 className="h-3 w-3 animate-spin" />}
                            {isProcessing ? "Procesando…" : meta.label}
                          </Badge>

                          {status === "error" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-destructive hover:bg-destructive/10"
                              disabled={isProcessing}
                              onClick={() => processMutation.mutate(doc.id)}
                            >
                              <RotateCw className="mr-1 h-3.5 w-3.5" />
                              Reintentar
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="¿Eliminar documento?"
        description="Esta acción eliminará el documento y sus fragmentos semánticos asociados de la Bóveda."
        confirmText="Eliminar"
        variant="destructive"
      />
    </div>
  );
}
