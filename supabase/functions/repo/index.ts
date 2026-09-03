// supabase/functions/repo/index.ts
//
// Proxy server-side al repo de GitHub — Fase "sacar GitHub de encima"
// (2026-09-01, pedido explícito de Pablo: "que en ninguna [pantalla] se vea
// github, que todo pase por MejoraSM"). Hasta ahora el frontend (Hub,
// Monitor, PublishNowCard, useGithubUpload) hablaba DIRECTO con la API de
// GitHub usando un token personal que Pablo pegaba a mano en el navegador
// (guardado en localStorage) — visible, con fricción de reconectar cada vez
// que hacía falta un permiso nuevo (pasó real el 2026-08-31/09-01 con
// Actions), y viviendo del lado del cliente.
//
// Ahora ese token vive ACÁ, como secret de Supabase (GITHUB_TOKEN), y el
// frontend nunca vuelve a tocar la API de GitHub ni a pedir un token —
// habla con esta función, con la MISMA sesión que ya usa para todo lo
// demás (requireAuth). src/services/github.ts es el único lugar del
// frontend que sabe que esto existe.
//
// Acciones:
//   { action: "listDir", path }
//     → { entries: [{ name, type: "file"|"dir", path }] }
//   { action: "readFile", path }
//     → { exists: true, text: string } | { exists: false }
//   { action: "writeFile", path, contentBase64, message }
//     → { ok: true }  (resuelve el sha actual solo — no hace falta pasarlo)
//   { action: "dispatchWorkflow", workflowFile, inputs }
//     → { ok: true }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { logRun } from "../_shared/runLog.ts";

const OWNER = "pabloeckert";
const REPO = "MejoraSM";
const BRANCH = "main";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

const ALLOWED_ORIGINS = [
  "https://pabloeckert.github.io",
  "https://mejorasm.mejoraok.com",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

class ValidationError extends Error {}

function validateBody(body: Record<string, unknown>, required: string[]) {
  const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === "");
  if (missing.length > 0) throw new ValidationError(`Campos requeridos faltantes: ${missing.join(", ")}`);
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function encPath(path: string) {
  return encodeURIComponent(path).replace(/%2F/g, "/");
}

async function listDir(token: string, path: string) {
  const res = await fetch(`${API}/contents/${encPath(path)}?ref=${BRANCH}`, { headers: ghHeaders(token) });
  if (res.status === 404) return { entries: [] };
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [];
  return {
    entries: arr.map((d: { name: string; type: string; path: string }) => ({
      name: d.name,
      type: d.type === "dir" ? "dir" : "file",
      path: d.path,
    })),
  };
}

async function readFile(token: string, path: string) {
  const res = await fetch(`${API}/contents/${encPath(path)}?ref=${BRANCH}`, { headers: ghHeaders(token) });
  if (res.status === 404) return { exists: false };
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (data.encoding !== "base64" || !data.content) return { exists: false };
  const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
  return { exists: true, text: new TextDecoder("utf-8").decode(bytes) };
}

async function writeFile(token: string, path: string, contentBase64: string, message: string) {
  // Resolver el sha actual (si el archivo ya existe) — la API de contents lo
  // exige para actualizar, no para crear.
  const cur = await fetch(`${API}/contents/${encPath(path)}?ref=${BRANCH}`, { headers: ghHeaders(token) });
  const sha = cur.ok ? (await cur.json()).sha : undefined;

  const res = await fetch(`${API}/contents/${encPath(path)}`, {
    method: "PUT",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: contentBase64, branch: BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return { ok: true };
}

async function dispatchWorkflow(token: string, workflowFile: string, inputs: Record<string, string>) {
  const res = await fetch(`${API}/actions/workflows/${workflowFile}/dispatches`, {
    method: "POST",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: BRANCH, inputs }),
  });
  if (res.status === 403 || res.status === 404) {
    throw new Error('El token del servidor no tiene permiso para ejecutar workflows (falta "Actions: Read and write").');
  }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return { ok: true };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req);
  if (!auth.ok) return unauthorizedResponse(auth, corsHeaders);

  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "GITHUB_TOKEN no configurado en el servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = Date.now();
  let action: string | undefined;
  try {
    const body = await req.json();
    ({ action } = body);

    let result: unknown;
    switch (action) {
      case "listDir":
        validateBody(body, ["path"]);
        result = await listDir(token, body.path);
        break;
      case "readFile":
        validateBody(body, ["path"]);
        result = await readFile(token, body.path);
        break;
      case "writeFile":
        validateBody(body, ["path", "contentBase64", "message"]);
        result = await writeFile(token, body.path, body.contentBase64, body.message);
        break;
      case "dispatchWorkflow":
        validateBody(body, ["workflowFile"]);
        result = await dispatchWorkflow(token, body.workflowFile, body.inputs || {});
        break;
      default:
        throw new ValidationError("Acción no válida");
    }

    await logRun({ source: "repo", step: action, status: "success", durationMs: Date.now() - startedAt });
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logRun({ source: "repo", step: action || "unknown", status: "error", durationMs: Date.now() - startedAt, error: message });
    const status = e instanceof ValidationError ? 400 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
