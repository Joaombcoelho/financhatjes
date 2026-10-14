import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Lightbulb, PiggyBank, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Notice } from "@/components/finance/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reserveStore, useReserve } from "@/lib/finance/reserve";
import {
  averageMonthlyExpense,
  goalProgress,
  goalTarget,
  reserveBalance,
  type GoalMode,
  type ReserveKind,
} from "@/lib/finance/reserve-calc";
import { useTransactions } from "@/lib/finance/store";
import { getReserveTips, type ReserveTips } from "@/lib/ai/reserve-tips.functions";
import { formatBRL, formatDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reserva")({
  head: () => ({
    meta: [
      { title: "Reserva de emergência — FinanChat" },
      {
        name: "description",
        content:
          "Registre o dinheiro guardado, defina uma meta de reserva e receba dicas da IA para alcançá-la.",
      },
      { property: "og:title", content: "Reserva de emergência — FinanChat" },
      {
        property: "og:description",
        content: "Acompanhe quanto falta ou quanto passou da sua meta de reserva de emergência.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReservePage,
});

const card = "rounded-xl border border-border bg-card p-5 shadow-sm";
const field = "h-11 w-full rounded-md border border-input bg-card px-3 text-base";
const btn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60";
const parseMoney = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

function ReservePage() {
  const reserve = useReserve();
  const { goal, status, error, pots } = reserve;
  const [activePot, setActivePot] = useState<string | null>(null);
  const movements = reserve.movements.filter((m) => (m.potId ?? null) === activePot);
  const pot = pots.find((p) => p.id === activePot);
  const transactions = useTransactions();
  const today = todayISO();
  const balance = reserveBalance(movements);
  const avgExpense = averageMonthlyExpense(transactions, today);
  const target = pot ? pot.target_amount : goalTarget(goal, avgExpense);
  const progress = target ? goalProgress(balance, target) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reserva de emergência</h1>
        <p className="mt-2 text-muted-foreground">
          Registre o dinheiro que você guarda. Valores guardados saem do seu saldo disponível no
          painel.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Escolher cofrinho">
        <Button
          variant={activePot === null ? "default" : "outline"}
          onClick={() => setActivePot(null)}
        >
          Reserva Principal
        </Button>
        {pots.map((p) => (
          <Button
            key={p.id}
            variant={activePot === p.id ? "default" : "outline"}
            onClick={() => setActivePot(p.id)}
          >
            {p.name}
          </Button>
        ))}
      </div>
      <PotForm />
      {pot && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{pot.name}</h2>
          <Button
            variant="ghost"
            size="icon"
            title="Remover cofrinho"
            aria-label={`Remover cofrinho ${pot.name}`}
            onClick={async () => {
              if (!confirm("Remover este cofrinho?")) return;
              try {
                await reserveStore.removePot(pot.id);
                setActivePot(null);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro ao remover.");
              }
            }}
          >
            <Trash2 />
          </Button>
        </div>
      )}
      {status === "error" && (
        <Notice>
          <span role="alert">{error}</span>{" "}
          <button
            className="font-semibold underline underline-offset-4"
            onClick={() => void reserveStore.load()}
          >
            Tentar novamente
          </button>
        </Notice>
      )}
      {status === "loading" && (
        <p role="status" className="text-muted-foreground">
          Carregando sua reserva…
        </p>
      )}

      <section aria-labelledby="status-title" className={card}>
        <h2 id="status-title" className="flex items-center gap-2 text-xl font-bold">
          <PiggyBank className="h-6 w-6 text-primary" aria-hidden="true" /> Situação da reserva
        </h2>
        <p
          className="mt-3 text-3xl font-bold tabular-nums"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {formatBRL(balance)}
        </p>
        <p className="text-sm text-muted-foreground">Total guardado (depósitos menos retiradas).</p>
        {progress && target ? (
          <div className="mt-4 space-y-2">
            <p className="font-semibold">
              Meta: {formatBRL(target)} · {progress.percent}% alcançado
            </p>
            <div
              className="h-3 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(progress.percent, 100)}
              aria-label="Progresso da meta"
            >
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(progress.percent, 100)}%` }}
              />
            </div>
            <p className={progress.reached ? "font-semibold text-income" : "font-semibold"}>
              {progress.reached
                ? progress.above > 0
                  ? `✓ Meta atingida! Você está ${formatBRL(progress.above)} acima da meta.`
                  : "✓ Meta atingida exatamente!"
                : `Faltam ${formatBRL(progress.remaining)} para a meta.`}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">
            {goal?.mode === "months"
              ? "Ainda não há despesas nos últimos 90 dias para calcular a meta em meses."
              : "Defina uma meta abaixo para acompanhar quanto falta."}
          </p>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <MovementForm key={activePot ?? "principal"} today={today} potId={activePot} />
        {pot ? (
          <PotForm key={pot.id} pot={pot} />
        ) : (
          <GoalForm
            key={goal ? `${goal.mode}-${goal.targetAmount}-${goal.months}` : "none"}
            avgExpense={avgExpense}
          />
        )}
      </div>

      <TipsPanel balance={balance} target={target} />

      <section aria-labelledby="mov-title" className={card}>
        <h2 id="mov-title" className="text-xl font-bold">
          Movimentações da reserva
        </h2>
        {movements.length === 0 ? (
          <p className="py-4 text-muted-foreground">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {m.kind === "deposit" ? "Guardado" : "Retirado"}
                    {m.note ? ` — ${m.note}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDate(m.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold tabular-nums ${m.kind === "deposit" ? "text-income" : "text-expense"}`}
                  >
                    {m.kind === "deposit" ? "+" : "−"} {formatBRL(m.amount)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Excluir movimentação de ${formatBRL(m.amount)} em ${formatDate(m.date)}`}
                    className="rounded-md p-2 text-muted-foreground hover:bg-accent"
                    onClick={async () => {
                      if (!confirm("Excluir esta movimentação?")) return;
                      try {
                        await reserveStore.remove(m.id);
                        toast.success("Movimentação excluída.");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Erro ao excluir.");
                      }
                    }}
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MovementForm({ today, potId }: { today: string; potId: string | null }) {
  const [kind, setKind] = useState<ReserveKind>("deposit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseMoney(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    setSaving(true);
    try {
      await reserveStore.add(kind, value, date, note, potId);
      toast.success(kind === "deposit" ? "Valor guardado na reserva." : "Retirada registrada.");
      setAmount("");
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className={`${card} space-y-3`} aria-labelledby="mf-title">
      <h2 id="mf-title" className="text-xl font-bold">
        Registrar movimentação
      </h2>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-1 text-sm font-semibold">Tipo</legend>
        {(["deposit", "withdraw"] as const).map((k) => (
          <label
            key={k}
            className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border font-semibold ${kind === k ? "border-primary bg-secondary text-primary" : "border-input"}`}
          >
            <input
              type="radio"
              name="kind"
              className="sr-only"
              checked={kind === k}
              onChange={() => setKind(k)}
            />
            {k === "deposit" ? (
              <ArrowUpCircle className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ArrowDownCircle className="h-5 w-5" aria-hidden="true" />
            )}
            {k === "deposit" ? "Guardar" : "Retirar"}
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor="r-amount" className="mb-1 block text-sm font-semibold">
          Valor (R$)
        </label>
        <input
          id="r-amount"
          inputMode="decimal"
          placeholder="Ex.: 200,00"
          className={field}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="r-date" className="mb-1 block text-sm font-semibold">
          Data
        </label>
        <input
          id="r-date"
          type="date"
          max={today}
          className={field}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="r-note" className="mb-1 block text-sm font-semibold">
          Observação (opcional)
        </label>
        <input
          id="r-note"
          maxLength={200}
          placeholder="Ex.: Poupança do mês"
          className={field}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button type="submit" className={`${btn} w-full`} disabled={saving}>
        {saving ? "Salvando…" : "Registrar"}
      </button>
    </form>
  );
}

function PotForm({ pot }: { pot?: { id: string; name: string; target_amount: number } }) {
  const [open, setOpen] = useState(!!pot);
  const [name, setName] = useState(pot?.name ?? "");
  const [amount, setAmount] = useState(pot ? String(pot.target_amount).replace(".", ",") : "");
  const [saving, setSaving] = useState(false);
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <PiggyBank /> Novo cofrinho
      </Button>
    );
  return (
    <form
      className="space-y-3 border-y border-border py-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
          await reserveStore.savePot(name, parseMoney(amount), pot?.id);
          toast.success("Cofrinho salvo.");
          if (!pot) {
            setOpen(false);
            setName("");
            setAmount("");
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <h2 className="text-lg font-bold">{pot ? "Editar meta do cofrinho" : "Novo cofrinho"}</h2>
      <label className="block text-sm font-semibold">
        Nome
        <Input
          aria-label={pot ? "Nome do cofrinho selecionado" : "Nome do novo cofrinho"}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Viagem"
          required
        />
      </label>
      <label className="block text-sm font-semibold">
        Meta (R$)
        <Input
          aria-label={pot ? "Meta do cofrinho selecionado" : "Meta do novo cofrinho"}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar cofrinho"}
        </Button>
        {!pot && (
          <Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function GoalForm({ avgExpense }: { avgExpense: number }) {
  const { goal } = useReserve();
  const [mode, setMode] = useState<GoalMode>(goal?.mode ?? "months");
  const [amount, setAmount] = useState(
    goal?.targetAmount ? String(goal.targetAmount).replace(".", ",") : "",
  );
  const [months, setMonths] = useState(String(goal?.months ?? 6));
  const [saving, setSaving] = useState(false);
  const m = Number(months);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseMoney(amount);
    if (mode === "fixed" && (!Number.isFinite(value) || value <= 0)) {
      toast.error("Informe um valor de meta maior que zero.");
      return;
    }
    if (mode === "months" && (!Number.isInteger(m) || m < 1 || m > 24)) {
      toast.error("Escolha entre 1 e 24 meses.");
      return;
    }
    setSaving(true);
    try {
      await reserveStore.saveGoal({
        mode,
        targetAmount: mode === "fixed" ? value : null,
        months: mode === "months" ? m : null,
      });
      toast.success("Meta salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar meta.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className={`${card} space-y-3`} aria-labelledby="gf-title">
      <h2 id="gf-title" className="flex items-center gap-2 text-xl font-bold">
        <Target className="h-5 w-5 text-primary" aria-hidden="true" /> Meta da reserva
      </h2>
      <div>
        <label htmlFor="g-mode" className="mb-1 block text-sm font-semibold">
          Como definir a meta
        </label>
        <select
          id="g-mode"
          className={field}
          value={mode}
          onChange={(e) => setMode(e.target.value as GoalMode)}
        >
          <option value="months">Meses de despesas</option>
          <option value="fixed">Valor fixo</option>
        </select>
      </div>
      {mode === "months" ? (
        <div>
          <label htmlFor="g-months" className="mb-1 block text-sm font-semibold">
            Quantos meses de despesas
          </label>
          <input
            id="g-months"
            type="number"
            min={1}
            max={24}
            className={field}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {avgExpense > 0
              ? `Sua média de despesas (últimos 90 dias) é ${formatBRL(avgExpense)}/mês. Meta sugerida: ${formatBRL(avgExpense * (m || 0))}.`
              : "Registre despesas para o app calcular a meta com base nos seus gastos."}
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="g-amount" className="mb-1 block text-sm font-semibold">
            Valor da meta (R$)
          </label>
          <input
            id="g-amount"
            inputMode="decimal"
            placeholder="Ex.: 10.000,00"
            className={field}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {avgExpense > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Sugestão: 6 meses das suas despesas = {formatBRL(avgExpense * 6)}.
            </p>
          )}
        </div>
      )}
      <button type="submit" className={`${btn} w-full`} disabled={saving}>
        {saving ? "Salvando…" : "Salvar meta"}
      </button>
    </form>
  );
}

function TipsPanel({ balance, target }: { balance: number; target: number | null }) {
  const transactions = useTransactions();
  const fetchTips = useServerFn(getReserveTips);
  const [tips, setTips] = useState<ReserveTips | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setTips(null);
  }, [target]);
  const today = todayISO();
  const real = transactions.filter((t) => !t.sample);
  const avgExpense = averageMonthlyExpense(real, today);
  const hasData = real.length > 0;

  async function ask() {
    setLoading(true);
    setErr(null);
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 89);
    const start = d.toISOString().slice(0, 10);
    const recent = real.filter((t) => t.date >= start && t.date <= today);
    const income = recent.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0) / 3;
    const cats = new Map<string, number>();
    for (const t of recent)
      if (t.type === "despesa") cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount);
    const topCategories = [...cats]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, total]) => ({ category, monthly: Math.round((total / 3) * 100) / 100 }));
    try {
      const r = await fetchTips({
        data: {
          reserve: Math.max(0, balance),
          target,
          avgMonthlyIncome: Math.round(income * 100) / 100,
          avgMonthlyExpense: avgExpense,
          topCategories,
        },
      });
      if (r.ok) setTips(r.data);
      else setErr(r.message);
    } catch {
      setErr("Não foi possível falar com a IA agora. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="tips-title" className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tips-title" className="flex items-center gap-2 text-xl font-bold">
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden="true" /> Dicas da IA para sua
          meta
        </h2>
        <button type="button" className={btn} onClick={ask} disabled={loading || !hasData}>
          {loading ? "Analisando…" : tips ? "Gerar novas dicas" : "Pedir dicas"}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        A IA analisa suas receitas e despesas reais dos últimos 90 dias. As dicas são sugestões, não
        recomendação de investimento.
      </p>
      {!hasData && (
        <p className="mt-3 text-muted-foreground">
          Registre algumas transações para receber dicas personalizadas.
        </p>
      )}
      {err && (
        <p role="alert" className="mt-3 font-semibold text-expense">
          {err}
        </p>
      )}
      {loading && (
        <p role="status" className="mt-3 text-muted-foreground">
          A IA está analisando seus dados…
        </p>
      )}
      {tips && (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p>{tips.summary}</p>
          {tips.monthlySuggestion && (
            <p className="font-semibold">
              Sugestão: guardar cerca de {formatBRL(tips.monthlySuggestion)} por mês.
            </p>
          )}
          <ul className="list-disc space-y-1 pl-5">
            {tips.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
