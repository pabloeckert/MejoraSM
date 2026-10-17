import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Chunking diferido por ruta
const TableroSemanal = lazy(() => import("./pages/TableroSemanal"));
const Boveda = lazy(() => import("./pages/Boveda"));
const MesaDialogo = lazy(() => import("./pages/MesaDialogo"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Propuestas = lazy(() => import("./pages/Propuestas"));
const SubirMaterial = lazy(() => import("./pages/SubirMaterial"));
const Monitor = lazy(() => import("./pages/Monitor"));
const Conversaciones = lazy(() => import("./pages/Conversaciones"));
const CitasStudio = lazy(() => import("./pages/CitasStudio"));
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
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<AppLayout />}>
                {/* Ruta Principal: Mesa de Revisión y Control de MejoraSM */}
                <Route path="/" element={<TableroSemanal />} />
                <Route path="/tablero" element={<TableroSemanal />} />
                <Route path="/propuestas" element={<TableroSemanal />} />
                <Route path="/boveda" element={<Boveda />} />
                <Route path="/mesa" element={<MesaDialogo />} />
                <Route path="/laboratorio" element={<Navigate to="/mesa" replace />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/hub" element={<SubirMaterial />} />
                <Route path="/subir-material" element={<SubirMaterial />} />
                <Route path="/monitor" element={<Monitor />} />
                <Route path="/conversaciones" element={<Navigate to="/" replace />} />
                <Route path="/crm" element={<Navigate to="/" replace />} />
                <Route path="/citas" element={<CitasStudio />} />
                <Route path="/citas-studio" element={<Navigate to="/citas" replace />} />
                <Route path="/biblioteca" element={<Navigate to="/boveda" replace />} />
                <Route path="/auditoria" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
