// scripts/lib/run-log.mjs
// Observabilidad real (Fase 3, plan estratégico 2026-08-16): cada script
// del pipeline autónomo escribe una fila en run_log por corrida, éxito o
// error. El logging nunca debe romper el flujo real del script que lo usa
// — cualquier fallo al escribir se trata como warning, no como error, y si
// faltan las credenciales de Supabase en el entorno se avisa y se sigue.

export async function logRun({
  source,
  step,
  status,
  proposalId = null,
  durationMs = null,
  error = null,
  metadata = {},
}) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn(
      `[run-log] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no configurados — no se registra "${source}/${step}".`
    );
    return;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/run_log`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        source,
        step,
        status,
        proposal_id: proposalId,
        duration_ms: durationMs,
        error,
        metadata,
      }),
    });
    if (!res.ok) {
      console.warn(`[run-log] fallo al registrar "${source}/${step}": ${res.status} ${await res.text()}`);
    }
  } catch (e) {
    console.warn(`[run-log] fallo al registrar "${source}/${step}": ${e.message}`);
  }
}

export function startTimer() {
  const start = Date.now();
  return () => Date.now() - start;
}
