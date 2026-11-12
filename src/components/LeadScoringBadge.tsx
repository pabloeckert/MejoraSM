// src/components/LeadScoringBadge.tsx
// BADGE VISUAL DE LEAD SCORING PREDICTIVO B2B (SPRINT S+11 - 2026)
// Basado en Predictable Revenue (Aaron Ross) y Crossing the Chasm (Geoffrey Moore):
// Clasifica leads en 🔥 Calificados (SLA <2h), 🟡 En Nutrición (SLA <24h) y ⚪ Comunidad (SLA <48h).

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flame, Clock, ShieldAlert, Sparkles } from "lucide-react";
import { ResultadoLeadScoring } from "@/domain/leadScoringEngine";
import { cn } from "@/lib/utils";

interface LeadScoringBadgeProps {
  scoring: ResultadoLeadScoring;
  className?: string;
}

export function LeadScoringBadge({ scoring, className }: LeadScoringBadgeProps) {
  const { scoreTotal, cuadrante, slaHorasRecomendado, desglose, fitRolDetectado } = scoring;

  const isHot = cuadrante === "CALIFICADO_ALTO";
  const isNutricion = cuadrante === "EN_NUTRICION";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all shadow-xs cursor-pointer select-none",
              isHot
                ? "bg-rose-50 text-rose-900 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
                : isNutricion
                ? "bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800"
                : "bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
              className
            )}
          >
            {isHot ? (
              <Flame className="h-3.5 w-3.5 text-rose-600 animate-pulse" />
            ) : isNutricion ? (
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-slate-400" />
            )}

            <span className="font-bold">
              {scoreTotal} pts
            </span>

            <span className="text-[10px] font-medium opacity-80">
              · {isHot ? "Decisor Calificado" : isNutricion ? "En Nutrición" : "Comunidad"}
            </span>

            {/* SLA TAG */}
            <span
              className={cn(
                "inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold",
                isHot
                  ? "bg-rose-200/80 text-rose-950 dark:bg-rose-900/60 dark:text-rose-100"
                  : isNutricion
                  ? "bg-amber-200/80 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100"
                  : "bg-slate-200/80 text-slate-900 dark:bg-slate-700 dark:text-slate-200"
              )}
            >
              <Clock className="h-2.5 w-2.5" />
              SLA &lt;{slaHorasRecomendado}h
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3 max-w-xs space-y-1.5 text-xs bg-slate-900 text-white shadow-xl border border-slate-800">
          <div className="font-bold text-slate-100 flex items-center justify-between border-b border-slate-800 pb-1">
            <span>Auditoría B2B de Calificación</span>
            <span className="font-mono text-emerald-400 font-bold">{scoreTotal} / 100</span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span>Fit de Rol:</span>
              <span className="font-semibold text-slate-100">{desglose.fitRolDirectivo} / 35 pts ({fitRolDetectado})</span>
            </div>
            <div className="flex justify-between">
              <span>Dolor Operativo:</span>
              <span className="font-semibold text-slate-100">{desglose.intensidadDolor} / 35 pts</span>
            </div>
            <div className="flex justify-between">
              <span>Intención de Compra:</span>
              <span className="font-semibold text-slate-100">{desglose.intencionAccion} / 30 pts</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 italic">
            Ventana óptima de respuesta ejecutiva: &lt; {slaHorasRecomendado} horas.
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
