import { useSyncExternalStore } from "react";
import type { NewTransaction, Transaction } from "./types";
import { todayISO } from "../format";

/**
 * Repositório de transações. A implementação atual usa o localStorage do navegador;
 * para usar um banco de dados, basta criar outra implementação desta interface.
 */
export interface TransactionRepository {
  list(): Transaction[];
  add(t: NewTransaction): Transaction;
  addMany(t: NewTransaction[]): void;
  remove(id: string): void;
  removeSamples(): void;
  subscribe(listener: () => void): () => void;
}

const KEY = "financhat:transactions:v1";
const EMPTY: Transaction[] = [];

function createLocalRepository(): TransactionRepository {
  let cache: Transaction[] | null = null;
  const listeners = new Set<() => void>();

  const read = (): Transaction[] => {
    if (typeof window === "undefined") return EMPTY;
    if (cache) return cache;
    try {
      const raw = window.localStorage.getItem(KEY);
      cache = raw ? (JSON.parse(raw) as Transaction[]) : [];
    } catch {
      cache = [];
    }
    return cache;
  };

  const write = (next: Transaction[]) => {
    cache = next;
    window.localStorage.setItem(KEY, JSON.stringify(next));
    listeners.forEach((l) => l());
  };

  const make = (t: NewTransaction): Transaction => ({ ...t, id: crypto.randomUUID() });

  return {
    list: read,
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
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
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
