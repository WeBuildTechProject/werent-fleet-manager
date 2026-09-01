CREATE TABLE public.loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  soglia_noleggi_12_mesi integer NOT NULL DEFAULT 0,
  sconto_percentuale numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loyalty_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_tiers TO authenticated;
GRANT ALL ON public.loyalty_tiers TO service_role;

ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_tiers_public_read" ON public.loyalty_tiers
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE POLICY "loyalty_tiers_staff_read" ON public.loyalty_tiers
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "loyalty_tiers_admin_write" ON public.loyalty_tiers
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_loyalty_tiers_updated
  BEFORE UPDATE ON public.loyalty_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.loyalty_tiers (nome, soglia_noleggi_12_mesi, sconto_percentuale, sort_order)
VALUES ('Standard', 0, 0, 1), ('Silver', 3, 5, 2), ('Gold', 6, 10, 3);

INSERT INTO public.app_settings (key, value, description)
VALUES ('loyalty_stacking', 'best', 'Regola fra sconto fedeltà e coupon: best = si applica il più favorevole, stack = si sommano')
ON CONFLICT (key) DO NOTHING;