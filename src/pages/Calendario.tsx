import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalendarDays, Loader2, ChevronLeft, ChevronRight, Clock, Zap, Hand, Move, X } from "lucide-react";
import { useProposals, useRescheduleProposal } from "@/hooks/useProposals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { isAutonomousFormat } from "@/shared/constants";
import { ProposalDetailDialog, type ProposalDetail } from "@/components/ProposalDetailDialog";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Mismo tratamiento que el Dashboard: filas de prueba nunca se mezclan sin
// aviso. Desde la Fase 0 del plan estratégico 2026-08-16 lee la columna
// real proposals.is_test en vez de inferirlo de un prefijo de UUID.
function isTestProposal(p: ProposalDetail): boolean {
  return Boolean(p.is_test);
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
  // Se guarda el id, no el objeto — mismo motivo que en Propuestas.tsx: el
  // modal tiene que reflejar el estado real después de reprogramar/aprobar/
  // convertir sin cerrarlo, no el snapshot de cuando se abrió.
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [showTestRows, setShowTestRows] = useState(false);
  const [draggedProposal, setDraggedProposal] = useState<ProposalDetail | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  // B11 (auditoría 2026-08-31): el drag-and-drop HTML5 no funciona en touch.
  // "Modo mover": tocás una pieza programada → tocás un día → se reprograma.
  // Funciona con teclado y touch, no solo con mouse.
  const [movingProposal, setMovingProposal] = useState<ProposalDetail | null>(null);

  const selectedProposal: ProposalDetail | null = selectedProposalId
    ? (proposals || []).find((p: ProposalDetail) => p.id === selectedProposalId) ?? null
    : null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const weekStart = getWeekStart(currentDate);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevWeek = () => setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
  const nextWeek = () => setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));

  const monthNameRaw = currentDate.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  // D11: `capitalize` de CSS convertía "agosto de 2026" → "Agosto De 2026".
  const monthName = monthNameRaw.charAt(0).toUpperCase() + monthNameRaw.slice(1);
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

  function moveProposalToDay(p: ProposalDetail | null, targetDate: Date) {
    setDragOverKey(null);
    setDraggedProposal(null);
    setMovingProposal(null);
    if (!p || !p.scheduled_at || p.status !== "scheduled") return;
    const original = new Date(p.scheduled_at);
    const newDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      original.getHours(),
      original.getMinutes()
    );
    if (dayKey(newDate) === dayKey(original)) return;
    // B11: guardar contra fechas pasadas — si la nueva fecha ya venció, el cron
    // la publica en la próxima corrida sin ninguna revisión.
    if (newDate.getTime() <= Date.now()) {
      toast({
        title: "Ese día ya pasó",
        description: "Elegí un día futuro — una fecha vencida se publicaría de inmediato.",
        variant: "destructive",
      });
      return;
    }
    rescheduleMutation.mutate(
      { id: p.id, date: newDate.toISOString() },
      {
        onSuccess: () =>
          toast({
            title: "Fecha actualizada",
            description: `Movida al ${newDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`,
          }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleDrop(targetDate: Date) {
    moveProposalToDay(draggedProposal, targetDate);
  }

  function handleDayTap(targetDate: Date) {
    if (movingProposal) moveProposalToDay(movingProposal, targetDate);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario Editorial</h1>
          <p className="mt-1 text-muted-foreground">
            Fuente real: lo que se agenda y publica solo. Tocá una pieza para ver el detalle completo — desde ahí
            se reprograma o se cancela antes de que salga. Para moverla a otro día, tocá el ícono{" "}
            <Move className="inline h-3.5 w-3.5 align-text-bottom" /> y después el día destino
            <span className="hidden sm:inline"> (en desktop también se puede arrastrar a otro día)</span>.
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

      <div className="flex flex-wrap items-center gap-2">
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
        {movingProposal && (
          <div className="flex items-center gap-2 rounded-md border border-primary bg-primary/5 px-3 py-1.5 text-xs">
            <Move className="h-3.5 w-3.5 text-primary" />
            Moviendo <strong className="max-w-[160px] truncate">{movingProposal.hook || movingProposal.title}</strong> — tocá el día destino
            <button type="button" onClick={() => setMovingProposal(null)} aria-label="Cancelar movimiento" className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <Button variant="ghost" size="icon" onClick={viewMode === "month" ? prevMonth : prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">{viewMode === "month" ? monthName : weekLabel}</CardTitle>
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
                      onSelect={(p) => setSelectedProposalId(p.id)}
                      onDragStartEvent={setDraggedProposal}
                      movingActive={!!movingProposal}
                      onDayTap={() => handleDayTap(date)}
                      onStartMove={setMovingProposal}
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
                        onSelect={(p) => setSelectedProposalId(p.id)}
                        onDragStartEvent={setDraggedProposal}
                        movingActive={!!movingProposal}
                        onDayTap={() => handleDayTap(date)}
                        onStartMove={setMovingProposal}
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
                    onClick={() => setSelectedProposalId(p.id)}
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
        onOpenChange={(open) => !open && setSelectedProposalId(null)}
      />
    </div>
  );
}

function DayCell({
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
  movingActive,
  onDayTap,
  onStartMove,
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
  movingActive: boolean;
  onDayTap: () => void;
  onStartMove: (p: ProposalDetail) => void;
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
      onClick={movingActive ? onDayTap : undefined}
      className={cn(
        "rounded-lg border p-1.5 transition-colors",
        compact ? "min-h-[80px]" : "min-h-[220px]",
        isToday ? "border-primary bg-primary/5" : "border-transparent",
        isDragOver && "border-primary bg-primary/10",
        movingActive && "cursor-pointer ring-1 ring-primary/30 hover:bg-primary/10"
      )}
    >
      {label && (
        <p className={cn("mb-1 text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{label}</p>
      )}
      {events.slice(0, maxVisible).map((p) => {
        const draggable = p.status === "scheduled";
        return (
          <div
            key={p.id}
            className={cn(
              "mb-0.5 flex w-full items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium",
              p.status === "published" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
              p.isTest && "outline outline-1 outline-[#F7CC13]"
            )}
          >
            <button
              type="button"
              draggable={draggable}
              onDragStart={() => draggable && onDragStartEvent(p)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(p);
              }}
              title={p.hook || p.title || undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-1 truncate text-left transition-colors hover:opacity-80",
                draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
              )}
            >
              {isAutonomousFormat(p.format) ? (
                <Zap className="h-2.5 w-2.5 flex-shrink-0" />
              ) : (
                <Hand className="h-2.5 w-2.5 flex-shrink-0" />
              )}
              <span className="truncate">{p.hook || p.title || "Sin título"}</span>
            </button>
            {draggable && (
              <button
                type="button"
                aria-label={`Mover "${p.hook || p.title}" a otro día`}
                title="Mover a otro día"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartMove(p);
                }}
                className="shrink-0 text-primary/60 hover:text-primary"
              >
                <Move className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        );
      })}
      {events.length > maxVisible && (
        <p className="text-[10px] text-muted-foreground">+{events.length - maxVisible} más</p>
      )}
    </div>
  );
}
