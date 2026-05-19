import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "@/services/supabase";
import { processDocument } from "@/services/ai";

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await documentsApi.list();
      if (error) throw error;
      return data;
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
      // Trigger async processing (non-blocking)
      if (doc?.id) {
        processDocument(doc.id).catch((err) => {
          console.warn("[useVault] Auto-procesamiento falló:", err.message);
        });
      }
      return doc;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useProcessDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => processDocument(documentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}
