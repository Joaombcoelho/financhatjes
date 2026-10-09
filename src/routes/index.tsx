import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownCircle, ArrowUpCircle, MessageCircle, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/finance/Notice";
import { TransactionList } from "@/components/finance/TransactionList";
import { repository, sortByDate, summarize, useTransactions } from "@/lib/finance/store";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — FinanChat" },
      { name: "description", content: "Veja seu saldo, receitas, despesas e gastos por categoria no FinanChat." },
      { property: "og:title", content: "Painel — FinanChat" },
      { property: "og:description", content: "Controle financeiro simples com chat: saldo, receitas e despesas em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Scale; tone: "neutral" | "income" | "expense" }) {
  const toneClass = tone === "income" ? "bg-income-soft text-income" : tone === "expense" ? "bg-expense-soft text-expense" : "bg-secondary text-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${toneClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold text-muted-foreground">{label}</h2>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
        {formatBRL(value)}
      </p>
    </div>
  );
}

function Dashboard() {
  const list = useTransactions();
  const { income, expense, balance, categories } = summarize(list);
  const recent = sortByDate(list).slice(0, 5);
  const max = categories[0]?.total ?? 0;
  const hasSamples = list.some((t) => t.sample);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Seu painel</h1>
          <p className="text-muted-foreground">Resumo de todas as transações registradas.</p>
        </div>
        <Button asChild size="lg">
          <Link to="/chat"><MessageCircle aria-hidden="true" /> Registrar pelo chat</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Saldo atual" value={balance} icon={Scale} tone="neutral" />
        <StatCard label="Receitas" value={income} icon={ArrowUpCircle} tone="income" />
        <StatCard label="Despesas" value={expense} icon={ArrowDownCircle} tone="expense" />
      </div>

      {list.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-semibold">Nenhuma transação ainda.</p>
          <p className="mt-1 text-muted-foreground">Registre seu primeiro gasto ou recebimento pelo chat ou no histórico.</p>
          <Button asChild className="mt-4" variant="outline" size="lg">
            <Link to="/historico">Adicionar no histórico</Link>
          </Button>
        </div>
      )}

      {list.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="cat-title" className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 id="cat-title" className="text-xl font-bold">Gastos por categoria</h2>
            {categories.length === 0 ? (
              <p className="mt-3 text-muted-foreground">Nenhuma despesa registrada.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {categories.map(({ category, total }) => (
                  <li key={category}>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>{category}</span>
                      <span className="tabular-nums">
                        {formatBRL(total)} ({Math.round((total / expense) * 100)}%)
                      </span>
                    </div>
                    <div className="mt-1 h-3 rounded-full bg-muted" aria-hidden="true">
                      <div className="h-3 rounded-full bg-primary" style={{ width: `${(total / max) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="recent-title" className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 id="recent-title" className="text-xl font-bold">Últimas transações</h2>
              <Link to="/historico" className="font-semibold text-primary underline underline-offset-4">Ver todas</Link>
            </div>
            <TransactionList items={recent} />
          </section>
        </div>
      )}

      {hasSamples && (
        <Notice>
          Há dados de exemplo (marcados com o selo “Exemplo”).{" "}
          <button className="font-semibold underline underline-offset-4" onClick={() => { try { repository.removeSamples(); } catch { /* erro de gravação: mantém os dados */ } }}>
            Remover dados de exemplo
          </button>
        </Notice>
      )}
      <Notice>Seus dados ficam salvos apenas neste navegador. Ao limpar os dados do site, eles serão apagados.</Notice>
    </div>
  );
}
