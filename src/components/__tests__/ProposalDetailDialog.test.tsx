import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProposalDetailDialog } from "@/components/ProposalDetailDialog";
import { PropuestaMejoraSMDTO } from "@/domain/types";

// Mock mutations
const mockMutateApprove = vi.fn();
const mockMutateEdit = vi.fn();

vi.mock("@/hooks/useProposals", () => ({
  useApproveProposal: () => ({ mutate: mockMutateApprove, isPending: false }),
  useRejectProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useReactivateProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useScheduleProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useEditProposal: () => ({ mutate: mockMutateEdit, isPending: false }),
  useDeleteProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useRescheduleProposal: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

const mockProposal: PropuestaMejoraSMDTO = {
  propuesta_id: "PROP-2026-TEST-001",
  canal_destino: "instagram",
  dia_programado: "2026-10-20T10:00:00Z",
  origen_boveda_id: "BOV-2026-001",
  estado: "pendiente_revision",
  borrador_seleccionado: "A",
  tratamiento_visual: {
    marco_expandido_requerido: true,
    color_fondo_marco: "#FFFFFF",
    regla_color_aplicada: "mucho_blanco_puntuacion_azul_rojo",
    relacion_aspecto_destino: "4:5",
  },
  imagen_boveda_vinculada: {
    id: "BOV-2026-F01",
    ruta_archivo_local: "content/inbox/empresarial/directorio_c_level.jpg",
    titulo: "Reunión Directiva",
  },
  borradores: [
    {
      opcion: "A",
      tipo_formato: "carrusel_pdf",
      estrategia: "jab_educativo",
      titulo_portada: "El cuello de botella no son tus mandos medios",
      cuerpo_texto: "Texto del carrusel",
      copy_tres_pasos: {
        paso1_dolor: "Sentís que si no estás en la fábrica nada avanza.",
        paso2_reencuadre: "Falta un protocolo de traspaso y tableros visuales.",
        paso3_direccion_web: "medí tu orden en mejoraok.com",
      },
      slides: ["Slide 1", "Slide 2"],
      cta_texto: "medí tu orden en mejoraok.com",
    },
    {
      opcion: "B",
      tipo_formato: "post_autoridad",
      estrategia: "networking_prueba_social",
      titulo_portada: "Mesa C-Level con Directores Industriales",
      cuerpo_texto: "Texto autoridad directiva",
      copy_tres_pasos: {
        paso1_dolor: "La soledad del director al tomar decisiones críticas.",
        paso2_reencuadre: "El gobierno de la empresa requiere método y pares de calibre.",
        paso3_direccion_web: "conocé los After Office MC en mejoraok.com",
      },
      cta_texto: "conocé los After Office MC en mejoraok.com",
    },
    {
      opcion: "C",
      tipo_formato: "post_directo",
      estrategia: "right_hook_conversion",
      titulo_portada: "Diagnóstico de 60 minutos sin costo para tu empresa",
      cuerpo_texto: "Texto directo al grano",
      copy_tres_pasos: {
        paso1_dolor: "¿Tu rentabilidad operativa se esfuma en urgencias?",
        paso2_reencuadre: "Auditamos tus 4 dimensiones en 1 hora de reloj.",
        paso3_direccion_web: "completá el formulario en mejoraok.com",
      },
      cta_texto: "completá el formulario en mejoraok.com",
    },
  ],
};

function renderDialog(props: {
  proposal?: any;
  open?: boolean;
  onApproveBatch?: () => void;
  totalLote?: number;
}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ProposalDetailDialog
        proposal={props.proposal !== undefined ? props.proposal : mockProposal}
        open={props.open ?? true}
        onOpenChange={vi.fn()}
        onApproveBatch={props.onApproveBatch}
        totalLote={props.totalLote}
      />
    </QueryClientProvider>
  );
}

describe("Subfase 1.3: UI Tablero y Componente ProposalDetailDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el modal con el ID canónico y los 3 borradores paralelos de la IA", () => {
    renderDialog({});

    expect(screen.getByText("PROP-2026-TEST-001")).toBeInTheDocument();
    expect(screen.getByText("Opción A")).toBeInTheDocument();
    expect(screen.getByText("Opción B")).toBeInTheDocument();
    expect(screen.getByText("Opción C")).toBeInTheDocument();
    expect(screen.getAllByText("El cuello de botella no son tus mandos medios").length).toBeGreaterThan(0);
  });

  it("conmuta entre borradores A, B y C actualizando el contenido en 3 pasos", () => {
    renderDialog({});

    // Inicialmente opción A
    expect(screen.getAllByText("Sentís que si no estás en la fábrica nada avanza.").length).toBeGreaterThan(0);

    // Conmutar a Opción B
    const botonB = screen.getByText("Opción B");
    fireEvent.click(botonB);

    expect(screen.getAllByText("La soledad del director al tomar decisiones críticas.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("El gobierno de la empresa requiere método y pares de calibre.").length).toBeGreaterThan(0);

    // Conmutar a Opción C
    const botonC = screen.getByText("Opción C");
    fireEvent.click(botonC);

    expect(screen.getAllByText("¿Tu rentabilidad operativa se esfuma en urgencias?").length).toBeGreaterThan(0);
  });

  it("permite abrir el selector de imagen de Bóveda y elegir otro activo", () => {
    renderDialog({});

    const botonCambiar = screen.getByText("Cambiar Imagen de Bóveda");
    fireEvent.click(botonCambiar);

    expect(screen.getByText("Elegir activo de Bóveda (Networking y Autoridad C-Level)")).toBeInTheDocument();

    const fotoPlanta = screen.getByText("Recorrida de Planta Operativa");
    fireEvent.click(fotoPlanta);

    // Se cierra el selector tras elegir
    expect(screen.queryByText("Elegir activo de Bóveda (Networking y Autoridad C-Level)")).not.toBeInTheDocument();
  });

  it("permite entrar a modo de edición y editar el copy calibrado en 3 pasos", () => {
    renderDialog({});

    const botonEditar = screen.getByText("Editar");
    fireEvent.click(botonEditar);

    expect(screen.getByText(/Editando Copy Calibrado en 3 Pasos/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 1: Nombrar el Dolor/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 2: Reencuadre y Causa Raíz/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 3: Dirección Web Concreta/i)).toBeInTheDocument();

    const botonGuardar = screen.getByText("Guardar Cambios");
    fireEvent.click(botonGuardar);

    expect(mockMutateEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "PROP-2026-TEST-001",
      }),
      expect.any(Object)
    );
  });

  it("ejecuta aprobación individual y confirmación de aprobación de lote completo", () => {
    const mockApproveBatch = vi.fn();
    renderDialog({ onApproveBatch: mockApproveBatch, totalLote: 5 });

    // Botón de aprobación individual
    const botonIndividual = screen.getByText("Aprobar Esta Propuesta");
    fireEvent.click(botonIndividual);
    expect(mockMutateApprove).toHaveBeenCalledWith("PROP-2026-TEST-001", expect.any(Object));

    // Botón de aprobación de lote completo
    const botonLote = screen.getByText("Aprobar Lote Completo (5)");
    fireEvent.click(botonLote);

    // Dialogo de confirmación
    expect(screen.getByText("¿Aprobar el lote completo de propuestas?")).toBeInTheDocument();
    const botonConfirmar = screen.getByText("Aprobar Lote Completo");
    fireEvent.click(botonConfirmar);

    expect(mockApproveBatch).toHaveBeenCalledTimes(1);
  });

  it("cuenta con el botón de descarga multicanal en 1 clic", () => {
    renderDialog({});

    const botonDescarga = screen.getByText("Descarga Multicanal (1 Clic)");
    expect(botonDescarga).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });
});
