-- ROLES
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','responsabile_sede','front_desk','manutentore','contabilita');

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  branch_id uuid REFERENCES public.branches ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL UNIQUE,
  model text NOT NULL,
  category text NOT NULL,
  branch_id uuid REFERENCES public.branches ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'disponibile',
  daily_rate numeric(10,2) NOT NULL DEFAULT 0,
  mileage integer NOT NULL DEFAULT 0,
  next_service_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  vat_number text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  discount_pct numeric(5,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'attivo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  vehicle_id uuid REFERENCES public.vehicles ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches ON DELETE SET NULL,
  partner_id uuid REFERENCES public.partners ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  date_from date NOT NULL,
  date_to date NOT NULL,
  status text NOT NULL DEFAULT 'confermata',
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicle_damages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles ON DELETE CASCADE,
  view text NOT NULL DEFAULT 'fronte',
  pos_x numeric(5,2) NOT NULL DEFAULT 50,
  pos_y numeric(5,2) NOT NULL DEFAULT 50,
  damage_type text NOT NULL DEFAULT 'graffio',
  severity text NOT NULL DEFAULT 'lieve',
  description text,
  status text NOT NULL DEFAULT 'aperto',
  reported_at timestamptz NOT NULL DEFAULT now(),
  reported_by uuid REFERENCES auth.users ON DELETE SET NULL
);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- GRANTS
GRANT SELECT ON public.branches TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_damages TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.branches, public.profiles, public.user_roles, public.vehicles, public.partners, public.reservations, public.vehicle_damages, public.audit_log TO service_role;

-- HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin'));
$$;

CREATE OR REPLACE FUNCTION public.can_operate(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','admin','responsabile_sede','front_desk','manutentore'));
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'front_desk')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read branches" ON public.branches FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin write branches" ON public.branches FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "staff read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "operators write vehicles" ON public.vehicles FOR ALL TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

CREATE POLICY "staff read partners" ON public.partners FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "operators write partners" ON public.partners FOR ALL TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

CREATE POLICY "staff read reservations" ON public.reservations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "operators write reservations" ON public.reservations FOR ALL TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

CREATE POLICY "staff read damages" ON public.vehicle_damages FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "operators write damages" ON public.vehicle_damages FOR ALL TO authenticated USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

CREATE POLICY "staff read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND user_id = auth.uid());

-- SEED
INSERT INTO public.branches (id, code, name, city, address) VALUES
 ('11111111-1111-1111-1111-111111111111','CAG','Cagliari Elmas','Elmas','Via Bacco 11, Z.I. Aeroporto'),
 ('22222222-2222-2222-2222-222222222222','OLB','Olbia Aeroporto','Olbia','Via Ruanda 11'),
 ('33333333-3333-3333-3333-333333333333','LIN','Milano Linate','Milano','Aeroporto di Linate');

INSERT INTO public.vehicles (id, plate, model, category, branch_id, status, daily_rate, mileage, next_service_date) VALUES
 ('a0000000-0000-4000-8000-000000000001','GX412HK','Toyota Aygo X','economy','11111111-1111-1111-1111-111111111111','noleggiato',29,18420,'2026-10-15'),
 ('a0000000-0000-4000-8000-000000000002','GY882LM','Fiat Panda','economy','11111111-1111-1111-1111-111111111111','disponibile',32,34110,'2026-09-30'),
 ('a0000000-0000-4000-8000-000000000003','GT301RC','Citroen C3','economy','22222222-2222-2222-2222-222222222222','disponibile',35,22890,'2026-11-12'),
 ('a0000000-0000-4000-8000-000000000004','GZ765PA','Alfa Romeo Junior','premium','11111111-1111-1111-1111-111111111111','noleggiato',75,9120,'2026-12-01'),
 ('a0000000-0000-4000-8000-000000000005','GW118BX','BMW X4','premium','33333333-3333-3333-3333-333333333333','disponibile',119,41250,'2026-09-05'),
 ('a0000000-0000-4000-8000-000000000006','GV540TS','Citroen SpaceTourer 9 posti','van','22222222-2222-2222-2222-222222222222','manutenzione',89,68740,'2026-09-02'),
 ('a0000000-0000-4000-8000-000000000007','GS907DU','Fiat Ducato 12 m3','business','11111111-1111-1111-1111-111111111111','noleggiato',69,95300,'2026-10-20'),
 ('a0000000-0000-4000-8000-000000000008','GR233TF','Ford Transit 15 m3','business','33333333-3333-3333-3333-333333333333','disponibile',79,73980,'2026-11-28');

INSERT INTO public.partners (id, company_name, vat_number, contact_name, email, phone, discount_pct, status, notes) VALUES
 ('b0000000-0000-4000-8000-000000000001','We Build Tech S.r.l.','04131090922','Marco Serra','logistica@webuildtech.it','+39 070 123456',18,'attivo','Convenzione gruppo, cantieri Sardegna'),
 ('b0000000-0000-4000-8000-000000000002','Sardinia Events S.r.l.','03210450924','Giulia Pinna','mobility@sardiniaevents.it','+39 070 998877',12,'attivo','Van 9 posti per transfer congressi'),
 ('b0000000-0000-4000-8000-000000000003','Nord Logistica S.p.A.','09876543210','Andrea Colombo','fleet@nordlogistica.it','+39 02 445566',10,'in_valutazione','Richiesta 6 furgoni lungo periodo Linate');

INSERT INTO public.reservations (code, vehicle_id, branch_id, partner_id, customer_name, customer_email, customer_phone, date_from, date_to, status, total_amount, notes) VALUES
 ('WR-2608-001','a0000000-0000-4000-8000-000000000001','11111111-1111-1111-1111-111111111111',NULL,'Luca Fadda','luca.fadda@example.com','+39 340 1122334','2026-08-24','2026-08-31','in_corso',203,'Ritiro banco aeroporto'),
 ('WR-2608-002','a0000000-0000-4000-8000-000000000004','11111111-1111-1111-1111-111111111111','b0000000-0000-4000-8000-000000000001','We Build Tech - Marco Serra','logistica@webuildtech.it','+39 070 123456','2026-08-26','2026-09-04','in_corso',675,'Trasferta cantiere Sulcis'),
 ('WR-2608-003','a0000000-0000-4000-8000-000000000007','11111111-1111-1111-1111-111111111111','b0000000-0000-4000-8000-000000000001','We Build Tech - cantiere Elmas','logistica@webuildtech.it','+39 070 123456','2026-08-20','2026-09-20','in_corso',2070,'Lungo periodo 30 giorni'),
 ('WR-2608-004','a0000000-0000-4000-8000-000000000003','22222222-2222-2222-2222-222222222222',NULL,'Sofia Mele','sofia.mele@example.com','+39 333 4455667','2026-08-29','2026-09-02','confermata',140,NULL),
 ('WR-2609-005','a0000000-0000-4000-8000-000000000005','33333333-3333-3333-3333-333333333333',NULL,'Paolo Ferrari','paolo.ferrari@example.com','+39 348 7788990','2026-09-01','2026-09-05','confermata',476,'Cliente business Linate'),
 ('WR-2609-006','a0000000-0000-4000-8000-000000000008','33333333-3333-3333-3333-333333333333','b0000000-0000-4000-8000-000000000003','Nord Logistica - Andrea Colombo','fleet@nordlogistica.it','+39 02 445566','2026-09-03','2026-09-10','confermata',553,'Preventivo convenzione in corso'),
 ('WR-2608-007','a0000000-0000-4000-8000-000000000002','11111111-1111-1111-1111-111111111111',NULL,'Elena Cabras','elena.cabras@example.com','+39 349 5566778','2026-08-18','2026-08-22','chiusa',128,'Riconsegnata senza danni'),
 ('WR-2609-008','a0000000-0000-4000-8000-000000000006','22222222-2222-2222-2222-222222222222','b0000000-0000-4000-8000-000000000002','Sardinia Events - transfer','mobility@sardiniaevents.it','+39 070 998877','2026-09-08','2026-09-11','confermata',267,'Van 9 posti, secondo conducente');

INSERT INTO public.vehicle_damages (vehicle_id, view, pos_x, pos_y, damage_type, severity, description, status) VALUES
 ('a0000000-0000-4000-8000-000000000005','lato_sx',34,62,'graffio','lieve','Graffio portiera anteriore sinistra, rilevato al check-in','aperto'),
 ('a0000000-0000-4000-8000-000000000005','retro',52,71,'ammaccatura','media','Ammaccatura paraurti posteriore centrale','in_riparazione'),
 ('a0000000-0000-4000-8000-000000000006','fronte',68,44,'crepa','grave','Crepa parabrezza lato passeggero, sostituzione programmata','in_riparazione'),
 ('a0000000-0000-4000-8000-000000000001','lato_dx',72,58,'graffio','lieve','Cerchio posteriore destro segnato','chiuso'),
 ('a0000000-0000-4000-8000-000000000007','lato_dx',45,40,'ammaccatura','media','Pannello laterale destro, urto in cantiere','aperto');