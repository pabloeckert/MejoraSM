// scripts/archive-historical-inbox.mjs
// Utilidad de mantenimiento para archivar masivamente las conversaciones históricas en inbox_items.
//
// Uso:
//   node scripts/archive-historical-inbox.mjs             (dry-run por default)
//   node scripts/archive-historical-inbox.mjs --dry-run
//   node scripts/archive-historical-inbox.mjs --apply
//
// Env requeridas:
//   SUPABASE_URL o VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

const isApply = process.argv.includes("--apply");
const isDryRun = process.argv.includes("--dry-run") || !isApply;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log(`[archive-inbox] Modo: ${isApply ? "🚀 APPLY (Modificación real)" : "🔍 DRY RUN (Solo lectura)"}`);

  // 1. Contar total de items y pendientes
  const { count: total, error: countErr } = await supabase
    .from("inbox_items")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    console.error("❌ Error consultando inbox_items:", countErr.message);
    process.exit(1);
  }

  const { count: unarchived, error: unarchivedErr } = await supabase
    .from("inbox_items")
    .select("*", { count: "exact", head: true })
    .eq("archived", false);

  if (unarchivedErr) {
    console.error("❌ Error consultando no archivados:", unarchivedErr.message);
    process.exit(1);
  }

  const { count: unreplied, error: unrepliedErr } = await supabase
    .from("inbox_items")
    .select("*", { count: "exact", head: true })
    .is("replied_at", null);

  if (unrepliedErr) {
    console.error("❌ Error consultando sin respuesta:", unrepliedErr.message);
    process.exit(1);
  }

  console.log(`[archive-inbox] Estadísticas actuales:`);
  console.log(`  - Total mensajes: ${total ?? 0}`);
  console.log(`  - No archivados (archived=false): ${unarchived ?? 0}`);
  console.log(`  - Sin timestamp de respuesta (replied_at=null): ${unreplied ?? 0}`);

  if (isDryRun) {
    console.log(`[archive-inbox] DRY RUN completado. ${unarchived ?? 0} registros serían marcados como archivados.`);
    console.log(`[archive-inbox] Para ejecutar los cambios, corrér con: node scripts/archive-historical-inbox.mjs --apply`);
    return;
  }

  // 2. Aplicar actualización
  const now = new Date().toISOString();
  const { data, error: updateErr } = await supabase
    .from("inbox_items")
    .update({
      archived: true,
      replied_at: now,
    })
    .or("archived.eq.false,replied_at.is.null")
    .select("id");

  if (updateErr) {
    console.error("❌ Error al archivar conversaciones:", updateErr.message);
    process.exit(1);
  }

  console.log(`✅ [archive-inbox] Éxito: ${(data || []).length} mensajes históricos actualizados.`);
  console.log(`[archive-inbox] La bandeja de entrada ahora tiene 0 pendientes y está lista.`);
}

main().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
