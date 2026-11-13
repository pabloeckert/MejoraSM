// src/components/CustomerSuccessSection.tsx
// SECCIÓN DE BIBLIOTECA DE CASOS DE ÉXITO DE AUTORIDAD B2B EN BÓVEDA
// Basado en Donald Miller (Building a StoryBrand) y Robert Cialdini (Influence: Social Proof).

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Copy, Eye, Check, TrendingUp, Building2, ArrowRight } from "lucide-react";
import {
  obtenerCasosExitoBiblioteca,
  formatearCasoWhatsApp,
  type CustomerCase,
  type ArquetipoCaso,
} from "@/domain/customerSuccessEngine";
import { descargarCasoExitoPDF } from "@/services/customerSuccessPdfGenerator";
import { CustomerSuccessModal } from "@/components/CustomerSuccessModal";
import { toast } from "@/hooks/use-toast";

export function CustomerSuccessSection() {
  const casos = obtenerCasosExitoBiblioteca();
  const [selectedCase, setSelectedCase] = useState<CustomerCase | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopiarWA(caso: CustomerCase) {
    const texto = formatearCasoWhatsApp(caso);
    navigator.clipboard.writeText(texto).then(() => {
      setCopiedId(caso.id);
      toast({
        title: "Caso de Éxito copiado",
        description: `Snippet para WhatsApp del caso [${caso.empresa}] copiado al portapapeles.`,
      });
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  function handleDescargar(caso: CustomerCase) {
    try {
      descargarCasoExitoPDF(caso);
      toast({
        title: "Descarga de Caso A4 iniciada",
        description: `Archivo: Caso_Exito_${caso.arquetipo}_${caso.id}.pdf`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al descargar PDF",
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return (
    <Card className="border-border shadow-xs overflow-hidden">
      {/* Barra tricolor superior */}
      <div className="h-1.5 w-full flex">
        <div className="bg-[#1A3D84] flex-[3]" />
        <div className="bg-[#E1061E] flex-1" />
        <div className="bg-[#F7CC13] flex-1" />
      </div>

      <CardHeader className="p-5 pb-3 border-b border-border bg-muted/10 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-[#1A3D84] text-[#1A3D84] dark:text-blue-400 font-bold text-xs uppercase"
              >
                CASOS DE ÉXITO DE AUTORIDAD B2B
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                Donald Miller & Robert Cialdini
              </Badge>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs"
              >
                <Award className="h-3 w-3 mr-1 text-emerald-600" />
                4 Arquetipos de Trinchera
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
              Biblioteca de Prueba Social & Transformación Directiva
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Casos de estudio verificados en las 4 dimensiones (Personal, Organizacional, Comercial, Empresarial) listos para descargar en PDF A4 o enviar a prospectos directivos.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {casos.map((caso) => {
            const metricaClave = caso.metricasImpacto.find((m) => m.destaque) || caso.metricasImpacto[0];
            return (
              <div
                key={caso.id}
                className="p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      {caso.rubro}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono capitalize">
                      {caso.arquetipo.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <h4 className="text-sm font-bold text-foreground leading-snug">
                    {caso.titulo}
                  </h4>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span>{caso.empresa}</span>
                    <span>·</span>
                    <span>{caso.tamano}</span>
                  </div>

                  {/* Tarjeta de métrica destacada */}
                  {metricaClave && (
                    <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-900 text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {metricaClave.metrica}
                        </span>
                        <div className="text-xs text-foreground">
                          {metricaClave.antes} <ArrowRight className="inline h-3 w-3 mx-0.5 text-muted-foreground" /> <strong className="text-primary">{metricaClave.despues}</strong>
                        </div>
                      </div>
                      <Badge className="bg-[#1A3D84] text-white text-[10px] font-bold">
                        {metricaClave.cambio}
                      </Badge>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground italic line-clamp-2">
                    "{caso.transformacion.citaHeroe}"
                  </p>
                </div>

                {/* Botones de acción rápida */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold flex-1 border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => setSelectedCase(caso)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Ver Caso Completo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-border"
                    onClick={() => handleCopiarWA(caso)}
                    title="Copiar texto para WhatsApp"
                  >
                    {copiedId === caso.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-border"
                    onClick={() => handleDescargar(caso)}
                    title="Descargar PDF A4 del caso"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Modal interactivo al seleccionar caso */}
      {selectedCase && (
        <CustomerSuccessModal
          open={Boolean(selectedCase)}
          onOpenChange={(open) => !open && setSelectedCase(null)}
          initialData={{
            arquetipo: selectedCase.arquetipo,
            empresa: selectedCase.empresa,
            rubro: selectedCase.rubro,
            rolProtagonista: selectedCase.rolProtagonista,
          }}
        />
      )}
    </Card>
  );
}
