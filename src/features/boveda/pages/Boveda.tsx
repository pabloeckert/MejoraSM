import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, Loader2, Search } from "lucide-react";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/features/boveda/hooks/useVault";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file, {
        onSuccess: () => {
          if (fileRef.current) fileRef.current.value = "";
        },
      });
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget, {
        onSettled: () => setDeleteTarget(null),
      });
    }
  };

  const filteredDocs = documents?.filter((d: any) =>
    d.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bóveda de Conocimiento
          </h1>
          <p className="mt-1 text-muted-foreground">
            Sube tus manuales de marca, buyer persona y tono de voz.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Subir documento
          </Button>
        </div>
      </div>

      {documents && documents.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
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
                : "Sube tu primer documento para alimentar el criterio de los agentes."}
            </p>
            {!search && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Subir primer documento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredDocs.map((doc: any) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.file_type || "documento"} ·{" "}
                      {new Date(doc.created_at).toLocaleDateString("es-AR")}
                      {doc.word_count ? ` · ${doc.word_count} palabras` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={doc.content ? "default" : "secondary"}>
                    {doc.content ? "Procesado" : "Pendiente"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(doc.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
