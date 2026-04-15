import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Image, CalendarDays } from "lucide-react";

const stats = [
  { label: "Documentos en Bóveda", value: "0", icon: FileText },
  { label: "Diálogos creados", value: "0", icon: MessageSquare },
  { label: "Contenidos generados", value: "0", icon: Image },
  { label: "Publicaciones programadas", value: "0", icon: CalendarDays },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Centro de control del Estratega Digital Autónomo
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
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
        ))}
      </div>

      {/* Pending approvals placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aprobaciones pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay contenido pendiente de aprobación.
          </p>
        </CardContent>
      </Card>

      {/* Calendar placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendario de contenido</CardTitle>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Conecta tu calendario para ver publicaciones programadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
