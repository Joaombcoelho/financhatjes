import { expect, it } from "vitest";
import { safeCell } from "./export";
it("impede fórmula executável no CSV de campos livres", () => {
  expect(safeCell("=1+1")).toBe("'=1+1");
  expect(safeCell("Mercado")).toBe("Mercado");
});
