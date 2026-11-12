// src/components/CopyExperimentSimulator.tsx
// Componente de UI para el Simulador A/B de Copy y Hooks en Mesa de Diálogo.
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  HeartHandshake,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Share2,
  Eye,
  Check,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import {
  simulateCopyExperiment,
  type CopyVariant,
  type ExperimentSimulationResult,
} from "@/domain/copyExperimentSimulator";

interface CopyExperimentSimulatorProps {
  topic?: string;
  initialHook?: string;
  initialBody?: string;
  initialCta?: string;
  activeVariantId?: "A" | "B";
  onApplyVariant: (variant: CopyVariant) => void;
}

export function CopyExperimentSimulator({
  topic,
  initialHook,
  initialBody,
  initialCta,
  activeVariantId,
  onApplyVariant,
}: CopyExperimentSimulatorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showSteppsBreakdown, setShowSteppsBreakdown] = useState(false);

  // Simulación determinista en tiempo real
  const simulation: ExperimentSimulationResult = useMemo(() => {
    return simulateCopyExperiment({
      topic,
      hook: initialHook,
      body: initialBody,
      cta: initialCta,
    });
  }, [topic, initialHook, initialBody, initialCta]);

  const { variants, recommendedVariant, differentialAnalysis } = simulation;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/[0.02] shadow-sm overflow-hidden">
      <CardHeader
        className="pb-3 border-b border-border/60 cursor-pointer bg-muted/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                Simulador A/B de Copy y Hooks
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                  Marco Jonah Berger (STEPPS)
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Enfrentamiento predictivo entre Quiebre Directivo y Empatía de Trinchera antes de publicar.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[11px] font-semibold">
              Recomendada: Variante {recommendedVariant}
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="p-4 space-y-4">
          {/* BANNER DIFERENCIAL */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs flex items-start gap-2.5">
            <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground">Dictamen Predictivo del Simulador:</p>
              <p className="text-muted-foreground leading-relaxed">
                {differentialAnalysis.summary}
              </p>
            </div>
          </div>

          {/* TARJETAS LADO A LADO: VARIANTE A vs VARIANTE B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TARJETA VARIANTE A */}
            <VariantCard
              variant={variants.A}
              isRecommended={recommendedVariant === "A"}
              isSelected={activeVariantId === "A"}
              onApply={() => onApplyVariant(variants.A)}
              icon={<Zap className="h-4 w-4 text-amber-500" />}
            />

            {/* TARJETA VARIANTE B */}
            <VariantCard
              variant={variants.B}
              isRecommended={recommendedVariant === "B"}
              isSelected={activeVariantId === "B"}
              onApply={() => onApplyVariant(variants.B)}
              icon={<HeartHandshake className="h-4 w-4 text-emerald-500" />}
            />
          </div>

          {/* DESGLOSE DETALLADO DE LAS 6 DIMENSIONES STEPPS */}
          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setShowSteppsBreakdown(!showSteppsBreakdown)}
              className="text-xs font-semibold text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              {showSteppsBreakdown ? "Ocultar auditoría STEPPS detallada" : "Ver auditoría comparativa de 6 dimensiones STEPPS"}
              {showSteppsBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showSteppsBreakdown && (
              <div className="mt-3 p-3.5 rounded-lg border bg-muted/30 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <SteppsDimensionRow
                    dimension="1. Moneda Social"
                    desc="Estatus y autoridad técnica del que comparte"
                    valA={variants.A.stepps.moneda_social}
                    valB={variants.B.stepps.moneda_social}
                  />
                  <SteppsDimensionRow
                    dimension="2. Disparadores"
                    desc="Anclaje en la rutina operativa semanal"
                    valA={variants.A.stepps.disparadores}
                    valB={variants.B.stepps.disparadores}
                  />
                  <SteppsDimensionRow
                    dimension="3. Emoción Desculpabilizadora"
                    desc="Calidez con verdad (foco en proceso)"
                    valA={variants.A.stepps.emocion_desculpabilizadora}
                    valB={variants.B.stepps.emocion_desculpabilizadora}
                  />
                  <SteppsDimensionRow
                    dimension="4. Público y Arquetipos"
                    desc="Visibilidad de diagnósticos y marcos"
                    valA={variants.A.stepps.publico_visual}
                    valB={variants.B.stepps.publico_visual}
                  />
                  <SteppsDimensionRow
                    dimension="5. Valor Práctico"
                    desc="Estructura de 3 pasos ejecutables"
                    valA={variants.A.stepps.valor_practico}
                    valB={variants.B.stepps.valor_practico}
                  />
                  <SteppsDimensionRow
                    dimension="6. Historias Troya"
                    desc="Relato de trinchera y pymes reales"
                    valA={variants.A.stepps.historias_troya}
                    valB={variants.B.stepps.historias_troya}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function VariantCard({
  variant,
  isRecommended,
  isSelected,
  onApply,
  icon,
}: {
  variant: CopyVariant;
  isRecommended: boolean;
  isSelected: boolean;
  onApply: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col justify-between space-y-3.5 transition-all shadow-sm ${
        isSelected
          ? "border-primary bg-primary/[0.04] ring-2 ring-primary/40 shadow-md"
          : "border-border hover:border-primary/40 bg-card"
      }`}
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-bold text-foreground">{variant.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isRecommended && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                Sugerida
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {variant.badge}
            </Badge>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground font-medium">
          Target: <span className="text-foreground">{variant.targetPersona}</span>
        </p>

        {/* GANCHO / HOOK DESTACADO */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Gancho / Hook de Apertura
          </span>
          <p className="text-xs font-semibold leading-snug text-foreground">
            "{variant.hook}"
          </p>
        </div>

        {/* MÉTRICAS PREDICTIVAS */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2 rounded-md bg-background border text-center">
            <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mb-0.5">
              <Eye className="h-3 w-3" /> Scroll-Stop
            </span>
            <span className="text-xs font-bold text-foreground">
              {variant.metrics.predictedScrollStopRate}%
            </span>
          </div>

          <div className="p-2 rounded-md bg-background border text-center">
            <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mb-0.5">
              <ShieldCheck className="h-3 w-3" /> Retención
            </span>
            <span className="text-xs font-bold text-foreground">
              {variant.metrics.predictedCompletionRate}%
            </span>
          </div>

          <div className="p-2 rounded-md bg-background border text-center">
            <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mb-0.5">
              <Share2 className="h-3 w-3" /> Virilidad
            </span>
            <span className="text-xs font-bold text-primary">
              {variant.metrics.shareabilityScore}/10
            </span>
          </div>
        </div>

        {/* SCORE GLOBAL STEPPS */}
        <div className="flex items-center justify-between text-xs px-1 pt-1">
          <span className="text-muted-foreground">Score STEPPS Jonah Berger:</span>
          <span className="font-bold text-foreground flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
              {variant.stepps.score_global}
            </span>
            /10
          </span>
        </div>
      </div>

      {/* BOTÓN DE ACCIÓN / SELECCIÓN */}
      <Button
        size="sm"
        onClick={onApply}
        variant={isSelected ? "default" : "outline"}
        className={`w-full text-xs font-semibold h-8 gap-1.5 ${
          isSelected
            ? "bg-[#1A3D84] text-white hover:bg-[#142e63]"
            : "border-primary/40 text-primary hover:bg-primary/10"
        }`}
      >
        {isSelected ? (
          <>
            <Check className="h-3.5 w-3.5" /> Variante Activa en Carrusel
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" /> Aplicar Variante {variant.id} al Carrusel
          </>
        )}
      </Button>
    </div>
  );
}

function SteppsDimensionRow({
  dimension,
  desc,
  valA,
  valB,
}: {
  dimension: string;
  desc: string;
  valA: number;
  valB: number;
}) {
  const winner = valA > valB ? "A" : valB > valA ? "B" : "Tie";

  return (
    <div className="p-2.5 rounded-md bg-background border space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground">{dimension}</span>
        <span className="text-[10px] text-muted-foreground">{desc}</span>
      </div>
      <div className="flex items-center justify-between text-xs pt-0.5">
        <span className={`font-mono ${winner === "A" ? "text-primary font-bold" : "text-muted-foreground"}`}>
          Var A: {valA}
        </span>
        <span className="text-muted-foreground text-[10px]">vs</span>
        <span className={`font-mono ${winner === "B" ? "text-primary font-bold" : "text-muted-foreground"}`}>
          Var B: {valB}
        </span>
      </div>
    </div>
  );
}
