// src/components/LinkedInThreadPreview.tsx
// PREVISUALIZADOR DE HILOS Y CONVERSACIÓN DIRECTIVA C-LEVEL PARA LINKEDIN (SPRINT S+8 - 2026)
// Simula el entorno nativo de LinkedIn con arquitectura de conversión Zero-Penalty:
// 1. Post principal limpio (sin enlaces externos para maximizar el alcance del algoritmo).
// 2. Primer comentario estratégico fijado con UTM de campaña.
// 3. Hilo de debate C-Level simulado con decisores y mandos medios.
// 4. Copiado rápido y exportación de la secuencia completa.

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Send,
  Globe,
  Check,
  Copy,
  Download,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageCircle,
  FileText,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  generarHiloLinkedIn,
  LinkedInThreadInput,
  LinkedInComment,
} from "@/domain/linkedinThreadEngine";
import { cn, getAssetUrl } from "@/lib/utils";

export interface LinkedInThreadPreviewProps {
  input: LinkedInThreadInput;
  imagenUrl?: string;
  ratio?: "1200:627" | "1:1" | "4:5";
  onDownloadPdf?: () => void;
  className?: string;
}

export function LinkedInThreadPreview({
  input,
  imagenUrl,
  ratio = "1200:627",
  onDownloadPdf,
  className,
}: LinkedInThreadPreviewProps) {
  const [expandedPost, setExpandedPost] = useState(false);
  const [showThread, setShowThread] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Generación memoizada de la estructura del hilo
  const threadData = useMemo(() => generarHiloLinkedIn(input), [input]);

  const {
    postPrincipal,
    primerComentarioEstrategico,
    hiloDebateSimulado,
    metricasPredictivas,
    textoExportableMarkdown,
  } = threadData;

  const handleCopy = (text: string, type: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast({
      title: "📋 Copiado al portapapeles",
      description: `${label} listo para pegar en LinkedIn.`,
    });
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Barra Superior de Herramientas de Publicación */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/30 font-bold text-xs px-2 py-0.5"
          >
            LinkedIn Thought Leadership
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Zero-Penalty Reach:</span>
            <strong className="text-slate-800">0 Links en Post</strong>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleCopy(
                postPrincipal.textoCompletoCopiable,
                "post",
                "Post Principal"
              )
            }
            className="h-7 px-2.5 text-xs font-semibold gap-1 text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
          >
            {copiedType === "post" ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3 text-slate-500" />
            )}
            Copiar Post
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleCopy(
                primerComentarioEstrategico.textoCompletoCopiable,
                "comment",
                "1er Comentario Estratégico"
              )
            }
            className="h-7 px-2.5 text-xs font-semibold gap-1 text-blue-900 bg-blue-50/70 hover:bg-blue-100/70 border-blue-200"
          >
            {copiedType === "comment" ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <ExternalLink className="h-3 w-3 text-blue-700" />
            )}
            Copiar 1er Comentario
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleCopy(
                textoExportableMarkdown,
                "thread_full",
                "Hilo Completo en Markdown"
              )
            }
            className="h-7 px-2.5 text-xs font-semibold gap-1 text-purple-900 bg-purple-50/60 hover:bg-purple-100/60 border-purple-200"
          >
            {copiedType === "thread_full" ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Sparkles className="h-3 w-3 text-purple-700" />
            )}
            Exportar Hilo
          </Button>

          {onDownloadPdf && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDownloadPdf}
              className="h-7 px-2.5 text-xs font-semibold gap-1 text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200"
            >
              <FileText className="h-3 w-3 text-emerald-700" />
              Carrusel PDF
            </Button>
          )}
        </div>
      </div>

      {/* TARJETA MOCKUP ESTILO LINKEDIN FEED */}
      <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden rounded-xl">
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          {/* Cabecera del Autor en LinkedIn */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full bg-[#1A3D84] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 border border-slate-100">
                MC
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-slate-900 text-sm hover:underline cursor-pointer">
                    Mejora Continua
                  </h4>
                  <span className="text-slate-400 text-xs">• 1er</span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  Sistemas de Autonomía Operativa y Comercial para PyMEs
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <span>1 h</span>
                  <span>•</span>
                  <span>Editado</span>
                  <span>•</span>
                  <Globe className="h-2.5 w-2.5" />
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className="border-slate-200 text-slate-600 text-[10px] font-medium"
            >
              {ratio === "1200:627" ? "1200×627 Feed" : ratio === "1:1" ? "1:1 Cuadrado" : "4:5 Vertical"}
            </Badge>
          </div>

          {/* Cuerpo del Post Principal */}
          <div className="text-slate-900 text-xs sm:text-[13px] leading-relaxed space-y-2">
            <p className="font-bold text-slate-950 text-sm">
              {postPrincipal.hook}
            </p>

            <div className="space-y-2">
              <p className="text-slate-800">{input.copy_tres_pasos.paso1_dolor}</p>
              <p className="text-slate-800">{input.copy_tres_pasos.paso2_reencuadre}</p>

              {expandedPost ? (
                <>
                  <p className="text-slate-800">
                    {input.copy_tres_pasos.paso3_direccion_web.includes("mejoraok")
                      ? "El síntoma se manifiesta en la urgencia cotidiana; la solución real se construye en el diseño del sistema."
                      : input.copy_tres_pasos.paso3_direccion_web}
                  </p>
                  <p className="font-semibold text-slate-900 pt-1">
                    {postPrincipal.engagementPrompt}
                  </p>
                  <p className="text-[#0A66C2] font-medium text-xs pt-1">
                    {postPrincipal.hashtags.join(" ")}
                  </p>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setExpandedPost((v) => !v)}
              className="text-slate-500 hover:text-slate-800 font-semibold text-xs transition-colors"
            >
              {expandedPost ? "ver menos" : "… ver más"}
            </button>
          </div>

          {/* Imagen o Mockup Visual de Bóveda */}
          {imagenUrl && (
            <div
              className={cn(
                "relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white flex items-center justify-center my-2",
                ratio === "1200:627"
                  ? "aspect-[1200/627] max-h-72"
                  : ratio === "1:1"
                  ? "aspect-square max-h-72"
                  : "aspect-[4/5] max-h-80"
              )}
            >
              {/* Barra Tricolor Institucional Superior */}
              <div className="absolute top-0 left-0 right-0 h-1.5 z-30 flex">
                <div className="w-[60%] bg-[#1A3D84]" />
                <div className="w-[20%] bg-[#E1061E]" />
                <div className="w-[20%] bg-[#F7CC13]" />
              </div>

              {/* Fondo desenfocado */}
              <div
                className="absolute inset-[-20px] bg-cover bg-center filter opacity-75 scale-110"
                style={{
                  backgroundImage: `url(${getAssetUrl(imagenUrl)})`,
                  filter: "blur(28px) brightness(0.85)",
                }}
              />

              {/* Imagen contenida con padding */}
              <div className="relative z-10 w-full h-full p-2 flex items-center justify-center">
                <img
                  src={getAssetUrl(imagenUrl)}
                  alt="Activo de Bóveda"
                  className="max-h-full max-w-full object-contain border-2 border-white shadow-md rounded-sm"
                />
              </div>
            </div>
          )}

          {/* Métricas de Reacción y Comentarios en LinkedIn */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] shadow-xs">
                  👍
                </span>
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                  💡
                </span>
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] shadow-xs">
                  👏
                </span>
              </div>
              <span className="font-medium text-slate-700">
                {metricasPredictivas.estimatedReactions}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="hover:underline cursor-pointer">
                {metricasPredictivas.estimatedComments} comentarios
              </span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">12 republicaciones</span>
            </div>
          </div>

          {/* Barra de Acciones de LinkedIn */}
          <div className="grid grid-cols-4 border-t border-slate-100 pt-2 text-slate-600 text-xs font-semibold">
            <button className="flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors">
              <ThumbsUp className="h-4 w-4" />
              <span className="hidden sm:inline">Reaccionar</span>
            </button>
            <button
              onClick={() => setShowThread((v) => !v)}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors text-blue-700 font-bold"
            >
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span>Comentar</span>
            </button>
            <button className="flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors">
              <Repeat2 className="h-4 w-4" />
              <span className="hidden sm:inline">Republicar</span>
            </button>
            <button className="flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN DE HILO DE DEBATE C-LEVEL SIMULADO (THREAD SECTION) */}
      {showThread && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-blue-100 text-blue-900">
                <MessageCircle className="h-4 w-4 text-[#1A3D84]" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  Hilo de Conversación Directiva C-Level
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold"
                  >
                    Dwell Time ~{metricasPredictivas.estimatedDwellTimeSeconds}s
                  </Badge>
                </h5>
                <p className="text-[11px] text-slate-500">
                  Simulación de primer comentario anclado y debate orgánico entre decisores
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-bold"
            >
              SSI Boost +{metricasPredictivas.ssiBoostScore}/10
            </Badge>
          </div>

          {/* Lista de Comentarios Anidados del Hilo */}
          <div className="space-y-3 pl-1 sm:pl-3">
            {hiloDebateSimulado.map((comment, index) => {
              const isFirstAnchor = comment.esPrimerComentarioEstrategico;

              return (
                <div
                  key={comment.id}
                  className={cn(
                    "p-3.5 rounded-xl border text-xs space-y-2 transition-all",
                    isFirstAnchor
                      ? "border-blue-300 bg-blue-50/80 shadow-xs ring-1 ring-blue-200/50"
                      : "border-slate-200/80 bg-white"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-[10px] shrink-0",
                          comment.autorAvatarBg
                        )}
                      >
                        {comment.autorAvatarInitials}
                      </div>
                      <div className="leading-tight">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">
                            {comment.autorNombre}
                          </span>
                          {comment.esAutor && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-[#1A3D84] text-[9px] font-bold px-1 py-0"
                            >
                              Autor
                            </Badge>
                          )}
                          <span className="text-[10px] text-slate-400">
                            • {comment.tiempo}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1">
                          {comment.autorCargo}
                        </p>
                      </div>
                    </div>

                    {isFirstAnchor && (
                      <Badge
                        variant="outline"
                        className="bg-white text-blue-800 border-blue-200 text-[9px] font-bold shrink-0"
                      >
                        📌 Comentario de Conversión
                      </Badge>
                    )}
                  </div>

                  {/* Texto del comentario */}
                  <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-line pl-9">
                    {comment.contenido}
                  </div>

                  {/* Acciones y enlace */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pl-9 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 hover:text-blue-600 cursor-pointer font-medium">
                        <ThumbsUp className="h-3 w-3" /> {comment.likesCount}
                      </span>
                      <span className="hover:text-blue-600 cursor-pointer font-medium">
                        Responder
                      </span>
                    </div>

                    {isFirstAnchor && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleCopy(
                            comment.contenido,
                            "anchor_copy",
                            "1er Comentario Estratégico"
                          )
                        }
                        className="h-6 text-[10px] text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 font-semibold px-2 gap-1"
                      >
                        {copiedType === "anchor_copy" ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-blue-600" />
                        )}
                        Copiar Comentario
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
