ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS checkout_data_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_data_confirmed_at timestamptz;