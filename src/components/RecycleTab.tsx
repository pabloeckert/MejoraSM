import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw, Recycle, Sparkles, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  getRecycleCandidates,
  refreshRecycleProposal,
  scheduleRecycledProposal,
  type RecycleCandidate,
  type RecycleRefresh,
} from "@/services/ai";
import { dimensionLabel } from "@/shared/constants";
import { toast } from "@/hooks/use-toast";

// Fase 3 del plan de publicación 2026 — Reciclado de contenido.
// Lo que rindió bien hace >90 días se puede volver a publicar con el hook y
// el CTA refrescados, manteniendo el ángulo. El mecanismo está listo; se
// llena solo cuando el pipeline acumule historial real (hoy metrics ≈ 0).

export function RecycleTab() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["recycle-candidates"],
    queryFn: getRecycleCandidates,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Piezas publicadas hace más de 90 días que rindieron sobre la mediana de engagement. El sistema refresca el
          hook y el CTA sin tocar el ángulo — vos revisás y lo mandás a Propuestas.
        </p>
        <Button variant="outline" size="sm" className="h-9" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No se pudo consultar el contenido reciclable.
          </CardContent>
        </Card>
      ) : !data?.candidates.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Recycle className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Todavía no hay nada para reciclar. Cuando haya piezas publicadas hace más de 90 días con métricas reales,
              aparecen acá.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.candidates.map((c) => (
            <CandidateRow key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: RecycleCandidate }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [refreshed, setRefreshed] = useState<RecycleRefresh | null>(null);
  const [hook, setHook] = useState("");
  const [body, setBody] = useState("");
  const [cta, setCta] = useState("");

  const refreshMut = useMutation({
    mutationFn: () => refreshRecycleProposal(candidate.id),
    onSuccess: (r) => {
      setRefreshed(r);
      setHook(r.refreshed.hook ?? "");
      setBody(r.refreshed.body ?? "");
      setCta(r.refreshed.cta ?? "");
      setOpen(true);
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "No se pudo refrescar", description: e.message }),
  });

  const scheduleMut = useMutation({
    mutationFn: () =>
      scheduleRecycledProposal({
        proposalId: candidate.id,
        hook,
        body,
        cta,
        hashtags: refreshed?.refreshed.hashtags ?? [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recycle-candidates"] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["pending-proposals"] });
      setOpen(false);
      toast({ title: "Listo", description: "Quedó como propuesta pendiente. Agendala desde Propuestas." });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "No se pudo crear", description: e.message }),
  });

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="border-border font-normal">{candidate.format}</Badge>
          <span className="text-muted-foreground">{dimensionLabel(candidate.oferta)}</span>
          {candidate.published_at && (
            <span className="text-muted-foreground/70">
              publicado {formatDistanceToNow(new Date(candidate.published_at), { addSuffix: true, locale: es })}
            </span>
          )}
          {candidate.engagement != null && candidate.engagement > 0 && (
            <Badge className={candidate.aboveMedian ? "border-0 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : "border-0 bg-muted text-muted-foreground"}>
              {candidate.engagement.toFixed(1)}% engagement
            </Badge>
          )}
        </div>

        <p className="text-sm text-foreground">{candidate.hook || candidate.title || "(sin hook)"}</p>

        {!open ? (
          <Button size="sm" className="h-9" onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending}>
            {refreshMut.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Refrescar hook y CTA
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            {refreshed && (
              <p className="text-[11px] text-muted-foreground">
                Original: <span className="line-through">{refreshed.original.hook}</span>
              </p>
            )}
            <Field label="Hook" value={hook} onChange={setHook} rows={2} />
            <Field label="Cuerpo" value={body} onChange={setBody} rows={4} />
            <Field label="CTA" value={cta} onChange={setCta} rows={2} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="h-9" onClick={() => scheduleMut.mutate()} disabled={scheduleMut.isPending || !hook.trim() || !body.trim()}>
                {scheduleMut.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="mr-1.5 h-3.5 w-3.5" />}
                Mandar a Propuestas
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Otra versión
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
    </div>
  );
}
