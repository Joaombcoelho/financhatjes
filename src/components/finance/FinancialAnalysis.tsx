import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { summarize } from "@/lib/finance/store";
import { financialTrend, type Period } from "@/lib/finance/dashboard";
import type { Transaction } from "@/lib/finance/types";
import { formatBRL, formatDate } from "@/lib/format";

function Bars({ rows }: { rows: { label: string; value: number; color: string; detail?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return <ul className="mt-5 space-y-4">{rows.map((row) => <li key={row.label}>
    <div className="flex flex-wrap justify-between gap-x-3 text-sm"><span className="font-semibold">{row.label}</span><span className="tabular-nums">{formatBRL(row.value)}{row.detail}</span></div>
    <div className="mt-2 h-5 rounded bg-muted" aria-hidden="true"><div className={`h-5 rounded ${row.color}`} style={{ width: `${row.value / max * 100}%` }} /></div>
  </li>)}</ul>;
}

const trendLabel = (date: string) => date.length === 7 ? `${date.slice(5)}/${date.slice(0, 4)}` : formatDate(date);

export function FinancialAnalysis({ items, period, today }: { items: Transaction[]; period: Period; today: string }) {
  const { income, expense, categories } = summarize(items);
  const trend = financialTrend(items, period, today);
  const enough = new Set(items.map((t) => period === "year" ? t.date.slice(0, 7) : t.date)).size >= 2;
  return <section aria-labelledby="analysis-title" className="space-y-4">
    <div><h2 id="analysis-title" className="text-xl font-bold">Análise financeira</h2><p className="mt-1 text-sm text-muted-foreground">Somente transações reais do período selecionado.</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <section aria-labelledby="comparison-title" className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 id="comparison-title" className="font-bold">Receitas x despesas</h3>
        {items.length ? <Bars rows={[{ label: "Receitas", value: income, color: "bg-income" }, { label: "Despesas", value: expense, color: "bg-expense" }]} /> : <p className="mt-4 text-muted-foreground">Nenhuma transação neste período. Registre pelo chat ou escolha outro período.</p>}
      </section>
      <section aria-labelledby="categories-title" className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 id="categories-title" className="font-bold">Despesas por categoria</h3>
        {categories.length ? <Bars rows={categories.map((c) => ({ label: c.category, value: c.total, color: "bg-primary", detail: ` (${Math.round(c.total / expense * 100)}%)` }))} /> : <p className="mt-4 text-muted-foreground">Nenhuma despesa registrada neste período.</p>}
      </section>
      <section aria-labelledby="trend-title" className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm md:col-span-2">
        <h3 id="trend-title" className="font-bold">Evolução financeira</h3>
        <p className="mt-1 text-sm text-muted-foreground">Receitas e despesas {period === "year" ? "por mês" : "por dia"}, sem acumular saldos.</p>
        {!enough ? <p className="mt-4 text-muted-foreground">Registre transações em pelo menos dois {period === "year" ? "meses" : "dias"} diferentes neste período para acompanhar a evolução.</p> : <>
          <div className="mt-4 h-64 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 15, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => period === "year" ? d.slice(5) : d.slice(8)} minTickGap={20} />
                <YAxis tickFormatter={(n: number) => `R$ ${n.toLocaleString("pt-BR", { notation: "compact" })}`} width={70} />
                <Tooltip formatter={(value: number) => formatBRL(value)} labelFormatter={(label) => trendLabel(String(label))} />
                <Legend />
                <Line name="Receitas" dataKey="receita" stroke="#116648" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line name="Despesas" dataKey="despesa" stroke="#b43139" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-3"><summary className="cursor-pointer py-2 font-semibold text-primary">Ver valores da evolução em tabela</summary>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Alternativa textual do gráfico de evolução financeira</caption><thead><tr><th scope="col" className="p-2">{period === "year" ? "Mês" : "Data"}</th><th scope="col" className="p-2">Receitas</th><th scope="col" className="p-2">Despesas</th></tr></thead><tbody>{trend.map((row) => <tr key={row.date} className="border-t border-border"><th scope="row" className="p-2 font-normal">{trendLabel(row.date)}</th><td className="p-2 tabular-nums">{formatBRL(row.receita)}</td><td className="p-2 tabular-nums">{formatBRL(row.despesa)}</td></tr>)}</tbody></table></div>
          </details>
        </>}
      </section>
    </div>
  </section>;
}