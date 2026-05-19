import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Trash2,
} from "lucide-react";
import { useCalendarEvents, useCreateCalendarEvent } from "@/features/dashboard/hooks/useMetrics";
import { useProposals } from "@/features/laboratorio/hooks/useProposals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/services/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export default function Calendario() {
  return (
    <ErrorBoundary>
      <CalendarioContent />
    </ErrorBoundary>
  );
}

function CalendarioContent() {
  const { data: events, isLoading } = useCalendarEvents();
  const { data: proposals } = useProposals();
  const createEvent = useCreateCalendarEvent();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("10:00");
  const [formFormat, setFormFormat] = useState("post");
  const [formProposalId, setFormProposalId] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  // Events by day
  const eventsByDay: Record<number, any[]> = {};
  (events || []).forEach((e: any) => {
    const d = new Date(e.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(e);
    }
  });

  const handleCreate = () => {
    if (!formTitle.trim() || !formDate) return;

    const dateTime = `${formDate}T${formTime}:00`;

    createEvent.mutate(
      {
        title: formTitle,
        description: formDesc || undefined,
        date: dateTime,
        format: formFormat,
        proposal_id: formProposalId || undefined,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setFormTitle("");
          setFormDesc("");
          setFormDate("");
          setFormTime("10:00");
          setFormFormat("post");
          setFormProposalId("");
          toast({ title: "Evento creado", description: "Se agregó al calendario." });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setDeleteTarget(null);
      toast({ title: "Evento eliminado" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Upcoming events (next 7 days)
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = (events || [])
    .filter((e: any) => {
      const d = new Date(e.date);
      return d >= now && d <= nextWeek;
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario Editorial</h1>
          <p className="mt-1 text-muted-foreground">
            Programá y organizá tus publicaciones.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear evento en el calendario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Ej: Post sobre liderazgo"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Textarea
                  placeholder="Notas o detalles del post..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select value={formFormat} onValueChange={setFormFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="carrusel">Carrusel</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="historia">Historia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {proposals && proposals.length > 0 && (
                <div className="space-y-2">
                  <Label>Vincular propuesta (opcional)</Label>
                  <Select value={formProposalId} onValueChange={setFormProposalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar propuesta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {proposals.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title || "Sin título"} ({p.format || "post"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formTitle.trim() || !formDate || createEvent.isPending}
                >
                  {createEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear evento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base capitalize">{monthName}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Weekday headers */}
                {WEEKDAYS.map((d) => (
                  <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}

                {/* Empty cells before first day */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = eventsByDay[day] || [];
                  const isToday =
                    day === now.getDate() &&
                    month === now.getMonth() &&
                    year === now.getFullYear();

                  return (
                    <div
                      key={day}
                      className={`min-h-[80px] rounded-lg border p-1.5 ${
                        isToday ? "border-primary bg-primary/5" : "border-transparent"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium mb-1 ${
                          isToday ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </p>
                      {dayEvents.slice(0, 2).map((e: any) => (
                        <div
                          key={e.id}
                          className="mb-0.5 truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary"
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-[10px] text-muted-foreground">
                          +{dayEvents.length - 2} más
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Sin eventos próximos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((e: any) => (
                  <div key={e.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(e.date).toLocaleDateString("es-AR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {e.format || "post"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setDeleteTarget(e.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar evento"
        description="¿Estás seguro de que querés eliminar este evento del calendario?"
        confirmText="Eliminar"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </div>
  );
}
