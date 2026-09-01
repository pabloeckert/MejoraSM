import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dimensionLabel } from "@/shared/constants";

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

// Se trae vía la API de contents de GitHub (api.github.com ya está en el
// connect-src del CSP; raw.githubusercontent.com no) — repo público, sin token.
const GH_CONTENTS = "https://api.github.com/repos/pabloeckert/MejoraSM/contents/templates";

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
      const res = await fetch(`${GH_CONTENTS}/${file}`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) throw new Error(`No se pudo traer el template (${res.status})`);
      const json = (await res.json()) as { content?: string; encoding?: string };
      if (json.encoding !== "base64" || !json.content) throw new Error("Template en un formato inesperado");
      const bytes = Uint8Array.from(atob(json.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
      return new TextDecoder("utf-8").decode(bytes);
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    function fit() {
      const w = wrapRef.current?.clientWidth ?? 320;
      setScale(Math.min(1, w / canvas.w));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [canvas.w]);

  const html =
    template &&
    template
      .replace("{{MODE_CLASS}}", "solo-texto")
      .replace("{{PHOTO_STYLE}}", "")
      .replace("{{OFERTA_LABEL}}", esc(dimensionLabel(oferta) || "Mejora Continua"))
      .replace("{{KICKER}}", esc(dimensionLabel(oferta) || ""))
      .replace("{{HEADLINE}}", esc((hook || "").replace(/\*\*/g, "")))
      .replace("{{SUBTEXT}}", esc(firstWords(body || "", 22)));

  return (
    <div className={className}>
      <div
        ref={wrapRef}
        className="overflow-hidden rounded-md border border-border bg-muted"
        style={{ height: canvas.h * scale }}
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
