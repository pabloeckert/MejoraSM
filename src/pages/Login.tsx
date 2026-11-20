import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

// Login del EDA — reinstaurado el 2026-08-31 (Pablo: "un solo password
// usuario y contraseña y el mail de registro para recupero"). Una sola
// cuenta compartida. Sin alta de cuenta, sin OTP — email + contraseña, más
// blanqueo por email.

// Los errores de Supabase Auth llegan en inglés crudo; traducir los casos
// reales más comunes. Lo que no matchea cae al mensaje original.
function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Usuario o contraseña incorrectos.";
  }
  if (lower.includes("email not confirmed")) {
    return "La cuenta todavía no está confirmada — revisá el email.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Demasiados intentos seguidos — esperá un minuto y probá de nuevo.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "No se pudo contactar el servidor — revisá tu conexión.";
  }
  return message;
}

const RESET_REDIRECT = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, "/")}reset.html`;

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMessage({ type: "error", text: translateAuthError(error.message) });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: RESET_REDIRECT });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: translateAuthError(error.message) });
      return;
    }
    setMessage({
      type: "info",
      text: "Si el email está registrado, te llega un link para poner una contraseña nueva. Puede tardar un minuto.",
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <CardTitle>MejoraSM</CardTitle>
          <CardDescription>
            {mode === "signin" ? "Ingresá para continuar" : "Blanqueo de contraseña"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === "signin" ? handleSignin : handleForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Usuario (email)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            {mode === "signin" && (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
              </div>
            )}
            {message && (
              <p className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                {message.text}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Un momento…" : mode === "signin" ? "Ingresar" : "Enviarme el link de blanqueo"}
            </Button>
          </form>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "forgot" : "signin");
                setMessage(null);
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "signin" ? "Olvidé la contraseña" : "Volver al ingreso"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
