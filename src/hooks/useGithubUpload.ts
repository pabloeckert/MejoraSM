import { useState } from "react";
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
    if (r.ok) {
      setConnected(true);
      setUser(r.login ?? null);
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
  fileName: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function usePhotoUpload(dimension: string, onDone?: () => void) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const queryClient = useQueryClient();

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

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    setUploads(files.map((f) => ({ fileName: f.name, status: "pending" })));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "uploading" } : u)));
      try {
        const dataUrl = await readAsDataUrl(file);
        const filename = safeFilename(file.name);
        await github.commitPhoto(dimension, filename, dataUrl);
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "done" } : u)));
      } catch (e) {
        setUploads((prev) =>
          prev.map((u, idx) => (idx === i ? { ...u, status: "error", error: e instanceof Error ? e.message : "Error" } : u))
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ["gh-dir", `content/inbox/${dimension}`] });
    onDone?.();
  }

  function clearUploads() {
    setUploads([]);
  }

  return { uploads, uploadFiles, clearUploads };
}
