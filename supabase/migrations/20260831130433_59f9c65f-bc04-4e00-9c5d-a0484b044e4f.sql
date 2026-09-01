CREATE TABLE public.documenti_prenotazione (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('documento_identita','tessera_sanitaria','patente','carta_pagamento')),
  storage_path text NOT NULL UNIQUE,
  caricato_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, tipo)
);

GRANT SELECT ON public.documenti_prenotazione TO authenticated;
GRANT ALL ON public.documenti_prenotazione TO service_role;

ALTER TABLE public.documenti_prenotazione ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff legge i documenti prenotazione"
  ON public.documenti_prenotazione FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Cliente legge i documenti delle proprie prenotazioni"
  ON public.documenti_prenotazione FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = documenti_prenotazione.reservation_id
      AND r.customer_id = public.current_customer_id()
  ));

CREATE INDEX idx_documenti_prenotazione_reservation ON public.documenti_prenotazione(reservation_id);

-- Storage privato: solo lo staff autenticato può leggere gli oggetti del bucket.
CREATE POLICY "Staff legge documenti clienti"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documenti-clienti' AND public.is_staff(auth.uid()));