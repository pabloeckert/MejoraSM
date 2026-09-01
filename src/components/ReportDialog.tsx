import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { Insight } from "@/services/ai";

// Fase A del plan de continuación (2026-08-31) — "Generar informe" del brief
// de rediseño: una infografía/reporte a partir de lo que se está viendo en el
// Dashboard, con posibilidad de elegir qué incluir. Se arma como una vista
// imprimible (window.print → guardar PDF), sin dependencias nuevas.

export interface ReportKpi { label: string; value: string; sub: string }
export interface ReportFormatRow { format: string; count: number; avgReach: number; avgEngagement: number }
export interface ReportRankRow { title: string; format: string; reach: number; engagement: number; isTest?: boolean }

export interface ReportData {
  kpis: ReportKpi[];
  formatPerf: ReportFormatRow[];
  ranking: ReportRankRow[];
  insights: Insight[];
  piecesWithMetrics: number;
  lastSync: string | null;
}

const SECTIONS = [
  { key: "kpis", label: "KPIs de rendimiento" },
  { key: "formatPerf", label: "Rendimiento por formato" },
  { key: "ranking", label: "Ranking de piezas" },
  { key: "insights", label: "Insights" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

const fmt = (n: number) => new Intl.NumberFormat("es-AR").format(Math.round(n || 0));
const pct = (n: number) => `${Math.round((n || 0) * 100) / 100}%`;

export function ReportDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: ReportData;
}) {
  const [include, setInclude] = useState<Record<SectionKey, boolean>>({
    kpis: true,
    formatPerf: true,
    ranking: true,
    insights: true,
  });
  const [generated, setGenerated] = useState(false);

  const today = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setGenerated(false); }}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar informe</DialogTitle>
        </DialogHeader>

        {!generated ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Elegí qué incluir. El informe se abre como una vista imprimible — desde ahí lo guardás como PDF.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SECTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={include[s.key]}
                    onChange={(e) => setInclude((i) => ({ ...i, [s.key]: e.target.checked }))}
                    className="h-4 w-4 accent-primary"
                  />
                  {s.label}
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setGenerated(true)} disabled={!Object.values(include).some(Boolean)}>
                Generar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => setGenerated(false)}>Volver</Button>
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Imprimir / Guardar PDF
              </Button>
            </div>

            <div id="mejorasm-report" className="report space-y-6 rounded-lg border border-border bg-white p-6 text-[#2b2b2b]">
              <div className="border-b-2 border-[#1A3D84] pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#E1061E]">MejoraSM · Mejora Continua</p>
                <h1 className="mt-1 text-2xl font-bold text-[#1A3D84]">Informe de rendimiento</h1>
                <p className="mt-1 text-xs text-[#6E7480]">
                  {today} · {data.piecesWithMetrics} pieza{data.piecesWithMetrics === 1 ? "" : "s"} con métricas reales
                  {data.lastSync ? ` · última sincronización ${new Date(data.lastSync).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                </p>
              </div>

              {include.kpis && data.kpis.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-[#1A3D84]">KPIs de rendimiento</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {data.kpis.map((k) => (
                      <div key={k.label} className="rounded-md border border-[#E7E8EA] p-3">
                        <p className="text-[10px] font-semibold text-[#6E7480]">{k.label}</p>
                        <p className="mt-1 text-lg font-bold text-[#1A3D84]">{k.value}</p>
                        <p className="mt-0.5 text-[10px] text-[#9a9ea6]">{k.sub}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {include.formatPerf && data.formatPerf.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-[#1A3D84]">Rendimiento por formato</h2>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E7E8EA] text-left text-[#6E7480]">
                        <th className="py-1.5">Formato</th>
                        <th className="py-1.5 text-right">Piezas</th>
                        <th className="py-1.5 text-right">Alcance prom.</th>
                        <th className="py-1.5 text-right">Engagement prom.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.formatPerf.map((f) => (
                        <tr key={f.format} className="border-b border-[#F0F1F2]">
                          <td className="py-1.5 capitalize">{f.format}</td>
                          <td className="py-1.5 text-right">{f.count}</td>
                          <td className="py-1.5 text-right">{fmt(f.avgReach)}</td>
                          <td className="py-1.5 text-right">{pct(f.avgEngagement)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {include.ranking && data.ranking.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-[#1A3D84]">Ranking de piezas</h2>
                  <ol className="space-y-1.5 text-xs">
                    {data.ranking.map((r, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <span className="font-bold text-[#1A3D84]">{i + 1}.</span>
                        <span className="flex-1">{r.title}{r.isTest ? " (prueba)" : ""}</span>
                        <span className="text-[#6E7480]">{r.format} · alcance {fmt(r.reach)} · {pct(r.engagement)}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {include.insights && data.insights.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-[#1A3D84]">Insights</h2>
                  <div className="space-y-2.5">
                    {data.insights.map((ins) => (
                      <div key={ins.id} className="rounded-md border border-[#E7E8EA] p-3">
                        <p className="text-xs font-semibold">{ins.title}{ins.confidence > 0 ? ` — ${ins.confidence}% confianza` : ""}</p>
                        <p className="mt-1 text-[11px] text-[#6E7480]">{ins.body}</p>
                        <p className="mt-1 text-[10px] text-[#9a9ea6]">{ins.evidence}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <p className="border-t border-[#E7E8EA] pt-3 text-[10px] text-[#9a9ea6]">
                Generado por MejoraSM a partir de datos reales de Instagram y Facebook (vía Zernio Analytics). Los
                números no incluyen filas de prueba.
              </p>
            </div>
          </div>
        )}
      </DialogContent>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #mejorasm-report, #mejorasm-report * { visibility: visible !important; }
          #mejorasm-report { position: absolute; left: 0; top: 0; width: 100%; border: none !important; padding: 0 !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </Dialog>
  );
}
