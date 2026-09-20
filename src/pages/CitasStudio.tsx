import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Download,
  Calendar,
  Sparkles,
  BookOpen,
  Smartphone,
  Loader2,
  Layers,
  Search,
} from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "@/hooks/use-toast";
import { useDocuments } from "@/hooks/useVault";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DocWithMetadata {
  id: string;
  title: string;
  content?: string | null;
  category?: string | null;
  metadata?: { autor?: string } | null;
}

interface Presetcita {
  autor: string;
  fuente: string;
  cita: string;
  reflexion: string;
  categoria: string;
}

const PRESET_CITAS: Presetcita[] = [
  {
    autor: "Peter F. Drucker",
    fuente: "La Efectividad Ejecutiva",
    cita: "No hay nada tan inútil como hacer con gran eficiencia algo que directamente no debería hacerse.",
    reflexion: "Revisá las reuniones de tu equipo esta semana: ¿cuántas resolvieron cuellos de botella reales y cuántas fueron solo catarsis operativa?",
    categoria: "Efectividad",
  },
  {
    autor: "Eliyahu M. Goldratt",
    fuente: "La Meta",
    cita: "Cualquier mejora que no se realice en el cuello de botella del sistema es una mera ilusión de progreso.",
    reflexion: "Si tu operación está trabada en entregas, acelerar las ventas solo aumenta la frustración de tus clientes.",
    categoria: "Operaciones",
  },
  {
    autor: "Andy Grove",
    fuente: "High Output Management",
    cita: "El rendimiento de un directivo es el rendimiento de las unidades organizativas bajo su supervisión o influencia.",
    reflexion: "Cuando un mando medio no rinde, el problema rara vez es su capacidad; es la falta de métricas y acuerdos operativos claros.",
    categoria: "Liderazgo",
  },
  {
    autor: "W. Edwards Deming",
    fuente: "Out of the Crisis",
    cita: "El 94% de los problemas en una organización provienen del sistema y de los procesos, no de las personas.",
    reflexion: "Culpar al operario es el atajo más caro de una pyme. Corregir el procedimiento es lo que protege el margen.",
    categoria: "Calidad",
  },
  {
    autor: "Michael E. Porter",
    fuente: "Ventaja Competitiva",
    cita: "La esencia de la estrategia radica en elegir qué no hacer.",
    reflexion: "¿Qué proyectos o clientes no rentables sigue atendiendo tu empresa por miedo a decir que no?",
    categoria: "Estrategia",
  },
  {
    autor: "Taiichi Ohno",
    fuente: "Toyota Production System",
    cita: "El progreso no puede ocurrir cuando las personas se contentan con cómo están las cosas.",
    reflexion: "Si un proceso se hace 'porque siempre se hizo así', tenés garantizado un 20% de desperdicio en costo oculto.",
    categoria: "Mejora Continua",
  },
];

export default function CitasStudio() {
  const { data: vaultDocs } = useDocuments();

  const [quoteSearch, setQuoteSearch] = useState("");
  const [author, setAuthor] = useState("Peter F. Drucker");
  const [source, setSource] = useState("La Efectividad Ejecutiva");
  const [quote, setQuote] = useState(
    "No hay nada tan inútil como hacer con gran eficiencia algo que directamente no debería hacerse."
  );
  const [reflection, setReflection] = useState(
    "Revisá las reuniones de tu equipo esta semana: ¿cuántas resolvieron cuellos de botella reales y cuántas fueron solo catarsis operativa?"
  );
  const [kicker, setKicker] = useState("INTERPELACIÓN DIRECTIVA");
  const [isLightMode, setIsLightMode] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const phonePreviewRef = useRef<HTMLDivElement>(null);

  // Citas adicionales extraídas dinámicamente de la Bóveda de Gestión
  const libraryDocs = useMemo(() => {
    return (vaultDocs || []).filter(
      (d) => d.category === "biblioteca_gestion" || d.category === "manual"
    );
  }, [vaultDocs]);

  // Citas filtradas por buscador
  const filteredPresets = useMemo(() => {
    if (!quoteSearch.trim()) return PRESET_CITAS;
    const q = quoteSearch.toLowerCase();
    return PRESET_CITAS.filter(
      (p) =>
        p.autor.toLowerCase().includes(q) ||
        p.fuente.toLowerCase().includes(q) ||
        p.cita.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
    );
  }, [quoteSearch]);

  const filteredLibraryDocs = useMemo(() => {
    if (!quoteSearch.trim()) return libraryDocs;
    const q = quoteSearch.toLowerCase();
    return libraryDocs.filter(
      (d) => {
        const docMeta = (d as unknown as DocWithMetadata).metadata;
        return (
          d.title.toLowerCase().includes(q) ||
          (Boolean(docMeta?.autor) && String(docMeta?.autor).toLowerCase().includes(q))
        );
      }
    );
  }, [libraryDocs, quoteSearch]);

  const selectPreset = (preset: Presetcita) => {
    setAuthor(preset.autor);
    setSource(preset.fuente);
    setQuote(preset.cita);
    setReflection(preset.reflexion);
    toast({
      title: `Cita cargada: ${preset.autor}`,
      description: `"${preset.fuente}" lista para previsualizar.`,
    });
  };

  const handleDownloadImage = async () => {
    if (!phonePreviewRef.current) return;
    try {
      setDownloading(true);
      // Renderizar el contenedor del story a imagen PNG de alta fidelidad
      const dataUrl = await toPng(phonePreviewRef.current, {
        pixelRatio: 3,
        quality: 0.98,
        cacheBust: true,
      });

      const link = document.createElement("a");
      const cleanAuthor = author.toLowerCase().replace(/[^a-z0-9]/gi, "_");
      link.download = `story-cita-${cleanAuthor}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Imagen descargada",
        description: "Story PNG lista para subir a Instagram y Facebook.",
      });
    } catch (err) {
      console.error("Error generando PNG:", err);
      toast({
        variant: "destructive",
        title: "Error al generar imagen",
        description: "No se pudo renderizar la plantilla en el navegador.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleScheduleWeekend = async () => {
    try {
      setScheduling(true);

      // Calcular próximo sábado a las 10:00 ART
      const now = new Date();
      const nextSaturday = new Date();
      const dayOfWeek = now.getDay();
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
      nextSaturday.setDate(now.getDate() + daysUntilSaturday);
      nextSaturday.setHours(10, 0, 0, 0);

      const payload = {
        title: `Story Cita: ${author}`,
        format: "historia",
        hook: quote,
        body: `${reflection}\n\n— ${author} (${source})`,
        cta: "Escribinos para auditar tus procesos en mejoraok.com",
        dimension: "personal",
        status: "scheduled",
        scheduled_at: nextSaturday.toISOString(),
      };

      const { error } = await supabase.from("proposals").insert(payload);
      if (error) throw error;

      toast({
        title: "Story agendada",
        description: `Programada para el sábado ${nextSaturday.toLocaleDateString("es-AR")} a las 10:00 hs.`,
      });
    } catch (err) {
      console.error("Error agendando cita:", err);
      toast({
        variant: "destructive",
        title: "Error al agendar",
        description: err instanceof Error ? err.message : "No se pudo guardar la propuesta.",
      });
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Estudio de Citas y Stories</h1>
            <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
              Fin de Semana B2B
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Diseñá y previsualizá stories verticales de alta autoridad intelectual (9:16) para directivos y dueños de pymes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDownloadImage}
            disabled={downloading}
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar Imagen PNG
          </Button>

          <Button
            className="gap-2 bg-[#1A3D84] hover:bg-[#15326c] text-white"
            onClick={handleScheduleWeekend}
            disabled={scheduling}
          >
            {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            Agendar para el Fin de Semana
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Columna Izquierda: Formulario Reactivo y Selección de Biblioteca */}
        <div className="space-y-6 lg:col-span-6">
          {/* Selector y Buscador de Citas de la Biblioteca */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Biblioteca de Citas de Gestión
                </CardTitle>
                <span className="text-xs text-muted-foreground">1-clic para cargar</span>
              </div>
              <CardDescription>
                Buscá o seleccioná frases y principios operativos de autores de autoridad.
              </CardDescription>
              {/* Buscador de Citas */}
              <div className="relative pt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por autor, libro o temática (ej: Drucker, procesos, cuello)..."
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredPresets.map((item, idx) => {
                  const isSelected = author === item.autor && source === item.fuente;
                  return (
                    <button
                      key={idx}
                      onClick={() => selectPreset(item)}
                      className={cn(
                        "flex flex-col text-left p-2.5 rounded-lg border transition-all text-xs space-y-1 relative",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "bg-card hover:bg-accent/40 hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span className="truncate pr-1">{item.autor}</span>
                        <Badge variant={isSelected ? "default" : "outline"} className="text-[9px] px-1.5 py-0 shrink-0">
                          {item.categoria}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-[11px] truncate w-full">{item.fuente}</span>
                      <span className="text-[11px] text-foreground/85 line-clamp-2 italic">
                        "{item.cita}"
                      </span>
                    </button>
                  );
                })}
              </div>

              {filteredLibraryDocs.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Libros en Bóveda ({filteredLibraryDocs.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {filteredLibraryDocs.map((doc) => (
                      <Badge
                        key={doc.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors text-xs py-1"
                        onClick={() => {
                          setSource(doc.title);
                          const authorVal = (doc as unknown as DocWithMetadata).metadata?.autor;
                          if (authorVal) setAuthor(authorVal);
                          if (doc.content) {
                            const firstSent = doc.content.slice(0, 160).replace(/[#*]/g, "").trim();
                            setQuote(firstSent);
                          }
                          toast({ title: `Cargado desde Bóveda`, description: doc.title });
                        }}
                      >
                        {doc.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulario Lateral Simple */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Parámetros y Textos del Story (9:16)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="author" className="text-xs font-medium">Autor</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Ej: Peter F. Drucker"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="source" className="text-xs font-medium">Fuente / Obra</Label>
                  <Input
                    id="source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="Ej: La Efectividad Ejecutiva"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quote" className="text-xs font-medium">Cita Textual de Interpelación</Label>
                <Textarea
                  id="quote"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  rows={3}
                  placeholder="Cita potente que cuestione un vicio operativo..."
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reflection" className="text-xs font-medium">
                    Reflexión Operativa (2 líneas)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Pregunta ejecutiva de cierre</span>
                </div>
                <Textarea
                  id="reflection"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={3}
                  placeholder="Pregunta o señalamiento práctico para aplicar en la semana..."
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="kicker" className="text-xs font-medium">Kicker / Encabezado</Label>
                  <Input
                    id="kicker"
                    value={kicker}
                    onChange={(e) => setKicker(e.target.value)}
                    placeholder="INTERPELACIÓN DIRECTIVA"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-2.5">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">Fondo Claro</Label>
                    <p className="text-[10px] text-muted-foreground">Blanco sobrio institucional</p>
                  </div>
                  <Switch
                    checked={isLightMode}
                    onCheckedChange={setIsLightMode}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Mockup de Smartphone Interactivo en Vivo */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 px-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-primary" /> Pantalla Smartphone Simulada (9:16 Vertical)
            </span>
            <Badge variant="outline" className="text-xs">
              1080 × 1920 px
            </Badge>
          </div>

          {/* Marco exterior del Smartphone con chasis y botones */}
          <div className="relative mx-auto rounded-[50px] border-[12px] border-slate-900 bg-slate-900 p-2 shadow-2xl ring-1 ring-slate-800">
            {/* Botones laterales simulados */}
            <div className="absolute -left-[14px] top-28 h-10 w-1 rounded-l bg-slate-700" />
            <div className="absolute -left-[14px] top-42 h-10 w-1 rounded-l bg-slate-700" />
            <div className="absolute -right-[14px] top-32 h-14 w-1 rounded-r bg-slate-700" />

            {/* Isla Dinámica / Cámara frontal */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full z-30 flex items-center justify-end px-3 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800/90 border border-slate-700/50" />
            </div>

            {/* Pantalla del Story (Renderizable a PNG con 9:16) */}
            <div
              ref={phonePreviewRef}
              style={{ width: "360px", height: "640px" }}
              className={`relative overflow-hidden rounded-[38px] flex flex-col justify-between p-6 transition-colors select-none ${
                isLightMode
                  ? "bg-[#FAFAFA] text-[#0F172A]"
                  : "text-white"
              }`}
            >
              {/* Fondo Institucional (Radial exacto del template) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: isLightMode
                    ? "#FAFAFA"
                    : "radial-gradient(130% 90% at 50% 12%, #244C9E 0%, #1A3D84 55%, #0F2552 100%)",
                }}
              />

              {/* Ornamento geométrico sutil (de story-quote-template.html) */}
              <div
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
                style={{
                  background: isLightMode
                    ? "radial-gradient(circle, rgba(26, 61, 132, 0.05) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)",
                }}
              />

              {/* Barra de estado smartphone (Hora, Wifi, Batería) */}
              <div className="relative z-20 flex items-center justify-between text-[11px] font-semibold px-2 pt-1 opacity-80">
                <span>9:41</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <div className="w-4 h-2 rounded-sm border border-current flex items-center p-0.5">
                    <div className="h-full w-full bg-current rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* Top Section: Kicker + Edition Tag */}
              <div className="relative z-10 flex items-center justify-between pt-3">
                <div
                  className={`inline-flex items-center text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full border ${
                    isLightMode
                      ? "border-[#1A3D84]/20 bg-[#1A3D84]/5 text-[#1A3D84]"
                      : "border-white/20 bg-white/10 text-white/90"
                  }`}
                >
                  {kicker || "INTERPELACIÓN DIRECTIVA"}
                </div>
                <span className={`text-[9px] tracking-widest uppercase font-medium ${isLightMode ? "text-slate-400" : "text-white/60"}`}>
                  FIN DE SEMANA
                </span>
              </div>

              {/* Centro: Cita + Autor + Caja de Reflexión Operativa */}
              <div className="relative z-10 my-auto space-y-4 py-2">
                <div className="relative">
                  <span
                    className="absolute -top-7 -left-2 text-6xl font-serif select-none pointer-events-none opacity-25"
                    style={{ color: isLightMode ? "#1A3D84" : "#F59E0B" }}
                  >
                    “
                  </span>
                  <p
                    className={`relative text-[18.5px] font-medium leading-[1.32] tracking-tight ${
                      isLightMode ? "text-[#1A3D84]" : "text-white"
                    }`}
                  >
                    {quote || "Escribí una cita inspiradora..."}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="w-8 h-1 bg-[#F59E0B] rounded-full shrink-0" />
                  <span
                    className={`text-[11.5px] font-semibold uppercase tracking-wider ${
                      isLightMode ? "text-slate-700" : "text-white/90"
                    }`}
                  >
                    {author}
                  </span>
                  {source && (
                    <span className={`text-[10.5px] italic truncate max-w-[140px] ${isLightMode ? "text-slate-400" : "text-white/60"}`}>
                      · {source}
                    </span>
                  )}
                </div>

                {/* Caja de Reflexión Operativa con borde amarillo */}
                <div
                  className={`rounded-r-xl border-l-[4px] border-[#F59E0B] p-3.5 text-left backdrop-blur-sm ${
                    isLightMode
                      ? "bg-[#1A3D84]/5 border-t border-r border-b border-[#1A3D84]/10 text-slate-800"
                      : "bg-white/10 border-t border-r border-b border-white/15 text-white/95"
                  }`}
                >
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[#F59E0B] mb-1">
                    Reflexión Operativa
                  </span>
                  <p className="text-[12px] leading-relaxed font-normal">
                    {reflection || "Añadí una reflexión de 2 líneas para el lunes..."}
                  </p>
                </div>
              </div>

              {/* Footer Institucional */}
              <div
                className={`relative z-10 flex items-center justify-between pt-3 border-t ${
                  isLightMode ? "border-slate-200" : "border-white/15"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span
                    className={`text-[11px] font-semibold tracking-wide ${
                      isLightMode ? "text-[#1A3D84]" : "text-white"
                    }`}
                  >
                    Mejora Continua
                  </span>
                </div>
                <span className={`text-[9.5px] tracking-wider font-medium ${isLightMode ? "text-slate-500" : "text-white/60"}`}>
                  mejoraok.com
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
