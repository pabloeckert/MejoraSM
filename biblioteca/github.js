// Cliente de GitHub — Paso 3 (persistencia real, git-based).
//
// La Biblioteca es una página estática pública, pero necesita ESCRIBIR al repo
// (subir fotos a content/inbox/, guardar JSON de datos). Para eso usa la API de
// GitHub con un token personal (fine-grained PAT) con permiso de contenido
// SOLO sobre este repo.
//
// SEGURIDAD: el token se guarda únicamente en el localStorage de ESTE navegador
// (nunca en el código, nunca commiteado, nunca en la página pública). La lectura
// de un repo público no necesita token; solo la escritura (commit) lo usa.
"use strict";

const GH = {
  owner: "pabloeckert",
  repo: "MejoraSM",
  branch: "main",
  tokenKey: "mc_biblioteca_gh_token",

  // ---- Token (solo en este navegador) ----
  getToken() { try { return localStorage.getItem(this.tokenKey) || ""; } catch (e) { return ""; } },
  setToken(t) {
    try {
      if (t) localStorage.setItem(this.tokenKey, t);
      else localStorage.removeItem(this.tokenKey);
    } catch (e) { /* sin localStorage: queda sin conectar */ }
  },
  isConnected() { return !!this.getToken(); },

  _base() { return `https://api.github.com/repos/${this.owner}/${this.repo}`; },
  _headers(withAuth) {
    const h = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (withAuth) {
      const t = this.getToken();
      if (t) h["Authorization"] = "Bearer " + t;
    }
    return h;
  },

  // ---- Validación del token: ¿anda y qué usuario es? ----
  async whoami() {
    const t = this.getToken();
    if (!t) return { ok: false, error: "Sin token" };
    try {
      const res = await fetch("https://api.github.com/user", { headers: this._headers(true) });
      if (res.status === 401) return { ok: false, error: "Token inválido o vencido" };
      if (!res.ok) return { ok: false, error: "GitHub respondió " + res.status };
      const user = await res.json();
      // Chequeo extra: ¿el token puede ver este repo?
      const repoRes = await fetch(this._base(), { headers: this._headers(true) });
      if (!repoRes.ok) return { ok: false, error: "El token no tiene acceso a " + this.owner + "/" + this.repo };
      const repo = await repoRes.json();
      const canWrite = repo.permissions && repo.permissions.push;
      return { ok: true, login: user.login, canWrite: !!canWrite };
    } catch (e) {
      return { ok: false, error: "No se pudo contactar GitHub (¿sin internet?)" };
    }
  },

  // ---- Leer un archivo (devuelve {sha, text} o null si no existe) ----
  // La lectura de repo público no necesita token.
  async getFile(path) {
    try {
      const url = `${this._base()}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${this.branch}`;
      const res = await fetch(url, { headers: this._headers(this.isConnected()) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("GitHub " + res.status);
      const data = await res.json();
      const text = data.content ? decodeURIComponent(escape(atob(data.content.replace(/\n/g, "")))) : "";
      return { sha: data.sha, text };
    } catch (e) {
      throw e;
    }
  },

  // ---- Listar una carpeta (devuelve array de {name, type, path} o [] si no existe) ----
  async listDir(path) {
    try {
      const url = `${this._base()}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${this.branch}`;
      const res = await fetch(url, { headers: this._headers(this.isConnected()) });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("GitHub " + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((d) => ({ name: d.name, type: d.type, path: d.path }));
    } catch (e) {
      throw e;
    }
  },

  // ---- Escribir/crear un archivo (commit). base64Content ya en base64. ----
  async putFile(path, base64Content, message, sha) {
    if (!this.isConnected()) throw new Error("No conectado a GitHub");
    const url = `${this._base()}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
    const body = { message, content: base64Content, branch: this.branch };
    if (sha) body.sha = sha;
    const res = await fetch(url, { method: "PUT", headers: this._headers(true), body: JSON.stringify(body) });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).message || ""; } catch (e) {}
      throw new Error("No se pudo commitear (" + res.status + (detail ? ": " + detail : "") + ")");
    }
    return await res.json();
  },

  // Texto UTF-8 -> base64 (para JSON).
  textToBase64(str) { return btoa(unescape(encodeURIComponent(str))); },

  // dataURL (data:image/...;base64,XXXX) -> solo el base64.
  dataUrlToBase64(dataUrl) {
    const i = dataUrl.indexOf(",");
    return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  },

  // ---- Subir una foto a content/inbox/<dimension>/<filename> ----
  async commitPhoto(dimension, filename, dataUrl) {
    const base64 = this.dataUrlToBase64(dataUrl);
    const path = `content/inbox/${dimension}/${filename}`;
    return this.putFile(path, base64, `biblioteca: subir foto a ${dimension}/${filename}`);
  },
};

if (typeof window !== "undefined") window.GH = GH;
