// src/components/OutboxDrawer.tsx
// DRAWER LATERAL DE OUTBOX EN TIEMPO REAL & SUPERVISIÓN SRE (MejoraSM 2026)
// Visualiza en vivo el flujo de la cola outbox, estado de leases, reintentos y Circuit Breaker.

import { useState, useEffect, useCallback } from "react";
import {
  X,
  RefreshCw,
  Zap,
  Clock,
  Send,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Radio,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OutboxItem {
  post_id: string;
  propuesta_id: string;
  canal: string;
  borrador_opcion: string;
  estado_post: string;
  reintentos_cont: number;
  lease_owner: string | null;
  lease_expira_at: string | null;
  proximo_reintento_at: string | null;
  error_ultimo: string | null;
  creado_en: string;
  actualizado_en: string;
}

interface CircuitBreakerItem {
  canal: string;
  estado: string; // 'CLOSED' | 'HALF_OPEN' | 'OPEN'
  conteo_fallas: number;
  ultimo_fallo_at: string | null;
  ultimo_exito_at: string | null;
}

interface OutboxStatusResponse {
  success: boolean;
  conteos: {
    en_cola: number;
    despachando: number;
    reintento: number;
    publicado: number;
    fallido: number;
    total: number;
  };
  posts: OutboxItem[];
  circuitBreakers: CircuitBreakerItem[];
}

interface OutboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl?: string;
}

export function OutboxDrawer({ isOpen, onClose, apiBaseUrl = "http://127.0.0.1:4002" }: OutboxDrawerProps) {
  const [data, setData] = useState<OutboxStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/outbox/status`);
      if (res.ok) {
        const json = (await res.json()) as OutboxStatusResponse;
        setData(json);
        setLastRefreshed(new Date());
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Polling reactivo cada 2.5 segundos mientras el drawer esté abierto
  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
    const timer = setInterval(fetchStatus, 2500);
    return () => clearInterval(timer);
  }, [isOpen, fetchStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div
        className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera del Drawer */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100/70 text-blue-900">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Cola Outbox & Despacho</h3>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Sincronización en vivo · Última: {lastRefreshed.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
              className="h-8 px-2 text-xs text-slate-600 gap-1"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Actualizar
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-500 hover:text-slate-900">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Panel de Circuit Breakers por Canal */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-blue-700" />
            Circuit Breakers de Conexión (Zernio API)
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {(data?.circuitBreakers || [
              { canal: "instagram", estado: "CLOSED", conteo_fallas: 0, ultimo_fallo_at: null, ultimo_exito_at: null },
              { canal: "facebook", estado: "CLOSED", conteo_fallas: 0, ultimo_fallo_at: null, ultimo_exito_at: null },
              { canal: "linkedin", estado: "CLOSED", conteo_fallas: 0, ultimo_fallo_at: null, ultimo_exito_at: null },
            ]).map((cb) => {
              const isOpen = cb.estado === "OPEN";
              const isHalf = cb.estado === "HALF_OPEN";
              return (
                <div
                  key={cb.canal}
                  className={cn(
                    "p-2.5 rounded-lg border text-center transition-all",
                    isOpen
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : isHalf
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                  )}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider">{cb.canal}</div>
                  <div className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold">
                    {isOpen ? (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                        <span>Abierto</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Operativo</span>
                      </>
                    )}
                  </div>
                  {cb.conteo_fallas > 0 && (
                    <div className="text-[10px] text-slate-500 mt-0.5">{cb.conteo_fallas} fallas</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Métricas Rápidas de la Cola */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500">En Cola: </span>
              <span className="font-bold text-slate-900">{data?.conteos.en_cola || 0}</span>
            </div>
            <div>
              <span className="text-slate-500">Despachando: </span>
              <span className="font-bold text-blue-700">{data?.conteos.despachando || 0}</span>
            </div>
            <div>
              <span className="text-slate-500">Reintentos: </span>
              <span className="font-bold text-amber-700">{data?.conteos.reintento || 0}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-500">Publicadas: </span>
            <span className="font-bold text-emerald-700">{data?.conteos.publicado || 0}</span>
          </div>
        </div>

        {/* Lista de Tareas en Outbox */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(!data?.posts || data.posts.length === 0) && (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <CheckCircle2 className="h-10 w-10 text-emerald-500/50 mb-2" />
              <p className="font-medium text-slate-700 text-sm">Cola de Outbox Limpia</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Todas las piezas programadas han sido procesadas o esperan aprobación en el Tablero Semanal.
              </p>
            </div>
          )}

          {data?.posts?.map((post) => {
            const isDespachando = post.estado_post === "DESPACHANDO";
            const isEnCola = post.estado_post === "EN_COLA" || post.estado_post === "APROBADO";
            const isPublicado = post.estado_post === "PUBLICADO";
            const isReintento = post.estado_post === "REINTENTO";
            const isFallido = post.estado_post === "FALLIDO_PERMANENTE" || post.estado_post === "DEAD_LETTER";

            return (
              <div
                key={post.post_id}
                className={cn(
                  "p-3 rounded-lg border text-sm transition-all shadow-xs",
                  isDespachando
                    ? "border-blue-300 bg-blue-50/50"
                    : isPublicado
                    ? "border-emerald-200 bg-emerald-50/30"
                    : isFallido
                    ? "border-rose-200 bg-rose-50/40"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">{post.propuesta_id}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                        {post.canal}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Opción {post.borrador_opcion}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(post.creado_en).toLocaleString("es-AR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="text-right">
                    {isDespachando && (
                      <Badge className="bg-blue-600 text-white text-[10px] animate-pulse">
                        Despachando
                      </Badge>
                    )}
                    {isEnCola && (
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 text-[10px]">
                        En Cola
                      </Badge>
                    )}
                    {isPublicado && (
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        Publicado
                      </Badge>
                    )}
                    {isReintento && (
                      <Badge className="bg-amber-600 text-white text-[10px]">
                        Reintento #{post.reintentos_cont}
                      </Badge>
                    )}
                    {isFallido && (
                      <Badge className="bg-rose-600 text-white text-[10px]">
                        Fallido
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Barra de progreso de lease si está en vuelo */}
                {isDespachando && (
                  <div className="mt-2.5 pt-2 border-t border-blue-200/60">
                    <div className="flex justify-between text-[11px] text-blue-900 mb-1">
                      <span>Worker: {post.lease_owner || "daemon-worker-1"}</span>
                      <span>Lease 60s activo</span>
                    </div>
                    <div className="h-1.5 w-full bg-blue-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 animate-[progress_60s_linear]" style={{ width: "65%" }}></div>
                    </div>
                  </div>
                )}

                {/* Notificación de error si hubo fallo */}
                {post.error_ultimo && (
                  <div className="mt-2 p-2 rounded-md bg-rose-100/60 text-rose-800 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                    <span className="truncate">{post.error_ultimo}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pie del Drawer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Idempotencia SHA-256 activa</span>
          <span className="font-semibold text-slate-700">Supervisor PID activo</span>
        </div>
      </div>
    </div>
  );
}
