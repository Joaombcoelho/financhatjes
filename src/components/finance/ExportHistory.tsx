import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { exportTransactions } from '@/lib/finance/export';
import type { Transaction } from '@/lib/finance/types';
export function ExportHistory({ items }: { items: Transaction[] }) {
  const [busy, setBusy] = useState(false);
  return <div className="flex flex-wrap gap-2" aria-label="Exportar histórico">{(['pdf', 'csv', 'xlsx'] as const).map(format => <Button key={format} variant="outline" disabled={busy || !items.length} onClick={async () => { setBusy(true); try { await exportTransactions(items, format); } catch { toast.error('Não foi possível exportar o histórico.'); } finally { setBusy(false); } }}><Download aria-hidden="true" /> {format === 'xlsx' ? 'Excel' : format.toUpperCase()}</Button>)}</div>;
}