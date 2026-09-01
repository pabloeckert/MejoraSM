import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, MessageSquare, Zap, ArrowRight, Check, Rocket } from "lucide-react";
import { useDocuments } from "@/hooks/useVault";

const STORAGE_KEY = "eda-onboarding-completed";

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { data: documents } = useDocuments();

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  const steps = [
    {
      title: "Bienvenido a MejoraSM 🚀",
      description: "La Estratega Digital Autónoma de Mejora Continua. Te guiamos en 4 pasos rápidos.",
      icon: Zap,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            MejoraSM usa 3 agentes de IA para crear contenido estratégico para Instagram y Facebook:
          </p>
          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <span className="text-sm">🧠</span>
              </div>
              <div>
                <p className="text-sm font-medium">Estratega</p>
                <p className="text-xs text-muted-foreground">Propone temas y ángulos</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <span className="text-sm">🎨</span>
              </div>
              <div>
                <p className="text-sm font-medium">Creativo</p>
                <p className="text-xs text-muted-foreground">Redacta copys y hooks</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <span className="text-sm">🛡️</span>
              </div>
              <div>
                <p className="text-sm font-medium">Crítico</p>
                <p className="text-xs text-muted-foreground">Evalúa contra tu marca</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Paso 1: Manual de Marca",
      description: "Subí tus documentos de marca para que los agentes aprendan tu tono y estilo.",
      icon: Upload,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Los agentes necesitan contexto sobre tu marca para generar contenido alineado.
            Subí documentos como:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Manual de marca o identidad visual
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Buyer personas o perfiles de cliente
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Tono de voz y estilo de comunicación
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Posts anteriores que funcionaron bien
            </li>
          </ul>
          {documents && documents.length > 0 && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✅ Ya tenés {documents.length} documento{documents.length > 1 ? "s" : ""} en la bóveda.
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Paso 2: Mesa de Diálogo",
      description: "Los 3 agentes debaten y crean contenido. Probemos con un tema.",
      icon: MessageSquare,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            En la Mesa de Diálogo, escribís un tema y los 3 agentes trabajan juntos:
          </p>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground mb-2">Ejemplo:</p>
            <p className="text-sm font-medium italic">
              "Cómo delegar sin perder control — tips para emprendedores que están creciendo"
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            El Estratega propone el ángulo, el Creativo redacta el copy, y el Crítico evalúa
            si cumple con tu marca. Si no aprueba, podés dar feedback y reiterar.
          </p>
        </div>
      ),
    },
    {
      title: "Paso 3: El sistema publica solo",
      description: "Lo más importante que tenés que saber.",
      icon: Rocket,
      content: (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
            <p className="text-sm font-medium text-primary">
              Si el Crítico aprueba un Post o un Carrusel, MejoraSM lo agenda y lo publica solo en
              Instagram y Facebook — sin que nadie apriete "publicar".
            </p>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              Mientras esté <span className="font-medium text-foreground">Programada</span>, la cancelás desde
              <span className="font-medium text-foreground"> Propuestas</span> o el <span className="font-medium text-foreground">Calendario</span>.
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              Ya publicada, se despublica desde el <span className="font-medium text-foreground">Monitor</span>
              (Instagram hay que bajarlo a mano — limitación de Meta).
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              Las <span className="font-medium text-foreground">Stories</span> también salen solas, todos los días.
            </li>
          </ul>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{currentStep.title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentStep.description}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 mt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="py-4">{currentStep.content}</div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Saltar tutorial
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                Atrás
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Siguiente
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleComplete}>
                <Zap className="mr-1 h-4 w-4" />
                ¡Empezar!
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
