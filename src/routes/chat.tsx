import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Check, Pencil, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/finance/Notice";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { parseMessage, type ParsedTransaction } from "@/lib/finance/parser";
import { repository } from "@/lib/finance/store";
import type { NewTransaction } from "@/lib/finance/types";
import { formatBRL, formatDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat financeiro — FinanChat" },
      { name: "description", content: "Registre receitas e despesas escrevendo frases simples, como “Gastei R$ 35 no mercado”." },
      { property: "og:title", content: "Chat financeiro — FinanChat" },
      { property: "og:description", content: "Escreva o que gastou ou recebeu e confirme o registro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chat,
});

type Status = "pending" | "editing" | "confirmed" | "cancelled";
type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "bot"; text: string }
  | { id: number; role: "proposal"; data: NewTransaction; status: Status };

const EXAMPLES = ["Gastei R$ 35 no mercado", "Recebi R$ 2.500 de salário", "Paguei 120 de internet"];

let nextId = 1;

function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, role: "bot", text: "Olá! Conte o que você gastou ou recebeu. Ex.: “Gastei R$ 35 no mercado”." },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);
  useEffect(() => inputRef.current?.focus(), []);

  function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const parsed: ParsedTransaction | null = parseMessage(clean);
    const reply: Msg = parsed
      ? { id: nextId++, role: "proposal", data: { ...parsed, date: todayISO() }, status: "pending" }
      : {
          id: nextId++,
          role: "bot",
          text: "Não consegui entender. Informe se gastou ou recebeu e o valor. Ex.: “Paguei R$ 50 na farmácia”.",
        };
    setMessages((m) => [...m, { id: nextId++, role: "user", text: clean }, reply]);
    setInput("");
    inputRef.current?.focus();
  }

  function update(id: number, patch: Partial<Extract<Msg, { role: "proposal" }>>) {
    setMessages((m) => m.map((x) => (x.id === id && x.role === "proposal" ? { ...x, ...patch } : x)));
  }

  function confirm(id: number, data: NewTransaction) {
    repository.add(data);
    update(id, { data, status: "confirmed" });
    inputRef.current?.focus();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Chat financeiro</h1>
        <p className="text-muted-foreground">Escreva uma frase, confira os dados e confirme.</p>
      </div>
      <Notice>
        <strong>Modo demonstração:</strong> interpretação por regras. IA será integrada depois. A conversa não é salva ao sair da página; as transações confirmadas, sim.
      </Notice>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <ol className="space-y-4" aria-live="polite" aria-label="Mensagens">
          {messages.map((m) => {
            if (m.role === "user")
              return (
                <li key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
                    <span className="sr-only">Você: </span>{m.text}
                  </p>
                </li>
              );
            if (m.role === "bot")
              return (
                <li key={m.id} className="flex gap-2">
                  <BotAvatar />
                  <p className="max-w-[85%] pt-1.5"><span className="sr-only">FinanChat: </span>{m.text}</p>
                </li>
              );
            return (
              <li key={m.id} className="flex gap-2">
                <BotAvatar />
                <div className="w-full max-w-[85%] rounded-xl border border-border bg-surface p-4">
                  {m.status === "editing" ? (
                    <TransactionForm
                      idPrefix={`edit-${m.id}`}
                      initial={m.data}
                      submitLabel="Confirmar e registrar"
                      onCancel={() => update(m.id, { status: "pending" })}
                      onSubmit={(data) => confirm(m.id, data)}
                    />
                  ) : (
                    <>
                      <p className="font-semibold">Entendi assim. Está correto?</p>
                      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                        <dt className="text-muted-foreground">Tipo</dt>
                        <dd className="font-semibold">{m.data.type === "receita" ? "+ Receita" : "− Despesa"}</dd>
                        <dt className="text-muted-foreground">Valor</dt>
                        <dd className="font-semibold tabular-nums">{formatBRL(m.data.amount)}</dd>
                        <dt className="text-muted-foreground">Descrição</dt>
                        <dd className="font-semibold">{m.data.description}</dd>
                        <dt className="text-muted-foreground">Categoria</dt>
                        <dd className="font-semibold">{m.data.category}</dd>
                        <dt className="text-muted-foreground">Data</dt>
                        <dd className="font-semibold">{formatDate(m.data.date)}</dd>
                      </dl>
                      {m.status === "pending" && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button onClick={() => confirm(m.id, m.data)}><Check aria-hidden="true" /> Confirmar</Button>
                          <Button variant="outline" onClick={() => update(m.id, { status: "editing" })}><Pencil aria-hidden="true" /> Editar</Button>
                          <Button variant="ghost" onClick={() => update(m.id, { status: "cancelled" })}><X aria-hidden="true" /> Cancelar</Button>
                        </div>
                      )}
                      {m.status === "confirmed" && (
                        <p className="mt-4 font-semibold text-income" role="status">✓ Registrado com sucesso.</p>
                      )}
                      {m.status === "cancelled" && (
                        <p className="mt-4 font-semibold text-muted-foreground" role="status">✕ Cancelado. Nada foi registrado.</p>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Exemplos de mensagem">
        {EXAMPLES.map((ex) => (
          <Button key={ex} variant="outline" size="sm" onClick={() => send(ex)}>{ex}</Button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">Escreva sua mensagem</label>
        <input
          id="chat-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex.: Gastei R$ 35 no mercado"
          autoComplete="off"
          className="h-12 flex-1 rounded-lg border border-input bg-surface px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="lg" className="h-12" disabled={!input.trim()}>
          <Send aria-hidden="true" /> Enviar
        </Button>
      </form>
    </div>
  );
}

function BotAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary" aria-hidden="true">
      <Bot className="h-5 w-5" />
    </span>
  );
}
