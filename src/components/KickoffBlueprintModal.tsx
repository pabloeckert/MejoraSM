// src/components/KickoffBlueprintModal.tsx
// MODAL DE ONBOARDING Y PLAN DE PRIMEROS 30 DÍAS + GEMBA WALK 4D (SPRINT S+20)
// Basado en Joey Coleman (Never Lose a Customer Again), Taiichi Ohno (Gemba Walk),
// David Maister (The Trusted Advisor) y Andy Grove (High Output Management).

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
  Compass,
  Download,
  Copy,
  Check,
  Clock,
  ShieldAlert,
  CheckSquare,
  Square,
  Flag,
  MessageSquareShare,
  Users,
  Sparkles,
} from "lucide-react";
import {
  generarKickoffBlueprint,
  normalizarArquetipoKickoff,
  type InputKickoffBlueprint,
  type ModalidadKickoff,
  type KickoffBlueprint,
} from "@/domain/kickoffBlueprintEngine";
import { type ArquetipoDolor } from "@/domain/executiveDiagnosticEngine";
import { descargarKickoffBlueprintPDF } from "@/services/kickoffBlueprintPdfGenerator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface KickoffBlueprintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<InputKickoffBlueprint>;
}

const ARQUETIPO_OPCIONES: Array<{ value: ArquetipoDolor; label: string }> = [
  { value: "fundador_saturado", label: "Dueño Saturado" },
  { value: "segunda_generacion", label: "2da Generación" },
  { value: "estancamiento_comercial", label: "Ventas Intuitivas" },
  { value: "calidad_entregas", label: "Calidad y Retrabajos" },
];

const MODALIDAD_OPCIONES: ModalidadKickoff[] = [
  "Hibrida (Trinchera + Remoto)",
  "Presencial en Planta / Oficina",
  "Remoto Ejecutivo",
];

type TabKey = "agenda" | "gemba" | "plan30" | "comunicados";

export function KickoffBlueprintModal({
  open,
  onOpenChange,
  initialData,
}: KickoffBlueprintModalProps) {
  const [nombreDirectivo, setNombreDirectivo] = useState(
    initialData?.nombreDirectivo || "Martín Benítez"
  );
  const [empresa, setEmpresa] = useState(initialData?.empresa || "Metalúrgica Litoral");
  const [cargo, setCargo] = useState(initialData?.cargo || "Dueño / Socio Gerente");
  const [sponsorInterno, setSponsorInterno] = useState(
    initialData?.sponsorInterno || initialData?.nombreDirectivo || "Martín Benítez"
  );
  const [modalidad, setModalidad] = useState<ModalidadKickoff>(
    initialData?.modalidad || "Hibrida (Trinchera + Remoto)"
  );
  const [arquetipo, setArquetipo] = useState<ArquetipoDolor>(
    normalizarArquetipoKickoff(initialData?.arquetipoDolor)
  );
  const [activeTab, setActiveTab] = useState<TabKey>("agenda");
  const [checkedReqIds, setCheckedReqIds] = useState<Record<string, boolean>>({});
  const [copiedEquipo, setCopiedEquipo] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  useEffect(() => {
    if (initialData?.nombreDirectivo) {
      setNombreDirectivo(initialData.nombreDirectivo);
      if (!initialData.sponsorInterno) {
        setSponsorInterno(initialData.nombreDirectivo);
      }
    }
    if (initialData?.empresa) setEmpresa(initialData.empresa);
    if (initialData?.cargo) setCargo(initialData.cargo);
    if (initialData?.sponsorInterno) setSponsorInterno(initialData.sponsorInterno);
    if (initialData?.modalidad) setModalidad(initialData.modalidad);
    if (initialData?.arquetipoDolor) {
      setArquetipo(normalizarArquetipoKickoff(initialData.arquetipoDolor));
    }
  }, [initialData]);

  const blueprint: KickoffBlueprint = useMemo(
    () =>
      generarKickoffBlueprint({
        nombreDirectivo,
        empresa,
        cargo,
        sponsorInterno,
        modalidad,
        arquetipoDolor: arquetipo,
        fechaInicio: initialData?.fechaInicio,
      }),
    [
      nombreDirectivo,
      empresa,
      cargo,
      sponsorInterno,
      modalidad,
      arquetipo,
      initialData?.fechaInicio,
    ]
  );

  function toggleRequisito(id: string) {
    setCheckedReqIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCopiarEquipo() {
    try {
      await navigator.clipboard.writeText(blueprint.comunicadoInternoEquipo);
      setCopiedEquipo(true);
      toast({
        title: "Comunicado al equipo copiado",
        description: "Listo para enviar por el dueño al personal antes del Gemba Walk.",
      });
      setTimeout(() => setCopiedEquipo(false), 2200);
    } catch {
      toast({
        variant: "destructive",
        title: "No se pudo copiar",
        description: "El navegador bloqueó el acceso al portapapeles.",
      });
    }
  }

  async function handleCopiarWhatsApp() {
    try {
      await navigator.clipboard.writeText(blueprint.resumenWhatsAppBienvenida);
      setCopiedWa(true);
      toast({
        title: "Mensaje de bienvenida copiado",
        description: "Listo para enviar por WhatsApp junto al PDF A4.",
      });
      setTimeout(() => setCopiedWa(false), 2200);
    } catch {
      toast({
        variant: "destructive",
        title: "No se pudo copiar",
        description: "El navegador bloqueó el acceso al portapapeles.",
      });
    }
  }

  function handleDescargarPDF() {
    try {
      descargarKickoffBlueprintPDF(blueprint);
      toast({
        title: "Kickoff Blueprint PDF generado",
        description: `Descarga iniciada para ${blueprint.empresa} (${blueprint.idBlueprint}).`,
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
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Barra Tricolor Institucional Superior */}
        <div className="h-1.5 w-full flex shrink-0">
          <div className="bg-[#1A3D84] flex-[3]" />
          <div className="bg-[#E1061E] flex-1" />
          <div className="bg-[#F7CC13] flex-1" />
        </div>

        {/* Encabezado Ejecutivo */}
        <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/10 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-[#1A3D84] text-[#1A3D84] dark:text-blue-400 font-bold text-xs uppercase"
              >
                KICKOFF BLUEPRINT & GEMBA WALK 30D
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                Joey Coleman & Taiichi Ohno
              </Badge>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-mono"
              >
                {blueprint.idBlueprint}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{blueprint.fechaEmision}</span>
          </div>

          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Protocolo de Onboarding y Plan de Primeros 30 Días
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Agenda de arranque (90 min), recorrido Gemba Walk 4D enfocado en procesos y calendario de
            Quick Wins para erradicar fricciones desde el Día 1.
          </DialogDescription>

          {/* Parámetros editables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1">
            <label className="text-[11px] font-medium text-muted-foreground flex flex-col gap-1">
              Directivo
              <input
                type="text"
                aria-label="Directivo"
                value={nombreDirectivo}
                onChange={(e) => setNombreDirectivo(e.target.value)}
                className="h-8 px-2.5 rounded border border-border bg-background text-xs text-foreground font-medium"
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground flex flex-col gap-1">
              Empresa
              <input
                type="text"
                aria-label="Empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="h-8 px-2.5 rounded border border-border bg-background text-xs text-foreground font-medium"
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground flex flex-col gap-1">
              Cargo
              <input
                type="text"
                aria-label="Cargo"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="h-8 px-2.5 rounded border border-border bg-background text-xs text-foreground font-medium"
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground flex flex-col gap-1">
              Sponsor Interno
              <input
                type="text"
                aria-label="Sponsor Interno"
                value={sponsorInterno}
                onChange={(e) => setSponsorInterno(e.target.value)}
                className="h-8 px-2.5 rounded border border-border bg-background text-xs text-foreground font-medium"
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground flex flex-col gap-1">
              Modalidad
              <select
                aria-label="Modalidad"
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as ModalidadKickoff)}
                className="h-8 px-2 rounded border border-border bg-background text-xs text-foreground font-medium"
              >
                {MODALIDAD_OPCIONES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Selector de Arquetipo */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">
              Foco de Arranque:
            </span>
            {ARQUETIPO_OPCIONES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setArquetipo(opt.value)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-semibold border transition-colors",
                  arquetipo === opt.value
                    ? "bg-[#1A3D84] text-white border-[#1A3D84]"
                    : "bg-background hover:bg-muted text-muted-foreground border-border"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Navegación por 4 Pestañas */}
        <div className="px-5 pt-3 border-b border-border bg-background shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 p-1 bg-muted/50 rounded-lg gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("agenda")}
              className={cn(
                "py-1.5 px-2.5 text-xs rounded-md transition-all",
                activeTab === "agenda"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              1. Agenda Kickoff (90m) & Pre-Vuelo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("gemba")}
              className={cn(
                "py-1.5 px-2.5 text-xs rounded-md transition-all",
                activeTab === "gemba"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              2. Gemba Walk 4D (Planta / Oficina)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("plan30")}
              className={cn(
                "py-1.5 px-2.5 text-xs rounded-md transition-all",
                activeTab === "plan30"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              3. Plan 30 Días & Quick Wins
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("comunicados")}
              className={cn(
                "py-1.5 px-2.5 text-xs rounded-md transition-all",
                activeTab === "comunicados"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              )}
            >
              4. Comunicado al Equipo & WhatsApp
            </button>
          </div>
        </div>

        {/* Contenido Scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40 dark:bg-background">
          {activeTab === "agenda" && (
            <div className="space-y-4">
              {/* Afirmación de Joey Coleman */}
              <div className="p-3.5 rounded-lg border-l-4 border-[#1A3D84] bg-blue-50/60 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1A3D84] dark:text-blue-300 uppercase mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Afirmación de Inicio (Erradicación de Duda Post-Firma)
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {blueprint.mensajeAfirmacionColeman}
                </p>
              </div>

              {/* Agenda de 90 Minutos */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#1A3D84]" />
                  Agenda Estructurada de Sesión Kickoff (90 Minutos)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {blueprint.agendaKickoff90Min.map((b) => (
                    <div
                      key={b.minuto}
                      className="p-3 rounded-lg border border-border bg-background space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-mono border-[#E1061E]/40 text-[#E1061E] bg-red-50/60 dark:bg-red-950/30"
                        >
                          {b.minuto}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-foreground">{b.titulo}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{b.objetivo}</p>
                      <p className="text-[11px] font-semibold text-[#1A3D84] dark:text-blue-300 pt-0.5">
                        Entregable en vivo: {b.entregableEnVivo}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist Pre-Vuelo Cero Burocracia */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Checklist Pre-Vuelo Cero Burocracia (Insumos Mínimos Antes del Día 1)
                </h3>
                <div className="space-y-1.5">
                  {blueprint.requisitosCeroBurocracia.map((req) => {
                    const checked = Boolean(checkedReqIds[req.id]);
                    return (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => toggleRequisito(req.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-2.5",
                          checked
                            ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                            : "border-border bg-background hover:bg-muted/40"
                        )}
                      >
                        {checked ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                checked ? "line-through text-muted-foreground" : "text-foreground"
                              )}
                            >
                              {req.item}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                req.obligatorioAntesDeKickoff
                                  ? "border-[#E1061E]/40 text-[#E1061E]"
                                  : "border-slate-300 text-muted-foreground"
                              )}
                            >
                              {req.obligatorioAntesDeKickoff ? "Obligatorio Día 1" : "Deseable"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {req.proposito} · Formato aceptado: {req.formatoAceptado}.
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "gemba" && (
            <div className="space-y-4">
              {/* Regla de Oro del Gemba Walk */}
              <div className="p-3.5 rounded-lg border-l-4 border-[#E1061E] bg-red-50/60 dark:bg-red-950/20 flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-[#E1061E] shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-foreground leading-relaxed">
                  {blueprint.reglaDeOroGemba}
                </p>
              </div>

              {/* 4 Estaciones en las 4 Dimensiones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {blueprint.recorridoGemba4D.map((est) => (
                  <div
                    key={est.dimension}
                    className="p-4 rounded-lg border border-border bg-background space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-[#1A3D84] text-white text-[11px]">
                        Dimensión {est.dimension}
                      </Badge>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Gemba Walk 4D
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{est.estacion}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Qué observamos: </span>
                      {est.focoObservacion}
                    </p>
                    <div className="p-2.5 rounded bg-muted/50 border border-border/60">
                      <p className="text-[11px] italic text-foreground">
                        “{est.preguntaTrinchera}”
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold text-[#1A3D84] dark:text-blue-300">
                      Evidencia sistémica: {est.evidenciaSistemica}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "plan30" && (
            <div className="space-y-3">
              {blueprint.hitosPrimeros30Dias.map((hito, idx) => (
                <div
                  key={hito.ventana}
                  className={cn(
                    "p-4 rounded-lg border space-y-2 shadow-2xs",
                    idx === 1
                      ? "border-[#1A3D84] bg-blue-50/40 dark:bg-blue-950/20"
                      : "border-border bg-background"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant={idx === 1 ? "default" : "outline"}
                      className={cn(
                        "text-xs font-mono",
                        idx === 1 ? "bg-[#1A3D84] text-white" : ""
                      )}
                    >
                      {hito.ventana}
                    </Badge>
                    {idx === 1 && (
                      <Badge className="bg-[#F7CC13] text-slate-900 font-bold text-[10px]">
                        QUICK WIN PRIORITARIO D15
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Flag className="h-4 w-4 text-[#E1061E]" />
                    {hito.tituloHito}
                  </h4>
                  <p className="text-xs text-foreground leading-relaxed">
                    <span className="font-semibold">Acción sobre el sistema: </span>
                    {hito.accionSistema}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded bg-background/80 border border-border/70">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                        Indicador de Éxito Medible
                      </span>
                      <span className="text-xs font-medium text-foreground">
                        {hito.indicadorExito}
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-background/80 border border-border/70">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                        Impacto para la Dirección
                      </span>
                      <span className="text-xs font-medium text-[#1A3D84] dark:text-blue-300">
                        {hito.impactoDirectivo}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "comunicados" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border bg-background space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A3D84] flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Comunicado Interno al Personal
                  </h4>
                  <Button variant="outline" size="sm" onClick={handleCopiarEquipo} className="h-7 text-xs">
                    {copiedEquipo ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                    {copiedEquipo ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Para que el directivo presente al equipo el inicio de Mejora Continua sin generar temor a evaluación individual.
                </p>
                <div className="p-3 rounded bg-muted/40 border border-border text-xs text-foreground whitespace-pre-line leading-relaxed">
                  {blueprint.comunicadoInternoEquipo}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-background space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A3D84] flex items-center gap-1.5">
                    <MessageSquareShare className="h-3.5 w-3.5" />
                    Mensaje de Bienvenida WhatsApp Directivo
                  </h4>
                  <Button variant="outline" size="sm" onClick={handleCopiarWhatsApp} className="h-7 text-xs">
                    {copiedWa ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                    {copiedWa ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Texto listo para enviar junto al PDF A4 inmediatamente después de aprobar la propuesta.
                </p>
                <div className="p-3 rounded bg-muted/40 border border-border text-xs text-foreground whitespace-pre-line font-mono leading-relaxed">
                  {blueprint.resumenWhatsAppBienvenida}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer de Acciones */}
        <div className="p-4 border-t border-border bg-background flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-muted-foreground">
            Cliente: <span className="font-semibold text-foreground">{blueprint.empresa}</span> ·{" "}
            <span>{blueprint.arquetipoLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopiarEquipo}>
              {copiedEquipo ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              Copiar Comunicado Equipo
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopiarWhatsApp}>
              {copiedWa ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              Copiar Bienvenida WhatsApp
            </Button>
            <Button
              size="sm"
              onClick={handleDescargarPDF}
              className="bg-[#1A3D84] hover:bg-[#143069] text-white"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Descargar Kickoff PDF (A4)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
