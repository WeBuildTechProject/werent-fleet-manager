-- 1. Impostazioni pagamento per categoria
ALTER TABLE public.vehicle_categories
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'pagamento_completo',
  ADD COLUMN IF NOT EXISTS deposit_pct numeric NOT NULL DEFAULT 30;

-- 2. Pagamenti
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  provider_payment_id text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL DEFAULT 'pending',
  type text NOT NULL DEFAULT 'pagamento_completo',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payments_provider_payment_id_key
  ON public.payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
CREATE INDEX payments_reservation_id_idx ON public.payments (reservation_id);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read payments" ON public.payments
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "operators insert payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (public.can_operate(auth.uid()));
CREATE POLICY "operators update payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.can_operate(auth.uid())) WITH CHECK (public.can_operate(auth.uid()));

CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Fatture / ricevute
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  numero_fattura text NOT NULL UNIQUE,
  anno integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  progressivo integer NOT NULL DEFAULT 1,
  data_emissione date NOT NULL DEFAULT CURRENT_DATE,
  imponibile numeric NOT NULL DEFAULT 0,
  iva numeric NOT NULL DEFAULT 0,
  totale numeric NOT NULL DEFAULT 0,
  stato text NOT NULL DEFAULT 'bozza',
  pdf_url text,
  cliente_denominazione text NOT NULL DEFAULT '',
  cliente_piva_cf text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX invoices_anno_progressivo_key ON public.invoices (anno, progressivo);
CREATE INDEX invoices_reservation_id_idx ON public.invoices (reservation_id);

GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read invoices" ON public.invoices
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "accounting insert invoices" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'contabilita')
  );
CREATE POLICY "accounting update invoices" ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'contabilita'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'contabilita'));

CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Numerazione progressiva annuale
CREATE OR REPLACE FUNCTION public.next_invoice_progressivo(_anno integer)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(progressivo), 0) + 1 FROM public.invoices WHERE anno = _anno;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_progressivo(integer) TO authenticated, service_role;