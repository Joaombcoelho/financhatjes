import { describe, expect, it } from "vitest";
import { averageMonthlyExpense, goalProgress, goalTarget, reserveBalance } from "./reserve-calc";
import type { Transaction } from "./types";

const mv = (kind: "deposit" | "withdraw", amount: number) => ({ id: String(Math.random()), kind, amount, note: null, date: "2026-10-01", createdAt: "x" });
const tx = (date: string, amount: number, type: "receita" | "despesa" = "despesa", sample = false): Transaction => ({ id: date + amount, type, amount, description: "d", category: "Outros", date, createdAt: "x", ...(sample ? { sample: true } : {}) });

describe("reserva", () => {
  it("retiradas descontam dos depósitos", () => {
    expect(reserveBalance([mv("deposit", 500), mv("deposit", 0.1), mv("withdraw", 200.2)])).toBe(299.9);
  });
  it("média mensal usa só despesas reais dos últimos 90 dias", () => {
    const list = [tx("2026-10-10", 900), tx("2026-08-01", 300), tx("2026-06-01", 5000), tx("2026-10-01", 2500, "receita"), tx("2026-10-02", 999, "despesa", true)];
    expect(averageMonthlyExpense(list, "2026-10-11")).toBe(400);
  });
  it("meta em meses multiplica a média de despesas", () => {
    expect(goalTarget({ mode: "months", targetAmount: null, months: 6 }, 400)).toBe(2400);
    expect(goalTarget({ mode: "months", targetAmount: null, months: 6 }, 0)).toBeNull();
    expect(goalTarget({ mode: "fixed", targetAmount: 10000, months: null }, 400)).toBe(10000);
  });
  it("mostra quanto falta ou quanto passou da meta", () => {
    expect(goalProgress(7500, 10000)).toEqual({ reached: false, remaining: 2500, above: 0, percent: 75 });
    expect(goalProgress(12000, 10000)).toEqual({ reached: true, remaining: 0, above: 2000, percent: 120 });
  });
});
