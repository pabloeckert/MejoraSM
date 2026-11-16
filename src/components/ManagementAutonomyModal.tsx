// src/components/ManagementAutonomyModal.tsx
// MODAL DE MATRIZ DE AUTONOMÍA Y DELEGACIÓN PARAMÉTRICA PARA MANDOS MEDIOS (SPRINT S+24)
// Basado en Andy Grove (High Output Management: Task-Relevant Maturity - TRM),
// Peter Drucker (The Effective Executive), Michael Gerber (The E-Myth Revisited) y David Maister.

import React, { useState, useMemo, useEffect } from "react";
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
  Layers,
  Download,
  Copy,
  Check,
  Sparkles,
  GitFork,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  calcularAutonomiaMandosMedios,
  listarRolesMandosMedios,
  type IdRolMandoMedio,
  type NivelTRM,
  type RolMandoMedioInfo,
  type ResultadoAutonomiaMandos,
} from "@/domain/managementAutonomyEngine";
import { descargarManagementAutonomyPDF } from "@/services/managementAutonomyPdfGenerator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ManagementAutonomyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRolId?: IdRolMandoMedio;
  initialData?: {
    nombreDirectivo?: string;
    empresaNombre?: string;
    nombreMandoMedio?: string;
    montoLimiteARS?: number;
    nivelTRM?: NivelTRM;
  };
  onApplyTopic?: (promptTopic: string) => void;
}

type TabKey = "umbrales" | "trm" | "plan60d" | "whatsapp";

export function ManagementAutonomyModal({
  open,
  onOpenChange,
  initialRolId,
  initialData,
  onApplyTopic,
}: ManagementAutonomyModalProps) {
  const rolesCatalogo: RolMandoMedioInfo[] = useMemo(() => listarRolesMandosMedios(), []);

  const [selectedRolId, setSelectedRolId] = useState<IdRolMandoMedio>(
    initialRolId || "jefe_taller_produccion"
  );
  const [nombreDirectivo, setNombreDirectivo] = useState(
    initialData?.nombreDirectivo || "Director / Socio"
  );
  const [empresaNombre, setEmpresaNombre] = useState(
    initialData?.empresaNombre || "Empresa PyME"
  );
  const [nombreMandoMedio, setNombreMandoMedio] = useState(
    initialData?.nombreMandoMedio || "Responsable de Área"
  );
  const [montoLimiteARS, setMontoLimiteARS] = useState<number>(
    initialData?.montoLimiteARS || 250_000
  );
  const [selectedTRM, setSelectedTRM] = useState<NivelTRM>(
    initialData?.nivelTRM || "media"
  );
  const [activeTab, setActiveTab] = useState<TabKey>("umbrales");
  const [copiedWa, setCopiedWa] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  useEffect(() => {
    if (initialRolId) setSelectedRolId(initialRolId);
    if (initialData?.nombreDirectivo) setNombreDirectivo(initialData.nombreDirectivo);
    if (initialData?.empresaNombre) setEmpresaNombre(initialData.empresaNombre);
    if (initialData?.nombreMandoMedio) setNombreMandoMedio(initialData.nombreMandoMedio);
    if (initialData?.montoLimiteARS) setMontoLimiteARS(initialData.montoLimiteARS);
    if (initialData?.nivelTRM) setSelectedTRM(initialData.nivelTRM);
  }, [initialRolId, initialData]);

  // Cálculo reactivo
  const resolucion: ResultadoAutonomiaMandos = useMemo(() => {
    return calcularAutonomiaMandosMedios({
      idRol: selectedRolId,
      nombreDirectivo,
      empresaNombre,
      nombreMandoMedio,
      montoLimiteARS,
      nivelTRM: selectedTRM,
    });
  }, [selectedRolId, nombreDirectivo, empresaNombre, nombreMandoMedio, montoLimiteARS, selectedTRM]);

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(resolucion.resumenWhatsAppDirectivo);
    setCopiedWa(true);
    toast({
      title: "Resumen para WhatsApp Copiado",
      description: "Listo para compartir con el socio y el mando medio.",
    });
    setTimeout(() => setCopiedWa(false), 2500);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(resolucion.briefingMarkdown);
    setCopiedMd(true);
    toast({
      title: "Briefing Markdown Copiado",
      description: "Documento completo copiado al portapapeles.",
    });
    setTimeout(() => setCopiedMd(false), 2500);
  };

  const handleDownloadPdf = () => {
    descargarManagementAutonomyPDF(resolucion);
    toast({
      title: "Documento PDF A4 Descargado",
      description: `${resolucion.idMatriz}.pdf generado y listo para impresión/firma.`,
    });
  };

  const handleInjectTopic = () => {
    if (!onApplyTopic) return;
    const topic = `Debate sobre Delegación y Autonomía de Mandos Medios: "${resolucion.rol.nombreRol}" en ${empresaNombre}. ` +
      `Síntoma visible de micromanagement: ${resolucion.rol.sintomaMicromanagement}. ` +
      `Cómo estructurar los 3 niveles de decisión y elevar la madurez TRM (Andy Grove) para recuperar 4h semanales del socio.`;
    onApplyTopic(topic);
    onOpenChange(false);
    toast({
      title: "Tema Inyectado en Mesa de Diálogo",
      description: "Los agentes debatirán la estrategia de profesionalización de mandos medios.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 bg-white border border-slate-200 shadow-2xl rounded-2xl">
        {/* Barra Tricolor Superior Institucional (#1A3D84 / #E1061E / #F7CC13) */}
        <div className="h-1.5 w-full flex">
          <div className="w-[60%] bg-[#1A3D84]" />
          <div className="w-[20%] bg-[#E1061E]" />
          <div className="w-[20%] bg-[#F7CC13]" />
        </div>

        {/* Encabezado Suizo */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                <GitFork className="h-4 w-4 text-[#1A3D84]" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Matriz de Autonomía & Delegación de Mandos Medios</span>
                  <Badge variant="outline" className="text-[10px] font-mono text-[#1A3D84] border-[#1A3D84]/30 bg-blue-50">
                    {resolucion.idMatriz}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Descentralización operativa basada en Task-Relevant Maturity (Andy Grove) y The E-Myth (Michael Gerber).
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onApplyTopic && (
                <Button
                  size="sm"
                  onClick={handleInjectTopic}
                  className="text-xs h-8 gap-1.5 bg-[#1A3D84] hover:bg-[#142e63] text-white"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Debatir en Mesa Ejecutiva
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                className="text-xs h-8 gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5 text-[#1A3D84]" />
                Descargar PDF A4
              </Button>
            </div>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("umbrales")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "umbrales"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              1. Umbrales de Decisión (RACI 4D)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("trm")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "trm"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              2. Nivel TRM de Andy Grove
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("plan60d")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "plan60d"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              3. Plan Transición 60 Días
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("whatsapp")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "whatsapp"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              4. WhatsApp & Exportación
            </button>
          </div>
        </DialogHeader>

        {/* Carrusel de Selección de Roles */}
        <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Seleccionar Rol de Mando Medio a Formalizar:
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {rolesCatalogo.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedRolId(r.id);
                  setSelectedTRM(r.nivelTRMSugerido);
                }}
                className={cn(
                  "p-2.5 rounded-lg text-left border transition-all text-xs flex flex-col justify-between h-20",
                  selectedRolId === r.id
                    ? "border-[#1A3D84] bg-white shadow-xs ring-1 ring-[#1A3D84]"
                    : "border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300"
                )}
              >
                <div className="font-semibold text-slate-900 line-clamp-2 leading-tight">
                  {r.nombreRol}
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-400">
                  {r.dimensionPrincipal}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tarjeta de Diagnóstico y Síntoma de Trinchera */}
        <div className="px-6 pt-4">
          <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#1A3D84] uppercase tracking-wider">
                Misión Crítica del Puesto:
              </span>
              <Badge variant="outline" className="text-[10px] text-[#1A3D84] border-[#1A3D84]/30 bg-white">
                Dimensión {resolucion.rol.dimensionPrincipal.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-slate-900 mb-2">
              {resolucion.rol.misionCritica}
            </p>

            <div className="pt-2 border-t border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-red-700 uppercase block mb-0.5">
                  Síntoma Visible de Micromanagement:
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {resolucion.rol.sintomaMicromanagement}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  Causa Raíz de Proceso (Por Qué Pasa):
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {resolucion.rol.causaRaizFaltaAcuerdos}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Dinámico por Pestaña */}
        <div className="p-6">
          {activeTab === "umbrales" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#1A3D84]" />
                  <span className="font-semibold text-slate-800">
                    Límite Financiero para Gastos Operativos de Piso:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="100000"
                    max="1500000"
                    step="50000"
                    value={montoLimiteARS}
                    onChange={(e) => setMontoLimiteARS(Number(e.target.value))}
                    className="w-36 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1A3D84]"
                  />
                  <span className="font-mono font-bold text-[#1A3D84] text-xs">
                    ${montoLimiteARS.toLocaleString("es-AR")}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {resolucion.umbrales.map((u) => {
                  const borderCol = u.nivel === 1 ? "border-red-200 bg-red-50/20" : u.nivel === 2 ? "border-amber-200 bg-amber-50/20" : "border-emerald-200 bg-emerald-50/20";
                  const badgeCol = u.nivel === 1 ? "bg-red-100 text-red-800 border-red-200" : u.nivel === 2 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-200";

                  return (
                    <div key={u.nivel} className={cn("p-4 rounded-xl border text-xs space-y-1.5", borderCol)}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{u.etiqueta}</span>
                        <Badge variant="outline" className={cn("text-[10px] font-mono", badgeCol)}>
                          {u.tipoAccion}
                        </Badge>
                      </div>

                      <p className="text-slate-800 leading-relaxed font-medium">
                        <strong>Regla Paramétrica:</strong> {u.reglaParametrica}
                      </p>

                      <p className="text-slate-600 leading-relaxed italic text-[11px]">
                        <strong>Ejemplo Concreto:</strong> {u.ejemploConcreto}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Estructura Verbal en 3 Pasos */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <span className="text-[10px] font-bold text-[#1A3D84] uppercase tracking-wider block mb-1.5">
                  Estructura Verbal Institucional (Verdad + Causa Raíz + Dirección)
                </span>
                <p className="text-xs text-slate-800 leading-relaxed mb-1.5">
                  <strong>1. Verdad:</strong> {resolucion.estructuraTresPasos.paso1VerdadSinJuzgar}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed mb-1.5">
                  <strong>2. Sistema:</strong> {resolucion.estructuraTresPasos.paso2CausaRaizSistema}
                </p>
                <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                  <strong>3. Dirección:</strong> {resolucion.estructuraTresPasos.paso3DireccionConcreta}
                </p>
              </div>
            </div>
          )}

          {activeTab === "trm" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">
                  Seleccionar Nivel de Madurez Operativa en la Tarea (Andy Grove):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["baja", "media", "alta"] as NivelTRM[]).map((nivel) => (
                    <button
                      key={nivel}
                      type="button"
                      onClick={() => setSelectedTRM(nivel)}
                      className={cn(
                        "p-3 rounded-lg border text-left text-xs transition-all",
                        selectedTRM === nivel
                          ? "border-[#1A3D84] bg-blue-50/50 shadow-xs ring-1 ring-[#1A3D84]"
                          : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="font-bold uppercase text-slate-900 mb-1">
                        TRM {nivel.toUpperCase()}
                      </div>
                      <p className="text-slate-500 text-[11px] leading-tight">
                        {nivel === "baja"
                          ? "Instrucción precisa del método (Qué, cómo y cuándo)."
                          : nivel === "media"
                          ? "Comunicación bidireccional y fijación conjunta."
                          : "Delegación plena con supervisión por excepción."}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 text-xs space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#1A3D84] uppercase block mb-1">
                      Enfoque de Liderazgo Recomendado:
                    </span>
                    <p className="text-slate-800 font-semibold">
                      {resolucion.estiloSupervisionGrove.enfoque}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#1A3D84] uppercase block mb-1">
                      Cadencia y Frecuencia de Contacto:
                    </span>
                    <p className="text-slate-800 font-semibold">
                      {resolucion.estiloSupervisionGrove.frecuenciaContacto}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-100">
                  <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Rol del Líder en esta Etapa:
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {resolucion.estiloSupervisionGrove.rolDelLider}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">
                    Riesgo Operativo a Evitar (Andy Grove):
                  </span>
                  <p className="text-amber-900 leading-relaxed text-[11px]">
                    {resolucion.estiloSupervisionGrove.riesgoAEvitar}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "plan60d" && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Hoja de Ruta de Transición hacia la Autonomía (60 Días):
              </span>

              {[
                resolucion.planTransicion60Dias.fase1Dias1a15,
                resolucion.planTransicion60Dias.fase2Dias16a30,
                resolucion.planTransicion60Dias.fase3Dias31a60,
              ].map((fase, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{fase.nombre}</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-[#1A3D84] bg-blue-50 border-blue-200">
                      Fase {idx + 1}
                    </Badge>
                  </div>

                  <p className="text-slate-700 font-medium leading-relaxed">
                    <strong>Objetivo:</strong> {fase.objetivo}
                  </p>

                  <div className="space-y-1 pt-1">
                    {fase.entregables.map((ent, eIdx) => (
                      <div key={eIdx} className="flex items-start gap-2 text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{ent}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "whatsapp" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Resumen Ejecutivo Formateado para WhatsApp Directivo
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleCopyWhatsApp}
                    className="text-xs h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {copiedWa ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedWa ? "Copiado" : "Copiar WhatsApp"}
                  </Button>
                </div>

                <pre className="text-[11px] font-sans whitespace-pre-wrap text-slate-700 bg-white p-3 rounded-lg border border-slate-200 max-h-56 overflow-y-auto leading-relaxed">
                  {resolucion.resumenWhatsAppDirectivo}
                </pre>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyMarkdown}
                  className="text-xs gap-1.5 border-slate-300 text-slate-700"
                >
                  {copiedMd ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedMd ? "Markdown Copiado" : "Copiar Briefing Markdown"}
                </Button>

                <Button
                  size="sm"
                  onClick={handleDownloadPdf}
                  className="text-xs gap-1.5 bg-[#1A3D84] hover:bg-[#142e63] text-white font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar Informe Vectorial PDF A4 (1 Clic)
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Institucional */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Mejora Continua:</span>
            <span>Consultoría de Dirección B2B & Profesionalización PyME</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">
              Brand Voice 100/100 · Calidez con Verdad
            </Badge>
            <span className="font-mono text-[10px]">mejoraok.com/diagnostico</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
