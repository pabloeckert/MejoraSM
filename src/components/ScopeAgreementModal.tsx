// src/components/ScopeAgreementModal.tsx
// MODAL DE ACUERDO DE ALCANCE Y PROPUESTA DE ACOMPAÑAMIENTO B2B (SPRINT S+14)
// Basado en David Maister (The Trusted Advisor) y Andy Grove (High Output Management).
// Propuesta formal de consultoría estructurada en 3 fases a 90 días, entregables 4D y compromisos mutuos.

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
  FileCheck2,
  Download,
  Copy,
  Check,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Handshake,
  DollarSign,
  Briefcase,
} from "lucide-react";
import {
  generarAcuerdoAlcance,
  normalizarArquetipoAcuerdo,
  type AcuerdoAlcance,
} from "@/domain/scopeAgreementEngine";
import { type ArquetipoDolor } from "@/domain/executiveDiagnosticEngine";
import { descargarScopeAgreementPDF } from "@/services/scopeAgreementPdfGenerator";
import { cn } from "@/lib/utils";

export interface ScopeAgreementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    nombreDirectivo?: string;
    empresa?: string;
    cargo?: string;
    canal?: string;
    arquetipoDolor?: ArquetipoDolor | string;
    mesesDuracion?: number;
    modalidad?: "Hibrida (Trinchera + Remoto)" | "Presencial Intensiva" | "Acompañamiento Remoto";
    honorariosMensuales?: string;
  };
}

export function ScopeAgreementModal({
  open,
  onOpenChange,
  initialData,
}: ScopeAgreementModalProps) {
  const [nombre, setNombre] = useState(initialData?.nombreDirectivo || "Martín Benítez");
  const [empresa, setEmpresa] = useState(initialData?.empresa || "Distribuidora San Martín");
  const [cargo, setCargo] = useState(initialData?.cargo || "Dueño / CEO");
  const [canal, setCanal] = useState(initialData?.canal || "Instagram");
  const [arquetipo, setArquetipo] = useState<ArquetipoDolor>(
    normalizarArquetipoAcuerdo(initialData?.arquetipoDolor)
  );
  const [meses, setMeses] = useState(initialData?.mesesDuracion || 3);
  const [modalidad, setModalidad] = useState<
    "Hibrida (Trinchera + Remoto)" | "Presencial Intensiva" | "Acompañamiento Remoto"
  >(initialData?.modalidad || "Hibrida (Trinchera + Remoto)");
  const [honorarios, setHonorarios] = useState(initialData?.honorariosMensuales || "");
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [activeTab, setActiveTab] = useState<"diagnostico" | "fases" | "entregables" | "compromisos">("diagnostico");

  React.useEffect(() => {
    if (initialData?.nombreDirectivo) setNombre(initialData.nombreDirectivo);
    if (initialData?.empresa) setEmpresa(initialData.empresa);
    if (initialData?.cargo) setCargo(initialData.cargo);
    if (initialData?.canal) setCanal(initialData.canal);
    if (initialData?.arquetipoDolor) {
      setArquetipo(normalizarArquetipoAcuerdo(initialData.arquetipoDolor));
    }
    if (initialData?.mesesDuracion) setMeses(initialData.mesesDuracion);
    if (initialData?.modalidad) setModalidad(initialData.modalidad);
    if (initialData?.honorariosMensuales) setHonorarios(initialData.honorariosMensuales);
  }, [initialData]);

  const acuerdo: AcuerdoAlcance = useMemo(() => {
    return generarAcuerdoAlcance({
      nombreDirectivo: nombre,
      empresa,
      cargo,
      canal,
      arquetipoDolor: arquetipo,
      mesesDuracion: meses,
      modalidad,
      honorariosMensuales: honorarios,
    });
  }, [nombre, empresa, cargo, canal, arquetipo, meses, modalidad, honorarios]);

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(acuerdo.resumenWhatsApp);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadPDF = () => {
    descargarScopeAgreementPDF(acuerdo);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Barra Tricolor Institucional Superior */}
        <div className="h-1.5 w-full flex">
          <div className="bg-[#1A3D84] flex-[3]" />
          <div className="bg-[#E1061E] flex-1" />
          <div className="bg-[#F7CC13] flex-1" />
        </div>

        {/* Encabezado del Modal */}
        <DialogHeader className="p-6 pb-4 border-b border-border space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#1A3D84] text-[#1A3D84] dark:text-blue-400 font-bold text-xs uppercase px-2.5 py-0.5">
                PROPUESTA B2B · MEJORA CONTINUA
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                {acuerdo.idAcuerdo}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Validez: {acuerdo.validezDias} días ({acuerdo.fechaEmision})
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2 mt-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Acuerdo de Alcance y Propuesta de Acompañamiento B2B
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Propuesta consultiva formal estructurada en 3 fases a 90 días, entregables en las 4 dimensiones y compromisos de gobernanza (David Maister & Andy Grove).
          </DialogDescription>

          {/* Selector de Arquetipo de Dolor y Parámetros */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Foco:</span>
              <button
                type="button"
                onClick={() => setArquetipo("fundador_saturado")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium border transition-colors",
                  arquetipo === "fundador_saturado"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground border-border"
                )}
              >
                Dueño Saturado
              </button>
              <button
                type="button"
                onClick={() => setArquetipo("segunda_generacion")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium border transition-colors",
                  arquetipo === "segunda_generacion"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground border-border"
                )}
              >
                2da Generación
              </button>
              <button
                type="button"
                onClick={() => setArquetipo("estancamiento_comercial")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium border transition-colors",
                  arquetipo === "estancamiento_comercial"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground border-border"
                )}
              >
                Ventas Intuitivas
              </button>
              <button
                type="button"
                onClick={() => setArquetipo("calidad_entregas")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium border transition-colors",
                  arquetipo === "calidad_entregas"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground border-border"
                )}
              >
                Calidad y Retrabajos
              </button>
            </div>

            {/* Selectores de Modalidad y Duración */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Modalidad de trabajo"
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as unknown as typeof modalidad)}
                className="text-xs bg-muted border border-border rounded px-2 py-1 text-foreground"
              >
                <option value="Hibrida (Trinchera + Remoto)">Híbrida (Trinchera + Remoto)</option>
                <option value="Presencial Intensiva">Presencial Intensiva</option>
                <option value="Acompañamiento Remoto">Acompañamiento Remoto</option>
              </select>
              <select
                aria-label="Duración del programa"
                value={meses}
                onChange={(e) => setMeses(Number(e.target.value))}
                className="text-xs bg-muted border border-border rounded px-2 py-1 text-foreground"
              >
                <option value={3}>3 Meses (Intensivo 90D)</option>
                <option value={6}>6 Meses (Transformación)</option>
              </select>
            </div>
          </div>
        </DialogHeader>

        {/* Resumen Superior del Prospecto */}
        <div className="bg-muted/30 px-6 py-2.5 border-b border-border flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-bold text-foreground">{acuerdo.empresa}</span>
            <span className="text-muted-foreground">· {acuerdo.directivo} ({acuerdo.cargo})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Canal de Origen:</span>
            <Badge variant="outline" className="text-[11px] capitalize">{acuerdo.canal}</Badge>
          </div>
        </div>

        {/* Navegación por Pestañas Controladas */}
        <div className="px-6 pt-3 border-b border-border bg-background">
          <div className="grid grid-cols-4 p-1 bg-muted/50 rounded-lg gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("diagnostico")}
              className={cn(
                "py-1.5 px-3 text-xs rounded-md transition-all",
                activeTab === "diagnostico"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              1. Diagnóstico & Objetivo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("fases")}
              className={cn(
                "py-1.5 px-3 text-xs rounded-md transition-all",
                activeTab === "fases"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              2. Fases (90 Días)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("entregables")}
              className={cn(
                "py-1.5 px-3 text-xs rounded-md transition-all",
                activeTab === "entregables"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              3. Entregables 4D
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compromisos")}
              className={cn(
                "py-1.5 px-3 text-xs rounded-md transition-all",
                activeTab === "compromisos"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              4. Compromisos & Inversión
            </button>
          </div>
        </div>

        {/* Contenido Dinámico con Scroll Interno */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: DIAGNÓSTICO & OBJETIVO */}
          {activeTab === "diagnostico" && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                  Diagnóstico Situacional Compartido (En Palabras del Cliente):
                </span>
                <p className="text-sm text-foreground leading-relaxed">
                  {acuerdo.diagnosticoSituacional}
                </p>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#1A3D84] dark:text-blue-300" />
                  <span className="text-[11px] font-bold text-[#1A3D84] dark:text-blue-300 uppercase tracking-wider">
                    Objetivo Central de la Intervención:
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {acuerdo.objetivoGeneral}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-muted/40 rounded-lg border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Modalidad Acordada</span>
                  <span className="text-xs font-bold text-foreground mt-1 block">{acuerdo.esquemaInversion.modalidad}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Duración de Intervención</span>
                  <span className="text-xs font-bold text-foreground mt-1 block">{acuerdo.esquemaInversion.duracionMeses} Meses (Cadencia Quincenal)</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Validez Formal</span>
                  <span className="text-xs font-bold text-[#E1061E] mt-1 block">{acuerdo.validezDias} Días Corridos</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FASES DE INTERVENCIÓN A 90 DÍAS */}
          {activeTab === "fases" && (
            <div className="space-y-3">
              {acuerdo.fasesIntervencion.map((fase) => (
                <div
                  key={fase.fase}
                  className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/40 transition-colors space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#1A3D84] text-white hover:bg-[#1A3D84]/90 text-xs font-bold">
                        {fase.fase}
                      </Badge>
                      <span className="text-xs font-bold text-foreground">{fase.nombre}</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{fase.periodo}</span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Foco:</strong> {fase.objetivoPrincipal}
                  </p>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Entregables Tangibles:</span>
                    <ul className="space-y-1">
                      {fase.entregables.map((ent, idx) => (
                        <li key={idx} className="text-xs text-foreground flex items-start gap-1.5">
                          <span className="text-[#1A3D84] font-bold leading-none mt-0.5">•</span>
                          <span>{ent}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-1.5 border-t border-border/40 flex items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-bold text-[#E1061E] uppercase">Hito de Cierre:</span>
                    <span className="text-foreground font-medium">{fase.hitoValidacion}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: ENTREGABLES POR DIMENSIÓN 4D */}
          {activeTab === "entregables" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {acuerdo.entregablesPorDimension.map((dim) => {
                const borderAccent =
                  dim.dimension === "Personal"
                    ? "border-t-[#1A3D84]"
                    : dim.dimension === "Organizacional"
                    ? "border-t-[#E1061E]"
                    : dim.dimension === "Comercial"
                    ? "border-t-[#F7CC13]"
                    : "border-t-blue-500";

                return (
                  <div
                    key={dim.dimension}
                    className={cn(
                      "p-4 bg-muted/20 rounded-lg border border-border border-t-4 flex flex-col justify-between space-y-2",
                      borderAccent
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                          Dimensión {dim.dimension}
                        </span>
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground mt-1">{dim.titulo}</h4>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{dim.detalle}</p>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] font-semibold text-foreground/80 block">
                        Meta: <span className="font-bold text-primary">{dim.impactoEsperado}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: COMPROMISOS MUTUOS & INVERSIÓN */}
          {activeTab === "compromisos" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {acuerdo.compromisosMutuos.map((comp) => (
                  <div key={comp.actor} className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
                    <div className="flex items-center gap-1.5 border-b border-border/60 pb-2">
                      <Handshake className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">{comp.actor}</span>
                    </div>
                    <ul className="space-y-1.5 pt-1">
                      {comp.compromisos.map((c, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Esquema de Inversión y Garantía */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-[#1A3D84] dark:text-blue-300" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Esquema de Inversión y Próximos Pasos:
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-bold text-foreground block">Inversión Mensual Acordada:</span>
                    <span className="text-muted-foreground">{acuerdo.esquemaInversion.inversionMensual}</span>
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">Condiciones de Facturación:</span>
                    <span className="text-muted-foreground">{acuerdo.esquemaInversion.condicionesFacturacion}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <span className="font-bold text-[#E1061E]">Garantía de Compromiso: </span>
                  <span className="text-muted-foreground">{acuerdo.esquemaInversion.garantiaCompromiso}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Botones de Acción */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyWhatsApp}
            className="text-xs h-9 font-medium"
          >
            {copiedWhatsApp ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                Resumen Copiado
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copiar Mensaje WhatsApp
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleDownloadPDF}
              className="bg-[#1A3D84] hover:bg-[#1A3D84]/90 text-white font-bold text-xs h-9 px-4 shadow-sm"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Descargar Propuesta PDF A4 (1 Clic)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
