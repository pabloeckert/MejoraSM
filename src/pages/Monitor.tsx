import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, ExternalLink, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { historialApi } from "@/services/supabase";
import { github } from "@/services/github";
import { useWorkflowAction } from "@/hooks/useGithubUpload";
import { useConfirm } from "@/hooks/useConfirm";
import { toast } from "@/hooks/use-toast";

// Fase 5 del plan estratégico 2026-08-16 (Un solo panel) — port fiel de
// dashboard/index.html: mismas acciones de reversión (manage-story.yml/
// manage-post.yml/mark-manual.yml). dashboard/index.html original sigue
// existiendo tal cual en paralelo.
//
// Hallazgo real 2026-08-26 (Pablo: "por qué tengo que ir a GitHub para
// completar" al reintentar/republicar): hasta acá, cada acción armaba un
// link a GitHub Actions y pedía copiar el ID + tipear CONFIRMO a mano en
// esa pantalla. Ahora dispara el mismo workflow_dispatch directo desde acá
// (github.triggerWorkflow, mismo token ya conectado en Subir material) — el
// gesto de confirmación explícita para lo irreversible (despublicar) sigue
// existiendo, pero como un confirm() nativo en vez de tipear en GitHub. El
// link a GitHub Actions queda como respaldo, no como único camino.
//
// Fix de raíz 2026-08-17 (Pablo reportó "Failed to fetch"): el historial
// ya NO se trae de raw.githubusercontent.com — ese CDN tiene caídas reales
// y documentadas (confirmado en vivo contra githubstatus.com, y contra
// investigación de mercado: 257 incidentes de GitHub en 12 meses). Ahora
// se lee de historial_cache en Supabase, mucho más confiable, cacheado por
// sync-history.mjs/mark-manual.mjs — ver migración 016_historial_cache.sql.
const MANAGE_STORY_WORKFLOW_URL = "https://github.com/pabloeckert/MejoraSM/actions/workflows/manage-story.yml";
const MANAGE_POST_WORKFLOW_URL = "https://github.com/pabloeckert/MejoraSM/actions/workflows/manage-post.yml";

const NOMBRES_PLATAFORMA: Record<string, string> = { instagram: "Instagram", facebook: "Facebook" };

interface Platform {
  platform: string;
  status: string;
  url: string | null;
}

interface HistorialPost {
  id: string;
  date: string;
  status: string;
  content: string;
  kind: "post" | "story";
  proposalId: string | null;
  headline: string | null;
  kicker: string | null;
  oferta: string | null;
  imageUrl: string | null;
  platforms: Platform[];
}

interface AccionManual {
  postId: string;
  platform: string;
  marcadoManualEn: string;
}

async function fetchHistorial(): Promise<{ syncedAt: string | null; posts: HistorialPost[]; accionesManuales: Map<string, AccionManual> }> {
  const { data, error } = await historialApi.get();
  if (error) throw error;
  const accionesRaw = (data?.acciones_manuales as AccionManual[] | null) || [];
  return {
    syncedAt: data?.synced_at ?? null,
    posts: (data?.posts as HistorialPost[] | null) || [],
    accionesManuales: new Map(accionesRaw.map((a) => [`${a.postId}:${a.platform}`, a])),
  };
}

function badgeMeta(status: string) {
  if (status === "published") return { className: "bg-emerald-600 text-white", Icon: Check };
  if (status === "failed") return { className: "bg-destructive text-destructive-foreground", Icon: X };
  return { className: "bg-accent text-foreground", Icon: Clock };
}

// Stories se gestionan por post_id de Zernio (manage-story.yml); posts de
// feed por el id de la propuesta en Supabase (manage-post.yml) — workflows
// e ids distintos, aunque la UI se vea igual.
function manageTarget(post: HistorialPost) {
  if (post.kind === "post" && post.proposalId) {
    return {
      workflowFile: "manage-post.yml",
      workflowUrl: MANAGE_POST_WORKFLOW_URL,
      idLabel: "ID de propuesta",
      idValue: post.proposalId,
      inputKey: "proposal_id" as const,
    };
  }
  return {
    workflowFile: "manage-story.yml",
    workflowUrl: MANAGE_STORY_WORKFLOW_URL,
    idLabel: "Post ID",
    idValue: post.id,
    inputKey: "post_id" as const,
  };
}

function AvisoInstagramFallido({
  post,
  platform,
  accionesManuales,
  onDone,
}: {
  post: HistorialPost;
  platform: Platform;
  accionesManuales: Map<string, AccionManual>;
  onDone: () => void;
}) {
  const { pending, run } = useWorkflowAction();
  const marca = accionesManuales.get(`${post.id}:instagram`);
  if (marca) {
    return (
      <div className="rounded-lg border border-emerald-600 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
        ✓ Gestionado a mano el {marca.marcadoManualEn}
      </div>
    );
  }

  async function handleMarkManual() {
    const ok = await run(
      "mark-manual",
      "mark-manual.yml",
      { post_id: post.id, platform: "instagram" },
      "Se va a reflejar en el Monitor en un rato — apretá Actualizar más tarde."
    );
    if (ok) onDone();
  }

  return (
    <div className="space-y-2 rounded-lg border border-accent bg-accent/10 p-3">
      <p className="text-xs leading-relaxed text-foreground">
        Instagram no se puede despublicar por API — Meta no lo permite. Borralo manual desde la app.
        {platform.url && (
          <>
            {" "}
            <a href={platform.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Ver la story
            </a>
          </>
        )}
      </p>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full text-xs font-semibold"
        disabled={pending === "mark-manual"}
        onClick={handleMarkManual}
      >
        {pending === "mark-manual" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Ya lo borré a mano →
      </Button>
    </div>
  );
}

function AccionesFacebookFallido({ post, onDone }: { post: HistorialPost; onDone: () => void }) {
  const { pending, run } = useWorkflowAction();
  const [confirm, ConfirmUI] = useConfirm();
  const { workflowFile, workflowUrl, idValue, inputKey } = manageTarget(post);

  async function handleAction(action: "reintentar" | "despublicar") {
    if (action === "despublicar") {
      const ok = await confirm({
        title: "Despublicar de Facebook",
        description: `Esto baja realmente esta pieza de Facebook — no se puede deshacer.`,
        confirmText: "Despublicar",
        variant: "destructive",
      });
      if (!ok) return;
    }
    const ok = await run(
      action,
      workflowFile,
      { [inputKey]: idValue, platform: "facebook", action, confirmacion: "CONFIRMO" },
      action === "reintentar"
        ? "Reintentando en Facebook — se va a ver en el Monitor en un rato."
        : "Despublicando de Facebook — se va a ver en el Monitor en un rato."
    );
    if (ok) onDone();
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      {ConfirmUI}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 text-xs font-semibold"
          disabled={!!pending}
          onClick={() => handleAction("reintentar")}
        >
          {pending === "reintentar" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Reintentar en Facebook
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 text-xs font-semibold text-destructive"
          disabled={!!pending}
          onClick={() => handleAction("despublicar")}
        >
          {pending === "despublicar" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Despublicar
        </Button>
      </div>
      <a
        href={workflowUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Ver el resultado en GitHub Actions
      </a>
    </div>
  );
}

// Monitor de reversión: a diferencia del bloque de arriba (solo aparece si
// Zernio ya marcó la plataforma como "failed"), esto se muestra siempre
// para un post de feed publicado — el control humano acá es posterior a
// publicar, no un gate previo.
//
// Hallazgo real de auditoría 2026-08-25: acá solo se ofrecía el ID de
// propuesta (para manage-post.yml, que reintenta/despublica vía la API de
// Zernio), pero no había ningún link a "ya lo gestioné a mano" — el mismo
// caso real que motivó el fix a7ae187 (Pablo borrando un post directo
// desde las apps de Instagram/Facebook), pero para un post de feed
// publicado con éxito en vez de uno fallido. Si alguien improvisaba
// copiando el ID de propuesta que sí veía en pantalla y lo pegaba en
// mark-manual.yml, el registro se guardaba pero nunca iba a matchear
// contra `accionesManuales` (esa tabla usa el id real de Zernio,
// `post.id`, no el id de propuesta de Supabase) — el badge se quedaba en
// verde para siempre. Ahora se ofrecen los dos IDs, cada uno con su acción
// y su explicación, para no repetir ese bug.
const PLATAFORMAS_DESPUBLICAR: Array<{ value: "instagram" | "facebook"; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
];

// Hallazgo real 2026-08-31 (Pablo probando el token nuevo): para una
// Story/post SIN plataformas fallidas, este es el único bloque de acciones
// que se muestra (ver el ternario en PostCard más abajo) — pero antes tenía
// un guard `post.kind !== "post"` que dejaba a las Stories publicadas sin
// ningún botón, ni siquiera "marcar a mano". manageTarget() ya distinguía
// bien story/post (workflowFile/inputKey), pero handleAction estaba
// hardcodeado a manage-post.yml/proposal_id en vez de usarlo — por eso no
// alcanzaba con sacar el guard sin más, había que usar el target real.
function GestionPublicacion({ post, onDone }: { post: HistorialPost; onDone: () => void }) {
  const { pending, run } = useWorkflowAction();
  const [confirm, ConfirmUI] = useConfirm();
  const [markPlatform, setMarkPlatform] = useState<"instagram" | "facebook">("instagram");
  // UX9 (auditoría 2026-08-31): antes esta caja con 6+ controles destructivos
  // se mostraba siempre abierta en cada tarjeta de una pieza que funciona bien.
  const [open, setOpen] = useState(false);

  const { workflowFile, workflowUrl, idValue, inputKey } = manageTarget(post);

  async function handleAction(platform: "instagram" | "facebook", action: "reintentar" | "despublicar") {
    if (action === "despublicar") {
      const ok = await confirm({
        title: `Despublicar de ${NOMBRES_PLATAFORMA[platform] || platform}`,
        description: "Esto baja realmente esta pieza de la red — no se puede deshacer.",
        confirmText: "Despublicar",
        variant: "destructive",
      });
      if (!ok) return;
    }
    const key = `${action}-${platform}`;
    const ok = await run(
      key,
      workflowFile,
      { [inputKey]: idValue, platform, action, confirmacion: "CONFIRMO" },
      `${action === "reintentar" ? "Reintentando" : "Despublicando"} en ${platform} — se va a ver en el Monitor en un rato.`
    );
    if (ok) onDone();
  }

  async function handleMarkManual() {
    const ok = await run(
      `mark-manual-${markPlatform}`,
      "mark-manual.yml",
      { post_id: post.id, platform: markPlatform },
      "Se va a reflejar en el Monitor en un rato — apretá Actualizar más tarde."
    );
    if (ok) onDone();
  }

  if (!open) {
    return (
      <div className="border-t border-border pt-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] font-medium text-muted-foreground hover:text-primary hover:underline"
        >
          Gestionar (reintentar / despublicar / marcar a mano) →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      {ConfirmUI}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground">Reintentar o despublicar de verdad (vía Zernio):</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-11 text-xs"
            disabled={!!pending}
            onClick={() => handleAction("instagram", "reintentar")}
          >
            {pending === "reintentar-instagram" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Reintentar IG
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 text-xs"
            disabled={!!pending}
            onClick={() => handleAction("facebook", "reintentar")}
          >
            {pending === "reintentar-facebook" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Reintentar FB
          </Button>
          {/* B24 (auditoría 2026-08-31): Instagram no se puede despublicar por
              API (limitación de Meta). Antes este botón, al tocarlo, solo tiraba
              un toast que se explicaba a sí mismo — ahora está deshabilitado con
              el motivo a la vista. */}
          <Button
            type="button"
            variant="outline"
            className="h-11 text-xs"
            disabled
            title="Instagram no permite despublicar por API — borralo a mano y marcalo abajo"
          >
            Despublicar IG (a mano)
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 text-xs text-destructive"
            disabled={!!pending}
            onClick={() => handleAction("facebook", "despublicar")}
          >
            {pending === "despublicar-facebook" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Despublicar FB
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-[11px] font-semibold text-muted-foreground">¿Ya lo borraste vos a mano desde Instagram/Facebook?</p>
        <div className="flex gap-1.5">
          <select
            value={markPlatform}
            onChange={(e) => setMarkPlatform(e.target.value as "instagram" | "facebook")}
            aria-label="Plataforma donde lo gestionaste a mano"
            className="h-11 rounded-md border border-input bg-background px-2 text-xs"
          >
            {PLATAFORMAS_DESPUBLICAR.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 text-xs font-semibold"
            disabled={!!pending}
            onClick={handleMarkManual}
          >
            {pending === `mark-manual-${markPlatform}` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Ya lo hice a mano →
          </Button>
        </div>
      </div>

      <a
        href={workflowUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Ver el resultado en GitHub Actions ({idValue})
      </a>
    </div>
  );
}

function PostCard({
  post,
  accionesManuales,
  onDone,
  onDeleted,
}: {
  post: HistorialPost;
  accionesManuales: Map<string, AccionManual>;
  onDone: () => void;
  onDeleted: () => void;
}) {
  const fallidas = post.platforms.filter((p) => p.status === "failed");
  const [deleting, setDeleting] = useState(false);
  const [confirm, ConfirmUI] = useConfirm();

  // Hallazgo real 2026-08-27 (Pablo: "no sincroniza correctamente, no
  // esta dando informacion real ni publicado... ni en zernio"): Zernio
  // puede seguir reportando una pieza que en la práctica ya no es real
  // (borrada a mano en la red, o un dato viejo/duplicado sin ninguna
  // propuesta real detrás) — sync-history.mjs solo refleja lo que Zernio
  // devuelve, no hay forma de sacarla del Monitor. Esto borra la fila
  // SOLO de esta caché de lectura (no toca Zernio/Instagram/Facebook) —
  // si Zernio la sigue reportando de verdad, puede volver a aparecer en
  // la próxima sincronización (cada 6hs), aviso explícito en el confirm.
  async function handleDelete() {
    const ok = await confirm({
      title: "Sacar esta pieza del Monitor",
      description:
        "Solo la saca de esta vista — no borra nada de Instagram, Facebook ni Zernio. Si Zernio la sigue reportando de verdad, puede volver a aparecer en la próxima sincronización.",
      confirmText: "Sacar del Monitor",
      variant: "destructive",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const { error } = await historialApi.removePost(post.id);
      if (error) throw error;
      toast({ title: "Sacada del Monitor" });
      onDeleted();
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Error desconocido", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      {ConfirmUI}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt={post.kind === "story" ? `Story del ${post.date}` : `Post del ${post.date}`}
          loading="lazy"
          className={cn("w-full bg-muted object-cover", post.kind === "story" ? "aspect-[9/16]" : "aspect-[4/5]")}
        />
      )}
      <CardContent className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{post.date}</span>
          <div className="flex items-center gap-2">
            {post.proposalId && (
              <Link
                to={`/propuestas?id=${post.proposalId}`}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                Ver propuesta
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            <button
              type="button"
              aria-label="Sacar del Monitor"
              title="Sacar del Monitor (no toca Instagram/Facebook/Zernio)"
              onClick={handleDelete}
              disabled={deleting}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        {post.oferta && <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{post.oferta}</span>}
        {post.headline && <span className="text-sm font-medium leading-tight text-primary">{post.headline}</span>}
        <p className="text-sm leading-snug text-foreground">{post.content.slice(0, 180)}</p>

        <div className="flex flex-col gap-1.5 text-sm">
          {post.platforms.map((p, i) => {
            // Zernio reporta el estado real de publicación, pero no se
            // entera si alguien borra la pieza a mano directo desde la
            // app (bypaseando su API) — sin esto, esa plataforma seguía
            // mostrando "✓ published" para siempre. Hallazgo real
            // 2026-08-20: Pablo borró un post a mano en Instagram y
            // Facebook por un bug de copy, y acá seguía en verde.
            const manual = accionesManuales.get(`${post.id}:${p.platform}`);
            const { className, Icon } = manual
              ? { className: "bg-muted text-muted-foreground", Icon: Check }
              : badgeMeta(p.status);
            const nombre = NOMBRES_PLATAFORMA[p.platform] || p.platform;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className={cn("flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full", className)}>
                  <Icon className="h-2.5 w-2.5" />
                </span>
                {manual ? (
                  <span className="text-muted-foreground line-through decoration-muted-foreground/50">{nombre}</span>
                ) : p.url ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    {nombre}
                  </a>
                ) : (
                  <span>{nombre}</span>
                )}
                <span className="text-muted-foreground">
                  {manual ? `(borrada a mano el ${manual.marcadoManualEn})` : `(${p.status})`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-auto">
          {fallidas.length > 0
            ? fallidas.map((p, i) =>
                p.platform === "instagram" ? (
                  <AvisoInstagramFallido key={i} post={post} platform={p} accionesManuales={accionesManuales} onDone={onDone} />
                ) : (
                  <AccionesFacebookFallido key={i} post={post} onDone={onDone} />
                )
              )
            : <GestionPublicacion post={post} onDone={onDone} />}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Monitor() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["monitor-historial"],
    queryFn: fetchHistorial,
  });

  const posts = data?.posts || [];
  const accionesManuales = data?.accionesManuales || new Map<string, AccionManual>();
  const [syncing, setSyncing] = useState(false);

  // manage-post.yml/manage-story.yml solo tocan Zernio/proposals — a
  // diferencia de mark-manual.yml, no escriben historial_cache. Sin este
  // paso, un reintento/despublicación quedaba invisible acá hasta el cron
  // de sync-history de cada 6hs. Dispara sync-history.yml solo (best-effort,
  // no bloquea ni avisa si falla — Pablo siempre puede tocar "Actualizar" a
  // mano) después de darle tiempo real al workflow anterior a terminar.
  // B25 (auditoría 2026-08-31): antes eran 95s a ciegas sin ningún indicador —
  // si el workflow tardaba más, el refetch traía data vieja y parecía que falló.
  function refreshAfterAction() {
    setSyncing(true);
    setTimeout(() => {
      if (github.isConnected()) {
        github.triggerWorkflow("sync-history.yml", {}).catch(() => {
          // best-effort — el link a GitHub Actions sigue disponible como respaldo
        });
      }
      setTimeout(async () => {
        await refetch();
        setSyncing(false);
      }, 20_000);
    }, 75_000);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Monitor de stories y posts</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Historial real de lo publicado en Instagram y Facebook (stories y posts de feed) — sincronizado directo
            desde Zernio.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRefetching && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {syncing && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Sincronizando con Zernio — la acción tarda ~1–2 min en reflejarse. Podés tocar "Actualizar" más tarde si no aparece.
        </div>
      )}

      {isError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-foreground">
              No se pudo cargar el historial ({error instanceof Error ? error.message : "error"}).
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRefetching && "animate-spin")} />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isLoading && "Cargando historial…"}
          {!isLoading && posts.length === 0 && "Todavía no hay historial sincronizado."}
          {!isLoading && posts.length > 0 && data?.syncedAt && (
            <>
              {(() => {
                const stories = posts.filter((p) => p.kind === "story").length;
                const feed = posts.length - stories;
                const parts = [
                  stories > 0 ? `${stories} ${stories === 1 ? "story" : "stories"}` : null,
                  feed > 0 ? `${feed} ${feed === 1 ? "post" : "posts"} de feed` : null,
                ].filter(Boolean);
                return `${posts.length} pieza${posts.length === 1 ? "" : "s"} (${parts.join(", ")})`;
              })()}{" "}
              — última sincronización: {new Date(data.syncedAt).toLocaleString("es-AR")}
            </>
          )}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            accionesManuales={accionesManuales}
            onDone={refreshAfterAction}
            onDeleted={() => refetch()}
          />
        ))}
      </div>

      {posts.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          Reintentar/despublicar/marcar a mano se disparan directo desde acá — el link a GitHub Actions de cada pieza
          es solo para ver el detalle de la corrida si hace falta.
        </p>
      )}
    </div>
  );
}
