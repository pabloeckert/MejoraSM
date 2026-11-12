// src/components/FormatRecommenderCard.tsx
// COMPONENTE RECOMENDADOR INTELIGENTE DE FORMATO (SPRINT S+7 - 2026)
// Compara y recomienda determinísticamente: Carrusel PDF (1080x1350), Reel (1080x1920),
// Placa de Citas (1080x1080) y Post Estándar según Jonah Berger (STEPPS) y canales B2B.

import React, { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers,
  FileText,
  Video,
  Quote,
  Layout,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Share2,
  Bookmark,
} from "lucide-react";
import {
  recommendFormat,
  FormatRecommenderInput,
  SupportedFormat,
  FormatScoreBreakdown,
} from "@/domain/formatRecommender";
import { TipoFormatoBorrador } from "@/domain/types";
import { cn } from "@/lib/utils";

export interface FormatRecommenderCardProps {
  input: FormatRecommenderInput;
  activeFormat?: SupportedFormat | TipoFormatoBorrador | string;
  onApplyFormat?: (format: SupportedFormat, canonicalTipo: TipoFormatoBorrador) => void;
  compact?: boolean;
  className?: string;
}

export function FormatRecommenderCard({
  input,
  activeFormat,
  onApplyFormat,
  compact = false,
  className,
}: FormatRecommenderCardProps) {
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(!compact);

  // Cálculo memoizado de la recomendación
  const recommendation = useMemo(() => recommendFormat(input), [input]);

  const {
    primaryFormat,
    primaryChannel,
    canonicalTipoFormato,
    confidenceScore,
    predictedCTR,
    predictedRetention,
    shareabilityScore,
    rationale,
    recommendedDimensions,
    breakdown,
    actionableSuggestions,
  } = recommendation;

  // Icono dinámico según formato
  const getFormatIcon = (fmt: SupportedFormat, active = false) => {
    const iconClass = active ? "text-primary" : "text-slate-500";
    switch (fmt) {
      case "carrusel":
        return <FileText className={cn("h-4 w-4", iconClass)} />;
      case "reel":
        return <Video className={cn("h-4 w-4", iconClass)} />;
      case "cita_placa":
        return <Quote className={cn("h-4 w-4", iconClass)} />;
      case "post":
      default:
        return <Layout className={cn("h-4 w-4", iconClass)} />;
    }
  };

  const isCurrentActive = (fmt: SupportedFormat) => {
    if (!activeFormat) return fmt === primaryFormat;
    if (activeFormat === fmt) return true;
    if (activeFormat === "carrusel_pdf" && fmt === "carrusel") return true;
    if (activeFormat === "post_autoridad" && fmt === "cita_placa") return true;
    if (activeFormat === "post_directo" && (fmt === "post" || fmt === "reel")) return true;
    return false;
  };

  const handleSelect = (fmt: SupportedFormat) => {
    if (onApplyFormat) {
      const canonical =
        fmt === "carrusel"
          ? "carrusel_pdf"
          : fmt === "cita_placa"
          ? "post_autoridad"
          : "post_directo";
      onApplyFormat(fmt, canonical);
    }
  };

  const formatsList: FormatScoreBreakdown[] = [
    breakdown.carrusel,
    breakdown.reel,
    breakdown.cita_placa,
    breakdown.post,
  ].sort((a, b) => b.score - a.score);

  return (
    <Card
      className={cn(
        "border border-slate-200/90 shadow-sm bg-gradient-to-br from-white via-slate-50/50 to-blue-50/20 overflow-hidden",
        className
      )}
    >
      <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-white/80">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-200/60 shadow-xs">
              <Sparkles className="h-4 w-4 text-[#1A3D84]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                Recomendador Inteligente de Formato
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-[#1A3D84] border-blue-200 text-[10px] font-bold tracking-tight px-1.5 py-0"
                >
                  Confianza {confidenceScore}%
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Auditoría predictiva Jonah Berger (STEPPS) y ergonomía de canal B2B
              </CardDescription>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetailedBreakdown((v) => !v)}
            className="text-xs text-slate-600 hover:text-slate-900 h-7 px-2 gap-1"
          >
            {showDetailedBreakdown ? (
              <>
                Menos detalles <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Comparar formatos <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Banner de Formato Ganador */}
        <div className="rounded-xl border border-blue-200 bg-white p-3.5 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-[#1A3D84] border border-blue-100">
                {getFormatIcon(primaryFormat, true)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Formato Recomendado
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold text-[10px] px-1.5"
                  >
                    Óptimo
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-slate-900 capitalize">
                  {breakdown[primaryFormat].label}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="bg-slate-50 text-slate-700 border-slate-200 text-xs font-mono font-medium"
              >
                {recommendedDimensions.ratio} ({recommendedDimensions.width}x
                {recommendedDimensions.height})
              </Badge>
              <Badge
                variant="outline"
                className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-semibold capitalize"
              >
                {primaryChannel}
              </Badge>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed font-normal bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
            {rationale}
          </p>

          {/* Pronóstico de Métricas de Rendimiento */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            <div className="bg-white rounded-lg p-2 border border-slate-100 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                <TrendingUp className="h-3 w-3 text-blue-600" /> CTR Estimado
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {predictedCTR}%
              </p>
            </div>

            <div className="bg-white rounded-lg p-2 border border-slate-100 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                <Eye className="h-3 w-3 text-emerald-600" /> Retención
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {predictedRetention}%
              </p>
            </div>

            <div className="bg-white rounded-lg p-2 border border-slate-100 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                <Share2 className="h-3 w-3 text-purple-600" /> Reenvíos / Guardados
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {shareabilityScore}/10
              </p>
            </div>
          </div>

          {/* Botón de Aplicación Rápida */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              {isCurrentActive(primaryFormat)
                ? "Este formato ya está seleccionado para la pieza actual."
                : "Aplicar la resolución y estructura recomendada a esta propuesta."}
            </span>

            <Button
              size="sm"
              onClick={() => handleSelect(primaryFormat)}
              disabled={isCurrentActive(primaryFormat)}
              className={cn(
                "h-8 px-3 text-xs font-semibold gap-1.5 transition-all shadow-xs",
                isCurrentActive(primaryFormat)
                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                  : "bg-[#1A3D84] hover:bg-[#15326c] text-white"
              )}
            >
              {isCurrentActive(primaryFormat) ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Formato Activo
                </>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5" />
                  Aplicar Formato Recomendado
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Desglose Comparativo de Formatos (Barras de Afinidad) */}
        {showDetailedBreakdown && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                Comparativa de Idoneidad por Formato
              </h5>
              <span className="text-[10px] text-slate-400">Escala de 0 a 100 pts</span>
            </div>

            <div className="space-y-2.5">
              {formatsList.map((item) => {
                const isWinner = item.format === primaryFormat;
                const isSelected = isCurrentActive(item.format);

                return (
                  <div
                    key={item.format}
                    onClick={() => handleSelect(item.format)}
                    className={cn(
                      "p-2.5 rounded-lg border transition-all cursor-pointer",
                      isSelected
                        ? "border-blue-400 bg-blue-50/60 shadow-xs"
                        : "border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {getFormatIcon(item.format, isWinner)}
                        <span className="text-xs font-semibold text-slate-800">
                          {item.label}
                        </span>
                        {isWinner && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-[#1A3D84] text-[9px] font-bold px-1 py-0"
                          >
                            Recomendado
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge
                            variant="outline"
                            className="border-blue-400 text-blue-700 bg-white text-[9px] font-bold px-1 py-0"
                          >
                            Seleccionado
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {item.score} pts
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progreso Visual */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1.5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isWinner
                            ? "bg-gradient-to-r from-blue-600 to-[#1A3D84]"
                            : item.score >= 65
                            ? "bg-slate-500"
                            : "bg-slate-300"
                        )}
                        style={{ width: `${Math.min(100, Math.max(8, item.score))}%` }}
                      />
                    </div>

                    {/* Ventajas del formato */}
                    <ul className="text-[11px] text-slate-600 space-y-0.5 pl-4 list-disc list-outside">
                      {item.pros.slice(0, 2).map((pro, idx) => (
                        <li key={idx} className="leading-tight">
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Sugerencias de Producción Editorial */}
            {actionableSuggestions.length > 0 && (
              <div className="bg-amber-50/60 border border-amber-200/70 rounded-lg p-3 space-y-1.5 mt-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Bookmark className="h-3.5 w-3.5 text-amber-700" />
                  Criterios de Edición y Rodaje B2B:
                </div>
                <ul className="text-xs text-amber-900/90 space-y-1 pl-4 list-disc">
                  {actionableSuggestions.map((sug, i) => (
                    <li key={i} className="leading-relaxed">
                      {sug}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
