import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Loader2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useProposals } from "@/hooks/useProposals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Link } from "react-router-dom";

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
  const { data: proposals, isLoading } = useProposals();

  const [currentDate, setCurrentDate] = useState(new Date());

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

  // Este calendario es de solo lectura sobre proposals.scheduled_at — la
  // fuente real de qué se va a publicar y cuándo (PLAN_AUTONOMIA.md Fase 5).
  // Antes existía un "Nuevo evento" que escribía en una tabla calendar_events
  // sin ninguna relación con lo que efectivamente se publica: crear un
  // evento acá no agendaba nada de verdad. Se saca esa promesa falsa en vez
  // de mantenerla; agendar/cancelar de verdad se hace en /propuestas (mismo
  // "monitor de reversión" de la Fase 2, no duplicado acá).
  const events = (proposals || []).filter(
    (p: any) => (p.status === "scheduled" || p.status === "published") && p.scheduled_at
  );

  const eventsByDay: Record<number, any[]> = {};
  events.forEach((p: any) => {
    const d = new Date(p.scheduled_at);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(p);
    }
  });

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = events
    .filter((p: any) => {
      const d = new Date(p.scheduled_at);
      return d >= now && d <= nextWeek;
    })
    .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendario Editorial</h1>
        <p className="mt-1 text-muted-foreground">
          Solo lectura de lo que se agenda y publica solo. Para cancelar algo antes de que salga, hacelo en{" "}
          <Link to="/propuestas" className="underline">
            Propuestas
          </Link>
          .
        </p>
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
                      {dayEvents.slice(0, 2).map((p: any) => (
                        <div
                          key={p.id}
                          className={`mb-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                            p.status === "published"
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                          title={p.hook || p.title}
                        >
                          {p.hook || p.title || "Sin título"}
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
                <p className="text-sm text-muted-foreground">Sin publicaciones agendadas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((p: any) => (
                  <div key={p.id} className="flex items-start gap-2 rounded-lg border p-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.hook || p.title || "Sin título"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.scheduled_at).toLocaleDateString("es-AR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-1 flex gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {p.format || "post"}
                        </Badge>
                        <Badge variant={p.status === "published" ? "default" : "secondary"} className="text-[10px]">
                          {p.status === "published" ? "Publicada" : "Programada"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
