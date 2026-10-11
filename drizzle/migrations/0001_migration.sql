CREATE TABLE public.reserve_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('deposit','withdraw')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  note text CHECK (note IS NULL OR char_length(note) <= 200),
  movement_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reserve_movements_user_date ON public.reserve_movements (user_id, movement_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reserve_movements TO authenticated;
GRANT ALL ON public.reserve_movements TO service_role;
ALTER TABLE public.reserve_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver próprias movimentações" ON public.reserve_movements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Inserir próprias movimentações" ON public.reserve_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar próprias movimentações" ON public.reserve_movements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Excluir próprias movimentações" ON public.reserve_movements FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.reserve_goals (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  mode text NOT NULL CHECK (mode IN ('fixed','months')),
  target_amount numeric(14,2) CHECK (target_amount IS NULL OR target_amount > 0),
  months integer CHECK (months IS NULL OR (months BETWEEN 1 AND 24)),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reserve_goals TO authenticated;
GRANT ALL ON public.reserve_goals TO service_role;
ALTER TABLE public.reserve_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver própria meta" ON public.reserve_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Inserir própria meta" ON public.reserve_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar própria meta" ON public.reserve_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Excluir própria meta" ON public.reserve_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);