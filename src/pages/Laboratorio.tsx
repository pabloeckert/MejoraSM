import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FlaskConical,
  Loader2,
  Brain,
  Paintbrush,
  Shield,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { useStartDialogue } from "@/hooks/useDialogue";
import { useProposals, useApproveProposal } from "@/hooks/useProposals";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/components/ui/use-toast";

export default function Laboratorio() {
  return (
    <ErrorBoundary>
      <LaboratorioContent />
    </ErrorBoundary>
  );
}

function LaboratorioContent() {
  const [description, setDescription] = useState("");
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const startDialogue = useStartDialogue();
  const { data: proposals } = useProposals();
  const approveMutation = useApproveProposal();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!description.trim()) return;

    startDialogue.mutate(description, {
      onSuccess: (result: any) => {
        setGeneratedContent(result);
        setDescription("");
      },
    });
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copiado", description: `${field} copiado al portapapeles.` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApprove = (proposalId: string) => {
    approveMutation.mutate(proposalId);
    // Hallazgo real de auditoría 2026-08-25: "pasó a pendiente de
    // publicación" sugiere que ya está en camino de salir — en realidad
    // "Aprobar" acá solo cambia el status, todavía falta agendarla con
    // fecha desde Propuestas para que se publique.
    toast({
      title: "Propuesta aprobada",
      description: "Todavía falta agendarla con fecha en Propuestas para que se publique.",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Laboratorio de Contenido
          </h1>
          <p className="mt-1 text-muted-foreground">
            Describí lo que querés comunicar y la IA genera 3 propuestas estratégicas.
          </p>
        </div>
      </div>

      {/* Input section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generar contenido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>¿Qué querés comunicar?</Label>
            <Textarea
              placeholder="Ej: Quiero compartir tips de liderazgo para emprendedores que están delegando por primera vez. Tono cercano, argentino, con gancho emocional."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Los agentes usarán los documentos de la bóveda como contexto.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={!description.trim() || startDialogue.isPending}
            >
              {startDialogue.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="mr-2 h-4 w-4" />
              )}
              Generar propuesta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {startDialogue.isError && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            Error: {startDialogue.error?.message}
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {startDialogue.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium">Los agentes están trabajando...</p>
            <p className="mt-1 text-sm text-muted-foreground">
              El Estratega propone, el Creativo redacta, el Crítico evalúa.
            </p>
            <div className="mt-4 flex gap-3">
              <Badge variant="outline" className="gap-1">
                <Brain className="h-3 w-3" /> Estratega
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Paintbrush className="h-3 w-3" /> Creativo
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" /> Crítico
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated result */}
      {generatedContent && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Propuesta generada</CardTitle>
              <Badge variant={generatedContent.aprobado ? "default" : "secondary"}>
                {generatedContent.aprobado ? "✅ Aprobado" : "⚠️ Revisar"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estrategia */}
            {generatedContent.estrategia && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-blue-500">
                    <Brain className="h-4 w-4" /> Estrategia
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(generatedContent.estrategia, "Estrategia")}
                  >
                    {copiedField === "Estrategia" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {generatedContent.estrategia}
                </div>
              </div>
            )}

            {/* Contenido */}
            {generatedContent.contenido && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-purple-500">
                    <Paintbrush className="h-4 w-4" /> Contenido
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(generatedContent.contenido, "Contenido")}
                  >
                    {copiedField === "Contenido" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {generatedContent.contenido}
                </div>
              </div>
            )}

            {/* Evaluación */}
            {generatedContent.evaluacion && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-amber-500">
                  <Shield className="h-4 w-4" /> Evaluación del Crítico
                </Label>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {generatedContent.evaluacion.feedback}
                </div>
              </div>
            )}

            {/* Proposal details */}
            {generatedContent.proposal && (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Estructura de la propuesta:</p>
                {generatedContent.proposal.hook && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">HOOK: </span>
                    <span className="text-sm">{generatedContent.proposal.hook}</span>
                  </div>
                )}
                {generatedContent.proposal.cta && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">CTA: </span>
                    <span className="text-sm">{generatedContent.proposal.cta}</span>
                  </div>
                )}
                {generatedContent.proposal.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {generatedContent.proposal.hashtags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <Badge variant="outline">{generatedContent.proposal.format || "post"}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent proposals */}
      {proposals && proposals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Propuestas recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proposals.slice(0, 5).map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title || "Sin título"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.dialogue_sessions?.topic || "Sin tema"} · {p.format || "post"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        p.status === "approved"
                          ? "default"
                          : p.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {p.status === "approved"
                        ? "Aprobado"
                        : p.status === "rejected"
                        ? "Rechazado"
                        : "Pendiente"}
                    </Badge>
                    {p.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(p.id)}
                        disabled={approveMutation.isPending}
                      >
                        Aprobar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no proposals and not generating */}
      {!startDialogue.isPending && !generatedContent && (!proposals || proposals.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FlaskConical className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              Laboratorio vacío
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Describí lo que querés comunicar y los agentes generarán una propuesta.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
