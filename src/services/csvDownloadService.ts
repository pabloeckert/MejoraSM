/**
 * csvDownloadService.ts
 *
 * Servicio Soberano de Descarga Local de Archivos CSV (RFC 4180 UTF-8 BOM).
 * Permite exportar datasets individuales o paquetes maestros consolidados 4 en 1
 * directamente desde el navegador sin depender de servidores externos.
 */

import {
  type ResultadoExportacionCsv,
  type PaqueteExportacionCsv,
} from "@/domain/pipelineCsvExporterEngine";

function dispararDescargaArchivoCsv(
  contenidoCsv: string,
  nombreArchivo: string
): void {
  const blob = new Blob([contenidoCsv as unknown as BlobPart], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Descarga un archivo CSV individual con UTF-8 BOM listo para Excel en español.
 */
export function descargarCsvDataset(resultado: ResultadoExportacionCsv): void {
  dispararDescargaArchivoCsv(resultado.csvContent, resultado.nombreArchivo);
}

/**
 * Descarga el reporte maestro consolidado 4 en 1 con todos los tableros analíticos.
 */
export function descargarPaqueteMaestroCsv(
  paquete: PaqueteExportacionCsv
): void {
  dispararDescargaArchivoCsv(
    paquete.csvMaestroConsolidado,
    paquete.nombreArchivoMaestro
  );
}
