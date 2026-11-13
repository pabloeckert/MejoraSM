// src/components/PipelineExporterModal.tsx
// CENTRO DE EXPORTACIÓN Y SINCRONIZACIÓN CON PLANILLAS (CSV RFC 4180 / GOOGLE SHEETS TSV)
// SPRINT S+18 · Basado en Martin Kleppmann (DDIA: Soberanía de Datos) & Peter Drucker (Managing for Results).

import { useState, useMemo, useEffect } from "react";
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
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Table as TableIcon,
  TrendingUp,
  Users,
  CalendarDays,
  Layers,
  Info,
} from "lucide-react";
import {
  generarPaqueteCsvCompleto,
  type TipoDatasetExportacion,
  type InputExportacionCsv,
} from "@/domain/pipelineCsvExporterEngine";
import { formatearMonedaARS } from "@/domain/executiveOperationsMemoEngine";
import {
  descargarCsvDataset,
  descargarPaqueteMaestroCsv,
} from "@/services/csvDownloadService";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface PipelineExporterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDataset?: TipoDatasetExportacion;
  exportInput?: InputExportacionCsv;
}

const DATASET_TABS: Array<{
  id: TipoDatasetExportacion;
  label: string;
  Icon: typeof TrendingUp;
}> = [
  { id: "embudo_roi", label: "1. Embudo & ROI B2B", Icon: TrendingUp },
  { id: "prospectos_sla", label: "2. Prospectos & SLA 48h", Icon: Users },
  { id: "grilla_editorial_26s", label: "3. Grilla 26 Semanas & UTMs", Icon: CalendarDays },
  { id: "memo_grove_socios", label: "4. Indicadores Grove (Socios)", Icon: Layers },
];

export function PipelineExporterModal({
  open,
  onOpenChange,
  initialDataset = "embudo_roi",
  exportInput,
}: PipelineExporterModalProps) {
  const [activeDataset, setActiveDataset] =
    useState<TipoDatasetExportacion>(initialDataset);
  const [copiedSheets, setCopiedSheets] = useState(false);

  useEffect(() => {
    if (open && initialDataset) {
      setActiveDataset(initialDataset);
    }
  }, [open, initialDataset]);

  const paquete = useMemo(() => {
    return generarPaqueteCsvCompleto(exportInput);
  }, [exportInput]);

  const datasetActivo = paquete.datasets[activeDataset];

  async function handleCopiarParaGoogleSheets() {
    try {
      await navigator.clipboard.writeText(datasetActivo.tsvContent);
      setCopiedSheets(true);
      toast({
        title: "Tabla copiada para Google Sheets / Excel",
        description: `${datasetActivo.resumenMetricas.totalFilas} filas en formato TSV listas para pegar con Ctrl+V.`,
      });
      setTimeout(() => setCopiedSheets(false), 2500);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo copiar al portapapeles",
        description: err instanceof Error ? err.message : "Permiso denegado",
      });
    }
  }

  function handleDescargarIndividual() {
    try {
      descargarCsvDataset(datasetActivo);
      toast({
        title: "Archivo CSV descargado",
        description: `Se descargó ${datasetActivo.nombreArchivo} con UTF-8 BOM.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al descargar CSV",
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  function handleDescargarMaestro() {
    try {
      descargarPaqueteMaestroCsv(paquete);
      toast({
        title: "Reporte Maestro Consolidado descargado",
        description: `Backup 4 en 1 generado: ${paquete.nombreArchivoMaestro}`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al descargar Reporte Maestro",
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Barra tricolor superior institucional */}
        <div className="h-1.5 w-full flex">
          <div className="bg-[#1A3D84] flex-[3]" />
          <div className="bg-[#E1061E] flex-1" />
          <div className="bg-[#F7CC13] flex-1" />
        </div>

        {/* Encabezado Directivo */}
        <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-[#1A3D84] text-[#1A3D84] dark:text-blue-400 font-bold text-xs uppercase"
                >
                  DATA PORTABILITY & BACKUP SOBERANO
                </Badge>
                <Badge variant="secondary" className="text-xs font-mono">
                  Martin Kleppmann (DDIA) & Peter Drucker
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs"
                >
                  RFC 4180 UTF-8 BOM • Google Sheets Ready
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Centro de Exportación y Sincronización con Planillas (CSV / Google Sheets)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Portabilidad inmutable de métricas B2B, auditoría de SLAs 48h, grilla editorial y memorando semanal sin dependencias externas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Pestañas Selector de Dataset */}
        <div className="flex flex-wrap border-b border-border px-5 bg-background">
          {DATASET_TABS.map(({ id, label, Icon }) => {
            const activo = activeDataset === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveDataset(id)}
                className={cn(
                  "px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
                  activo
                    ? "border-[#1A3D84] text-[#1A3D84] dark:text-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 4 Tarjetas Resumen del Dataset Activo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 space-y-0.5">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Filas Exportables
              </span>
              <div className="text-xl font-bold text-foreground">
                {datasetActivo.resumenMetricas.totalFilas}
              </div>
              <span className="text-[11px] text-muted-foreground block truncate">
                {datasetActivo.nombreArchivo}
              </span>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Columnas Estructuradas
              </span>
              <div className="text-xl font-bold text-foreground">
                {datasetActivo.resumenMetricas.totalColumnas}
              </div>
              <span className="text-[11px] text-muted-foreground block">
                Esquema tipado determinista
              </span>
            </div>

            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900 space-y-0.5">
              <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Pipeline B2B Auditado
              </span>
              <div className="text-xl font-bold text-foreground">
                {formatearMonedaARS(datasetActivo.resumenMetricas.valorPipelineTotalARS)}
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                Atribución verificada
              </span>
            </div>

            <div className="p-3 bg-rose-50/40 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900 space-y-0.5">
              <span className="text-[10px] font-semibold text-[#E1061E] uppercase tracking-wider">
                Blindaje de Seguridad
              </span>
              <div className="text-sm font-bold text-foreground pt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>OWASP Safe</span>
              </div>
              <span className="text-[11px] text-muted-foreground block">
                Anti-Formula Injection + UTF-8 BOM
              </span>
            </div>
          </div>

          {/* Banner Instructivo Google Sheets */}
          <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200">
            <Info className="h-4 w-4 text-[#1A3D84] shrink-0" />
            <span>
              <strong>Flujo rápido Google Sheets:</strong> Abrí Google Sheets o Excel, hacé clic en{" "}
              <em>&quot;Copiar para Google Sheets (Ctrl+V)&quot;</em> y presioná <strong>Ctrl+V</strong> en la celda A1.
            </span>
          </div>

          {/* Vista Previa de Tabla */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-[#1A3D84]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  {datasetActivo.titulo}
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {datasetActivo.subtitulo}
              </span>
            </div>

            <div className="rounded-lg border border-border overflow-hidden bg-background">
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-border z-10">
                    <tr>
                      {datasetActivo.headers.map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 font-bold text-[#1A3D84] dark:text-blue-300 whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {datasetActivo.filas.map((fila, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {fila.map((celda, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-3 py-2 text-foreground whitespace-nowrap max-w-[260px] truncate"
                            title={celda}
                          >
                            {celda}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con 3 Vías de Acción Soberana */}
        <div className="p-4 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Exportación 100% local · Sin envío de datos a terceros.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopiarParaGoogleSheets}
              className="text-xs h-9 border-border"
            >
              {copiedSheets ? (
                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1.5 text-[#1A3D84]" />
              )}
              Copiar para Google Sheets (Ctrl+V)
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDescargarIndividual}
              className="text-xs h-9 border-[#1A3D84]/40 text-[#1A3D84] hover:bg-blue-50/50 font-semibold"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Descargar CSV Individual
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleDescargarMaestro}
              className="bg-[#1A3D84] hover:bg-[#1A3D84]/90 text-white text-xs h-9 font-semibold flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar Reporte Maestro (4 en 1)
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 text-muted-foreground"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
