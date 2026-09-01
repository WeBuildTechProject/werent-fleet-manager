DROP TABLE IF EXISTS public._rls_test_results;
DROP TABLE IF EXISTS public._rls_probe;

DROP POLICY IF EXISTS "staff read rate plans" ON public.rate_plans;
CREATE POLICY "staff read rate plans" ON public.rate_plans FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR active);

DROP POLICY IF EXISTS "staff read extras" ON public.extras;
CREATE POLICY "staff read extras" ON public.extras FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR active);

DROP POLICY IF EXISTS "staff read coupons" ON public.coupons;
CREATE POLICY "staff read coupons" ON public.coupons FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR (active AND valid_from <= CURRENT_DATE AND valid_to >= CURRENT_DATE));

DROP POLICY IF EXISTS "staff read insurance packages" ON public.insurance_packages;
CREATE POLICY "staff read insurance packages" ON public.insurance_packages FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR active);

DROP POLICY IF EXISTS "staff read insurance specs" ON public.insurance_specs;
CREATE POLICY "staff read insurance specs" ON public.insurance_specs FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR active);