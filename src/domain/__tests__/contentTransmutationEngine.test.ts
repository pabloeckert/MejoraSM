import { describe, it, expect } from "vitest";
import { transmutarContenido, InputTransmutacion } from "../contentTransmutationEngine";

describe("contentTransmutationEngine (Sprint S+10: Motor de Transmutación Multicanal)", () => {
  const defaultInput: InputTransmutacion = {
    propuesta_id: "PROP-2026-W01-01",
    titulo_portada: "El cuello de botella sos vos",
    copy_tres_pasos: {
      dolor: "Si cada decisión del día tiene que pasar por tu escritorio, no tenés una empresa: tenés un autoempleo.",
      reencuadre: "La claridad directiva comienza por delegar con criterios en lugar de órdenes puntuales.",
      direccion: "https://mejoraok.com/diagnostico",
    },
    buyer_persona: "fundador_saturado",
    dimension_servicio: "organizacional",
  };

  it("transmuta una propuesta base en exactamente 5 activos nativos sincronizados", () => {
    const paquete = transmutarContenido(defaultInput);

    expect(paquete.propuesta_id).toBe("PROP-2026-W01-01");
    expect(paquete.tituloOriginal).toBe("El cuello de botella sos vos");

    // 1. Carrusel PDF
    expect(paquete.carruselPdf.formato).toBe("carrusel_pdf");
    expect(paquete.carruselPdf.ratio).toBe("1080x1350");
    expect(paquete.carruselPdf.slides).toHaveLength(5);
    expect(paquete.carruselPdf.slides[0]).toBe("El cuello de botella sos vos");

    // 2. Guion de Reel 60s
    expect(paquete.guionReel.bloques).toHaveLength(3);
    expect(paquete.guionReel.duracionTotalEstimadaSegundos).toBeGreaterThan(40);
    expect(paquete.guionReel.bloques[0].indicacionCamara).toContain("Plano medio");

    // 3. Hilo LinkedIn C-Level
    expect(paquete.hiloLinkedIn.postPrincipal.hasExternalLinkPenaltyRisk).toBe(false);
    expect(paquete.hiloLinkedIn.primerComentarioEstrategico.urlTrazable).toContain("mejoraok.com");
    expect(paquete.hiloLinkedIn.hiloDebateSimulado.length).toBeGreaterThanOrEqual(3);

    // 4. Placa de Citas / Aforismo
    expect(paquete.placaCita.ratioSugerido).toBe("1:1");
    expect(paquete.placaCita.autor).toBe("Mejora Continua");
    expect(paquete.placaCita.aforismo).toContain("delegar con criterios");

    // 5. Mensaje de WhatsApp
    expect(paquete.mensajeWhatsApp.textoFormateado).toContain("*EL CUELLO DE BOTELLA SOS VOS*");
    expect(paquete.mensajeWhatsApp.textoFormateado).toContain("💡 *El síntoma operativo:*");
    expect(paquete.mensajeWhatsApp.textoFormateado).toContain("https://mejoraok.com/diagnostico");
  });

  it("calcula métricas consolidadas de apalancamiento (3.8x multiplicador y 4.5h ahorradas)", () => {
    const paquete = transmutarContenido(defaultInput);

    expect(paquete.multiplicadorAlcanceEstimado).toBe(3.8);
    expect(paquete.horasAhorradasEstimadas).toBe(4.5);
    expect(paquete.resumenEjecutivo).toContain("5 activos omnicanal");
  });

  it("formatea el mensaje de WhatsApp con sintaxis correcta y llamada al diagnóstico", () => {
    const paquete = transmutarContenido(defaultInput);
    const wa = paquete.mensajeWhatsApp;

    expect(wa.textoFormateado).toContain("*");
    expect(wa.textoFormateado).toContain("👉 Hacé el diagnóstico");
    expect(wa.longitudCaracteres).toBeGreaterThan(150);
  });

  it("gestiona fallbacks limpios cuando los inputs son mínimos", () => {
    const inputMinimo: InputTransmutacion = {
      propuesta_id: "PROP-MINIMO",
      titulo_portada: "Desacople entre comercial y operaciones",
    };

    const paquete = transmutarContenido(inputMinimo);

    expect(paquete.carruselPdf.slides).toHaveLength(5);
    expect(paquete.guionReel.bloques).toHaveLength(3);
    expect(paquete.hiloLinkedIn.postPrincipal.textoCompletoCopiable).toContain("Desacople");
    expect(paquete.placaCita.aforismo).toBeDefined();
    expect(paquete.mensajeWhatsApp.textoFormateado).toContain("DESACOPLE");
  });
});
