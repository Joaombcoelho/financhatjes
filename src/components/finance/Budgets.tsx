import { useState } from 'react';
import { Gauge, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { preferencesStore, useFinancePreferences } from '@/lib/finance/preferences';
import { budgetLevel } from '@/lib/finance/schedule';
import { EXPENSE_CATEGORIES, type Transaction } from '@/lib/finance/types';
import { formatBRL, todayISO } from '@/lib/format';
export function Budgets({ transactions }: { transactions: Transaction[] }) {
  const { budgets, error } = useFinancePreferences();
  const [category, setCategory] = useState<string>('Lazer');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const today = todayISO();
  return <section className="space-y-4 border-y border-border py-6" aria-labelledby="budgets-title">
    <div><h2 id="budgets-title" className="flex items-center gap-2 text-xl font-bold"><Gauge /> Tetos de gastos</h2><p className="text-sm text-muted-foreground">Limites mensais · {today.slice(0, 7)} · inclui lançamentos previstos neste mês.</p></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <form className="flex flex-wrap items-end gap-3" onSubmit={async e => { e.preventDefault(); if(saving) return; setSaving(true); try { await preferencesStore.saveBudget(category, Number(amount.replace(/\./g, '').replace(',', '.'))); setAmount(''); toast.success('Limite salvo.'); } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao salvar.'); } finally { setSaving(false); } }}>
      <label className="min-w-40 flex-1 text-sm font-semibold">Categoria<select aria-label="Categoria do teto" className="mt-1 h-11 w-full rounded-md border border-input bg-surface px-3" value={category} onChange={e => setCategory(e.target.value)}>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="min-w-40 flex-1 text-sm font-semibold">Teto mensal (R$)<Input aria-label="Teto mensal (R$)" value={amount} inputMode="decimal" placeholder="Ex.: 500,00" onChange={e => setAmount(e.target.value)} /></label>
      <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar limite'}</Button>
    </form>
    {!budgets.length && <p className="text-sm text-muted-foreground">Nenhum teto definido.</p>}
    <div className="grid gap-3 sm:grid-cols-2">{budgets.map(b => {
      const spent = transactions.filter(t => !t.sample && t.type === 'despesa' && t.category === b.category && t.date.slice(0, 7) === today.slice(0, 7)).reduce((s, t) => s + t.amount, 0);
      const level = budgetLevel(spent, b.amount); const percent = Math.round(spent / b.amount * 100);
      return <div key={b.id} className={`rounded-lg border p-4 ${level === 'exceeded' ? 'border-expense bg-expense-soft' : level === 'warning' ? 'border-warning bg-warning-soft' : 'border-border bg-card'}`}><div className="flex items-center justify-between"><h3 className="font-bold">{b.category}</h3><Button variant="ghost" size="icon" aria-label={`Remover teto ${b.category}`} onClick={async () => { try { await preferencesStore.removeBudget(b.id); } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao excluir.'); } }}><Trash2 /></Button></div><p className="tabular-nums">{formatBRL(spent)} de {formatBRL(b.amount)} · {percent}%</p><p className={`text-sm font-semibold ${level === 'exceeded' ? 'text-expense' : level === 'warning' ? 'text-warning' : 'text-muted-foreground'}`}>{level === 'exceeded' ? `⚠ Limite atingido${spent > b.amount ? `: ${formatBRL(spent - b.amount)} acima` : ''}.` : level === 'warning' ? '⚠ Atenção: 80% do teto atingido.' : `Disponível: ${formatBRL(b.amount - spent)}`}</p></div>;
    })}</div>
  </section>;
}