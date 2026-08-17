import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, AlertTriangle, Images } from "lucide-react";

// Fase 5 del plan estratégico 2026-08-16 (Un solo panel) — decisión de
// diseño explícita: biblioteca/ es una SPA vanilla JS de ~2000 líneas, con
// escritura real al repo vía un PAT de GitHub guardado en localStorage
// (ver biblioteca/github.js, mismo storage que src/services/github.ts) y
// uso diario activo por parte de Pablo. Reescribirla en React a ciegas es
// un riesgo de regresión que no vale la pena correr solo para que "viva en
// React" — en cambio, esta ruta embebe la página estática TAL CUAL, sin
// tocar su código. La versión standalone sigue existiendo en paralelo.
//
// Ajuste 2026-08-17: Pablo reportó que el embed a veces no carga nada
// ("carita triste") — no se pudo reproducir sin su sesión real (no hay
// X-Frame-Options/CSP bloqueando el embed, confirmado por curl a los
// headers reales de GitHub Pages), pero el iframe puede fallar por
// motivos que no se pueden depurar desde acá (memoria del dispositivo,
// extensiones del navegador, un hiccup puntual de red). Por eso ahora el
// acceso primario es un botón grande "Abrir Biblioteca" — funciona
// siempre, confirmado real — y el embed queda como opción secundaria, con
// detección de timeout y un botón de recarga en vez de asumir que va a
// funcionar.
const BIBLIOTECA_URL = new URL("../biblioteca/", window.location.origin + import.meta.env.BASE_URL).toString();
const BIBLIOTECA_URL_PROD = "https://pabloeckert.github.io/MejoraSM/biblioteca/";
const LOAD_TIMEOUT_MS = 8000;

export default function Biblioteca() {
  const [showEmbed, setShowEmbed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!showEmbed) return;
    setLoaded(false);
    setTimedOut(false);
    timeoutRef.current = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeoutRef.current);
  }, [showEmbed, reloadKey]);

  const url = import.meta.env.DEV ? BIBLIOTECA_URL_PROD : BIBLIOTECA_URL;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-medium leading-tight text-primary">Biblioteca de Contenido</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Cargar, etiquetar y organizar el contenido que alimenta las Stories.
          </p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button>
            <Images className="mr-1.5 h-4 w-4" />
            Abrir Biblioteca
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </a>
      </div>

      {import.meta.env.DEV && (
        <Card className="border-accent/40 bg-accent/10">
          <CardContent className="p-4 text-sm text-foreground">
            En desarrollo local, biblioteca/ no se sirve desde el dev server de Vite (es un sitio estático aparte,
            combinado solo en el deploy de producción) — el botón de arriba abre la versión real igual.
          </CardContent>
        </Card>
      )}

      {!import.meta.env.DEV && (
        <div>
          {!showEmbed ? (
            <button
              onClick={() => setShowEmbed(true)}
              className="w-full rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              Ver la Biblioteca acá mismo, sin salir del panel (opcional — si no carga, usá "Abrir Biblioteca" arriba)
            </button>
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
                  onClick={() => {
                    setReloadKey((k) => k + 1);
                  }}
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
                      No terminó de cargar. Probá "Abrir Biblioteca" arriba — funciona siempre, es la misma herramienta en
                      su propia pestaña.
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
                className="h-[75vh] w-full rounded-lg border border-border"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
