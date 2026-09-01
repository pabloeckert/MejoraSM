import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "@/services/supabase";
import { processDocument } from "@/services/ai";
import { toast } from "@/hooks/use-toast";

const PROCESSING_STATUSES = ["pending", "extracting", "chunking", "embedding"];

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await documentsApi.list();
      if (error) throw error;
      return data;
    },
    // Mientras algún documento sigue procesando (extracción/chunking/
    // embeddings, puede tardar varios segundos), refetch cada 3s para que
    // el badge de estado se actualice solo — hallazgo real de auditoría
    // 2026-08-25: antes había que navegar a otra pantalla y volver para
    // enterarse de que terminó.
    refetchInterval: (query) => {
      const docs = query.state.data as Array<{ processing_status?: string }> | undefined;
      const stillProcessing = docs?.some((d) => PROCESSING_STATUSES.includes(d.processing_status || ""));
      return stillProcessing ? 3000 : false;
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const { data, error } = await documentsApi.get(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const doc = await documentsApi.upload(file);
      // Procesamiento asincrónico (no bloquea el toast de "subido"), pero
      // si falla ya no se traga en silencio (hallazgo real de auditoría
      // 2026-08-25) — se avisa con un toast real y se invalida la query
      // para que el badge de error se vea sin recargar la página.
      if (doc?.id) {
        processDocument(doc.id)
          .catch((err) => {
            console.warn("[useVault] Auto-procesamiento falló:", err.message);
            toast({
              variant: "destructive",
              title: `No se pudo procesar "${file.name}"`,
              description: err.message || "Error desconocido — probá reprocesarlo desde la tarjeta del documento.",
            });
          })
          .finally(() => qc.invalidateQueries({ queryKey: ["documents"] }));
      }
      return doc;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    // B1/B31: documentsApi.delete puede tirar (storage) o devolver { error }
    // (el DELETE final) sin rechazar — chequeamos las dos cosas.
    mutationFn: async (id: string) => {
      const res = await documentsApi.delete(id);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "No se pudo borrar el documento", description: err.message }),
  });
}

export function useSetDocumentCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) => {
      const { error } = await documentsApi.setCategory(id, category);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "No se pudo cambiar la categoría", description: err.message }),
  });
}

export function useProcessDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => processDocument(documentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "No se pudo reprocesar el documento",
        description: err.message || "Error desconocido",
      });
    },
  });
}
