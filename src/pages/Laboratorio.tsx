import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FlaskConical } from "lucide-react";

export default function Laboratorio() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Laboratorio de Contenido
          </h1>
          <p className="mt-1 text-muted-foreground">
            Sube fotos o videos y recibe 3 propuestas estratégicas al instante.
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Subir media
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FlaskConical className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            Laboratorio vacío
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Sube una imagen o video para que la IA genere propuestas de uso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
