// src/components/ContentRoiDashboard.tsx
// TABLERO EJECUTIVO DE RETORNO DE CONTENIDO Y EMBUDO B2B (SPRINT S+15)
// Basado en Peter Drucker (La Gerencia) y Marty Cagan (Inspired: Value Risk).
// Atribución de pipeline, métricas de conversión por arquetipo y diagnóstico de cuellos de botella.

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  ArrowRight,
  Filter,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  PieChart,
  Table as TableIcon,
} from "lucide-react";
import {
  calcularContentRoi,
  formatearMoneda,
  type FiltroPeriodoRoi,
  type ResultadoContentRoi,
} from "@/domain/contentRoiEngine";
import { type InboxItem } from "@/services/supabase";
import { PipelineExporterModal } from "@/components/PipelineExporterModal";
import { cn } from "@/lib/utils";

export interface ContentRoiDashboardProps {
  inboxItems?: InboxItem[];
  proposalsCount?: number;
  totalImpressions?: number;
  totalClicks?: number;
}

export function ContentRoiDashboard({
  inboxItems = [],
  proposalsCount,
  totalImpressions,
  totalClicks,
}: ContentRoiDashboardProps) {
  const [periodo, setPeriodo] = useState<FiltroPeriodoRoi>("ultimos_30_dias");
  const [exporterOpen, setExporterOpen] = useState(false);

  const roiData: ResultadoContentRoi = useMemo(() => {
    return calcularContentRoi({
      proposalsCount,
      totalImpressions,
      totalClicks,
      inboxItems,
      filtroPeriodo: periodo,
    });
  }, [inboxItems, proposalsCount, totalImpressions, totalClicks, periodo]);

  const { metricasTotales, etapasEmbudo, metricasPorArquetipo, cuadrantesLead, diagnosticoEstrategico } = roiData;

  return (
    <Card className="border-border shadow-xs overflow-hidden">
      {/* Barra Tricolor Institucional Superior */}
      <div className="h-1.5 w-full flex">
        <div className="bg-[#1A3D84] flex-[3]" />
        <div className="bg-[#E1061E] flex-1" />
        <div className="bg-[#F7CC13] flex-1" />
      </div>

      <CardHeader className="p-5 pb-3 border-b border-border bg-muted/10 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-[#1A3D84] text-[#1A3D84] dark:text-blue-400 font-bold text-xs uppercase px-2.5 py-0.5">
                CONTENT ROI & FUNNEL B2B
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                Peter Drucker & Marty Cagan
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Retorno de Inversión Editorial y Embudo de Conversión
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Atribución directa de negocio: desde publicaciones orgánicas con UTMs hasta propuestas de acompañamiento emitidas.
            </p>
          </div>

          {/* Filtros de Período y Exportación CSV */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
              <Filter className="h-3.5 w-3.5 text-muted-foreground ml-1 mr-0.5" />
              <button
                type="button"
                onClick={() => setPeriodo("ultimos_30_dias")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium transition-all",
                  periodo === "ultimos_30_dias"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Últimos 30 Días
              </button>
              <button
                type="button"
                onClick={() => setPeriodo("trimestre_actual")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium transition-all",
                  periodo === "trimestre_actual"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Trimestre (90D)
              </button>
              <button
                type="button"
                onClick={() => setPeriodo("historico_completo")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium transition-all",
                  periodo === "historico_completo"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Histórico
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExporterOpen(true)}
              className="h-8 text-xs border-[#1A3D84]/30 text-[#1A3D84] hover:bg-blue-50/50 font-semibold"
            >
              <TableIcon className="mr-1.5 h-3.5 w-3.5 text-[#1A3D84]" />
              Exportar CSV / Sheets
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* 1. TOP 4 METRICAS CLAVE DE NEGOCIO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tarjeta 1: Pipeline Generado */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-primary uppercase tracking-wider text-[10px]">Pipeline B2B Activo</span>
              <DollarSign className="h-4 w-4 text-[#1A3D84] dark:text-blue-400" />
            </div>
            <div className="text-xl font-bold text-foreground">
              {formatearMoneda(metricasTotales.valorTotalPipeline)}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-3 w-3 text-primary" />
              <span>{metricasTotales.propuestasEmitidas} propuestas de acompañamiento</span>
            </div>
          </div>

          {/* Tarjeta 2: Decisores Calificados */}
          <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-[#E1061E] dark:text-rose-400 uppercase tracking-wider text-[10px]">Decisores Calificados</span>
              <Users className="h-4 w-4 text-[#E1061E]" />
            </div>
            <div className="text-xl font-bold text-foreground">
              {metricasTotales.leadsCalificados} <span className="text-xs font-normal text-muted-foreground">/ {metricasTotales.leadsTotales} leads</span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Score directivo ≥ 70 (SLA &lt; 2h)</span>
            </div>
          </div>

          {/* Tarjeta 3: Conversión Click to Lead */}
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[10px]">Conversión Click-to-Lead</span>
              <Target className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-foreground">
              {metricasTotales.tasaClickToLead}%
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span>{metricasTotales.clicksUtm} clicks UTM hacia web</span>
            </div>
          </div>

          {/* Tarjeta 4: Conversión Lead to Propuesta */}
          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider text-[10px]">Lead-to-Propuesta</span>
              <PieChart className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-xl font-bold text-foreground">
              {metricasTotales.tasaLeadToPropuesta}%
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span>{metricasTotales.dossiersPreparados} reuniones 1 a 1 preparadas</span>
            </div>
          </div>
        </div>

        {/* 2. EMBUDO VISUAL DE CONVERSIÓN EN 7 ETAPAS (PETER DRUCKER) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-primary" />
              Embudo de Conversión de Trinchera (De Impresión a Propuesta Firmada):
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Período: <strong className="text-foreground">{roiData.periodoLabel}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {etapasEmbudo.map((etapa, idx) => (
              <div
                key={etapa.id}
                className="p-3 bg-muted/30 rounded-lg border border-border flex flex-col justify-between hover:border-primary/50 transition-colors relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Paso {idx + 1}
                    </span>
                    {idx > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded">
                        {etapa.porcentajeConversionAnterior}%
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-foreground line-clamp-1" title={etapa.etapa}>
                    {etapa.etapa.split(". ")[1] || etapa.etapa}
                  </h4>
                  <div className="text-lg font-bold text-primary mt-1">
                    {etapa.cantidad.toLocaleString("es-AR")}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2" title={etapa.descripcion}>
                    {etapa.descripcion}
                  </p>
                </div>

                {idx < etapasEmbudo.length - 1 && (
                  <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. DESGLOSE POR ARQUETIPO DE DOLOR DIRECTIVO */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            Rendimiento y Contribución al Pipeline por Arquetipo Directivo:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {metricasPorArquetipo.map((arq) => (
              <div
                key={arq.arquetipo}
                className="p-3.5 bg-muted/20 rounded-lg border border-border flex flex-col justify-between space-y-2.5"
                style={{ borderTopColor: arq.color, borderTopWidth: 3 }}
              >
                <div>
                  <h4 className="text-xs font-bold text-foreground">{arq.label}</h4>
                  <div className="text-base font-bold text-foreground mt-1">
                    {formatearMoneda(arq.valorPipeline)}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Pipeline estimado ({arq.propuestasCount} propuestas)
                  </span>
                </div>

                <div className="space-y-1 text-xs pt-2 border-t border-border/60">
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Leads capturados:</span>
                    <strong className="text-foreground">{arq.leadsCount}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Decisores calificados:</span>
                    <strong className="text-[#E1061E]">{arq.calificadosCount}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Tasa de calificación:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{arq.tasaConversion}%</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. CUADRANTES DE LEAD Y DIAGNOSTICO ESTRATEGICO (CALIDEZ CON VERDAD) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Clasificación de Cuadrantes */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
              Distribución de Cuadrantes (Leads):
            </span>
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  🔥 Calificados Altos (Score ≥ 70)
                </span>
                <strong className="text-foreground">{cuadrantesLead.calificadosAltos}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  🟡 En Nutrición (Score 35-69)
                </span>
                <strong className="text-foreground">{cuadrantesLead.enNutricion}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  ⚪ Comunidad (Score &lt; 35)
                </span>
                <strong className="text-foreground">{cuadrantesLead.comunidad}</strong>
              </div>
            </div>
          </div>

          {/* Diagnóstico de Cuello de Botella y Recomendación */}
          <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#1A3D84] dark:text-blue-400" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                Diagnóstico Estratégico de Embudo (Peter Drucker & Calidez con Verdad):
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Arquetipo Más Rentable</span>
                <p className="text-foreground font-semibold mt-0.5">{diagnosticoEstrategico.arquetipoMasRentable}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#E1061E] uppercase block flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Cuello de Botella Detectado
                </span>
                <p className="text-foreground font-semibold mt-0.5">{diagnosticoEstrategico.cuelloDeBotellaDetectado}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-bold text-primary">Acción de Trinchera Recomendada: </span>
              <span className="text-muted-foreground">{diagnosticoEstrategico.accionSugerida}</span>
            </div>
          </div>
        </div>
      </CardContent>

      <PipelineExporterModal
        open={exporterOpen}
        onOpenChange={setExporterOpen}
        initialDataset="embudo_roi"
        exportInput={{
          filtroPeriodo: periodo,
          proposalsCount,
          totalImpressions,
          totalClicks,
          inboxItems,
        }}
      />
    </Card>
  );
}
