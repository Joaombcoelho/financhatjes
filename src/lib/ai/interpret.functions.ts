import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Resposta bruta da IA (validada de novo no navegador antes da confirmação). */
export const aiInterpretationSchema = z.object({
  intent: z.enum(["registrar_transacao", "outro"]),
  type: z.enum(["receita", "despesa"]).nullable(),
  amount: z.number().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  date: z.string().nullable(),
  missing: z.array(z.string()),
  reply: z.string(),
});
export type AiInterpretation = z.infer<typeof aiInterpretationSchema>;

export type InterpretResult =
  | { ok: true; data: AiInterpretation }
  | { ok: false; message: string };

const inputSchema = z.object({
  messages: z.array(z.string().min(1).max(500)).min(1).max(4),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const INSTRUCTIONS = (today: string) => `Você interpreta mensagens em português do Brasil sobre finanças pessoais e extrai UMA transação.
Hoje é ${today} (AAAA-MM-DD). As mensagens do usuário vêm em ordem; as últimas podem completar as anteriores.
Regras:
- intent = "registrar_transacao" se o usuário descreve um gasto ou recebimento; senão "outro".
- type: "despesa" (gastei, paguei, comprei) ou "receita" (recebi, ganhei, salário). null se não estiver claro.
- amount: número em reais (ex.: "R$ 2.500" = 2500, "24,90" = 24.9). NUNCA invente; null se não informado.
- description: curta, ex.: "Mercado", "Energia". null se não houver.
- category: despesa -> Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Compras ou Outros; receita -> Salário, Freelance, Vendas ou Outros.
- date: AAAA-MM-DD somente se o usuário informar ("hoje", "ontem", uma data). Caso contrário null. Nunca invente.
- missing: lista dos campos essenciais ausentes entre "tipo", "valor", "descrição".
- reply: frase curta e amigável em pt-BR. Se faltar algo, peça exatamente a informação faltante. Nunca diga que salvou ou registrou algo.`;

export const interpretMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<InterpretResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, message: "A IA não está configurada no servidor (chave ausente)." };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output, APICallError } = await import("ai");

    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        instructions: INSTRUCTIONS(data.today),
        messages: data.messages.map((m) => ({ role: "user" as const, content: m })),
        output: Output.object({ schema: aiInterpretationSchema }),
        maxRetries: 0,
        providerOptions: {
          openai: {
            store: false,
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const output = await result.output;
      return { ok: true, data: aiInterpretationSchema.parse(output) };
    } catch (error) {
      const status = APICallError.isInstance(error) ? error.statusCode : undefined;
      console.error("interpretMessage failed", status, error);
      if (status === 429) return { ok: false, message: "Muitas solicitações à IA agora. Aguarde alguns segundos e tente de novo." };
      if (status === 402) return { ok: false, message: "Os créditos de IA do projeto acabaram. É preciso adicionar créditos no workspace." };
      if (status === 403) return { ok: false, message: "O acesso à IA foi bloqueado para este projeto. Verifique as configurações do workspace." };
      return { ok: false, message: "Não foi possível falar com a IA agora. Tente novamente em instantes." };
    }
  });
