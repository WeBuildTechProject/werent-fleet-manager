DROP POLICY IF EXISTS "Ruoli operativi leggono documenti prenotazione" ON public.documenti_prenotazione;
CREATE POLICY "Ruoli operativi leggono documenti prenotazione"
  ON public.documenti_prenotazione FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('super_admin', 'admin', 'responsabile_sede', 'front_desk')
    )
  );

DROP POLICY IF EXISTS "Ruoli operativi leggono documenti clienti" ON storage.objects;
CREATE POLICY "Ruoli operativi leggono documenti clienti"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documenti-clienti'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('super_admin', 'admin', 'responsabile_sede', 'front_desk')
    )
  );

REVOKE ALL ON FUNCTION public.can_view_customer_documents(uuid) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION public.can_view_customer_documents(uuid);