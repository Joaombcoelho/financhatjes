import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/lib/finance/types";
import { formatBRL, formatDate } from "@/lib/format";

export function AmountText({ t }: { t: Transaction }) {
  const income = t.type === "receita";
  return (
    <span className={`font-bold tabular-nums ${income ? "text-income" : "text-expense"}`}>
      {income ? "+ " : "− "}
      {formatBRL(t.amount)}
    </span>
  );
}

export function TransactionList({ items, onDelete }: { items: Transaction[]; onDelete?: (id: string) => void }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((t) => {
        const income = t.type === "receita";
        const Icon = income ? ArrowUpCircle : ArrowDownCircle;
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${income ? "bg-income-soft text-income" : "bg-expense-soft text-expense"}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {t.description}
                {t.sample && (
                  <span className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">Exemplo</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {income ? "Receita" : "Despesa"} · {t.category} · {formatDate(t.date)}
              </p>
            </div>
            <AmountText t={t} />
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Excluir ${t.description}`}>
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      “{t.description}” de {formatBRL(t.amount)} será removida. Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(t.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </li>
        );
      })}
    </ul>
  );
}
