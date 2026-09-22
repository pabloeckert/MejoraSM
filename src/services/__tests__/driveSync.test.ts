import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  syncGoogleDriveAssets,
  getStoredDriveApiKey,
  setStoredDriveApiKey,
  GOOGLE_DRIVE_ASSETS_FOLDER_ID,
} from "@/services/driveSync";
import { github } from "@/services/github";
import { suggestPhotoDimension } from "@/services/ai";

vi.mock("@/services/github", () => ({
  github: {
    getJsonFile: vi.fn(),
    putJsonFile: vi.fn(),
    commitPhoto: vi.fn(),
    rawUrl: (p: string) => `https://example.com/${p}`,
  },
}));

vi.mock("@/services/ai", () => ({
  suggestPhotoDimension: vi.fn(),
}));

describe("driveSync service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("stores and retrieves Google Drive API key from localStorage", () => {
    expect(getStoredDriveApiKey()).toBe("");
    setStoredDriveApiKey("test-api-key-12345");
    expect(getStoredDriveApiKey()).toBe("test-api-key-12345");
    setStoredDriveApiKey("");
    expect(getStoredDriveApiKey()).toBe("");
  });

  it("exports the correct Google Drive folder ID", () => {
    expect(GOOGLE_DRIVE_ASSETS_FOLDER_ID).toBe("1VAIMCt3nuGg57IUg7hVjgKUoDS7yYMPy");
  });

  it("syncs mock photos when useMockIfNoKey is true and no API key is provided", async () => {
    vi.mocked(github.getJsonFile).mockResolvedValueOnce({
      folderId: GOOGLE_DRIVE_ASSETS_FOLDER_ID,
      lastSync: null,
      processedFiles: {},
    });

    vi.mocked(suggestPhotoDimension).mockResolvedValue({
      dimension: "organizacional",
      reason: "Taller de procesos",
      situation: "Taller/Equipo",
      operationalTitle: "Desalineación entre Ventas y Operaciones",
      trenchPain: "Fricción en plazos y entrega.",
    });

    vi.mocked(github.commitPhoto).mockResolvedValue({ ok: true });
    vi.mocked(github.putJsonFile).mockResolvedValue({ ok: true });

    const progressLogs: string[] = [];
    const result = await syncGoogleDriveAssets({
      useMockIfNoKey: true,
      onProgress: (p) => progressLogs.push(p.status),
    });

    expect(result.scanned).toBe(3);
    expect(result.synced).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.files.length).toBe(3);
    expect(result.files[0].dimension).toBe("organizacional");
    expect(result.files[0].situation).toBe("Taller/Equipo");
    expect(result.files[0].operationalTitle).toBe("Desalineación entre Ventas y Operaciones");

    expect(github.commitPhoto).toHaveBeenCalledTimes(3);
    expect(github.putJsonFile).toHaveBeenCalled();
  });

  it("skips files that are already recorded in manifest to prevent duplicates", async () => {
    vi.mocked(github.getJsonFile).mockResolvedValueOnce({
      folderId: GOOGLE_DRIVE_ASSETS_FOLDER_ID,
      lastSync: "2026-09-20T00:00:00Z",
      processedFiles: {
        // Marcamos como ya procesados los IDs del mock
        "drive-mock-taller": {
          id: "drive-mock-taller",
          name: "taller.jpg",
          size: 1024,
          mimeType: "image/jpeg",
          dimension: "Organizacion",
          classifyReason: "test",
          savedPath: "assets/fotos/taller.jpg",
          processedAt: "2026-09-20T00:00:00Z",
        },
      },
    });

    // Mock fetch for Google Drive files
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [
          { id: "drive-mock-taller", name: "taller.jpg", mimeType: "image/jpeg" },
          { id: "drive-mock-nuevo", name: "nuevo-caso.jpg", mimeType: "image/jpeg" },
        ],
      }),
    });

    vi.mocked(suggestPhotoDimension).mockResolvedValue({
      dimension: "empresarial",
      reason: "Caso de rentabilidad",
      situation: "Consultoría 1 a 1",
      operationalTitle: "Revisión de Márgenes",
      trenchPain: "Falta de costeo estándar.",
    });

    vi.mocked(github.commitPhoto).mockResolvedValue({ ok: true });
    vi.mocked(github.putJsonFile).mockResolvedValue({ ok: true });

    // Mock file download
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [
            { id: "drive-mock-taller", name: "taller.jpg", mimeType: "image/jpeg" },
            { id: "drive-mock-nuevo", name: "nuevo-caso.jpg", mimeType: "image/jpeg" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(["fake-img-data"], { type: "image/jpeg" }),
      });

    const result = await syncGoogleDriveAssets({
      apiKey: "fake-key",
    });

    expect(result.scanned).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.synced).toBe(1);
    expect(result.files[0].id).toBe("drive-mock-nuevo");
  });

  it("throws clear error when no API key is provided and useMockIfNoKey is false", async () => {
    vi.mocked(github.getJsonFile).mockResolvedValueOnce(null);

    await expect(
      syncGoogleDriveAssets({
        apiKey: "",
        useMockIfNoKey: false,
      })
    ).rejects.toThrow(/Google Drive API Key/i);
  });
});
