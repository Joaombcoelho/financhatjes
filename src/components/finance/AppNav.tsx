import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, List, LogOut, MessageCircle, PiggyBank, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { repository } from "@/lib/finance/store";
import { reserveStore } from "@/lib/finance/reserve";

const items = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/reserva", label: "Reserva", icon: PiggyBank },
  { to: "/historico", label: "Histórico", icon: List },
] as const;

const linkBase =
  "flex items-center gap-2 rounded-md px-3 py-2 font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const linkActive = "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground";

export function AppNav({ email, name }: { email: string; name: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Não foi possível sair. Tente novamente."); return; }
    repository.reset();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
            FinanChat
          </Link>
          <nav aria-label="Navegação principal" className="hidden gap-1 md:flex">
            {items.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={linkBase} activeProps={{ className: linkActive, "aria-current": "page" }} activeOptions={{ exact: true }}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-40 truncate text-sm text-muted-foreground lg:inline" title={email}>{name || email}</span>
            <button type="button" onClick={signOut} className={linkBase}>
              <LogOut className="h-5 w-5" aria-hidden="true" /> Sair
            </button>
          </div>
        </div>
      </header>
      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface md:hidden">
        <div className="grid grid-cols-3">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 py-2.5 text-sm font-semibold text-muted-foreground"
              activeProps={{ className: "text-primary underline underline-offset-4", "aria-current": "page" }}
              activeOptions={{ exact: true }}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
