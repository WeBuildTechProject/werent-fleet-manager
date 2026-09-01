CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  origine text NOT NULL DEFAULT 'segnalazione_manuale',
  origine_id uuid,
  descrizione text NOT NULL DEFAULT '',
  data_segnalazione date NOT NULL DEFAULT CURRENT_DATE,
  stato text NOT NULL DEFAULT 'aperta',
  fermo_dal date,
  fermo_al date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_requests TO authenticated;
GRANT ALL ON public.maintenance_requests TO service_role;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read maintenance requests" ON public.maintenance_requests
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "fleet write maintenance requests" ON public.maintenance_requests
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'responsabile_sede') OR public.has_role(auth.uid(), 'manutentore'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'responsabile_sede') OR public.has_role(auth.uid(), 'manutentore'));

CREATE TABLE public.maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  officina text NOT NULL DEFAULT '',
  data_apertura date NOT NULL DEFAULT CURRENT_DATE,
  stato text NOT NULL DEFAULT 'aperta',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
GRANT ALL ON public.maintenance_records TO service_role;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read maintenance records" ON public.maintenance_records
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "fleet write maintenance records" ON public.maintenance_records
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'responsabile_sede') OR public.has_role(auth.uid(), 'manutentore'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'responsabile_sede') OR public.has_role(auth.uid(), 'manutentore'));

CREATE TABLE public.maintenance_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.maintenance_records(id) ON DELETE CASCADE,
  descrizione_lavoro text NOT NULL DEFAULT '',
  importo numeric NOT NULL DEFAULT 0,
  stato_riga text NOT NULL DEFAULT 'proposta',
  data_completamento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_order_lines TO authenticated;
GRANT ALL ON public.maintenance_order_lines TO service_role;
ALTER TABLE public.maintenance_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read maintenance lines" ON public.maintenance_order_lines
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "fleet write maintenance lines" ON public.maintenance_order_lines
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'responsabile_sede') OR public.has_role(auth.uid(), 'manutentore'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'responsabile_sede') OR public.has_role(auth.uid(), 'manutentore'));

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admin write settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.app_settings (key, value, description) VALUES
  ('damage_maintenance_threshold', '150', 'Soglia in euro oltre la quale un danno suggerisce una richiesta di manutenzione');

CREATE INDEX idx_maintenance_requests_vehicle ON public.maintenance_requests(vehicle_id);
CREATE INDEX idx_maintenance_records_request ON public.maintenance_records(request_id);
CREATE INDEX idx_maintenance_lines_record ON public.maintenance_order_lines(record_id);

CREATE TRIGGER trg_maintenance_requests_updated BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_maintenance_records_updated BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_maintenance_lines_updated BEFORE UPDATE ON public.maintenance_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_app_settings_updated BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();