// src/components/ContentTransmutationModal.tsx
// MODAL INTERACTIVO DE TRANSMUTACIÓN Y REPURPOSING MULTICANAL B2B (SPRINT S+10 - 2026)
// Basado en "The Content Pyramid" de Gary Vaynerchuk:
// Transmuta 1 Propuesta Canónica o Sesión de Diálogo en 5 Micro-Contenidos Nativos en 1 Clic:
// 1. Carrusel PDF B2B (1080x1350) - 5 Láminas Swiss con Pie Tricolor
// 2. Guion de Reel 60s - Estructurado a 135 WPM con pausas y CTA
// 3. Hilo C-Level LinkedIn - Zero-Penalty Reach con 1er comentario UTM y debate directivo
// 4. Placa de Citas / Aforismo (1080x1080) - 80% White space y tipografía Bw Modelica
// 5. Mensaje de Difusión WhatsApp B2B - Formato nativo con *negritas* y link directo

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Copy,
  Check,
  Download,
  Repeat,
  Video,
  Share2,
  Quote,
  Send,
  Clock,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import JSZip from "jszip";
import { toast } from "@/hooks/use-toast";
import {
  transmutarContenido,
  TransmutationInput,
  TransmutationResult,
} from "@/domain/contentTransmutationEngine";
import { cn } from "@/lib/utils";

export interface ContentTransmutationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: TransmutationInput;
  onLaunchTeleprompter?: () => void;
}

export function ContentTransmutationModal({
  open,
  onOpenChange,
  input,
  onLaunchTeleprompter,
}: ContentTransmutationModalProps) {
  const [activeTab, setActiveTab] = useState<
    "carrusel" | "reel" | "linkedin" | "placa" | "whatsapp"
  >("carrusel");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Generación determinista memoizada del paquete de transmutación
  const resultado: TransmutationResult = useMemo(() => {
    return transmutarContenido(input);
  }, [input]);

  const {
    metricasConsolidadas,
    asset1_carrusel,
    asset2_guionReel,
    asset3_hiloLinkedIn,
    asset4_placaCita,
    asset5_whatsappB2B,
    paqueteCompletoMarkdown,
  } = resultado;

  const handleCopy = async (texto: string, seccion: string, label: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiedSection(seccion);
      toast({
        title: "Copiado al Portapapeles",
        description: `${label} listo para pegar y publicar.`,
      });
      setTimeout(() => setCopiedSection(null), 2500);
    } catch {
      toast({
        title: "Error al copiar",
        description: "No se pudo acceder al portapapeles.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadSingle = (
    contenido: string,
    filename: string,
    tipo: string = "text/plain;charset=utf-8"
  ) => {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Descarga completada",
      description: `Archivo ${filename} generado con éxito.`,
    });
  };

  const handleDownloadZipPackage = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();
      const folderName = `transmutacion_${resultado.propuesta_id}`;
      const folder = zip.folder(folderName) || zip;

      // 1. Paquete Completo
      folder.file("00_PAQUETE_COMPLETO_TRANSMUTACION.md", paqueteCompletoMarkdown);

      // 2. Carrusel PDF
      folder.file("01_CARRUSEL_PDF_1080x1350.md", asset1_carrusel.textoEstructuraMarkdown);

      // 3. Guion de Reel 60s
      folder.file("02_GUION_REEL_60S_TELEPROMPTER.txt", asset2_guionReel.textoCompletoTeleprompter);

      // 4. Hilo LinkedIn C-Level
      folder.file("03_HILO_LINKEDIN_CLEVEL.md", asset3_hiloLinkedIn.textoExportableMarkdown);

      // 5. Placa de Citas 1080x1080
      const placaTxt = [
        `PLACA DE CITAS / AFORISMO B2B (1080x1080)`,
        `=======================================`,
        `CITA PRINCIPAL:\n"${asset4_placaCita.textoCita}"`,
        ``,
        `AUTOR INSTITUCIONAL:\n${asset4_placaCita.autorInstitucional}`,
        ``,
        `SUBTÍTULO / EJE:\n${asset4_placaCita.subtituloAforismo}`,
        ``,
        `COPY POST DE SOPORTE:\n${asset4_placaCita.copyPostSoporte}`,
        ``,
        `ESPECIFICACIONES DE DISEÑO SWISS:`,
        `- Tipografía: ${asset4_placaCita.specsDiseno.fuente}`,
        `- Fondo: ${asset4_placaCita.specsDiseno.fondo} (Mínimo ${asset4_placaCita.specsDiseno.espacioNegativoMinimo} espacio negativo)`,
        `- Acento: ${asset4_placaCita.specsDiseno.colorAcento}`,
      ].join("\n");
      folder.file("04_PLACA_CITAS_1080x1080.txt", placaTxt);

      // 6. WhatsApp B2B
      folder.file("05_DIFUSION_WHATSAPP_B2B.txt", asset5_whatsappB2B.textoMensaje);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${folderName}_5en1.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Paquete ZIP Descargado",
        description: "5 activos nativos transmutados con éxito.",
      });
    } catch {
      toast({
        title: "Error al generar ZIP",
        description: "Se produjo un error al compilar el archivo ZIP.",
        variant: "destructive",
      });
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900 shadow-2xl border border-slate-200">
        {/* ENCABEZADO INSTITUCIONAL CON MÉTRICAS DEL PIRÁMIDE DE CONTENIDOS */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1A3D84] text-white">
                  <Repeat className="h-4 w-4" />
                </span>
                <DialogTitle className="text-lg font-bold text-[#1A3D84] tracking-tight">
                  Motor de Transmutación y Repurposing Multicanal B2B
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-semibold tracking-wider uppercase"
                >
                  The Content Pyramid
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-600">
                1 Insight Estratégico Canónico transmutado simultáneamente en 5 activos nativos listos para publicar.
              </DialogDescription>
            </div>

            {/* BADGES DE RENDIMIENTO Y BOTÓN DESCARGAR PAQUETE COMPLETO */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span>{metricasConsolidadas.alcanceMultiplicador}x Alcance</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <span>+{metricasConsolidadas.tiempoAhorradoHoras}h Ahorradas</span>
              </div>
              <Button
                size="sm"
                onClick={handleDownloadZipPackage}
                disabled={isZipping}
                className="bg-[#1A3D84] hover:bg-[#132c5e] text-white font-medium text-xs shadow-sm h-8"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {isZipping ? "Generando ZIP..." : "Descargar Paquete ZIP (5 en 1)"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* NAVEGACIÓN Y CONTENIDO */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
          {/* SELECTOR DE PESTAÑAS DE LOS 5 ACTIVOS */}
          <div className="px-5 pt-3 pb-2 border-b border-slate-200 bg-white">
            <div role="tablist" className="grid grid-cols-5 w-full bg-slate-100/90 p-1 rounded-lg gap-1">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "carrusel"}
                onClick={() => setActiveTab("carrusel")}
                className={cn(
                  "py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 justify-center",
                  activeTab === "carrusel"
                    ? "bg-white text-[#1A3D84] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">1. Carrusel PDF</span>
                <span className="sm:hidden">Carrusel</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "reel"}
                onClick={() => setActiveTab("reel")}
                className={cn(
                  "py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 justify-center",
                  activeTab === "reel"
                    ? "bg-white text-rose-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Video className="h-3.5 w-3.5 text-rose-600" />
                <span className="hidden sm:inline">2. Guion Reel 60s</span>
                <span className="sm:hidden">Reel</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "linkedin"}
                onClick={() => setActiveTab("linkedin")}
                className={cn(
                  "py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 justify-center",
                  activeTab === "linkedin"
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Share2 className="h-3.5 w-3.5 text-sky-600" />
                <span className="hidden sm:inline">3. Hilo LinkedIn</span>
                <span className="sm:hidden">LinkedIn</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "placa"}
                onClick={() => setActiveTab("placa")}
                className={cn(
                  "py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 justify-center",
                  activeTab === "placa"
                    ? "bg-white text-amber-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Quote className="h-3.5 w-3.5 text-amber-600" />
                <span className="hidden sm:inline">4. Placa Cita</span>
                <span className="sm:hidden">Cita</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "whatsapp"}
                onClick={() => setActiveTab("whatsapp")}
                className={cn(
                  "py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 justify-center",
                  activeTab === "whatsapp"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Send className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">5. WhatsApp VIP</span>
                <span className="sm:hidden">WhatsApp</span>
              </button>
            </div>
          </div>

          {/* CONTENIDO SCROLLEABLE DE CADA TAB */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* TAB 1: CARRUSEL PDF */}
            {activeTab === "carrusel" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Carrusel PDF B2B de Alta Retención (5 Láminas)
                      </h3>
                      <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px]">
                        1080x1350 • 4:5
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200">
                        Pie Tricolor Swiss
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Diseñado para consumo secuencial en LinkedIn e Instagram con swipes continuos y cierre de conversión.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleCopy(
                          asset1_carrusel.textoEstructuraMarkdown,
                          "carrusel",
                          "Estructura del carrusel"
                        )
                      }
                      className="h-8 text-xs font-medium"
                    >
                      {copiedSection === "carrusel" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Copiar Estructura
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleDownloadSingle(
                          asset1_carrusel.textoEstructuraMarkdown,
                          `carrusel_${resultado.propuesta_id}.md`
                        )
                      }
                      className="h-8 text-xs font-medium bg-[#1A3D84] hover:bg-[#132c5e] text-white"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Descargar Guía Markdown
                    </Button>
                  </div>
                </div>

                {/* GRID DE LAS 5 LÁMINAS */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {asset1_carrusel.laminas.map((lamina) => (
                    <Card
                      key={lamina.numero}
                      className="border border-slate-200 bg-white shadow-sm flex flex-col justify-between overflow-hidden"
                    >
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            Lámina {lamina.numero} / 5
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {lamina.tipo}
                          </span>
                        </div>
                        {lamina.kicker && (
                          <div className="text-[10px] font-bold text-[#E1061E] uppercase tracking-wider">
                            {lamina.kicker}
                          </div>
                        )}
                        <h4 className="text-xs font-bold text-[#1A3D84] line-clamp-3 leading-snug">
                          {lamina.titulo}
                        </h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {lamina.cuerpo}
                        </p>
                      </div>

                      {/* PIE DE PÁGINA TRICOLOR INSTITUCIONAL */}
                      <div className="border-t border-slate-100 bg-slate-50/70 p-2 text-[9px] text-slate-500 space-y-1">
                        <div className="flex items-center justify-between text-[8px] text-slate-400">
                          <span>{lamina.pie}</span>
                          <span>SWIPE →</span>
                        </div>
                        {/* Barra Tricolor */}
                        <div className="flex h-1 w-full rounded-full overflow-hidden">
                          <div className="w-1/2 bg-[#1A3D84]" />
                          <div className="w-1/4 bg-[#E1061E]" />
                          <div className="w-1/4 bg-[#F7CC13]" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: GUION DE REEL 60S */}
            {activeTab === "reel" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Guion de Reel / Short 60s B2B (135 WPM)
                      </h3>
                      <Badge className="bg-rose-100 text-rose-800 border-0 text-[10px]">
                        {asset2_guionReel.duracionTotalEstimadaSegundos}s • 135 WPM
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200">
                        3 Bloques Teleprompter
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Hook de 5s, desarrollo de 40s con pausas estratégicas de 1.5s y CTA directivo a diagnósticos web.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onLaunchTeleprompter && (
                      <Button
                        size="sm"
                        onClick={onLaunchTeleprompter}
                        className="h-8 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                      >
                        <Video className="h-3.5 w-3.5 mr-1.5" />
                        Abrir en Teleprompter Studio
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleCopy(
                          asset2_guionReel.textoCompletoTeleprompter,
                          "reel",
                          "Guion de Reel completo"
                        )
                      }
                      className="h-8 text-xs font-medium"
                    >
                      {copiedSection === "reel" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Copiar Guion
                    </Button>
                  </div>
                </div>

                {/* BLOQUES DEL GUION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {asset2_guionReel.bloques.map((b, idx) => (
                    <Card key={idx} className="border border-slate-200 bg-white shadow-sm p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A3D84]">
                          {b.nombre}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-mono">
                          {b.segundoInicio}s - {b.segundoFin}s • ~{b.palabras} pal
                        </Badge>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-[10px] text-slate-500 italic">
                        <strong>Dirección a Cámara:</strong> {b.indicacionCamara}
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed font-medium">
                        "{b.texto}"
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: HILO LINKEDIN C-LEVEL */}
            {activeTab === "linkedin" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Hilo Ejecutivo LinkedIn (Zero-Penalty Reach)
                      </h3>
                      <Badge className="bg-sky-100 text-sky-800 border-0 text-[10px]">
                        Algoritmo Seguro
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">
                        Sin Links en Post Principal
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Post principal enfocado en debate directivo + 1er comentario estratégico con URL UTM de captura.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleCopy(
                          asset3_hiloLinkedIn.textoExportableMarkdown,
                          "linkedin",
                          "Hilo de LinkedIn"
                        )
                      }
                      className="h-8 text-xs font-medium"
                    >
                      {copiedSection === "linkedin" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Copiar Todo
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleCopy(
                          asset3_hiloLinkedIn.postPrincipal.textoCompletoCopiable,
                          "postPrincipal",
                          "Post Principal de LinkedIn"
                        )
                      }
                      className="h-8 text-xs font-medium bg-[#1A3D84] hover:bg-[#132c5e] text-white"
                    >
                      Copiar Solo Post Principal
                    </Button>
                  </div>
                </div>

                {/* PREVIEW TIPO LINKEDIN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* COLUMNA POST PRINCIPAL (2/3) */}
                  <div className="md:col-span-2 space-y-3">
                    <Card className="border border-slate-200 bg-white shadow-sm p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#1A3D84] text-white flex items-center justify-center font-bold text-sm">
                          MC
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Mejora Continua • Consultoría Estratégica B2B
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Especialistas en Eficiencia Operativa y Gestión • Hace 1h • 🌐
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans border-t border-slate-100 pt-3">
                        {asset3_hiloLinkedIn.postPrincipal.textoCompletoCopiable}
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span>👍 48 recomendaciones</span>
                        <span>12 comentarios • 8 veces compartido</span>
                      </div>
                    </Card>

                    {/* PRIMER COMENTARIO ESTRATÉGICO CON ENLACE DE CONVERSIÓN */}
                    <Card className="border border-sky-200 bg-sky-50/50 shadow-sm p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
                          Primer Comentario Estratégico (Anclado con Link UTM)
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleCopy(
                              asset3_hiloLinkedIn.primerComentarioEstrategico.textoCompletoCopiable,
                              "primerComentario",
                              "Primer comentario estratégico"
                            )
                          }
                          className="h-6 text-[10px] px-2 text-sky-800 hover:bg-sky-100"
                        >
                          Copiar Comentario
                        </Button>
                      </div>
                      <p className="text-xs text-sky-950 font-medium">
                        {asset3_hiloLinkedIn.primerComentarioEstrategico.contenido}
                      </p>
                      <div className="text-[10px] font-mono text-sky-700 truncate bg-white px-2 py-1 rounded border border-sky-100">
                        🔗 {asset3_hiloLinkedIn.primerComentarioEstrategico.urlTrazable}
                      </div>
                    </Card>
                  </div>

                  {/* COLUMNA COMENTARIOS DE DEBATE SIMULADOS (1/3) */}
                  <div className="space-y-3">
                    <Card className="border border-slate-200 bg-white shadow-sm p-3.5 space-y-3">
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
                        <span>Debate C-Level Simulado</span>
                        <Badge variant="outline" className="text-[9px]">3 Interacciones</Badge>
                      </div>
                      <div className="space-y-2.5">
                        {asset3_hiloLinkedIn.hiloDebateSimulado.map((c, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] space-y-1"
                          >
                            <div className="font-semibold text-slate-800 text-[10px]">
                              {c.autorNombre} · <span className="text-slate-500 font-normal">{c.autorCargo}</span>
                            </div>
                            <p className="text-slate-600">{c.contenido}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PLACA DE CITAS 1080x1080 */}
            {activeTab === "placa" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Placa de Cita / Aforismo de Marca (1080x1080)
                      </h3>
                      <Badge className="bg-amber-100 text-amber-900 border-0 text-[10px]">
                        1:1 Cuadrado
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200">
                        80% Espacio Negativo Swiss
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Impacto visual de choque para feed de Instagram o LinkedIn, con tipografía Bw Modelica limpia.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleCopy(
                          `"${asset4_placaCita.textoCita}"\n\n— ${asset4_placaCita.autorInstitucional}\n\n${asset4_placaCita.copyPostSoporte}`,
                          "placa",
                          "Cita y Copy de Soporte"
                        )
                      }
                      className="h-8 text-xs font-medium"
                    >
                      {copiedSection === "placa" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Copiar Cita + Copy
                    </Button>
                  </div>
                </div>

                {/* VISUALIZADOR DE LA PLACA 1:1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* SIMULADOR VISUAL DE LA PLACA */}
                  <div className="flex justify-center">
                    <div className="w-full max-w-[380px] aspect-square bg-white border-2 border-slate-200 rounded-xl shadow-lg p-8 flex flex-col justify-between relative overflow-hidden">
                      {/* Acento Quirúrgico Superior */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1A3D84]" />
                      <div className="absolute top-1.5 left-0 w-16 h-0.5 bg-[#E1061E]" />

                      {/* Header de la Placa */}
                      <div className="space-y-1">
                        <Quote className="h-10 w-10 text-[#1A3D84]/20 -mb-2" />
                        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                          {asset4_placaCita.subtituloAforismo}
                        </span>
                      </div>

                      {/* Cita Central Poderosa */}
                      <div className="my-auto py-4">
                        <p className="text-xl md:text-2xl font-black text-[#1A3D84] tracking-tight leading-snug">
                          "{asset4_placaCita.textoCita}"
                        </p>
                      </div>

                      {/* Footer Institucional */}
                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {asset4_placaCita.autorInstitucional}
                          </div>
                          <div className="text-[9px] text-slate-400 font-medium">
                            mejoraok.com • Gestión de Procesos
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-[#1A3D84]" />
                          <span className="h-2 w-2 rounded-full bg-[#E1061E]" />
                          <span className="h-2 w-2 rounded-full bg-[#F7CC13]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COPY DE SOPORTE PARA EL POST */}
                  <Card className="border border-slate-200 bg-white shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-900">
                        Copy de Acompañamiento para el Feed
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleCopy(
                            asset4_placaCita.copyPostSoporte,
                            "copyPlaca",
                            "Copy de la placa"
                          )
                        }
                        className="h-6 text-[10px] px-2"
                      >
                        Copiar Copy
                      </Button>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                      {asset4_placaCita.copyPostSoporte}
                    </p>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-[10px] text-slate-500 space-y-1">
                      <div className="font-semibold text-slate-700">Specs Gráficas Swiss:</div>
                      <div>• Relación: 1080 x 1080 px (1:1 Cuadrado)</div>
                      <div>• Fondo: #FFFFFF puro con 80% espacio negativo</div>
                      <div>• Titular: Bw Modelica Extra Bold en Azul #1A3D84</div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* TAB 5: DIFUSIÓN WHATSAPP B2B */}
            {activeTab === "whatsapp" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Mensaje de Difusión VIP WhatsApp B2B
                      </h3>
                      <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
                        {asset5_whatsappB2B.longitudCaracteres} caracteres
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200">
                        Formato Nativo (*negrita*)
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Para listas de difusión a dueños de PyMEs o clientes activos. Diseñado para lectura rápida en móvil.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleCopy(
                          asset5_whatsappB2B.textoMensaje,
                          "whatsapp",
                          "Mensaje de WhatsApp"
                        )
                      }
                      className="h-8 text-xs font-medium"
                    >
                      {copiedSection === "whatsapp" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Copiar Texto
                    </Button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        asset5_whatsappB2B.textoMensaje
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-3 shadow-sm"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Abrir en WhatsApp Web
                    </a>
                  </div>
                </div>

                {/* SIMULADOR VISUAL DE BURBUJA DE WHATSAPP */}
                <div className="max-w-xl mx-auto">
                  <div className="bg-[#E5DDD5] p-5 rounded-xl shadow-inner border border-emerald-200/50">
                    <div className="max-w-md ml-auto bg-white rounded-lg rounded-tr-none p-3.5 shadow-md space-y-2 border border-emerald-100 relative">
                      {/* Piquito de la burbuja */}
                      <div className="absolute -top-1 -right-2 w-3 h-3 bg-white transform rotate-45" />

                      <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                        {asset5_whatsappB2B.textoMensaje}
                      </div>

                      <div className="text-[10px] text-slate-400 text-right flex items-center justify-end gap-1 pt-1">
                        <span>10:45</span>
                        <span className="text-sky-500 font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER DEL MODAL */}
        <div className="p-3.5 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#1A3D84]" />
            <span>
              Certificación de Marca: 100% libre de juicios a personas • Tono: Calidez con Verdad
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleCopy(
                  paqueteCompletoMarkdown,
                  "todo",
                  "Paquete completo de transmutación"
                )
              }
              className="text-xs h-8"
            >
              {copiedSection === "todo" ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1.5" />
              )}
              Copiar Todo el Lote (Markdown)
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
