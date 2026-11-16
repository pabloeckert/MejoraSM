// src/components/ObjectionMatrixModal.tsx
// MODAL DE MATRIZ DE OBJECIONES DIRECTIVAS OCULTAS & ARGUMENTARIO CONSULTIVO B2B (SPRINT S+23)
// Basado en David Maister (The Trusted Advisor: Ecuación de Confianza),
// Chris Voss (Never Split the Difference: Tactical Empathy & Labeling) y Jeb Blount (Objections).

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
  ShieldAlert,
  Download,
  Copy,
  Check,
  HeartHandshake,
  MessageSquareShare,
  HelpCircle,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  listarObjecionesCatalogo,
  resolverObjecionDirectiva,
  type IdObjecion,
  type ObjecionDirectivaInfo,
  type ResultadoResolucionObjecion,
} from "@/domain/objectionMatrixEngine";
import { type ArquetipoDolor } from "@/domain/executiveDiagnosticEngine";
import { descargarObjectionMatrixPDF } from "@/services/objectionMatrixPdfGenerator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ObjectionMatrixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialObjecionId?: IdObjecion;
  initialData?: {
    nombreDirectivo?: string;
    empresaNombre?: string;
    arquetipoDolor?: ArquetipoDolor;
  };
  onApplyTopic?: (promptTopic: string) => void;
}

type TabKey = "reencuadre" | "guion90s" | "whatsapp" | "socratica";

export function ObjectionMatrixModal({
  open,
  onOpenChange,
  initialObjecionId,
  initialData,
  onApplyTopic,
}: ObjectionMatrixModalProps) {
  const catalogo: ObjecionDirectivaInfo[] = useMemo(() => listarObjecionesCatalogo(), []);

  const [selectedId, setSelectedId] = useState<IdObjecion>(
    initialObjecionId || "sin_tiempo_sobrecarga"
  );
  const [nombreDirectivo, setNombreDirectivo] = useState(
    initialData?.nombreDirectivo || "Director / Socio"
  );
  const [empresaNombre, setEmpresaNombre] = useState(
    initialData?.empresaNombre || "Empresa PyME"
  );
  const [activeTab, setActiveTab] = useState<TabKey>("reencuadre");
  const [copiedWa, setCopiedWa] = useState(false);
  const [copiedGuion, setCopiedGuion] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  useEffect(() => {
    if (initialObjecionId) setSelectedId(initialObjecionId);
    if (initialData?.nombreDirectivo) setNombreDirectivo(initialData.nombreDirectivo);
    if (initialData?.empresaNombre) setEmpresaNombre(initialData.empresaNombre);
  }, [initialObjecionId, initialData]);

  // Resolución reactiva de la objeción
  const resolucion: ResultadoResolucionObjecion = useMemo(() => {
    return resolverObjecionDirectiva({
      idObjecion: selectedId,
      nombreDirectivo,
      empresaNombre,
      arquetipoDolor: initialData?.arquetipoDolor,
    });
  }, [selectedId, nombreDirectivo, empresaNombre, initialData?.arquetipoDolor]);

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(resolucion.resumenWhatsAppDirectivo);
    setCopiedWa(true);
    toast({
      title: "Resumen para WhatsApp Copiado",
      description: "Listo para enviar con empatía táctica y reencuadre institucional.",
    });
    setTimeout(() => setCopiedWa(false), 2500);
  };

  const handleCopyGuion = () => {
    const g = resolucion.objecion.guionLlamada90Segundos;
    const txt = `GUIÓN DE LLAMADA 90s — OBJECIÓN: ${resolucion.objecion.titulo.toUpperCase()}\n\n` +
      `1. APERTURA Y VALIDACIÓN:\n${g.aperturaValidacion}\n\n` +
      `2. DESARME TÁCTICO:\n${g.desarmeTactico}\n\n` +
      `3. PUENTE METODOLÓGICO 4D:\n${g.puenteMetodologico}\n\n` +
      `4. CIERRE SOCRÁTICO:\n${g.preguntaSocraticaCierre}`;
    navigator.clipboard.writeText(txt);
    setCopiedGuion(true);
    toast({
      title: "Guión de Llamada (90s) Copiado",
      description: "Estructura paso a paso lista para tu reunión 1 a 1.",
    });
    setTimeout(() => setCopiedGuion(false), 2500);
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
    descargarObjectionMatrixPDF(resolucion);
    toast({
      title: "Documento PDF A4 Descargado",
      description: `Argumentario-Objeciones-${resolucion.idResolucion}.pdf listo para consulta.`,
    });
  };

  const handleInjectTopic = () => {
    if (!onApplyTopic) return;
    const topic = `Debate sobre Objeción Directiva: "${resolucion.objecion.fraseTextualCliente}". ` +
      `El dueño de ${empresaNombre} teme que: ${resolucion.objecion.miedoOcultoDirectivo}. ` +
      `Cómo reencuadrar desde la Metodología 4D y la causa raíz de sistema: ${resolucion.objecion.causaRaizSistema}.`;
    onApplyTopic(topic);
    onOpenChange(false);
    toast({
      title: "Tema Inyectado en Mesa de Diálogo",
      description: "Los agentes debatirán cómo desarmar y reencuadrar esta objeción.",
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
                <HeartHandshake className="h-4 w-4 text-[#1A3D84]" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Matriz de Objeciones Directivas & Argumentario de Confianza</span>
                  <Badge variant="outline" className="text-[10px] font-mono text-[#1A3D84] border-[#1A3D84]/30 bg-blue-50">
                    {resolucion.idResolucion}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Desactivación de resistencias mediante Empatía Táctica (Chris Voss) y Reencuadre Sistémico (David Maister).
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
              onClick={() => setActiveTab("reencuadre")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "reencuadre"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              1. Reencuadre & Causa Raíz
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guion90s")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "guion90s"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              2. Guión de Llamada (90s)
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
              3. WhatsApp & DMs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("socratica")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "socratica"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              4. Pregunta Socrática C-Level
            </button>
          </div>
        </DialogHeader>

        {/* Carrusel de Selección de las 6 Objeciones */}
        <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Seleccionar la Objeción Declarada por el Decisor (6 Arquetipos de Resistencia):
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {catalogo.map((obj) => (
              <button
                key={obj.id}
                type="button"
                onClick={() => setSelectedId(obj.id)}
                className={cn(
                  "p-2 rounded-lg text-left border transition-all text-xs flex flex-col justify-between h-20",
                  selectedId === obj.id
                    ? "border-[#1A3D84] bg-white shadow-xs ring-1 ring-[#1A3D84]"
                    : "border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300"
                )}
              >
                <div className="font-semibold text-slate-900 line-clamp-2 leading-tight">
                  {obj.titulo}
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-400">
                  {obj.dimensionPrincipal}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tarjeta de Objeción y Empatía Táctica */}
        <div className="px-6 pt-4">
          <div className="p-4 rounded-xl border border-red-200/80 bg-red-50/30">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                  Lo que el Decisor Dice:
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] text-red-700 border-red-200 bg-white">
                Foco: Dimensión {resolucion.objecion.dimensionPrincipal.toUpperCase()}
              </Badge>
            </div>

            <p className="text-sm font-semibold text-slate-900 italic mb-2">
              "{resolucion.objecion.fraseTextualCliente}"
            </p>

            <div className="pt-2 border-t border-red-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  Miedo Oculto Real (No Confesado):
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {resolucion.objecion.miedoOcultoDirectivo}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">
                  Etiquetado Empático (Chris Voss - Tactical Empathy):
                </span>
                <p className="text-emerald-900 font-medium italic leading-relaxed">
                  "{resolucion.objecion.etiquetadoEmpaticoVoss}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Dinámico por Pestaña */}
        <div className="p-6">
          {activeTab === "reencuadre" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#1A3D84]" />
                  Reencuadre de Autoridad B2B (The Trusted Advisor)
                </h4>
                <p className="text-xs text-slate-800 leading-relaxed font-medium mb-3">
                  {resolucion.objecion.reencuadreSistemicoMaister}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-red-700 uppercase block mb-1">
                      Causa Raíz de Proceso (Por Qué Falló Antes):
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {resolucion.objecion.causaRaizSistema}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
                    <span className="text-[10px] font-bold text-[#1A3D84] uppercase block mb-1">
                      Solución Paramétrica (Metodología 4D):
                    </span>
                    <p className="text-slate-800 leading-relaxed">
                      {resolucion.objecion.solucionParametrica4D}
                    </p>
                  </div>
                </div>
              </div>

              {/* Estructura Verbal en 3 Pasos */}
              <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/30">
                <span className="text-[10px] font-bold text-[#1A3D84] uppercase tracking-wider block mb-1.5">
                  Estructura Verbal Institucional (Verdad + Causa Raíz + Dirección)
                </span>
                <p className="text-xs text-slate-800 leading-relaxed mb-2">
                  <strong>1. Verdad:</strong> {resolucion.estructuraTresPasos.paso1VerdadSinJuzgar}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed mb-2">
                  <strong>2. Sistema:</strong> {resolucion.estructuraTresPasos.paso2CausaRaizSistema}
                </p>
                <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                  <strong>3. Dirección:</strong> {resolucion.estructuraTresPasos.paso3DireccionConcreta}
                </p>
              </div>
            </div>
          )}

          {activeTab === "guion90s" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Guión de Conversación 1 a 1 en 4 Pasos (90 Segundos):
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyGuion}
                  className="text-xs h-7 gap-1 border-slate-300 text-slate-700"
                >
                  {copiedGuion ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copiedGuion ? "Copiado" : "Copiar Guión"}
                </Button>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-start gap-3">
                  <div className="h-6 w-6 rounded bg-blue-100 text-[#1A3D84] font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Paso 1 — Apertura & Validación (Relajar)</div>
                    <div className="text-slate-700 mt-1 leading-relaxed italic">
                      "{resolucion.objecion.guionLlamada90Segundos.aperturaValidacion}"
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-red-200 bg-red-50/20 text-xs flex items-start gap-3">
                  <div className="h-6 w-6 rounded bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-bold text-red-900">Paso 2 — Desarme Táctico (Etiquetar el Miedo)</div>
                    <div className="text-slate-700 mt-1 leading-relaxed italic">
                      "{resolucion.objecion.guionLlamada90Segundos.desarmeTactico}"
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-start gap-3">
                  <div className="h-6 w-6 rounded bg-blue-100 text-[#1A3D84] font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Paso 3 — Puente Metodológico 4D (Reencuadrar hacia el Sistema)</div>
                    <div className="text-slate-700 mt-1 leading-relaxed italic">
                      "{resolucion.objecion.guionLlamada90Segundos.puenteMetodologico}"
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/20 text-xs flex items-start gap-3">
                  <div className="h-6 w-6 rounded bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div>
                    <div className="font-bold text-emerald-900">Paso 4 — Cierre Socrático (Devolver el Control)</div>
                    <div className="text-emerald-950 mt-1 leading-relaxed font-semibold italic">
                      "{resolucion.objecion.guionLlamada90Segundos.preguntaSocraticaCierre}"
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "whatsapp" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquareShare className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Respuesta Consultiva para WhatsApp o DM Directo
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

          {activeTab === "socratica" && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/30 text-center">
                <HelpCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-2">
                  Pregunta Socrática C-Level de Apertura Reflexiva:
                </span>
                <p className="text-base font-extrabold text-slate-900 max-w-xl mx-auto leading-snug">
                  "{resolucion.objecion.preguntaSocraticaCLevel}"
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                  Esta pregunta está diseñada para no confrontar la opinión del dueño, sino confrontarlo con la física real de su operación.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Criterio de Aplicación en Conversaciones B2B:
                </span>
                <p className="text-slate-700 leading-relaxed">
                  1. <strong>Nunca discutir:</strong> Si el dueño dice que no tiene tiempo, asentir con la cabeza y validar que su sobrecarga es real.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  2. <strong>Etiquetar el miedo:</strong> Utilizar el prefijo <em>"Parece que..."</em> para que el decisor se sienta escuchado en profundidad.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  3. <strong>Hacer la pregunta socrática y callar:</strong> Quien habla primero después de la pregunta pierde la posición de escucha activa.
                </p>
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
