import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, PieChart as PieIcon } from "lucide-react";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Notice } from "@/components/finance/Notice";
import { formatBRL, formatDate } from "@/lib/format";
import { summarize } from "@/lib/finance/store";
import { EXPENSE_CATEGORIES, type Transaction } from "@/lib/finance/types";
import { financialTrend, PERIOD_LABELS, type Period } from "@/lib/finance/dashboard";

/**
 * Cores dos gráficos vêm dos tokens do tema (--chart-1 ... --chart-8),
 * lidos do CSS para funcionar no tema claro e no escuro sem duplicar paleta.
 */
const PALETTE_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--chart-6", "--chart-7", "--chart-8"];

function useChartColors() {
  const [colors, setColors] = useState<string[] | null>(null);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const read = (name: string) => styles.getPropertyValue(name).trim();
    const next = [...PALETTE_VARS.map(read), read("--income"), read("--expense")];
    if (next.every(Boolean)) setColors(next);
  }, []);

  return colors;
}

function sliceColor(colors: string[], category: string) {
  const index = EXPENSE_CATEGORIES.indexOf(category as (typeof EXPENSE_CATEGORIES)[number]);
  return colors[index >= 0 ? index % PALETTE_VARS.length : PALETTE_VARS.length - 1] ?? "var(--color-primary)";
}

/** "23,5%" sem usar só a cor para comunicar a fatia. */
function percentText(value: number, total: number) {
  if (total <= 0) return "0%";
  const pct = (value / total) * 100;
  return `${pct.toLocaleString("pt-BR", { maximumFractionDigits: pct < 10 ? 1 : 0 })}%`;
}

interface Slice {
  label: string;
  value: number;
  color: string;
}

function PiePanel({ slices, caption, colors }: { slices: Slice[]; caption: string; colors: string[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return null;

  return (
    <>
      <div className="relative mt-4">
        <div className="h-56" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius="63%"
                outerRadius="88%"
                paddingAngle={slices.length > 1 ? 2 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {slices.map((slice) => (
                  <Cell key={slice.label} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | string, name: string | number) =>
                  [`${formatBRL(Number(value))} · ${percentText(Number(value), total)}`, name] as [string, string | number]
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <span className="max-w-full text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">{caption}</span>
          <span className="text-base font-bold tabular-nums">{formatBRL(total)}</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-sm border border-border" style={{ backgroundColor: slice.color }} />
              <span className="truncate font-semibold">{slice.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {formatBRL(slice.value)} <span className="text-muted-foreground">({percentText(slice.value, total)})</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function trendLabel(date: string, period: Period) {
  if (period === "year") return new Date(`${date}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "short" });
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

export function FinancialAnalysis({ items, period, today }: { items: Transaction[]; period: Period; today: string }) {
  const colors = useChartColors();
  const { income, expense, categories } = summarize(items);
  const trend = financialTrend(items, period, today);
  const hasTrend = trend.some((point) => point.receita > 0 || point.despesa > 0);

  const flowSlices: Slice[] = [
    { label: "Receitas", value: income, color: colors?.[PALETTE_VARS.length] ?? "var(--color-income)" },
    { label: "Despesas", value: expense, color: colors?.[PALETTE_VARS.length + 1] ?? "var(--color-expense)" },
  ];
  const categorySlices: Slice[] = categories.map((row) => ({
    label: row.category,
    value: row.total,
    color: colors ? sliceColor(colors, row.category) : "var(--color-primary)",
  }));

  return (
    <section aria-labelledby="analysis-title" className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 id="analysis-title" className="text-xl font-bold">Análise financeira</h2>
      <p className="mt-2 text-sm text-muted-foreground">Pizza de receitas e despesas, divisão dos gastos por categoria e evolução — com as transações do período {PERIOD_LABELS[period]}.</p>

      {items.length === 0 ? (
        <Notice>
          <span className="font-semibold">Ainda não há dados para os gráficos.</span> Quando você registrar transações reais neste período, a pizza de receitas e despesas, a divisão por categoria e a evolução mensal aparecem aqui.
        </Notice>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-border p-4">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <ArrowDown className="h-4 w-4 text-expense" aria-hidden="true" />
              Receitas e despesas
            </h3>
            {colors ? (
              <PiePanel slices={flowSlices} caption="Total movimentado" colors={colors} />
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center justify-between gap-3"><span className="font-semibold">Receitas</span><span className="tabular-nums">{formatBRL(income)}</span></li>
                <li className="flex items-center justify-between gap-3"><span className="font-semibold">Despesas</span><span className="tabular-nums">{formatBRL(expense)}</span></li>
              </ul>
            )}
          </div>
          <div className="min-w-0 rounded-lg border border-border p-4">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <PieIcon className="h-4 w-4 text-primary" aria-hidden="true" />
              Despesas por categoria
            </h3>
            {colors ? (
              <PiePanel slices={categorySlices} caption="Total gasto" colors={colors} />
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {categories.map((row) => (
                  <li key={row.category} className="flex items-center justify-between gap-3"><span className="font-semibold">{row.category}</span><span className="tabular-nums">{formatBRL(row.total)}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {hasTrend && (
        <div className="mt-5 rounded-lg border border-border p-4">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <ArrowUp className="h-4 w-4 text-income" aria-hidden="true" />
            Evolução financeira
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {period === "year" ? "Totais por mês." : period === "30days" ? "Totais dos últimos 30 dias." : "Totais dia a dia."} Verde: receitas. Vermelho: despesas.
          </p>
          <div className="mt-4 h-64" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => trendLabel(String(d), period)} stroke="var(--color-muted-foreground)" fontSize={13} tickLine={false} minTickGap={24} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={13} tickLine={false} axisLine={false} width={78} tickFormatter={(v) => formatBRL(Number(v))} />
                <Tooltip
                  labelFormatter={(d) => (period === "year" ? `Mês ${trendLabel(String(d), period)}` : formatDate(`${String(d)}-01`.slice(0, 10)))}
                  formatter={(value: number | string, name: string | number) => [formatBRL(Number(value)), name === "receita" ? "Receitas" : "Despesas"]}
                />
                <Line type="monotone" dataKey="receita" name="receita" stroke="#116648" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="despesa" name="despesa" stroke="#b43139" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer py-2 font-semibold text-primary">Ver valores em tabela</summary>
            <div className="overflow-x-auto">
              <table className="mt-2 w-full text-sm">
                <caption className="sr-only">Receitas e despesas ao longo do tempo</caption>
                <thead>
                  <tr className="border-b border-border text-left">
                    <th scope="col" className="py-2 pr-4">{period === "year" ? "Mês" : "Dia"}</th>
                    <th scope="col" className="py-2 pr-4">Receitas</th>
                    <th scope="col" className="py-2">Despesas</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((point) => (
                    <tr key={point.date} className="border-b border-border last:border-0">
                      <th scope="row" className="py-2 pr-4 font-semibold">{period === "year" ? `Mês ${trendLabel(point.date, period)}` : formatDate(`${point.date}-01`.slice(0, 10))}</th>
                      <td className="py-2 pr-4 tabular-nums">{formatBRL(point.receita)}</td>
                      <td className="py-2 tabular-nums">{formatBRL(point.despesa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
