import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoriesFor, type Category, type NewTransaction, type TransactionType } from "@/lib/finance/types";
import { parseAmount } from "@/lib/finance/parser";
import { todayISO } from "@/lib/format";

interface Props {
  initial?: Partial<NewTransaction>;
  submitLabel: string;
  onSubmit: (t: NewTransaction) => void;
  onCancel?: () => void;
  idPrefix: string;
}

const selectClass =
  "h-11 w-full rounded-md border border-input bg-surface px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TransactionForm({ initial, submitLabel, onSubmit, onCancel, idPrefix }: Props) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "despesa");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(
    initial?.amount ? initial.amount.toFixed(2).replace(".", ",") : "",
  );
  const [category, setCategory] = useState<Category>(initial?.category ?? "Outros");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [error, setError] = useState<string | null>(null);

  const cats = categoriesFor(type);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!description.trim()) return setError("Informe uma descrição.");
    if (value === null) return setError("Informe um valor maior que zero, por exemplo 35,90.");
    if (!date) return setError("Informe a data.");
    setError(null);
    onSubmit({
      type,
      description: description.trim(),
      amount: value,
      category: cats.includes(category) ? category : "Outros",
      date,
    });
  }

  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Tipo</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["despesa", "receita"] as const).map((t) => (
            <label
              key={t}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-surface font-semibold has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name={id("type")}
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="h-4 w-4 accent-primary"
              />
              {t === "despesa" ? "− Despesa" : "+ Receita"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={id("desc")}>Descrição</Label>
          <Input id={id("desc")} className="h-11 text-base" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Mercado" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("amount")}>Valor (R$)</Label>
          <Input id={id("amount")} className="h-11 text-base" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("date")}>Data</Label>
          <Input id={id("date")} type="date" className="h-11 text-base" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={id("cat")}>Categoria</Label>
          <select id={id("cat")} className={selectClass} value={cats.includes(category) ? category : "Outros"} onChange={(e) => setCategory(e.target.value as Category)}>
            {cats.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          ⚠ {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg">{submitLabel}</Button>
        {onCancel && (
          <Button type="button" size="lg" variant="outline" onClick={onCancel}>Cancelar</Button>
        )}
      </div>
    </form>
  );
}
