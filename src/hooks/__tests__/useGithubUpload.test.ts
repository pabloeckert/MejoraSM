import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const commitPhotoMock = vi.fn();

vi.mock("@/services/github", () => ({
  github: {
    isConnected: () => true,
    commitPhoto: (...args: unknown[]) => commitPhotoMock(...args),
  },
}));

import { usePhotoUpload } from "../useGithubUpload";

function makeFile(name: string) {
  return new File(["contenido"], name, { type: "image/jpeg" });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("usePhotoUpload", () => {
  beforeEach(() => {
    commitPhotoMock.mockReset();
  });

  it("una segunda tanda confirmada mientras la primera sigue subiendo no pisa el estado de la primera", async () => {
    // Reproduce el hallazgo real de auditoría 2026-08-25: antes, el estado
    // se actualizaba por índice de array — confirmar una segunda tanda
    // mientras la primera seguía en vuelo reemplazaba el array entero y
    // las actualizaciones de la tanda vieja terminaban aplicándose a la
    // posición equivocada de la tanda nueva.
    let resolveFirst: () => void;
    const firstGate = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });

    commitPhotoMock
      .mockImplementationOnce(async () => {
        await firstGate; // la primera foto queda "colgada" a propósito
        return {};
      })
      .mockResolvedValue({});

    const { result } = renderHook(() => usePhotoUpload("personal"), { wrapper });

    act(() => {
      result.current.uploadFiles([makeFile("foto-tanda-1.jpg")]);
    });

    await waitFor(() => {
      expect(result.current.uploads).toHaveLength(1);
      expect(result.current.uploads[0].status).toBe("uploading");
    });

    // Se confirma una segunda tanda (2 fotos) MIENTRAS la primera sigue colgada.
    act(() => {
      result.current.uploadFiles([makeFile("foto-tanda-2-a.jpg"), makeFile("foto-tanda-2-b.jpg")]);
    });

    // Las 3 fotos conviven en el estado — nada se pisó.
    expect(result.current.uploads.map((u) => u.fileName)).toEqual([
      "foto-tanda-1.jpg",
      "foto-tanda-2-a.jpg",
      "foto-tanda-2-b.jpg",
    ]);
    // La tanda 1 sigue "uploading" (real, no resuelta todavía) — la tanda 2
    // todavía no arrancó porque la cola procesa una foto por vez.
    expect(result.current.uploads[0].status).toBe("uploading");
    expect(result.current.uploads[1].status).toBe("pending");
    expect(result.current.uploads[2].status).toBe("pending");

    // Se destraba la primera — la cola sigue con la 2 y la 3 en orden.
    act(() => {
      resolveFirst();
    });

    await waitFor(() => {
      expect(result.current.uploads.every((u) => u.status === "done")).toBe(true);
    });

    expect(commitPhotoMock).toHaveBeenCalledTimes(3);
  });

  it("reintentar una foto que falló la vuelve a subir sin afectar a las demás", async () => {
    commitPhotoMock.mockRejectedValueOnce(new Error("No se pudo commitear (401)")).mockResolvedValue({});

    const { result } = renderHook(() => usePhotoUpload("personal"), { wrapper });

    act(() => {
      result.current.uploadFiles([makeFile("falla.jpg")]);
    });

    await waitFor(() => {
      expect(result.current.uploads[0].status).toBe("error");
      expect(result.current.uploads[0].error).toContain("401");
    });

    act(() => {
      result.current.retryUpload(result.current.uploads[0].id);
    });

    await waitFor(() => {
      expect(result.current.uploads[0].status).toBe("done");
    });

    expect(commitPhotoMock).toHaveBeenCalledTimes(2);
  });

  it("clearUploads deja los errores visibles y solo saca lo que salió bien", async () => {
    commitPhotoMock.mockRejectedValueOnce(new Error("falló")).mockResolvedValueOnce({});

    const { result } = renderHook(() => usePhotoUpload("personal"), { wrapper });

    act(() => {
      result.current.uploadFiles([makeFile("ok.jpg"), makeFile("mal.jpg")]);
    });

    await waitFor(() => {
      expect(result.current.uploads.every((u) => u.status === "done" || u.status === "error")).toBe(true);
    });

    act(() => {
      result.current.clearUploads();
    });

    expect(result.current.uploads).toHaveLength(1);
    expect(result.current.uploads[0].status).toBe("error");
  });
});
