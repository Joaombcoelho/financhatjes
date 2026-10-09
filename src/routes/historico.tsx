import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/finance/Notice";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { TransactionList } from "@/components/finance/TransactionList";
import { repository, sampleTransactions, sortByDate, useTransactions } from "@/lib/finance/store";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — FinanChat" },
      { name: "description", content: "Lista de receitas e despesas: adicione ou exclua transações." },
      { property: "og:title", content: "Histórico — FinanChat" },
      { property: "og:description", content: "Todas as suas transações com descrição, valor, categoria e data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: History,
});

function History() {
  const list = sortByDate(useTransactions());
  const [adding, setAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);

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

      {adding && (
        <section aria-labelledby="add-title" className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 id="add-title" className="mb-4 text-xl font-bold">Nova transação</h2>
          <TransactionForm
            key={formKey}
            idPrefix="hist"
            submitLabel="Salvar transação"
            onCancel={() => setAdding(false)}
            onSubmit={(t) => {
              repository.add(t);
              toast.success("Transação adicionada.");
              setFormKey((k) => k + 1);
              setAdding(false);
            }}
          />
        </section>
      )}

      <section className="rounded-xl border border-border bg-card px-5 py-2 shadow-sm">
        {list.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-semibold">Nenhuma transação ainda.</p>
            <Button className="mt-4" variant="outline" size="lg" onClick={() => repository.addMany(sampleTransactions())}>
              Carregar dados de exemplo
            </Button>
          </div>
        ) : (
          <TransactionList
            items={list}
            onDelete={(id) => {
              repository.remove(id);
              toast.success("Transação excluída.");
            }}
          />
        )}
      </section>
      <Notice>Seus dados ficam salvos apenas neste navegador. A sincronização com banco de dados ainda será integrada.</Notice>
    </div>
  );
}
