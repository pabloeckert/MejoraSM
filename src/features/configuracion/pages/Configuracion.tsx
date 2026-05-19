import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Brain, Paintbrush, Shield, Save, Loader2, Info } from "lucide-react";
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
      return data;
    },
  });

  const [config, setConfig] = useState<Record<string, { provider: string; model: string; temperature: number }>>({});

  // Initialize from DB or defaults
  useEffect(() => {
    if (dbConfig && dbConfig.length > 0) {
      const mapped = Object.fromEntries(
        dbConfig.map((c: any) => [
          c.id,
          { provider: c.provider, model: c.model, temperature: c.temperature },
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
            },
          ])
        )
      );
    }
  }, [dbConfig, isLoading]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: typeof config) => {
      // Upsert each agent config
      for (const [id, cfg] of Object.entries(newConfig)) {
        const { error } = await supabase
          .from("agent_config")
          .upsert({
            id,
            provider: cfg.provider,
            model: cfg.model,
            temperature: cfg.temperature,
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
        description: "Los modelos se actualizaron en la base de datos.",
      });
    },
    onError: (err: any) => {
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
          Asigná un modelo de IA a cada agente del sistema. Los cambios se guardan en la base de datos.
        </p>
      </div>

      <div className="grid gap-6">
        {agentDefs.map((agent) => (
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
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select
                    value={config[agent.id]?.provider || "groq"}
                    onValueChange={(v) =>
                      setConfig((c) => ({
                        ...c,
                        [agent.id]: { ...c[agent.id], provider: v },
                      }))
                    }
                  >
                    <SelectTrigger>
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
                  <Label>Modelo</Label>
                  <Input
                    value={config[agent.id]?.model || ""}
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
                    <Label>Temperatura ({config[agent.id]?.temperature ?? 0.7})</Label>
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
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config[agent.id]?.temperature ?? 0.7}
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
        ))}
      </div>

      <Button
        size="lg"
        onClick={() => saveMutation.mutate(config)}
        disabled={saveMutation.isPending}
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
