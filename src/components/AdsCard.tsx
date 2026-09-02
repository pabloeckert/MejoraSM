import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Megaphone, ChevronDown, ChevronUp } from "lucide-react";
import { getAdsReport } from "@/services/ai";
import { dimensionLabel } from "@/shared/constants";
import { MiniMarkdown } from "@/components/MiniMarkdown";

// Fase 7 del plan de publicación 2026 — Pauta de Facebook (solo lectura).
// Cruza el orgánico con la pauta: rendimiento de campañas (si hay) +
// qué posts orgánicos recientes conviene promocionar. Nunca gasta plata:
// pautar de verdad lo hace Pablo desde el Business Manager.

export function AdsCard() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ads-report"],
    queryFn: getAdsReport,
    enabled: open,
    staleTime: 30 * 60_000,
  });

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Pauta y promoción
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-muted-foreground">No se pudo consultar la pauta.</p>
          ) : (
            <>
              {data.campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay campañas de Facebook Ads conectadas. Cuando conectes una cuenta de anuncios en Zernio, acá vas
                  a ver su rendimiento cruzado con el orgánico.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.campaigns.map((c, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-xs">
                      <span className="font-medium text-foreground">{c.name || "Campaña"}</span>
                      {c.status && <Badge variant="outline" className="border-border font-normal">{c.status}</Badge>}
                      {c.spend != null && <span className="text-muted-foreground">gasto {c.spend}</span>}
                      {c.impressions != null && <span className="text-muted-foreground">{c.impressions} impresiones</span>}
                      {c.clicks != null && <span className="text-muted-foreground">{c.clicks} clics</span>}
                    </div>
                  ))}
                </div>
              )}

              {data.boostCandidates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Orgánico que conviene promocionar
                  </p>
                  {data.boostCandidates.map((b, i) => (
                    <div key={i} className="rounded-lg bg-muted/40 p-2 text-sm">
                      <p className="text-foreground">{b.hook}</p>
                      <p className="text-xs text-muted-foreground">
                        {dimensionLabel(b.oferta)}
                        {b.engagement != null && ` · ${b.engagement.toFixed(1)}% engagement`}
                        {b.reach != null && ` · ${b.reach} de alcance`}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {data.advice ? (
                <div className="rounded-lg border border-border bg-background p-3 text-sm">
                  <MiniMarkdown text={data.advice} />
                </div>
              ) : (
                data.campaigns.length === 0 &&
                data.boostCandidates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay suficiente historial orgánico para recomendar qué promocionar.
                  </p>
                )
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
