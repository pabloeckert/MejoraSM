// src/components/SlaAuditSection.tsx
// WIDGET SOBERANO DE AUDITORÍA DE SLAS DE CONVERSIÓN B2B (Service Blueprint)
// Monitorea en tiempo real los leads derivados desde redes sociales (LinkedIn, IG, FB) al CRM
// y audita el cumplimiento del SLA de atención de 48 horas con semáforo de 3 estados.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  UserCheck,
  Building,
  Mail,
  Phone,
  Tag,
  Share2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  obtenerAuditoriaSlaCRM,
  calificarProspectoCRM,
  type MetricasSlaResumen,
  type ProspectoSlaCalculado,
} from "@/services/contactosService";
import { toast } from "@/hooks/use-toast";

const CANAL_COLORS: Record<string, { label: string; className: string }> = {
  linkedin: { label: "LinkedIn", className: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200" },
  instagram: { label: "Instagram", className: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950 dark:text-pink-200" },
  facebook: { label: "Facebook", className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200" },
};

const ARQUETIPO_COLORS: Record<string, { label: string; className: string }> = {
  saturado: { label: "Saturado (Falta Tiempo)", className: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200" },
  esceptico: { label: "Escéptico (Prueba/Costo)", className: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-200" },
  orden_para_crecer: { label: "Orden para Crecer", className: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200" },
  indefinido: { label: "General", className: "bg-muted text-muted-foreground" },
};

export function SlaAuditSection() {
  const qc = useQueryClient();
  const [qualifyingId, setQualifyingId] = useState<string | null>(null);

  const { data: auditoria, isLoading, isRefetching, refetch } = useQuery<MetricasSlaResumen>({
    queryKey: ["prospectos-sla"],
    queryFn: obtenerAuditoriaSlaCRM,
    refetchInterval: 15_000, // actualización continua cada 15s
  });

  const calificarMut = useMutation({
    mutationFn: async (id: string) => {
      setQualifyingId(id);
      const ok = await calificarProspectoCRM(id);
      if (!ok) throw new Error("No se pudo calificar el prospecto en CRM");
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["prospectos-sla"] });
      toast({
        title: "Lead Calificado en CRM",
        description: `El reloj de SLA del prospecto #${id.slice(0, 8)} se detuvo exitosamente.`,
      });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Error al calificar",
        description: err.message,
      });
    },
    onSettled: () => {
      setQualifyingId(null);
    },
  });

  const metricas = auditoria || {
    total_capturados: 0,
    pendientes_atencion: 0,
    en_tiempo: 0,
    proximo_vencer: 0,
    vencidos: 0,
    calificados_en_sla: 0,
    calificados_fuera_sla: 0,
    cumplimiento_pct: 100,
    tiempo_promedio_atencion_horas: 0,
    prospectos: [],
  };

  const prospectos = metricas.prospectos || [];

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </span>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                Auditoría de SLAs de Conversión B2B (Service Blueprint — 48h)
              </CardTitle>
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[11px] font-mono">
                SLA Máx: 48 Horas
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Trazabilidad en tiempo real de decisores derivados desde LinkedIn, Instagram y Facebook al CRM comercial. Semáforo estricto de respuesta inicial.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isRefetching || isLoading) && "animate-spin")} />
            Actualizar SLA
          </Button>
        </div>

        {/* Tarjetas de Métricas de SLA (Semáforo del Service Blueprint) */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {/* Card 1: Cumplimiento General */}
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Cumplimiento Global</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {metricas.cumplimiento_pct}%
              </span>
              <span className="text-[10px] text-muted-foreground">meta: 95%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  metricas.cumplimiento_pct >= 90 ? "bg-emerald-500" : metricas.cumplimiento_pct >= 75 ? "bg-amber-500" : "bg-destructive"
                )}
                style={{ width: `${Math.min(100, Math.max(0, metricas.cumplimiento_pct))}%` }}
              />
            </div>
          </div>

          {/* Card 2: 🟢 En Tiempo (<24h) */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              En Tiempo (&lt;24h)
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
              {metricas.en_tiempo}
            </p>
            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">Atención óptima</p>
          </div>

          {/* Card 3: 🟡 Próximo a Vencer (24h-48h) */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Por Vencer (24-48h)
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
              {metricas.proximo_vencer}
            </p>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-400">Riesgo de enfriamiento</p>
          </div>

          {/* Card 4: 🔴 Alerta de Fuga (>48h) */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-destructive">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              Alerta de Fuga (&gt;48h)
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight text-destructive">
              {metricas.vencidos}
            </p>
            <p className="text-[10px] text-destructive/80">SLA Incumplido</p>
          </div>

          {/* Card 5: Tiempo Promedio de Respuesta */}
          <div className="rounded-lg border border-border bg-background/50 p-3 col-span-2 sm:col-span-1">
            <p className="text-[11px] font-medium text-muted-foreground">Tiempo Promedio</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {metricas.tiempo_promedio_atencion_horas}
              </span>
              <span className="text-xs text-muted-foreground">hs</span>
            </div>
            <p className="text-[10px] text-muted-foreground">hasta calificación</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {prospectos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h4 className="mt-2 text-sm font-semibold text-foreground">Sin prospectos pendientes en cola</h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
              Los decisores derivados desde los DMs y comentarios en <strong>Conversaciones</strong> ingresan automáticamente con su cronómetro de 48 horas activo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="pb-2.5">Decisor / Lead</th>
                  <th className="pb-2.5">Canal</th>
                  <th className="pb-2.5">Arquetipo Inferido</th>
                  <th className="pb-2.5">Pieza Origen</th>
                  <th className="pb-2.5">Semáforo SLA</th>
                  <th className="pb-2.5">Tiempo</th>
                  <th className="pb-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {prospectos.map((p) => {
                  const canal = CANAL_COLORS[(p.origen_utm?.split("/")[0] || "instagram").toLowerCase()] || {
                    label: p.origen_utm?.split("/")[0] || "Social",
                    className: "bg-muted text-muted-foreground",
                  };
                  const arquetipo =
                    ARQUETIPO_COLORS[(p.perfil_detectado_id || "indefinido").toLowerCase()] ||
                    ARQUETIPO_COLORS.indefinido;

                  const esPendiente = p.estado === "CAPTURADO";

                  return (
                    <tr key={p.prospecto_id} className="hover:bg-muted/40 transition-colors">
                      {/* Decisor */}
                      <td className="py-3 pr-3 font-medium text-foreground">
                        <div>
                          <p className="font-semibold text-foreground">{p.nombre}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {p.email && (
                              <span className="flex items-center gap-0.5">
                                <Mail className="h-2.5 w-2.5" />
                                {p.email}
                              </span>
                            )}
                            {p.telefono && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="h-2.5 w-2.5" />
                                {p.telefono}
                              </span>
                            )}
                            {p.empresa && (
                              <span className="flex items-center gap-0.5">
                                <Building className="h-2.5 w-2.5" />
                                {p.empresa}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Canal */}
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <Badge variant="outline" className={cn("text-[10px] font-medium border", canal.className)}>
                          {canal.label}
                        </Badge>
                      </td>

                      {/* Arquetipo */}
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <Badge variant="outline" className={cn("text-[10px] font-medium border", arquetipo.className)}>
                          {arquetipo.label}
                        </Badge>
                      </td>

                      {/* Pieza Origen */}
                      <td className="py-3 pr-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3 opacity-60" />
                          {p.pieza_id_atribucion}
                        </span>
                      </td>

                      {/* Semáforo SLA */}
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {p.estado_sla === "en_tiempo" && (
                          <Badge className="bg-emerald-600 text-white border-0 gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> En Tiempo
                          </Badge>
                        )}
                        {p.estado_sla === "proximo_vencer" && (
                          <Badge className="bg-amber-500 text-white border-0 gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" /> Por Vencer
                          </Badge>
                        )}
                        {p.estado_sla === "vencido" && (
                          <Badge className="bg-destructive text-destructive-foreground border-0 gap-1 text-[10px] animate-pulse">
                            <AlertOctagon className="h-3 w-3" /> Fuga (&gt;48h)
                          </Badge>
                        )}
                      </td>

                      {/* Tiempo Restante / Transcurrido */}
                      <td className="py-3 pr-3 whitespace-nowrap text-[11px]">
                        {esPendiente ? (
                          p.horas_restantes > 0 ? (
                            <span className="text-muted-foreground font-mono">
                              Restan <strong>{p.horas_restantes}h</strong>
                            </span>
                          ) : (
                            <span className="text-destructive font-semibold font-mono">
                              Vencido hace {Math.abs(p.horas_restantes)}h
                            </span>
                          )
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            ✓ {p.estado} en {p.horas_transcurridas}h
                          </span>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="py-3 text-right whitespace-nowrap">
                        {esPendiente ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-primary/30 text-primary hover:bg-primary/5"
                            onClick={() => calificarMut.mutate(p.prospecto_id)}
                            disabled={qualifyingId === p.prospecto_id}
                          >
                            <UserCheck className="mr-1 h-3 w-3" />
                            {qualifyingId === p.prospecto_id ? "Guardando…" : "Calificar"}
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic font-mono">
                            auditado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
