import { useSyncExternalStore } from "react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type NewTransaction, type Transaction } from "./types";
import { todayISO } from "../format";

/**
 * Repositório de transações. A implementação atual usa o localStorage do navegador;
 * para usar um banco de dados, basta criar outra implementação desta interface.
 */
export interface TransactionRepository {
  list(): Transaction[];
  /** true se os dados salvos não puderam ser lidos. */
  hadLoadError(): boolean;
  add(t: NewTransaction): Transaction;
  addMany(t: NewTransaction[]): void;
  remove(id: string): void;
  removeSamples(): void;
  subscribe(listener: () => void): () => void;
}

export class StorageError extends Error {}

const ALL_CATEGORIES: readonly string[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

function isValid(t: unknown): t is Transaction {
  if (!t || typeof t !== "object") return false;
  const x = t as Record<string, unknown>;
  return (
    typeof x.id === "string" &&
    (x.type === "receita" || x.type === "despesa") &&
    typeof x.description === "string" && x.description.trim().length > 0 &&
    typeof x.amount === "number" && Number.isFinite(x.amount) && x.amount > 0 &&
    typeof x.category === "string" && ALL_CATEGORIES.includes(x.category) &&
    typeof x.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
    typeof x.createdAt === "string"
  );
}

const KEY = "financhat:transactions:v1";
const EMPTY: Transaction[] = [];

function createLocalRepository(): TransactionRepository {
  let cache: Transaction[] | null = null;
  let loadError = false;
  const listeners = new Set<() => void>();

  const read = (): Transaction[] => {
    if (typeof window === "undefined") return EMPTY;
    if (cache) return cache;
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      cache = Array.isArray(parsed) ? parsed.filter(isValid) : [];
    } catch {
      loadError = true;
      cache = [];
    }
    return cache;
  };

  /** Grava e só atualiza a tela se a gravação der certo; lança StorageError caso contrário. */
  const write = (next: Transaction[]) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw new StorageError("Não foi possível salvar no navegador. Verifique se o armazenamento está liberado e com espaço.");
    }
    cache = next;
    listeners.forEach((l) => l());
  };

  const make = (t: NewTransaction): Transaction => {
    if (!isValid({ ...t, id: "x", createdAt: "x" })) throw new StorageError("Dados da transação inválidos.");
    return { ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  };

  return {
    list: read,
    hadLoadError: () => (read(), loadError),
    add(t) {
      const created = make(t);
      write([created, ...read()]);
      return created;
    },
    addMany(ts) {
      write([...ts.map(make), ...read()]);
    },
    remove(id) {
      write(read().filter((t) => t.id !== id));
    },
    removeSamples() {
      write(read().filter((t) => !t.sample));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const repository: TransactionRepository = createLocalRepository();

/** Lista ordenada (mais recente primeiro); atualiza automaticamente. */
export function useTransactions(): Transaction[] {
  const list = useSyncExternalStore(repository.subscribe, repository.list, () => EMPTY);
  return list;
}

export function sortByDate(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function summarize(list: Transaction[]) {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const t of list) {
    if (t.type === "receita") income += t.amount;
    else {
      expense += t.amount;
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
    }
  }
  const categories = [...byCategory.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  return { income, expense, balance: income - expense, categories };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function sampleTransactions(): NewTransaction[] {
  return [
    { type: "receita", description: "Salário", amount: 2500, category: "Salário", date: daysAgo(10) },
    { type: "despesa", description: "Aluguel", amount: 900, category: "Moradia", date: daysAgo(9) },
    { type: "despesa", description: "Mercado", amount: 235.4, category: "Alimentação", date: daysAgo(6) },
    { type: "despesa", description: "Uber", amount: 28.9, category: "Transporte", date: daysAgo(4) },
    { type: "receita", description: "Freela de design", amount: 400, category: "Freelance", date: daysAgo(3) },
    { type: "despesa", description: "Farmácia", amount: 62, category: "Saúde", date: daysAgo(2) },
    { type: "despesa", description: "Cinema", amount: 45, category: "Lazer", date: todayISO() },
  ].map((t) => ({ ...t, sample: true }) as NewTransaction);
}
