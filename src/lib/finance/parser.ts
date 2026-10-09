import type { Category, TransactionType } from "./types";

export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  category: Category;
}

/**
 * Interface do interpretador de mensagens. Hoje: regras locais.
 * Futuro: trocar por uma chamada a uma função de servidor com IA.
 */
export type MessageParser = (text: string) => ParsedTransaction | null;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const INCOME_WORDS = ["recebi", "ganhei", "entrou", "entraram", "vendi", "receita", "salario", "freela"];
const EXPENSE_WORDS = ["gastei", "paguei", "comprei", "gasto", "despesa", "pago", "saiu", "torrei"];

const EXPENSE_RULES: [Category, string[]][] = [
  ["Alimentação", ["mercado", "supermercado", "restaurante", "lanche", "ifood", "padaria", "almoco", "jantar", "cafe", "pizza", "feira", "comida"]],
  ["Transporte", ["uber", "onibus", "gasolina", "combustivel", "metro", "taxi", "estacionamento", "passagem", "99"]],
  ["Moradia", ["aluguel", "luz", "energia", "agua", "internet", "condominio", "gas"]],
  ["Saúde", ["farmacia", "remedio", "medico", "consulta", "dentista", "exame", "academia"]],
  ["Lazer", ["cinema", "show", "netflix", "spotify", "viagem", "bar", "jogo", "streaming"]],
  ["Educação", ["curso", "livro", "escola", "faculdade", "mensalidade"]],
  ["Compras", ["roupa", "sapato", "loja", "presente", "celular", "eletronico"]],
];
const INCOME_RULES: [Category, string[]][] = [
  ["Salário", ["salario", "pagamento do trabalho"]],
  ["Freelance", ["freela", "freelance", "servico", "projeto", "cliente"]],
  ["Vendas", ["vendi", "venda"]],
];

const AMOUNT_RE = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?(?:\s*reais)?/i;
const STOP_WORDS = new Set(["no", "na", "nos", "nas", "de", "do", "da", "dos", "das", "em", "com", "o", "a", "um", "uma", "pelo", "pela", "para", "pra", "hoje", "ontem", "reais", "r$"]);

const hasWord = (text: string, words: string[]) =>
  words.some((w) => new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(text));

export function parseAmount(text: string): number | null {
  const m = text.match(AMOUNT_RE);
  if (!m || !m[1]) return null;
  const value = Number(m[1].replace(/\./g, "") + "." + (m[2] ?? "0"));
  return value > 0 ? value : null;
}

export const parseMessage: MessageParser = (text) => {
  const amount = parseAmount(text);
  if (amount === null) return null;
  const n = norm(text);

  let type: TransactionType | null = null;
  if (hasWord(n, INCOME_WORDS)) type = "receita";
  else if (hasWord(n, EXPENSE_WORDS)) type = "despesa";
  if (!type) return null;

  const rules = type === "receita" ? INCOME_RULES : EXPENSE_RULES;
  const category = rules.find(([, words]) => hasWord(n, words))?.[0] ?? "Outros";

  const verbs = new Set([...INCOME_WORDS, ...EXPENSE_WORDS].filter((w) => w !== "salario" && w !== "freela"));
  const rest = text
    .replace(AMOUNT_RE, " ")
    .split(/\s+/)
    .filter((w) => w && !verbs.has(norm(w)) && !STOP_WORDS.has(norm(w)))
    .join(" ")
    .replace(/[.,!?;:]+$/g, "")
    .trim();
  const description = rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : category;

  return { type, amount, description, category };
};
