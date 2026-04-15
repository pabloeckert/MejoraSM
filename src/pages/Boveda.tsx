import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";

export default function Boveda() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bóveda de Conocimiento
          </h1>
          <p className="mt-1 text-muted-foreground">
            Sube tus manuales de marca, buyer persona y tono de voz.
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Subir documento
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            No hay documentos aún
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Sube tu primer documento para alimentar el criterio de los agentes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
