import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, RotateCcw, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { github } from "@/services/github";
import { useDirListing } from "@/hooks/useGithubUpload";
import { dimensionLabel } from "@/shared/constants";

const IMG_RE = /\.(jpe?g|png|webp)$/i;
const MANIFEST_PATH = "content/work/publish-now.json";

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
  updatedAt?: string;
  // Collage de 2 fotos (2026-09-04) — informativo, lo escribe publish-now-manifest.mjs.
  mode?: "foto" | "collage" | "solo-texto";
}

type UiState = "idle" | "preparing" | "prepared" | "publishing" | "published" | "error";

const POLL_MS = 6000;
const POLL_TIMEOUT_MS = 8 * 60 * 1000;
const FRESH_MS = 2 * 60 * 60 * 1000; // un manifiesto más viejo que esto no se "resume"

function ts(iso?: string) {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

export function PublishNowCard({ dimension }: { dimension: string }) {
  const [state, setState] = useState<UiState>("idle");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Collage de 2 fotos (2026-09-04, pedido de Pablo: "más plantillas... si no
  // podés automático, dejame editar") — opción manual, solo visible cuando
  // hay 2+ fotos reales; sin tocarla, el comportamiento de siempre no cambia.
  const [useCollage, setUseCollage] = useState(false);
  const nonceRef = useRef<string>("");
  const startedRef = useRef<number>(0); // cuándo se disparó la fase actual
  const pollStopRef = useRef<() => void>(() => {});
  const stateRef = useRef<UiState>("idle");
  stateRef.current = state;
  const qc = useQueryClient();

  const inboxPath = `content/inbox/${dimension}`;
  const { data: inboxFiles } = useDirListing(inboxPath);
  const photoCount = (inboxFiles ?? []).filter((f) => f.type === "file" && IMG_RE.test(f.name)).length;
  const hasPhoto = photoCount > 0;
  const hasTwoPhotos = photoCount >= 2;

  useEffect(() => () => pollStopRef.current(), []);

  // Al montar / cambiar de dimensión: si ya hay un manifiesto "prepared"
  // reciente de esta dimensión, mostrarlo (para no perder el trabajo si la
  // pestaña se recargó o el polling se cortó). No pisa un flujo en curso.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await github.getJsonFile<Manifest>(MANIFEST_PATH);
        if (cancelled || !m) return;
        const fresh = Date.now() - ts(m.updatedAt) < FRESH_MS;
        const resumable = m.phase === "prepared" || m.phase === "published" || m.phase === "error";
        if (fresh && m.oferta === dimension && resumable && stateRef.current === "idle") {
          nonceRef.current = m.nonce || "";
          setManifest(m);
          if (m.phase === "error") {
            setErrorMsg(m.error || "La preparación anterior falló. Probá de nuevo.");
            setState("error");
          } else {
            setState(m.phase);
          }
        }
      } catch {
        /* si falla, arranca en idle nomás */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dimension]);

  const poll = useCallback(
    (want: "prepared" | "published") => {
      const started = Date.now();
      startedRef.current = started;
      let timer: ReturnType<typeof setTimeout>;
      let stopped = false;
      pollStopRef.current = () => {
        stopped = true;
        clearTimeout(timer);
      };

      const tick = async () => {
        if (stopped) return;
        try {
          const m = await github.getJsonFile<Manifest>(MANIFEST_PATH);
          // Un usuario solo: un manifiesto que llegó DESPUÉS de disparar esta
          // fase (o cuyo nonce coincide) es el nuestro.
          const mine = m && (m.nonce === nonceRef.current || ts(m.updatedAt) >= started - 5000);
          if (m && mine) {
            if (m.phase === "error") {
              setManifest(m);
              setErrorMsg(m.error || "Algo falló en el proceso.");
              setState("error");
              return;
            }
            if (m.phase === want) {
              setManifest(m);
              setState(want);
              qc.invalidateQueries({ queryKey: ["gh-dir", inboxPath] });
              qc.invalidateQueries({ queryKey: ["gh-dir", `content/used/${dimension}`] });
              return;
            }
          }
        } catch {
          /* la API de contents puede tardar en reflejar el commit — se reintenta */
        }
        if (Date.now() - started > POLL_TIMEOUT_MS) {
          setErrorMsg("Está tardando más de lo normal — recargá esta página en un rato, puede que ya esté lista.");
          setState("error");
          return;
        }
        timer = setTimeout(tick, POLL_MS);
      };
      timer = setTimeout(tick, 3000);
    },
    [qc, inboxPath, dimension]
  );

  async function handlePrepare() {
    setErrorMsg(null);
    setManifest(null);
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    nonceRef.current = nonce;
    setState("preparing");
    try {
      await github.triggerWorkflow("publish-now.yml", {
        mode: "prepare",
        oferta: dimension,
        nonce,
        collage: String(hasTwoPhotos && useCollage),
      });
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
    // Hallazgo real (2026-09-01): "Descartar" solo tocaba el estado local —
    // el manifiesto seguía "prepared" en el repo, así que una recarga de
    // página (o el resume al cambiar de pestaña) volvía a mostrar la MISMA
    // pieza que Pablo ya había descartado. Se marca discarded en el repo
    // para que el resume no la vuelva a levantar. Best-effort: si falla (sin
    // red, token vencido), no bloquea volver a idle — el peor caso es que
    // reaparezca al recargar, no que la app quede trabada.
    if (manifest && (state === "prepared" || state === "error")) {
      github
        .putJsonFile(MANIFEST_PATH, { ...manifest, phase: "discarded", updatedAt: new Date().toISOString() }, "publicar ahora: descartado")
        .catch(() => {});
    }
    setState("idle");
    setManifest(null);
    setErrorMsg(null);
    setUseCollage(false);
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

        {state === "idle" && (
          <div className="space-y-2">
            {hasTwoPhotos && (
              <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={useCollage}
                  onChange={(e) => setUseCollage(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Armar un collage con las 2 fotos más recientes, en vez de una sola story
              </label>
            )}
            <Button onClick={handlePrepare} disabled={!hasPhoto} className="w-full sm:w-auto">
              Preparar {useCollage && hasTwoPhotos ? "collage" : "story"} de {dimensionLabel(dimension)}
            </Button>
            {!hasPhoto && (
              <p className="text-xs text-muted-foreground">
                Primero subí una foto de <b>{dimensionLabel(dimension)}</b> arriba.
              </p>
            )}
          </div>
        )}

        {state === "preparing" && (
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando copy y armando la imagen… (~1-2 min)
            </p>
            <p className="text-xs text-muted-foreground">
              Si tarda mucho, podés recargar la página — cuando esté lista, la vas a ver acá igual.
            </p>
          </div>
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
                {manifest.mode === "collage" && (
                  <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    Collage (2 fotos)
                  </span>
                )}
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
            {errorMsg?.includes("JSON") || errorMsg?.includes("brief") ? (
              <p className="text-xs text-muted-foreground">
                Fue un hipo del generador de texto, no un problema de la foto. Suele andar al reintentar.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {hasPhoto ? (
                <Button size="sm" onClick={handlePrepare}>
                  Reintentar
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Subí de nuevo una foto de <b>{dimensionLabel(dimension)}</b> arriba para reintentar.
                </p>
              )}
              <Button variant="outline" size="sm" onClick={reset}>
                Volver a empezar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
