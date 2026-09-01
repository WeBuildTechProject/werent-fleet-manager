-- Flotta: admin / responsabile_sede / manutentore
DROP POLICY IF EXISTS "operators write vehicles" ON public.vehicles;
CREATE POLICY "fleet staff write vehicles" ON public.vehicles FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede') OR public.has_role(auth.uid(),'manutentore'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede') OR public.has_role(auth.uid(),'manutentore'));

DROP POLICY IF EXISTS "Operatori aggiornano scadenze" ON public.vehicle_expirations;
DROP POLICY IF EXISTS "Operatori creano scadenze" ON public.vehicle_expirations;
CREATE POLICY "Fleet staff aggiorna scadenze" ON public.vehicle_expirations FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede') OR public.has_role(auth.uid(),'manutentore'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede') OR public.has_role(auth.uid(),'manutentore'));
CREATE POLICY "Fleet staff crea scadenze" ON public.vehicle_expirations FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede') OR public.has_role(auth.uid(),'manutentore'));

-- Clienti (blacklist) e partner: admin / responsabile_sede
DROP POLICY IF EXISTS "operators write customers" ON public.customers;
CREATE POLICY "managers write customers" ON public.customers FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede'));

DROP POLICY IF EXISTS "operators write partners" ON public.partners;
CREATE POLICY "managers write partners" ON public.partners FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede'));

-- Extra prenotazione: chi può scrivere prenotazioni (admin / responsabile_sede / front_desk)
DROP POLICY IF EXISTS "operators write reservation extras" ON public.reservation_extras;
CREATE POLICY "booking staff write reservation extras" ON public.reservation_extras FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede') OR public.has_role(auth.uid(),'front_desk'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'responsabile_sede') OR public.has_role(auth.uid(),'front_desk'));