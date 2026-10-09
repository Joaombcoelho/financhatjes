import { createFileRoute } from "@tanstack/react-router";
import { FinanceChat } from "@/components/finance/FinanceChat";

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
  component: ChatPage,
});

function ChatPage() {
  return <FinanceChat />;
}
