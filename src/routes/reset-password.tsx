import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha — FinanChat" },
      { name: "description", content: "Defina uma nova senha para sua conta do FinanChat." },
      { property: "og:title", content: "Nova senha — FinanChat" },
      { property: "og:description", content: "Redefinição de senha do FinanChat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setReady(true); });
    supabase.auth.getSession().then(({ data: s }) => { if (s.session && isRecovery) setReady(true); else if (s.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    setBusy(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError("Não foi possível alterar a senha. O link pode ter expirado; solicite outro.");
    await navigate({ to: "/", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="mb-4 text-2xl font-bold">Criar nova senha</h1>
        {!ready ? (
          <p>Abra esta página pelo link enviado ao seu e-mail. Se o link expirou, solicite outro em “Esqueci minha senha”.</p>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 text-base" />
            </div>
            {error && <p role="alert" className="font-semibold text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />} Salvar nova senha
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
