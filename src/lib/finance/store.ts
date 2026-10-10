import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type NewTransaction, type Transaction } from "./types";
import { todayISO } from "../format";

/**
 * Repositório de transações do usuário autenticado, salvo no banco de dados.
 * O isolamento entre usuários é garantido pelo banco (RLS): o user_id é preenchido
 * pelo próprio banco a partir da sessão, nunca enviado pelo navegador.
 */
export type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface TransactionRepository {
  list(): Transaction[];
  status(): LoadStatus;
  /** Mensagem do último erro de carregamento, se houver. */
  loadError(): string | null;
  load(): Promise<void>;
  add(t: NewTransaction): Promise<Transaction>;
  addMany(t: NewTransaction[]): Promise<void>;
  remove(id: string): Promise<void>;
  removeSamples(): Promise<void>;
  /** Limpa o cache (ao sair ou trocar de conta). */
  reset(): void;
  subscribe(listener: () => void): () => void;
}

export class StorageError extends Error {}

const ALL_CATEGORIES: readonly string[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function isValid(t: unknown): t is Transaction {
  if (!t || typeof t !== "object") return false;
  const x = t as Partial<Record<keyof Transaction, unknown>>;
  return (
    typeof x.id === "string" &&
    (x.type === "receita" || x.type === "despesa") &&
    typeof x.description === "string" && x.description.trim().length > 0 && x.description.length <= 200 &&
    typeof x.amount === "number" && Number.isFinite(x.amount) && x.amount > 0 &&
    typeof x.category === "string" && ALL_CATEGORIES.includes(x.category) &&
    typeof x.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
    typeof x.createdAt === "string"
  );
}

/** Traduz erros do banco/rede em mensagens claras. */
export function friendlyError(e: unknown, fallback: string): string {
  const msg = (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "").toLowerCase();
  const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
  if (msg.includes("failed to fetch") || msg.includes("network")) return "Falha de conexão. Verifique sua internet e tente novamente.";
  if (msg.includes("jwt") || code === "PGRST301" || code === "401") return "Sua sessão expirou. Entre novamente para continuar.";
  if (code === "42501") return "Você não tem permissão para esta operação. Entre novamente.";
  return fallback;
}

type Row = {
  id: string;
  description: string;
  amount: number | string;
  type: string;
  category: string;
  transaction_date: string;
  is_sample: boolean;
  created_at: string;
};

const COLUMNS = "id, description, amount, type, category, transaction_date, is_sample, created_at";

function fromRow(r: Row): Transaction {
  return {
    id: r.id,
    type: r.type === "income" ? "receita" : "despesa",
    description: r.description,
    amount: Number(r.amount),
    category: r.category as Transaction["category"],
    date: r.transaction_date,
    createdAt: r.created_at,
    ...(r.is_sample ? { sample: true } : {}),
  };
}

export function toRow(t: NewTransaction) {
  if (!isValid({ ...t, id: "x", createdAt: "x" })) throw new StorageError("Dados da transação inválidos.");
  return {
    description: t.description.trim(),
    amount: Math.round(t.amount * 100) / 100,
    type: t.type === "receita" ? "income" : "expense",
    category: t.category,
    transaction_date: t.date,
    is_sample: !!t.sample,
  };
}

const EMPTY: Transaction[] = [];

function createRemoteRepository(): TransactionRepository {
  let cache: Transaction[] = EMPTY;
  let status: LoadStatus = "idle";
  let error: string | null = null;
  let inflight: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const set = (next: Transaction[]) => { cache = next; emit(); };

  const repo: TransactionRepository = {
    list: () => cache,
    status: () => status,
    loadError: () => error,
    load() {
      if (inflight) return inflight;
      status = "loading";
      emit();
      inflight = (async () => {
        const { data, error: err } = await supabase.from("transactions").select(COLUMNS).order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
        if (err) {
          status = "error";
          error = friendlyError(err, "Não foi possível carregar suas transações.");
        } else {
          status = "ready";
          error = null;
          cache = (data as Row[]).map(fromRow);
        }
        emit();
      })().catch((e) => {
        status = "error";
        error = friendlyError(e, "Não foi possível carregar suas transações.");
        emit();
      }).finally(() => { inflight = null; });
      return inflight;
    },
    async add(t) {
      const row = toRow(t);
      const { data, error: err } = await supabase.from("transactions").insert(row).select(COLUMNS).single();
      if (err || !data) throw new StorageError(friendlyError(err, "Não foi possível salvar a transação."));
      const created = fromRow(data as Row);
      set([created, ...cache]);
      return created;
    },
    async addMany(ts) {
      const rows = ts.map(toRow);
      const { data, error: err } = await supabase.from("transactions").insert(rows).select(COLUMNS);
      if (err || !data) throw new StorageError(friendlyError(err, "Não foi possível salvar as transações."));
      set([...(data as Row[]).map(fromRow), ...cache]);
    },
    async remove(id) {
      const { error: err } = await supabase.from("transactions").delete().eq("id", id);
      if (err) throw new StorageError(friendlyError(err, "Não foi possível excluir a transação."));
      set(cache.filter((t) => t.id !== id));
    },
    async removeSamples() {
      const { error: err } = await supabase.from("transactions").delete().eq("is_sample", true);
      if (err) throw new StorageError(friendlyError(err, "Não foi possível remover os exemplos."));
      set(cache.filter((t) => !t.sample));
    },
    reset() {
      cache = EMPTY;
      status = "idle";
      error = null;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return repo;
}

export const repository: TransactionRepository = createRemoteRepository();

/** Lista do usuário autenticado; carrega na primeira utilização e atualiza automaticamente. */
export function useTransactions(): Transaction[] {
  const list = useSyncExternalStore(repository.subscribe, repository.list, () => EMPTY);
  useEffect(() => {
    if (repository.status() === "idle") void repository.load();
  }, []);
  return list;
}

export function useLoadState(): { status: LoadStatus; error: string | null } {
  const status = useSyncExternalStore(repository.subscribe, repository.status, () => "idle" as LoadStatus);
  return { status, error: repository.loadError() };
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
