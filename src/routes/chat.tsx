import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Check, Loader2, Pencil, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/finance/Notice";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { interpretMessage } from "@/lib/ai/interpret.functions";
import { validateInterpretation } from "@/lib/ai/validate";
import { repository } from "@/lib/finance/store";
import type { NewTransaction } from "@/lib/finance/types";
import { formatBRL, formatDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat financeiro — FinanChat" },
      { name: "description", content: "Registre receitas e despesas escrevendo frases simples, como “Gastei R$ 35 no mercado”." },
      { property: "og:title", content: "Chat financeiro — FinanChat" },
      { property: "og:description", content: "Escreva o que gastou ou recebeu, a IA interpreta e você confirma o registro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chat,
});

type Status = "pending" | "editing" | "saving" | "confirmed" | "cancelled" | "error";
type Proposal = { id: number; role: "proposal"; data: NewTransaction; status: Status; dateGuessed: boolean; error?: string };
type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "bot"; text: string; tone?: "error" }
  | Proposal;

const EXAMPLES = ["Gastei R$ 35 no mercado", "Recebi R$ 2.500 de salário", "Paguei R$ 80 de energia ontem"];

let nextId = 1;

function Chat() {
  const interpret = useServerFn(interpretMessage);
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, role: "bot", text: "Olá! Conte o que você gastou ou recebeu. Ex.: “Gastei R$ 35 no mercado”." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  /** Mensagens do usuário ainda sem transação resolvida (para completar informações faltantes). */
  const pendingContext = useRef<string[]>([]);
  const saving = useRef(new Set<number>());
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading]);
  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const push = (...m: Msg[]) => setMessages((prev) => [...prev, ...m]);

  async function send(text: string) {
    const clean = text.trim().slice(0, 500);
    if (!clean || loading) return;
    push({ id: nextId++, role: "user", text: clean });
    setInput("");
    pendingContext.current = [...pendingContext.current, clean].slice(-3);
    setLoading(true);
    const today = todayISO();
    try {
      const res = await interpret({ data: { messages: pendingContext.current, today } });
      if (!res.ok) {
        push({ id: nextId++, role: "bot", text: res.message, tone: "error" });
        return;
      }
      const v = validateInterpretation(res.data, today);
      if (v.kind === "clarify") {
        push({ id: nextId++, role: "bot", text: v.message });
        if (res.data.intent !== "registrar_transacao") pendingContext.current = [];
      } else {
        pendingContext.current = [];
        push({ id: nextId++, role: "proposal", data: v.data, status: "pending", dateGuessed: v.dateGuessed });
      }
    } catch {
      push({ id: nextId++, role: "bot", text: "Não foi possível falar com a IA. Verifique sua conexão e tente novamente.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  function update(id: number, patch: Partial<Proposal>) {
    setMessages((m) => m.map((x) => (x.id === id && x.role === "proposal" ? { ...x, ...patch } : x)));
  }

  function confirm(id: number, data: NewTransaction) {
    if (saving.current.has(id)) return; // evita duplicação por cliques repetidos
    saving.current.add(id);
    update(id, { status: "saving" });
    try {
      repository.add(data);
      update(id, { data, status: "confirmed", error: undefined });
    } catch (e) {
      saving.current.delete(id);
      update(id, { status: "error", error: e instanceof Error ? e.message : "Não foi possível salvar." });
    }
    inputRef.current?.focus();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Chat financeiro</h1>
        <p className="text-muted-foreground">Escreva uma frase, confira os dados e confirme.</p>
      </div>
      <Notice>
        A IA apenas interpreta sua mensagem; nada é salvo sem a sua confirmação. Somente o texto que você escreve é enviado à IA. A conversa não é guardada ao sair da página; as transações confirmadas, sim.
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
                  <p className={`max-w-[85%] pt-1.5 ${m.tone === "error" ? "font-semibold text-destructive" : ""}`} role={m.tone === "error" ? "alert" : undefined}>
                    <span className="sr-only">FinanChat: </span>{m.tone === "error" && "⚠ "}{m.text}
                  </p>
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
                        <dd className="font-semibold">
                          {formatDate(m.data.date)}
                          {m.dateGuessed && <span className="font-normal text-muted-foreground"> (hoje — data não informada)</span>}
                        </dd>
                      </dl>
                      {(m.status === "pending" || m.status === "error" || m.status === "saving") && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button onClick={() => confirm(m.id, m.data)} disabled={m.status === "saving"}>
                            <Check aria-hidden="true" /> {m.status === "saving" ? "Salvando…" : "Confirmar"}
                          </Button>
                          <Button variant="outline" disabled={m.status === "saving"} onClick={() => update(m.id, { status: "editing" })}><Pencil aria-hidden="true" /> Editar</Button>
                          <Button variant="ghost" disabled={m.status === "saving"} onClick={() => update(m.id, { status: "cancelled" })}><X aria-hidden="true" /> Cancelar</Button>
                        </div>
                      )}
                      {m.status === "error" && (
                        <p className="mt-3 font-semibold text-destructive" role="alert">⚠ {m.error} Tente confirmar novamente.</p>
                      )}
                      {m.status === "confirmed" && (
                        <p className="mt-4 font-semibold text-income" role="status">✓ Salvo com sucesso no navegador.</p>
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
          {loading && (
            <li className="flex gap-2" role="status">
              <BotAvatar />
              <p className="flex items-center gap-2 pt-1.5 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Interpretando sua mensagem…
              </p>
            </li>
          )}
        </ol>
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Exemplos de mensagem">
        {EXAMPLES.map((ex) => (
          <Button key={ex} variant="outline" size="sm" disabled={loading} onClick={() => void send(ex)}>{ex}</Button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">Escreva sua mensagem</label>
        <input
          id="chat-input"
          ref={inputRef}
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex.: Gastei R$ 24,90 no almoço hoje"
          autoComplete="off"
          className="h-12 flex-1 rounded-lg border border-input bg-surface px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="lg" className="h-12" disabled={!input.trim() || loading}>
          {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Enviar
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
