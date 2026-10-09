export type TransactionType = "receita" | "despesa";

export const EXPENSE_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Lazer",
  "Educação",
  "Compras",
  "Outros",
] as const;

export const INCOME_CATEGORIES = ["Salário", "Freelance", "Vendas", "Outros"] as const;

export type Category = (typeof EXPENSE_CATEGORIES)[number] | (typeof INCOME_CATEGORIES)[number];

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  /** Valor positivo em reais. */
  amount: number;
  category: Category;
  /** Data no formato AAAA-MM-DD. */
  date: string;
  /** Momento de criação (ISO). */
  createdAt: string;
  /** true para dados demonstrativos. */
  sample?: boolean;
}

export type NewTransaction = Omit<Transaction, "id" | "createdAt">;

export function categoriesFor(type: TransactionType): readonly Category[] {
  return type === "receita" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}
