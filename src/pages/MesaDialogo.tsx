import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";

export default function MesaDialogo() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Mesa de Diálogo
          </h1>
          <p className="mt-1 text-muted-foreground">
            Los agentes debaten y crean contenido basado en tu marca.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva sesión
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            Ninguna sesión activa
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Inicia una nueva sesión para que el Estratega, Creativo y Crítico
            trabajen juntos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
