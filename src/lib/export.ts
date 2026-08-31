// Auditoría exportable — Fase 6 del plan estratégico 2026-08-16. Utilidad
// genérica de exportación, sin dependencias nuevas: arma CSV/JSON a partir
// de filas reales de Supabase y dispara la descarga real en el navegador
// (Blob + <a download>, soportado en cualquier navegador real — la
// restricción de descargas inertes solo aplica al sandbox de Artifacts,
// no a una app real corriendo en el navegador del usuario).

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  // B28 (auditoría 2026-08-31): sin BOM, Excel abre un CSV UTF-8 con
  // tildes/ñ como mojibake.
  downloadFile(filename, "\uFEFF" + toCsv(rows), "text/csv;charset=utf-8;");
}

export function downloadJson(filename: string, data: unknown) {
  downloadFile(filename, JSON.stringify(data, null, 2), "application/json;charset=utf-8;");
}
