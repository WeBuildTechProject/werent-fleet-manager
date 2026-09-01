CREATE OR REPLACE FUNCTION public.guard_customer_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Contesto server/trigger (nessun utente autenticato) oppure staff: nessun vincolo.
  -- Le richieste anonime non hanno alcuna policy di UPDATE su customers, quindi
  -- non possono arrivare fin qui.
  IF auth.uid() IS NULL OR public.is_staff(auth.uid()) THEN
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

REVOKE ALL ON FUNCTION public.guard_customer_self_update() FROM PUBLIC, anon, authenticated;