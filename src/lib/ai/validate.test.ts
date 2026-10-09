import { describe, expect, it } from "vitest";
import { validateInterpretation } from "./validate";

const base = {
  intent: "registrar_transacao" as const,
  type: "despesa" as const,
  amount: 35,
  description: "Mercado",
  category: "Alimentação",
  date: null,
  missing: [],
  reply: "ok",
};

describe("validateInterpretation", () => {
  it("aceita transação completa e usa hoje quando a data não foi informada", () => {
    const r = validateInterpretation(base, "2026-10-09");
    expect(r).toEqual({ kind: "proposal", dateGuessed: true, data: { type: "despesa", amount: 35, description: "Mercado", category: "Alimentação", date: "2026-10-09" } });
  });

  it("pede esclarecimento quando falta valor", () => {
    expect(validateInterpretation({ ...base, amount: null }, "2026-10-09").kind).toBe("clarify");
  });

  it("rejeita valor negativo", () => {
    expect(validateInterpretation({ ...base, amount: -5 }, "2026-10-09").kind).toBe("clarify");
  });

  it("troca categoria inválida por Outros", () => {
    const r = validateInterpretation({ ...base, category: "Inventada" }, "2026-10-09");
    expect(r.kind === "proposal" && r.data.category).toBe("Outros");
  });
});
