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
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
            <p className="text-lg font-medium">Algo salió mal</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-md text-center">
              {this.state.error?.message || "Ocurrió un error inesperado."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={this.handleReset}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
