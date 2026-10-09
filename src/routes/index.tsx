import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Scale, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Notice } from "@/components/finance/Notice";
import { TransactionList } from "@/components/finance/TransactionList";
import { FinanceChat } from "@/components/finance/FinanceChat";
import { FinancialAnalysis } from "@/components/finance/FinancialAnalysis";
import { repository, sortByDate, summarize, useTransactions } from "@/lib/finance/store";
import { PERIOD_LABELS, periodBounds, transactionsInPeriod, type Period } from "@/lib/finance/dashboard";
import { formatBRL, formatDate, todayISO } from "@/lib/format";

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

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof Scale; tone: "neutral" | "income" | "expense" }) {
  const toneClass = tone === "income" ? "bg-income-soft text-income" : tone === "expense" ? "bg-expense-soft text-expense" : "bg-secondary text-primary";
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClass}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <h2 className="text-sm font-semibold text-muted-foreground">{label}</h2>
      </div>
      <p className="mt-3 break-words text-2xl font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{formatBRL(value)}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function Dashboard() {
  const list = useTransactions();
  const [period, setPeriod] = useState<Period>("month");
  const today = todayISO();
  const real = list.filter((t) => !t.sample);
  const scoped = transactionsInPeriod(real, period, today);
  const { income, expense, balance } = summarize(scoped);
  const accumulated = summarize(real.filter((t) => t.date <= today)).balance;
  const recent = sortByDate(real).slice(0, 5);
  const bounds = periodBounds(period, today);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Visão geral das suas finanças</h1>
          <p className="mt-2 text-muted-foreground">Seu dinheiro, com clareza. Registre e acompanhe tudo por aqui.</p>
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="dashboard-period" className="mb-1 block text-sm font-semibold">Período de análise</label>
          <select id="dashboard-period" value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="h-11 w-full rounded-md border border-input bg-card px-3 text-base sm:w-48">
            {Object.entries(PERIOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Indicadores e gráficos: {formatDate(bounds.start)} a {formatDate(bounds.end)}.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo financeiro">
        <StatCard label="Saldo atual" value={accumulated} detail="Saldo acumulado até hoje, em todos os períodos." icon={Scale} tone="neutral" />
        <StatCard label="Receitas" value={income} detail="Total recebido no período selecionado." icon={ArrowUpCircle} tone="income" />
        <StatCard label="Despesas" value={expense} detail="Total gasto no período selecionado." icon={ArrowDownCircle} tone="expense" />
        <StatCard label="Resultado do período" value={balance} detail="Receitas menos despesas do período." icon={TrendingUp} tone="neutral" />
      </div>
      {repository.hadLoadError() && <Notice>Não foi possível ler os dados salvos. Verifique o armazenamento do navegador antes de registrar novas transações.</Notice>}
      {list.some((t) => t.sample) && <Notice>Dados com o selo “Exemplo” não entram nos indicadores e gráficos deste dashboard. Eles continuam disponíveis no histórico. <button className="font-semibold underline underline-offset-4" onClick={() => { try { repository.removeSamples(); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível remover os exemplos."); } }}>Remover exemplos</button></Notice>}
      <FinanceChat embedded />
      <FinancialAnalysis items={scoped} period={period} today={today} />
      <section aria-labelledby="recent-title" className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="recent-title" className="text-xl font-bold">Transações recentes</h2>
          <Link to="/historico" className="py-2 font-semibold text-primary underline underline-offset-4">Ver histórico completo</Link>
        </div>
        <p className="mb-2 text-sm text-muted-foreground">Últimos registros de todos os períodos.</p>
        {recent.length ? <TransactionList items={recent} /> : <p className="py-5 text-muted-foreground">Nenhuma transação registrada. Conte ao chat seu primeiro gasto ou recebimento e confirme os dados.</p>}
      </section>
      <Notice>Seus dados ficam salvos apenas neste navegador. Ao limpar os dados do site, eles serão apagados.</Notice>
    </div>
  );
}
