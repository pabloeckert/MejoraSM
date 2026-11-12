// src/components/ExecutiveDiagnosticModal.tsx
// MODAL INTERACTIVO DE DIAGNOSTICO EJECUTIVO Y ONE-PAGER B2B (SPRINT S+12)
// Basado en The Challenger Sale (Dixon & Adamson) y The Trusted Advisor (Maister).
// Permite personalizar y exportar en 1 clic un diagnóstico en PDF (A4) o texto WhatsApp.

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Copy,
  Check,
  Building2,
  User,
  Compass,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  generarDiagnosticoEjecutivo,
  inferirArquetipoDolor,
  type ArquetipoDolor,
  type DiagnosticoEjecutivo,
} from "@/domain/executiveDiagnosticEngine";
import { descargarDiagnosticoEjecutivoPDF } from "@/services/executiveDiagnosticPdfGenerator";
import { cn } from "@/lib/utils";

interface ExecutiveDiagnosticModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    nombreDirectivo?: string;
    empresa?: string;
    cargo?: string;
    arquetipoDolor?: ArquetipoDolor;
    doloresDetectados?: string[];
    scoreLead?: number;
    textoMensajeOriginal?: string;
  };
}

export function ExecutiveDiagnosticModal({
  open,
  onOpenChange,
  initialData,
}: ExecutiveDiagnosticModalProps) {
  const [nombre, setNombre] = useState(initialData?.nombreDirectivo || "Martín Benítez");
  const [empresa, setEmpresa] = useState(initialData?.empresa || "Empresa PyME");
  const [cargo, setCargo] = useState(initialData?.cargo || "Dueño / Socio Gerente");
  const [arquetipo, setArquetipo] = useState<ArquetipoDolor>(() => {
    if (initialData?.arquetipoDolor) return initialData.arquetipoDolor;
    if (initialData?.textoMensajeOriginal) {
      return inferirArquetipoDolor(
        initialData.textoMensajeOriginal,
        initialData.doloresDetectados
      );
    }
    return "fundador_saturado";
  });
  const [score, setScore] = useState(initialData?.scoreLead ?? 85);
  const [copied, setCopied] = useState(false);

  // Sincronizar datos si cambia initialData cuando se abre
  React.useEffect(() => {
    if (initialData?.nombreDirectivo) setNombre(initialData.nombreDirectivo);
    if (initialData?.empresa) setEmpresa(initialData.empresa);
    if (initialData?.cargo) setCargo(initialData.cargo);
    if (initialData?.arquetipoDolor) {
      setArquetipo(initialData.arquetipoDolor);
    } else if (initialData?.textoMensajeOriginal) {
      setArquetipo(
        inferirArquetipoDolor(
          initialData.textoMensajeOriginal,
          initialData.doloresDetectados
        )
      );
    }
    if (initialData?.scoreLead !== undefined) setScore(initialData.scoreLead);
  }, [initialData]);

  const diagnostico: DiagnosticoEjecutivo = useMemo(() => {
    return generarDiagnosticoEjecutivo({
      nombreDirectivo: nombre,
      empresa,
      cargo,
      arquetipoDolor: arquetipo,
      scoreLead: score,
    });
  }, [nombre, empresa, cargo, arquetipo, score]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diagnostico.diagnosticoResumenTexto);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    descargarDiagnosticoEjecutivoPDF(diagnostico);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* HEADER MODAL */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider text-primary border-primary/30">
                Soberano • PDF 1.4 A4
              </Badge>
              <span className="text-xs text-muted-foreground">The Challenger Sale & The Trusted Advisor</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">{diagnostico.id}</span>
          </div>

          <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2 mt-2">
            <FileText className="h-5 w-5 text-primary" />
            Diagnóstico Ejecutivo One-Pager (Documento A4)
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Generá y descargá en 1 clic un informe ejecutivo de trinchera para enviar por WhatsApp o Email a decisores B2B tras una interacción de alto potencial.
          </DialogDescription>
        </DialogHeader>

        {/* BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* CONTROLES DE PARAMETRIZACION */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-xl border border-border">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Nombre Directivo
              </Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del líder"
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> Empresa
              </Label>
              <Input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Nombre de la empresa"
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Compass className="h-3.5 w-3.5" /> Arquetipo de Fricción Principal
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["fundador_saturado", "Dueño Saturado"],
                    ["segunda_generacion", "Segunda Generación"],
                    ["estancamiento_comercial", "Ventas Intuitivas"],
                    ["calidad_entregas", "Calidad y Retrabajos"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={arquetipo === key ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 text-[11px] justify-start px-2 font-medium",
                      arquetipo === key ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setArquetipo(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* PREVIEW EDITORIAL SUIZO (A4 MOCKUP) */}
          <div className="border border-border/80 rounded-xl bg-white text-slate-900 shadow-sm p-6 sm:p-8 space-y-6 select-none relative">
            {/* TRICOLOR TOP BAR */}
            <div className="h-1.5 w-full flex rounded-full overflow-hidden">
              <div className="w-3/5 bg-[#1A3D84]" />
              <div className="w-1/5 bg-[#E1061E]" />
              <div className="w-1/5 bg-[#F7CC13]" />
            </div>

            {/* HEADER PREVIEW */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-[#1A3D84] tracking-wider uppercase block">
                  MEJORA CONTINUA
                </span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  INGENIERÍA DE PROCESOS, GOBIERNO B2B Y PROFESIONALIZACIÓN
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#E1061E] uppercase tracking-wider block">
                  DOCUMENTO CONFIDENCIAL DIRECTIVO
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {diagnostico.id} · {diagnostico.fechaEmision}
                </span>
              </div>
            </div>

            {/* DIRECTIVO Y EMPRESA CARD */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[#1A3D84]">{diagnostico.directivo}</span>{" "}
                <span className="text-slate-500">({diagnostico.cargo})</span> ·{" "}
                <span className="font-medium text-slate-800">{diagnostico.empresa}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-semibold border-slate-300 text-slate-700 bg-white">
                  {diagnostico.arquetipoLabel}
                </Badge>
                <Badge className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  Prioridad: {diagnostico.scoreOportunidad}/100
                </Badge>
              </div>
            </div>

            {/* 1. REENCUADRE CHALLENGER */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#1A3D84] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#1A3D84]" />
                1. El Reencuadre Sistémico (The Challenger Insight)
              </h4>
              <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3.5 space-y-2 text-xs">
                <p className="text-slate-500 italic">
                  Premisa común: "{diagnostico.reencuadreChallenger.premisaFalsa}"
                </p>
                <p className="font-bold text-[#1A3D84] text-[13px] leading-snug">
                  Verdad en Trinchera: "{diagnostico.reencuadreChallenger.verdadSistemica}"
                </p>
                <p className="text-rose-700 font-medium text-[11px]">
                  Paradoja de Mando: {diagnostico.reencuadreChallenger.paradojaDirectiva}
                </p>
              </div>
            </div>

            {/* 2. MATRIZ DE CAUSA RAIZ */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#1A3D84] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1A3D84]" />
                2. Matriz de Causa Raíz Sistémica (Síntoma vs Causa Real)
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <div className="grid grid-cols-12 bg-slate-100 p-2 font-bold text-slate-700 text-[11px] border-b border-slate-200">
                  <div className="col-span-4">Síntoma en Trinchera</div>
                  <div className="col-span-5">Causa Raíz en el Sistema</div>
                  <div className="col-span-3">Impacto en Negocio</div>
                </div>
                {diagnostico.matrizCausaRaiz.map((row, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "grid grid-cols-12 p-2.5 text-[11px] items-start border-b border-slate-100 last:border-b-0",
                      idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                    )}
                  >
                    <div className="col-span-4 font-semibold text-slate-800 pr-2">{row.sintomaVisible}</div>
                    <div className="col-span-5 text-[#1A3D84] font-medium pr-2">{row.causaRaizSistemica}</div>
                    <div className="col-span-3 text-slate-500 italic text-[10px]">{row.impactoNegocio}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. MARCO DE LAS 4 DIMENSIONES */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#1A3D84] uppercase tracking-wider">
                3. Marco Metodológico de las 4 Dimensiones
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {diagnostico.cuatroDimensiones.map((dim) => (
                  <div key={dim.id} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 border-l-4 border-l-[#1A3D84]">
                    <span className="font-bold text-[#1A3D84] text-[11px] block">{dim.nombre}</span>
                    <span className="text-slate-600 text-[11px] block mt-0.5">{dim.enfoque}</span>
                    <span className="text-[#E1061E] font-semibold text-[10.5px] block mt-1">
                      Meta: {dim.metaClave}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. HOJA DE RUTA 90 DIAS */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#1A3D84] uppercase tracking-wider">
                4. Hoja de Ruta Sugerida de Desahogo y Orden (90 Días)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {diagnostico.hojaDeRuta90Dias.map((fase, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                    <span className="inline-block px-1.5 py-0.5 bg-[#1A3D84] text-white rounded text-[10px] font-bold">
                      {fase.fase}: {fase.periodo}
                    </span>
                    <span className="font-bold text-slate-800 text-[11px] block mt-1.5 leading-tight">
                      {fase.objetivo}
                    </span>
                    <span className="text-slate-500 text-[10px] block mt-1">
                      Entregable: {fase.entregable}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA AGENDAMIENTO CALLOUT */}
            <div className="bg-blue-50/80 border border-[#1A3D84]/30 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[#1A3D84] block">
                  Próximo Paso: Sesión de Devolución Directiva 1 a 1 (45 min)
                </span>
                <span className="text-slate-600 text-[11px]">
                  Análisis confidencial de procesos y acuerdos con Pablo Eckert. Sin costo ni juicio a las personas.
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-[#1A3D84] bg-white px-2.5 py-1 rounded border border-[#1A3D84]/20">
                mejoraok.com/diagnostico
              </span>
            </div>

            {/* TRICOLOR FOOTER BAR */}
            <div className="h-1.5 w-full flex rounded-full overflow-hidden">
              <div className="w-3/5 bg-[#1A3D84]" />
              <div className="w-1/5 bg-[#E1061E]" />
              <div className="w-1/5 bg-[#F7CC13]" />
            </div>
          </div>
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="font-medium text-foreground">Formato A4 Listo:</span> 595 × 842 pt • Vectorial puro sin dependencias
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="h-9">
              {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              {copied ? "¡Copiado a portapapeles!" : "Copiar para WhatsApp"}
            </Button>
            <Button size="sm" onClick={handleDownload} className="h-9 bg-primary text-primary-foreground font-semibold">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Descargar PDF A4 (1 Clic)
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
