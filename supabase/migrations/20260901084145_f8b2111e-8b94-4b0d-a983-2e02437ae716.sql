ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reservations.is_demo IS
  'true = prenotazione dimostrativa/di test: esclusa in modo strutturale da qualunque comunicazione CaRGOS (cron e invio manuale), indipendentemente da CARGOS_MODE.';

-- Tutte le prenotazioni esistenti provengono dal popolamento demo (Lotto 15) o
-- da test manuali: vengono marcate come demo per evitare che, all'attivazione
-- dell'ambiente reale, vengano trasmesse come contratti veri.
UPDATE public.reservations SET is_demo = true WHERE is_demo = false;

CREATE INDEX IF NOT EXISTS reservations_is_demo_idx ON public.reservations (is_demo);