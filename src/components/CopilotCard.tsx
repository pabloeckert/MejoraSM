import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Send, Loader2, MessageCircleQuestion } from "lucide-react";
import { useCopilotAdvice, useCopilotChat } from "@/hooks/useCopilot";
import { cn } from "@/lib/utils";

// Copiloto Reflexivo — Fase 4 del plan estratégico 2026-08-16. Consejo del
// día (cacheado por fecha en el backend, ver copilot_advice) + chat
// stateless sobre los datos propios reales. Nunca muestra una cifra que no
// haya llegado del backend — si la respuesta dice que faltan datos, se
// muestra tal cual, no se disfraza.

// UX18 (auditoría 2026-08-31): el LLM a veces devuelve markdown (**negrita**,
// - viñetas) y antes se veía crudo. Render mínimo, sin dependencia nueva.
function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const bullet = /^\s*[-*]\s+/.test(line);
        const clean = line.replace(/^\s*[-*]\s+/, "");
        const parts = clean.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>
        );
        if (!line.trim()) return <br key={i} />;
        return bullet ? (
          <div key={i} className="flex gap-1.5">
            <span className="text-muted-foreground">•</span>
            <span>{parts}</span>
          </div>
        ) : (
          <p key={i}>{parts}</p>
        );
      })}
    </>
  );
}

export function CopilotCard() {
  const { data: advice, isLoading: isLoadingAdvice, isError: isAdviceError } = useCopilotAdvice();
  const { messages, sendMessage, isSending, error, clear } = useCopilotChat();
  const [question, setQuestion] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  function handleSend() {
    if (!question.trim() || isSending) return;
    sendMessage(question);
    setQuestion("");
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Copiloto Reflexivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Consejo del día
          </p>
          {isLoadingAdvice ? (
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          ) : isAdviceError ? (
            <p className="text-sm text-muted-foreground">No se pudo generar el consejo de hoy. Probá de nuevo más tarde.</p>
          ) : (
            <div className="space-y-1 text-sm leading-relaxed text-foreground">
              <MiniMarkdown text={advice?.content ?? ""} />
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageCircleQuestion className="h-3.5 w-3.5" />
              Preguntale a tus datos
            </p>
            {messages.length > 0 && (
              <button type="button" onClick={clear} className="text-[11px] text-muted-foreground hover:text-foreground">
                Limpiar
              </button>
            )}
          </div>

          {messages.length > 0 && (
            <div ref={scrollRef} className="mb-2 h-48 space-y-3 overflow-y-auto rounded-lg border border-border bg-background p-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "space-y-1 bg-muted text-foreground"
                  )}
                >
                  {m.role === "assistant" ? <MiniMarkdown text={m.content} /> : m.content}
                </div>
              ))}
              {isSending && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Pensando...
                </div>
              )}
            </div>
          )}

          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="¿Qué formato rindió mejor esta semana?"
              className="min-h-[42px] resize-none text-sm"
              rows={1}
            />
            <Button size="icon" onClick={handleSend} disabled={isSending || !question.trim()} className="shrink-0">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
