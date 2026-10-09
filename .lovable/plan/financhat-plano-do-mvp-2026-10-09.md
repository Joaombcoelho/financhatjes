# FinanChat — Plano do MVP

## Objetivo
Um app enxuto de finanças pessoais em português (BR), com valores em R$, em três telas: Painel, Chat e Histórico. Funciona no celular e no computador.

## Telas
```text
[Painel]  [Chat]  [Histórico]   <- barra de navegação (embaixo no celular, em cima no computador)
```
1. **Painel (/)**: saldo atual, total de receitas, total de despesas, as 5 últimas transações e um gráfico de barras com os gastos por categoria. Cada barra mostra o nome e o valor em texto, então a informação não depende só da cor.
2. **Chat (/chat)**: o usuário escreve, por exemplo, "Gastei R$ 35 no mercado". O app mostra um cartão com valor, tipo, descrição e categoria. A pessoa pode **Confirmar**, **Editar** ou **Cancelar**. A transação só é salva depois da confirmação.
3. **Histórico (/historico)**: lista com descrição, valor, categoria, data e tipo (indicado por ícone, sinal +/− e texto). Tem um formulário para adicionar transações e um botão para excluir, que pede confirmação.

## Transparência (sem nada que só pareça funcionar)
- **Interpretação no chat**: nesta fase, quem lê as mensagens é um **interpretador local por regras** (palavras-chave como gastei/paguei/recebi e categorias comuns), e não uma IA de verdade. O chat mostra um aviso visível: "Modo demonstração: interpretação por regras. IA será integrada depois." Quando o app não entender a mensagem, ele avisa e pede para reformular.
- **Onde ficam os dados**: as transações ficam salvas **somente neste navegador**. Um aviso informa isso.
- **Dados de exemplo**: um botão "Carregar dados de exemplo" adiciona transações marcadas com o selo "Exemplo". Outro botão permite limpar esses dados.
- **Atualização do painel**: o painel muda na hora quando uma transação é adicionada ou excluída.

## Design
Visual limpo e profissional, com verde-petróleo como cor principal e fundo claro quente. As letras são grandes e com bom contraste (padrão WCAG AA). Os botões são grandes e têm texto, foco visível e rótulos para leitores de tela. Não inclui modo escuro nem telas extras.

## Fora do escopo
Integração bancária, metas, relatórios avançados, notificações, login e banco de dados na nuvem.

## O que fica para depois
- Banco de dados e login (Lovable Cloud), para os dados acompanharem o usuário em qualquer aparelho.
- IA de verdade para interpretar as mensagens, substituindo o interpretador por regras sem mudar a tela.

## Detalhes técnicos
- `src/lib/finance/types.ts`: tipos Transaction e Category.
- `src/lib/finance/store.ts`: repositório com interface (`list/add/remove`) e implementação em localStorage. Usa `useSyncExternalStore` para atualizar a tela automaticamente. Depois, basta trocar pela implementação com banco de dados.
- `src/lib/finance/parser.ts`: função `parseMessage(text) => ParsedTransaction | null` por trás de uma interface, que poderá ser trocada por uma função de servidor com IA. Inclui testes em vitest para valor, tipo e categoria.
- `src/lib/format.ts`: formatação com Intl para BRL e datas em pt-BR.
- Rotas: `index.tsx`, `chat.tsx` e `historico.tsx`, cada uma com seu próprio head(). Navegação em `__root.tsx`.
- Gráfico feito com recharts ou com barras CSS simples e acessíveis.
- O chat é uma conversa única, que não é salva entre sessões.
