CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 200),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('income','expense')),
  category text NOT NULL CHECK (char_length(category) BETWEEN 1 AND 60),
  transaction_date date NOT NULL,
  is_sample boolean NOT NULL DEFAULT false,
  import_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, import_key)
);
CREATE INDEX transactions_user_date_idx ON public.transactions (user_id, transaction_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprias transações" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Inserir próprias transações" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar próprias transações" ON public.transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Excluir próprias transações" ON public.transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);