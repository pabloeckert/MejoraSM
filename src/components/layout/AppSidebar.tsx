import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  FlaskConical,
  Settings,
  CalendarDays,
  FileCheck,
  Upload,
  MonitorPlay,
  Images,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import lockup from "@/assets/lockup-horizontal-color.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

// D6 (auditoría 2026-08-31): antes 11 ítems en una lista plana sin jerarquía, y
// "Subir material" 7º pese a ser el arranque del flujo real. Ahora agrupados
// por rol y "Subir material" arriba, en "Crear".
const navGroups: { label: string; items: { label: string; icon: typeof LayoutDashboard; path: string }[] }[] = [
  {
    label: "Panel",
    items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/" }],
  },
  {
    label: "Crear contenido",
    items: [
      { label: "Subir material", icon: Upload, path: "/hub" },
      { label: "Bóveda", icon: BookOpen, path: "/boveda" },
      { label: "Mesa de Diálogo", icon: MessageSquare, path: "/mesa" },
      { label: "Laboratorio", icon: FlaskConical, path: "/laboratorio" },
    ],
  },
  {
    label: "Publicar y gestionar",
    items: [
      { label: "Propuestas", icon: FileCheck, path: "/propuestas" },
      { label: "Calendario", icon: CalendarDays, path: "/calendario" },
      { label: "Monitor", icon: MonitorPlay, path: "/monitor" },
      { label: "Biblioteca", icon: Images, path: "/biblioteca" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Auditoría", icon: ShieldCheck, path: "/auditoria" },
      { label: "Configuración", icon: Settings, path: "/configuracion" },
    ],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <img src={lockup} alt="Mejora Continua" className="h-[22px] w-auto object-contain" />
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground [font-family:var(--font-heading-alt)]">
          MejoraSM
        </p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-muted hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-6 py-4">
        <p className="text-xs text-muted-foreground">MejoraSM — Mejora Continua</p>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Barra superior mobile (<768px) — el aside fijo de escritorio no
          entra en un celular, así que acá vive el disparador del menú.
          Hallazgo real de auditoría 2026-08-25: sin esto, la app era
          prácticamente inusable desde el teléfono. */}
      <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar-background px-4 py-3 md:hidden">
        <img src={lockup} alt="Mejora Continua" className="h-[18px] w-auto object-contain" />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menú de navegación"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SheetContent side="left" className="w-72 bg-sidebar-background p-0">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <SheetDescription className="sr-only">Accesos a todas las secciones de MejoraSM</SheetDescription>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Sidebar fijo de escritorio (≥768px) */}
      <aside className="hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar-background md:flex">
        <SidebarNav />
      </aside>
    </>
  );
}
