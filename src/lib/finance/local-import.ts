import { supabase } from "@/integrations/supabase/client";
import { friendlyError, isValid, toRow } from "./store";
import type { Transaction } from "./types";

/** Chave antiga do armazenamento local (somente leitura; nunca é apagada automaticamente). */
const LOCAL_KEY = "financhat:transactions:v1";
const doneKey = (userId: string) => `financhat:imported:${userId}`;

/** Transações locais válidas (as inválidas são contadas à parte). */
export function readLocalTransactions(): { valid: Transaction[]; invalid: number } {
  if (typeof window === "undefined") return { valid: [], invalid: 0 };
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return { valid: [], invalid: 0 };
    const fixed = parsed.map((t) => (t && typeof t === "object" && !("createdAt" in t) ? { ...t, createdAt: `${(t as Transaction).date}T00:00:00.000Z` } : t));
    const valid = fixed.filter(isValid);
    return { valid, invalid: fixed.length - valid.length };
  } catch {
    return { valid: [], invalid: 0 };
  }
}

export function importAlreadyDone(userId: string): boolean {
  try { return window.localStorage.getItem(doneKey(userId)) === "1"; } catch { return false; }
}

export function dismissImport(userId: string) {
  try { window.localStorage.setItem(doneKey(userId), "1"); } catch { /* ignora */ }
}

/**
 * Importa para a conta atual. Cada transação local usa seu id como import_key;
 * o banco ignora as já importadas (único por usuário), evitando duplicações em novas tentativas.
 */
export async function importLocalTransactions(userId: string, items: Transaction[]): Promise<{ imported: number }> {
  const rows = items.map((t) => ({ ...toRow(t), import_key: `local:${t.id}` }));
  const { data, error } = await supabase
    .from("transactions")
    .upsert(rows, { onConflict: "user_id,import_key", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(friendlyError(error, "Falha na importação. Nenhum dado local foi apagado; tente novamente."));
  dismissImport(userId);
  return { imported: data?.length ?? 0 };
}
