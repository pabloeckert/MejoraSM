import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThumbsUp, ThumbsDown, FileBarChart, RefreshCw } from "lucide-react";
import { useInsights, useInsightFeedback } from "@/hooks/useInsights";
import { toast } from "@/hooks/use-toast";
import type { Insight } from "@/services/ai";

// Fallback si la Edge Function todavía no generó nada / falla — mismas 6
// semillas validadas con datos reales de agosto 2026 (Data/analisis-redes).
const SEED: Insight[] = [
  { id: "reel-retencion", title: "El Reel gana alcance, pero se pierde el mensaje", body: "Reel es el formato con mejor alcance (461 promedio) y mejor engagement (3.26% ER), pero el tiempo promedio de reproducción es de apenas ~6.9 segundos.", evidence: "44 Reels analizados en el año — reach medio 461, ER medio 3.26%, ~6.9s de reproducción.", confidence: 0, status: "seed_unchanged" },
  { id: "hook-primera-persona", title: "El gancho directo en primera persona convierte mejor que cualquier Reel", body: "Los posts estáticos o carousel con gancho directo en primera persona sobre liderazgo y decisiones dieron el engagement más alto del período.", evidence: '"WhatsApp no es decoración..." ER 27.9% · "Equivocarse no te resta liderazgo..." ER 22.0%.', confidence: 0, status: "seed_unchanged" },
  { id: "testimonios-series", title: 'Testimonios con nombre y series "Parte 1/2/3" generan la señal más fuerte', body: "Concentran los guardados y compartidos más altos del año — en una cuenta B2B esa es la señal de intención más fuerte.", evidence: "Serie sobre negociación: reach 520 / 436 / 237 en publicaciones consecutivas.", confidence: 0, status: "seed_unchanged" },
  { id: "geo-nea-paraguay", title: "La audiencia está concentrada en NEA + Paraguay", body: "Posadas es la ciudad top en ambas redes, seguida de Encarnación y el resto del NEA argentino y Paraguay.", evidence: "Posadas 30.9% (Facebook) / 45.7% (Instagram) · Paraguay 19.7-20.2% del total.", confidence: 0, status: "seed_unchanged" },
  { id: "meseta-horaria", title: "No hay un horario mágico único — la audiencia está online de 11h a 23h", body: "Conviene testear franja de mediodía (lunes a miércoles) contra tarde-noche en vez de fijarse en un solo bloque.", evidence: "Meseta amplia 11h-23h todos los días, con pico puntual lunes 21h (IconSquare).", confidence: 0, status: "seed_unchanged" },
  { id: "facebook-sin-pulso", title: "Facebook va al mismo nivel de detalle que Instagram, pero hoy no tiene pulso propio", body: "El bajo rendimiento de Facebook es por falta de trabajo puesto ahí, no por el canal en sí.", evidence: "Ventana jul-ago 2026: 0 visitas, 0 interacciones. ER del año 1.28% vs. 2.44% de Instagram.", confidence: 0, status: "seed_unchanged" },
];

const STATUS_LABEL: Record<string, string> = {
  seed_unchanged: "Sin cambios",
  refined: "Refinado esta semana",
  updated: "Actualizado con datos nuevos",
  new: "Nuevo",
};

function confColor(c: number) {
  if (c >= 80) return "bg-[#1A3D84] text-white";
  if (c >= 60) return "bg-[#eaf0fb] text-[#1A3D84]";
  return "bg-muted text-muted-foreground";
}

export function InsightsSection({ onOpenReport }: { onOpenReport: () => void }) {
  const { data, isLoading, isError, refetch, isFetching } = useInsights();
  const feedback = useInsightFeedback();
  const [rated, setRated] = useState<Record<string, boolean>>({});

  const insights = data?.insights?.length ? data.insights : SEED;
  const weekStart = data?.week_start ?? new Date().toISOString().slice(0, 10);
  const live = !!data?.insights?.length;

  function rate(id: string, useful: boolean) {
    setRated((r) => ({ ...r, [id]: useful }));
    feedback.mutate(
      { insightId: id, weekStart, useful },
      {
        onSuccess: () => toast({ title: useful ? "Anotado como útil" : "Anotado — no aplica", description: "Se tiene en cuenta para el recálculo de la semana que viene." }),
        onError: (e: Error) => {
          // Sin este revert, un guardado que falla igual mostraba el botón
          // como "elegido" — el toast de error quedaba como único aviso, sin
          // que la marca visual (que persiste) coincidiera con lo que
          // realmente quedó guardado.
          setRated((r) => {
            const next = { ...r };
            delete next[id];
            return next;
          });
          toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" });
        },
      }
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-medium">Motor de insights</h2>
          <p className="text-xs text-muted-foreground">
            {live
              ? `Se recalcula cada semana contra las métricas reales — no es texto fijo. Semana del ${new Date(weekStart + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}.`
              : "Todavía sin recálculo real — mostrando la base validada con datos de agosto. Corré el cron o esperá al lunes."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
          <Button size="sm" onClick={onOpenReport}>
            <FileBarChart className="mr-1.5 h-3.5 w-3.5" />
            Generar informe
          </Button>
        </div>
      </div>

      {isError && !data && (
        <p className="mb-2 text-xs text-muted-foreground">
          No se pudo traer el recálculo — mostrando la base validada.
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((ins) => (
            <Card key={ins.id}>
              <CardContent className="flex h-full flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  {live ? (
                    <Badge className={`text-[10px] ${confColor(ins.confidence)}`}>{ins.confidence}% confianza</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Validado con datos reales</Badge>
                  )}
                  {live && (
                    <span className="text-[10px] text-muted-foreground">{STATUS_LABEL[ins.status] ?? ins.status}</span>
                  )}
                </div>
                <p className="text-[13.5px] font-semibold leading-snug">{ins.title}</p>
                <p className="flex-1 text-[12.5px] text-muted-foreground">{ins.body}</p>
                <p className="border-t border-border pt-2 text-[11px] text-muted-foreground/80">{ins.evidence}</p>
                {live && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => rate(ins.id, true)}
                      className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] transition-colors ${
                        rated[ins.id] === true ? "border-[#1A3D84] bg-[#eaf0fb] text-[#1A3D84]" : "border-border text-muted-foreground hover:border-[#1A3D84]/40"
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3" /> Útil
                    </button>
                    <button
                      type="button"
                      onClick={() => rate(ins.id, false)}
                      className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] transition-colors ${
                        rated[ins.id] === false ? "border-muted-foreground bg-muted text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground/60"
                      }`}
                    >
                      <ThumbsDown className="h-3 w-3" /> No aplica
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
