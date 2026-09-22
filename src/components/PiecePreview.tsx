import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dimensionLabel } from "@/shared/constants";
import { github } from "@/services/github";

// Fase B del plan de continuación (2026-08-31) — preview visual real de la
// pieza, del brief de rediseño ("el resultado tiene que incluir preview visual
// real de cómo quedaría la pieza, no solo texto").
//
// Los templates de render (templates/post-template.html / story-template.html)
// ya arman la imagen final con placeholders {{OFERTA_LABEL}} {{KICKER}}
// {{HEADLINE}} {{SUBTEXT}} {{MODE_CLASS}} {{PHOTO_STYLE}} — los mismos que
// llena render-scheduled-posts.mjs / render-story.mjs al publicar. Acá se
// hace el mismo reemplazo client-side y se muestra en un iframe escalado.
// Se rinde la variante "solo-texto" (sin foto): la foto real se elige recién
// al publicar, así que el preview muestra el diseño y cómo cae el texto.

// Hallazgo real 2026-09-09 (Pablo: "no tengo vistas previas de nada"): esto
// le pegaba directo a api.github.com SIN TOKEN desde el browser — el límite
// de GitHub sin autenticación es 60 req/hora por IP, y se agotaba fácil con
// varias aperturas de Mesa de Diálogo en la misma sesión de trabajo, dejando
// el preview en blanco en silencio. Ahora pasa por la Edge Function `repo`
// (mismo camino ya establecido para todo lo demás desde 2026-09-01), que
// tiene el token real del lado del servidor.
const TEMPLATES_DIR = "templates";

function esc(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstWords(s: string, n: number) {
  const clean = (s || "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/\s+/g, " ").trim();
  const w = clean.split(" ");
  return w.length <= n ? clean : w.slice(0, n).join(" ") + "…";
}

function useTemplate(file: string) {
  return useQuery({
    queryKey: ["render-template", file],
    queryFn: async () => {
      const text = await github.getTextFile(`${TEMPLATES_DIR}/${file}`);
      if (!text) throw new Error("No se pudo traer el template");
      return text;
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

export type VisualLayoutType = "layout-1" | "layout-2" | "layout-3" | "layout-4" | "layout-5";

export interface PiecePreviewProps {
  format?: string | null;
  oferta?: string | null;
  hook?: string | null;
  body?: string | null;
  className?: string;
  layout?: VisualLayoutType;
  photos?: string[];
  situation?: string | null;
  slideIndex?: number;
  totalSlides?: number;
}

const DEFAULT_FALLBACK_PHOTO =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1080' height='1080' viewBox='0 0 1080 1080'%3E%3Crect fill='%231A3D84' width='1080' height='1080'/%3E%3Ctext fill='%23F7CC13' font-family='sans-serif' font-size='42' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3EMEJORA CONTINUA %E2%80%94 FOTO REAL%3C/text%3E%3C/svg%3E";

export function PiecePreview({
  format,
  oferta,
  hook,
  body,
  className,
  layout = "layout-1",
  photos,
  situation,
  slideIndex,
  totalSlides,
}: PiecePreviewProps) {
  const normFormat = (format || "post").toLowerCase();
  const isStory = normFormat === "historia" || normFormat === "story";
  const hasPhotosOrLayout = (photos && photos.length > 0) || layout !== "layout-1";

  // Archivo de template a utilizar
  const templateFile = hasPhotosOrLayout
    ? "unified-layout-template.html"
    : isStory
      ? "story-template.html"
      : "post-template.html";

  const canvas = {
    w: 1080,
    h: isStory ? 1920 : 1350,
  };

  const { data: template, isLoading, isError } = useTemplate(templateFile);
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    function fit() {
      const w = rootRef.current?.clientWidth ?? 320;
      setScale(Math.min(1, w / canvas.w));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [canvas.w]);

  const cleanHeadline = (hook || "").replace(/\*\*/g, "").trim();
  const cleanBody = (body || "").replace(/\*\*/g, "").trim();
  const safeOferta = esc(dimensionLabel(oferta) || "Mejora Continua");
  const p1 = photos?.[0] || DEFAULT_FALLBACK_PHOTO;
  const p2 = photos?.[1] || p1;
  const p3 = photos?.[2] || p1;
  const p4 = photos?.[3] || p1;

  let html = "";
  if (template) {
    if (hasPhotosOrLayout) {
      const slideCounterHtml =
        normFormat === "carrusel" && totalSlides
          ? `<div class="slide-counter">${slideIndex || 1} / ${totalSlides}</div>`
          : "";

      html = template
        .replace(/\{\{FORMAT\}\}/g, () => (isStory ? "story" : normFormat === "carrusel" ? "carrusel" : "post"))
        .replace(/\{\{LAYOUT\}\}/g, () => layout)
        .replace(/\{\{OFERTA_LABEL\}\}/g, () => safeOferta)
        .replace(/\{\{SITUATION\}\}/g, () => esc(situation || "Trinchera Operativa"))
        .replace(/\{\{KICKER\}\}/g, () => safeOferta)
        .replace(/\{\{HEADLINE\}\}/g, () => esc(cleanHeadline || "El proceso define el resultado"))
        .replace(/\{\{SUBTEXT\}\}/g, () => esc(firstWords(cleanBody || "Fricción operativa en procesos y mandos medios.", 24)))
        .replace(/\{\{PHOTO_1\}\}/g, () => p1)
        .replace(/\{\{PHOTO_2\}\}/g, () => p2)
        .replace(/\{\{PHOTO_3\}\}/g, () => p3)
        .replace(/\{\{PHOTO_4\}\}/g, () => p4)
        .replace(/\{\{SLIDE_COUNTER_HTML\}\}/g, () => slideCounterHtml);
    } else {
      const modeClass = cleanHeadline.endsWith("?") ? "solo-texto pregunta" : "solo-texto";
      html = template
        .replace("{{MODE_CLASS}}", () => modeClass)
        .replace("{{PHOTO_STYLE}}", () => "")
        .replace("{{OFERTA_LABEL}}", () => safeOferta)
        .replace("{{KICKER}}", () => safeOferta)
        .replace("{{HEADLINE}}", () => esc(cleanHeadline || "Mejora Continua"))
        .replace("{{SUBTEXT}}", () => esc(firstWords(cleanBody || "", 22)));
    }
  }

  return (
    <div ref={rootRef} className={className} style={{ width: "100%", maxWidth: "100%" }}>
      <div
        ref={wrapRef}
        className="overflow-hidden rounded-md border border-border bg-muted shadow-sm"
        style={{ height: canvas.h * scale, width: canvas.w * scale, maxWidth: "100%" }}
      >
        {isLoading && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Cargando previsualización visual…
          </div>
        )}
        {isError && (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            No se pudo cargar el preview del diseño ahora mismo.
          </div>
        )}
        {html && (
          <iframe
            title="Preview de la pieza"
            srcDoc={html}
            sandbox="allow-same-origin allow-scripts"
            scrolling="no"
            style={{
              width: canvas.w,
              height: canvas.h,
              border: 0,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Previsualización en vivo ({isStory ? "9:16 Story" : "Feed / Carrusel"})</span>
        {hasPhotosOrLayout && <span className="font-semibold text-primary uppercase text-[10px]">{layout}</span>}
      </p>
    </div>
  );
}
