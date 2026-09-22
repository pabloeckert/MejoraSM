// src/components/ContentFormatModal.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Square,
  Copy,
  Sparkles,
  MessageSquare,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
} from "lucide-react";
import { PiecePreview, type VisualLayoutType } from "@/components/PiecePreview";
import { DIMENSIONES, dimensionLabel } from "@/shared/constants";
import { toast } from "@/hooks/use-toast";
import { proposalsApi } from "@/services/supabase";

export type ContentFormatType = "story" | "post" | "carrusel";

export interface SelectedPhotoItem {
  id: string;
  name: string;
  url: string;
  dimension: string;
  situation?: string;
  operationalTitle?: string;
  trenchPain?: string;
}

interface ContentFormatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: SelectedPhotoItem[];
}

const LAYOUT_DEFINITIONS: Array<{
  id: VisualLayoutType;
  title: string;
  tagline: string;
  description: string;
  minPhotos: number;
}> = [
  {
    id: "layout-1",
    title: "Layout 1: Full Bleed",
    tagline: "A sangre completa",
    description: "Foto 100% de fondo con degradé oscuro y texto sobreimpreso de alto impacto.",
    minPhotos: 1,
  },
  {
    id: "layout-2",
    title: "Layout 2: Foto destacada",
    tagline: "50/50 Editorial Blanco",
    description: "Foto superior de trinchera y bloque editorial inferior blanco institucional.",
    minPhotos: 1,
  },
  {
    id: "layout-3",
    title: "Layout 3: Doble Foco",
    tagline: "Split 2 Fotos",
    description: "División de 2 fotos enfrentadas ideal para contrastes, roles o procesos.",
    minPhotos: 2,
  },
  {
    id: "layout-4",
    title: "Layout 4: Mosaico Tríptico",
    tagline: "1 Hero + 2 Secundarias",
    description: "Composición asimétrica con una foto dominante y dos planos de detalle.",
    minPhotos: 3,
  },
  {
    id: "layout-5",
    title: "Layout 5: Collage Multiequipo",
    tagline: "Grilla 4+ Fotos",
    description: "Cuadrícula estructurada con marco institucional para eventos y dinámicas.",
    minPhotos: 4,
  },
];

export function ContentFormatModal({ open, onOpenChange, photos }: ContentFormatModalProps) {
  const navigate = useNavigate();

  const [format, setFormat] = useState<ContentFormatType>("post");
  const [layout, setLayout] = useState<VisualLayoutType>("layout-1");
  const [headline, setHeadline] = useState("");
  const [subtext, setSubtext] = useState("");
  const [dimension, setDimension] = useState("organizacional");
  const [situation, setSituation] = useState("Taller/Equipo");
  const [carruselSlide, setCarruselSlide] = useState(1);
  const [savingProposal, setSavingProposal] = useState(false);

  // Inicializar o sincronizar datos cuando cambian las fotos seleccionadas
  useEffect(() => {
    if (photos.length > 0) {
      const first = photos[0];
      setDimension(first.dimension || "organizacional");
      setSituation(first.situation || "Taller/Equipo");
      setHeadline(first.operationalTitle || "Desconexión entre Ventas y Operaciones");
      setSubtext(
        first.trenchPain ||
          "Las metas comerciales se definen sin visibilidad de la capacidad real de entrega."
      );

      // Si seleccionó 2 o más fotos, sugerir automáticamente un layout acorde
      if (photos.length >= 4) {
        setLayout("layout-5");
      } else if (photos.length === 3) {
        setLayout("layout-4");
      } else if (photos.length === 2) {
        setLayout("layout-3");
      } else {
        setLayout("layout-1");
      }
    }
  }, [photos]);

  const photoUrls = photos.map((p) => p.url);

  // Navegar a Mesa Ejecutiva con los parámetros precargados
  const handleSendToMesa = () => {
    const promptText = `[Pieza con Fotos Reales - ${dimensionLabel(dimension).toUpperCase()}]
Situación: ${situation}
Título Operativo: ${headline}
Dolor de Trinchera: ${subtext}
Formato: ${format.toUpperCase()} (${layout})
Fotos seleccionadas: ${photos.map((p) => p.name).join(", ")}`;

    onOpenChange(false);
    navigate("/mesa", {
      state: {
        prompt: promptText,
        source: "real_photos_pipeline",
        format,
        layout,
        dimension,
        situation,
        operationalTitle: headline,
        trenchPain: subtext,
        photoCount: photos.length,
      },
    });
  };

  // Guardar como propuesta directa
  const handleSaveProposal = async () => {
    setSavingProposal(true);
    try {
      await proposalsApi.create({
        title: headline,
        hook: headline,
        body: subtext,
        format,
        dimension,
        oferta: dimension,
        status: "pending",
      });

      toast({
        title: "Propuesta creada ✓",
        description: "La pieza se guardó en Propuestas en estado Pendiente para revisión.",
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error guardando propuesta",
        description: err instanceof Error ? err.message : "No se pudo guardar la propuesta.",
      });
    } finally {
      setSavingProposal(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Crear Contenido con Fotos Reales
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {photos.length} foto{photos.length > 1 ? "s" : ""} de trinchera seleccionada{photos.length > 1 ? "s" : ""}. Elegí formato y diseño visual institucional.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-2">
          {/* PANEL IZQUIERDO: SELECTORES Y TEXTO (7 COLS) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. SELECTOR DE FORMATO */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Selector de Tipo de Publicación (Formato)
              </Label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormat("story")}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-2 ${
                    format === "story"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Smartphone className={`h-4 w-4 ${format === "story" ? "text-primary" : "text-muted-foreground"}`} />
                    <Badge variant="outline" className="text-[10px]">9:16</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Story Vertical</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      Stories de Instagram y Facebook.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("post")}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-2 ${
                    format === "post"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Square className={`h-4 w-4 ${format === "post" ? "text-primary" : "text-muted-foreground"}`} />
                    <Badge variant="outline" className="text-[10px]">4:5 / 1:1</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Post de Feed</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      LinkedIn, Instagram y Facebook.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("carrusel")}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-2 ${
                    format === "carrusel"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Copy className={`h-4 w-4 ${format === "carrusel" ? "text-primary" : "text-muted-foreground"}`} />
                    <Badge variant="outline" className="text-[10px]">Multi-slide</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Carrusel B2B</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      Secuencia con dolor y cierre CTA.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. SELECTOR DE DISEÑOS VISUALES (LAYOUTS) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  2. Diseños Visuales (Playwright Templates MejoraSM)
                </Label>
                <span className="text-[11px] text-muted-foreground">5 layouts disponibles</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LAYOUT_DEFINITIONS.map((l) => {
                  const isSelected = layout === l.id;
                  const isRecommended =
                    (photos.length >= 4 && l.id === "layout-5") ||
                    (photos.length === 3 && l.id === "layout-4") ||
                    (photos.length === 2 && l.id === "layout-3") ||
                    (photos.length === 1 && l.id === "layout-1");

                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLayout(l.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all relative ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{l.title}</span>
                        {isRecommended && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            Ideal
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-primary mt-0.5">{l.tagline}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                        {l.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. CONTENIDO EDITORIAL DE TRINCHERA */}
            <div className="space-y-3 pt-1 border-t border-border">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                3. Mensaje Editorial y Criterio de Trinchera
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Dimensión de Servicio</Label>
                  <select
                    value={dimension}
                    onChange={(e) => setDimension(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
                  >
                    {DIMENSIONES.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label} — {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Situación Operativa</Label>
                  <select
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
                  >
                    <option value="Taller/Equipo">Taller / Equipo</option>
                    <option value="Consultoría 1 a 1">Consultoría 1 a 1</option>
                    <option value="Pizarra/Esquema">Pizarra / Esquema</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="headline-input" className="text-[11px] text-muted-foreground">
                  Título Operativo / Hook (Titular grande)
                </Label>
                <Input
                  id="headline-input"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ej: Desalineación entre Ventas y Operaciones"
                  className="text-xs font-medium mt-1"
                />
              </div>

              <div>
                <Label htmlFor="subtext-input" className="text-[11px] text-muted-foreground">
                  Dolor de Trinchera (1-2 líneas enfocado en sistemas, no personas)
                </Label>
                <Textarea
                  id="subtext-input"
                  rows={2}
                  value={subtext}
                  onChange={(e) => setSubtext(e.target.value)}
                  placeholder="Ej: Las promesas comerciales se hacen sin visibilidad de la capacidad instalada..."
                  className="text-xs resize-none mt-1"
                />
              </div>
            </div>
          </div>

          {/* PANEL DERECHO: PREVIEW EN TIEMPO REAL (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Previsualización en Vivo
              </Label>
              <Badge variant="outline" className="text-[10px] uppercase font-semibold text-primary">
                {format} · {layout}
              </Badge>
            </div>

            <div className="w-full max-w-sm rounded-lg border border-border p-2 bg-muted/20 flex flex-col items-center">
              <PiecePreview
                format={format}
                layout={layout}
                oferta={dimension}
                situation={situation}
                hook={headline}
                body={subtext}
                photos={photoUrls}
                slideIndex={carruselSlide}
                totalSlides={4}
              />

              {format === "carrusel" && (
                <div className="flex items-center gap-2 mt-2 w-full justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={carruselSlide <= 1}
                    onClick={() => setCarruselSlide((s) => Math.max(1, s - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs font-mono text-muted-foreground">
                    Slide {carruselSlide} de 4
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={carruselSlide >= 4}
                    onClick={() => setCarruselSlide((s) => Math.min(4, s + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingProposal}
              onClick={handleSaveProposal}
              className="text-xs"
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Guardar Propuesta
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSendToMesa}
              className="bg-[#1A3D84] hover:bg-[#142e63] text-white text-xs font-medium"
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Enviar a Mesa Ejecutiva
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
