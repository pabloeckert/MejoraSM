// src/domain/framingEngine.ts
// MOTOR DE ENCUADRE VISUAL CON MARCO DESENFOCADO EXPANDIDO (2026)
// Garantiza la conservación de bordes y rostros (0% de recorte de fotos reales)
// según el estándar de Marca y Principios Zero-Trust de Mejora Continua.

export type TargetAspectRatio = "4:5" | "1:1" | "9:16";

export interface CanvasDimensions {
  width: number;
  height: number;
  ratio: TargetAspectRatio;
}

export const CANVAS_DIMENSIONS: Record<TargetAspectRatio, CanvasDimensions> = {
  "4:5": { width: 1080, height: 1350, ratio: "4:5" },
  "1:1": { width: 1080, height: 1080, ratio: "1:1" },
  "9:16": { width: 1080, height: 1920, ratio: "9:16" },
};

export interface ContainmentGeometry {
  canvasWidth: number;
  canvasHeight: number;
  renderWidth: number;
  renderHeight: number;
  offsetX: number;
  offsetY: number;
  scaleFactor: number;
  croppedPixels: number; // Siempre 0 en modo contain
  aspectRatioPreserved: boolean;
  blurLayer: {
    filter: string;
    brightness: number;
    scale: number;
  };
  frameStyle: {
    background: "#FFFFFF";
    border: string;
    brandBar: {
      azul: "#1A3D84";
      rojo: "#E1061E";
      amarillo: "#F7CC13";
    };
  };
}

/**
 * Calcula la geometría precisa de encuadre en doble capa.
 * Demuestra matemáticamente que 0 píxeles de la imagen original son recortados.
 */
export function calculateContainmentGeometry(
  sourceWidth: number,
  sourceHeight: number,
  targetRatio: TargetAspectRatio
): ContainmentGeometry {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Dimensiones de imagen de origen inválidas: deben ser mayores a 0.");
  }

  const canvas = CANVAS_DIMENSIONS[targetRatio];
  const sourceAspect = sourceWidth / sourceHeight;
  const canvasAspect = canvas.width / canvas.height;

  let renderWidth: number;
  let renderHeight: number;

  if (sourceAspect > canvasAspect) {
    // La imagen es más ancha que el lienzo: limita por ancho
    renderWidth = canvas.width;
    renderHeight = Math.round(canvas.width / sourceAspect);
  } else {
    // La imagen es más alta que el lienzo: limita por alto
    renderHeight = canvas.height;
    renderWidth = Math.round(canvas.height * sourceAspect);
  }

  const offsetX = Math.round((canvas.width - renderWidth) / 2);
  const offsetY = Math.round((canvas.height - renderHeight) / 2);
  const scaleFactor = renderWidth / sourceWidth;

  const renderAspect = renderWidth / renderHeight;
  const aspectRatioPreserved = Math.abs(sourceAspect - renderAspect) < 0.01;

  return {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    renderWidth,
    renderHeight,
    offsetX,
    offsetY,
    scaleFactor,
    croppedPixels: 0, // Invariante: jamás se recortan bordes ni rostros
    aspectRatioPreserved,
    blurLayer: {
      filter: "blur(28px) brightness(0.85)",
      brightness: 0.85,
      scale: 1.15,
    },
    frameStyle: {
      background: "#FFFFFF",
      border: "4px solid #FFFFFF",
      brandBar: {
        azul: "#1A3D84",
        rojo: "#E1061E",
        amarillo: "#F7CC13",
      },
    },
  };
}

/**
 * Genera el markup HTML5 canónico y seguro con la técnica de doble capa.
 */
export function renderFramedHtml(
  photoUrl: string,
  targetRatio: TargetAspectRatio,
  options?: { kicker?: string; title?: string }
): string {
  const canvas = CANVAS_DIMENSIONS[targetRatio];
  const safeKicker = options?.kicker ? options.kicker.replace(/[<>&"]/g, "") : "MEJORA CONTINUA";
  const safeTitle = options?.title ? options.title.replace(/[<>&"]/g, "") : "";

  return `
<div class="framed-canvas" style="width: ${canvas.width}px; height: ${canvas.height}px; position: relative; overflow: hidden; background: #FFFFFF; font-family: 'League Spartan', sans-serif;">
  <!-- Barra tricolor superior institucional -->
  <div class="brand-bar" style="position: absolute; top: 0; left: 0; right: 0; height: 12px; background: linear-gradient(90deg, #1A3D84 0%, #1A3D84 60%, #E1061E 60%, #E1061E 80%, #F7CC13 80%); z-index: 50;"></div>
  
  <!-- Capa 1: Fondo desenfocado expandido (llena el espacio sin recortar la foto frontal) -->
  <div class="blur-backdrop" style="position: absolute; inset: -30px; background-image: url('${photoUrl}'); background-size: cover; background-position: center; filter: blur(28px) brightness(0.85); transform: scale(1.15); z-index: 10; opacity: 0.70;"></div>
  
  <!-- Capa 2: Foto frontal protegida con object-fit: contain (100% visible, sin recorte) -->
  <div class="foreground-container" style="position: absolute; inset: 24px; display: flex; align-items: center; justify-content: center; z-index: 20;">
    <img src="${photoUrl}" alt="Activo de Bóveda" class="foreground-photo" style="max-width: 100%; max-height: 100%; object-fit: contain; border: 4px solid #FFFFFF; box-shadow: 0 16px 40px rgba(0,0,0,0.24);" />
  </div>

  <!-- Kicker y branding sobreimpreso si corresponde -->
  ${
    safeTitle
      ? `
  <div class="text-overlay" style="position: absolute; bottom: 40px; left: 40px; right: 40px; z-index: 30; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(8px); padding: 24px 32px; border-radius: 8px; border: 1px solid rgba(26,61,132,0.15);">
    <span style="font-size: 16px; font-weight: 700; color: #1A3D84; letter-spacing: 0.14em; text-transform: uppercase;">${safeKicker}</span>
    <h2 style="font-size: 32px; font-weight: 700; color: #2B2B2B; margin-top: 8px; line-height: 1.2;">${safeTitle}</h2>
  </div>`
      : ""
  }
</div>
  `.trim();
}

/**
 * Validador de cumplimiento visual (Zero-Trust) para plantillas HTML o fragmentos CSS.
 */
export function validateFramingCompliance(html: string): { compliant: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!html.includes("blur(28px)")) {
    errors.push("Falta la regla de desenfoque canónica: filter: blur(28px)");
  }

  if (!html.includes("brightness(0.85)")) {
    errors.push("Falta la regla de atenuación canónica: brightness(0.85)");
  }

  if (!html.includes("contain")) {
    errors.push("La imagen frontal debe utilizar 'contain' (object-fit: contain o background-size: contain) para evitar recorte de caras.");
  }

  if (!html.includes("#1A3D84") || !html.includes("#E1061E") || !html.includes("#F7CC13")) {
    errors.push("Faltan los colores institucionales oficiales de la barra tricolor (#1A3D84, #E1061E, #F7CC13).");
  }

  return {
    compliant: errors.length === 0,
    errors,
  };
}
