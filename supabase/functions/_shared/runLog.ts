// supabase/functions/_shared/runLog.ts
// Observabilidad real (Fase 3, plan estratégico 2026-08-16): cada Edge
// Function del pipeline escribe una fila en run_log por corrida, éxito o
// error. El logging nunca debe romper el flujo real de la función que lo
// usa — cualquier fallo al escribir se trata como warning, no como error.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

export interface RunLogEntry {
  source: string;
  step: string;
  status: "success" | "error" | "skipped";
  proposalId?: string | null;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export async function logRun(entry: RunLogEntry): Promise<void> {
  try {
    await supabase.from("run_log").insert({
      source: entry.source,
      step: entry.step,
      status: entry.status,
      proposal_id: entry.proposalId ?? null,
      duration_ms: entry.durationMs ?? null,
      error: entry.error ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.warn(`[runLog] no se pudo escribir "${entry.source}/${entry.step}": ${(e as Error).message}`);
  }
}
