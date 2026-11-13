// src/pages/TableroSemanal.tsx
// TABLERO SEMANAL DE REVISIÓN Y CONTROL — MEJORASM (2026)
// Modo Local Soberano · Sin dependencias de Supabase · Conexión directa a persistencia y MejoraNucleo

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PropuestaMejoraSMDTO } from "@/domain/types";
import { detectarFatigaAudiencia } from "@/domain/fatigaAudienceDetector";
import {
  getLocalProposals,
  approveLocalProposal,
  publishLocalProposal,
  approveBatchLocalProposals,
  triggerBatchPackageDownload,
  resetLocalProposalsToBlank,
  resetLocalProposalsToPristine,
} from "@/services/localSMService";
import { Grid26Semanas } from "@/components/Grid26Semanas";
import { ProposalDetailDialog } from "@/components/ProposalDetailDialog";
import { cn } from "@/lib/utils";
import { OutboxDrawer } from "@/components/OutboxDrawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

import {
  CheckSquare,
  Download,
  ChevronLeft,
  ChevronRight,
  Zap,
  RefreshCw,
  CheckCircle2,
  Target,
  TrendingUp,
  Trash2,
  Sparkles,
  Upload,
  Layers,
  FileSpreadsheet,
  Table as TableIcon,
} from "lucide-react";
import { ExecutiveMemoModal } from "@/components/ExecutiveMemoModal";
import { PipelineExporterModal } from "@/components/PipelineExporterModal";

const NUCLEO_API_URL = "http://127.0.0.1:4002/api/prospectos";

interface NucleoLeadRecord {
  id: string;
  nombre: string;
  email: string;
  canalOrigen: string;
  estado: string;
  piezaIdAtribucion?: string;
  utmSource?: string;
  buyerPersonaId?: string;
}

export default function TableroSemanal() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<PropuestaMejoraSMDTO[]>(() => getLocalProposals());
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [selectedCanal, setSelectedCanal] = useState<string>("all");
  const [selectedEstado, setSelectedEstado] = useState<string>("all");
  const [activeProposal, setActiveProposal] = useState<PropuestaMejoraSMDTO | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [confirmBatchOpen, setConfirmBatchOpen] = useState<boolean>(false);
  const [outboxDrawerOpen, setOutboxDrawerOpen] = useState<boolean>(false);
  const [memoModalOpen, setMemoModalOpen] = useState<boolean>(false);
  const [exporterOpen, setExporterOpen] = useState<boolean>(false);

  const exportInput = useMemo(() => {
    const piezasGrilla = proposals.slice(0, 24).map((p) => {
      const borrador =
        p.borradores.find((b) => b.opcion === p.borrador_seleccionado) ||
        p.borradores[0];
      const matchSem = /-W(\d{2})-/.exec(p.propuesta_id);
      const semana = matchSem ? Number(matchSem[1]) : 1;
      const persona =
        p.metricas_atribucion?.buyer_persona_predominante ||
        "emprendedor_saturado";
      return {
        id: p.propuesta_id,
        semana,
        canal: p.canal_destino,
        formato: borrador.tipo_formato,
        buyerPersona: persona,
        dimension: "4 Dimensiones MC",
        titular: borrador.titulo_portada || borrador.copy_tres_pasos.paso1_dolor,
        estado: p.estado,
        scoreStepps: Math.round(
          (borrador.stepps_evaluacion?.score_global ?? 8.5) * 10
        ),
        utmUrl: `https://mejoraok.com/diagnostico?utm_source=mejora_sm&utm_medium=organic_social&utm_campaign=${persona}&pieza_id=${p.propuesta_id}&canal=${p.canal_destino}`,
      };
    });
    return {
      semanaMemo: activeWeek,
      proposalsCount: proposals.length,
      piezasGrilla,
    };
  }, [proposals, activeWeek]);

  // Estado en vivo de Atribución y Conversión desde MejoraNucleo (4002)
  const [nucleoLeads, setNucleoLeads] = useState<NucleoLeadRecord[]>([]);
  const [nucleoConnected, setNucleoConnected] = useState<boolean>(false);
  const [syncingNucleo, setSyncingNucleo] = useState<boolean>(false);
  const [liveProofBanner, setLiveProofBanner] = useState<string | null>(null);

  const fetchNucleoAttribution = useCallback(async () => {
    if (typeof fetch === "undefined") return;
    setSyncingNucleo(true);
    try {
      const res = await fetch(NUCLEO_API_URL);
      if (res && res.ok) {
        const data = (await res.json()) as NucleoLeadRecord[];
        if (Array.isArray(data)) {
          setNucleoLeads(data);
          setNucleoConnected(true);
        }
      }
    } catch {
      // Modo offline/test silencioso
    } finally {
      setSyncingNucleo(false);
    }
  }, []);

  useEffect(() => {
    fetchNucleoAttribution();
  }, [fetchNucleoAttribution]);

  // Diagnóstico de Fatiga de Audiencia en ventana de 4 semanas (Donella Meadows: Bucle B1)
  const diagnosticoFatiga = useMemo(() => {
    return detectarFatigaAudiencia(proposals, activeWeek, 4);
  }, [proposals, activeWeek]);



  // Semanas disponibles (1 a 26)
  const totalWeeks = 26;

  // Filtrado de propuestas de la semana activa
  const weekProposals = useMemo(() => {
    const weekPrefix = `-W${String(activeWeek).padStart(2, "0")}-`;
    return proposals.filter((p) => {
      const matchWeek = p.propuesta_id.includes(weekPrefix);
      const matchCanal = selectedCanal === "all" || p.canal_destino === selectedCanal;
      const matchEstado = selectedEstado === "all" || p.estado === selectedEstado;
      return matchWeek && matchCanal && matchEstado;
    });
  }, [proposals, activeWeek, selectedCanal, selectedEstado]);

  // Contadores globales
  const stats = useMemo(() => {
    const total = proposals.length;
    const aprobadas = proposals.filter((p) => p.estado === "aprobado").length;
    const pendientes = proposals.filter((p) => p.estado === "pendiente_revision").length;
    const publicadas = proposals.filter((p) => p.estado === "publicado").length;

    const pendientesSemana = proposals.filter(
      (p) => p.propuesta_id.includes(`-W${String(activeWeek).padStart(2, "0")}-`) && p.estado === "pendiente_revision"
    ).length;

    return { total, aprobadas, pendientes, publicadas, pendientesSemana };
  }, [proposals, activeWeek]);

  // Atajos de Teclado Globales en Tablero Semanal (Steve Krug / Marty Cagan: Cero Fricción)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (dialogOpen || confirmBatchOpen) return;
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "h") {
        e.preventDefault();
        setActiveWeek((w) => Math.max(1, w - 1));
      } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "l") {
        e.preventDefault();
        setActiveWeek((w) => Math.min(totalWeeks, w + 1));
      } else if (e.key === "1" && weekProposals[0]) {
        e.preventDefault();
        handleOpenDetail(weekProposals[0]);
      } else if (e.key === "2" && weekProposals[1]) {
        e.preventDefault();
        handleOpenDetail(weekProposals[1]);
      } else if (e.key === "3" && weekProposals[2]) {
        e.preventDefault();
        handleOpenDetail(weekProposals[2]);
      } else if (e.key.toLowerCase() === "o") {
        e.preventDefault();
        setOutboxDrawerOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === "b" && stats.pendientesSemana > 0) {
        e.preventDefault();
        setConfirmBatchOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen, confirmBatchOpen, weekProposals, totalWeeks, stats.pendientesSemana]);


  // Estadísticas de atribución en vivo desde MejoraNucleo
  const attributionStats = useMemo(() => {
    const leadsByPieza: Record<string, number> = {};
    const leadsByPersona: Record<string, { total: number; avanzados: number }> = {};
    let totalAtribuidos = 0;

    for (const lead of nucleoLeads) {
      if (lead.piezaIdAtribucion) {
        totalAtribuidos++;
        leadsByPieza[lead.piezaIdAtribucion] = (leadsByPieza[lead.piezaIdAtribucion] || 0) + 1;
      }
      const bp = lead.buyerPersonaId || "SATURADO";
      if (!leadsByPersona[bp]) leadsByPersona[bp] = { total: 0, avanzados: 0 };
      leadsByPersona[bp].total++;
      if (
        lead.estado === "CALIFICADO" ||
        lead.estado === "EN_SEGUIMIENTO" ||
        lead.estado === "CERRADO_GANADO"
      ) {
        leadsByPersona[bp].avanzados++;
      }
    }

    return { leadsByPieza, leadsByPersona, totalAtribuidos, totalNucleo: nucleoLeads.length };
  }, [nucleoLeads]);

  // Simular e inyectar un lead real desde una pieza de MejoraSM hacia MejoraNucleo
  const handleSimulateLeadFromProposal = async (propuesta?: PropuestaMejoraSMDTO) => {
    const target = propuesta || weekProposals[0] || proposals[0];
    if (!target) return;

    const bp = String(target.metricas_atribucion?.buyer_persona_predominante || "SATURADO").toUpperCase();
    const payload = {
      nombre: `Lead Social (${target.propuesta_id}) — Dir. Pyme`,
      email: `lead.${target.propuesta_id.toLowerCase().replace(/[^a-z0-9]/g, "")}.${Date.now().toString().slice(-4)}@pyme.com.ar`,
      telefono: "+5493764559911",
      canalOrigen: "mejoraok_landing",
      piezaIdAtribucion: target.propuesta_id,
      utmSource: target.canal_destino,
      utmMedium: "organic_social",
      utmCampaign: "evergreen_26s",
      buyerPersonaId: bp,
    };

    try {
      const res = await fetch(NUCLEO_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res && res.ok) {
        const created = (await res.json()) as NucleoLeadRecord;
        await fetchNucleoAttribution();
        setLiveProofBanner(
          `✓ COMPROBADO EN VIVO: La pieza ${target.propuesta_id} (${target.canal_destino}) inyectó el prospecto "${created.nombre}" en MejoraNucleo SQLite con SLA 48h activo.`
        );
        toast({
          title: "Conversión Real Registrada en MejoraNucleo",
          description: `Pieza atribuida: ${target.propuesta_id} · Buyer Persona: ${bp}`,
        });
      }
    } catch {
      toast({
        title: "Aviso de Conexión Local",
        description: "Asegúrate de que MejoraNucleo esté activo en 127.0.0.1:4002.",
      });
    }
  };

  // Manejador de apertura de modal
  const handleOpenDetail = (p: PropuestaMejoraSMDTO) => {
    setActiveProposal(p);
    setDialogOpen(true);
  };

  // Aprobación de lote completo de la semana activa
  const handleApproveBatch = () => {
    const { updated, count } = approveBatchLocalProposals(activeWeek);
    setProposals(updated);
    setConfirmBatchOpen(false);
    toast({
      title: "Lote Aprobado con Éxito",
      description: `Se aprobaron ${count} propuestas de la Semana ${activeWeek} para su despacho programado.`,
    });
  };

  // Descarga del lote semanal consolidado
  const handleDownloadBatch = () => {
    triggerBatchPackageDownload(weekProposals, `Semana_${activeWeek}`);
    toast({
      title: "Paquete Semanal Descargado",
      description: "Archivo consolidado con textos y assets generado para WhatsApp y redes.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-900">
      {/* HEADER INSTITUCIONAL MEJORA CONTINUA */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-3 w-3 rounded-full bg-[#E1061E]" />
            <span className="text-xs font-bold tracking-widest text-[#1A3D84] uppercase">
              Ecosistema Mejora Continua · 2026
            </span>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-semibold">
              Modo Local Soberano (SQLite Activo)
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Mesa de Revisión y Control — MejoraSM
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Planificador maestro evergreen (26 semanas, 78 piezas, regla 80% Jabs / 20% Right Hooks).
          </p>
        </div>

        {/* ACCIONES GLOBALES DE LOTE */}
        <div className="flex flex-wrap items-center gap-2.5">
                    <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const fresh = resetLocalProposalsToPristine();
              setProposals(fresh);
              toast({
                title: "Plan Evergreen Restaurado",
                description: "Las 78 piezas cargadas en estado inicial (0 aprobadas, 0 publicadas).",
              });
            }}
            className="border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-blue-900 shadow-sm"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            Cargar Plan 26 Semanas (78 Piezas)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const blank = resetLocalProposalsToBlank();
              setProposals(blank);
              toast({
                title: "Tablero en Blanco",
                description: "Se han purgado todas las propuestas locales. Listo para empezar.",
              });
            }}
            className="border-slate-300 bg-white hover:bg-red-50 text-xs font-semibold text-red-600 shadow-sm"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Vaciar Tablero (En Blanco)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadBatch}
            disabled={weekProposals.length === 0}
            className="border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 shadow-sm"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-[#1A3D84]" />
            Descarga Lote Semana {activeWeek}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMemoModalOpen(true)}
            className="border-[#1A3D84]/40 bg-white hover:bg-blue-50/50 text-xs font-semibold text-[#1A3D84] shadow-sm flex items-center gap-1.5"
            title="Memorando Operativo Ejecutivo de Socios (Andy Grove & Peter Drucker)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#1A3D84]" />
            Memo de Socios
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExporterOpen(true)}
            className="border-[#1A3D84]/40 bg-white hover:bg-blue-50/50 text-xs font-semibold text-[#1A3D84] shadow-sm flex items-center gap-1.5"
            title="Exportar grilla, métricas ROI y pipeline a CSV / Google Sheets"
          >
            <TableIcon className="h-3.5 w-3.5 text-[#1A3D84]" />
            Exportar CSV / Sheets
          </Button>

          <Button
            size="sm"
            onClick={() => setConfirmBatchOpen(true)}
            disabled={stats.pendientesSemana === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
          >
            <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
            Aprobar Lote Completo ({stats.pendientesSemana})
          </Button>
        </div>
      </header>

      {/* BARRA DE ATAJOS RÁPIDOS Y ESTADO DE SALUD EDITORIAL */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="font-semibold text-slate-800">Modo Rápido:</span>
          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold text-slate-900">[1/2/3]</span> Abrir pieza
          <span>•</span>
          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold text-slate-900">[← / →]</span> Semanas
          <span>•</span>
          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold text-slate-900">[B]</span> Aprobar lote
          <span>•</span>
          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold text-slate-900">[O]</span> Outbox
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium">Salud Editorial:</span>
          <Badge
            className={cn(
              "text-[11px] font-mono px-2",
              diagnosticoFatiga.salud_editorial_pct >= 85
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : diagnosticoFatiga.salud_editorial_pct >= 65
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-red-100 text-red-800 border-red-300"
            )}
            variant="outline"
          >
            {diagnosticoFatiga.salud_editorial_pct}% {diagnosticoFatiga.estado.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* ALERTA VISUAL DE FATIGA DE AUDIENCIA (DONELLA MEADOWS: BUCLE B1) */}
      {diagnosticoFatiga.alertas.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Target className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Sensor de Fatiga de Audiencia (Donella Meadows: Bucle B1)</span>
            </div>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
              {diagnosticoFatiga.alertas.length} alerta{diagnosticoFatiga.alertas.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-amber-800 leading-relaxed">
            {diagnosticoFatiga.alertas[0].mensaje}
          </p>
          <div className="p-2 rounded bg-white/90 border border-amber-200/90 font-medium text-amber-900 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Sugerencia: {diagnosticoFatiga.alertas[0].recomendacion_reencuadre}</span>
          </div>
        </div>
      )}

      {/* PANEL EN VIVO DE COMPROBACIÓN OPERATIVA Y ATRIBUCIÓN DE CONVERSIÓN (MVP 3 + MVP 5) */}
      <section
        aria-label="Panel de Comprobación en Vivo y Atribución de Conversión"
        className="rounded-2xl border-2 border-[#1A3D84]/25 bg-white shadow-sm overflow-hidden"
      >
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                nucleoConnected
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  nucleoConnected ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                }`}
              />
              <span>
                {nucleoConnected
                  ? `CONECTADO A MEJORANUCLEO SQLITE (127.0.0.1:4002 · ${attributionStats.totalNucleo} Leads)`
                  : "MOTOR DE ATRIBUCIÓN LOCAL ACTIVO"}
              </span>
            </span>
            <span className="text-xs font-bold text-slate-200">
              Circuito Cerrado: Pieza Social Media (UTM) → Lead en MejoraNucleo → Semáforo SLA 48h
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSimulateLeadFromProposal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F7CC13] hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-xs"
            >
              <Zap className="h-3.5 w-3.5 text-[#E1061E]" />
              <span>⚡ Probar Conversión Real (Inyectar Lead de Semana {activeWeek})</span>
            </button>

            <button
              type="button"
              onClick={fetchNucleoAttribution}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncingNucleo ? "animate-spin" : ""}`} />
              <span>Sincronizar KPIs</span>
            </button>
          </div>
        </div>

        {liveProofBanner && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{liveProofBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setLiveProofBanner(null)}
              className="text-emerald-800 underline ml-3 cursor-pointer"
            >
              Ocultar
            </button>
          </div>
        )}

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/60">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-[#1A3D84]" />
                <span>Piezas con Mayor Conversión en MejoraNucleo</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-700">
                {attributionStats.totalAtribuidos} leads atribuidos
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(attributionStats.leadsByPieza).length === 0 ? (
                <span className="text-xs text-slate-500">
                  Hacé clic en &quot;⚡ Probar Conversión Real&quot; para comprobar cómo una pieza inyecta leads en SQLite.
                </span>
              ) : (
                Object.entries(attributionStats.leadsByPieza).map(([piezaId, count]) => (
                  <div
                    key={piezaId}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs flex items-center gap-2"
                  >
                    <span className="font-mono font-bold text-[#1A3D84]">{piezaId}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                      {count} lead{count > 1 ? "s" : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-[#E1061E]" />
                <span>Conversión por Buyer Persona 4D (Feedback Loop)</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(attributionStats.leadsByPersona).length === 0 ? (
                <span className="text-xs text-slate-500">
                  Sincronizando Buyer Personas desde MejoraNucleo...
                </span>
              ) : (
                Object.entries(attributionStats.leadsByPersona).map(([bp, info]) => (
                  <div
                    key={bp}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs flex items-center gap-1.5 text-amber-950"
                  >
                    <span className="font-bold">🎯 {bp}:</span>
                    <span className="font-mono font-extrabold">{info.total} leads</span>
                    {info.avanzados > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        {info.avanzados} calif.
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* METRICAS Y RESUMEN OPERATIVO */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Grilla Evergreen</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-900">26 Semanas</span>
            <span className="text-xs text-slate-400 font-mono">({stats.total} piezas)</span>
          </div>
          <span className="text-[11px] text-blue-700 font-medium">80.7% Jabs · 19.3% Right Hooks</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Pendientes de Revisión</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-amber-600">{stats.pendientes}</span>
            <span className="text-xs text-amber-700/80 font-medium">en toda la grilla</span>
          </div>
          <span className="text-[11px] text-slate-500">{stats.pendientesSemana} en esta semana</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Aprobadas / Listas</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-emerald-600">{stats.aprobadas}</span>
            <span className="text-xs text-emerald-700/80 font-medium">para despacho</span>
          </div>
          <span className="text-[11px] text-slate-500">Listas para Zernio/WhatsApp</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Publicadas en Redes</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-blue-800">{stats.publicadas}</span>
            <span className="text-xs text-slate-400 font-medium">con feedback</span>
          </div>
          <span className="text-[11px] text-slate-500">Atribución activa</span>
        </div>
      </section>

      {/* NAVEGADOR DE SEMANAS Y FILTROS */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={activeWeek <= 1}
            onClick={() => setActiveWeek((w) => Math.max(1, w - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm font-bold text-slate-900 min-w-32 text-center">
            Semana {activeWeek} de {totalWeeks}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={activeWeek >= totalWeeks}
            onClick={() => setActiveWeek((w) => Math.min(totalWeeks, w + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="text-xs text-slate-500 hidden sm:inline ml-2">
            ({weekProposals.length} piezas programadas)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Canal */}
          <select
            value={selectedCanal}
            onChange={(e) => setSelectedCanal(e.target.value)}
            className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-800"
          >
            <option value="all">Todos los Canales</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="whatsapp">WhatsApp</option>
          </select>

          {/* Filtro por Estado */}
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-800"
          >
            <option value="all">Todos los Estados</option>
            <option value="pendiente_revision">Pendientes</option>
            <option value="aprobado">Aprobadas</option>
            <option value="publicado">Publicadas</option>
          </select>
        </div>
      </section>

      {/* GRILLA DE PIEZAS DE LA SEMANA CON FRAMING ENGINE */}
      <section className="space-y-4">
        {weekProposals.length === 0 ? (
          proposals.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center bg-white shadow-xs">
              <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 text-[#1A3D84] flex items-center justify-center mb-3">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Tablero Totalmente Depurado y en Blanco</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                El sistema está listo. Podés cargar el plan evergreen de 26 semanas (78 piezas balanceadas 80/20) o comenzar a subir activos operativos paso a paso.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    const fresh = resetLocalProposalsToPristine();
                    setProposals(fresh);
                    toast({
                      title: "Plan Evergreen Generado",
                      description: "78 piezas generadas en estado pendiente de revisión.",
                    });
                  }}
                  className="bg-[#1A3D84] hover:bg-[#142F68] text-white font-bold"
                >
                  <Sparkles className="mr-2 h-4 w-4 text-[#F7CC13]" />
                  Generar Plan Evergreen con IA (26 Semanas)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/subir-material")}
                  className="border-slate-300"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Subir Primer Activo
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-white text-slate-500 text-sm">
              No hay propuestas para la Semana {activeWeek} con los filtros seleccionados ({selectedCanal !== 'all' ? selectedCanal : ''} {selectedEstado !== 'all' ? selectedEstado : ''}).
            </div>
          )
        ) : (
          <Grid26Semanas
          proposals={weekProposals}
          activeWeek={activeWeek}
          leadsByPieza={attributionStats.leadsByPieza}
          onSimulateLead={(propuesta) => handleSimulateLeadFromProposal(propuesta)}
          onApprove={(id) => {
            const updated = approveLocalProposal(id);
            setProposals(updated);
            toast({
              title: "Propuesta Aprobada",
              description: `${id} quedó aprobada para publicación.`,
            });
          }}
          onPublish={(id) => {
            const updated = publishLocalProposal(id);
            setProposals(updated);
            toast({
              title: "Propuesta Publicada",
              description: `${id} ha sido despachada y publicada con éxito.`,
            });
          }}
          onSelectDraft={(id, op) => {
            setProposals((prev) =>
              prev.map((p) => (p.propuesta_id === id ? { ...p, borrador_seleccionado: op } : p))
            );
          }}
          onOpenDetail={handleOpenDetail}
          />
        )}
      </section>

      {/* DIÁLOGO DETALLADO CON 3 BORRADORES, EDICIÓN Y APROBACIÓN */}
      {activeProposal && (
        <ProposalDetailDialog
          proposal={activeProposal}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              // Refrescar propuestas locales por si hubo mutaciones
              setProposals(getLocalProposals());
            }
          }}
          onApprove={(id) => {
            const updated = approveLocalProposal(id);
            setProposals(updated);
          }}
          onApproveBatch={handleApproveBatch}
          totalLote={stats.pendientesSemana}
        />
      )}

      {/* CONFIRMACIÓN DE LOTE SEMANAL */}
      <ConfirmDialog
        open={confirmBatchOpen}
        onOpenChange={setConfirmBatchOpen}
        title={`¿Aprobar el lote completo de la Semana ${activeWeek}?`}
        description={`Todas las propuestas pendientes de la semana (${stats.pendientesSemana}) quedarán aprobadas y listas para su despacho según la grilla programada.`}
        confirmText="Confirmar Aprobación de Lote"
        onConfirm={handleApproveBatch}
      />

      {/* MEMORANDO OPERATIVO EJECUTIVO DE SOCIOS (ANDY GROVE) */}
      <ExecutiveMemoModal
        open={memoModalOpen}
        onOpenChange={setMemoModalOpen}
        initialData={{
          semana: activeWeek,
          proposalsCount: weekProposals.length,
          approvedCount: weekProposals.filter((p) => p.estado === "aprobado").length,
          publishedCount: weekProposals.filter((p) => p.estado === "publicado").length,
        }}
      />

      {/* CENTRO DE EXPORTACIÓN CSV / GOOGLE SHEETS */}
      <PipelineExporterModal
        open={exporterOpen}
        onOpenChange={setExporterOpen}
        initialDataset="grilla_editorial_26s"
        exportInput={exportInput}
      />
    </div>
  );
}
