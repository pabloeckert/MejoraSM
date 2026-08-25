import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { proposalsApi, metricsApi, runLogApi } from "@/services/supabase";
import { downloadCsv, downloadJson } from "@/lib/export";
import { toast } from "@/hooks/use-toast";

// Auditoría exportable — Fase 6 del plan estratégico 2026-08-16. Exporta
// los datos operativos reales del sistema (propuestas, métricas, reglas
// aprendidas, run_log) para revisión externa, backup o transparencia. No
// incluye documentos de la Bóveda (contenido de marca con posible
// información sensible) ni configuración de agentes — el alcance es el
// rastro operativo del pipeline, no la propiedad intelectual de la marca.
const today = () => new Date().toISOString().slice(0, 10);

interface ExportSource {
  key: string;
  label: string;
  description: string;
  fetch: () => Promise<Record<string, unknown>[]>;
}

const SOURCES: ExportSource[] = [
  {
    key: "proposals",
    label: "Propuestas",
    description: "Todo el contenido generado — hook, body, cta, formato, estado, fechas.",
    fetch: async () => {
      const { data, error } = await proposalsApi.list();
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
  },
  {
    key: "metrics",
    label: "Métricas",
    description: "Likes, comments, reach, impressions, engagement por publicación real.",
    fetch: async () => {
      const { data, error } = await metricsApi.all();
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
  },
  {
    key: "success_rules",
    label: "Reglas aprendidas",
    description: "Lo que rule-engine dedujo de los datos reales — formato, hook, horario, hashtags.",
    fetch: async () => {
      const { data, error } = await metricsApi.successRules();
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
  },
  {
    key: "run_log",
    label: "Registro de corridas (run_log)",
    description: "Últimas 500 corridas de cada script/Edge Function del pipeline, éxito o error.",
    fetch: async () => {
      const { data, error } = await runLogApi.all();
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
  },
];

export default function Auditoria() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(source: ExportSource, format: "csv" | "json") {
    setLoadingKey(`${source.key}-${format}`);
    setError(null);
    try {
      const rows = await source.fetch();
      const filename = `mejorasm-${source.key}-${today()}.${format}`;
      if (format === "csv") downloadCsv(filename, rows);
      else downloadJson(filename, rows);
      // Hallazgo real de auditoría 2026-08-25: sin ningún conteo visible,
      // un export cortado en silencio (por el límite de 1000 filas de
      // PostgREST, ya corregido en services/supabase.ts) hubiera sido
      // indistinguible de uno completo — el número acá es la única forma
      // de notarlo si algún día vuelve a pasar.
      toast({ title: `${source.label} exportado`, description: `${rows.length} filas en ${filename}.` });
    } catch (e) {
      setError(e instanceof Error ? e.message : `Error exportando ${source.label}`);
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleExportAll() {
    setLoadingKey("all");
    setError(null);
    try {
      const entries = await Promise.all(
        SOURCES.map(async (s) => [s.key, await s.fetch()] as const)
      );
      downloadJson(`mejorasm-auditoria-completa-${today()}.json`, Object.fromEntries(entries));
      const resumen = entries.map(([key, rows]) => `${key}: ${rows.length}`).join(" · ");
      toast({ title: "Auditoría completa exportada", description: resumen });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error exportando la auditoría completa");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[32px] font-medium leading-tight text-primary">Auditoría</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Exportá el rastro operativo real del sistema — propuestas, métricas, reglas aprendidas y corridas del
          pipeline — para revisión, backup o transparencia.
        </p>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {SOURCES.map((source) => (
          <Card key={source.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">{source.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{source.description}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingKey === `${source.key}-csv`}
                  onClick={() => handleExport(source, "csv")}
                >
                  {loadingKey === `${source.key}-csv` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingKey === `${source.key}-json`}
                  onClick={() => handleExport(source, "json")}
                >
                  {loadingKey === `${source.key}-json` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileJson className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="font-medium text-primary">Exportar todo</p>
            <p className="text-sm text-muted-foreground">Un solo archivo JSON con las 4 fuentes de datos de arriba.</p>
          </div>
          <Button onClick={handleExportAll} disabled={loadingKey !== null}>
            {loadingKey === "all" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            Exportar todo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
