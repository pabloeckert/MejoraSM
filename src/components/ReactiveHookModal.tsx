// src/components/ReactiveHookModal.tsx
// MODAL DE RADAR DE COYUNTURA PYME & HOOKS REACTIVOS B2B (SPRINT S+21)
// Basado en Gary Vaynerchuk (Jab, Jab, Right Hook / Newsjacking), Jonah Berger (Contagious: Triggers)
// y principios de Mejora Continua (Calidez con Verdad, Sistema sobre Persona).

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
  Radio,
  Flame,
  Copy,
  Check,
  Sparkles,
  Send,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import {
  generarPiezaCoyuntura,
  obtenerCatalogoCoyunturas,
  type IdCoyuntura,
  type PiezaReactivaCoyuntura,
} from "@/domain/trenchCoyunturaEngine";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ReactiveHookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTopic?: (promptTopic: string) => void;
}

type TabKey = "copy" | "carrusel" | "reel" | "conversion";

export function ReactiveHookModal({
  open,
  onOpenChange,
  onApplyTopic,
}: ReactiveHookModalProps) {
  const catalogo = useMemo(() => obtenerCatalogoCoyunturas(), []);

  const [idCoyuntura, setIdCoyuntura] = useState<IdCoyuntura>("cierre_mes_liquidez");
  const [contextoPersonalizado, setContextoPersonalizado] = useState("");
  const [indiceHook, setIndiceHook] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>("copy");

  const [copiedPost, setCopiedPost] = useState(false);
  const [copiedReel, setCopiedReel] = useState(false);
  const [copiedDm, setCopiedDm] = useState(false);
  const [copiedPrimerComentario, setCopiedPrimerComentario] = useState(false);

  const pieza: PiezaReactivaCoyuntura = useMemo(() => {
    return generarPiezaCoyuntura({
      idCoyuntura,
      contextoEspecifico: contextoPersonalizado,
      indiceHookPreferido: indiceHook,
    });
  }, [idCoyuntura, contextoPersonalizado, indiceHook]);

  async function handleCopiarPost() {
    try {
      await navigator.clipboard.writeText(pieza.copyPostCompleto);
      setCopiedPost(true);
      toast({
        title: "Post de Coyuntura copiado",
        description: "Listo para publicar en LinkedIn o Instagram (Zero-Penalty Reach).",
      });
      setTimeout(() => setCopiedPost(false), 2200);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al copiar",
        description: "No se pudo acceder al portapapeles del navegador.",
      });
    }
  }

  async function handleCopiarReel() {
    try {
      await navigator.clipboard.writeText(pieza.guionReel60s.textoCompletoTeleprompter);
      setCopiedReel(true);
      toast({
        title: "Guion de Reel copiado",
        description: "Formato cronometrado listo para teleprompter o grabación.",
      });
      setTimeout(() => setCopiedReel(false), 2200);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al copiar",
        description: "No se pudo acceder al portapapeles.",
      });
    }
  }

  async function handleCopiarDm() {
    try {
      await navigator.clipboard.writeText(pieza.preguntaDmApertura);
      setCopiedDm(true);
      toast({
        title: "Pregunta de apertura copiada",
        description: "Lista para iniciar conversaciones directivas sin vender por precio.",
      });
      setTimeout(() => setCopiedDm(false), 2200);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al copiar",
        description: "No se pudo acceder al portapapeles.",
      });
    }
  }

  async function handleCopiarPrimerComentario() {
    try {
      await navigator.clipboard.writeText(pieza.primerComentarioLinkedin);
      setCopiedPrimerComentario(true);
      toast({
        title: "Primer comentario copiado",
        description: "Enlace UTM anclado listo para pegar en el post.",
      });
      setTimeout(() => setCopiedPrimerComentario(false), 2200);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al copiar",
        description: "No se pudo acceder al portapapeles.",
      });
    }
  }

  function handleInyectarMesa() {
    if (onApplyTopic) {
      onApplyTopic(
        `Coyuntura PyME: ${pieza.coyuntura.titulo}. Hook: ${pieza.hookSeleccionado.textoHook}. Foco de solución: ${pieza.coyuntura.solucionSistemica4D}`
      );
      toast({
        title: "Tema inyectado a la Mesa de Diálogo",
        description: "Los agentes debatirán sobre este ángulo de coyuntura operativa.",
      });
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Barra Tricolor Institucional */}
        <div className="h-1.5 w-full flex shrink-0">
          <div className="bg-[#1A3D84] flex-[3]" />
          <div className="bg-[#E1061E] flex-1" />
          <div className="bg-[#F7CC13] flex-1" />
        </div>

        {/* Encabezado Directivo */}
        <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/10 space-y-2 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-[#1A3D84] text-[#1A3D84] dark:text-blue-400 font-bold text-xs uppercase"
              >
                RADAR DE COYUNTURA & NEWSJACKING B2B
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                Gary Vaynerchuk & Jonah Berger
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-mono border-emerald-300">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Voz de Marca 100/100
              </Badge>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{pieza.idPieza}</span>
          </div>

          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Radar de Coyuntura Operativa PyME y Hooks Reactivos
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Convierte tensiones estacionales reales (cierres de mes, aguinaldos, sobredemanda, costos) en
            piezas de autoridad de 3 pasos sin culpar a las personas.
          </DialogDescription>

          {/* Selector de Coyuntura */}
          <div className="pt-1.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Situación de Trinchera Activa:
              </span>
              <span className="text-[11px] text-[#1A3D84] dark:text-blue-300 font-medium">
                Temporada: {pieza.coyuntura.temporada}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {catalogo.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setIdCoyuntura(c.id);
                    setIndiceHook(0);
                  }}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md font-semibold border transition-colors",
                    idCoyuntura === c.id
                      ? "bg-[#1A3D84] text-white border-[#1A3D84]"
                      : "bg-background hover:bg-muted text-muted-foreground border-border"
                  )}
                >
                  {c.titulo.split(":")[0]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIdCoyuntura("personalizada");
                  setIndiceHook(0);
                }}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-semibold border transition-colors",
                  idCoyuntura === "personalizada"
                    ? "bg-[#E1061E] text-white border-[#E1061E]"
                    : "bg-background hover:bg-muted text-muted-foreground border-border"
                )}
              >
                + Otra Situación
              </button>
            </div>

            {idCoyuntura === "personalizada" && (
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Describe la coyuntura (ej: Aumento repentino de combustibles, Paritarias de gremio)..."
                  value={contextoPersonalizado}
                  onChange={(e) => setContextoPersonalizado(e.target.value)}
                  className="w-full h-8 px-3 text-xs rounded border border-border bg-background text-foreground"
                />
              </div>
            )}
          </div>

          {/* Selector de los 3 Hooks */}
          <div className="pt-1 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Ángulo de Apertura (Hook):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {pieza.hooks.map((h, idx) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setIndiceHook(idx)}
                  className={cn(
                    "p-2 text-left rounded-md border transition-all text-xs flex flex-col justify-between gap-1",
                    indiceHook === idx
                      ? "border-[#1A3D84] bg-blue-50/60 dark:bg-blue-950/30 text-foreground font-semibold shadow-2xs"
                      : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A3D84] dark:text-blue-300">
                    {h.etiquetaTipo}
                  </span>
                  <span className="line-clamp-2 leading-snug">{h.textoHook}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Pestañas de Navegación */}
        <div className="px-5 pt-3 border-b border-border bg-background shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 p-1 bg-muted/50 rounded-lg gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("copy")}
              className={cn(
                "py-1.5 px-2.5 text-xs rounded-md transition-all",
                activeTab === "copy"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              1. Copy & Estructura 3 Pasos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("carrusel")}
              className={cn(
                "py-1.5 px-2.5 text-xs rounded-md transition-all",
                activeTab === "carrusel"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              2. Carrusel (5 Slides)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reel")}
              className={cn(
                "py-1.5 px-2.5 text-xs rounded-md transition-all",
                activeTab === "reel"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              3. Guion Reel (60s)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("conversion")}
              className={cn(
                "py-1.5 px-2.5 text-xs rounded-md transition-all",
                activeTab === "conversion"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              4. DMs & Conversión
            </button>
          </div>
        </div>

        {/* Contenido Scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40 dark:bg-background">
          {activeTab === "copy" && (
            <div className="space-y-4">
              {/* Tarjeta de Métricas STEPPS */}
              <div className="p-3 rounded-lg border border-border bg-background flex flex-wrap items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-foreground">Scoring Viral STEPPS:</span>
                  <Badge variant="outline" className="font-mono text-emerald-700 bg-emerald-50 border-emerald-300">
                    {pieza.scoringStepps.scoreGlobal}/10 Global
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span>Triggers: <strong className="text-foreground">{pieza.scoringStepps.triggers}/10</strong></span>
                  <span>Valor Práctico: <strong className="text-foreground">{pieza.scoringStepps.practicalValue}/10</strong></span>
                  <span>Moneda Social: <strong className="text-foreground">{pieza.scoringStepps.socialCurrency}/10</strong></span>
                </div>
              </div>

              {/* Los 3 Pasos Constitucionales */}
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-border bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#1A3D84] tracking-wider block">
                    1. La Verdad de Trinchera (Sin juzgar a la persona)
                  </span>
                  <p className="text-xs text-foreground leading-relaxed">
                    {pieza.estructuraTresPasos.paso1Verdad}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-600 tracking-wider block">
                    2. La Causa Raíz de Sistema (Explicación de fondo)
                  </span>
                  <p className="text-xs text-foreground leading-relaxed">
                    {pieza.estructuraTresPasos.paso2CausaRaiz}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider block">
                    3. La Dirección Concreta (Acción 4D)
                  </span>
                  <p className="text-xs text-foreground leading-relaxed">
                    {pieza.estructuraTresPasos.paso3Direccion4D}
                  </p>
                </div>
              </div>

              {/* Vista Previa del Copy Completo */}
              <div className="p-4 rounded-lg border border-border bg-background space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Post Completo para Redes</span>
                  <Button variant="outline" size="sm" onClick={handleCopiarPost} className="h-7 text-xs">
                    {copiedPost ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                    {copiedPost ? "Copiado" : "Copiar Post"}
                  </Button>
                </div>
                <div className="p-3 rounded bg-muted/30 border border-border text-xs text-foreground whitespace-pre-line leading-relaxed font-sans">
                  {pieza.copyPostCompleto}
                </div>
              </div>
            </div>
          )}

          {activeTab === "carrusel" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Estructura de 5 Diapositivas (1080x1350 • Estándar LinkedIn / Instagram)
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  5 Slides Swiss Design
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pieza.carrusel5Slides.map((s) => (
                  <div
                    key={s.numero}
                    className="p-4 rounded-lg border border-border bg-background flex flex-col justify-between space-y-2 shadow-2xs min-h-[170px]"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
                        <Badge variant="secondary" className="text-[10px]">
                          Slide {s.numero} / 5
                        </Badge>
                        <span className="uppercase text-[9px] tracking-wider text-[#1A3D84] font-mono">
                          {s.tipo}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug">{s.titulo}</h4>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {s.contenido}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground italic">
                      {s.pie}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "reel" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Guion de Video Vertical (Reels / Shorts)</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Tiempo estimado: 50 a 60 segundos (135 WPM con marcas de pausa y entonación).
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopiarReel} className="h-7 text-xs">
                  {copiedReel ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                  {copiedReel ? "Copiado" : "Copiar Guion"}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-[#E1061E]/40 bg-red-50/40 dark:bg-red-950/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#E1061E] tracking-wider block">
                    00:00 a 00:05 — Gancho de Quiebre (Scroll-Stop)
                  </span>
                  <p className="text-xs font-bold text-foreground leading-snug">
                    “{pieza.guionReel60s.gancho0a5s}”
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#1A3D84] tracking-wider block">
                    00:05 a 00:45 — Causa Raíz y Metodología de Piso
                  </span>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">
                    {pieza.guionReel60s.desarrollo5a45s}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider block">
                    00:45 a 01:00 — Dirección Concreta (Llamado a Diagnóstico)
                  </span>
                  <p className="text-xs text-foreground leading-snug">
                    {pieza.guionReel60s.cierre45a60s}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "conversion" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pregunta DM */}
              <div className="p-4 rounded-lg border border-border bg-background space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A3D84] flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Pregunta Consultiva para DMs / Comentarios
                  </h4>
                  <Button variant="outline" size="sm" onClick={handleCopiarDm} className="h-7 text-xs">
                    {copiedDm ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                    {copiedDm ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Para responder comentarios o abrir diálogo privado sin sonar comercial ni vender por precio.
                </p>
                <div className="p-3 rounded bg-muted/40 border border-border text-xs font-medium text-foreground italic">
                  “{pieza.preguntaDmApertura}”
                </div>
              </div>

              {/* Primer Comentario Anclado */}
              <div className="p-4 rounded-lg border border-border bg-background space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A3D84] flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Primer Comentario con Link UTM (LinkedIn)
                  </h4>
                  <Button variant="outline" size="sm" onClick={handleCopiarPrimerComentario} className="h-7 text-xs">
                    {copiedPrimerComentario ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                    {copiedPrimerComentario ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Protege el alcance del post principal evitando enlaces externos en el cuerpo (*Zero-Penalty Reach*).
                </p>
                <div className="p-3 rounded bg-muted/40 border border-border text-xs text-foreground font-mono leading-relaxed">
                  {pieza.primerComentarioLinkedin}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer de Acciones */}
        <div className="p-4 border-t border-border bg-background flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-muted-foreground">
            Coyuntura: <span className="font-semibold text-foreground">{pieza.coyuntura.titulo}</span> ·{" "}
            <span>{pieza.hookSeleccionado.etiquetaTipo}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopiarPost}>
              {copiedPost ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              Copiar Post Completo
            </Button>
            {onApplyTopic && (
              <Button
                size="sm"
                onClick={handleInyectarMesa}
                className="bg-[#1A3D84] hover:bg-[#143069] text-white"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Inyectar a Mesa de Diálogo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
