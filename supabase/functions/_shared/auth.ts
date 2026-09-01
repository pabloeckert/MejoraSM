// supabase/functions/_shared/auth.ts
//
// Guard de autorización compartido por todas las Edge Functions del EDA.
//
// Cada función exige UNA de estas dos cosas:
//   1. Un JWT de Supabase Auth cuyo email esté en app_admins (llamadas del
//      frontend, con sesión iniciada — una sola cuenta compartida).
//   2. La SUPABASE_SERVICE_ROLE_KEY como Bearer token (server-to-server:
//      cron de GitHub Actions, otra Edge Function).
//
// 2026-08-31 — se sacó la rama que aceptaba la anon key pelada (agregada el
// 2026-08-25 cuando el EDA quedó abierto). Pablo pidió volver a cerrar el
// acceso con usuario/contraseña — ver 023_reclose_access_password.sql y
// CLAUDE.md, sección "Reinstauración del login — usuario/contraseña,
// 2026-08-31".
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

  // La anon key pelada ya NO alcanza (rama sacada el 2026-08-31) — hace
  // falta un JWT real de un usuario en app_admins, o el service role.
  if (token === anonKey) {
    return { ok: false, status: 401, error: "Necesitás iniciar sesión" };
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
