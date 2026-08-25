import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { historialApi } from "@/services/supabase";

// Fase 5 del plan estratégico 2026-08-16 (Un solo panel) — port fiel de
// dashboard/index.html: mismas acciones de reversión (manage-story.yml/
// manage-post.yml/mark-manual.yml, siempre por link a GitHub Actions — acá
// tampoco se ejecuta nada directo, solo se arma el link y se copia el ID,
// el "Run workflow" con CONFIRMO lo hace Pablo en GitHub).
// dashboard/index.html original sigue existiendo tal cual en paralelo.
//
// Fix de raíz 2026-08-17 (Pablo reportó "Failed to fetch"): el historial
// ya NO se trae de raw.githubusercontent.com — ese CDN tiene caídas reales
// y documentadas (confirmado en vivo contra githubstatus.com, y contra
// investigación de mercado: 257 incidentes de GitHub en 12 meses). Ahora
// se lee de historial_cache en Supabase, mucho más confiable, cacheado por
// sync-history.mjs/mark-manual.mjs — ver migración 016_historial_cache.sql.
const MANAGE_STORY_WORKFLOW_URL = "https://github.com/pabloeckert/MejoraSM/actions/workflows/manage-story.yml";
const MANAGE_POST_WORKFLOW_URL = "https://github.com/pabloeckert/MejoraSM/actions/workflows/manage-post.yml";
const MARK_MANUAL_WORKFLOW_URL = "https://github.com/pabloeckert/MejoraSM/actions/workflows/mark-manual.yml";

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

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-7 gap-1 px-2 text-xs", copied && "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600")}
      onClick={() => {
        navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy className="h-3 w-3" />
      {copied ? "Copiado ✓" : "Copiar ID"}
    </Button>
  );
}

// Stories se gestionan por post_id de Zernio (manage-story.yml); posts de
// feed por el id de la propuesta en Supabase (manage-post.yml) — workflows
// e ids distintos, aunque la UI se vea igual.
function manageTarget(post: HistorialPost) {
  if (post.kind === "post" && post.proposalId) {
    return { workflowUrl: MANAGE_POST_WORKFLOW_URL, idLabel: "ID de propuesta", idValue: post.proposalId };
  }
  return { workflowUrl: MANAGE_STORY_WORKFLOW_URL, idLabel: "Post ID", idValue: post.id };
}

function AvisoInstagramFallido({ post, platform, accionesManuales }: { post: HistorialPost; platform: Platform; accionesManuales: Map<string, AccionManual> }) {
  const marca = accionesManuales.get(`${post.id}:instagram`);
  if (marca) {
    return (
      <div className="rounded-lg border border-emerald-600 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
        ✓ Gestionado a mano el {marca.marcadoManualEn}
      </div>
    );
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
      <div className="flex items-center gap-2">
        <code className="max-w-[110px] truncate rounded bg-muted px-1.5 py-0.5 text-[11px]" title={post.id}>
          {post.id}
        </code>
        <CopyIdButton id={post.id} />
      </div>
      <a
        href={MARK_MANUAL_WORKFLOW_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-md border border-border py-1.5 text-center text-xs font-semibold hover:border-primary"
      >
        Ya lo borré a mano →
      </a>
    </div>
  );
}

function AccionesFacebookFallido({ post }: { post: HistorialPost }) {
  const { workflowUrl, idLabel, idValue } = manageTarget(post);
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center gap-2">
        <code className="max-w-[110px] truncate rounded bg-muted px-1.5 py-0.5 text-[11px]" title={idValue}>
          {idValue}
        </code>
        <CopyIdButton id={idValue} />
      </div>
      <a
        href={workflowUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-md border border-border py-1.5 text-center text-xs font-semibold hover:border-primary"
      >
        Ir a Actions → Run workflow
      </a>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Con el {idLabel} copiado: abrí el link de arriba, "Run workflow", pegalo, elegí "facebook" y la acción (reintentar
        la crea de nuevo con la misma imagen; despublicar la baja de verdad). En "confirmacion" escribí exactamente
        CONFIRMO — cualquier otro valor corta sin hacer nada.
      </p>
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
function GestionPostDeFeed({ post }: { post: HistorialPost }) {
  if (post.kind !== "post" || !post.proposalId) return null;
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground">Reintentar o despublicar de verdad (vía Zernio):</p>
        <div className="flex items-center gap-2">
          <code className="max-w-[110px] truncate rounded bg-muted px-1.5 py-0.5 text-[11px]" title={post.proposalId}>
            {post.proposalId}
          </code>
          <CopyIdButton id={post.proposalId} />
        </div>
        <a
          href={MANAGE_POST_WORKFLOW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-md border border-border py-1.5 text-center text-xs font-semibold hover:border-primary"
        >
          Ir a Actions → Run workflow
        </a>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Con el ID de propuesta copiado: "Run workflow", elegí la plataforma y "despublicar" (Facebook se baja de verdad;
          Instagram no se puede despublicar por API — hay que borrarlo a mano desde la app). En "confirmacion" escribí
          exactamente CONFIRMO.
        </p>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-[11px] font-semibold text-muted-foreground">¿Ya lo borraste vos a mano desde Instagram/Facebook?</p>
        <div className="flex items-center gap-2">
          <code className="max-w-[110px] truncate rounded bg-muted px-1.5 py-0.5 text-[11px]" title={post.id}>
            {post.id}
          </code>
          <CopyIdButton id={post.id} />
        </div>
        <a
          href={MARK_MANUAL_WORKFLOW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-md border border-border py-1.5 text-center text-xs font-semibold hover:border-primary"
        >
          Ya lo hice a mano →
        </a>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Con este otro ID (no el de propuesta) pegado en "post_id" y la plataforma correcta, marca el post como
          gestionado a mano — así el badge deja de mostrarlo en verde acá.
        </p>
      </div>
    </div>
  );
}

function PostCard({ post, accionesManuales }: { post: HistorialPost; accionesManuales: Map<string, AccionManual> }) {
  const fallidas = post.platforms.filter((p) => p.status === "failed");

  return (
    <Card className="flex flex-col overflow-hidden">
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
          {post.proposalId && (
            <Link
              to={`/propuestas?id=${post.proposalId}`}
              className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              Ver propuesta
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
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
                  <AvisoInstagramFallido key={i} post={post} platform={p} accionesManuales={accionesManuales} />
                ) : (
                  <AccionesFacebookFallido key={i} post={post} />
                )
              )
            : <GestionPostDeFeed post={post} />}
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

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[32px] font-medium leading-tight text-primary">Monitor de stories y posts</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Historial real de lo publicado en Instagram y Facebook (stories y posts de feed) — sincronizado directo desde
          Zernio.
        </p>
      </div>

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
              {posts.length} story(s) — última sincronización:{" "}
              {new Date(data.syncedAt).toLocaleString("es-AR")}
            </>
          )}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} accionesManuales={accionesManuales} />
        ))}
      </div>

      {posts.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          Los links de "Run workflow" abren GitHub Actions en una pestaña nueva — ninguna acción se ejecuta desde acá.
        </p>
      )}
    </div>
  );
}
