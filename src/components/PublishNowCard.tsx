import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, RotateCcw, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { github } from "@/services/github";
import { dimensionLabel } from "@/shared/constants";

// "Publicar ahora" (2026-09-01, pedido de Pablo: "saco una foto y subo al
// sistema, el sistema trabaja y yo solo apreto publicar ya y listo").
// Opción 2 elegida por Pablo: preparar → ver → publicar.
//
// Fase 1 (Preparar): dispara publish-now.yml mode=prepare, que genera el copy
// con Claude + renderiza la imagen y la commitea. Se pollea
// content/work/publish-now.json hasta phase=prepared.
// Fase 2 (Publicar): dispara mode=publish, publica en IG+FB vía Zernio.

interface Manifest {
  nonce?: string;
  phase?: "preparing" | "prepared" | "publishing" | "published" | "error";
  oferta?: string | null;
  headline?: string;
  subtext?: string;
  imagePath?: string | null;
  error?: string | null;
}

type UiState = "idle" | "preparing" | "prepared" | "publishing" | "published" | "error";

const POLL_MS = 8000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000;

export function PublishNowCard({ dimension, connected }: { dimension: string; connected: boolean }) {
  const [state, setState] = useState<UiState>("idle");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const nonceRef = useRef<string>("");
  const pollStopRef = useRef<() => void>(() => {});

  useEffect(() => () => pollStopRef.current(), []);

  const poll = useCallback((want: "prepared" | "published") => {
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    pollStopRef.current = () => {
      stopped = true;
      clearTimeout(timer);
    };

    const tick = async () => {
      if (stopped) return;
      try {
        const m = await github.getJsonFile<Manifest>("content/work/publish-now.json");
        if (m && m.nonce === nonceRef.current) {
          if (m.phase === "error") {
            setManifest(m);
            setErrorMsg(m.error || "Algo falló en el proceso.");
            setState("error");
            return;
          }
          if (m.phase === want) {
            setManifest(m);
            setState(want);
            return;
          }
        }
      } catch {
        /* la API de contents puede tardar en reflejar el commit — se reintenta */
      }
      if (Date.now() - started > POLL_TIMEOUT_MS) {
        setErrorMsg("Está tardando más de lo normal. Mirá el detalle en GitHub Actions.");
        setState("error");
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
  }, []);

  async function handlePrepare() {
    setErrorMsg(null);
    setManifest(null);
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    nonceRef.current = nonce;
    setState("preparing");
    try {
      await github.triggerWorkflow("publish-now.yml", { mode: "prepare", oferta: dimension, nonce });
      poll("prepared");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No se pudo iniciar.");
      setState("error");
    }
  }

  async function handlePublish() {
    setErrorMsg(null);
    setState("publishing");
    try {
      await github.triggerWorkflow("publish-now.yml", { mode: "publish", nonce: nonceRef.current });
      poll("published");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No se pudo publicar.");
      setState("error");
    }
  }

  function reset() {
    pollStopRef.current();
    setState("idle");
    setManifest(null);
    setErrorMsg(null);
  }

  const imgUrl = manifest?.imagePath ? github.rawUrl(manifest.imagePath) : null;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="text-sm font-semibold">Publicar una story ahora</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Subí la foto arriba (dimensión <b>{dimensionLabel(dimension)}</b>), después tocá "Preparar": el sistema arma
            el copy y la imagen, la ves, y recién ahí publicás en Instagram y Facebook.
          </p>
        </div>

        {!connected && (
          <p className="rounded-md border border-dashed border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
            Conectá GitHub arriba para usar esto.
          </p>
        )}

        {state === "idle" && connected && (
          <Button onClick={handlePrepare} className="w-full sm:w-auto">
            Preparar story de {dimensionLabel(dimension)}
          </Button>
        )}

        {state === "preparing" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando copy y armando la imagen… (~1-2 min)
          </p>
        )}

        {(state === "prepared" || state === "publishing" || state === "published") && manifest && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,200px)_1fr]">
              {imgUrl && (
                <img
                  src={imgUrl}
                  alt="Vista previa de la story"
                  className="w-full rounded-md border border-border bg-muted object-contain"
                />
              )}
              <div className="space-y-1.5 text-sm">
                {manifest.headline && (
                  <p>
                    <span className="text-[11px] font-semibold text-muted-foreground">TÍTULO</span>
                    <br />
                    {manifest.headline}
                  </p>
                )}
                {manifest.subtext && (
                  <p>
                    <span className="text-[11px] font-semibold text-muted-foreground">TEXTO</span>
                    <br />
                    {manifest.subtext}
                  </p>
                )}
              </div>
            </div>

            {state === "prepared" && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={handlePublish}>
                  <Send className="mr-1.5 h-4 w-4" />
                  Publicar ahora en Instagram y Facebook
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Descartar
                </Button>
              </div>
            )}

            {state === "publishing" && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Publicando en Instagram y Facebook…
              </p>
            )}

            {state === "published" && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600">Publicada.</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/monitor">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Ver en el Monitor
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Preparar otra
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {state === "error" && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={reset}>
              Volver a empezar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
