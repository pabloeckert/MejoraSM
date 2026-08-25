import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { github, type GhWhoami } from "@/services/github";

export function useGithubConnection() {
  const [connected, setConnected] = useState(github.isConnected());
  const [checking, setChecking] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connect(token: string): Promise<GhWhoami> {
    setChecking(true);
    setError(null);
    github.setToken(token);
    const r = await github.whoami();
    if (r.ok && r.canWrite) {
      setConnected(true);
      setUser(r.login ?? null);
    } else if (r.ok && !r.canWrite) {
      // Hallazgo real de auditoría 2026-08-25: un token válido pero de solo
      // lectura (permiso "Contents" en Read-only, un error fácil de cometer
      // siguiendo las propias instrucciones del modal) se aceptaba igual —
      // el badge quedaba en verde y cada foto fallaba después sin que la UI
      // dijera por qué. biblioteca/app.js ya distinguía este caso, acá no.
      github.setToken("");
      setConnected(false);
      setError(`Conectado como ${r.login}, pero el token no tiene permiso de escritura — generá uno nuevo con Contents en "Read and write".`);
    } else {
      github.setToken("");
      setConnected(false);
      setError(r.error ?? "Error desconocido");
    }
    setChecking(false);
    return r;
  }

  function disconnect() {
    github.setToken("");
    setConnected(false);
    setUser(null);
    setError(null);
  }

  return { connected, checking, user, error, connect, disconnect };
}

export function useDirListing(path: string, enabled = true) {
  return useQuery({
    queryKey: ["gh-dir", path],
    queryFn: () => github.listDir(path),
    enabled,
    staleTime: 30_000,
  });
}

interface UploadState {
  id: string;
  file: File;
  fileName: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function usePhotoUpload(dimension: string, onDone?: () => void) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const queryClient = useQueryClient();
  // Cola real (ref, no state) + flag de "procesando" — hallazgo real de
  // auditoría 2026-08-25: confirmar una segunda tanda de fotos mientras la
  // primera seguía subiendo reemplazaba entero el array de estado por
  // índice, y las actualizaciones de la tanda vieja terminaban marcando
  // como "listo"/"error" a fotos de la tanda nueva que no tenían nada que
  // ver. Con una cola FIFO por id, una tanda nueva se agrega al final sin
  // pisar nada, y el mismo loop la sigue procesando de a una imagen por
  // vez (la API de Contents de GitHub no está pensada para escrituras
  // concurrentes sobre la misma rama).
  const queueRef = useRef<UploadState[]>([]);
  const processingRef = useRef(false);

  function safeFilename(name: string): string {
    const extMatch = name.match(/\.[a-z0-9]+$/i);
    const ext = (extMatch ? extMatch[0] : ".jpg").toLowerCase();
    const base = name.replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "foto";
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    const rnd = Math.random().toString(36).slice(2, 5);
    return `${stamp}-${rnd}-${base}${ext}`;
  }

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(file);
    });
  }

  async function runOne(item: UploadState) {
    setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: "uploading", error: undefined } : u)));
    try {
      const dataUrl = await readAsDataUrl(item.file);
      const filename = safeFilename(item.file.name);
      await github.commitPhoto(dimension, filename, dataUrl);
      setUploads((prev) => prev.map((u) => (u.id === item.id ? { ...u, status: "done" } : u)));
    } catch (e) {
      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: "error", error: e instanceof Error ? e.message : "Error" } : u))
      );
    }
  }

  async function processQueue() {
    if (processingRef.current) return;
    processingRef.current = true;
    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift();
      if (item) await runOne(item);
    }
    processingRef.current = false;
    queryClient.invalidateQueries({ queryKey: ["gh-dir", `content/inbox/${dimension}`] });
    onDone?.();
  }

  function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    const items: UploadState[] = files.map((f) => ({ id: makeId(), file: f, fileName: f.name, status: "pending" }));
    setUploads((prev) => [...prev, ...items]);
    queueRef.current.push(...items);
    void processQueue();
  }

  function retryUpload(id: string) {
    setUploads((prev) => {
      const item = prev.find((u) => u.id === id);
      if (item) {
        queueRef.current.push({ ...item, status: "pending", error: undefined });
        void processQueue();
      }
      return prev.map((u) => (u.id === id ? { ...u, status: "pending", error: undefined } : u));
    });
  }

  function clearUploads() {
    // Solo limpia lo que salió bien — un error se queda visible hasta que
    // se reintente con éxito o se recargue la pantalla (hallazgo real de
    // auditoría 2026-08-25: antes se autolimpiaba todo a los 2.5s sin
    // importar el resultado, y si Pablo no miraba la pantalla justo en ese
    // momento —lo más probable si está sacando fotos con el celular—, el
    // aviso de una foto que falló desaparecía antes de que lo viera).
    setUploads((prev) => prev.filter((u) => u.status !== "done"));
  }

  return { uploads, uploadFiles, retryUpload, clearUploads };
}
