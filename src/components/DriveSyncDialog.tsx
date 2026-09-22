// src/components/DriveSyncDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  HardDrive,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Key,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import {
  syncGoogleDriveAssets,
  getStoredDriveApiKey,
  setStoredDriveApiKey,
  GOOGLE_DRIVE_ASSETS_FOLDER_ID,
  type DriveSyncResult,
  type DriveSyncProgress,
} from "@/services/driveSync";
import { toast } from "@/hooks/use-toast";
import { dimensionLabel } from "@/shared/constants";

interface DriveSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncSuccess?: (result: DriveSyncResult) => void;
}

export function DriveSyncDialog({ open, onOpenChange, onSyncSuccess }: DriveSyncDialogProps) {
  const [apiKey, setApiKey] = useState(getStoredDriveApiKey());
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<DriveSyncProgress | null>(null);
  const [lastResult, setLastResult] = useState<DriveSyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveKey = () => {
    setStoredDriveApiKey(apiKey);
    toast({ title: "API Key guardada", description: "Configuración actualizada en tu navegador." });
  };

  const handleStartSync = async (useMockIfNoKey: boolean = false) => {
    setSyncing(true);
    setErrorMsg(null);
    setLastResult(null);
    setProgress({ status: "Iniciando sincronización…", current: 0, total: 0 });

    try {
      if (apiKey.trim()) {
        setStoredDriveApiKey(apiKey);
      }
      const result = await syncGoogleDriveAssets({
        apiKey: apiKey.trim(),
        useMockIfNoKey,
        onProgress: (p) => setProgress(p),
      });

      setLastResult(result);
      if (result.synced > 0) {
        toast({
          title: "Sincronización exitosa ✓",
          description: `Se agregaron ${result.synced} fotos clasificadas por IA al Inbox.`,
        });
        onSyncSuccess?.(result);
      } else {
        toast({
          title: "Al día",
          description: "No se encontraron fotos nuevas pendientes de ingesta.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      toast({
        variant: "destructive",
        title: "Error en sincronización",
        description: msg,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !syncing && onOpenChange(v)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <div className="p-2 rounded-lg bg-primary/10">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Sincronizar Google Drive
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Ingesta de fotos reales desde la carpeta de trinchera hacia el repositorio de MejoraSM.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* FOLDER INFO */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">Carpeta objetivo:</span>
              <code className="bg-background px-2 py-0.5 rounded font-mono text-[11px] border border-border">
                {GOOGLE_DRIVE_ASSETS_FOLDER_ID}
              </code>
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Google Drive v3
            </Badge>
          </div>

          {/* API KEY INPUT */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="drive-api-key" className="text-xs font-semibold flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                Google Drive API Key (Opcional si usás modo modelo)
              </Label>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="text-[11px] text-primary hover:underline"
                >
                  Guardar clave
                </button>
              )}
            </div>
            <Input
              id="drive-api-key"
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              disabled={syncing}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Se guarda en tu navegador y permite listar y descargar imágenes públicas desde Google Drive.
            </p>
          </div>

          {/* PROGRESS & STATUS */}
          {syncing && progress && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {progress.status}
                </span>
                {progress.total > 0 && (
                  <span className="text-muted-foreground font-mono">
                    {progress.current}/{progress.total}
                  </span>
                )}
              </div>
              {progress.total > 0 && (
                <div className="w-full bg-primary/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ERROR DISPLAY */}
          {errorMsg && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs flex items-start gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Fallo en la sincronización</p>
                <p className="mt-0.5 text-destructive/90">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* RESULT SUMMARY */}
          {lastResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Resumen de ingesta: {lastResult.synced} nuevas, {lastResult.skipped} ya registradas
              </div>

              {lastResult.files.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {lastResult.files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-2 p-2 rounded bg-background border border-border text-xs"
                    >
                      <div className="truncate flex-1">
                        <p className="font-medium truncate text-foreground">{f.operationalTitle}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{f.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className="text-[10px]">
                          {f.situation}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-semibold text-primary">
                          {dimensionLabel(f.dimension)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={syncing}
            onClick={() => handleStartSync(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Cargar fotos de prueba (Sin API Key)
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={syncing}
              onClick={() => handleStartSync(false)}
              className="bg-[#1A3D84] hover:bg-[#142e63] text-white"
            >
              {syncing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
              )}
              Sincronizar Google Drive
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
