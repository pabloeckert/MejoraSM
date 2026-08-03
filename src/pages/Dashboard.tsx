import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Sparkles, CalendarDays, Clock, Zap, ArrowRight } from "lucide-react";
import { useDocuments } from "@/hooks/useVault";
import { useDialogueSessions } from "@/hooks/useDialogue";
import { usePendingProposals, useProposals } from "@/hooks/useProposals";
import { useCalendarEvents, useLatestMetrics } from "@/hooks/useMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Paleta de marca: Azul, Rojo, Amarillo (Manual de Marca Mejora Continua) +
// el 4to tono derivado de Azul (#6f93cf) del design system para el pie chart.
const COLORS = ["#1A3D84", "#E1061E", "#F7CC13", "#6f93cf"];

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}

function DashboardContent() {
  const { data: documents } = useDocuments();
  const { data: sessions } = useDialogueSessions();
  const { data: proposals } = useProposals();
  const { data: pendingProposals } = usePendingProposals();
  const { data: calendarEvents } = useCalendarEvents();
  const { data: metrics } = useLatestMetrics();

  const hasData = (documents?.length ?? 0) > 0 || (sessions?.length ?? 0) > 0;

  const metricCards = [
    {
      label: "Documentos en Bóveda",
      value: String(documents?.length ?? 0),
      sub: "Subí fotos para empezar a nutrir Stories.",
      href: "/boveda",
      icon: FileText,
      accentClassName: "text-primary",
    },
    {
      label: "Diálogos creados",
      value: String(sessions?.length ?? 0),
      sub: "Se cuentan cuando abrís una conversación en Mesa de Diálogo.",
      href: "/mesa",
      icon: MessageSquare,
      accentClassName: "text-secondary",
    },
    {
      label: "Contenidos generados",
      value: String(proposals?.length ?? 0),
      sub: "Últimos 30 días",
      href: "/laboratorio",
      icon: Sparkles,
      // yellow-600 (#c9a30d) — el amarillo de marca (--accent) es muy claro
      // para un ícono sobre fondo blanco, el design system usa el tono más
      // oscuro de la misma familia para este caso puntual.
      accentClassName: "text-[#c9a30d]",
    },
    {
      label: "Publicaciones programadas",
      value: String(calendarEvents?.length ?? 0),
      sub: "Vía Zernio, próximos 7 días",
      href: "/calendario",
      icon: Clock,
      accentClassName: "text-primary",
    },
  ];

  // Prepare chart data from metrics
  const engagementData = metrics?.slice(0, 7).reverse().map((m: any) => ({
    name: m.proposals?.title?.slice(0, 15) || "Post",
    engagement: Math.round((m.engagement_rate || 0) * 100) / 100,
    likes: m.likes || 0,
    reach: m.reach || 0,
  })) || [];

  // Format distribution from proposals
  const formatCounts: Record<string, number> = {};
  proposals?.forEach((p: any) => {
    const format = p.format || "post";
    formatCounts[format] = (formatCounts[format] || 0) + 1;
  });
  const formatData = Object.entries(formatCounts).map(([name, value]) => ({ name, value }));

  // Status distribution
  const statusCounts: Record<string, number> = {};
  proposals?.forEach((p: any) => {
    const status = p.status || "pending";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name === "pending" ? "Pendiente" : name === "approved" ? "Aprobado" : name === "rejected" ? "Rechazado" : name,
    value,
  }));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[32px] font-medium leading-tight text-primary">Dashboard</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Centro de control del Estratega Digital Autónomo
        </p>
      </div>

      {/* Quick start banner for new users */}
      {!hasData && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Empezá subiendo documentos de marca</p>
              <p className="text-sm text-muted-foreground">
                Los agentes necesitan contexto sobre tu marca para generar contenido estratégico.
              </p>
            </div>
            <Link to="/boveda">
              <Button>
                Subir documentos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Bento grid de métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((m) => (
          <Link key={m.label} to={m.href}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="flex flex-col gap-2.5 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-muted-foreground">{m.label}</span>
                  <m.icon className={cn("h-4 w-4 flex-shrink-0", m.accentClassName)} />
                </div>
                <p className="text-[34px] font-medium leading-none text-primary [font-family:var(--font-display)]">
                  {m.value}
                </p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Engagement chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[17px] font-medium">Engagement por post</CardTitle>
            {engagementData.length > 0 && (
              <span className="text-xs text-muted-foreground">Últimos {engagementData.length} posts</span>
            )}
          </CardHeader>
          <CardContent>
            {engagementData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="engagement" fill="#1A3D84" radius={[4, 4, 0, 0]} name="Engagement %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center px-6 text-center">
                <p className="text-[13.5px] font-semibold">
                  Todavía no hay publicaciones con datos de engagement.
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Se completa solo cuando Zernio confirma la primera publicación en Instagram o Facebook — no hay nada más que hacer acá.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Format distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[17px] font-medium">Distribución por formato</CardTitle>
          </CardHeader>
          <CardContent>
            {formatData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={formatData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={72}
                    fill="#1A3D84"
                    dataKey="value"
                  >
                    {formatData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center px-6 text-center">
                <p className="text-[13.5px] font-semibold">Sin piezas generadas todavía.</p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Subí material a la Bóveda o armá una pieza para empezar a ver la mezcla de formatos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending approvals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[17px] font-medium">Aprobaciones pendientes</CardTitle>
          {pendingProposals && pendingProposals.length > 0 && (
            <Badge variant="secondary">{pendingProposals.length}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {!pendingProposals || pendingProposals.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Clock className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay contenido pendiente de aprobación.
              </p>
              {hasData && (
                <Link to="/mesa" className="mt-3">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Crear nueva sesión
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {pendingProposals.slice(0, 5).map((p: any) => (
                <Link
                  key={p.id}
                  to="/laboratorio"
                  className="-mx-1 flex items-center gap-3.5 rounded-md border-b border-border px-1 py-3 transition-colors last:border-0 hover:bg-muted/40"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{p.title || "Sin título"}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {p.dialogue_sessions?.topic || "Sin tema"}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">{p.format || "post"}</Badge>
                </Link>
              ))}
              {pendingProposals.length > 5 && (
                <Link to="/laboratorio" className="mt-2 text-center text-sm font-medium text-primary hover:underline">
                  Ver todas ({pendingProposals.length})
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px] font-medium">Calendario de contenido</CardTitle>
        </CardHeader>
        <CardContent>
          {!calendarEvents || calendarEvents.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay publicaciones programadas.
              </p>
              <Link to="/calendario" className="mt-3">
                <Button variant="outline" size="sm">
                  <CalendarDays className="mr-2 h-3 w-3" />
                  Ir al calendario
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col">
              {calendarEvents.slice(0, 7).map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3.5 border-b border-border py-3 last:border-0"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{e.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">{e.format}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
