import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

// PM4 (auditoría 2026-08-31): AUTONOMOUS_FORMATS / isAutonomousFormat viven en
// src/shared/constants.ts — una sola fuente para el frontend.
import { isAutonomousFormat } from "@/shared/constants";

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
