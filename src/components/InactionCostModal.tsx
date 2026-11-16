// src/components/InactionCostModal.tsx
// CALCULADORA & SIMULADOR DE COSTO DE INACCION OPERATIVA B2B (SPRINT S+22)
// Basado en Matthew Dixon & Brent Adamson (The Challenger Sale: Tensión Constructiva),
// Peter Drucker (Managing for Results: Costo de Oportunidad Directivo) y Eliyahu Goldratt (The Goal).

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
  Calculator,
  Download,
  Copy,
  Check,
  TrendingUp,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  MessageSquareShare,
  Sliders,
} from "lucide-react";
import {
  calcularCostoInaccion,
  formatearMonedaARS,
  type InputCostoInaccion,
  type ResultadoCostoInaccion,
} from "@/domain/inactionCostEngine";
import { type ArquetipoDolor } from "@/domain/executiveDiagnosticEngine";
import { descargarInactionCostPDF } from "@/services/inactionCostPdfGenerator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface InactionCostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<InputCostoInaccion>;
}

const ARQUETIPO_OPCIONES: Array<{ value: ArquetipoDolor; label: string; desc: string }> = [
  {
    value: "fundador_saturado",
    label: "Dueño Saturado",
    desc: "El socio apaga urgencias operativas diarias y no tiene tiempo para liderar la escala.",
  },
  {
    value: "segunda_generacion",
    label: "2da Generación / Transición",
    desc: "Coexistencia de mandos familiares sin acuerdos paramétricos ni tableros formales.",
  },
  {
    value: "estancamiento_comercial",
    label: "Ventas Intuitivas",
    desc: "Cotizaciones abandonadas en WhatsApp sin CRM unificado ni regla de contacto 48h.",
  },
  {
    value: "calidad_entregas",
    label: "Calidad y Retrabajos",
    desc: "Retrasos de entrega, horas extras caras y fricción constante entre ventas y planta.",
  },
];

type TabKey = "desglose" | "dimensiones" | "plan90" | "exportar";

export function InactionCostModal({
  open,
  onOpenChange,
  initialData,
}: InactionCostModalProps) {
  // Parámetros de simulación
  const [empresaNombre, setEmpresaNombre] = useState(
    initialData?.empresaNombre || "Empresa PyME"
  );
  const [nombreDirectivo, setNombreDirectivo] = useState(
    initialData?.nombreDirectivo || "Director / Socio"
  );
  const [arquetipo, setArquetipo] = useState<ArquetipoDolor>(
    initialData?.arquetipoDolor || "fundador_saturado"
  );
  const [facturacionMensual, setFacturacionMensual] = useState<number>(
    initialData?.facturacionMensualARS || 35_000_000
  );
  const [tamanoEquipo, setTamanoEquipo] = useState<number>(
    initialData?.tamanoEquipo || 14
  );
  const [horasBomberismo, setHorasBomberismo] = useState<number>(
    initialData?.horasSemanalesBomberismo || 16
  );
  const [pctRetrabajo, setPctRetrabajo] = useState<number>(
    initialData?.porcentajeRetrabajosYFriccion || 8
  );
  const [cotizacionesFuga, setCotizacionesFuga] = useState<number>(
    initialData?.cotizacionesMensualesSinSeguimiento || 6
  );

  const [activeTab, setActiveTab] = useState<TabKey>("desglose");
  const [copiedWa, setCopiedWa] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  useEffect(() => {
    if (initialData?.empresaNombre) setEmpresaNombre(initialData.empresaNombre);
    if (initialData?.nombreDirectivo) setNombreDirectivo(initialData.nombreDirectivo);
    if (initialData?.arquetipoDolor) setArquetipo(initialData.arquetipoDolor);
    if (initialData?.facturacionMensualARS) setFacturacionMensual(initialData.facturacionMensualARS);
    if (initialData?.tamanoEquipo) setTamanoEquipo(initialData.tamanoEquipo);
  }, [initialData]);

  // Cálculo en tiempo real
  const resultado: ResultadoCostoInaccion = useMemo(() => {
    return calcularCostoInaccion({
      empresaNombre,
      nombreDirectivo,
      arquetipoDolor: arquetipo,
      facturacionMensualARS: facturacionMensual,
      tamanoEquipo,
      horasSemanalesBomberismo: horasBomberismo,
      porcentajeRetrabajosYFriccion: pctRetrabajo,
      cotizacionesMensualesSinSeguimiento: cotizacionesFuga,
    });
  }, [
    empresaNombre,
    nombreDirectivo,
    arquetipo,
    facturacionMensual,
    tamanoEquipo,
    horasBomberismo,
    pctRetrabajo,
    cotizacionesFuga,
  ]);

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(resultado.resumenWhatsApp);
    setCopiedWa(true);
    toast({
      title: "Resumen para WhatsApp Copiado",
      description: "Listo para enviar al decisor con tono 'Calidez con Verdad' y enlace trazable.",
    });
    setTimeout(() => setCopiedWa(false), 2500);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(resultado.briefingMarkdown);
    setCopiedMd(true);
    toast({
      title: "Briefing Markdown Copiado",
      description: "Listo para bitácora ejecutiva o reporte interno.",
    });
    setTimeout(() => setCopiedMd(false), 2500);
  };

  const handleDownloadPdf = () => {
    descargarInactionCostPDF(resultado);
    toast({
      title: "Documento PDF A4 Generado",
      description: `Costo-Inaccion-${resultado.idCalculo}.pdf descargado exitosamente.`,
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
                <Calculator className="h-4 w-4 text-[#1A3D84]" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Calculadora de Costo de Inacción Operativa & Retorno 4D</span>
                  <Badge variant="outline" className="text-[10px] font-mono text-[#1A3D84] border-[#1A3D84]/30 bg-blue-50">
                    {resultado.idCalculo}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Cuantificación del drenaje del statu quo y proyección de recuperación a 90 días (Challenger Sale & Peter Drucker).
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
              onClick={() => setActiveTab("desglose")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "desglose"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              1. Desglose Financiero
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dimensiones")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "dimensiones"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              2. Las 4 Dimensiones 4D
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("plan90")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "plan90"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              3. Plan 90 Días & Retorno
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("exportar")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "exportar"
                  ? "bg-[#1A3D84] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              4. WhatsApp & Exportación
            </button>
          </div>
        </DialogHeader>

        {/* Panel de Sliders / Parámetros Rápidos */}
        <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Empresa & Directivo
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={empresaNombre}
                onChange={(e) => setEmpresaNombre(e.target.value)}
                placeholder="Empresa"
                className="w-1/2 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
              />
              <input
                type="text"
                value={nombreDirectivo}
                onChange={(e) => setNombreDirectivo(e.target.value)}
                placeholder="Directivo"
                className="w-1/2 px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Arquetipo de Dolor
            </label>
            <select
              value={arquetipo}
              onChange={(e) => setArquetipo(e.target.value as ArquetipoDolor)}
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium"
            >
              {ARQUETIPO_OPCIONES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Facturación Mensual: <span className="font-mono font-bold text-[#1A3D84]">{formatearMonedaARS(facturacionMensual)}</span>
            </label>
            <input
              type="range"
              min={10_000_000}
              max={150_000_000}
              step={5_000_000}
              value={facturacionMensual}
              onChange={(e) => setFacturacionMensual(Number(e.target.value))}
              className="w-full accent-[#1A3D84] cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Horas Bomberismo: <span className="font-mono font-bold text-red-600">{horasBomberismo}h / sem</span>
            </label>
            <input
              type="range"
              min={4}
              max={35}
              step={1}
              value={horasBomberismo}
              onChange={(e) => setHorasBomberismo(Number(e.target.value))}
              className="w-full accent-[#E1061E] cursor-pointer"
            />
          </div>
        </div>

        {/* 3 Tarjetas de Impacto Superior */}
        <div className="px-6 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tarjeta 1: Drenaje Mensual */}
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
                Drenaje Mensual Inacción
              </span>
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-red-700">
              {formatearMonedaARS(resultado.costoInaccionMensualARS)}
            </div>
            <p className="mt-0.5 text-[11px] text-red-600/90 font-medium">
              Representa el <strong>{resultado.porcentajeSobreFacturacion}%</strong> de la facturación mensual.
            </p>
          </div>

          {/* Tarjeta 2: Costo Anualizado */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1A3D84] uppercase tracking-wider">
                Costo Anualizado Statu Quo
              </span>
              <Clock className="h-3.5 w-3.5 text-[#1A3D84]" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-[#1A3D84]">
              {formatearMonedaARS(resultado.costoInaccionAnualARS)}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-600 font-medium">
              Absorbe <strong>{resultado.equivalenciaSemanasCompletasAnuales} semanas</strong> completas de vida directiva al año.
            </p>
          </div>

          {/* Tarjeta 3: Recuperación a 90 Días */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Ahorro Proyectado 90 Días
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 text-xl font-extrabold text-emerald-700">
              {formatearMonedaARS(resultado.proyeccionRecuperacion.ahorroMensualProyectadoARS)} <span className="text-xs font-semibold text-emerald-800">/ mes</span>
            </div>
            <p className="mt-0.5 text-[11px] text-emerald-700/90 font-medium">
              Libera <strong>{resultado.proyeccionRecuperacion.horasDirectivasLiberadasMes}h directivas</strong>/mes · ROI: <strong>{resultado.proyeccionRecuperacion.roiEstimadoRatio}</strong>.
            </p>
          </div>
        </div>

        {/* Contenido Dinámico por Pestaña */}
        <div className="p-6">
          {activeTab === "desglose" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-[#1A3D84]" />
                  Ajuste Paramétrico Fino del Cuello de Botella
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Fricción y Retrabajos: <span className="font-mono font-bold text-slate-900">{pctRetrabajo}%</span>
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={25}
                      step={1}
                      value={pctRetrabajo}
                      onChange={(e) => setPctRetrabajo(Number(e.target.value))}
                      className="w-full accent-[#1A3D84] cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400">
                      Costo mensual: {formatearMonedaARS(resultado.costoRetrabajosMensualARS)}
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Cotizaciones sin seguimiento: <span className="font-mono font-bold text-slate-900">{cotizacionesFuga} / mes</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={cotizacionesFuga}
                      onChange={(e) => setCotizacionesFuga(Number(e.target.value))}
                      className="w-full accent-[#1A3D84] cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400">
                      Margen perdido: {formatearMonedaARS(resultado.lucroCesanteComercialMensualARS)}
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Tamaño de Equipo: <span className="font-mono font-bold text-slate-900">{tamanoEquipo} personas</span>
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={60}
                      step={1}
                      value={tamanoEquipo}
                      onChange={(e) => setTamanoEquipo(Number(e.target.value))}
                      className="w-full accent-[#1A3D84] cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400">
                      Impacto en coordinación y delegación
                    </span>
                  </div>
                </div>
              </div>

              {/* Composición Porcentual del Drenaje */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Composición del Drenaje Mensual ({formatearMonedaARS(resultado.costoInaccionMensualARS)})
                </h4>

                <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden mb-3">
                  <div
                    style={{
                      width: `${(resultado.drenajeDirectivoMensualARS / resultado.costoInaccionMensualARS) * 100}%`,
                    }}
                    className="bg-[#1A3D84] transition-all"
                    title="Horas Directivas"
                  />
                  <div
                    style={{
                      width: `${(resultado.costoRetrabajosMensualARS / resultado.costoInaccionMensualARS) * 100}%`,
                    }}
                    className="bg-[#E1061E] transition-all"
                    title="Retrabajos de Piso"
                  />
                  <div
                    style={{
                      width: `${(resultado.lucroCesanteComercialMensualARS / resultado.costoInaccionMensualARS) * 100}%`,
                    }}
                    className="bg-[#F7CC13] transition-all"
                    title="Lucro Cesante Comercial"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/50 border border-blue-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1A3D84] shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">Horas Directivas</div>
                      <div className="text-slate-500 font-mono">
                        {formatearMonedaARS(resultado.drenajeDirectivoMensualARS)} (
                        {Math.round((resultado.drenajeDirectivoMensualARS / resultado.costoInaccionMensualARS) * 100)}%)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50/50 border border-red-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E1061E] shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">Retrabajos de Piso</div>
                      <div className="text-slate-500 font-mono">
                        {formatearMonedaARS(resultado.costoRetrabajosMensualARS)} (
                        {Math.round((resultado.costoRetrabajosMensualARS / resultado.costoInaccionMensualARS) * 100)}%)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F7CC13] shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">Fuga en Cotizaciones</div>
                      <div className="text-slate-500 font-mono">
                        {formatearMonedaARS(resultado.lucroCesanteComercialMensualARS)} (
                        {Math.round((resultado.lucroCesanteComercialMensualARS / resultado.costoInaccionMensualARS) * 100)}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estructura Verbal en 3 Pasos */}
              <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/30">
                <span className="text-[10px] font-bold text-[#1A3D84] uppercase tracking-wider block mb-1.5">
                  Estructura Verbal Institucional (Verdad + Causa Raíz + Dirección)
                </span>
                <p className="text-xs text-slate-800 leading-relaxed mb-2">
                  <strong>1. Verdad:</strong> {resultado.estructuraTresPasos.paso1VerdadSinJuzgar}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed mb-2">
                  <strong>2. Sistema:</strong> {resultado.estructuraTresPasos.paso2CausaRaizSistema}
                </p>
                <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                  <strong>3. Dirección:</strong> {resultado.estructuraTresPasos.paso3DireccionConcreta}
                </p>
              </div>
            </div>
          )}

          {activeTab === "dimensiones" && (
            <div className="space-y-3">
              {[
                resultado.desgloseDimensiones.personal,
                resultado.desgloseDimensiones.organizacional,
                resultado.desgloseDimensiones.comercial,
                resultado.desgloseDimensiones.empresarial,
              ].map((dim) => (
                <div
                  key={dim.dimension}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#1A3D84]/40 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#1A3D84]" />
                      <h4 className="text-xs font-bold text-slate-900">{dim.titulo}</h4>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono font-bold text-red-700 border-red-200 bg-red-50">
                      {formatearMonedaARS(dim.costoMensualARS)} / mes
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-700 mb-1 leading-relaxed">
                    <strong className="text-slate-900">Fricción en Trinchera:</strong> {dim.friccionDetectada}
                  </p>
                  <p className="text-xs text-slate-600 mb-1 leading-relaxed">
                    <strong className="text-slate-900">Causa Raíz Sistémica:</strong> {dim.causaRaizSistema}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-emerald-800 font-medium flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Solución 4D: {dim.solucionSistemica4D}
                    </span>
                    <span className="text-slate-400 text-[11px] font-medium">
                      {dim.impactoCuantitativo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "plan90" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Proyección de Recuperación Conservadora a 90 Días
                  </h4>
                  <Badge className="bg-emerald-600 text-white font-mono text-xs">
                    ROI Estimado: {resultado.proyeccionRecuperacion.roiEstimadoRatio}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-3">
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Ahorro Mensual</span>
                    <span className="text-base font-extrabold text-emerald-700">
                      {formatearMonedaARS(resultado.proyeccionRecuperacion.ahorroMensualProyectadoARS)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Recuperación recurrente</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Ahorro Anual Proyectado</span>
                    <span className="text-base font-extrabold text-emerald-700">
                      {formatearMonedaARS(resultado.proyeccionRecuperacion.ahorroAnualProyectadoARS)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Fondo de reinversión</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Horas Liberadas / Mes</span>
                    <span className="text-base font-extrabold text-[#1A3D84]">
                      {resultado.proyeccionRecuperacion.horasDirectivasLiberadasMes} horas
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Tiempo para liderar la escala</span>
                  </div>
                </div>
              </div>

              {/* Las 3 Fases de la Hoja de Ruta */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Hoja de Ruta Metodología 4D (Diagnóstico, Diseño, Despliegue, Dirección)
                </h4>

                <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-start gap-3">
                  <div className="h-6 w-6 rounded bg-blue-100 text-[#1A3D84] font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Días 1 a 30 — Diagnóstico & Gemba Walk en Piso</div>
                    <div className="text-slate-600 mt-0.5 leading-relaxed">
                      Relevamiento del paso limitante, erradicación de urgencias ficticias y 1er Quick Win medible en la semana 2.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-start gap-3">
                  <div className="h-6 w-6 rounded bg-blue-100 text-[#1A3D84] font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Días 31 a 60 — Diseño de Acuerdos Paramétricos & SLA Comercial</div>
                    <div className="text-slate-600 mt-0.5 leading-relaxed">
                      Matriz de delegación directiva sin micromanagement y regla innegociable de contacto comercial en &lt; 48 horas.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-start gap-3">
                  <div className="h-6 w-6 rounded bg-blue-100 text-[#1A3D84] font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Días 61 a 90 — Despliegue de Tableros & Dirección Continua</div>
                    <div className="text-slate-600 mt-0.5 leading-relaxed">
                      Ecosistema de mandos visuales, rutinas de alineación de 30 minutos y gobierno de rentabilidad semanal.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "exportar" && (
            <div className="space-y-4">
              {/* Resumen para WhatsApp */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquareShare className="h-4 w-4 text-emerald-600" />
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

                <pre className="text-[11px] font-sans whitespace-pre-wrap text-slate-700 bg-white p-3 rounded-lg border border-slate-200 max-h-48 overflow-y-auto leading-relaxed">
                  {resultado.resumenWhatsApp}
                </pre>
              </div>

              {/* Botón de Descarga PDF y Copiado Markdown */}
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
