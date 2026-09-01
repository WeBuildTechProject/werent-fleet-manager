-- 1. Anagrafica clienti: collegamento account + consensi
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consenso_marketing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consenso_profilazione boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consenso_privacy_at timestamptz;

-- 2. Backfill: crea le schede mancanti dallo storico prenotazioni (dedup per email)
INSERT INTO public.customers (full_name, email, phone, fiscal_code, driving_license_number, address)
SELECT DISTINCT ON (lower(r.customer_email))
  COALESCE(r.customer_name, ''), lower(r.customer_email), COALESCE(r.customer_phone, ''), '', '', ''
FROM public.reservations r
WHERE r.customer_email <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.customers c WHERE lower(c.email) = lower(r.customer_email)
  )
ORDER BY lower(r.customer_email), r.created_at DESC;

UPDATE public.reservations r
SET customer_id = c.id
FROM public.customers c
WHERE r.customer_id IS NULL AND lower(c.email) = lower(r.customer_email);

-- Consensi e data privacy dedotti dallo storico
UPDATE public.customers c
SET consenso_marketing = s.consenso_marketing,
    consenso_profilazione = s.consenso_profilazione,
    consenso_privacy_at = COALESCE(c.consenso_privacy_at, s.privacy_at)
FROM (
  SELECT DISTINCT ON (customer_id) customer_id, consenso_marketing, consenso_profilazione,
         created_at AS privacy_at
  FROM public.reservations
  WHERE customer_id IS NOT NULL
  ORDER BY customer_id, created_at DESC
) s
WHERE c.id = s.customer_id;

-- 3. Identità cliente corrente (separata da is_staff/is_admin/can_operate)
CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.customers
  WHERE auth_user_id = auth.uid()
  ORDER BY created_at
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_customer_id() TO authenticated;

-- 4. Chiudi le vecchie policy di scrittura pubblica (le richieste online passano dal server)
DROP POLICY IF EXISTS "public create customer" ON public.customers;
DROP POLICY IF EXISTS "public request reservation" ON public.reservations;

-- 5. Policy dedicate al portale cliente
CREATE POLICY "customer read own profile" ON public.customers
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "customer update own consents" ON public.customers
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "customer read own reservations" ON public.reservations
  FOR SELECT TO authenticated
  USING (customer_id IS NOT NULL AND customer_id = public.current_customer_id());

CREATE POLICY "customer read own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = invoices.reservation_id
      AND r.customer_id IS NOT NULL
      AND r.customer_id = public.current_customer_id()
  ));

-- 6. Un cliente può cambiare solo i consensi: ogni altra colonna resta immutabile
CREATE OR REPLACE FUNCTION public.guard_customer_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF OLD.auth_user_id IS NULL OR OLD.auth_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Modifica non consentita.';
  END IF;
  NEW.id := OLD.id;
  NEW.full_name := OLD.full_name;
  NEW.email := OLD.email;
  NEW.phone := OLD.phone;
  NEW.fiscal_code := OLD.fiscal_code;
  NEW.driving_license_number := OLD.driving_license_number;
  NEW.driving_license_expiry := OLD.driving_license_expiry;
  NEW.birth_date := OLD.birth_date;
  NEW.address := OLD.address;
  NEW.blacklisted := OLD.blacklisted;
  NEW.blacklist_reason := OLD.blacklist_reason;
  NEW.auth_user_id := OLD.auth_user_id;
  NEW.consenso_privacy_at := OLD.consenso_privacy_at;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_self_update_guard ON public.customers;
CREATE TRIGGER trg_customers_self_update_guard
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.guard_customer_self_update();

-- 7. Rate limit sulle richieste di magic link (solo lato server)
CREATE TABLE IF NOT EXISTS public.customer_login_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.customer_login_requests TO service_role;
ALTER TABLE public.customer_login_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read login requests" ON public.customer_login_requests
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_customer_login_requests_email
  ON public.customer_login_requests (lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_auth_user ON public.customers (auth_user_id);

-- 8. I nuovi account del portale clienti non devono ricevere ruoli staff
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_customer boolean;
BEGIN
  SELECT COALESCE(NEW.raw_user_meta_data->>'portal', '') = 'customer'
      OR EXISTS (SELECT 1 FROM public.customers c WHERE lower(c.email) = lower(COALESCE(NEW.email, '')))
    INTO is_customer;

  IF is_customer THEN
    UPDATE public.customers
      SET auth_user_id = NEW.id
      WHERE lower(email) = lower(COALESCE(NEW.email, '')) AND auth_user_id IS NULL;
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'front_desk')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;