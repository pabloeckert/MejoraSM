import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Resuelve URLs locales relativas o remotas con integridad
export function getAssetUrl(ruta: string): string {
  if (!ruta) return "";
  if (ruta.startsWith("http://") || ruta.startsWith("https://")) return ruta;
  return ruta.startsWith("/") ? ruta : `/${ruta}`;
}
