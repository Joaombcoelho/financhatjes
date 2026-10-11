import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const money = z.number().finite().min(0).max(1e9);
const inputSchema = z.object({
  reserve: money,
  target: money.nullable(),
  avgMonthlyIncome: money,
  avgMonthlyExpense: money,
  topCategories: z.array(z.object({ category: z.string().max(60), monthly: money })).max(8),
});

const tipsSchema = z.object({
  summary: z.string(),
  monthlySuggestion: z.number().nullable(),
  tips: z.array(z.string()).max(5),
});
export type ReserveTips = z.infer<typeof tipsSchema>;
export type ReserveTipsResult = { ok: true; data: ReserveTips } | { ok: false; message: string };

const INSTRUCTIONS = `Você é um orientador financeiro para iniciantes no Brasil. Responda em pt-BR, linguagem simples e gentil.
Recebe números reais do usuário (médias mensais dos últimos 90 dias, em R$) sobre a reserva de emergência.
- summary: 1 a 2 frases sobre a situação atual da reserva em relação à meta (ou sem meta).
- monthlySuggestion: valor mensal realista (R$) para guardar, baseado na sobra entre receitas e despesas; null se não houver sobra ou dados.
- tips: até 5 dicas práticas e específicas, citando as categorias de maior gasto com valores aproximados de economia.
Use apenas os números fornecidos; nunca invente dados. Não recomende investimentos específicos nem produtos financeiros de marcas.`;

export const getReserveTips = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ReserveTipsResult> => {
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
        instructions: INSTRUCTIONS,
        messages: [{ role: "user", content: JSON.stringify(data) }],
        output: Output.object({ schema: tipsSchema }),
        maxRetries: 0,
        providerOptions: {
          openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
        },
      });
      const out = tipsSchema.parse(await result.output);
      return { ok: true, data: { ...out, monthlySuggestion: out.monthlySuggestion && out.monthlySuggestion > 0 ? out.monthlySuggestion : null } };
    } catch (error) {
      const status = APICallError.isInstance(error) ? error.statusCode : undefined;
      console.error("getReserveTips failed", status, error);
      if (status === 429) return { ok: false, message: "Muitas solicitações à IA agora. Aguarde alguns segundos e tente de novo." };
      if (status === 402) return { ok: false, message: "Os créditos de IA do projeto acabaram. É preciso adicionar créditos no workspace." };
      if (status === 403) return { ok: false, message: "O acesso à IA foi bloqueado para este projeto. Verifique as configurações do workspace." };
      return { ok: false, message: "Não foi possível falar com a IA agora. Tente novamente em instantes." };
    }
  });
