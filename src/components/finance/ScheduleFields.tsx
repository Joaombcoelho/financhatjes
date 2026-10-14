import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateSchedule, type ScheduleMode } from "@/lib/finance/schedule";
import { repository } from "@/lib/finance/store";
import type { NewTransaction } from "@/lib/finance/types";
import { formatBRL, formatDate } from "@/lib/format";
export function ScheduleFields({
  transaction,
  onSaved,
  onCancel,
}: {
  transaction: NewTransaction;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<ScheduleMode>("once");
  const [count, setCount] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  let rows: NewTransaction[] = [];
  let scheduleError = "";
  try {
    rows = generateSchedule(transaction, mode, count);
  } catch (e) {
    scheduleError = e instanceof Error ? e.message : "Verifique as parcelas.";
  }
  async function confirm() {
    if (saving || !rows.length) return;
    setSaving(true);
    setError("");
    try {
      await repository.addMany(rows);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      setSaving(false);
    }
  }
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold">
        Frequência
        <select
          aria-label="Frequência do lançamento"
          className="mt-1 h-11 w-full rounded-md border border-input bg-surface px-3"
          value={mode}
          disabled={saving}
          onChange={(e) => setMode(e.target.value as ScheduleMode)}
        >
          <option value="once">Uma vez</option>
          <option value="recurring">Fixo / recorrente mensal</option>
          <option value="installments">Parcelado (valor total dividido)</option>
        </select>
      </label>
      {mode !== "once" && (
        <label className="block text-sm font-semibold">
          {mode === "installments" ? "Número de parcelas" : "Quantidade de meses"}
          <Input
            type="number"
            aria-label="Quantidade de meses ou parcelas"
            min={2}
            max={60}
            value={count}
            disabled={saving}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
      )}
      <div
        className="max-h-48 overflow-auto rounded-md border border-border"
        aria-label="Prévia dos lançamentos"
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2">Data</th>
              <th className="p-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-2">{formatDate(r.date)}</td>
                <td className="p-2 tabular-nums">{formatBRL(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        {rows.length} lançamento(s) · total {formatBRL(rows.reduce((s, r) => s + r.amount, 0))}
      </p>
      {(scheduleError || error) && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {scheduleError || error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving || !rows.length} onClick={() => void confirm()}>
          {saving ? "Salvando…" : "Confirmar lançamentos"}
        </Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
