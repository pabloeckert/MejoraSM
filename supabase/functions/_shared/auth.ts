// supabase/functions/_shared/auth.ts
//
// Guard de autorización compartido por todas las Edge Functions del EDA.
//
// 2026-08-25 — DESACTIVADO A PROPÓSITO, decisión explícita de Pablo, no un
// descuido: "es para uso personal, saca el login... que sea sin login". Se
// le explicó el riesgo real antes de tocar nada (sitio en URL pública de
// GitHub Pages, sin login cualquiera con el link podría publicar en
// Instagram/Facebook real, borrar datos, gastar créditos de IA, o leer la
// Bóveda de marca) y confirmó igual: "Nada, es para uso interno entonces
// quiero abrir como cualquier cosa... doble click y listo". Ver también
// 019_open_access_personal_use.sql (revierte el RLS real a "Allow all") y
// CLAUDE.md, sección "Remoción deliberada del login — uso personal,
// 2026-08-25" para el detalle completo.
//
// Ahora acepta también la anon key pelada como credencial válida — es la
// única que el frontend manda desde que no hay sesión de Supabase Auth.
// Se deja intacta la validación de JWT de admin y de service-role por si en
// algún momento se quiere volver a cerrar el acceso (alcanza con sacar la
// rama de la anon key de acá abajo y reaplicar 006_real_rls_and_auth.sql).
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

  if (token === anonKey) {
    return { ok: true, email: "anon-sin-login" };
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
