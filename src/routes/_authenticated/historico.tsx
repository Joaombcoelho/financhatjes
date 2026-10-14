import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/finance/Notice";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { TransactionList } from "@/components/finance/TransactionList";
import { ScheduleFields } from "@/components/finance/ScheduleFields";
import { ExportHistory } from "@/components/finance/ExportHistory";
import type { NewTransaction } from "@/lib/finance/types";
import {
  repository,
  sampleTransactions,
  sortByDate,
  useLoadState,
  useTransactions,
} from "@/lib/finance/store";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — FinanChat" },
      {
        name: "description",
        content: "Lista de receitas e despesas: adicione ou exclua transações.",
      },
      { property: "og:title", content: "Histórico — FinanChat" },
      {
        property: "og:description",
        content: "Todas as suas transações com descrição, valor, categoria e data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: History,
});

function History() {
  const list = sortByDate(useTransactions());
  const load = useLoadState();
  const [adding, setAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [draft, setDraft] = useState<NewTransaction | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Histórico</h1>
          <p className="text-muted-foreground">{list.length} transação(ões) registrada(s).</p>
        </div>
        {!adding && (
          <Button size="lg" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" /> Adicionar transação
          </Button>
        )}
      </div>
      <ExportHistory items={list} />

      {adding && (
        <section
          aria-labelledby="add-title"
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <h2 id="add-title" className="mb-4 text-xl font-bold">
            Nova transação
          </h2>
          {draft ? (
            <>
              <p className="mb-3 font-semibold">{draft.description}</p>
              <ScheduleFields
                transaction={draft}
                onCancel={() => setDraft(null)}
                onSaved={() => {
                  setDraft(null);
                  setAdding(false);
                  setFormKey((k) => k + 1);
                  toast.success("Lançamentos salvos.");
                }}
              />
            </>
          ) : (
            <TransactionForm
              key={formKey}
              idPrefix="hist"
              submitLabel="Revisar lançamentos"
              onCancel={() => setAdding(false)}
              onSubmit={setDraft}
            />
          )}
        </section>
      )}

      <section className="rounded-xl border border-border bg-card px-5 py-2 shadow-sm">
        {load.status === "error" ? (
          <div role="alert" className="py-8 text-center">
            <p className="font-semibold text-destructive">{load.error}</p>
            <Button className="mt-4" variant="outline" onClick={() => void repository.load()}>
              Tentar novamente
            </Button>
          </div>
        ) : load.status !== "ready" ? (
          <p role="status" className="py-8 text-center text-muted-foreground">
            Carregando transações…
          </p>
        ) : list.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-semibold">Nenhuma transação ainda.</p>
            <Button
              className="mt-4"
              variant="outline"
              size="lg"
              onClick={async () => {
                try {
                  await repository.addMany(sampleTransactions());
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
                }
              }}
            >
              Carregar dados de exemplo
            </Button>
          </div>
        ) : (
          <TransactionList
            items={list}
            onDelete={async (id) => {
              try {
                await repository.remove(id);
                toast.success("Transação excluída.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
              }
            }}
          />
        )}
      </section>
      <Notice>Suas transações ficam salvas na sua conta e só você tem acesso a elas.</Notice>
    </div>
  );
}
