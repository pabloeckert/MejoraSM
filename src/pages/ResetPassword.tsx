import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

// Form de "poner contraseña nueva" tras el link de blanqueo. El camino
// principal es la página suelta /app/reset.html (sin router, sin choque de
// hash); esto es el respaldo si el evento PASSWORD_RECOVERY cae en el SPA.
export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <KeyRound className="h-5 w-5 text-primary-foreground" />
          </div>
          <CardTitle>Nueva contraseña</CardTitle>
          <CardDescription>Elegí una contraseña nueva para la cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Listo, contraseña actualizada.</p>
              <Button className="w-full" onClick={onDone}>
                Entrar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Contraseña nueva</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Repetir contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              {message && <p className="text-sm text-destructive">{message}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ResetPassword;
