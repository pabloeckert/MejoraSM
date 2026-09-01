import { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

// D2 (auditoría 2026-08-31): unificar los window.confirm() sueltos del Monitor
// con el ConfirmDialog (AlertDialog de shadcn) que ya usa el resto de la app.
// Uso: const [confirm, ConfirmUI] = useConfirm(); ... if (await confirm({...})) {...}
// y renderizar {ConfirmUI} una vez en el componente.
export function useConfirm(): [
  (opts: ConfirmOptions) => Promise<boolean>,
  React.ReactNode,
] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  const ui = opts ? (
    <ConfirmDialog
      open
      onOpenChange={(next) => {
        if (!next) settle(false);
      }}
      title={opts.title}
      description={opts.description}
      confirmText={opts.confirmText}
      cancelText={opts.cancelText}
      variant={opts.variant}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return [confirm, ui];
}
