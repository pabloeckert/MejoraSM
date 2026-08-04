import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "otp">("signin");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    if (mode === "signup") {
      setMessage({
        type: "info",
        text: "Cuenta creada. Si Supabase pide confirmación por email, revisá la bandeja de entrada.",
      });
    }
  }

  // Login sin contraseña: pide un código de un solo uso por email. Sin
  // redirect (a diferencia de un magic link) a propósito — con HashRouter
  // (necesario para el subpath de GitHub Pages) un token en la URL como
  // hash chocaría con el ruteo, que también usa "#". El codigo evita eso
  // por completo: no hay URL de vuelta que parsear.
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setOtpSent(true);
    setMessage({ type: "info", text: "Te mandamos un código a tu email. Puede tardar un minuto." });
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: "email" });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <CardTitle>EDA — MejoraOK</CardTitle>
          <CardDescription>
            {mode === "signin" && "Iniciá sesión para continuar"}
            {mode === "signup" && "Crear cuenta"}
            {mode === "otp" && "Entrar sin contraseña"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "otp" ? (
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-email">Email</Label>
                <Input
                  id="otp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={otpSent}
                />
              </div>
              {otpSent && (
                <div className="space-y-2">
                  <Label htmlFor="otp-code">Código recibido por email</Label>
                  <Input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    autoComplete="one-time-code"
                  />
                </div>
              )}
              {message && (
                <p className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                  {message.text}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Un momento…" : otpSent ? "Confirmar código" : "Enviarme un código"}
              </Button>
              {otpSent && (
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode("");
                    setMessage(null);
                  }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Pedir otro código
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
              {message && (
                <p className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                  {message.text}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Un momento…" : mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
              </Button>
            </form>
          )}
          <div className="mt-4 space-y-2">
            {mode !== "otp" && (
              <button
                type="button"
                onClick={() => {
                  setMode("otp");
                  setMessage(null);
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Entrar sin contraseña (código por email)
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setOtpSent(false);
                setMessage(null);
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "signup" ? "Ya tengo cuenta, iniciar sesión" : mode === "otp" ? "Volver a contraseña" : "¿Primera vez? Crear cuenta"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
