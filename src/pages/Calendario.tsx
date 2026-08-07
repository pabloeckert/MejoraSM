import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalendarDays, Loader2, ChevronLeft, ChevronRight, Clock, Zap, Hand } from "lucide-react";
import { useProposals, useRescheduleProposal } from "@/hooks/useProposals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { isAutonomousFormat } from "@/components/PipelineBadge";
import { ProposalDetailDialog, type ProposalDetail } from "@/components/ProposalDetailDialog";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Mismo tratamiento que el Dashboard (rediseño 2026-08-07): las filas
// [TEST/QA] sembradas para probar rule-engine ya se limpiaron de la base
// (2026-08-05), pero el filtro queda por si vuelven a aparecer — nunca
// mezcladas sin aviso.
const TEST_PROPOSAL_PREFIX = "7e57da7a-";
function isTestProposal(p: ProposalDetail): boolean {
  return Boolean(p.id?.startsWith(TEST_PROPOSAL_PREFIX));
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function getWeekStart(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function Calendario() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <CalendarioContent />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

function CalendarioContent() {
  const { data: proposals, isLoading } = useProposals();
  const rescheduleMutation = useRescheduleProposal();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedProposal, setSelectedProposal] = useState<ProposalDetail | null>(null);
  const [showTestRows, setShowTestRows] = useState(false);
  const [draggedProposal, setDraggedProposal] = useState<ProposalDetail | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const weekStart = getWeekStart(currentDate);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevWeek = () => setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
  const nextWeek = () => setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));

  const monthName = currentDate.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const weekLabel = `${weekStart.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;

  // Este calendario sigue siendo la fuente real: proposals.scheduled_at.
  // Antes existía un "Nuevo evento" que escribía en calendar_events sin
  // relación con lo que se publicaba de verdad — se saca esa promesa falsa
  // en vez de mantenerla. Agendar/cancelar/editar de verdad vive acá mismo
  // ahora (modal compartido con Propuestas), en vez de en otra pantalla.
  const allEvents: (ProposalDetail & { isTest: boolean })[] = useMemo(
    () =>
      (proposals || [])
        .filter((p: ProposalDetail) => (p.status === "scheduled" || p.status === "published") && p.scheduled_at)
        .map((p: ProposalDetail) => ({ ...p, isTest: isTestProposal(p) })),
    [proposals]
  );
  const testCount = allEvents.filter((e) => e.isTest).length;
  const events = showTestRows ? allEvents : allEvents.filter((e) => !e.isTest);

  const eventsByDay: Record<string, (ProposalDetail & { isTest: boolean })[]> = {};
  events.forEach((p) => {
    const d = new Date(p.scheduled_at!);
    const key = dayKey(d);
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(p);
  });

  const now = new Date();
  const nextWeekLimit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = events
    .filter((p) => {
      const d = new Date(p.scheduled_at!);
      return d >= now && d <= nextWeekLimit;
    })
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  function handleDrop(targetDate: Date) {
    setDragOverKey(null);
    if (!draggedProposal || !draggedProposal.scheduled_at) return;
    if (draggedProposal.status !== "scheduled") return; // solo lo programado se puede reprogramar arrastrando
    const original = new Date(draggedProposal.scheduled_at);
    const newDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      original.getHours(),
      original.getMinutes()
    );
    if (dayKey(newDate) === dayKey(original)) {
      setDraggedProposal(null);
      return;
    }
    const proposalId = draggedProposal.id;
    rescheduleMutation.mutate(
      { id: proposalId, date: newDate.toISOString() },
      {
        onSuccess: () =>
          toast({
            title: "Fecha actualizada",
            description: `Movida al ${newDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`,
          }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
    setDraggedProposal(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario Editorial</h1>
          <p className="mt-1 text-muted-foreground">
            Fuente real: lo que se agenda y publica solo. Click en una pieza para ver el detalle completo o
            arrastrala a otro día para reprogramarla. Para cancelar algo antes de que salga, también se hace
            acá mismo, desde el detalle.
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2">
          <Switch id="show-test-rows-cal" checked={showTestRows} onCheckedChange={setShowTestRows} />
          <label htmlFor="show-test-rows-cal" className="cursor-pointer text-xs font-medium">
            Mostrar filas de prueba
            {testCount > 0 && <span className="ml-1.5 text-muted-foreground">({testCount} excluidas)</span>}
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={viewMode === "month" ? "default" : "outline"}
          onClick={() => setViewMode("month")}
        >
          Mensual
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewMode === "week" ? "default" : "outline"}
          onClick={() => setViewMode("week")}
        >
          Semanal
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <Button variant="ghost" size="icon" onClick={viewMode === "month" ? prevMonth : prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base capitalize">{viewMode === "month" ? monthName : weekLabel}</CardTitle>
            <Button variant="ghost" size="icon" onClick={viewMode === "month" ? nextMonth : nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : viewMode === "month" ? (
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month, day);
                  const key = dayKey(date);
                  const isToday =
                    day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                  return (
                    <DayCell
                      key={day}
                      date={date}
                      label={String(day)}
                      compact
                      events={eventsByDay[key] || []}
                      isToday={isToday}
                      isDragOver={dragOverKey === key}
                      onDragEnter={() => setDragOverKey(key)}
                      onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                      onDrop={() => handleDrop(date)}
                      onSelect={setSelectedProposal}
                      onDragStartEvent={setDraggedProposal}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
                  const key = dayKey(date);
                  const isToday = dayKey(date) === dayKey(now);
                  return (
                    <div key={key}>
                      <p className="mb-1.5 text-center text-xs font-medium text-muted-foreground">
                        {WEEKDAYS[i]} <span className={isToday ? "text-primary" : ""}>{date.getDate()}</span>
                      </p>
                      <DayCell
                        date={date}
                        label=""
                        compact={false}
                        events={eventsByDay[key] || []}
                        isToday={isToday}
                        isDragOver={dragOverKey === key}
                        onDragEnter={() => setDragOverKey(key)}
                        onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                        onDrop={() => handleDrop(date)}
                        onSelect={setSelectedProposal}
                        onDragStartEvent={setDraggedProposal}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Sin publicaciones agendadas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProposal(p)}
                    className="flex w-full items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">{p.hook || p.title || "Sin título"}</p>
                        {p.isTest && (
                          <Badge variant="outline" className="shrink-0 border-[#F7CC13] text-[10px] text-[#c9a30d]">
                            PRUEBA
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.scheduled_at!).toLocaleDateString("es-AR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {p.format || "post"}
                        </Badge>
                        {isAutonomousFormat(p.format) ? (
                          <Zap className="h-3 w-3 text-primary" />
                        ) : (
                          <Hand className="h-3 w-3 text-[#c9a30d]" />
                        )}
                        <Badge variant={p.status === "published" ? "default" : "secondary"} className="text-[10px]">
                          {p.status === "published" ? "Publicada" : "Programada"}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ProposalDetailDialog
        proposal={selectedProposal}
        open={!!selectedProposal}
        onOpenChange={(open) => !open && setSelectedProposal(null)}
      />
    </div>
  );
}

function DayCell({
  date,
  label,
  compact,
  events,
  isToday,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onSelect,
  onDragStartEvent,
}: {
  date: Date;
  label: string;
  compact: boolean;
  events: (ProposalDetail & { isTest: boolean })[];
  isToday: boolean;
  isDragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onSelect: (p: ProposalDetail) => void;
  onDragStartEvent: (p: ProposalDetail) => void;
}) {
  const maxVisible = compact ? 2 : 6;
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        "rounded-lg border p-1.5 transition-colors",
        compact ? "min-h-[80px]" : "min-h-[220px]",
        isToday ? "border-primary bg-primary/5" : "border-transparent",
        isDragOver && "border-primary bg-primary/10"
      )}
    >
      {label && (
        <p className={cn("mb-1 text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{label}</p>
      )}
      {events.slice(0, maxVisible).map((p) => {
        const draggable = p.status === "scheduled";
        return (
          <button
            key={p.id}
            type="button"
            draggable={draggable}
            onDragStart={() => draggable && onDragStartEvent(p)}
            onClick={() => onSelect(p)}
            title={p.hook || p.title || undefined}
            className={cn(
              "mb-0.5 flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] font-medium transition-colors hover:opacity-80",
              draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
              p.status === "published" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
              p.isTest && "outline outline-1 outline-[#F7CC13]"
            )}
          >
            {isAutonomousFormat(p.format) ? (
              <Zap className="h-2.5 w-2.5 flex-shrink-0" />
            ) : (
              <Hand className="h-2.5 w-2.5 flex-shrink-0" />
            )}
            <span className="truncate">{p.hook || p.title || "Sin título"}</span>
          </button>
        );
      })}
      {events.length > maxVisible && (
        <p className="text-[10px] text-muted-foreground">+{events.length - maxVisible} más</p>
      )}
    </div>
  );
}
