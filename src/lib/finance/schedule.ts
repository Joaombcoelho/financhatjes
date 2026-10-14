import type { NewTransaction } from "./types";
export type ScheduleMode = "once" | "recurring" | "installments";
export function generateSchedule(
  t: NewTransaction,
  mode: ScheduleMode,
  count: number,
): NewTransaction[] {
  if (mode === "once") return [t];
  if (!Number.isInteger(count) || count < 2 || count > 60)
    throw new Error("Escolha entre 2 e 60 meses.");
  const [year, month, day] = t.date.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Data inválida.");
  const cents = Math.round(t.amount * 100);
  if (mode === "installments" && cents < count)
    throw new Error("Cada parcela precisa ter pelo menos R$ 0,01.");
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 + i, 1, 12);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return {
      ...t,
      description: `${t.description.slice(0, 175)} (${mode === "installments" ? "parcela" : "recorrente"} ${i + 1}/${count})`,
      amount:
        mode === "installments"
          ? (Math.floor(cents / count) + (i < cents % count ? 1 : 0)) / 100
          : t.amount,
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`,
    };
  });
}
export function budgetLevel(spent: number, limit: number): "normal" | "warning" | "exceeded" {
  if (spent >= limit) return "exceeded";
  return spent >= limit * 0.8 ? "warning" : "normal";
}
