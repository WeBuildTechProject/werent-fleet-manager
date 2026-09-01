ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.guard_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.assigned_branch_id := OLD.assigned_branch_id;
  NEW.active := OLD.active;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_admin_fields ON public.profiles;
CREATE TRIGGER trg_profiles_guard_admin_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_admin_fields();

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS receipt_path text,
  ADD COLUMN IF NOT EXISTS receipt_sent_at timestamp with time zone;

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'ricevuta_pagamento';