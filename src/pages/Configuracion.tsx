import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Brain, Paintbrush, Shield, Save } from "lucide-react";

const agents = [
  {
    id: "estratega",
    label: "Agente Estratega",
    description: "Propone temas, ángulos y estrategia general.",
    icon: Brain,
  },
  {
    id: "creativo",
    label: "Agente Creativo",
    description: "Redacta copys y sugiere dirección visual.",
    icon: Paintbrush,
  },
  {
    id: "critico",
    label: "Agente Crítico",
    description: "Revisa contra los documentos de marca y aprueba o rechaza.",
    icon: Shield,
  },
];

export default function Configuracion() {
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
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select defaultValue="lovable">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lovable">Lovable AI (por defecto)</SelectItem>
                    <SelectItem value="groq">Groq (Llama)</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>API Key (solo si usas Groq o DeepSeek)</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Las claves se almacenan de forma segura en Lovable Cloud.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button size="lg">
        <Save className="mr-2 h-4 w-4" />
        Guardar configuración
      </Button>
    </div>
  );
}
