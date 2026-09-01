CREATE OR REPLACE FUNCTION public.can_view_customer_documents(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'responsabile_sede', 'front_desk')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_customer_documents(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_customer_documents(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_customer_documents(uuid) TO service_role;

DROP POLICY IF EXISTS "Staff legge i documenti prenotazione" ON public.documenti_prenotazione;
CREATE POLICY "Ruoli operativi leggono documenti prenotazione"
  ON public.documenti_prenotazione FOR SELECT TO authenticated
  USING (public.can_view_customer_documents(auth.uid()));

DROP POLICY IF EXISTS "Staff legge documenti clienti" ON storage.objects;
CREATE POLICY "Ruoli operativi leggono documenti clienti"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documenti-clienti'
    AND public.can_view_customer_documents(auth.uid())
  );