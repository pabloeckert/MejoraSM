import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText,
  MessageSquare,
  Sparkles,
  CalendarDays,
  Clock,
  Zap,
  ArrowRight,
  History,
  Info,
  ExternalLink,
  HelpCircle,
  Trophy,
} from "lucide-react";
import { useDocuments } from "@/hooks/useVault";
import { useDialogueSessions } from "@/hooks/useDialogue";
import { usePendingProposals, useProposals } from "@/hooks/useProposals";
import { useAllMetrics } from "@/hooks/useMetrics";
import { CopilotCard } from "@/components/CopilotCard";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Paleta de marca: Azul, Rojo, Amarillo (Manual de Marca Mejora Continua) +
// el 4to tono derivado de Azul (#6f93cf) del design system para el pie chart.
const COLORS = ["#1A3D84", "#E1061E", "#F7CC13", "#6f93cf"];

const RAW_BASE_URL = "https://raw.githubusercontent.com/pabloeckert/MejoraSM/main";
const HISTORIAL_URL = `${RAW_BASE_URL}/content/log/historial.json`;

// Metadata de status para la sección de últimas publicaciones — mismos 3
// status reales del pipeline autónomo (ver CLAUDE.md, overhaul de
// autonomía): published (Zernio ya lo publicó), scheduled (autoagendado,
// esperando el cron), pending (formato "historia", sin pipeline autónomo).
const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline"; dateLabel: string }> = {
  published: { label: "Publicada", variant: "default", dateLabel: "Publicada" },
  scheduled: { label: "Programada", variant: "secondary", dateLabel: "Programada para" },
  pending: { label: "Pendiente", variant: "outline", dateLabel: "Creada" },
};

// Filas de prueba (ej. seeds de rule-engine, ver CLAUDE.md "rule-engine —
// corrida real con datos de prueba"): hasta la Fase 0 del plan estratégico
// 2026-08-16 esto se inferia de un prefijo de UUID (heurística de string);
// ahora lee la columna real proposals.is_test — nunca se mezclan sin aviso
// en gráficos/KPIs.
function isTestRow(m: MetricRow): boolean {
  return Boolean(m.proposals?.is_test);
}

const nf = new Intl.NumberFormat("es-AR");
const fmt = (n: number) => nf.format(Math.round(n || 0));
const fmtPct = (n: number) => `${(Math.round((n || 0) * 100) / 100).toLocaleString("es-AR")}%`;
const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);
const avg = (nums: number[]) => (nums.length ? sum(nums) / nums.length : 0);

// KPIs del brief sin fuente de datos real hoy (Fase A de auditoría,
// 2026-08-07) — nunca se muestran en cero ni vacíos: se documenta acá por
// qué no hay dato, en vez de inventar uno.
const NO_SOURCE_KPIS = [
  {
    label: "Alcance orgánico vs. pago",
    reason: "Zernio Analytics devuelve un solo \"reach\" agregado — no distingue orgánico de pago.",
  },
  {
    label: "Tasa de finalización de video",
    reason: "El spec de Zernio Analytics no separa video views de full video views, solo un \"views\" genérico.",
  },
  {
    label: "Tiempo promedio de reproducción",
    reason: "No está en la respuesta de Zernio Analytics.",
  },
  {
    label: "Engagement por seguidor",
    reason: "No hay conteo de seguidores guardado en ningún lado — ni tabla propia ni en el endpoint de Zernio.",
  },
  {
    label: "Crecimiento neto de seguidores",
    reason: "Requeriría un snapshot histórico de seguidores que hoy no se persiste.",
  },
  {
    label: "Tasa de finalización de historias",
    reason: "Las Stories corren por un pipeline totalmente aparte que nunca escribe en esta base.",
  },
];

// Insights validados con datos reales (Data/analisis-redes-mejora-continua.md,
// agosto 2026) — semilla de arranque para el motor de insights con IA que
// viene en un commit futuro (no se construye acá). La capa de IA puede
// reemplazar o contrastar cada uno de estos; no se generan dinámicamente.
const SEED_INSIGHTS: { id: string; title: string; body: string; evidence: string }[] = [
  {
    id: "reel-retencion",
    title: "El Reel gana alcance, pero se pierde el mensaje",
    body: "Reel es el formato con mejor alcance (461 promedio) y mejor engagement (3.26% ER) de los tres, pero el tiempo promedio de reproducción es de apenas ~6.9 segundos y casi nadie lo mira completo.",
    evidence: "44 Reels analizados en el año — reach medio 461, ER medio 3.26%, ~6.9s de reproducción promedio, 0.81 full views promedio.",
  },
  {
    id: "hook-primera-persona",
    title: "El gancho directo en primera persona convierte mejor que cualquier Reel",
    body: "Los posts estáticos o carousel con gancho directo en primera persona sobre liderazgo y decisiones dieron el engagement más alto del período — el mejor conversor de audiencia ya instalada, aunque lleguen a menos gente nueva.",
    evidence: '"WhatsApp no es decoración..." ER 27.9% · "Equivocarse no te resta liderazgo..." ER 22.0%.',
  },
  {
    id: "testimonios-series",
    title: 'Testimonios con nombre y series "Parte 1/2/3" generan la señal más fuerte',
    body: "Concentran los guardados y compartidos más altos del año — en una cuenta B2B esa es la señal de intención más fuerte, más que el like.",
    evidence: "Serie sobre negociación: reach 520 / 436 / 237 en publicaciones consecutivas.",
  },
  {
    id: "geo-nea-paraguay",
    title: "La audiencia está concentrada en NEA + Paraguay, no dispersa a nivel nacional",
    body: "Posadas es la ciudad top en ambas redes, seguida de Encarnación y el resto del NEA argentino y Paraguay.",
    evidence: "Posadas 30.9% (Facebook) / 45.7% (Instagram) · Paraguay 19.7-20.2% del total.",
  },
  {
    id: "meseta-horaria",
    title: "No hay un horario mágico único — la audiencia está online de 11h a 23h todos los días",
    body: "Conviene testear franja de mediodía (lunes a miércoles) contra tarde-noche en vez de fijarse en un solo bloque horario.",
    evidence: "Meseta amplia 11h-23h todos los días, con pico puntual lunes 21h (IconSquare).",
  },
  {
    id: "facebook-sin-pulso",
    title: "Facebook va al mismo nivel de detalle que Instagram, pero hoy no tiene pulso propio",
    body: "El bajo rendimiento de Facebook es por falta de trabajo puesto ahí, no por el canal en sí — con el sistema funcionando se espera que se mueva.",
    evidence: "Ventana jul-ago 2026: 0 visitas, 0 interacciones y 0 clics en enlace en casi todos los días. ER del año 1.28% vs. 2.44% de Instagram.",
  },
];

type DetailContent = { title: string; description?: string; content: React.ReactNode };

interface ProposalJoin {
  id: string;
  title: string | null;
  hook: string | null;
  format: string | null;
  status: string | null;
  zernio_post_id: string | null;
  oferta: string | null;
  rendered_image_path: string | null;
  is_test: boolean | null;
}

interface MetricRow {
  id: string;
  proposal_id: string | null;
  post_id: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  impressions: number | null;
  clicks: number | null;
  engagement_rate: number | null;
  measured_at: string;
  proposals: ProposalJoin | null;
}

interface FlaggedMetricRow extends MetricRow {
  isTest: boolean;
}

interface ScheduledProposal {
  id: string;
  title: string | null;
  hook: string | null;
  format: string | null;
  status: string | null;
  scheduled_at: string | null;
}

// lucide-react no incluye íconos de marca (Instagram/Facebook) desde hace
// varias versiones — el badge distingue la red por texto + color, no por
// logo, para no depender de un ícono que no existe en el paquete.
function PlatformBadge({
  platform,
  status,
  url,
}: {
  platform: string;
  status: string;
  url: string | null;
}) {
  const ok = status === "published";
  const label = platform === "instagram" ? "Instagram" : platform === "facebook" ? "Facebook" : platform;
  const badge = (
    <Badge variant={ok ? "default" : "outline"} className="gap-1">
      {label} · {ok ? "publicado" : status}
    </Badge>
  );
  if (!url) return badge;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 hover:opacity-80"
    >
      {badge}
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </a>
  );
}

function KpiTile({
  label,
  value,
  sub,
  tooltip,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="flex h-full w-full flex-col gap-2.5 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-muted-foreground">{label}</span>
            <Info className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
          </div>
          <p className="text-[26px] font-medium leading-none text-primary [font-family:var(--font-display)]">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <DashboardContent />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

function DashboardContent() {
  const { data: documents } = useDocuments();
  const { data: sessions } = useDialogueSessions();
  const { data: proposals } = useProposals();
  const { data: pendingProposals } = usePendingProposals();
  const { data: allMetrics } = useAllMetrics();

  const [showTestRows, setShowTestRows] = useState(false);
  const [detail, setDetail] = useState<DetailContent | null>(null);

  // Desglose por red: solo dato real disponible es status/URL por
  // plataforma, que vive en content/log/historial.json (no en Supabase) —
  // se trae vía raw.githubusercontent.com, mismo host que ya sirve las
  // imágenes publicadas. Si falla, el resto del Dashboard sigue funcionando.
  const { data: platformsByProposal, isError: platformsError } = useQuery({
    queryKey: ["historial-platforms"],
    queryFn: async () => {
      const res = await fetch(HISTORIAL_URL);
      if (!res.ok) throw new Error(`historial.json respondió ${res.status}`);
      const json = await res.json();
      const map = new Map<string, { platform: string; status: string; url: string | null }[]>();
      for (const post of json.posts ?? []) {
        if (post.proposalId) map.set(post.proposalId, post.platforms ?? []);
      }
      return map;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const metricsFlagged: FlaggedMetricRow[] = useMemo(
    () => (allMetrics ?? []).map((m: MetricRow) => ({ ...m, isTest: isTestRow(m) })),
    [allMetrics]
  );
  const testCount = metricsFlagged.filter((m) => m.isTest).length;
  const visibleMetrics = useMemo(
    () => (showTestRows ? metricsFlagged : metricsFlagged.filter((m) => !m.isTest)),
    [metricsFlagged, showTestRows]
  );

  const hasData = (documents?.length ?? 0) > 0 || (sessions?.length ?? 0) > 0;

  // ═══════════════════════════════════════
  // KPIs reales / calculables (Fase A de auditoría, 2026-08-07)
  // ═══════════════════════════════════════
  const reaches = visibleMetrics.map((m) => m.reach ?? 0);
  const impressions = visibleMetrics.map((m) => m.impressions ?? 0);
  const likes = visibleMetrics.map((m) => m.likes ?? 0);
  const comments = visibleMetrics.map((m) => m.comments ?? 0);
  const shares = visibleMetrics.map((m) => m.shares ?? 0);
  const saves = visibleMetrics.map((m) => m.saves ?? 0);
  const engagementTotal = sum(likes) + sum(comments) + sum(shares) + sum(saves);
  const withClicks = visibleMetrics.filter((m) => m.clicks !== null && m.clicks !== undefined);
  const clicksTotal = sum(withClicks.map((m) => m.clicks ?? 0));

  const engagementPerImpression = sum(impressions) > 0 ? (engagementTotal / sum(impressions)) * 100 : 0;
  const engagementPerReach = sum(reaches) > 0 ? (engagementTotal / sum(reaches)) * 100 : 0;

  function openKpiDetail(
    label: string,
    description: string,
    valueOf: (m: FlaggedMetricRow) => number,
    unit = ""
  ) {
    const rows = [...visibleMetrics].sort((a, b) => (valueOf(b) ?? 0) - (valueOf(a) ?? 0));
    setDetail({
      title: label,
      description,
      content: (
        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pieza</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Sin publicaciones con datos todavía.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[280px] truncate">
                      {r.proposals?.hook || r.proposals?.title || "Post sin título"}
                      {r.isTest && (
                        <Badge variant="outline" className="ml-1.5 border-[#F7CC13] text-[#c9a30d]">
                          PRUEBA
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {valueOf(r) === null || valueOf(r) === undefined ? "—" : `${fmt(valueOf(r))}${unit}`}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ),
    });
  }

  function openPieceDetail(m: FlaggedMetricRow) {
    const platforms = platformsByProposal?.get(m.proposals?.id) ?? [];
    setDetail({
      title: m.proposals?.hook || m.proposals?.title || "Pieza",
      description: m.proposals?.format ? `Formato: ${m.proposals.format}` : undefined,
      content: (
        <div className="space-y-3 text-sm">
          {m.proposals?.rendered_image_path && (
            <img
              src={`${RAW_BASE_URL}/${m.proposals.rendered_image_path}`}
              alt=""
              className="max-h-64 w-full rounded-md border border-border object-cover"
            />
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Alcance</p>
              <p className="font-semibold">{fmt(m.reach ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Impresiones</p>
              <p className="font-semibold">{fmt(m.impressions ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Engagement</p>
              <p className="font-semibold">{fmtPct(m.engagement_rate ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Guardados</p>
              <p className="font-semibold">{fmt(m.saves ?? 0)}</p>
            </div>
          </div>
          {platforms.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {platforms.map((p, i) => (
                <PlatformBadge key={i} platform={p.platform} status={p.status} url={p.url} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin desglose por red disponible para esta pieza.</p>
          )}
        </div>
      ),
    });
  }

  const kpiTiles = [
    {
      key: "reach",
      label: "Alcance por publicación",
      value: fmt(avg(reaches)),
      sub: `Total ${fmt(sum(reaches))} en ${visibleMetrics.length} publicaciones`,
      tooltip: "Reach real de Zernio Analytics: cuánta gente única vio cada pieza. Se muestra el promedio por publicación.",
      onClick: () =>
        openKpiDetail("Alcance por publicación", "Reach real por pieza (Zernio Analytics), de mayor a menor.", (m) => m.reach ?? 0),
    },
    {
      key: "impressions",
      label: "Impresiones por publicación",
      value: fmt(avg(impressions)),
      sub: `Total ${fmt(sum(impressions))} en ${visibleMetrics.length} publicaciones`,
      tooltip: "Frecuencia de exposición real (Zernio Analytics), distinta del alcance único. Promedio por publicación.",
      onClick: () =>
        openKpiDetail("Impresiones por publicación", "Impresiones reales por pieza, de mayor a menor.", (m) => m.impressions ?? 0),
    },
    {
      key: "eng-impression",
      label: "Engagement sobre impresión",
      value: fmtPct(engagementPerImpression),
      sub: "(likes+comentarios+shares+guardados) / impresiones",
      tooltip: "Columna generada en Postgres a partir de datos reales de Zernio — estándar de la plataforma para comparar histórico.",
      onClick: () =>
        openKpiDetail("Engagement sobre impresión", "Engagement rate real por pieza, de mayor a menor.", (m) => m.engagement_rate ?? 0, "%"),
    },
    {
      key: "eng-reach",
      label: "Engagement sobre alcance",
      value: fmtPct(engagementPerReach),
      sub: "Calculado sobre datos reales — más representativo de si el que vio, reaccionó",
      tooltip: "Calculable a partir de metrics: (likes+comentarios+shares+guardados) / reach. No viene precalculado en la base.",
      onClick: () =>
        openKpiDetail(
          "Engagement sobre alcance",
          "Por pieza: (likes+comentarios+shares+guardados) / reach, de mayor a menor.",
          (m) => (m.reach ? ((m.likes + m.comments + m.shares + m.saves) / m.reach) * 100 : 0),
          "%"
        ),
    },
    {
      key: "saves",
      label: "Guardados (saves)",
      value: fmt(sum(saves)),
      sub: "La señal de intención más fuerte en B2B, más que el like",
      tooltip: "Total real de guardados (Zernio Analytics) en las publicaciones visibles.",
      onClick: () => openKpiDetail("Guardados (saves)", "Guardados reales por pieza, de mayor a menor.", (m) => m.saves ?? 0),
    },
    {
      key: "shares",
      label: "Compartidos (shares)",
      value: fmt(sum(shares)),
      sub: "Validación social activa — alguien lo recomienda a un tercero",
      tooltip: "Total real de compartidos (Zernio Analytics) en las publicaciones visibles.",
      onClick: () => openKpiDetail("Compartidos (shares)", "Compartidos reales por pieza, de mayor a menor.", (m) => m.shares ?? 0),
    },
    {
      key: "comments",
      label: "Comentarios",
      value: fmt(sum(comments)),
      sub: "Proxy de conversación/consulta, más valioso que el like en servicios",
      tooltip: "Total real de comentarios (Zernio Analytics) en las publicaciones visibles.",
      onClick: () => openKpiDetail("Comentarios", "Comentarios reales por pieza, de mayor a menor.", (m) => m.comments ?? 0),
    },
    {
      key: "clicks",
      label: "Clics al enlace",
      value: withClicks.length > 0 ? fmt(clicksTotal) : "—",
      sub:
        withClicks.length > 0
          ? `${withClicks.length}/${visibleMetrics.length} publicaciones con datos de clics`
          : "Columna agregada el 2026-08-07 — esperando que el collector corra sobre estas piezas",
      tooltip:
        "Zernio Analytics ya lo devolvía; metrics-collector lo descartaba al mapear hasta el 2026-08-07. Filas previas a esa fecha quedan sin dato (no en cero) hasta la próxima recolección.",
      onClick: () =>
        openKpiDetail(
          "Clics al enlace",
          "Clics reales por pieza (solo las que ya tienen dato recolectado), de mayor a menor.",
          (m) => m.clicks,
          ""
        ),
    },
  ];

  // Rendimiento por formato (2do KPI calculable: alcance/engagement
  // promedio por formato) — se muestra como tabla, no como tile único,
  // porque es inherentemente una comparación entre formatos.
  const formatPerf = useMemo(() => {
    const groups: Record<string, FlaggedMetricRow[]> = {};
    for (const m of visibleMetrics) {
      const f = m.proposals?.format || "post";
      (groups[f] ??= []).push(m);
    }
    return Object.entries(groups)
      .map(([format, items]) => ({
        format,
        count: items.length,
        avgReach: avg(items.map((m) => m.reach ?? 0)),
        avgEngagement: avg(items.map((m) => m.engagement_rate ?? 0)),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }, [visibleMetrics]);

  const ranking = useMemo(
    () => [...visibleMetrics].sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0)).slice(0, 5),
    [visibleMetrics]
  );

  const publishedWithPlatforms = visibleMetrics.filter((m) => m.proposals?.status === "published");

  // Chart de engagement por post (real, no mock) — antes mezclaba filas
  // [TEST/QA] sin avisar (bug señalado en el brief); ahora sale de
  // visibleMetrics (ya respeta el toggle) y marca visualmente las de prueba.
  const engagementData = [...visibleMetrics]
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
    .slice(-7)
    .map((m) => ({
      name: (m.proposals?.hook || m.proposals?.title || "Post").slice(0, 15),
      engagement: Math.round((m.engagement_rate || 0) * 100) / 100,
      isTest: m.isTest,
    }));

  // Reemplaza calendar_events (tabla legacy dropeada en la Fase 0 del plan
  // estratégico 2026-08-16, confirmada vacía y sin caller real) — la fuente
  // real siempre fue proposals.scheduled_at, igual que en Calendario.tsx.
  const nowTs = Date.now();
  const in7Days = nowTs + 7 * 24 * 60 * 60 * 1000;
  const scheduledUpcoming: ScheduledProposal[] = (proposals || [])
    .filter((p: ScheduledProposal) => p.status === "scheduled" && p.scheduled_at)
    .filter((p: ScheduledProposal) => {
      const t = new Date(p.scheduled_at as string).getTime();
      return t >= nowTs && t <= in7Days;
    })
    .sort(
      (a: ScheduledProposal, b: ScheduledProposal) =>
        new Date(a.scheduled_at as string).getTime() - new Date(b.scheduled_at as string).getTime()
    );

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
      accentClassName: "text-[#c9a30d]",
    },
    {
      label: "Publicaciones programadas",
      value: String(scheduledUpcoming.length),
      sub: "Vía Zernio, próximos 7 días",
      href: "/calendario",
      icon: Clock,
      accentClassName: "text-primary",
    },
  ];

  const formatCounts: Record<string, number> = {};
  proposals?.forEach((p: any) => {
    const format = p.format || "post";
    formatCounts[format] = (formatCounts[format] || 0) + 1;
  });
  const formatData = Object.entries(formatCounts).map(([name, value]) => ({ name, value }));

  const recentActivity = (proposals || [])
    .filter((p: any) => p.status === "published" || p.status === "scheduled" || p.status === "pending")
    .map((p: any) => ({
      ...p,
      displayDate: p.published_at || p.scheduled_at || p.created_at,
    }))
    .sort((a: any, b: any) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime())
    .slice(0, 5);

  const lastSync = visibleMetrics.reduce<string | null>((latest, m) => {
    if (!m.measured_at) return latest;
    return !latest || new Date(m.measured_at) > new Date(latest) ? m.measured_at : latest;
  }, null);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-medium leading-tight text-primary">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Centro de control del Estratega Digital Autónomo
            {lastSync && (
              <>
                {" "}
                · última métrica sincronizada:{" "}
                {new Date(lastSync).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2">
          <Switch id="show-test-rows" checked={showTestRows} onCheckedChange={setShowTestRows} />
          <label htmlFor="show-test-rows" className="cursor-pointer text-xs font-medium">
            Mostrar filas de prueba
            {testCount > 0 && (
              <span className="ml-1.5 text-muted-foreground">
                ({testCount} excluida{testCount === 1 ? "" : "s"} por defecto)
              </span>
            )}
          </label>
        </div>
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

      {/* Resumen operativo del sistema */}
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

      {/* Copiloto Reflexivo (Fase 4 del plan estratégico 2026-08-16) */}
      <CopilotCard />

      {/* KPIs reales de rendimiento social (Fase A, 2026-08-07) */}
      <div>
        <h2 className="mb-3 text-[17px] font-medium">Rendimiento real (Instagram + Facebook)</h2>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {kpiTiles.map((t) => (
            <KpiTile key={t.key} label={t.label} value={t.value} sub={t.sub} tooltip={t.tooltip} onClick={t.onClick} />
          ))}
        </div>
      </div>

      {/* KPIs sin fuente conectada */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px] font-medium">KPIs sin fuente de datos conectada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Definidos en el brief de rediseño, pero ninguna fuente real los provee hoy — no se inventan, se documentan.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {NO_SOURCE_KPIS.map((k) => (
              <div key={k.label} className="flex items-start gap-2.5 text-[13px]">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <span className="font-medium">{k.label}</span>
                  <span className="text-muted-foreground"> — {k.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumen por red */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px] font-medium">Resumen por red</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Total combinado (Instagram + Facebook)</p>
            <p className="text-2xl font-medium text-primary [font-family:var(--font-display)]">
              {visibleMetrics.length} pieza{visibleMetrics.length === 1 ? "" : "s"} con métricas reales
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Zernio Analytics devuelve un agregado único por post — no hay desglose de alcance/likes/etc. entre
              Instagram y Facebook cuando la misma pieza sale en ambas redes. Lo que sí es real por red es el status
              de publicación y el link (abajo).
            </span>
          </div>
          {platformsError && (
            <p className="text-xs text-destructive">
              No se pudo traer el desglose por red ahora mismo (historial.json). El resto del Dashboard sigue funcionando normal.
            </p>
          )}
          {publishedWithPlatforms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay piezas publicadas con métricas.</p>
          ) : (
            <div className="flex flex-col">
              {publishedWithPlatforms.slice(0, 6).map((m) => {
                const platforms = platformsByProposal?.get(m.proposals?.id) ?? [];
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => openPieceDetail(m)}
                    className="flex flex-wrap items-center gap-2 border-b border-border py-2.5 text-left last:border-0 hover:bg-muted/40"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {m.proposals?.hook || m.proposals?.title}
                    </span>
                    {platforms.length > 0 ? (
                      platforms.map((p, i) => <PlatformBadge key={i} platform={p.platform} status={p.status} url={p.url} />)
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin desglose por red</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
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
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="engagement" radius={[4, 4, 0, 0]} name="Engagement %">
                    {engagementData.map((d, i) => (
                      <Cell key={i} fill={d.isTest ? "#F7CC13" : "#1A3D84"} />
                    ))}
                  </Bar>
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
                  <RechartsTooltip />
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

      {/* Rendimiento por formato (2do KPI calculable) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px] font-medium">Alcance y engagement promedio por formato</CardTitle>
        </CardHeader>
        <CardContent>
          {formatPerf.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin métricas todavía para comparar formatos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formato</TableHead>
                  <TableHead className="text-right">Piezas</TableHead>
                  <TableHead className="text-right">Alcance promedio</TableHead>
                  <TableHead className="text-right">Engagement promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formatPerf.map((f) => (
                  <TableRow key={f.format}>
                    <TableCell className="font-medium capitalize">{f.format}</TableCell>
                    <TableCell className="text-right">{f.count}</TableCell>
                    <TableCell className="text-right">{fmt(f.avgReach)}</TableCell>
                    <TableCell className="text-right">{fmtPct(f.avgEngagement)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ranking de piezas más exitosas */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <Trophy className="h-4 w-4 text-[#c9a30d]" />
          <CardTitle className="text-[17px] font-medium">Ranking de piezas más exitosas</CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin piezas con métricas todavía.</p>
          ) : (
            <div className="flex flex-col">
              {ranking.map((m, i) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => openPieceDetail(m)}
                  className="flex items-center gap-3.5 border-b border-border py-3 text-left last:border-0 hover:bg-muted/40"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  {m.proposals?.rendered_image_path ? (
                    <img
                      src={`${RAW_BASE_URL}/${m.proposals.rendered_image_path}`}
                      alt=""
                      className="h-10 w-10 flex-shrink-0 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[13.5px] font-semibold">
                        {m.proposals?.hook || m.proposals?.title || "Post sin título"}
                      </p>
                      {m.isTest && (
                        <Badge variant="outline" className="flex-shrink-0 border-[#F7CC13] text-[#c9a30d]">
                          PRUEBA
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11.5px] text-muted-foreground">
                      {m.proposals?.format || "post"} · alcance {fmt(m.reach ?? 0)}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">
                    {fmtPct(m.engagement_rate ?? 0)}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights semilla */}
      <div>
        <h2 className="mb-1 text-[17px] font-medium">Insights</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Análisis validado con datos reales (Meta Business Suite + IconSquare, agosto 2026) — semilla de arranque
          hasta que el motor de insights con IA se conecte.
        </p>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {SEED_INSIGHTS.map((insight) => (
            <Card key={insight.id}>
              <CardContent className="flex h-full flex-col gap-2 p-4">
                <Badge variant="secondary" className="w-fit text-[10px]">
                  Validado con datos reales
                </Badge>
                <p className="text-[13.5px] font-semibold leading-snug">{insight.title}</p>
                <p className="flex-1 text-[12.5px] text-muted-foreground">{insight.body}</p>
                <p className="border-t border-border pt-2 text-[11px] text-muted-foreground/80">{insight.evidence}</p>
              </CardContent>
            </Card>
          ))}
        </div>
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

      {/* Últimas publicaciones */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[17px] font-medium">Últimas publicaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <History className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Todavía no hay propuestas publicadas, programadas ni pendientes.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {recentActivity.map((p: any) => {
                const statusMeta = STATUS_META[p.status] ?? STATUS_META.pending;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3.5 border-b border-border py-3 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">
                        {p.hook || p.title || p.dialogue_sessions?.topic || "Sin título"}
                      </p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {statusMeta.dateLabel}:{" "}
                        {new Date(p.displayDate).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      {p.format || "post"}
                    </Badge>
                    <Badge variant={statusMeta.variant} className="flex-shrink-0">
                      {statusMeta.label}
                    </Badge>
                  </div>
                );
              })}
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
          {scheduledUpcoming.length === 0 ? (
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
              {scheduledUpcoming.slice(0, 7).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3.5 border-b border-border py-3 last:border-0"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{e.hook || e.title || "Sin título"}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {new Date(e.scheduled_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">{e.format || "post"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
            {detail?.description && <DialogDescription>{detail.description}</DialogDescription>}
          </DialogHeader>
          {detail?.content}
        </DialogContent>
      </Dialog>
    </div>
  );
}
