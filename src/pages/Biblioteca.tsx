import { ExternalLink } from "lucide-react";

// Fase 5 del plan estratégico 2026-08-16 (Un solo panel) — decisión de
// diseño explícita: biblioteca/ es una SPA vanilla JS de ~2000 líneas, con
// escritura real al repo vía un PAT de GitHub guardado en localStorage
// (ver biblioteca/github.js) y uso diario activo por parte de Pablo.
// Reescribirla en React a ciegas en una sola pasada, sin poder probar el
// commit real (necesita el PAT real de Pablo en su propio navegador —
// misma limitación ya documentada varias veces en este archivo), es un
// riesgo real de regresión sobre una herramienta crítica que no vale la
// pena correr solo para que "viva en React". En cambio, esta ruta embebe
// la página estática existente TAL CUAL — cero cambios de código ahí, cero
// riesgo funcional — y la hace accesible sin salir del EDA. La versión
// standalone (fuera del EDA, sin requerir login de Supabase) sigue
// existiendo en paralelo, sin tocar.
const BIBLIOTECA_URL = new URL("../biblioteca/", window.location.origin + import.meta.env.BASE_URL).toString();

export default function Biblioteca() {
  if (import.meta.env.DEV) {
    return (
      <div className="space-y-4">
        <h1 className="text-[32px] font-medium leading-tight text-primary">Biblioteca de Contenido</h1>
        <p className="text-sm text-muted-foreground">
          En desarrollo local, biblioteca/ no se sirve desde el dev server de Vite (es un sitio estático aparte, combinado
          solo en el deploy de producción). Esta pantalla funciona en el sitio publicado.
        </p>
        <a
          href="https://pabloeckert.github.io/MejoraSM/biblioteca/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline"
        >
          Abrir la Biblioteca en producción
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-medium leading-tight text-primary">Biblioteca de Contenido</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Cargar, etiquetar y organizar el contenido que alimenta las Stories.
          </p>
        </div>
        <a
          href={BIBLIOTECA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          Abrir en pestaña nueva
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <iframe
        src={BIBLIOTECA_URL}
        title="Biblioteca de Contenido"
        className="h-[80vh] w-full rounded-lg border border-border"
      />
    </div>
  );
}
