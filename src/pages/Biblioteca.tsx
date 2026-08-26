import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";

// Fase 5 del plan estratégico 2026-08-16 (Un solo panel) — decisión de
// diseño explícita: biblioteca/ es una SPA vanilla JS de ~2000 líneas, con
// escritura real al repo vía un PAT de GitHub guardado en localStorage
// (ver biblioteca/github.js, mismo storage que src/services/github.ts) y
// uso diario activo por parte de Pablo. Reescribirla en React a ciegas es
// un riesgo de regresión que no vale la pena correr solo para que "viva en
// React" — en cambio, esta ruta embebe la página estática TAL CUAL, sin
// tocar su código. La versión standalone sigue existiendo en paralelo.
//
// Causa real encontrada 2026-08-26 (Pablo: "no debe abrir aparte, debe
// estar dentro del sistema"): el embed nunca había funcionado en
// producción — el CSP de este mismo documento (index.html) tenía
// `frame-src 'none'`, que bloquea CUALQUIER iframe sin importar el origen.
// La investigación del 2026-08-17 miró los headers del lado de
// biblioteca/ (X-Frame-Options, sin bloqueo ahí) pero nunca el CSP del
// propio EDA, que era el bloqueo real. Corregido a `frame-src 'self'`
// (biblioteca/ vive en el mismo origen de GitHub Pages que el EDA) — con
// eso resuelto, el embed pasa a ser el camino principal, sin el paso
// previo de "click para ver" que existía como paliativo de un problema
// que en realidad era este.
const BIBLIOTECA_URL = new URL("../biblioteca/", window.location.origin + import.meta.env.BASE_URL).toString();
const BIBLIOTECA_URL_PROD = "https://pabloeckert.github.io/MejoraSM/biblioteca/";
const LOAD_TIMEOUT_MS = 8000;

export default function Biblioteca() {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    timeoutRef.current = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeoutRef.current);
  }, [reloadKey]);

  const url = import.meta.env.DEV ? BIBLIOTECA_URL_PROD : BIBLIOTECA_URL;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-medium leading-tight text-primary">Biblioteca de Contenido</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Cargar, etiquetar y organizar el contenido que alimenta las Stories.
          </p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            Abrir en pestaña nueva
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </a>
      </div>

      {import.meta.env.DEV ? (
        <Card className="border-accent/40 bg-accent/10">
          <CardContent className="p-4 text-sm text-foreground">
            En desarrollo local, biblioteca/ no se sirve desde el dev server de Vite (es un sitio estático aparte,
            combinado solo en el deploy de producción) — usá "Abrir en pestaña nueva" arriba para ver la versión real.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {!loaded && !timedOut && "Cargando…"}
              {loaded && "Cargada."}
              {timedOut && !loaded && "Está tardando más de lo normal."}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              <RefreshCw className="h-3 w-3" />
              Recargar
            </Button>
          </div>

          {timedOut && !loaded && (
            <Card className="border-accent/40 bg-accent/10">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="flex items-center gap-1.5 text-sm text-foreground">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  No terminó de cargar. Probá "Recargar" arriba, o "Abrir en pestaña nueva" si sigue sin andar.
                </p>
              </CardContent>
            </Card>
          )}

          <iframe
            key={reloadKey}
            src={url}
            title="Biblioteca de Contenido"
            onLoad={() => {
              clearTimeout(timeoutRef.current);
              setLoaded(true);
              setTimedOut(false);
            }}
            className="h-[80vh] w-full rounded-lg border border-border"
          />
        </div>
      )}
    </div>
  );
}
