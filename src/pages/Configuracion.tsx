import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Brain, Paintbrush, Shield, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

const agents = [
  {
    id: "estratega",
    label: "Agente Estratega",
    description: "Propone temas, ángulos y estrategia general.",
    icon: Brain,
    defaultProvider: "groq",
    defaultModel: "llama-4-scout-8b-instruct",
    defaultTemp: 0.8,
  },
  {
    id: "creativo",
    label: "Agente Creativo",
    description: "Redacta copys y sugiere dirección visual.",
    icon: Paintbrush,
    defaultProvider: "groq",
    defaultModel: "llama-4-scout-8b-instruct",
    defaultTemp: 0.9,
  },
  {
    id: "critico",
    label: "Agente Crítico",
    description: "Revisa contra los documentos de marca y aprueba o rechaza.",
    icon: Shield,
    defaultProvider: "deepseek",
    defaultModel: "deepseek-chat",
    defaultTemp: 0.3,
  },
];

export default function Configuracion() {
  const [config, setConfig] = useState(
    Object.fromEntries(
      agents.map((a) => [
        a.id,
        { provider: a.defaultProvider, model: a.defaultModel, temperature: a.defaultTemp },
      ])
    )
  );

  const handleSave = () => {
    localStorage.setItem("eda-agent-config", JSON.stringify(config));
    toast({ title: "Configuración guardada", description: "Los agentes usarán los modelos seleccionados." });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">
          Asigna un modelo de IA a cada agente del sistema.
        </p>
      </div>

      <div className="grid gap-6">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <agent.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
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
                    value={config[agent.id]?.provider}
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
                      <SelectItem value="groq">Groq (Llama 4 Scout)</SelectItem>
                      <SelectItem value="deepseek">DeepSeek V3.2</SelectItem>
                      <SelectItem value="gemini">Gemini 1.5 Flash</SelectItem>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperatura ({config[agent.id]?.temperature})</Label>
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config[agent.id]?.temperature || 0.7}
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

      <Button size="lg" onClick={handleSave}>
        <Save className="mr-2 h-4 w-4" />
        Guardar configuración
      </Button>
    </div>
  );
}
