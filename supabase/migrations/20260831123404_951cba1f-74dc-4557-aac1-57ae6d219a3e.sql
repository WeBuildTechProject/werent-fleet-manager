CREATE TABLE public.cargos_tabelle_codifica (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabella_id smallint NOT NULL,
  codice text NOT NULL,
  descrizione text NOT NULL DEFAULT '',
  raw text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tabella_id, codice)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargos_tabelle_codifica TO authenticated;
GRANT ALL ON public.cargos_tabelle_codifica TO service_role;
ALTER TABLE public.cargos_tabelle_codifica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cargos_tabelle_select_staff" ON public.cargos_tabelle_codifica
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "cargos_tabelle_write_admin" ON public.cargos_tabelle_codifica
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_cargos_tabelle_updated BEFORE UPDATE ON public.cargos_tabelle_codifica
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cargos_transmissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  payload text NOT NULL DEFAULT '',
  stato text NOT NULL DEFAULT 'in_attesa',
  transaction_id text,
  errore jsonb,
  tentativi integer NOT NULL DEFAULT 0,
  ambiente text NOT NULL DEFAULT 'mock',
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reservation_id)
);

CREATE INDEX cargos_transmissions_stato_idx ON public.cargos_transmissions (stato, next_attempt_at);

GRANT SELECT, INSERT, UPDATE ON public.cargos_transmissions TO authenticated;
GRANT ALL ON public.cargos_transmissions TO service_role;
ALTER TABLE public.cargos_transmissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cargos_tx_select_staff" ON public.cargos_transmissions
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "cargos_tx_insert_admin" ON public.cargos_transmissions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "cargos_tx_update_admin" ON public.cargos_transmissions
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_cargos_tx_updated BEFORE UPDATE ON public.cargos_transmissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();