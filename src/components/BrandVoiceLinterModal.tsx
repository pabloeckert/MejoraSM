// src/components/BrandVoiceLinterModal.tsx
// AUDITOR Y CALIBRADOR INTERACTIVO DE IDENTIDAD VERBAL Y TONO DE MARCA (SPRINT S+19)
// Basado en el Manual de Marca de Mejora Continua ("Calidez con Verdad", "Nunca a la Persona"),
// Kim Scott (Radical Candor) y Donald Miller (Building a StoryBrand).

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Wand2,
  Scale,
  ArrowRight,
  Compass,
  BookOpen,
} from "lucide-react";
import {
  auditarBrandVoice,
  PRESETS_AUDITORIA_BRAND_VOICE,
  type ResultadoAuditoriaBrandVoice,
} from "@/domain/brandVoiceLinterEngine";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface BrandVoiceLinterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialText?: string;
  contextLabel?: string;
  onApplyText?: (calibratedText: string) => void;
}

export function BrandVoiceLinterModal({
  open,
  onOpenChange,
  initialText,
  contextLabel = "Borrador Editorial / Respuesta Directa",
  onApplyText,
}: BrandVoiceLinterModalProps) {
  const defaultText =
    initialText && initialText.trim().length > 0
      ? initialText
      : PRESETS_AUDITORIA_BRAND_VOICE[0].texto;

  const [texto, setTexto] = useState<string>(defaultText);
  const [activeTab, setActiveTab] = useState<"auditoria" | "calibracion">(
    "auditoria"
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setTexto(
        initialText && initialText.trim().length > 0
          ? initialText
          : PRESETS_AUDITORIA_BRAND_VOICE[0].texto
      );
    }
  }, [open, initialText]);

  const auditoria: ResultadoAuditoriaBrandVoice = useMemo(() => {
    return auditarBrandVoice(texto);
  }, [texto]);

  function handleAplicarCalibracion() {
    const calibrado = auditoria.textoCalibradoSugerido;
    setTexto(calibrado);
    if (onApplyText) {
      onApplyText(calibrado);
    }
    toast({
      title: "Calibración quirúrgica aplicada",
      description:
        "El texto fue reencuadrado hacia el sistema, sin vicios punitivos ni apelación a precio.",
    });
  }

  async function handleCopiarTextoCalibrado() {
    try {
      await navigator.clipboard.writeText(auditoria.textoCalibradoSugerido);
      setCopied(true);
      toast({
        title: "Copy calibrado copiado al portapapeles",
        description: "Listo para publicar o responder con Calidez con Verdad.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo copiar",
        description: err instanceof Error ? err.message : "Error de portapapeles",
      });
    }
  }

  const estadoBadge = useMemo(() => {
    if (auditoria.estadoAprobacion === "APROBADO_IMPECABLE") {
      return {
        label: "APROBADO IMPECABLE (ESTÁNDAR MC)",
        className:
          "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
        Icon: CheckCircle2,
      };
    }
    if (auditoria.estadoAprobacion === "APROBADO_CON_AJUSTES") {
      return {
        label: "APROBADO CON OBSERVACIONES",
        className:
          "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
        Icon: AlertTriangle,
      };
    }
    return {
      label: "RECHAZADO — VIOLA CRITERIO DE MARCA",
      className:
        "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/50 dark:text-red-300",
      Icon: XCircle,
    };
  }, [auditoria.estadoAprobacion]);

  const StatusIcon = estadoBadge.Icon;

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
                  BRAND VOICE LINTER & CALIBRATOR
                </Badge>
                <Badge variant="secondary" className="text-xs font-mono">
                  Kim Scott (Radical Candor) & Donald Miller
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 text-xs"
                >
                  {contextLabel}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Auditor y Calibrador de Tono de Marca (&ldquo;Calidez con Verdad&rdquo;)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Verifica que ningún mensaje juzgue a la persona, venda por precio o use humo comercial, garantizando foco en procesos y dirección 4D.
              </DialogDescription>
            </div>
          </div>

          {/* Barra de Presets de Prueba Rápida */}
          <div className="pt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">
              Escenarios de prueba:
            </span>
            {PRESETS_AUDITORIA_BRAND_VOICE.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setTexto(preset.texto)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors",
                  texto === preset.texto
                    ? "bg-[#1A3D84] text-white border-[#1A3D84]"
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
                title={preset.descripcion}
              >
                {preset.nombre}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-border px-5 bg-background">
          <button
            type="button"
            onClick={() => setActiveTab("auditoria")}
            className={cn(
              "px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === "auditoria"
                ? "border-[#1A3D84] text-[#1A3D84] dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            1. Auditoría de Tono & 4 Pilares ({auditoria.hallazgos.length} hallazgos)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("calibracion")}
            className={cn(
              "px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === "calibracion"
                ? "border-[#1A3D84] text-[#1A3D84] dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Compass className="h-3.5 w-3.5" />
            2. Calibración Quirúrgica & Estructura 3 Pasos
          </button>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* RESUMEN SUPERIOR DE SCORE Y CUADRANTE RADICAL CANDOR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Índice de Fidelidad Verbal
                </span>
                <div className="text-2xl font-extrabold text-primary mt-0.5">
                  {auditoria.scoreGlobal} <span className="text-xs font-normal text-muted-foreground">/ 100 pts</span>
                </div>
              </div>
              <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-1 flex items-center gap-1", estadoBadge.className)}>
                <StatusIcon className="h-3.5 w-3.5" />
                {estadoBadge.label}
              </Badge>
            </div>

            <div className="md:col-span-2 p-3.5 rounded-lg border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A3D84] dark:text-blue-300">
                  Diagnóstico Cuadrante Radical Candor (Kim Scott)
                </span>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {auditoria.cuadranteLabel}
                </Badge>
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                {auditoria.cuadranteDescripcion}
              </p>
            </div>
          </div>

          {/* 4 TARJETAS DE PILARES DEL MANUAL DE MARCA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-lg border border-border bg-background space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                <span>1. Sistema, No Persona</span>
                <span>{auditoria.puntajesPorPilar.sistemaNoPersona}/30</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    auditoria.puntajesPorPilar.sistemaNoPersona >= 25
                      ? "bg-emerald-600"
                      : "bg-[#E1061E]"
                  )}
                  style={{
                    width: `${(auditoria.puntajesPorPilar.sistemaNoPersona / 30) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Cero culpa al líder o equipo
              </span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-background space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                <span>2. Calidez con Verdad</span>
                <span>{auditoria.puntajesPorPilar.calidezConVerdad}/25</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    auditoria.puntajesPorPilar.calidezConVerdad >= 20
                      ? "bg-emerald-600"
                      : "bg-[#E1061E]"
                  )}
                  style={{
                    width: `${(auditoria.puntajesPorPilar.calidezConVerdad / 25) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Cero humo gurú ni promesas mágicas
              </span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-background space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                <span>3. No Vender por Precio</span>
                <span>{auditoria.puntajesPorPilar.noVenderPorPrecio}/25</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    auditoria.puntajesPorPilar.noVenderPorPrecio >= 20
                      ? "bg-emerald-600"
                      : "bg-[#E1061E]"
                  )}
                  style={{
                    width: `${(auditoria.puntajesPorPilar.noVenderPorPrecio / 25) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Autoridad consultiva sin regateo
              </span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-background space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                <span>4. Dirección 4D</span>
                <span>{auditoria.puntajesPorPilar.estructuraDireccion4D}/20</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    auditoria.puntajesPorPilar.estructuraDireccion4D >= 15
                      ? "bg-emerald-600"
                      : "bg-amber-500"
                  )}
                  style={{
                    width: `${(auditoria.puntajesPorPilar.estructuraDireccion4D / 20) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Verdad + Causa Raíz + Acción
              </span>
            </div>
          </div>

          {activeTab === "auditoria" && (
            <div className="space-y-4">
              {/* Editor de Texto */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="brand-voice-editor"
                    className="text-xs font-bold uppercase tracking-wider text-primary"
                  >
                    Texto bajo Auditoría ({auditoria.metricasTexto.palabrasCount} palabras):
                  </label>
                  {auditoria.hallazgos.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAplicarCalibracion}
                      className="h-7 text-xs bg-[#1A3D84] hover:bg-[#1A3D84]/90 text-white font-semibold flex items-center gap-1.5"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Aplicar Calibración Quirúrgica en 1 Clic
                    </Button>
                  )}
                </div>
                <Textarea
                  id="brand-voice-editor"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={4}
                  className="text-xs leading-relaxed font-sans"
                  placeholder="Pegá o escribí aquí el copy del post, carrusel o respuesta directa para auditar su alineación con el Manual de Marca..."
                />
              </div>

              {/* Lista de Hallazgos */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Hallazgos del Linter de Marca ({auditoria.hallazgos.length})
                </h3>

                {auditoria.hallazgos.length === 0 ? (
                  <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20 flex items-center gap-3 text-xs text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block font-bold">
                        Copy 100% alineado con la Constitución Verbal de Mejora Continua
                      </strong>
                      <span>
                        No se detectaron juicios personales, promesas mágicas ni apelaciones a precio. El mensaje ancla en procesos y ofrece dirección clara.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditoria.hallazgos.map((h) => (
                      <div
                        key={h.id}
                        className={cn(
                          "p-3 rounded-lg border text-xs space-y-1.5",
                          h.severidad === "bloqueante"
                            ? "border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20"
                            : "border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20"
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            {h.severidad === "bloqueante" ? (
                              <XCircle className="h-3.5 w-3.5 text-[#E1061E]" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            )}
                            {h.reglaLabel}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] uppercase font-bold",
                              h.severidad === "bloqueante"
                                ? "border-[#E1061E] text-[#E1061E]"
                                : "border-amber-600 text-amber-700"
                            )}
                          >
                            {h.severidad}: {h.terminoDetectado}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{h.explicacionCriterio}</p>
                        <div className="pt-1 flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold">
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                          <span>Reencuadre sugerido: &ldquo;{h.reemplazoSugerido}&rdquo;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "calibracion" && (
            <div className="space-y-4">
              {/* Comparativa Antes vs Calibrado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Versión Original Auditada ({auditoria.scoreGlobal}/100 pts)
                  </span>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {auditoria.textoOriginal}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-emerald-300 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Versión Calibrada Mejora Continua (100/100 pts)
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      Calidez con Verdad
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground font-medium whitespace-pre-wrap leading-relaxed">
                    {auditoria.textoCalibradoSugerido}
                  </p>
                </div>
              </div>

              {/* Desglose en las 3 Estructuras Mandatorias */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#1A3D84]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Arquitectura Verbal en 3 Pasos (Verdad + Claridad + Dirección 4D)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded border border-border bg-background space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#E1061E] block">
                      1. Verdad + Claridad (Dolor Real)
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {auditoria.estructuraTresPasos.paso1VerdadSinJuzgar}
                    </p>
                  </div>

                  <div className="p-3 rounded border border-border bg-background space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#1A3D84] block">
                      2. Exposición (Causa Raíz de Sistema)
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {auditoria.estructuraTresPasos.paso2CausaRaizSistema}
                    </p>
                  </div>

                  <div className="p-3 rounded border border-border bg-background space-y-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                      3. Dirección Concreta (Acción 4D)
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {auditoria.estructuraTresPasos.paso3DireccionConcreta}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer de Acciones */}
        <div className="p-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Guardián determinista de identidad verbal · Cero culpa a la persona.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopiarTextoCalibrado}
              className="text-xs h-9 border-border"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1.5 text-[#1A3D84]" />
              )}
              Copiar Versión Calibrada
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleAplicarCalibracion}
              className="bg-[#1A3D84] hover:bg-[#1A3D84]/90 text-white text-xs h-9 font-semibold flex items-center gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Aplicar Calibración Quirúrgica
            </Button>

            <Button
              type="button"
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
