// src/components/ExecutiveMemoModal.tsx
// MODAL DE MEMORANDO OPERATIVO EJECUTIVO DE SOCIOS (SPRINT S+17)
// Basado en High Output Management (Andy Grove) y Managing for Results (Peter Drucker).
// Genera en 1 clic el pulso semanal de gobernanza B2B para la reunión de socios de los lunes.

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Building2,
  TrendingUp,
  Layers,
  Sparkles,
  AlertTriangle,
  Target,
  ArrowRight,
  ShieldCheck,
  Share2,
  Clock,
  Briefcase,
  Users,
} from "lucide-react";
import {
  calcularExecutiveOperationsMemo,
  formatearMonedaARS,
  type ExecutiveOperationsMemo,
  type GenerarMemoParams,
} from "@/domain/executiveOperationsMemoEngine";
import { descargarExecutiveMemoPDF } from "@/services/executiveOperationsMemoPdfGenerator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ExecutiveMemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: GenerarMemoParams;
}

export function ExecutiveMemoModal({
  open,
  onOpenChange,
  initialData,
}: ExecutiveMemoModalProps) {
  const [activeTab, setActiveTab] = useState<
    "indicadores" | "arquetipos" | "alertas" | "formatos"
  >("indicadores");
  const [copiedWa, setCopiedWa] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  // Generar memorando reactivo
  const memo: ExecutiveOperationsMemo = useMemo(() => {
    return calcularExecutiveOperationsMemo(initialData);
  }, [initialData]);

  function handleCopiarWhatsApp() {
    navigator.clipboard.writeText(memo.formatos.whatsappResumen).then(() => {
      setCopiedWa(true);
      toast({
        title: "Resumen de WhatsApp copiado",
        description: "Mensaje listo para el grupo de socios de los lunes a primera hora.",
      });
      setTimeout(() => setCopiedWa(false), 2500);
    });
  }

  function handleCopiarMarkdown() {
    navigator.clipboard.writeText(memo.formatos.markdown).then(() => {
      setCopiedMd(true);
      toast({
        title: "Memorando en Markdown copiado",
        description: "Estructura completa para Notion, Slack o archivo interno.",
      });
      setTimeout(() => setCopiedMd(false), 2500);
    });
  }

  function handleDescargarPDF() {
    try {
      descargarExecutiveMemoPDF(memo);
      toast({
        title: "PDF del Memorando generado",
        description: `Descarga iniciada: Memo_Operativo_${memo.semana}_${memo.id}.pdf`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al generar PDF",
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  const ind = memo.indicadores;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Barra tricolor superior institucional */}
        <div className="h-1.5 w-full flex">
          <div className="bg-[#1A3D84] flex-[3]" />
          <div className="bg-[#E1061E] flex-1" />
          <div className="bg-[#F7CC13] flex-1" />
        </div>

        {/* Encabezado Directivo */}
        <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-[#1A3D84] text-[#1A3D84] dark:text-blue-400 font-bold text-xs uppercase"
                >
                  MEMO OPERATIVO EJECUTIVO DE SOCIOS
                </Badge>
                <Badge variant="secondary" className="text-xs font-mono">
                  Andy Grove & Peter Drucker
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 text-xs"
                >
                  Semana {memo.numeroSemana} ({memo.periodo})
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Pulso Semanal de Gobierno B2B e Indicadores de Palanca
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Informe ejecutivo sintetizado para la toma de decisiones y alineación estratégica de los lunes.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopiarWhatsApp}
                className="text-xs h-8 border-border flex items-center gap-1.5"
              >
                {copiedWa ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>WhatsApp Socios</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Ficha Rápida de Emisión */}
        <div className="px-5 py-2.5 bg-muted/20 border-b border-border text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Emisor: <strong className="text-foreground">{memo.emisor}</strong></span>
            <span>·</span>
            <span>Destinatarios: <strong className="text-foreground">{memo.destinatarios.join(", ")}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Aprobación media: <strong className="text-foreground">{ind.tiempoAprobacionMinutos} min / lote</strong></span>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-border px-5 bg-background">
          <button
            type="button"
            onClick={() => setActiveTab("indicadores")}
            className={cn(
              "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === "indicadores"
                ? "border-[#1A3D84] text-[#1A3D84] dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            1. Indicadores Grove
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("arquetipos")}
            className={cn(
              "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === "arquetipos"
                ? "border-[#1A3D84] text-[#1A3D84] dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Target className="h-3.5 w-3.5" />
            2. Arquetipos & Cuello
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("alertas")}
            className={cn(
              "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === "alertas"
                ? "border-[#1A3D84] text-[#1A3D84] dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            3. Alertas & Prioridades
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("formatos")}
            className={cn(
              "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === "formatos"
                ? "border-[#1A3D84] text-[#1A3D84] dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Share2 className="h-3.5 w-3.5" />
            4. Formatos Listos
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* PESTAÑA 1: INDICADORES GROVE */}
          {activeTab === "indicadores" && (
            <div className="space-y-4">
              {/* 4 KPIs de Palanca (High Output Management) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 space-y-1">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                    Publicaciones & Ritmo
                  </span>
                  <div className="text-xl font-bold text-foreground">
                    {ind.publicaciones.publicadas} <span className="text-xs text-muted-foreground font-normal">/ {ind.publicaciones.planificadas} piezas</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                    {ind.publicaciones.tasaCumplimientoPct}% cumplimiento
                  </span>
                </div>

                <div className="p-3.5 bg-muted/30 rounded-lg border border-border space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Tráfico con Atribución UTM
                  </span>
                  <div className="text-xl font-bold text-foreground">
                    {ind.traficoYAtribucion.clicksUtm.toLocaleString("es-AR")} <span className="text-xs text-muted-foreground font-normal">clicks</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Líder: {ind.traficoYAtribucion.canalLider}
                  </span>
                </div>

                <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900 space-y-1">
                  <span className="text-[10px] font-semibold text-[#E1061E] dark:text-rose-400 uppercase tracking-wide">
                    Leads & Decisores C-Level
                  </span>
                  <div className="text-xl font-bold text-foreground">
                    {ind.conversionYLeads.calificadosAltos} <span className="text-xs text-muted-foreground font-normal">/ {ind.conversionYLeads.leadsTotales} leads</span>
                  </div>
                  <span className="text-[11px] text-[#E1061E] dark:text-rose-400 font-semibold block">
                    {ind.conversionYLeads.tasaCalificacionPct}% Score ≥ 70
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900 space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
                    Pipeline B2B Generado
                  </span>
                  <div className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                    {formatearMonedaARS(ind.pipelineEstimadoARS)}
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold block">
                    {ind.saludSla.cumplimientoSlaPct}% SLA 48h ({ind.saludSla.promedioRespuestaHoras}h prom)
                  </span>
                </div>
              </div>

              {/* Resumen Ejecutivo del Pulso */}
              <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Síntesis Ejecutiva de la Semana:
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {memo.resumenEjecutivo}
                </p>
              </div>

              {/* Caja Negra Operativa (Andy Grove) */}
              <div className="p-4 bg-background rounded-lg border border-border space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Flujo de Caja Negra Operativa (De Insumos a Pipeline):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-muted/30 rounded border border-border space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase">1. Insumos & Bóveda</span>
                    <p className="text-muted-foreground">7 libros de gestión + fotos de trinchera indexadas con detector facial.</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded border border-border space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase">2. Aprobación & Despacho</span>
                    <p className="text-muted-foreground">{ind.publicaciones.publicadas} piezas validadas en &lt;2 min y despachadas con Outbox SQLite.</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded border border-border space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase">3. Atribución & Ventas</span>
                    <p className="text-muted-foreground">{ind.conversionYLeads.calificadosAltos} directivos derivados a CRM bajo SLA estricto de 48h.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: ARQUETIPOS & CUELLO */}
          {activeTab === "arquetipos" && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" />
                Contribución al Pipeline por Arquetipo Directivo:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {memo.desgloseArquetipos.map((arq) => (
                  <div
                    key={arq.arquetipo}
                    className="p-3.5 bg-background rounded-lg border border-border space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {arq.nombre}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold",
                            arq.estado === "Fuerte Tracción"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : arq.estado === "Estable"
                              ? "bg-blue-50 text-blue-800 border-blue-300"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {arq.estado}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {arq.leads} consultas capturadas · <strong className="text-primary">{arq.calificados} directivos calificados</strong>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground font-medium">Pipeline Activo:</span>
                      <strong className="text-xs text-foreground font-bold">{formatearMonedaARS(arq.pipelineARS)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* El Paso Limitante (Andy Grove) */}
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-300 dark:border-amber-800 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wide">
                    El Paso Limitante de la Operación (Cuello de Botella):
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">
                    {memo.pasoLimitante.pasoLimitante}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {memo.pasoLimitante.impactoEnNegocio}
                  </p>
                </div>
                <div className="p-2.5 bg-background rounded border border-amber-200 dark:border-amber-900/60 text-xs">
                  <strong className="text-amber-800 dark:text-amber-400">Acción Inmediata de Trinchera: </strong>
                  <span className="text-foreground">{memo.pasoLimitante.accionInmediata}</span>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: ALERTAS & PRIORIDADES */}
          {activeTab === "alertas" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Alertas Operativas y Fricciones del Sistema:
                </span>
                <div className="space-y-2">
                  {memo.alertasYFricciones.map((al, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border flex items-start justify-between gap-3 text-xs",
                        al.gravedad === "alta"
                          ? "bg-rose-50/40 border-rose-200 dark:bg-rose-950/10 dark:border-rose-900"
                          : al.gravedad === "media"
                          ? "bg-amber-50/40 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900"
                          : "bg-muted/30 border-border"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] uppercase font-bold",
                              al.gravedad === "alta"
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : al.gravedad === "media"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-muted text-foreground"
                            )}
                          >
                            {al.gravedad}
                          </Badge>
                          <span className="font-bold text-foreground">{al.area}</span>
                        </div>
                        <p className="text-muted-foreground">{al.descripcion}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground italic shrink-0 text-right">
                        Resp: {al.responsableSugerido}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prioridades Directivas */}
              <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-2.5">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-primary" />
                  Prioridades Directivas de los Socios para la Próxima Semana:
                </span>
                <div className="space-y-2">
                  {memo.prioridadesSemanaSiguiente.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-background rounded border border-border flex items-start gap-2.5 text-xs"
                    >
                      <div className="h-5 w-5 rounded-full bg-[#1A3D84] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="text-foreground font-medium leading-relaxed">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 4: FORMATOS LISTOS */}
          {activeTab === "formatos" && (
            <div className="space-y-4">
              {/* WhatsApp Briefing */}
              <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-lg border border-emerald-200 dark:border-emerald-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    Síntesis para WhatsApp de Socios (Lunes AM):
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopiarWhatsApp}
                    className="h-7 text-xs border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  >
                    {copiedWa ? <Check className="h-3 w-3 mr-1 text-emerald-600" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedWa ? "¡Copiado!" : "Copiar WhatsApp"}
                  </Button>
                </div>
                <pre className="p-3 bg-background rounded border border-border text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {memo.formatos.whatsappResumen}
                </pre>
              </div>

              {/* Markdown Memo */}
              <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    Memorando Completo en Markdown (Notion / Slack):
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopiarMarkdown}
                    className="h-7 text-xs border-border"
                  >
                    {copiedMd ? <Check className="h-3 w-3 mr-1 text-emerald-600" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedMd ? "¡Copiado!" : "Copiar Markdown"}
                  </Button>
                </div>
                <pre className="p-3 bg-background rounded border border-border text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-snug max-h-48 overflow-y-auto">
                  {memo.formatos.markdown}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="p-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Documento vectorial PDF A4 listo para la reunión de socios.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopiarWhatsApp}
              className="text-xs h-9 border-border"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copiar WhatsApp
            </Button>
            <Button
              size="sm"
              onClick={handleDescargarPDF}
              className="bg-[#1A3D84] hover:bg-[#1A3D84]/90 text-white text-xs h-9 font-semibold flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar Memo A4 (PDF)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 text-muted-foreground"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
