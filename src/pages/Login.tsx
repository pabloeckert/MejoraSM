import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

// Hallazgo real de auditoría 2026-08-25: los errores de Supabase Auth
// llegan en inglés crudo ("Token has expired or is invalid", "Invalid
// login credentials"), mezclados con una UI 100% en español justo en el
// momento de más fricción para el usuario. Traduce los casos reales más
// comunes; lo que no matchea cae al mensaje original tal cual, nunca se
// oculta información real.
function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("token has expired") || lower.includes("otp expired")) {
    return "El código venció — pedí uno nuevo.";
  }
  if (lower.includes("invalid") && (lower.includes("otp") || lower.includes("token"))) {
    return "Código incorrecto — revisá los números o pedí uno nuevo.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Demasiados intentos seguidos — esperá un minuto y probá de nuevo.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "No se pudo contactar el servidor — revisá tu conexión.";
  }
  return message;
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Alta de cuenta (self-signup) sacada a propósito el 2026-08-25 — "resolve
  // todo" tras la auditoría integral. Mitigado por RLS real (is_app_admin()
  // bloquea a cualquier no-admin, cero fuga de datos), pero era fricción y
  // superficie de confusión innecesaria para una herramienta de un solo
  // dueño: Pablo ya tiene su cuenta real creada, y el flujo OTP sirve como
  // respaldo sin contraseña. Si algún día hace falta dar de alta a alguien
  // más, se hace por SQL directo en `app_admins` (ver sección de auth en
  // este archivo) + Supabase Admin API, no desde acá.
  const [mode, setMode] = useState<"signin" | "otp">("signin");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setMessage({ type: "error", text: translateAuthError(error.message) });
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
      setMessage({ type: "error", text: translateAuthError(error.message) });
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
      setMessage({ type: "error", text: translateAuthError(error.message) });
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
            {mode === "signin" ? "Iniciá sesión para continuar" : "Entrar sin contraseña"}
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
                  autoComplete="current-password"
                />
              </div>
              {message && (
                <p className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                  {message.text}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Un momento…" : "Iniciar sesión"}
              </Button>
            </form>
          )}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "otp" : "signin");
                setOtpSent(false);
                setMessage(null);
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "otp" ? "Volver a contraseña" : "Entrar sin contraseña (código por email)"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
