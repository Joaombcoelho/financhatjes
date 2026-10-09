import type { Transaction } from "./types";

export type Period = "month" | "30days" | "year";
export const PERIOD_LABELS: Record<Period, string> = { month: "Este mês", "30days": "Últimos 30 dias", year: "Este ano" };

export function periodBounds(period: Period, today: string) {
  let start = `${today.slice(0, 7)}-01`;
  if (period === "year") start = `${today.slice(0, 4)}-01-01`;
  if (period === "30days") {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 29);
    start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return { start, end: today };
}

export function transactionsInPeriod(list: Transaction[], period: Period, today: string) {
  const { start, end } = periodBounds(period, today);
  return list.filter((t) => !t.sample && t.date >= start && t.date <= end);
}

export function financialTrend(list: Transaction[], period: Period, today: string) {
  const { start, end } = periodBounds(period, today);
  const buckets = new Map<string, { date: string; receita: number; despesa: number }>();
  const cursor = new Date(`${start}T12:00:00`);
  while (true) {
    const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (date > end) break;
    const key = period === "year" ? date.slice(0, 7) : date;
    if (!buckets.has(key)) buckets.set(key, { date: key, receita: 0, despesa: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const t of transactionsInPeriod(list, period, today)) {
    const key = period === "year" ? t.date.slice(0, 7) : t.date;
    const bucket = buckets.get(key);
    if (bucket) bucket[t.type] += t.amount;
  }
  return [...buckets.values()];
}