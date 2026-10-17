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
  approveBatchLocalProposals,
  updateLocalProposal,
  rejectLocalProposal,
  triggerBatchPackageDownload,
} from "@/services/localSMService";
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

      {/* GRILLA DE PIEZAS DE LA SEMANA */}
      <section className="space-y-4">
        {weekProposals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-8">
            <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No hay propuestas con los filtros seleccionados.</p>
            <p className="text-xs text-slate-400 mt-1">Elegí otra semana o cambiá los filtros superiores.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {weekProposals.map((propuesta) => {
              const borrador =
                propuesta.borradores.find((b) => b.opcion === propuesta.borrador_seleccionado) ||
                propuesta.borradores[0];

              const isJab = borrador.estrategia !== "right_hook_conversion";
              const isApproved = propuesta.estado === "aprobado";
              const isPending = propuesta.estado === "pendiente_revision";

              return (
                <Card
                  key={propuesta.propuesta_id}
                  className="overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top Bar de la Pieza */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-blue-900">
                        {propuesta.propuesta_id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-semibold text-slate-700 bg-slate-50"
                        >
                          {propuesta.canal_destino}
                        </Badge>
                        <Badge
                          variant={isJab ? "default" : "destructive"}
                          className={`text-[10px] ${isJab ? "bg-[#1A3D84]" : "bg-[#E1061E]"}`}
                        >
                          {isJab ? "Jab (80%)" : "Right Hook (20%)"}
                        </Badge>
                      </div>
                    </div>

                    {/* Fecha y Formato */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{new Date(propuesta.dia_programado).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span>·</span>
                      <span className="capitalize">{borrador.tipo_formato.replace("_", " ")}</span>
                    </div>

                    {/* Título / Hook Principal */}
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {borrador.titulo_portada}
                    </h3>

                    {/* Desglose Copy en 3 Pasos */}
                    <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px]">
                      <div className="border-l-2 border-red-500 pl-2">
                        <span className="text-[10px] font-bold text-red-700 block uppercase">1. Dolor</span>
                        <p className="text-slate-700 line-clamp-1">{borrador.copy_tres_pasos.paso1_dolor}</p>
                      </div>
                      <div className="border-l-2 border-blue-700 pl-2">
                        <span className="text-[10px] font-bold text-blue-900 block uppercase">2. Reencuadre</span>
                        <p className="text-slate-700 line-clamp-1">{borrador.copy_tres_pasos.paso2_reencuadre}</p>
                      </div>
                      <div className="border-l-2 border-amber-500 pl-2">
                        <span className="text-[10px] font-bold text-amber-700 block uppercase">3. Dirección</span>
                        <p className="text-slate-700 truncate">{borrador.copy_tres_pasos.paso3_direccion_web}</p>
                      </div>
                    </div>

                    {/* Badges de 3 Borradores Disponibles */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-medium">Borradores IA:</span>
                      <div className="flex gap-1">
                        {(["A", "B", "C"] as OpcionBorrador[]).map((op) => (
                          <span
                            key={op}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              propuesta.borrador_seleccionado === op
                                ? "bg-blue-800 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {op}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>

                  {/* Footer con Acción */}
                  <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                    <Badge
                      variant={isApproved ? "default" : isPending ? "secondary" : "outline"}
                      className={`text-[10px] ${
                        isApproved
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          : ""
                      }`}
                    >
                      {propuesta.estado === "pendiente_revision"
                        ? "Pendiente"
                        : propuesta.estado === "aprobado"
                        ? "Aprobada"
                        : "Publicada"}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      {isPending && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Aprobar pieza ${propuesta.propuesta_id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = approveLocalProposal(propuesta.propuesta_id);
                            setProposals(updated);
                            toast({
                              title: "Propuesta Aprobada",
                              description: `${propuesta.propuesta_id} quedó aprobada para publicación.`,
                            });
                          }}
                          className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold px-2"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Aprobar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDetail(propuesta)}
                        className="h-7 text-xs bg-white hover:bg-slate-100 text-blue-900 font-semibold"
                      >
                        Revisar / Editar
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
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
    </div>
  );
}
