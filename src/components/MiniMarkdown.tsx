// Render mínimo de markdown (**negrita**, - viñetas), sin dependencia nueva.
// UX18 (auditoría 2026-08-31): el LLM a veces devuelve markdown y antes se
// veía crudo. Extraído de CopilotCard el 2026-09-01 para reusarlo en AdsCard.
export function MiniMarkdown({ text }: { text: string }) {
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
