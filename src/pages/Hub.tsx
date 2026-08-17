import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

// Fase 5 del plan estratégico 2026-08-16 (Un solo panel) — port fiel de
// hub/index.html: mismas 5 ofertas, mismos links directos a la UI de
// upload de GitHub (no requieren volver a implementar nada del lado del
// commit — GitHub ya resuelve el auth y el commit real). El hub/ estático
// original (accesible sin login, pensado para subir una foto rápido desde
// el celular) sigue existiendo tal cual en paralelo — esta ruta es para
// quien ya está adentro del EDA y no quiere salir a buscar la otra URL.
const OFERTAS = [
  {
    key: "personal",
    kicker: "Personal",
    title: "Liderazgo y foco",
    desc: "Todo cambio empieza en quien lidera. Gestión emocional, creencias, objetivos.",
  },
  {
    key: "organizacional",
    kicker: "Organizacional",
    title: "Equipo y cultura",
    desc: "Cuando el líder está firme, el equipo lo siente. Roles, procesos, comunicación.",
  },
  {
    key: "comercial",
    kicker: "Comercial",
    title: "Ventas y negociación",
    desc: "Un líder con confianza vende distinto. Pricing, fidelización, marketing.",
  },
  {
    key: "empresarial",
    kicker: "Empresarial",
    title: "Modelo de negocio",
    desc: "La base sobre la que todo se sostiene. Finanzas, escalabilidad, calidad.",
  },
  {
    key: "profesionalizacion",
    kicker: "Profesionalización",
    title: "Nivel integrador",
    desc: "Líderes formados, métricas claras, procesos replicables — las 4 dimensiones juntas.",
  },
];

export default function Hub() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[32px] font-medium leading-tight text-primary">Subí material</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Elegí la oferta a la que corresponde la foto. El sistema arma la story con la identidad de marca y la publica sola.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OFERTAS.map((o) => (
          <a
            key={o.key}
            href={`https://github.com/pabloeckert/MejoraSM/upload/main/content/inbox/${o.key}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Card className="h-full transition-colors hover:border-primary hover:bg-muted/40">
              <CardContent className="flex h-full flex-col gap-2.5 p-6">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-secondary">{o.kicker}</span>
                <span className="text-lg font-medium text-primary">{o.title}</span>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{o.desc}</p>
                <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                  Subir foto acá
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <Card className="border-accent/40 bg-accent/10">
        <CardContent className="p-5 text-sm leading-relaxed text-foreground">
          Por ahora solo se procesan <strong>fotos</strong> (jpg, png, webp). Los videos se pueden subir igual — quedan
          guardados — pero todavía no se arma una pieza con ellos. Eso es lo próximo.
        </CardContent>
      </Card>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Subís la foto, confirmás el commit en la pantalla que se abre, y listo — al otro día (o corriendo el workflow a
        mano) sale publicada sola en Instagram y Facebook, con el diseño de marca.
      </p>
    </div>
  );
}
