import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  FlaskConical,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Bóveda", icon: BookOpen, path: "/boveda" },
  { label: "Mesa de Diálogo", icon: MessageSquare, path: "/mesa" },
  { label: "Laboratorio", icon: FlaskConical, path: "/laboratorio" },
  { label: "Configuración", icon: Settings, path: "/configuracion" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar-background">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">
            EDA
          </h1>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Estratega Digital
          </p>
        </div>
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
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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
        <p className="text-xs text-muted-foreground">EDA v0.1 — MVP</p>
      </div>
    </aside>
  );
}
