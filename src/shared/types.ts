// PM5 (auditoría 2026-08-31): tipos livianos de fila para bajar los `any` que
// venían de leer `data` crudo de PostgREST (sin generated types de Supabase).
// No pretenden ser exhaustivos — solo lo que la UI usa.

export interface ProposalRow {
  id: string;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  format: string | null;
  status: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string | null;
  oferta: string | null;
  rendered_image_path: string | null;
  zernio_post_id: string | null;
  is_test?: boolean | null;
  dialogue_sessions?: { topic: string | null } | null;
}

export interface DocRow {
  id: string;
  title: string | null;
  file_type: string | null;
  created_at: string;
  word_count?: number | null;
  content?: string | null;
  processing_status?: string | null;
  processing_error?: string | null;
  category?: string | null;
}
