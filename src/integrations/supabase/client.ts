// Cliente ÚNICO de Supabase para todo el frontend. Antes había dos
// createClient() — este y otro en src/services/supabase.ts — que producían
// el warning real "Multiple GoTrueClient instances detected in the same
// browser context" (hallazgo auditoría en vivo 2026-09-07), con riesgo de
// carreras al refrescar el token de auth sobre la misma storage key.
// src/services/supabase.ts ahora re-exporta ESTE cliente.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn("[supabase] Variables de entorno no configuradas. Configurá VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.");
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Placeholder con formato válido para el caso sin .env: createClient() valida
// la URL de forma síncrona al importar y con "" tira "supabaseUrl is required",
// rompiendo test/build que solo importan el módulo sin usar la conexión real.
export const supabase = createClient<Database>(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_PUBLISHABLE_KEY || "placeholder-anon-key",
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);