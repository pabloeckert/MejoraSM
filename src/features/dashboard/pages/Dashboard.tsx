import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Image, CalendarDays, Clock, Zap, ArrowRight, TrendingUp } from "lucide-react";
import { useDocuments } from "@/features/boveda/hooks/useVault";
import { useDialogueSessions } from "@/features/mesa-dialogo/hooks/useDialogue";
import { usePendingProposals, useProposals } from "@/features/laboratorio/hooks/useProposals";
import { useCalendarEvents, useLatestMetrics } from "@/features/dashboard/hooks/useMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981"];

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

  const stats = [
    { label: "Documentos en Bóveda", value: String(documents?.length ?? 0), icon: FileText, href: "/boveda" },
    { label: "Diálogos creados", value: String(sessions?.length ?? 0), icon: MessageSquare, href: "/mesa" },
    { label: "Contenidos generados", value: String(proposals?.length ?? 0), icon: Image, href: "/laboratorio" },
    { label: "Publicaciones programadas", value: String(calendarEvents?.length ?? 0), icon: CalendarDays, href: "/calendario" },
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Engagement chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Engagement por post
            </CardTitle>
          </CardHeader>
          <CardContent>
            {engagementData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                  <Bar dataKey="engagement" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Engagement %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Los gráficos aparecerán cuando haya métricas de posts.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Format distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por formato</CardTitle>
          </CardHeader>
          <CardContent>
            {formatData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={formatData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
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
              <div className="flex h-[250px] items-center justify-center">
                <div className="text-center">
                  <Image className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Generá contenido para ver la distribución por formato.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending approvals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Aprobaciones pendientes</CardTitle>
          {pendingProposals && pendingProposals.length > 0 && (
            <Badge variant="secondary">{pendingProposals.length}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {!pendingProposals || pendingProposals.length === 0 ? (
            <div className="flex flex-col items-center py-8">
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
            <div className="space-y-3">
              {pendingProposals.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">{p.title || "Sin título"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.dialogue_sessions?.topic || "Sin tema"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{p.format || "post"}</Badge>
                    <Link to="/laboratorio">
                      <Button variant="ghost" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {pendingProposals.length > 5 && (
                <Link to="/laboratorio">
                  <Button variant="ghost" size="sm" className="w-full">
                    Ver todas ({pendingProposals.length})
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendario de contenido</CardTitle>
        </CardHeader>
        <CardContent>
          {!calendarEvents || calendarEvents.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center">
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
            <div className="space-y-2">
              {calendarEvents.slice(0, 7).map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <Badge variant="outline">{e.format}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
