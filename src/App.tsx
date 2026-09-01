import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Onboarding } from "@/components/Onboarding";
import { AuthGate } from "@/components/AuthGate";

// PM6 (auditoría 2026-08-31): antes las 11 páginas se importaban estáticas.
// El caso de uso más citado del repo (subir una foto del celu) cargaba igual
// todo Recharts, todos los diálogos, etc. Ahora cada ruta es un chunk aparte.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Boveda = lazy(() => import("./pages/Boveda"));
const MesaDialogo = lazy(() => import("./pages/MesaDialogo"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Propuestas = lazy(() => import("./pages/Propuestas"));
const Hub = lazy(() => import("./pages/Hub"));
const Monitor = lazy(() => import("./pages/Monitor"));
const Conversaciones = lazy(() => import("./pages/Conversaciones"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthGate>
          <Onboarding />
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/boveda" element={<Boveda />} />
                  <Route path="/mesa" element={<MesaDialogo />} />
                  {/* Fase B (2026-08-31): Laboratorio se fusionó con Mesa de Diálogo (brief 2026-08-16). */}
                  <Route path="/laboratorio" element={<Navigate to="/mesa" replace />} />
                  <Route path="/configuracion" element={<Configuracion />} />
                  <Route path="/calendario" element={<Calendario />} />
                  <Route path="/propuestas" element={<Propuestas />} />
                  <Route path="/hub" element={<Hub />} />
                  <Route path="/monitor" element={<Monitor />} />
                  <Route path="/conversaciones" element={<Conversaciones />} />
                  {/* 2026-09-01: Biblioteca se sacó (no encajaba en el objetivo del
                      proyecto — Pablo). La línea de tiempo pasó a Propuestas. */}
                  <Route path="/biblioteca" element={<Navigate to="/propuestas" replace />} />
                  <Route path="/auditoria" element={<Auditoria />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthGate>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
