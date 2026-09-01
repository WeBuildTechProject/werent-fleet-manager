REVOKE ALL ON FUNCTION public.current_customer_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_customer_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.guard_customer_self_update() FROM PUBLIC, anon, authenticated;