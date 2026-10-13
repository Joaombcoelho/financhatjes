import type { Transaction } from "./types";

export type ReserveKind = "deposit" | "withdraw";
export interface ReserveMovement {
  id: string;
  kind: ReserveKind;
  amount: number;
  note: string | null;
  date: string;
  createdAt: string;
  potId?: string | null;
}
export type GoalMode = "fixed" | "months";
export interface ReserveGoal {
  mode: GoalMode;
  targetAmount: number | null;
  months: number | null;
}

/** Total guardado: depósitos menos retiradas. */
export function reserveBalance(list: ReserveMovement[]): number {
  const cents = list.reduce((s, m) => s + Math.round(m.amount * 100) * (m.kind === "deposit" ? 1 : -1), 0);
  return cents / 100;
}

/** Média mensal de despesas reais dos últimos 90 dias (até hoje), dividida por 3. */
export function averageMonthlyExpense(list: Transaction[], today: string): number {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - 89);
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const total = list
    .filter((t) => !t.sample && t.type === "despesa" && t.date >= start && t.date <= today)
    .reduce((s, t) => s + t.amount, 0);
  return Math.round((total / 3) * 100) / 100;
}

/** Valor da meta; null quando não dá para calcular. */
export function goalTarget(goal: ReserveGoal | null, avgMonthlyExpense: number): number | null {
  if (!goal) return null;
  if (goal.mode === "fixed") return goal.targetAmount && goal.targetAmount > 0 ? goal.targetAmount : null;
  if (!goal.months || avgMonthlyExpense <= 0) return null;
  return Math.round(goal.months * avgMonthlyExpense * 100) / 100;
}

export function goalProgress(balance: number, target: number) {
  const diff = Math.round((balance - target) * 100) / 100;
  return {
    reached: diff >= 0,
    remaining: diff < 0 ? -diff : 0,
    above: diff > 0 ? diff : 0,
    percent: target > 0 ? Math.max(0, Math.round((balance / target) * 100)) : 0,
  };
}
