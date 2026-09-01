-- =====================  VEHICLE CATEGORIES  =====================
CREATE TABLE public.vehicle_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label_it text NOT NULL,
  label_en text NOT NULL,
  macro_class text NOT NULL DEFAULT 'economy',
  damage_penalty numeric NOT NULL DEFAULT 0,
  theft_penalty numeric NOT NULL DEFAULT 0,
  damage_schema_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_categories TO authenticated;
GRANT ALL ON public.vehicle_categories TO service_role;
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.vehicle_categories FOR SELECT TO anon USING (true);
CREATE POLICY "staff read categories" ON public.vehicle_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write categories" ON public.vehicle_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.vehicle_categories (code, label_it, label_en, macro_class, damage_penalty, theft_penalty) VALUES
  ('ECMR', 'Economy', 'Economy', 'economy', 600, 3000),
  ('PDAR', 'Premium', 'Premium', 'premium', 1500, 6000),
  ('MVMR', 'Van 9 posti', '9-seat van', 'van', 1200, 5000),
  ('CVMR', 'Veicoli commerciali', 'Commercial vehicles', 'business', 1000, 4500);

-- vehicles.category_id (la colonna testuale resta come compatibilità/legacy)
ALTER TABLE public.vehicles
  ADD COLUMN category_id uuid REFERENCES public.vehicle_categories(id);
UPDATE public.vehicles v
  SET category_id = c.id
  FROM public.vehicle_categories c
  WHERE c.macro_class = v.category;

-- =====================  RATE PLANS  =====================
CREATE TABLE public.rate_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.vehicle_categories(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  daily_rate numeric NOT NULL DEFAULT 0,
  weekly_rate numeric,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year')::date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rate_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_plans TO authenticated;
GRANT ALL ON public.rate_plans TO service_role;
ALTER TABLE public.rate_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active rate plans" ON public.rate_plans FOR SELECT TO anon USING (active);
CREATE POLICY "staff read rate plans" ON public.rate_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write rate plans" ON public.rate_plans FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.rate_plans (name, category_id, daily_rate, weekly_rate)
SELECT 'Listino base ' || c.label_it, c.id,
  CASE c.macro_class WHEN 'economy' THEN 32 WHEN 'premium' THEN 89 WHEN 'van' THEN 89 ELSE 69 END,
  CASE c.macro_class WHEN 'economy' THEN 189 WHEN 'premium' THEN 549 WHEN 'van' THEN 549 ELSE 429 END
FROM public.vehicle_categories c;

-- =====================  EXTRAS  =====================
CREATE TABLE public.extras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label_it text NOT NULL,
  label_en text NOT NULL,
  price_per_day numeric NOT NULL DEFAULT 0,
  price_type text NOT NULL DEFAULT 'per_giorno',
  max_qty integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.extras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extras TO authenticated;
GRANT ALL ON public.extras TO service_role;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active extras" ON public.extras FOR SELECT TO anon USING (active);
CREATE POLICY "staff read extras" ON public.extras FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write extras" ON public.extras FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.extras (code, label_it, label_en, price_per_day, price_type, max_qty) VALUES
  ('SCDD', 'Secondo conducente', 'Additional driver', 6, 'per_giorno', 1),
  ('SEGG', 'Seggiolino bambino', 'Child seat', 5, 'per_giorno', 3),
  ('GPS',  'Navigatore GPS', 'GPS navigator', 4, 'per_giorno', 1),
  ('KASKO','Copertura Kasko full', 'Full damage cover', 14, 'per_giorno', 1),
  ('OWDR', 'Riconsegna in altra sede', 'One-way drop-off', 45, 'una_tantum', 1),
  ('CLEAN','Pulizia interna premium', 'Premium interior cleaning', 25, 'una_tantum', 1);

-- =====================  COUPONS  =====================
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year')::date,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read valid coupons" ON public.coupons FOR SELECT TO anon
  USING (active AND valid_from <= CURRENT_DATE AND valid_to >= CURRENT_DATE);
CREATE POLICY "staff read coupons" ON public.coupons FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.coupons (code, discount_type, discount_value, max_uses) VALUES
  ('WELCOME10', 'percent', 10, 500),
  ('SARDEGNA25', 'fixed', 25, 200);

-- =====================  CUSTOMERS  =====================
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  fiscal_code text NOT NULL DEFAULT '',
  driving_license_number text NOT NULL DEFAULT '',
  driving_license_expiry date,
  birth_date date,
  address text NOT NULL DEFAULT '',
  blacklisted boolean NOT NULL DEFAULT false,
  blacklist_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.customers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public create customer" ON public.customers FOR INSERT TO anon
  WITH CHECK (blacklisted = false AND blacklist_reason IS NULL);
CREATE POLICY "staff read customers" ON public.customers FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "operators write customers" ON public.customers FOR ALL TO authenticated
  USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

-- =====================  RESERVATIONS: nuove colonne  =====================
ALTER TABLE public.reservations
  ADD COLUMN customer_id uuid REFERENCES public.customers(id),
  ADD COLUMN utm_source text,
  ADD COLUMN utm_medium text,
  ADD COLUMN utm_campaign text,
  ADD COLUMN signed_at timestamptz,
  ADD COLUMN signature_data_url text,
  ADD COLUMN coupon_code text,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN extras_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN driver_age text;

-- richieste di prenotazione dal sito pubblico: solo bozze, nessuna lettura
GRANT INSERT ON public.reservations TO anon;
CREATE POLICY "public request reservation" ON public.reservations FOR INSERT TO anon
  WITH CHECK (status = 'bozza');

-- =====================  RESERVATION EXTRAS  =====================
CREATE TABLE public.reservation_extras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  extra_id uuid NOT NULL REFERENCES public.extras(id),
  qty integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.reservation_extras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_extras TO authenticated;
GRANT ALL ON public.reservation_extras TO service_role;
ALTER TABLE public.reservation_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public add reservation extras" ON public.reservation_extras FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "staff read reservation extras" ON public.reservation_extras FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "operators write reservation extras" ON public.reservation_extras FOR ALL TO authenticated
  USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

-- =====================  PARTNER LEADS  =====================
CREATE TABLE public.partner_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  fleet_size text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'in_valutazione',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.partner_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_leads TO authenticated;
GRANT ALL ON public.partner_leads TO service_role;
ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public create partner lead" ON public.partner_leads FOR INSERT TO anon
  WITH CHECK (status = 'in_valutazione');
CREATE POLICY "staff read partner leads" ON public.partner_leads FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "operators write partner leads" ON public.partner_leads FOR ALL TO authenticated
  USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

-- =====================  updated_at triggers  =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_vehicle_categories_updated BEFORE UPDATE ON public.vehicle_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rate_plans_updated BEFORE UPDATE ON public.rate_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_extras_updated BEFORE UPDATE ON public.extras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_partner_leads_updated BEFORE UPDATE ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();