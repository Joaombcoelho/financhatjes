import { describe, expect, it } from "vitest";
import { financialTrend, periodBounds, transactionsInPeriod } from "./dashboard";
import type { Transaction } from "./types";

const transaction = (date: string, type: Transaction["type"] = "despesa", sample = false): Transaction => ({ id: date + type, date, type, sample, amount: 35, description: "Mercado", category: "Alimentação", createdAt: `${date}T12:00:00Z` });

describe("dashboard periods", () => {
  it("includes today and the month boundary, excluding future and samples", () => {
    const list = [transaction("2026-10-01"), transaction("2026-10-09"), transaction("2026-09-30"), transaction("2026-10-10"), transaction("2026-10-02", "despesa", true)];
    expect(transactionsInPeriod(list, "month", "2026-10-09")).toHaveLength(2);
  });
  it("counts 30 calendar days inclusively across a leap-year boundary", () => {
    expect(periodBounds("30days", "2024-03-01")).toEqual({ start: "2024-02-01", end: "2024-03-01" });
  });
  it("groups annual totals by month and separates income and expense", () => {
    const trend = financialTrend([transaction("2026-01-03", "receita"), transaction("2026-01-04"), transaction("2026-03-01")], "year", "2026-03-09");
    expect(trend).toEqual([{ date: "2026-01", receita: 35, despesa: 35 }, { date: "2026-02", receita: 0, despesa: 0 }, { date: "2026-03", receita: 0, despesa: 35 }]);
  });
  it("fills days without transactions with real zero totals", () => {
    expect(financialTrend([transaction("2026-10-02")], "month", "2026-10-03")).toEqual([{ date: "2026-10-01", receita: 0, despesa: 0 }, { date: "2026-10-02", receita: 0, despesa: 35 }, { date: "2026-10-03", receita: 0, despesa: 0 }]);
  });
});