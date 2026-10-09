import { describe, expect, it } from "vitest";
import { parseMessage } from "./parser";

describe("parseMessage", () => {
  it("interpreta despesa no mercado", () => {
    expect(parseMessage("Gastei R$ 35 no mercado")).toEqual({
      type: "despesa",
      amount: 35,
      description: "Mercado",
      category: "Alimentação",
    });
  });

  it("interpreta salário com separador de milhar", () => {
    expect(parseMessage("Recebi R$ 2.500 de salário")).toMatchObject({
      type: "receita",
      amount: 2500,
      category: "Salário",
    });
  });

  it("interpreta centavos com vírgula", () => {
    expect(parseMessage("Paguei 28,90 no uber")).toMatchObject({ amount: 28.9, category: "Transporte" });
  });

  it("retorna null sem valor", () => {
    expect(parseMessage("Gastei no mercado")).toBeNull();
  });

  it("retorna null sem indicar receita ou despesa", () => {
    expect(parseMessage("mercado 35")).toBeNull();
  });
});
