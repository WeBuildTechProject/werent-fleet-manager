ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS verbale_consegna_url text,
  ADD COLUMN IF NOT EXISTS verbale_rientro_url text;

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'verbale_consegna';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'verbale_rientro';