-- Funzione interna, non eseguibile direttamente dai client
CREATE OR REPLACE FUNCTION private.current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.customers
  WHERE auth_user_id = auth.uid()
  ORDER BY created_at
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.current_customer_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_customer_id() TO PUBLIC;

-- Policy riscritte con riferimento interno
DROP POLICY IF EXISTS "customer read own invoices" ON public.invoices;
CREATE POLICY "customer read own invoices"
ON public.invoices FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.reservations r
  WHERE r.id = invoices.reservation_id
    AND r.customer_id IS NOT NULL
    AND r.customer_id = private.current_customer_id()
));

DROP POLICY IF EXISTS "customer read own reservations" ON public.reservations;
CREATE POLICY "customer read own reservations"
ON public.reservations FOR SELECT TO authenticated
USING (customer_id IS NOT NULL AND customer_id = private.current_customer_id());

DROP POLICY IF EXISTS "Cliente legge i documenti delle proprie prenotazioni" ON public.documenti_prenotazione;
CREATE POLICY "Cliente legge i documenti delle proprie prenotazioni"
ON public.documenti_prenotazione FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.reservations r
  WHERE r.id = documenti_prenotazione.reservation_id
    AND r.customer_id IS NOT NULL
    AND r.customer_id = private.current_customer_id()
));