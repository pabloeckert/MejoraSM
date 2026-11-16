import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ShieldCheck } from "lucide-react";

export const PIN_RAPIDO_AUTORIZADO = "2301";
export const USUARIO_ADMIN_DEFAULT = "pabloeckert@gmail.com";

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

interface LoginProps {
  onPinSuccess?: () => void;
}

export function Login({ onPinSuccess }: LoginProps = {}) {
  const [email, setEmail] = useState(USUARIO_ADMIN_DEFAULT);
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info" | "success"; text: string } | null>(null);

  function executePinUnlock() {
    localStorage.setItem("mejorasm_auth_session", "valid");
    localStorage.setItem("mejorasm_auth_user", email || USUARIO_ADMIN_DEFAULT);
    setMessage({ type: "success", text: "PIN verificado correctamente. Ingresando…" });
    setTimeout(() => {
      if (onPinSuccess) {
        onPinSuccess();
      } else {
        window.location.reload();
      }
    }, 150);
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    // Acceso Rápido con PIN 2301
    const cleanSecret = password.trim();
    if (cleanSecret === PIN_RAPIDO_AUTORIZADO) {
      executePinUnlock();
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage({
        type: "error",
        text: cleanSecret.length === 4
          ? "PIN no reconocido. El PIN autorizado es 2301."
          : translateAuthError(error.message),
      });
    }
  }

  function handlePasswordChange(val: string) {
    setPassword(val);
    if (val.trim() === PIN_RAPIDO_AUTORIZADO) {
      executePinUnlock();
    }
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <Card className="w-full max-w-sm border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="items-center text-center pb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E1061E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#F7CC13]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#1A3D84]" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-[#1A3D84] dark:text-blue-400">
            MejoraSM
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {mode === "signin"
              ? "Acceso Ejecutivo con PIN o Contraseña"
              : "Blanqueo de contraseña de Supabase"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === "signin" ? handleSignin : handleForgot} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Usuario (email)
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-9 text-xs"
              />
            </div>
            {mode === "signin" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    PIN (4 dígitos) o Contraseña
                  </Label>
                  <span className="text-[10px] font-mono font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    PIN: 2301
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Ingresá 2301"
                    autoFocus
                    required
                    autoComplete="current-password"
                    className="h-10 text-center tracking-widest text-lg font-mono font-bold text-[#1A3D84] dark:text-blue-300 pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {password.trim() === PIN_RAPIDO_AUTORIZADO ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-600 animate-in fade-in" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Tip: Escribí <strong className="text-primary font-mono">2301</strong> para entrar al instante.
                </p>
              </div>
            )}
            {message && (
              <p
                className={
                  message.type === "error"
                    ? "text-xs text-destructive text-center font-medium"
                    : message.type === "success"
                    ? "text-xs text-emerald-600 text-center font-medium"
                    : "text-xs text-muted-foreground text-center"
                }
              >
                {message.text}
              </p>
            )}
            <Button
              type="submit"
              className="w-full h-9 bg-[#1A3D84] hover:bg-[#1A3D84]/90 text-white font-semibold text-xs transition-colors"
              disabled={loading}
            >
              {loading ? "Un momento…" : mode === "signin" ? "Ingresar a MejoraSM" : "Enviarme el link de blanqueo"}
            </Button>
          </form>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "forgot" : "signin");
                setMessage(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              {mode === "signin" ? "Blanquear contraseña por email" : "Volver al ingreso con PIN"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
