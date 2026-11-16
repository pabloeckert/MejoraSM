import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);

    // Si es un error de carga de chunk dinámico (por ejemplo tras una nueva versión publicada),
    // recargamos automáticamente una vez para traer el bundle más reciente sin bloquear al usuario.
    const isChunkError =
      error?.message?.includes("dynamically imported module") ||
      error?.message?.includes("Failed to fetch") ||
      error?.name === "ChunkLoadError";

    if (isChunkError && typeof window !== "undefined") {
      const storageKey = "chunk_auto_reload";
      const lastReload = sessionStorage.getItem(storageKey);
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem(storageKey, String(now));
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    const isChunkError =
      this.state.error?.message?.includes("dynamically imported module") ||
      this.state.error?.message?.includes("Failed to fetch") ||
      this.state.error?.name === "ChunkLoadError";

    if (isChunkError && typeof window !== "undefined") {
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunkError =
        this.state.error?.message?.includes("dynamically imported module") ||
        this.state.error?.message?.includes("Failed to fetch") ||
        this.state.error?.name === "ChunkLoadError";

      return (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
            <p className="text-lg font-medium">
              {isChunkError ? "Nueva versión disponible" : "Algo salió mal"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-md text-center">
              {isChunkError
                ? "Se detectaron módulos actualizados en el servidor. Presioná 'Actualizar versión' para cargar los componentes más recientes."
                : this.state.error?.message || "Ocurrió un error inesperado."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={this.handleReset}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {isChunkError ? "Actualizar versión" : "Reintentar"}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
