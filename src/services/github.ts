// src/services/github.ts
//
// 2026-09-01 — reescrito de punta a punta. Pedido explícito de Pablo: "que
// en ninguna [pantalla] se vea github, que todo pase por MejoraSM". Hasta
// acá este archivo hablaba DIRECTO con la API de GitHub usando un token
// personal que Pablo pegaba a mano en el navegador (guardado en
// localStorage) — con el badge "GitHub conectado", el diálogo de conectar,
// el link a github.com/settings/tokens, y la fricción real de tener que
// regenerar el token cada vez que hacía falta un permiso nuevo (pasó el
// 2026-08-31/09-01, ver CLAUDE.md).
//
// Ahora este archivo es un cliente liviano de la Edge Function `repo`
// (supabase/functions/repo/index.ts), que guarda el token del lado del
// servidor (GITHUB_TOKEN, secret de Supabase) y hace las llamadas reales a
// GitHub por acá. El frontend nunca vuelve a pedir, guardar ni mostrar un
// token — la única credencial que importa es la sesión de MejoraSM
// (Supabase Auth), la misma que ya usa el resto de la app.
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface GhFileEntry {
  name: string;
  type: "file" | "dir";
  path: string;
}

async function buildHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    apikey: SUPABASE_ANON_KEY ?? "",
  };
}

async function call<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/repo`, {
      method: "POST",
      headers: await buildHeaders(),
      body: JSON.stringify({ action, ...params }),
    });
  } catch {
    throw new Error("No se pudo guardar — revisá tu conexión y probá de nuevo.");
  }
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `No se pudo completar la acción (${res.status})`);
  }
  return data as T;
}

async function listDir(path: string): Promise<GhFileEntry[]> {
  const { entries } = await call<{ entries: GhFileEntry[] }>("listDir", { path });
  return entries;
}

// Lee un archivo JSON. Usado para pollear content/work/publish-now.json en
// el flujo "Publicar ahora".
async function getJsonFile<T = unknown>(path: string): Promise<T | null> {
  const { exists, text } = await call<{ exists: boolean; text?: string }>("readFile", { path });
  if (!exists || !text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function putFile(path: string, base64Content: string, message: string) {
  return call<{ ok: true }>("writeFile", { path, contentBase64: base64Content, message });
}

async function putJsonFile(path: string, obj: unknown, message: string) {
  const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
  return putFile(path, base64, message);
}

function dataUrlToBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

async function commitPhoto(dimension: string, filename: string, dataUrl: string) {
  const base64 = dataUrlToBase64(dataUrl);
  const path = `content/inbox/${dimension}/${filename}`;
  return putFile(path, base64, `subir material: ${dimension}/${filename}`);
}

async function triggerWorkflow(workflowFile: string, inputs: Record<string, string> = {}): Promise<void> {
  await call("dispatchWorkflow", { workflowFile, inputs });
}

// URL pública de un archivo del repo — no es una página con nada de marca
// GitHub, es la imagen/archivo directo.
function rawUrl(path: string): string {
  return `https://raw.githubusercontent.com/pabloeckert/MejoraSM/main/${path}`;
}

export const github = {
  owner: "pabloeckert",
  repo: "MejoraSM",
  listDir,
  putFile,
  putJsonFile,
  commitPhoto,
  triggerWorkflow,
  getJsonFile,
  rawUrl,
};
