import { describe, expect, it } from 'vitest';
import { budgetLevel, generateSchedule } from './schedule';
import type { NewTransaction } from './types';
const t: NewTransaction = { type: 'despesa', amount: 100, description: 'Compra', category: 'Compras', date: '2026-01-31' };
describe('lançamentos futuros', () => {
  it('distribui o total em parcelas sem perder centavos', () => {
    const rows = generateSchedule(t, 'installments', 3);
    expect(rows.map(r => r.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(rows.map(r => r.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });
  it('repete o valor fixo nos meses escolhidos', () => {
    expect(generateSchedule({ ...t, amount: 25 }, 'recurring', 3).map(r => r.amount)).toEqual([25, 25, 25]);
  });
});
describe('tetos por categoria', () => {
  it('alerta ao atingir 80%', () => { expect(budgetLevel(79.99, 100)).toBe('normal'); expect(budgetLevel(80, 100)).toBe('warning'); });
  it('alerta ao atingir 100%', () => { expect(budgetLevel(99.99, 100)).toBe('warning'); expect(budgetLevel(100, 100)).toBe('exceeded'); });
});