CREATE TABLE public.transaction_favorites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 200), amount numeric(14,2) NOT NULL CHECK(amount > 0), type text NOT NULL CHECK(type IN ('income','expense')), category text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_favorites TO authenticated;
GRANT ALL ON public.transaction_favorites TO service_role;
ALTER TABLE public.transaction_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY favorites_owner ON public.transaction_favorites FOR ALL TO authenticated USING(user_id = auth.uid()) WITH CHECK(user_id = auth.uid());
CREATE TABLE public.category_budgets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), category text NOT NULL CHECK(category IN ('Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Compras','Outros')), amount numeric(14,2) NOT NULL CHECK(amount > 0), UNIQUE(user_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_budgets TO authenticated;
GRANT ALL ON public.category_budgets TO service_role;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY budgets_owner ON public.category_budgets FOR ALL TO authenticated USING(user_id = auth.uid()) WITH CHECK(user_id = auth.uid());
CREATE TABLE public.savings_pots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 80), target_amount numeric(14,2) NOT NULL CHECK(target_amount > 0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_pots TO authenticated;
GRANT ALL ON public.savings_pots TO service_role;
ALTER TABLE public.savings_pots ENABLE ROW LEVEL SECURITY;
CREATE POLICY pots_owner ON public.savings_pots FOR ALL TO authenticated USING(user_id = auth.uid()) WITH CHECK(user_id = auth.uid());
ALTER TABLE public.reserve_movements ADD COLUMN pot_id uuid;
ALTER TABLE public.reserve_movements ADD CONSTRAINT reserve_pot_owner FOREIGN KEY (pot_id,user_id) REFERENCES public.savings_pots(id,user_id);
CREATE INDEX reserve_movements_pot ON public.reserve_movements(pot_id);
COMMENT ON COLUMN public.reserve_movements.pot_id IS 'NULL identifies the existing principal emergency reserve; other values identify user-owned savings pots.';