import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { friendlyError, StorageError, toRow } from './store';
import type { NewTransaction } from './types';
import type { Tables } from '@/integrations/supabase/types';
type State = { favorites: Tables<'transaction_favorites'>[]; budgets: Tables<'category_budgets'>[]; loaded: boolean; error: string | null };
const INITIAL: State = { favorites: [], budgets: [], loaded: false, error: null };
let state = INITIAL;
let version = 0;
const listeners = new Set<() => void>();
function set(p: Partial<State>) { state = { ...state, ...p }; listeners.forEach(l => l()); }
export const preferencesStore = {
  async load() {
    const generation = version;
    const [f, b] = await Promise.all([supabase.from('transaction_favorites').select('*').order('created_at'), supabase.from('category_budgets').select('*').order('category')]);
    if (generation !== version) return;
    set({ loaded: true, favorites: f.data ?? [], budgets: b.data ?? [], error: f.error || b.error ? friendlyError(f.error ?? b.error, 'Não foi possível carregar favoritos e limites.') : null });
  },
  async addFavorite(t: NewTransaction) {
    const r = toRow(t);
    const { error } = await supabase.from('transaction_favorites').insert({ description: r.description, amount: r.amount, category: r.category, type: r.type });
    if (error) throw new StorageError(friendlyError(error, 'Não foi possível salvar o favorito.'));
    await this.load();
  },
  async removeFavorite(id: string) {
    const { error } = await supabase.from('transaction_favorites').delete().eq('id', id);
    if (error) throw new StorageError('Não foi possível excluir o favorito.');
    await this.load();
  },
  async saveBudget(category: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) throw new StorageError('Informe um limite maior que zero.');
    const existing = state.budgets.find(b => b.category === category);
    const result = existing ? await supabase.from('category_budgets').update({ amount }).eq('id', existing.id) : await supabase.from('category_budgets').insert({ category, amount });
    if (result.error) throw new StorageError(friendlyError(result.error, 'Não foi possível salvar o limite.'));
    await this.load();
  },
  async removeBudget(id: string) {
    const { error } = await supabase.from('category_budgets').delete().eq('id', id);
    if (error) throw new StorageError('Não foi possível remover o limite.');
    await this.load();
  },
  reset() { version++; set(INITIAL); },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};
export function useFinancePreferences() {
  const s = useSyncExternalStore(preferencesStore.subscribe, () => state, () => INITIAL);
  useEffect(() => { if (!state.loaded) void preferencesStore.load(); }, []);
  return s;
}