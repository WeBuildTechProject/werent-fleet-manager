CREATE TYPE public.notification_type AS ENUM ('scadenza_veicolo','fine_noleggio_imminente','documento_in_scadenza','conferma_prenotazione','altro');
CREATE TYPE public.notification_channel AS ENUM ('email','whatsapp');
CREATE TYPE public.notification_status AS ENUM ('in_coda','inviata','fallita');

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.notification_type NOT NULL,
  canale public.notification_channel NOT NULL DEFAULT 'email',
  destinatario_email text,
  destinatario_telefono text,
  riferimento_tipo text,
  riferimento_id text,
  dedupe_key text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  stato public.notification_status NOT NULL DEFAULT 'in_coda',
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  errore text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE UNIQUE INDEX notifications_dedupe_key_idx ON public.notifications (dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX notifications_queue_idx ON public.notifications (stato, scheduled_for);
CREATE INDEX notifications_riferimento_idx ON public.notifications (riferimento_tipo, riferimento_id);

CREATE TRIGGER trg_notifications_updated BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value, description) VALUES
  ('notifiche_email_staff', '', 'Elenco email (separate da virgola) che ricevono gli avvisi di scadenza flotta. Se vuoto si usa l''email del responsabile di sede.'),
  ('notifiche_email_mittente', 'We Rent <noreply@werentsrl.com>', 'Mittente usato per le email di servizio.')
ON CONFLICT (key) DO NOTHING;