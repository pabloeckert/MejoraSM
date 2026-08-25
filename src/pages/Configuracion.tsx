import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Brain, Paintbrush, Shield, Save, Loader2, Info, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
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

const providers = [
  { value: "groq", label: "Groq (Llama 4 Scout)" },
  { value: "deepseek", label: "DeepSeek V3.2" },
  { value: "gemini", label: "Gemini 1.5 Flash" },
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
      // Defaults
      setConfig(
        Object.fromEntries(
          agentDefs.map((a) => [
            a.id,
            {
              provider: a.id === "critico" ? "deepseek" : "groq",
              model: a.id === "critico" ? "deepseek-chat" : "llama-4-scout-8b-instruct",
              temperature: a.id === "estratega" ? 0.8 : a.id === "creativo" ? 0.9 : 0.3,
              system_prompt: "",
            },
          ])
        )
      );
    }
  }, [dbConfig, isLoading]);

  // Bloquea el guardado si algún agente quedó con el prompt vacío —
  // hallazgo real de auditoría 2026-08-25: `system_prompt` es la primera
  // línea real que ve cada agente en producción (orchestrator/index.ts,
  // runEstratega/runCreativo/runCritico), y hasta ahora ni siquiera se
  // podía editar desde acá; si alguna vez esta pantalla guardaba sin ese
  // campo en el payload y la fila no existía todavía, se insertaba con
  // system_prompt NULL — el agente corría con "null" literal como primera
  // línea de su personalidad, sin ningún error visible en ningún lado.
  const hasEmptyPrompt = Object.values(config).some((c) => !c.system_prompt?.trim());

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: AgentConfigState) => {
      for (const [id, cfg] of Object.entries(newConfig)) {
        const { error } = await supabase
          .from("agent_config")
          .upsert({
            id,
            provider: cfg.provider,
            model: cfg.model,
            temperature: cfg.temperature,
            system_prompt: cfg.system_prompt,
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-config"] });
      // Also save to localStorage as backup
      localStorage.setItem("eda-agent-config", JSON.stringify(config));
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

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Proveedor y Modelo son informativos.</span> El sistema
            elige automáticamente Claude Sonnet (o Claude Opus para el Crítico al reevaluar una corrección) sin
            importar lo que se elija acá — cambiarlos no modifica qué modelo corre en producción. Lo que sí tiene
            efecto real es el <span className="font-medium text-foreground">prompt</span> y la{" "}
            <span className="font-medium text-foreground">temperatura</span> de cada agente.
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
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`${agent.id}-provider`}>Proveedor</Label>
                    <Select
                      value={cfg?.provider || "groq"}
                      onValueChange={(v) =>
                        setConfig((c) => ({
                          ...c,
                          [agent.id]: { ...c[agent.id], provider: v },
                        }))
                      }
                    >
                      <SelectTrigger id={`${agent.id}-provider`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${agent.id}-model`}>Modelo</Label>
                    <Input
                      id={`${agent.id}-model`}
                      value={cfg?.model || ""}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          [agent.id]: { ...c[agent.id], model: e.target.value },
                        }))
                      }
                      placeholder="ej: llama-4-scout-8b-instruct"
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
                    <Input
                      id={`${agent.id}-temp`}
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      aria-valuetext={temperatureLabel(agent.id, cfg?.temperature ?? 0.7)}
                      value={cfg?.temperature ?? 0.7}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          [agent.id]: {
                            ...c[agent.id],
                            temperature: parseFloat(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        size="lg"
        onClick={() => saveMutation.mutate(config)}
        disabled={saveMutation.isPending || hasEmptyPrompt}
        title={hasEmptyPrompt ? "Completá el prompt de todos los agentes antes de guardar" : undefined}
      >
        {saveMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Guardar configuración
      </Button>
    </div>
  );
}
