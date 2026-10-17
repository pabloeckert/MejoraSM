// src/pages/TableroSemanal.tsx
// TABLERO SEMANAL DE REVISIÓN Y CONTROL — MEJORASM (2026)
// Modo Local Soberano · Sin dependencias de Supabase · Conexión directa a persistencia

import { useState, useMemo } from "react";
import {
  PropuestaMejoraSMDTO,
  OpcionBorrador,
  CanalDestino,
  DimensionMC,
} from "@/domain/types";
import {
  getLocalProposals,
  approveLocalProposal,
  publishLocalProposal,
  approveBatchLocalProposals,
  updateLocalProposal,
  rejectLocalProposal,
  triggerBatchPackageDownload,
} from "@/services/localSMService";
import { Grid26Semanas } from "@/components/Grid26Semanas";
import { ProposalDetailDialog } from "@/components/ProposalDetailDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

import {
  CheckSquare,
  Download,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

export default function TableroSemanal() {
  const [proposals, setProposals] = useState<PropuestaMejoraSMDTO[]>(() => getLocalProposals());
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [selectedCanal, setSelectedCanal] = useState<string>("all");
  const [selectedEstado, setSelectedEstado] = useState<string>("all");
  const [activeProposal, setActiveProposal] = useState<PropuestaMejoraSMDTO | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [confirmBatchOpen, setConfirmBatchOpen] = useState<boolean>(false);

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
            onClick={handleDownloadBatch}
            disabled={weekProposals.length === 0}
            className="border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 shadow-sm"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-[#1A3D84]" />
            Descarga Lote Semana {activeWeek}
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
            <option value="linkedin">LinkedIn</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
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
        <Grid26Semanas
          proposals={weekProposals}
          activeWeek={activeWeek}
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
    </div>
  );
}
