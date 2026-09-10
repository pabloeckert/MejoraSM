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

const CANVAS: Record<string, { w: number; h: number; file: string }> = {
  historia: { w: 1080, h: 1920, file: "story-template.html" },
  post: { w: 1080, h: 1350, file: "post-template.html" },
  carrusel: { w: 1080, h: 1350, file: "post-template.html" },
};

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

export function PiecePreview({
  format,
  oferta,
  hook,
  body,
  className,
}: {
  format?: string | null;
  oferta?: string | null;
  hook?: string | null;
  body?: string | null;
  className?: string;
}) {
  const canvas = CANVAS[format || "post"] || CANVAS.post;
  const { data: template, isLoading, isError } = useTemplate(canvas.file);
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    function fit() {
      // Medimos el contenedor padre, no el wrap: el wrap ahora tiene un ancho
      // explícito (canvas.w * scale), así que medirlo a él sería un loop.
      const w = rootRef.current?.clientWidth ?? 320;
      setScale(Math.min(1, w / canvas.w));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [canvas.w]);

  // Reemplazo vía función, no string directo: un "$&"/"$$"/"$`"/"$'" literal
  // en el hook/body generado por IA dispararía la interpretación especial de
  // patrones de String.replace() (aplica con un patrón de búsqueda string
  // plano igual, no solo con regex) — una función replacer no la sufre.
  // Molde "pregunta directa" (2026-09-09): mismo criterio que
  // render-scheduled-posts.mjs — si el hook termina en "?", el preview
  // muestra el mismo layout que va a salir publicado. No trunca el hook
  // acá (a diferencia del render real) porque este preview nunca truncó
  // nada — el hook real casi siempre entra dentro del límite que ya le
  // pide el prompt del Creativo, así que la diferencia es marginal.
  const cleanHeadline = (hook || "").replace(/\*\*/g, "");
  const modeClass = cleanHeadline.trim().endsWith("?") ? "solo-texto pregunta" : "solo-texto";
  const html =
    template &&
    template
      .replace("{{MODE_CLASS}}", () => modeClass)
      .replace("{{PHOTO_STYLE}}", () => "")
      .replace("{{OFERTA_LABEL}}", () => esc(dimensionLabel(oferta) || "Mejora Continua"))
      .replace("{{KICKER}}", () => esc(dimensionLabel(oferta) || ""))
      .replace("{{HEADLINE}}", () => esc(cleanHeadline))
      .replace("{{SUBTEXT}}", () => esc(firstWords(body || "", 22)));

  return (
    <div ref={rootRef} className={className} style={{ width: "100%", maxWidth: "100%" }}>
      <div
        ref={wrapRef}
        className="overflow-hidden rounded-md border border-border bg-muted"
        // El iframe mide canvas.w (1080px) en el layout aunque `transform:
        // scale()` lo achique visualmente — sin un ancho explícito acá, ese
        // 1080 estiraba el DialogContent y metía scroll horizontal (bug real
        // auditoría en vivo 2026-09-07). Fijamos el ancho al tamaño escalado.
        style={{ height: canvas.h * scale, width: canvas.w * scale, maxWidth: "100%" }}
      >
        {isLoading && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Cargando preview…</div>
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
            sandbox="allow-same-origin"
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
      <p className="mt-1 text-[11px] text-muted-foreground">
        Vista previa del diseño (variante sin foto — la foto real se elige al publicar).
      </p>
    </div>
  );
}
