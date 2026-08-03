import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  FlaskConical,
  Settings,
  CalendarDays,
  FileCheck,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import lockup from "@/assets/lockup-horizontal-color.png";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Bóveda", icon: BookOpen, path: "/boveda" },
  { label: "Mesa de Diálogo", icon: MessageSquare, path: "/mesa" },
  { label: "Laboratorio", icon: FlaskConical, path: "/laboratorio" },
  { label: "Propuestas", icon: FileCheck, path: "/propuestas" },
  { label: "Calendario", icon: CalendarDays, path: "/calendario" },
  { label: "Configuración", icon: Settings, path: "/configuracion" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar-background">
      {/* Logo */}
      <div className="px-6 py-6">
        <img src={lockup} alt="Mejora Continua" className="h-[22px] w-auto object-contain" />
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground [font-family:var(--font-heading-alt)]">
          MejoraSM
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
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
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-6 py-4">
        <button
          onClick={() => supabase.auth.signOut()}
          className="mb-2 flex w-full items-center gap-2 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
        <p className="text-xs text-muted-foreground">EDA v1.0 — MejoraOK</p>
      </div>
    </aside>
  );
}
