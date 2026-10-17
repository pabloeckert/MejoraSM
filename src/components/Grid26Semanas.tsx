// src/components/Grid26Semanas.tsx
// GRILLA EVERGREEN DE 26 SEMANAS Y MOTOR VISUAL DE ENCUADRE (FRAMING ENGINE)
// Cumplimiento estricto: Regla 80% Jabs / 20% Right Hooks · 0% Recorte de Rostros · blur(28px)

import { useState } from "react";
import {
  PropuestaMejoraSMDTO,
  OpcionBorrador,
  CanalDestino,
} from "@/domain/types";
import { TargetAspectRatio } from "@/domain/framingEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CheckCircle2,
  Send,
  ArrowRight,
  Eye,
  Layers,
  Sparkles,
} from "lucide-react";
import { getAssetUrl } from "@/components/ProposalDetailDialog";

export interface Grid26SemanasProps {
  proposals: PropuestaMejoraSMDTO[];
  activeWeek: number;
  onApprove: (id: string) => void;
  onPublish: (id: string) => void;
  onSelectDraft: (id: string, opcion: OpcionBorrador) => void;
  onOpenDetail: (propuesta: PropuestaMejoraSMDTO) => void;
}

const DEFAULT_PHOTO = "content/boveda/04_networking/img_clevel_rosario_2026.jpg";

export function Grid26Semanas({
  proposals,
  activeWeek,
  onApprove,
  onPublish,
  onSelectDraft,
  onOpenDetail,
}: Grid26SemanasProps) {
  // Estado local para selector de ratio del Framing Engine por propuesta (por defecto 4:5)
  const [aspectRatios, setAspectRatios] = useState<Record<string, TargetAspectRatio>>({});

  const getRatio = (propuestaId: string): TargetAspectRatio => {
    return aspectRatios[propuestaId] || "4:5";
  };

  const handleRatioChange = (propuestaId: string, ratio: TargetAspectRatio) => {
    setAspectRatios((prev) => ({ ...prev, [propuestaId]: ratio }));
  };

  if (proposals.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-8">
        <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">No hay propuestas con los filtros seleccionados.</p>
        <p className="text-xs text-slate-400 mt-1">Elegí otra semana o cambiá los filtros superiores.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {proposals.map((propuesta) => {
        const borrador =
          propuesta.borradores.find((b) => b.opcion === propuesta.borrador_seleccionado) ||
          propuesta.borradores[0];

        const isJab = borrador.estrategia !== "right_hook_conversion";
        const isApproved = propuesta.estado === "aprobado";
        const isPending = propuesta.estado === "pendiente_revision";
        const isPublished = propuesta.estado === "publicado";

        const currentRatio = getRatio(propuesta.propuesta_id);
        const imgRuta = propuesta.imagen_boveda_vinculada?.ruta_archivo_local || DEFAULT_PHOTO;

        // Clases de ratio para el contenedor visual
        const aspectClass =
          currentRatio === "1:1"
            ? "aspect-square"
            : currentRatio === "9:16"
            ? "aspect-[9/16]"
            : "aspect-[4/5]";

        return (
          <Card
            key={propuesta.propuesta_id}
            data-testid={`card-${propuesta.propuesta_id}`}
            className="overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between rounded-xl"
          >
            <CardContent className="p-4 space-y-3.5">
              {/* TOP BAR: ID + CANAL + ESTRATEGIA */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-blue-900 tracking-tight">
                  {propuesta.propuesta_id}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-semibold text-slate-700 bg-slate-50 border-slate-300"
                  >
                    {propuesta.canal_destino}
                  </Badge>
                  <Badge
                    variant={isJab ? "default" : "destructive"}
                    className={`text-[10px] font-bold ${
                      isJab ? "bg-[#1A3D84] text-white" : "bg-[#E1061E] text-white"
                    }`}
                  >
                    {isJab ? "Jab (80%)" : "Right Hook (20%)"}
                  </Badge>
                </div>
              </div>

              {/* FECHA Y FORMATO */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {new Date(propuesta.dia_programado).toLocaleDateString("es-AR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span>·</span>
                <span className="capitalize">{borrador.tipo_formato.replace("_", " ")}</span>
              </div>

              {/* TÍTULO / HOOK DEL BORRADOR ACTIVO */}
              <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                {borrador.titulo_portada}
              </h3>

              {/* SELECTOR DE BORRADORES A / B / C */}
              <div className="flex items-center justify-between pt-1 pb-0.5 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium">Borradores IA:</span>
                <div className="flex gap-1">
                  {(["A", "B", "C"] as OpcionBorrador[]).map((op) => (
                    <button
                      key={op}
                      type="button"
                      aria-label={`Seleccionar borrador ${op} para ${propuesta.propuesta_id}`}
                      onClick={() => onSelectDraft(propuesta.propuesta_id, op)}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                        propuesta.borrador_seleccionado === op
                          ? "bg-[#1A3D84] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* DESGLOSE COPY EN 3 PASOS */}
              <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-[11px]">
                <div className="border-l-2 border-red-500 pl-2">
                  <span className="text-[10px] font-bold text-red-700 block uppercase">1. Dolor</span>
                  <p className="text-slate-700 line-clamp-1">{borrador.copy_tres_pasos.paso1_dolor}</p>
                </div>
                <div className="border-l-2 border-blue-700 pl-2">
                  <span className="text-[10px] font-bold text-blue-900 block uppercase">2. Reencuadre</span>
                  <p className="text-slate-700 line-clamp-1">{borrador.copy_tres_pasos.paso2_reencuadre}</p>
                </div>
                <div className="border-l-2 border-amber-500 pl-2">
                  <span className="text-[10px] font-bold text-amber-700 block uppercase">3. Dirección</span>
                  <p className="text-slate-700 truncate">{borrador.copy_tres_pasos.paso3_direccion_web}</p>
                </div>
              </div>

              {/* MOTOR DE ENCUADRE VISUAL (FRAMING ENGINE CSS) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="font-semibold flex items-center gap-1 text-slate-700">
                    <Eye className="h-3 w-3 text-[#1A3D84]" />
                    Framing Engine
                  </span>
                  {/* Selector de Ratio (1:1, 4:5, 9:16) */}
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
                    {(["4:5", "1:1", "9:16"] as TargetAspectRatio[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-label={`Cambiar formato a ${r}`}
                        onClick={() => handleRatioChange(propuesta.propuesta_id, r)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                          currentRatio === r
                            ? "bg-white text-[#1A3D84] shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* LIENZO DE ENCUADRE CON FONDO DESENFOCADO Y BARRA TRICOLOR */}
                <div
                  className={`relative w-full max-h-56 ${aspectClass} overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner flex items-center justify-center`}
                >
                  {/* Barra tricolor superior institucional (60% azul, 20% rojo, 20% amarillo) */}
                  <div className="brand-bar absolute top-0 left-0 right-0 h-1.5 z-30 flex">
                    <div className="w-[60%] bg-[#1A3D84]" />
                    <div className="w-[20%] bg-[#E1061E]" />
                    <div className="w-[20%] bg-[#F7CC13]" />
                  </div>

                  {/* Capa 1: Fondo desenfocado expandido (blur 28px, brightness 0.85) */}
                  <div
                    className="absolute inset-[-20px] bg-cover bg-center filter opacity-75 scale-110"
                    style={{
                      backgroundImage: `url(${getAssetUrl(imgRuta)})`,
                      filter: "blur(28px) brightness(0.85)",
                    }}
                  />

                  {/* Capa 2: Foto frontal protegida con object-fit: contain (0% recorte) */}
                  <div className="relative z-10 w-full h-full p-2 flex items-center justify-center">
                    <img
                      src={getAssetUrl(imgRuta)}
                      alt={`Activo Bóveda - ${borrador.titulo_portada}`}
                      className="max-h-full max-w-full object-contain border-2 border-white shadow-md rounded-xs"
                    />
                  </div>

                  {/* Badge de Verificación Visual: 0% Recorte */}
                  <div className="absolute bottom-1.5 right-1.5 z-20 bg-white/95 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-800 border border-slate-200 shadow-xs">
                    Marco {currentRatio} · 0% Recorte
                  </div>
                </div>
              </div>
            </CardContent>

            {/* FOOTER: ESTADO Y BOTONES DE ACCIÓN */}
            <div className="p-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2">
              <Badge
                variant={isApproved ? "default" : isPending ? "secondary" : "outline"}
                className={`text-[10px] font-semibold ${
                  isApproved
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : isPublished
                    ? "bg-blue-800 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {propuesta.estado === "pendiente_revision"
                  ? "Pendiente"
                  : propuesta.estado === "aprobado"
                  ? "Aprobada"
                  : "Publicada"}
              </Badge>

              <div className="flex items-center gap-1.5">
                {/* BOTÓN APROBAR */}
                {isPending && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Aprobar pieza ${propuesta.propuesta_id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove(propuesta.propuesta_id);
                    }}
                    className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold px-2"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Aprobar
                  </Button>
                )}

                {/* BOTÓN PUBLICAR */}
                {isApproved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Publicar pieza ${propuesta.propuesta_id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublish(propuesta.propuesta_id);
                    }}
                    className="h-7 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50 font-semibold px-2"
                  >
                    <Send className="mr-1 h-3 w-3" />
                    Publicar
                  </Button>
                )}

                {/* BOTÓN REVISAR / EDITAR */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenDetail(propuesta)}
                  className="h-7 text-xs bg-white hover:bg-slate-100 text-blue-900 font-semibold border-slate-300"
                >
                  Revisar / Editar
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
