import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Paintbrush, Shield, Save, Loader2, Info, History } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { dimensionLabel } from "@/shared/constants";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const agentDefs = [
  {
    id: "estratega",
    label: "Agente Estratega",
    description: "Propone temas, ángulos y estrategia general.",
    icon: Brain,
    tip: "Temperatura alta = más creatividad, menos previsibilidad. Ideal para generar ideas frescas.",
  },
  {
    id: "creativo",
    label: "Agente Creativo",
    description: "Redacta copys y sugiere dirección visual.",
    icon: Paintbrush,
    tip: "Temperatura muy alta puede generar textos incoherentes. 0.8-0.9 es un buen balance.",
  },
  {
    id: "critico",
    label: "Agente Crítico",
    description: "Revisa contra los documentos de marca y aprueba o rechaza.",
    icon: Shield,
    tip: "Temperatura baja = más consistente y estricto. El crítico debe ser predecible.",
  },
];

interface AgentConfigRow {
  id: string;
  provider: string;
  model: string;
  temperature: number;
  system_prompt: string;
}

type AgentConfigState = Record<string, { provider: string; model: string; temperature: number; system_prompt: string }>;

function temperatureLabel(agentId: string, value: number): string {
  const intensity = value <= 0.3 ? "baja" : value <= 0.7 ? "media" : "alta";
  return `${value}, creatividad ${intensity}`;
}

export default function Configuracion() {
  return (
    <ErrorBoundary>
      <ConfiguracionContent />
    </ErrorBoundary>
  );
}

function ConfiguracionContent() {
  const queryClient = useQueryClient();

  // Load from Supabase
  const { data: dbConfig, isLoading } = useQuery({
    queryKey: ["agent-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_config")
        .select("*")
        .order("id");
      if (error) throw error;
      return data as AgentConfigRow[];
    },
  });

  const [config, setConfig] = useState<AgentConfigState>({});

  // Initialize from DB or defaults
  useEffect(() => {
    if (dbConfig && dbConfig.length > 0) {
      const mapped = Object.fromEntries(
        dbConfig.map((c) => [
          c.id,
          { provider: c.provider, model: c.model, temperature: c.temperature, system_prompt: c.system_prompt || "" },
        ])
      );
      setConfig(mapped);
    } else if (!isLoading) {
      // Defaults — provider/model son ignorados por pickModel() desde el
      // 2026-08-05, se guardan solo para no dejar la columna NULL.
      setConfig(
        Object.fromEntries(
          agentDefs.map((a) => [
            a.id,
            {
              provider: "anthropic",
              model: "auto",
              temperature: a.id === "estratega" ? 0.8 : a.id === "creativo" ? 0.9 : 0.3,
              system_prompt: "",
            },
          ])
        )
      );
    }
  }, [dbConfig, isLoading]);

  // UX19 (auditoría 2026-08-31): sin esto, editar un prompt y navegar afuera
  // perdía el cambio en silencio — para el campo que es "la primera línea de
  // cada agente en producción".
  const isDirty =
    !!dbConfig &&
    dbConfig.some((c) => {
      const cur = config[c.id];
      return cur && (cur.system_prompt !== (c.system_prompt || "") || cur.temperature !== c.temperature);
    });

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Bloquea el guardado si algún agente quedó con el prompt vacío —
  // hallazgo real de auditoría 2026-08-25: `system_prompt` es la primera
  // línea real que ve cada agente en producción (orchestrator/index.ts,
  // runEstratega/runCreativo/runCritico), y hasta ahora ni siquiera se
  // podía editar desde acá; si alguna vez esta pantalla guardaba sin ese
  // campo en el payload y la fila no existía todavía, se insertaba con
  // system_prompt NULL — el agente corría con "null" literal como primera
  // línea de su personalidad, sin ningún error visible en ningún lado.
  const hasEmptyPrompt = Object.values(config).some((c) => !c.system_prompt?.trim());

  // Save mutation — B29 (auditoría 2026-08-31): antes hacía un upsert por fila
  // en un loop, no transaccional; si fallaba el 2º de 3, el 1º quedaba guardado
  // y la UI inconsistente con la base. Ahora un solo upsert con las 3 filas.
  const saveMutation = useMutation({
    mutationFn: async (newConfig: AgentConfigState) => {
      const rows = Object.entries(newConfig).map(([id, cfg]) => ({
        id,
        provider: cfg.provider,
        model: cfg.model,
        temperature: cfg.temperature,
        system_prompt: cfg.system_prompt,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("agent_config").upsert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-config"] });
      toast({
        title: "Configuración guardada",
        description: "El prompt y la temperatura de cada agente ya están activos.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Error al guardar",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="mt-1 text-muted-foreground">Cargando configuración...</p>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-32 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">
          Personalidad y criterio de cada agente del sistema.
        </p>
      </div>

      <Card className="border-info/40 bg-info/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-sm text-muted-foreground">
            El modelo lo elige el sistema automáticamente
            (<code className="text-xs">pickModel()</code> en <code className="text-xs">orchestrator</code>): Claude
            Sonnet para el Estratega y el Creativo, y Claude Opus para el Crítico cuando reevalúa una corrección.
            Acá se editan el <span className="font-medium text-foreground">prompt</span> y la{" "}
            <span className="font-medium text-foreground">temperatura</span> — lo que sí cambia el comportamiento en
            producción.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {agentDefs.map((agent) => {
          const cfg = config[agent.id];
          const promptEmpty = !cfg?.system_prompt?.trim();
          return (
            <Card key={agent.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <agent.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{agent.label}</CardTitle>
                    <CardDescription>{agent.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${agent.id}-prompt`}>
                    Prompt del agente {promptEmpty && <span className="text-destructive">(vacío — no se puede guardar así)</span>}
                  </Label>
                  <Textarea
                    id={`${agent.id}-prompt`}
                    value={cfg?.system_prompt || ""}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        [agent.id]: { ...c[agent.id], system_prompt: e.target.value },
                      }))
                    }
                    rows={3}
                    className={promptEmpty ? "border-destructive" : undefined}
                    placeholder="Ej: Sos el Agente Estratega de MejoraOK. Tu trabajo es proponer temas..."
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${agent.id}-temp`}>Temperatura ({cfg?.temperature ?? 0.7})</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{agent.tip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <input
                    id={`${agent.id}-temp`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    aria-valuetext={temperatureLabel(agent.id, cfg?.temperature ?? 0.7)}
                    value={cfg?.temperature ?? 0.7}
                    className="w-full max-w-xs accent-primary"
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        [agent.id]: { ...c[agent.id], temperature: parseFloat(e.target.value) },
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="lg"
          onClick={() => saveMutation.mutate(config)}
          disabled={saveMutation.isPending || hasEmptyPrompt || !isDirty}
          title={hasEmptyPrompt ? "Completá el prompt de todos los agentes antes de guardar" : undefined}
        >
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar configuración
        </Button>
        {isDirty && <span className="text-sm text-amber-600">Hay cambios sin guardar</span>}
      </div>

      <SystemDecisions />
    </div>
  );
}

// D4 (auditoría 2026-08-31): la pantalla de Configuración debía volverse
// también "de supervisión" — ver qué decidió el sistema y por qué, no solo
// ajustar prompts. Esto lee las últimas sesiones reales de Mesa de Diálogo
// (dialogue_sessions.metadata, que orchestrator ya escribe) y muestra el
// veredicto del Crítico + si se autoagendó. El modelo por sesión no se
// loguea hoy, pero la regla es fija y está arriba (pickModel).
interface DecisionRow {
  id: string;
  topic: string | null;
  status: string | null;
  created_at: string;
  metadata: {
    evaluacion?: { aprobado?: boolean; feedback?: string };
    autoPublished?: boolean;
    oferta?: string | null;
    autoTopic?: string | null;
    forcedByHuman?: boolean;
  } | null;
}

function SystemDecisions() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["system-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dialogue_sessions")
        .select("id, topic, status, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data || []) as DecisionRow[];
    },
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Últimas decisiones del sistema</CardTitle>
            <CardDescription>Qué resolvió el Crítico en Mesa de Diálogo y qué se agendó solo.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">No se pudieron cargar las decisiones.</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay sesiones de Mesa de Diálogo.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((d) => {
              const aprobado = d.metadata?.evaluacion?.aprobado;
              // forceApprove no escribe metadata.evaluacion (no pasó por el
              // Crítico) — sin esta rama, una sesión forzada caía al último
              // else y mostraba el string crudo de la base ("approved") en
              // vez de una etiqueta real, y no quedaba ningún indicio de que
              // fue una decisión humana — justo lo que esta pantalla existe
              // para mostrar.
              const veredicto = d.metadata?.forcedByHuman
                ? { label: "Forzada por Pablo", variant: "default" as const }
                : d.status === "error"
                  ? { label: "Error", variant: "destructive" as const }
                  : aprobado === true
                    ? { label: "Aprobada", variant: "secondary" as const }
                    : aprobado === false
                      ? { label: "Frenada", variant: "outline" as const }
                      : { label: d.status || "En curso", variant: "outline" as const };
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {d.topic || "(sin tema)"}
                    {d.metadata?.autoTopic && <span className="ml-1.5 text-[11px] text-muted-foreground">· tema propuesto por el sistema</span>}
                  </span>
                  <Badge variant={veredicto.variant} className="text-[10px]">{veredicto.label}</Badge>
                  {d.metadata?.autoPublished && (
                    <span className="text-[11px] font-medium text-primary">
                      se agendó solo{d.metadata.oferta ? ` · ${dimensionLabel(d.metadata.oferta)}` : ""}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
