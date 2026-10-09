import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Wallet, Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/finance/Notice";
import { TransactionForm } from "@/components/finance/TransactionForm";
import { interpretMessage } from "@/lib/ai/interpret.functions";
import { validateInterpretation } from "@/lib/ai/validate";
import { repository } from "@/lib/finance/store";
import type { NewTransaction } from "@/lib/finance/types";
import { formatBRL, formatDate, todayISO } from "@/lib/format";

import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
type Status = "pending" | "editing" | "saving" | "confirmed" | "cancelled" | "error";
type Proposal = { id: number; role: "proposal"; data: NewTransaction; status: Status; dateGuessed: boolean; error?: string | undefined };
type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "bot"; text: string; tone?: "error" }
  | Proposal;

const EXAMPLES = ["Gastei R$ 35 no mercado", "Recebi R$ 2.500 de salário", "Paguei R$ 80 de energia ontem"];

let nextId = 1;

export function FinanceChat({ embedded = false }: { embedded?: boolean }) {
  const interpret = useServerFn(interpretMessage);
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, role: "bot", text: "Olá! Conte o que você gastou ou recebeu. Ex.: “Gastei R$ 35 no mercado”." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  /** Mensagens do usuário ainda sem transação resolvida (para completar informações faltantes). */
  const pendingContext = useRef<string[]>([]);
  const saving = useRef(new Set<number>());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading && messages.length > 1) inputRef.current?.focus();
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

  async function confirm(id: number, data: NewTransaction) {
    if (saving.current.has(id)) return; // evita duplicação por cliques repetidos
    saving.current.add(id);
    update(id, { status: "saving" });
    try {
      await repository.add(data);
      update(id, { data, status: "confirmed", error: undefined });
    } catch (e) {
      saving.current.delete(id);
      update(id, { status: "error", error: e instanceof Error ? e.message : "Não foi possível salvar." });
    }
    inputRef.current?.focus();
  }

  return (
    <section aria-labelledby="chat-title" className={embedded ? "flex min-w-0 flex-col gap-4 border-y border-border py-6" : "mx-auto flex max-w-2xl flex-col gap-4"}>
      <div>
        <h2 id="chat-title" className={embedded ? "text-xl font-bold" : "text-3xl font-bold"}>Chat financeiro</h2>
        <p className="text-muted-foreground">Escreva uma frase, confira os dados e confirme.</p>
      </div>
      <Notice>
        A IA apenas interpreta sua mensagem; nada é salvo sem a sua confirmação. Somente o texto que você escreve é enviado à IA. A conversa não é guardada ao sair da página; as transações confirmadas, sim.
      </Notice>

      <Conversation className="h-72 flex-none rounded-lg border border-border bg-surface motion-reduce:scroll-auto" aria-label="Mensagens">
        <ConversationContent className="gap-4" aria-live="polite">
          {messages.map((m) => {
            if (m.role === "user")
              return (
                <Message key={m.id} from="user">
                  <MessageContent className="break-words text-base group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                    <span className="sr-only">Você: </span>{m.text}
                  </MessageContent>
                </Message>
              );
            if (m.role === "bot")
              return (
                <Message key={m.id} from="assistant" className="flex-row">
                  <BotAvatar />
                  <MessageContent className="pt-1 text-base" role={m.tone === "error" ? "alert" : undefined}>
                    <span className="sr-only">FinanChat: </span>
                    <MessageResponse className={m.tone === "error" ? "font-semibold text-destructive" : ""}>{m.text}</MessageResponse>
                  </MessageContent>
                </Message>
              );
            return (
              <Message key={m.id} from="assistant" className="max-w-full flex-row">
                <BotAvatar />
                <MessageContent className="w-full rounded-lg border border-border bg-surface p-4 text-base">
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
                      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 break-words">
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
                </MessageContent>
              </Message>
            );
          })}
          {loading && (
            <Message from="assistant" className="flex-row" role="status">
              <BotAvatar />
              <p className="flex items-center gap-2 pt-1.5 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Interpretando sua mensagem…
              </p>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton aria-label="Ir para a última mensagem" />
      </Conversation>

      <div className="flex flex-wrap gap-2" aria-label="Exemplos de mensagem">
        {EXAMPLES.map((ex) => (
          <Button key={ex} variant="outline" size="sm" disabled={loading} onClick={() => void send(ex)}>{ex}</Button>
        ))}
      </div>

      <PromptInput onSubmit={() => { void send(input); }} maxFiles={0}>
        <label htmlFor="chat-input" className="sr-only">Escreva sua mensagem</label>
        <PromptInputTextarea
          id="chat-input"
          ref={inputRef}
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex.: Gastei R$ 35 no mercado"
          autoComplete="off"
          className="text-base"
        />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={loading ? "submitted" : "ready"} disabled={!input.trim() || loading} aria-label="Enviar mensagem" title="Enviar mensagem" className="h-10 w-10" />
        </PromptInputFooter>
      </PromptInput>
    </section>
  );
}

function BotAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary" aria-hidden="true">
      <Wallet className="h-5 w-5" />
    </span>
  );
}
