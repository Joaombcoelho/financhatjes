import { useState } from "react";
import { Star, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "./TransactionForm";
import { preferencesStore, useFinancePreferences } from "@/lib/finance/preferences";
import type { Category, NewTransaction } from "@/lib/finance/types";
import { formatBRL, todayISO } from "@/lib/format";
export function Favorites({
  onSelect,
  disabled,
}: {
  onSelect: (t: NewTransaction) => void;
  disabled: boolean;
}) {
  const { favorites, error } = useFinancePreferences();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Star className="h-4 w-4" /> Favoritos
        </h3>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cadastrar favorito"
          title="Cadastrar favorito"
          disabled={disabled || saving}
          onClick={() => setAdding(!adding)}
        >
          <Plus />
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {favorites.map((f) => (
        <div key={f.id} className="flex min-w-0 gap-1">
          <Button
            variant="outline"
            className="h-auto min-w-0 flex-1 justify-start whitespace-normal py-2 text-left"
            disabled={disabled}
            onClick={() =>
              onSelect({
                description: f.description,
                amount: f.amount,
                type: f.type === "income" ? "receita" : "despesa",
                category: f.category as Category,
                date: todayISO(),
              })
            }
          >
            {f.description} · {formatBRL(f.amount)}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Excluir favorito ${f.description}`}
            title="Excluir favorito"
            disabled={saving}
            onClick={async () => {
              try {
                await preferencesStore.removeFavorite(f.id);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro ao excluir.");
              }
            }}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {!favorites.length && !adding && (
        <p className="text-sm text-muted-foreground">Nenhum favorito cadastrado.</p>
      )}
      {adding && (
        <TransactionForm
          idPrefix="favorite"
          submitLabel={saving ? "Salvando…" : "Salvar favorito"}
          onCancel={() => setAdding(false)}
          onSubmit={async (t) => {
            if (saving) return;
            setSaving(true);
            try {
              await preferencesStore.addFavorite(t);
              setAdding(false);
              toast.success("Favorito salvo.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </div>
  );
}
