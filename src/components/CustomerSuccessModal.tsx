// src/components/CustomerSuccessModal.tsx
// MODAL DE CASOS DE ÉXITO Y PRUEBA SOCIAL B2B (SPRINT S+16)
// Basado en Donald Miller (Building a StoryBrand) y Robert Cialdini (Influence: Social Proof).
// Permite al operador consultar, personalizar y compartir en 1 clic casos de estudio de pares directivos.

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
  Award,
  Download,
  Copy,
  Check,
  Building2,
  TrendingUp,
  Layers,
  Sparkles,
  Quote,
  ShieldCheck,
  Share2,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  generarCasoExito,
  obtenerCasosExitoBiblioteca,
  normalizarArquetipoCaso,
  formatearCasoWhatsApp,
  formatearCasoParaCarrusel,
  type ArquetipoCaso,
  type CustomerCase,
} from "@/domain/customerSuccessEngine";
import { descargarCasoExitoPDF } from "@/services/customerSuccessPdfGenerator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface CustomerSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    arquetipo?: string;
    empresa?: string;
    rubro?: string;
    rolProtagonista?: string;
    anonimizado?: boolean;
  };
}

export function CustomerSuccessModal({
  open,
  onOpenChange,
  initialData,
}: CustomerSuccessModalProps) {
  const [arquetipo, setArquetipo] = useState<ArquetipoCaso>(() =>
    normalizarArquetipoCaso(initialData?.arquetipo)
  );
  const [anonimizado, setAnonimizado] = useState<boolean>(
    initialData?.anonimizado !== false
  );
  const [activeTab, setActiveTab] = useState<
    "historia" | "metricas" | "formatos" | "lecciones"
  >("historia");
  const [copiedWa, setCopiedWa] = useState(false);
  const [copiedCarousel, setCopiedCarousel] = useState(false);

  // Generar caso reactivo según arquetipo y estado de anonimización
  const caso: CustomerCase = useMemo(() => {
    return generarCasoExito({
      arquetipo,
      empresa: initialData?.empresa,
      rubro: initialData?.rubro,
      rolProtagonista: initialData?.rolProtagonista,
      anonimizado,
    });
  }, [arquetipo, anonimizado, initialData]);

  const casosBiblioteca = useMemo(() => obtenerCasosExitoBiblioteca(), []);

  function handleCopiarWhatsApp() {
    const texto = formatearCasoWhatsApp(caso);
    navigator.clipboard.writeText(texto).then(() => {
      setCopiedWa(true);
      toast({
        title: "Caso de Éxito copiado para WhatsApp",
        description: "Mensaje listo para enviar a prospecto directivo con calidez y verdad.",
      });
      setTimeout(() => setCopiedWa(false), 2500);
    });
  }

  function handleCopiarCarrusel() {
    const texto = formatearCasoParaCarrusel(caso);
    navigator.clipboard.writeText(texto).then(() => {
      setCopiedCarousel(true);
      toast({
        title: "Guión de Carrusel copiado",
        description: "5 diapositivas estructuradas en Markdown copiadas al portapapeles.",
      });
      setTimeout(() => setCopiedCarousel(false), 2500);
    });
  }

  function handleDescargarPDF() {
    try {
      descargarCasoExitoPDF(caso);
      toast({
        title: "PDF de Caso de Estudio generado",
        description: `Descarga iniciada: Caso_Exito_${caso.arquetipo}_${caso.id}.pdf`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al generar PDF",
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

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
                  CASO DE ÉXITO & PRUEBA SOCIAL B2B
                </Badge>
                <Badge variant="secondary" className="text-xs font-mono">
                  Donald Miller & Robert Cialdini
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-xs"
                >
                  <Award className="h-3 w-3 mr-1 text-amber-600" />
                  Prueba de Pares (Peer-to-Peer)
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                {caso.titulo}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Evidencia empírica de transformación directiva mediante la Metodología 4D de Mejora Continua.
              </DialogDescription>
            </div>

            {/* Toggle de anonimización y selector de caso */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAnonimizado((v) => !v)}
                className="text-xs h-8 border-border flex items-center gap-1.5"
                title={
                  anonimizado
                    ? "Nombre comercial anonimizado por confidencialidad (David Maister)"
                    : "Mostrando razón social autorizada"
                }
              >
                {anonimizado ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Datos Anonimizados</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-primary">Razón Social Real</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Selector de Arquetipo de Trinchera */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground font-semibold mr-1">
              Arquetipo de Caso:
            </span>
            {casosBiblioteca.map((c) => (
              <button
                key={c.arquetipo}
                type="button"
                onClick={() => setArquetipo(c.arquetipo)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-all font-medium border",
                  arquetipo === c.arquetipo
                    ? "bg-[#1A3D84] text-white border-[#1A3D84] shadow-xs font-bold"
                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/40"
                )}
              >
                {c.arquetipo === "fundador_saturado" && "1. Fundador Saturado"}
                {c.arquetipo === "segunda_generacion" && "2. 2da Generación"}
                {c.arquetipo === "ventas_intuitivas" && "3. Ventas Intuitivas"}
                {c.arquetipo === "calidad_retrabajos" && "4. Calidad y Retrabajos"}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Ficha Rápida de la Empresa */}
        <div className="px-5 py-2.5 bg-muted/20 border-b border-border text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-foreground flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              {caso.empresa}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{caso.rubro}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{caso.tamano}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Protagonista: <strong className="text-foreground">{caso.rolProtagonista}</strong></span>
          </div>
        </div>

        {/* Pestañas de Navegación Operativa */}
        <div className="flex border-b border-border px-5 bg-background">
          <button
            type="button"
            onClick={() => setActiveTab("historia")}
            className={cn(
              "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === "historia"
                ? "border-[#1A3D84] text-[#1A3D84] dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            1. Historia StoryBrand
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("metricas")}
            className={cn(
              "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === "metricas"
                ? "border-[#1A3D84] text-[#1A3D84] dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            2. Métricas & Resultados
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
            3. Formatos Listos (WhatsApp / Carrusel)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lecciones")}
            className={cn(
              "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === "lecciones"
                ? "border-[#1A3D84] text-[#1A3D84] dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            4. Criterio & Lecciones
          </button>
        </div>

        {/* Cuerpo del Modal con Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* PESTAÑA 1: HISTORIA STORYBRAND */}
          {activeTab === "historia" && (
            <div className="space-y-4">
              {/* Bloque 1: El Problema del Héroe */}
              <div className="p-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900 space-y-2">
                <span className="text-xs font-bold text-[#E1061E] dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  El Problema del Héroe (Situación Inicial en la Trinchera):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="bg-background/80 p-3 rounded border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Dolor Externo (Operativo)</span>
                    <p className="text-xs text-foreground leading-relaxed">{caso.problemaStoryBrand.externo}</p>
                  </div>
                  <div className="bg-background/80 p-3 rounded border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Dolor Interno (Carga Mental)</span>
                    <p className="text-xs text-foreground leading-relaxed">{caso.problemaStoryBrand.interno}</p>
                  </div>
                  <div className="bg-background/80 p-3 rounded border border-border space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Injusticia Filosófica</span>
                    <p className="text-xs text-foreground leading-relaxed italic">{caso.problemaStoryBrand.filosofico}</p>
                  </div>
                </div>
              </div>

              {/* Bloque 2: El Guía y la Metodología 4D */}
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 space-y-3">
                <span className="text-xs font-bold text-[#1A3D84] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  La Intervención del Guía (Mejora Continua & Plan 4D):
                </span>
                <p className="text-xs text-foreground leading-relaxed">{caso.guiaYPlan.rolGuia}</p>
                <div className="bg-background/80 p-2.5 rounded border border-blue-100 dark:border-blue-950 text-xs">
                  <strong className="text-primary">Diagnóstico Raíz: </strong>
                  <span className="text-muted-foreground">{caso.guiaYPlan.diagnosticoRaiz}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-background rounded border border-border space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase">1. Dimensión Personal</span>
                    <p className="text-xs text-muted-foreground">{caso.guiaYPlan.plan4D.personal}</p>
                  </div>
                  <div className="p-2.5 bg-background rounded border border-border space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase">2. Dimensión Organizacional</span>
                    <p className="text-xs text-muted-foreground">{caso.guiaYPlan.plan4D.organizacional}</p>
                  </div>
                  <div className="p-2.5 bg-background rounded border border-border space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase">3. Dimensión Comercial</span>
                    <p className="text-xs text-muted-foreground">{caso.guiaYPlan.plan4D.comercial}</p>
                  </div>
                  <div className="p-2.5 bg-background rounded border border-border space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase">4. Dimensión Empresarial</span>
                    <p className="text-xs text-muted-foreground">{caso.guiaYPlan.plan4D.empresarial}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: MÉTRICAS & RESULTADOS */}
          {activeTab === "metricas" && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                Impacto Cuantitativo Verificable (Cialdini Social Proof):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {caso.metricasImpacto.map((m, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-3.5 rounded-lg border space-y-2 flex flex-col justify-between",
                      m.destaque
                        ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800"
                        : "bg-muted/30 border-border"
                    )}
                  >
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {m.metrica}
                      </span>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-muted-foreground">Antes: <strong>{m.antes}</strong></span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-primary font-bold">{m.despues}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-fit text-[10px] font-bold uppercase",
                        m.destaque
                          ? "bg-[#1A3D84] text-white border-[#1A3D84]"
                          : "bg-muted text-foreground border-border"
                      )}
                    >
                      {m.cambio}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Transformación Cualitativa y Cita del Héroe */}
              <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-rose-50/30 dark:bg-rose-950/10 rounded border border-rose-200 dark:border-rose-900/50 space-y-1">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Estado Anterior (Saturación)</span>
                    <p className="text-xs text-muted-foreground">{caso.transformacion.estadoAnterior}</p>
                  </div>
                  <div className="p-3 bg-emerald-50/30 dark:bg-emerald-950/10 rounded border border-emerald-200 dark:border-emerald-900/50 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Estado Actual (Gobierno y Calma)</span>
                    <p className="text-xs text-foreground font-medium">{caso.transformacion.estadoActual}</p>
                  </div>
                </div>

                <div className="p-3 bg-background rounded-md border-l-4 border-l-[#1A3D84] border border-border space-y-1">
                  <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                    <Quote className="h-3.5 w-3.5" />
                    <span>Testimonio del Protagonista:</span>
                  </div>
                  <p className="text-xs text-foreground italic leading-relaxed">
                    "{caso.transformacion.citaHeroe}"
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium text-right">
                    — {caso.rolProtagonista}, {caso.empresa}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: FORMATOS LISTOS */}
          {activeTab === "formatos" && (
            <div className="space-y-4">
              {/* Formato 1: Snippet WhatsApp */}
              <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-lg border border-emerald-200 dark:border-emerald-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    Respuesta Consultiva para WhatsApp / DM:
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
                  {caso.formatos.whatsappSnippet}
                </pre>
              </div>

              {/* Formato 2: Carrusel LinkedIn */}
              <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    Guión Estructurado para Carrusel LinkedIn (5 Slides):
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopiarCarrusel}
                    className="h-7 text-xs border-border"
                  >
                    {copiedCarousel ? <Check className="h-3 w-3 mr-1 text-emerald-600" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedCarousel ? "¡Copiado!" : "Copiar Carrusel"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pt-1">
                  {caso.formatos.carruselLinkedIn.map((s) => (
                    <div
                      key={s.slide}
                      className="p-2.5 bg-background rounded border border-border text-xs space-y-1.5 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-primary uppercase">
                          Slide {s.slide}
                        </span>
                        <h5 className="font-bold text-foreground text-xs leading-snug">
                          {s.titulo}
                        </h5>
                        <p className="text-[11px] text-muted-foreground whitespace-pre-line mt-1">
                          {s.contenido}
                        </p>
                      </div>
                      <span className="text-[9px] text-muted-foreground/75 italic">
                        {s.notaVisual}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 4: LECCIONES & CRITERIO */}
          {activeTab === "lecciones" && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                Lecciones de Trinchera para la Dirección General:
              </span>

              <div className="space-y-2.5">
                {caso.leccionesDirectivas.map((lec, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-muted/30 rounded-lg border border-border flex items-start gap-3"
                  >
                    <div className="h-6 w-6 rounded-full bg-[#1A3D84] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">
                      {lec}
                    </p>
                  </div>
                ))}
              </div>

              {/* Callout de llamado a la acción */}
              <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900 space-y-1">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase">
                  Puente Consultivo hacia la Acción:
                </span>
                <p className="text-xs text-foreground">
                  Cuando un prospecto directivo se reconoce en el dolor del caso de estudio, la pregunta de cierre nunca es vender un programa, sino invitar a mapear sus propios números:
                  <strong className="block pt-1 text-primary">"¿Querés que en 20 minutos revisemos cómo están estructurados estos puntos en tu empresa?"</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="p-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Documento vectorial PDF A4 (595x842 pt) listo para descargar y enviar.</span>
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
              Descargar Caso A4 (PDF)
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
