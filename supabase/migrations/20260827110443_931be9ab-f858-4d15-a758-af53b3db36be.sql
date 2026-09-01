-- 1. Flag attivo/storico su sedi e categorie
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.vehicle_categories ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 2. Assicurazioni a pacchetti
CREATE TABLE public.insurance_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  label_it text NOT NULL,
  valore_default numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insurance_specs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_specs TO authenticated;
GRANT ALL ON public.insurance_specs TO service_role;
ALTER TABLE public.insurance_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active insurance specs" ON public.insurance_specs FOR SELECT TO anon USING (active);
CREATE POLICY "staff read insurance specs" ON public.insurance_specs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write insurance specs" ON public.insurance_specs FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_insurance_specs_updated BEFORE UPDATE ON public.insurance_specs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.insurance_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descrizione text,
  category_id uuid REFERENCES public.vehicle_categories(id) ON DELETE CASCADE,
  prezzo_giorno numeric NOT NULL DEFAULT 0,
  franchigia_residua numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insurance_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_packages TO authenticated;
GRANT ALL ON public.insurance_packages TO service_role;
ALTER TABLE public.insurance_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active insurance packages" ON public.insurance_packages FOR SELECT TO anon USING (active);
CREATE POLICY "staff read insurance packages" ON public.insurance_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write insurance packages" ON public.insurance_packages FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_insurance_packages_updated BEFORE UPDATE ON public.insurance_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.insurance_package_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_package_id uuid NOT NULL REFERENCES public.insurance_packages(id) ON DELETE CASCADE,
  insurance_spec_id uuid NOT NULL REFERENCES public.insurance_specs(id) ON DELETE CASCADE,
  valore_override numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (insurance_package_id, insurance_spec_id)
);
GRANT SELECT ON public.insurance_package_components TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_package_components TO authenticated;
GRANT ALL ON public.insurance_package_components TO service_role;
ALTER TABLE public.insurance_package_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read insurance package components" ON public.insurance_package_components FOR SELECT TO anon USING (true);
CREATE POLICY "staff read insurance package components" ON public.insurance_package_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write insurance package components" ON public.insurance_package_components FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS insurance_package_id uuid REFERENCES public.insurance_packages(id),
  ADD COLUMN IF NOT EXISTS insurance_amount numeric NOT NULL DEFAULT 0;

-- 3. Tassonomia danni
CREATE TABLE public.damage_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label_it text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.damage_types TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.damage_types TO authenticated;
GRANT ALL ON public.damage_types TO service_role;
ALTER TABLE public.damage_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read damage types" ON public.damage_types FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "admin write damage types" ON public.damage_types FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.damage_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_type_id uuid NOT NULL REFERENCES public.damage_types(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  label_it text NOT NULL,
  default_view text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.damage_components TO authenticated;
GRANT ALL ON public.damage_components TO service_role;
ALTER TABLE public.damage_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read damage components" ON public.damage_components FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "admin write damage components" ON public.damage_components FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.damage_severities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label_it text NOT NULL,
  livello integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.damage_severities TO authenticated;
GRANT ALL ON public.damage_severities TO service_role;
ALTER TABLE public.damage_severities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read damage severities" ON public.damage_severities FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "admin write damage severities" ON public.damage_severities FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.damage_price_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.vehicle_categories(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.damage_components(id) ON DELETE CASCADE,
  severity_id uuid NOT NULL REFERENCES public.damage_severities(id) ON DELETE CASCADE,
  prezzo_min numeric NOT NULL DEFAULT 0,
  prezzo_consigliato numeric NOT NULL DEFAULT 0,
  prezzo_max numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, component_id, severity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.damage_price_config TO authenticated;
GRANT ALL ON public.damage_price_config TO service_role;
ALTER TABLE public.damage_price_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read damage price config" ON public.damage_price_config FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "admin write damage price config" ON public.damage_price_config FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_damage_price_config_updated BEFORE UPDATE ON public.damage_price_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.vehicle_damages
  ADD COLUMN IF NOT EXISTS component_id uuid REFERENCES public.damage_components(id),
  ADD COLUMN IF NOT EXISTS severity_id uuid REFERENCES public.damage_severities(id),
  ADD COLUMN IF NOT EXISTS charge_note text;

-- 4. Dati iniziali: componenti assicurativi
INSERT INTO public.insurance_specs (tipo, label_it, valore_default) VALUES
  ('franchigia_danni', 'Franchigia danni', 1200),
  ('franchigia_furto', 'Franchigia furto e incendio', 1500),
  ('deposito', 'Deposito cauzionale', 500),
  ('glass_tyre', 'Cristalli, pneumatici e cerchi', 0),
  ('assistenza_stradale', 'Assistenza stradale 24/7', 0),
  ('guidatore_aggiuntivo', 'Guidatore aggiuntivo incluso', 0);

-- 5. Pacchetti assicurativi (migrazione della copertura Kasko oggi modellata come extra)
INSERT INTO public.insurance_packages (nome, descrizione, category_id, prezzo_giorno, franchigia_residua, sort_order, active) VALUES
  ('Silver', 'Copertura base inclusa nel noleggio: RCA e assistenza stradale, franchigia piena.', NULL, 0, 1200, 1, true),
  ('Gold', 'Ex "Copertura Kasko full": franchigia danni ridotta, cristalli e pneumatici inclusi.', NULL, 14, 300, 2, true),
  ('Platinum', 'Franchigia azzerata, furto e incendio inclusi, guidatore aggiuntivo compreso.', NULL, 24, 0, 3, true);

INSERT INTO public.insurance_package_components (insurance_package_id, insurance_spec_id, valore_override)
SELECT p.id, s.id,
  CASE
    WHEN p.nome = 'Silver' AND s.tipo = 'franchigia_danni' THEN 1200
    WHEN p.nome = 'Silver' AND s.tipo = 'franchigia_furto' THEN 1500
    WHEN p.nome = 'Silver' AND s.tipo = 'deposito' THEN 500
    WHEN p.nome = 'Gold' AND s.tipo = 'franchigia_danni' THEN 300
    WHEN p.nome = 'Gold' AND s.tipo = 'franchigia_furto' THEN 500
    WHEN p.nome = 'Gold' AND s.tipo = 'deposito' THEN 250
    WHEN p.nome = 'Platinum' THEN 0
    ELSE NULL
  END
FROM public.insurance_packages p
CROSS JOIN public.insurance_specs s
WHERE (p.nome = 'Silver' AND s.tipo IN ('franchigia_danni','franchigia_furto','deposito','assistenza_stradale'))
   OR (p.nome = 'Gold' AND s.tipo IN ('franchigia_danni','franchigia_furto','deposito','assistenza_stradale','glass_tyre'))
   OR (p.nome = 'Platinum' AND s.tipo IN ('franchigia_danni','franchigia_furto','deposito','assistenza_stradale','glass_tyre','guidatore_aggiuntivo'));

-- L'assicurazione non è più un extra: resta a storico, disattivata.
UPDATE public.extras SET active = false WHERE code = 'KASKO';

-- 6. Tassonomia danni
INSERT INTO public.damage_types (code, label_it, sort_order) VALUES
  ('carrozzeria', 'Carrozzeria', 1),
  ('vetri', 'Vetri', 2),
  ('pneumatici_cerchi', 'Pneumatici e cerchi', 3),
  ('interni', 'Interni', 4),
  ('meccanica', 'Meccanica', 5);

INSERT INTO public.damage_severities (code, label_it, livello) VALUES
  ('graffio', 'Graffio', 1),
  ('ammaccatura', 'Ammaccatura', 2),
  ('rottura', 'Rottura', 3),
  ('compromesso', 'Componente compromesso', 4);

INSERT INTO public.damage_components (damage_type_id, code, label_it, default_view, sort_order)
SELECT t.id, v.code, v.label_it, v.default_view, v.sort_order
FROM (VALUES
  ('carrozzeria','paraurti_ant','Paraurti anteriore','fronte',1),
  ('carrozzeria','paraurti_post','Paraurti posteriore','retro',2),
  ('carrozzeria','cofano','Cofano motore','fronte',3),
  ('carrozzeria','portellone','Portellone posteriore','retro',4),
  ('carrozzeria','tetto','Tetto','fronte',5),
  ('carrozzeria','parafango_ant_sx','Parafango anteriore SX','lato_sx',6),
  ('carrozzeria','parafango_ant_dx','Parafango anteriore DX','lato_dx',7),
  ('carrozzeria','parafango_post_sx','Parafango posteriore SX','lato_sx',8),
  ('carrozzeria','parafango_post_dx','Parafango posteriore DX','lato_dx',9),
  ('carrozzeria','portiera_ant_sx','Portiera anteriore SX','lato_sx',10),
  ('carrozzeria','portiera_ant_dx','Portiera anteriore DX','lato_dx',11),
  ('carrozzeria','portiera_post_sx','Portiera posteriore SX','lato_sx',12),
  ('carrozzeria','portiera_post_dx','Portiera posteriore DX','lato_dx',13),
  ('carrozzeria','minigonna_sx','Minigonna SX','lato_sx',14),
  ('carrozzeria','minigonna_dx','Minigonna DX','lato_dx',15),
  ('carrozzeria','specchietto_sx','Specchietto retrovisore SX','lato_sx',16),
  ('carrozzeria','specchietto_dx','Specchietto retrovisore DX','lato_dx',17),
  ('carrozzeria','maniglia_porta','Maniglia portiera','lato_sx',18),
  ('carrozzeria','faro_ant_sx','Faro anteriore SX','fronte',19),
  ('carrozzeria','faro_ant_dx','Faro anteriore DX','fronte',20),
  ('carrozzeria','fanale_post_sx','Fanale posteriore SX','retro',21),
  ('carrozzeria','fanale_post_dx','Fanale posteriore DX','retro',22),
  ('carrozzeria','griglia_ant','Griglia anteriore','fronte',23),
  ('carrozzeria','targa_supporto','Portatarga','retro',24),
  ('vetri','parabrezza','Parabrezza','fronte',25),
  ('vetri','lunotto','Lunotto posteriore','retro',26),
  ('vetri','vetro_porta_sx','Vetro portiera SX','lato_sx',27),
  ('vetri','vetro_porta_dx','Vetro portiera DX','lato_dx',28),
  ('vetri','vetro_specchietto','Specchio retrovisore (vetro)','lato_sx',29),
  ('pneumatici_cerchi','cerchio_ant_sx','Cerchio anteriore SX','lato_sx',30),
  ('pneumatici_cerchi','cerchio_ant_dx','Cerchio anteriore DX','lato_dx',31),
  ('pneumatici_cerchi','cerchio_post_sx','Cerchio posteriore SX','lato_sx',32),
  ('pneumatici_cerchi','cerchio_post_dx','Cerchio posteriore DX','lato_dx',33),
  ('pneumatici_cerchi','pneumatico_ant_sx','Pneumatico anteriore SX','lato_sx',34),
  ('pneumatici_cerchi','pneumatico_ant_dx','Pneumatico anteriore DX','lato_dx',35),
  ('pneumatici_cerchi','pneumatico_post_sx','Pneumatico posteriore SX','lato_sx',36),
  ('pneumatici_cerchi','pneumatico_post_dx','Pneumatico posteriore DX','lato_dx',37),
  ('pneumatici_cerchi','ruota_scorta','Ruota di scorta / kit','retro',38),
  ('interni','sedile_ant','Sedile anteriore','fronte',39),
  ('interni','sedile_post','Sedile posteriore','retro',40),
  ('interni','rivestimenti','Rivestimenti e tappezzeria','fronte',41),
  ('interni','plancia','Plancia e cruscotto','fronte',42),
  ('interni','volante','Volante','fronte',43),
  ('interni','tappetini','Tappetini','fronte',44),
  ('interni','infotainment','Sistema infotainment','fronte',45),
  ('interni','chiave','Chiave / telecomando','fronte',46),
  ('meccanica','frizione','Frizione','fronte',47),
  ('meccanica','cambio','Cambio','fronte',48),
  ('meccanica','freni','Impianto frenante','fronte',49),
  ('meccanica','sospensioni','Sospensioni','lato_sx',50),
  ('meccanica','scarico','Impianto di scarico','retro',51),
  ('meccanica','sottoscocca','Sottoscocca','retro',52)
) AS v(type_code, code, label_it, default_view, sort_order)
JOIN public.damage_types t ON t.code = v.type_code;

-- 7. Prezzario danni precompilato per ogni categoria veicolo
INSERT INTO public.damage_price_config (category_id, component_id, severity_id, prezzo_min, prezzo_consigliato, prezzo_max)
SELECT c.id, comp.id, sev.id,
  ROUND(base.amount * mult.factor * sev_f.factor * 0.7),
  ROUND(base.amount * mult.factor * sev_f.factor),
  ROUND(base.amount * mult.factor * sev_f.factor * 1.6)
FROM public.vehicle_categories c
JOIN public.damage_components comp ON true
JOIN public.damage_types t ON t.id = comp.damage_type_id
JOIN public.damage_severities sev ON true
JOIN (VALUES
  ('carrozzeria', 120::numeric),
  ('vetri', 180::numeric),
  ('pneumatici_cerchi', 110::numeric),
  ('interni', 90::numeric),
  ('meccanica', 250::numeric)
) AS base(type_code, amount) ON base.type_code = t.code
JOIN (VALUES
  ('economy', 1.0::numeric),
  ('compact', 1.1::numeric),
  ('suv', 1.4::numeric),
  ('premium', 1.8::numeric),
  ('van', 1.3::numeric),
  ('commerciale', 1.3::numeric)
) AS mult(macro_class, factor) ON mult.macro_class = c.macro_class
JOIN (VALUES
  ('graffio', 0.5::numeric),
  ('ammaccatura', 1.0::numeric),
  ('rottura', 1.8::numeric),
  ('compromesso', 2.6::numeric)
) AS sev_f(code, factor) ON sev_f.code = sev.code
ON CONFLICT (category_id, component_id, severity_id) DO NOTHING;