ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS fuel_capacity_liters numeric NOT NULL DEFAULT 50;

ALTER TABLE public.vehicle_categories
  ADD COLUMN IF NOT EXISTS extra_km_rate numeric NOT NULL DEFAULT 0.35,
  ADD COLUMN IF NOT EXISTS fuel_price_per_liter numeric NOT NULL DEFAULT 1.95,
  ADD COLUMN IF NOT EXISTS included_km_per_day numeric NOT NULL DEFAULT 200;

ALTER TABLE public.rate_plans
  ADD COLUMN IF NOT EXISTS included_km_per_day numeric,
  ADD COLUMN IF NOT EXISTS extra_km_rate numeric;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS checkout_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_km integer,
  ADD COLUMN IF NOT EXISTS checkout_fuel_liters numeric,
  ADD COLUMN IF NOT EXISTS checkout_equipment text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_km integer,
  ADD COLUMN IF NOT EXISTS checkin_fuel_liters numeric,
  ADD COLUMN IF NOT EXISTS checkin_signature_data_url text,
  ADD COLUMN IF NOT EXISTS checkin_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS extra_km_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fuel_penalty_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS damage_charge_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consenso_privacy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consenso_marketing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consenso_profilazione boolean NOT NULL DEFAULT false;

ALTER TABLE public.vehicle_damages
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'segnalato',
  ADD COLUMN IF NOT EXISTS charge_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS out_of_service boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.vehicle_expirations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  data_scadenza date,
  km_scadenza integer,
  priorita text NOT NULL DEFAULT 'media',
  eseguita boolean NOT NULL DEFAULT false,
  data_esecuzione date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_expirations TO authenticated;
GRANT ALL ON public.vehicle_expirations TO service_role;

ALTER TABLE public.vehicle_expirations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff legge le scadenze" ON public.vehicle_expirations
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Operatori creano scadenze" ON public.vehicle_expirations
  FOR INSERT TO authenticated WITH CHECK (public.can_operate(auth.uid()));

CREATE POLICY "Operatori aggiornano scadenze" ON public.vehicle_expirations
  FOR UPDATE TO authenticated USING (public.can_operate(auth.uid()))
  WITH CHECK (public.can_operate(auth.uid()));

CREATE POLICY "Admin cancellano scadenze" ON public.vehicle_expirations
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_vehicle_expirations_updated BEFORE UPDATE ON public.vehicle_expirations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vehicle_expirations_vehicle ON public.vehicle_expirations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expirations_pending ON public.vehicle_expirations(eseguita, data_scadenza);