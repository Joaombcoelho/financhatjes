import { categoriesFor, type NewTransaction } from "@/lib/finance/types";
import type { AiInterpretation } from "./interpret.functions";

export type Validation =
  | { kind: "proposal"; data: NewTransaction; dateGuessed: boolean }
  | { kind: "clarify"; message: string };

/** Não confia cegamente na IA: confere cada campo antes de permitir a confirmação. */
export function validateInterpretation(ai: AiInterpretation, today: string): Validation {
  const missing: string[] = [];
  if (ai.intent !== "registrar_transacao") {
    return { kind: "clarify", message: ai.reply || "Conte um gasto ou recebimento, com o valor. Ex.: “Gastei R$ 35 no mercado”." };
  }
  if (ai.type !== "receita" && ai.type !== "despesa") missing.push("se foi gasto ou recebimento");
  const amount = typeof ai.amount === "number" && Number.isFinite(ai.amount) ? Math.round(ai.amount * 100) / 100 : null;
  if (amount === null || amount <= 0 || amount > 100_000_000) missing.push("o valor");
  const description = ai.description?.trim().slice(0, 80) ?? "";
  if (!description) missing.push("uma descrição");

  if (missing.length > 0 || ai.type === null) {
    return { kind: "clarify", message: ai.reply?.trim() || `Faltou informar ${missing.join(", ")}.` };
  }

  const cats = categoriesFor(ai.type);
  const category = cats.find((c) => c === ai.category) ?? "Outros";
  const validDate = !!ai.date && /^\d{4}-\d{2}-\d{2}$/.test(ai.date) && !Number.isNaN(Date.parse(ai.date));
  return {
    kind: "proposal",
    data: { type: ai.type, amount: amount!, description, category, date: validDate ? ai.date! : today },
    dateGuessed: !validDate,
  };
}
