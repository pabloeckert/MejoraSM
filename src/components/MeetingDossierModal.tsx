// src/components/MeetingDossierModal.tsx
// MODAL DE PREPARACION DE REUNIONES 1 A 1 (SPRINT S+13)
// Basado en High Output Management (Andy Grove) y The Challenger Sale (Dixon & Adamson).
// Uso interno confidencial para Pablo Eckert previo a la sesión de devolución directiva de 45 minutos.

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Download,
  Copy,
  Check,
  User,
  Building2,
  ShieldAlert,
  HelpCircle,
  CheckSquare,
  Sparkles,
  Briefcase,
} from "lucide-react";
import {
  generarMeetingDossier,
  normalizarArquetipo,
  type MeetingDossier,
} from "@/domain/meetingDossierEngine";
import { type ArquetipoDolor } from "@/domain/executiveDiagnosticEngine";
import { descargarMeetingDossierPDF } from "@/services/meetingDossierPdfGenerator";
import { cn } from "@/lib/utils";

interface MeetingDossierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    nombreDirectivo?: string;
    empresa?: string;
    cargo?: string;
    canal?: string;
    arquetipoDolor?: ArquetipoDolor;
    scoreLead?: number;
    historialMensajes?: string;
  };
}

export function MeetingDossierModal({
  open,
  onOpenChange,
  initialData,
}: MeetingDossierModalProps) {
  const [nombre, setNombre] = useState(initialData?.nombreDirectivo || "Martín Benítez");
  const [empresa, setEmpresa] = useState(initialData?.empresa || "Distribuidora San Martín");
  const [cargo, setCargo] = useState(initialData?.cargo || "Dueño / CEO");
  const [canal, setCanal] = useState(initialData?.canal || "Instagram DM");
  const [arquetipo, setArquetipo] = useState<ArquetipoDolor>(
    normalizarArquetipo(initialData?.arquetipoDolor)
  );
  const [score, setScore] = useState(initialData?.scoreLead ?? 95);
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState("apertura");
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  React.useEffect(() => {
    if (initialData?.nombreDirectivo) setNombre(initialData.nombreDirectivo);
    if (initialData?.empresa) setEmpresa(initialData.empresa);
    if (initialData?.cargo) setCargo(initialData.cargo);
    if (initialData?.canal) setCanal(initialData.canal);
    if (initialData?.arquetipoDolor) setArquetipo(normalizarArquetipo(initialData.arquetipoDolor));
    if (initialData?.scoreLead !== undefined) setScore(initialData.scoreLead);
  }, [initialData]);

  const dossier: MeetingDossier = useMemo(() => {
    return generarMeetingDossier({
      nombreDirectivo: nombre,
      empresa,
      cargo,
      canal,
      arquetipoDolor: arquetipo,
      scoreLead: score,
    });
  }, [nombre, empresa, cargo, canal, arquetipo, score]);

  const handleCopyFull = async () => {
    try {
      await navigator.clipboard.writeText(dossier.guionResumenCopiable);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(dossier.guionAperturaChallenger90s);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      // Fallback
    }
  };

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* HEADER */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <Badge className="text-[10px] font-mono uppercase tracking-wider bg-rose-100 text-rose-800 border-rose-200">
                USO INTERNO EXCLUSIVO · PABLO ECKERT
              </Badge>
              <span className="text-xs text-muted-foreground">High Output Management & Challenger Sale</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">{dossier.idDossier}</span>
          </div>

          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2 mt-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Dossier de Preparación para Reunión 1 a 1 (45 Minutos)
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Plan estratégico confidencial previo a la llamada: perfil psicológico del prospecto, guion de apertura sin titubeos, preguntas de trinchera y manejo de objeciones.
          </DialogDescription>
        </DialogHeader>

        {/* BODY TABS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* BARRA DE METADATOS DEL LEAD */}
          <div className="bg-muted/40 p-4 rounded-xl border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                {dossier.directivo.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-foreground text-sm block">{dossier.directivo}</span>
                <span className="text-muted-foreground text-xs">
                  {dossier.cargo} · {dossier.empresa} ({dossier.canal})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-semibold border-border">
                {dossier.arquetipoLabel}
              </Badge>
              <Badge className="text-[11px] font-bold bg-rose-600 text-white">
                Score Lead: {dossier.scoreLead} pts
              </Badge>
            </div>
          </div>

          {/* TABS DE SECCIONES */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 w-full h-10 p-1 bg-muted rounded-lg border border-border">
              {(
                [
                  ["apertura", "1. Apertura 90s"],
                  ["preguntas", "2. Preguntas 4D"],
                  ["objeciones", "3. Objeciones"],
                  ["checklist", "4. Checklist Previo"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "text-xs font-semibold rounded-md transition-all",
                    activeTab === key
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* TAB 1: APERTURA & PERFIL */}
            {activeTab === "apertura" && (
              <div className="space-y-4">
                <div className="bg-card border border-border p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Perfil Psicológico y Carga Mental Directiva
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Estilo de Liderazgo
                      </span>
                      <p className="mt-1 font-medium text-foreground">{dossier.perfilPsicologicoDirectivo.estiloLiderazgo}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Carga Mental
                      </span>
                      <p className="mt-1 font-medium text-foreground">{dossier.perfilPsicologicoDirectivo.cargaMentalEstimada}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Foco de Intervención
                      </span>
                      <p className="mt-1 font-medium text-foreground">{dossier.perfilPsicologicoDirectivo.focoPrincipal}</p>
                    </div>
                  </div>
                </div>

                {/* GUIÓN DE APERTURA */}
                <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#1A3D84] dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Guión Textual de Apertura (Primeros 90 Segundos)
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs font-medium text-[#1A3D84] hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/50"
                      onClick={handleCopyScript}
                    >
                      {copiedScript ? <Check className="mr-1 h-3 w-3 text-emerald-600" /> : <Copy className="mr-1 h-3 w-3" />}
                      {copiedScript ? "Copiado" : "Copiar Guión"}
                    </Button>
                  </div>
                  <blockquote className="border-l-4 border-[#1A3D84] pl-3 py-1 text-sm italic text-foreground leading-relaxed">
                    {dossier.guionAperturaChallenger90s}
                  </blockquote>
                  <p className="text-[11px] text-muted-foreground">
                    *Regla Challenger:* Luego de esta apertura, hacer silencio absoluto y permitir al directivo desahogar su realidad operativa durante 5 a 10 minutos sin interrumpir.
                  </p>
                </div>

                {/* FRICCIONES OCULTAS */}
                <div className="bg-card border border-border p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                    Hipótesis de Fricciones Ocultas no Confesadas
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {dossier.hipotesisFriccionesOcultas.map((fric, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                        <span>{fric}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: PREGUNTAS 4D */}
            {activeTab === "preguntas" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Las 4 preguntas maestras deben formularse en orden de indagación con tono consultivo y "Calidez con Verdad".
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dossier.preguntasTrinchera4D.map((item, i) => (
                    <div key={i} className="border border-border p-3.5 rounded-xl bg-card space-y-2 relative overflow-hidden">
                      <div className="h-1 w-full absolute top-0 left-0 bg-[#1A3D84]" />
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] font-bold text-[#1A3D84] border-[#1A3D84]/30">
                          Dimensión {item.dimension}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">P{i + 1}</span>
                      </div>
                      <p className="text-xs font-bold text-foreground leading-snug">"{item.pregunta}"</p>
                      <div className="bg-muted/40 p-2 rounded text-[11px] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Objetivo: {item.objetivoDiagnostico}
                        </span>
                        <span className="text-rose-700 dark:text-rose-400 font-medium block">
                          Escuchar: {item.queEscuchar}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: OBJECIONES */}
            {activeTab === "objeciones" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Anticipación táctica a los 3 bloqueos típicos del decisor y reencuadre hacia la arquitectura del proceso.
                </p>
                <div className="space-y-2.5">
                  {dossier.objecionesAnticipadas.map((obj, i) => (
                    <div key={i} className="border border-border p-3.5 rounded-xl bg-card space-y-2">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            Objeción: "{obj.objecionTipica}"
                          </span>
                          <span className="text-[10px] text-muted-foreground italic block">
                            Miedo subyacente: {obj.miedoSubyacente}
                          </span>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border-l-4 border-l-[#1A3D84] text-xs text-foreground">
                        <span className="text-[10px] font-bold text-[#1A3D84] uppercase tracking-wider block mb-0.5">
                          Reencuadre Consultivo Recomendado:
                        </span>
                        <p className="leading-relaxed">{obj.reencuadreConsultivo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: CHECKLIST PREVIO */}
            {activeTab === "checklist" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Ritual de 10 minutos previo a conectar la llamada para garantizar el estándar de Alta Dirección de Andy Grove.
                </p>
                <div className="bg-card border border-border p-4 rounded-xl space-y-2.5">
                  {dossier.checklistPreVuelo10Min.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => toggleCheck(i)}
                      className={cn(
                        "flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs select-none",
                        checkedItems[i]
                          ? "bg-emerald-50/60 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300 line-through opacity-80"
                          : "bg-muted/30 border-border text-foreground hover:bg-muted/60"
                      )}
                    >
                      <CheckSquare className={cn("h-4 w-4 mt-0.5 shrink-0", checkedItems[i] ? "text-emerald-600" : "text-muted-foreground")} />
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>

                {/* SERVICIO SUGERIDO */}
                <div className="bg-muted/40 border border-border p-3.5 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Propuesta de Cierre Recomendada
                  </span>
                  <span className="font-bold text-foreground text-sm block">
                    {dossier.propuestaServicioRecomendada.nombreServicio} ({dossier.propuestaServicioRecomendada.duracionEstimada})
                  </span>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {dossier.propuestaServicioRecomendada.focoIntervencion}
                  </p>
                  <span className="text-[#E1061E] font-medium text-[11px] block mt-1">
                    Próximo paso en la llamada: {dossier.propuestaServicioRecomendada.cierreSugerido}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="font-medium text-foreground">Documento A4 Confidencial:</span> Generación vectorial soberana para uso interno
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyFull} className="h-9">
              {copiedFull ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              {copiedFull ? "¡Dossier Copiado!" : "Copiar Dossier Completo"}
            </Button>
            <Button size="sm" onClick={() => descargarMeetingDossierPDF(dossier)} className="h-9 bg-primary text-primary-foreground font-semibold">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Descargar Dossier PDF A4 (1 Clic)
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-9">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
