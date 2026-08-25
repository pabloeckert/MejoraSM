// src/services/github.ts
// Cliente de GitHub para escribir contenido real desde el EDA — mismo
// patrón y MISMA clave de localStorage que biblioteca/github.js
// (mc_biblioteca_gh_token). Al ser el mismo origen (pabloeckert.github.io),
// conectar el token acá también deja conectada la Biblioteca, y viceversa
// — una sola sesión de GitHub para todo el sitio, no dos independientes.
//
// SEGURIDAD: el token (fine-grained PAT, permiso Contents: Read and write
// solo sobre este repo) se guarda ÚNICAMENTE en localStorage de este
// navegador — nunca se commitea, nunca viaja a ningún backend propio.

const GH_OWNER = "pabloeckert";
const GH_REPO = "MejoraSM";
const GH_BRANCH = "main";
const TOKEN_KEY = "mc_biblioteca_gh_token";

export interface GhFileEntry {
  name: string;
  type: "file" | "dir";
  path: string;
}

export interface GhWhoami {
  ok: boolean;
  login?: string;
  canWrite?: boolean;
  error?: string;
}

function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function setToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // sin localStorage disponible: queda sin conectar, no rompe nada más
  }
}

function isConnected(): boolean {
  return !!getToken();
}

function apiBase(): string {
  return `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`;
}

function apiHeaders(withAuth: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (withAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function whoami(): Promise<GhWhoami> {
  const token = getToken();
  if (!token) return { ok: false, error: "Sin token" };
  try {
    const userRes = await fetch("https://api.github.com/user", { headers: apiHeaders(true) });
    if (userRes.status === 401) return { ok: false, error: "Token inválido o vencido" };
    if (!userRes.ok) return { ok: false, error: `GitHub respondió ${userRes.status}` };
    const user = await userRes.json();

    const repoRes = await fetch(apiBase(), { headers: apiHeaders(true) });
    if (!repoRes.ok) return { ok: false, error: `El token no tiene acceso a ${GH_OWNER}/${GH_REPO}` };
    const repo = await repoRes.json();

    return { ok: true, login: user.login, canWrite: !!repo.permissions?.push };
  } catch {
    return { ok: false, error: "No se pudo contactar GitHub (¿sin internet?)" };
  }
}

// Lista una carpeta del repo — [] si no existe (404 es un caso normal acá,
// no un error: significa que esa oferta todavía no tiene nada subido).
async function listDir(path: string): Promise<GhFileEntry[]> {
  const url = `${apiBase()}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${GH_BRANCH}`;
  const res = await fetch(url, { headers: apiHeaders(isConnected()) });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((d: { name: string; type: string; path: string }) => ({
    name: d.name,
    type: d.type === "dir" ? "dir" : "file",
    path: d.path,
  }));
}

async function putFile(path: string, base64Content: string, message: string, sha?: string) {
  if (!isConnected()) throw new Error("No conectado a GitHub");
  const url = `${apiBase()}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
  const body: Record<string, unknown> = { message, content: base64Content, branch: GH_BRANCH };
  if (sha) body.sha = sha;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: { ...apiHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Hallazgo real de auditoría 2026-08-25: a diferencia de whoami(), este
    // fetch no tenía try/catch — si fallaba la conexión (sin señal, DNS,
    // CORS), el error crudo del navegador ("Failed to fetch") le llegaba
    // tal cual a alguien sin contexto técnico subiendo una foto del celular.
    throw new Error("No se pudo contactar GitHub (¿sin internet o señal débil?) — probá de nuevo.");
  }

  if (res.status === 401) throw new Error("El token venció o es inválido — reconectá GitHub.");
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).message || "";
    } catch {
      // sin detalle disponible, se usa el mensaje genérico
    }
    throw new Error(`No se pudo commitear (${res.status}${detail ? `: ${detail}` : ""})`);
  }
  return res.json();
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

// URL pública de un archivo del repo — vía raw.githubusercontent.com,
// aceptable acá porque es solo para miniaturas de imagen (si el CDN tiene
// un hiccup transitorio, se ve una miniatura rota, no se rompe la página;
// distinto del caso del historial, que era el dato principal de toda la
// pantalla — ver fix del Monitor, 2026-08-17).
function rawUrl(path: string): string {
  return `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${path}`;
}

export const github = {
  owner: GH_OWNER,
  repo: GH_REPO,
  getToken,
  setToken,
  isConnected,
  whoami,
  listDir,
  putFile,
  commitPhoto,
  rawUrl,
};
