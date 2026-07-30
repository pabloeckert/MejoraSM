// supabase/functions/_shared/auth.ts
//
// Guard de autorización compartido por todas las Edge Functions del EDA.
// Antes de esto, ninguna función validaba quién llamaba — solo el apikey
// público (anon key), que cualquiera puede leer del bundle del frontend.
// Con esto, cada función exige UNA de estas dos cosas:
//
//   1. Un JWT de usuario de Supabase Auth cuyo email esté en la tabla
//      app_admins (llamadas desde el frontend, sesión iniciada). Es la
//      MISMA tabla que usa is_app_admin() para el RLS de Postgres — una
//      sola fuente de verdad para "quién es admin", no una lista aparte
//      en un secret que se puede desincronizar (así estaba antes, con
//      ADMIN_EMAILS + un default hardcodeado; se sacaron los dos).
//   2. La propia SUPABASE_SERVICE_ROLE_KEY como Bearer token (llamadas
//      servidor-a-servidor: cron de GitHub Actions, otra Edge Function).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  ok: boolean;
  status?: number;
  error?: string;
  email?: string;
}

export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { ok: false, status: 401, error: "Falta el header Authorization" };
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { ok: true, email: "service-role" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, error: "Config de Supabase incompleta en la función" };
  }

  const client = createClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Token inválido o vencido" };
  }

  const email = (data.user.email || "").toLowerCase();
  if (!email) {
    return { ok: false, status: 403, error: "Usuario autenticado pero sin permiso para esta función" };
  }

  if (!serviceKey) {
    return { ok: false, status: 500, error: "Config de Supabase incompleta en la función" };
  }

  // app_admins tiene RLS sin políticas para anon/authenticated (a propósito,
  // ver 006_real_rls_and_auth.sql) — hace falta el service role para leerla.
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: adminRow, error: adminError } = await adminClient
    .from("app_admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (adminError) {
    return { ok: false, status: 500, error: "Error verificando permisos de admin" };
  }
  if (!adminRow) {
    return { ok: false, status: 403, error: "Usuario autenticado pero sin permiso para esta función" };
  }

  return { ok: true, email };
}

export function unauthorizedResponse(result: AuthResult, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: result.error || "No autorizado" }), {
    status: result.status || 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
