import { useState, useEffect, useRef, useMemo } from "react";
import {
  Video,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Clock,
  Sparkles,
  Volume2,
  FileText,
  Sliders,
  FlipHorizontal,
  ChevronRight,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  generarGuionReel,
  InputGuionReel,
  GuionReelCompleto,
  WPM_DIRECTIVO_DEFAULT,
} from "@/domain/reelScriptEngine";

interface TeleprompterStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: InputGuionReel;
}

export function TeleprompterStudio({ open, onOpenChange, input }: TeleprompterStudioProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"desglose" | "teleprompter">("desglose");
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [wpm, setWpm] = useState<number>(WPM_DIRECTIVO_DEFAULT);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("large");
  const [isMirrored, setIsMirrored] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generar guion determinista con el motor de dominio
  const guion: GuionReelCompleto = useMemo(() => {
    return generarGuionReel(input);
  }, [input]);

  const targetDuration = Math.max(45, Math.min(65, guion.duracionTotalEstimadaSegundos));

  // Manejo de temporizador y scroll automático
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= targetDuration) {
            setIsPlaying(false);
            return targetDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, targetDuration]);

  // Sincronizar scroll automático con el tiempo transcurrido
  useEffect(() => {
    if (activeTab === "teleprompter" && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollableHeight = container.scrollHeight - container.clientHeight;
      if (scrollableHeight > 0 && targetDuration > 0) {
        const progress = elapsedSeconds / targetDuration;
        container.scrollTo({
          top: scrollableHeight * progress,
          behavior: "smooth",
        });
      }
    }
  }, [elapsedSeconds, activeTab, targetDuration]);

  // Atajos de teclado para rodaje rápido
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === "KeyR") {
        e.preventDefault();
        handleReset();
      } else if (e.code === "Escape") {
        if (activeTab === "teleprompter") {
          e.preventDefault();
          setActiveTab("desglose");
          setIsPlaying(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, activeTab]);

  function handleReset() {
    setIsPlaying(false);
    setElapsedSeconds(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleCopyScript() {
    const text = guion.exportarMarkdown();
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedScript(true);
        toast({
          title: "Guion copiado al portapapeles",
          description: "Texto completo y notas de rodaje listos para pegar.",
        });
        setTimeout(() => setCopiedScript(false), 2000);
      },
      () => {
        toast({
          title: "Error al copiar",
          description: "No se pudo acceder al portapapeles.",
          variant: "destructive",
        });
      }
    );
  }

  function handleDownloadMarkdown() {
    const text = guion.exportarMarkdown();
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guion_reel_${guion.propuesta_id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Guion descargado",
      description: `Archivo guion_reel_${guion.propuesta_id}.md generado con éxito.`,
    });
  }

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = Math.min(100, Math.round((elapsedSeconds / targetDuration) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-4xl p-0 overflow-hidden flex flex-col transition-all duration-300",
          activeTab === "teleprompter"
            ? "max-h-[92vh] h-[92vh] border-slate-800 bg-slate-950 text-white"
            : "max-h-[88vh] bg-white text-slate-900 border-slate-200"
        )}
      >
        {/* ENCABEZADO INSTITUCIONAL */}
        <DialogHeader
          className={cn(
            "p-5 pb-3 border-b shrink-0 flex flex-row items-center justify-between gap-4",
            activeTab === "teleprompter"
              ? "bg-slate-900/90 border-slate-800 text-white"
              : "bg-slate-50 border-slate-200"
          )}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "font-bold uppercase tracking-wider text-[10px] px-2 py-0.5",
                  activeTab === "teleprompter"
                    ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                    : "border-blue-600 text-blue-800 bg-blue-50"
                )}
              >
                <Video className="h-3 w-3 mr-1 inline" />
                Estudio de Rodaje B2B · Reel 60s
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] font-semibold",
                  activeTab === "teleprompter" ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"
                )}
              >
                {guion.propuesta_id}
              </Badge>
            </div>
            <DialogTitle
              className={cn(
                "text-lg font-bold line-clamp-1",
                activeTab === "teleprompter" ? "text-white" : "text-slate-900"
              )}
            >
              {guion.titulo}
            </DialogTitle>
            <DialogDescription
              className={cn("text-xs line-clamp-1", activeTab === "teleprompter" ? "text-slate-400" : "text-slate-500")}
            >
              {guion.resumenDirector}
            </DialogDescription>
          </div>

          {/* SELECTOR DE PESTAÑAS Y ACCIONES RÁPIDAS */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/80 dark:bg-slate-800 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("desglose");
                  setIsPlaying(false);
                }}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                  activeTab === "desglose"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                Desglose Guion
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("teleprompter")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                  activeTab === "teleprompter"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <Play className="h-3.5 w-3.5" />
                Teleprompter en Vivo
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyScript}
              className={cn(
                "h-8 text-xs font-semibold gap-1.5",
                activeTab === "teleprompter" && "border-slate-700 text-slate-300 hover:bg-slate-800"
              )}
            >
              {copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedScript ? "Copiado" : "Copiar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadMarkdown}
              className={cn(
                "h-8 text-xs font-semibold gap-1.5",
                activeTab === "teleprompter" && "border-slate-700 text-slate-300 hover:bg-slate-800"
              )}
            >
              <Download className="h-3.5 w-3.5" />
              .MD
            </Button>
          </div>
        </DialogHeader>

        {/* CONTENIDO PRINCIPAL: DESGLOSE O TELEPROMPTER */}
        {activeTab === "desglose" ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* BARRA DE MÉTRICAS DE RODAJE */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Duración Total</span>
                <p className="text-base font-extrabold text-blue-900 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-700" />
                  ~{targetDuration}s (Objetivo 60s)
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Palabras</span>
                <p className="text-base font-extrabold text-slate-900">{guion.totalPalabras} palabras</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ritmo Directivo</span>
                <p className="text-base font-extrabold text-slate-900">{WPM_DIRECTIVO_DEFAULT} WPM</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Retención Est.</span>
                <p className="text-base font-extrabold text-emerald-600 flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  {guion.retencionEstimadaPorcentaje}%
                </p>
              </div>
            </div>

            {/* LOS 3 BLOQUES DE TIEMPO ESTRUCTURADOS */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span>Estructura de Rodaje de 3 Bloques (Gary Vee / Jonah Berger STEPPS)</span>
              </h3>

              {guion.bloques.map((b, idx) => {
                const borderColors = {
                  gancho: "border-l-rose-500 bg-rose-50/40",
                  metodologia: "border-l-blue-600 bg-blue-50/40",
                  cta: "border-l-emerald-600 bg-emerald-50/40",
                }[b.id];

                const badgeColors = {
                  gancho: "bg-rose-100 text-rose-800 border-rose-200",
                  metodologia: "bg-blue-100 text-blue-800 border-blue-200",
                  cta: "bg-emerald-100 text-emerald-800 border-emerald-200",
                }[b.id];

                return (
                  <div
                    key={b.id}
                    className={cn(
                      "p-4 rounded-lg border border-slate-200 border-l-4 transition-all space-y-2.5",
                      borderColors
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-sm text-slate-900">{b.nombre}</span>
                        <Badge variant="outline" className={cn("text-[11px] font-semibold px-2 py-0.5", badgeColors)}>
                          {b.segundoInicio}s - {b.segundoFin}s ({b.duracionSegundos}s)
                        </Badge>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">{b.palabras} palabras</span>
                    </div>

                    {/* TEXTO A DECIR */}
                    <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">{b.texto}</p>
                    </div>

                    {/* INDICACIONES DE CÁMARA Y NOTAS DE DIRECCIÓN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                      <p className="flex items-start gap-1.5">
                        <Video className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-800">Cámara:</strong> {b.indicacionCamara}
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-800">Dirección:</strong> {b.notasDirector}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BOTÓN DE DISPARO AL TELEPROMPTER */}
            <div className="pt-2 flex justify-end">
              <Button
                size="lg"
                onClick={() => setActiveTab("teleprompter")}
                className="bg-blue-800 hover:bg-blue-900 text-white font-bold gap-2 shadow-md"
              >
                <Play className="h-4 w-4" />
                Abrir Teleprompter de Rodaje ▶
              </Button>
            </div>
          </div>
        ) : (
          /* MODO TELEPROMPTER EN VIVO */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950 relative overflow-hidden">
            {/* BARRA DE HERRAMIENTAS DEL TELEPROMPTER */}
            <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
              {/* REPRODUCCIÓN Y CRONÓMETRO */}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className={cn(
                    "font-bold text-xs gap-1.5 px-3.5 shadow-sm transition-all",
                    isPlaying
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isPlaying ? "Pausar [Espacio]" : "Iniciar Rodaje [Espacio]"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reiniciar [R]
                </Button>

                {/* RELOJ DIGITAL */}
                <div className="flex items-center gap-1.5 font-mono text-base font-extrabold px-3 py-1 bg-slate-950 border border-slate-800 rounded-md">
                  <span
                    className={cn(
                      elapsedSeconds >= targetDuration - 5
                        ? "text-rose-500 animate-pulse"
                        : elapsedSeconds >= targetDuration - 15
                        ? "text-amber-400"
                        : "text-emerald-400"
                    )}
                  >
                    {formatSeconds(elapsedSeconds)}
                  </span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-400">{formatSeconds(targetDuration)}</span>
                </div>
              </div>

              {/* CONTROLES DE VELOCIDAD, FUENTE Y ESPEJO */}
              <div className="flex items-center gap-2">
                {/* SELECTOR DE VELOCIDAD WPM */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs">
                  <Sliders className="h-3 w-3 text-slate-400 ml-1" />
                  <button
                    type="button"
                    onClick={() => setWpm(115)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold transition-all",
                      wpm === 115 ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    115 Lento
                  </button>
                  <button
                    type="button"
                    onClick={() => setWpm(135)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold transition-all",
                      wpm === 135 ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    135 Óptimo
                  </button>
                  <button
                    type="button"
                    onClick={() => setWpm(155)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold transition-all",
                      wpm === 155 ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    155 Rápido
                  </button>
                </div>

                {/* SELECTOR DE TAMAÑO DE FUENTE */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setFontSize("normal")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-bold transition-all",
                      fontSize === "normal" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize("large")}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold transition-all",
                      fontSize === "large" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize("xlarge")}
                    className={cn(
                      "px-2 py-0.5 rounded text-sm font-bold transition-all",
                      fontSize === "xlarge" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    A++
                  </button>
                </div>

                {/* BOTÓN MODO ESPEJO */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsMirrored((prev) => !prev)}
                  title="Modo Espejo para Teleprompters físicos de cristal con cámara detrás"
                  className={cn(
                    "h-8 border-slate-700 text-xs gap-1.5",
                    isMirrored ? "bg-blue-600 text-white border-blue-500" : "text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  Espejo
                </Button>
              </div>
            </div>

            {/* BARRA DE PROGRESO TEMPORAL SUPERIOR */}
            <div className="w-full bg-slate-900 h-1.5 shrink-0">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  progressPercent >= 90
                    ? "bg-rose-500"
                    : progressPercent >= 75
                    ? "bg-amber-400"
                    : "bg-gradient-to-r from-blue-600 to-indigo-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* LÍNEA GUÍA VISUAL CENTRAL (PUNTO FOCAL DE MIRADA A LENTE) */}
            <div className="absolute top-1/2 left-0 right-0 h-16 -translate-y-1/2 bg-blue-500/10 border-y border-blue-500/30 pointer-events-none z-10 flex items-center justify-between px-4">
              <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase bg-slate-950/80 px-2 py-0.5 rounded border border-blue-500/30">
                Línea Focal de Mirada a Lente
              </span>
              <Eye className="h-4 w-4 text-blue-400 opacity-60" />
            </div>

            {/* PANTALLA DE TELEPROMPTER CON SCROLL CONTINUO */}
            <div
              ref={scrollContainerRef}
              className={cn(
                "flex-1 overflow-y-auto px-8 md:px-16 py-32 space-y-12 transition-transform duration-200 select-none",
                isMirrored && "scale-x-[-1]"
              )}
            >
              {guion.bloques.map((b, idx) => (
                <div key={b.id} className="max-w-2xl mx-auto space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                      {idx + 1}. {b.nombre} [{b.segundoInicio}s - {b.segundoFin}s]
                    </span>
                    <span className="text-[11px] text-slate-400">({b.indicacionCamara})</span>
                  </div>

                  <p
                    className={cn(
                      "font-sans font-bold tracking-tight text-white leading-relaxed drop-shadow-xs",
                      fontSize === "normal" && "text-xl md:text-2xl",
                      fontSize === "large" && "text-2xl md:text-3xl",
                      fontSize === "xlarge" && "text-3xl md:text-4xl"
                    )}
                  >
                    {b.texto.split("[PAUSA]").map((segment, sIdx, arr) => (
                      <span key={sIdx}>
                        {segment}
                        {sIdx < arr.length - 1 && (
                          <span className="inline-block mx-2 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs uppercase tracking-widest border border-amber-500/40 align-middle">
                            PAUSA (1s)
                          </span>
                        )}
                      </span>
                    ))}
                  </p>
                </div>
              ))}

              {/* ESPACIO FINAL PARA PERMITIR SCROLL TOTAL */}
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm font-mono">
                — Fin del Guion de Rodaje B2B —
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
