import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

// Mismo universo real que usa orchestrator (AUTO_PUBLISH_FORMATS) — post y
// carrusel se agendan y publican solos; el resto (historia, y "video" que
// ni siquiera está permitido por proposals_format_check) requiere acción
// manual. Ver CLAUDE.md, "Arquitectura: publicación autónoma de posts de
// feed" — no confundir con AUTO_PUBLISH_FORMATS del backend, que es la
// misma lista pero no se puede importar directo del Edge Function.
export const AUTONOMOUS_FORMATS = ["post", "carrusel"];

export function isAutonomousFormat(format?: string | null): boolean {
  return AUTONOMOUS_FORMATS.includes(format || "");
}

// Badge compartido entre Propuestas y Calendario — antes esta distinción no
// se veía en ningún lado, lo que daba la sensación de que "no sirve para
// nada" cuando en realidad post/carrusel ya corren solos.
export function PipelineBadge({ format, className }: { format?: string | null; className?: string }) {
  const autonomous = isAutonomousFormat(format);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "gap-1",
            autonomous ? "border-primary/40 text-primary" : "border-[#F7CC13] text-[#c9a30d]",
            className
          )}
        >
          {autonomous ? <Zap className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
          {autonomous ? "Se publica solo" : "Acción manual"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-[220px] text-xs">
        {autonomous
          ? "Este formato se agenda y publica solo apenas el Crítico lo aprueba — nadie tiene que apretar nada."
          : "Este formato no tiene pipeline autónomo todavía — necesita aprobación y gestión manual."}
      </TooltipContent>
    </Tooltip>
  );
}
