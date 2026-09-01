revoke execute on function public.has_role(uuid, public.app_role) from authenticated;
revoke execute on function public.is_admin(uuid) from authenticated;
revoke execute on function public.is_staff(uuid) from authenticated;