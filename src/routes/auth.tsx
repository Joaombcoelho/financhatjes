import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — FinanChat" },
      { name: "description", content: "Entre ou crie sua conta no FinanChat para controlar receitas e despesas." },
      { property: "og:title", content: "Entrar — FinanChat" },
      { property: "og:description", content: "Acesse sua conta do FinanChat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha inválidos.";
  if (m.includes("already registered") || m.includes("already exists")) return "Já existe uma conta com este e-mail. Entre ou recupere a senha.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link enviado antes de entrar.";
  if (m.includes("password") && (m.includes("weak") || m.includes("pwned") || m.includes("at least"))) return "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("fetch") || m.includes("network")) return "Falha de conexão. Verifique sua internet.";
  return "Não foi possível concluir. Tente novamente.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) void navigate({ to: "/", replace: true }); });
  }, [navigate]);

  function switchMode(m: Mode) { setMode(m); setError(null); setInfo(null); }

  function validate(): string | null {
    if (mode === "signup" && name.trim().length < 2) return "Informe seu nome (mínimo 2 letras).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Informe um e-mail válido.";
    if (mode !== "forgot" && password.length < (mode === "signup" ? 8 : 1)) return mode === "signup" ? "A senha precisa ter pelo menos 8 caracteres." : "Informe sua senha.";
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    setError(v); setInfo(null);
    if (v) return;
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return setError(translate(error.message));
        await navigate({ to: "/", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } },
        });
        if (error) return setError(translate(error.message));
        if (data.user && data.user.identities?.length === 0) return setError("Já existe uma conta com este e-mail. Entre ou recupere a senha.");
        if (data.session) await navigate({ to: "/", replace: true });
        else setInfo("Conta criada! Enviamos um link de confirmação para o seu e-mail. Confirme para entrar.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) return setError(translate(error.message));
        setInfo("Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha.");
      }
    } catch (err) {
      setError(translate(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Wallet className="h-5 w-5" aria-hidden="true" /></span>
          FinanChat
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mb-5 text-muted-foreground">
          {mode === "forgot" ? "Informe seu e-mail para receber o link de redefinição." : "Suas transações ficam salvas com segurança na sua conta."}
        </p>
        <form onSubmit={submit} noValidate className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-base" />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 text-base" aria-describedby={mode === "signup" ? "pw-hint" : undefined} />
              {mode === "signup" && <p id="pw-hint" className="text-sm text-muted-foreground">Mínimo de 8 caracteres.</p>}
            </div>
          )}
          {error && <p role="alert" className="font-semibold text-destructive">{error}</p>}
          {info && <p role="status" className="rounded-md border border-border bg-surface p-3">{info}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
          </Button>
        </form>
        <div className="mt-5 flex flex-col gap-2 text-center">
          {mode === "login" && (
            <>
              <button type="button" className="py-1 font-semibold text-primary underline underline-offset-4" onClick={() => switchMode("forgot")}>Esqueci minha senha</button>
              <button type="button" className="py-1 font-semibold text-primary underline underline-offset-4" onClick={() => switchMode("signup")}>Não tem conta? Cadastre-se</button>
            </>
          )}
          {mode !== "login" && (
            <button type="button" className="py-1 font-semibold text-primary underline underline-offset-4" onClick={() => switchMode("login")}>Já tenho conta — entrar</button>
          )}
        </div>
      </div>
    </main>
  );
}
