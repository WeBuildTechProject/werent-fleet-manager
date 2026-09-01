revoke execute on function public.can_operate(uuid) from authenticated;
revoke execute on function public.cron_token(text) from authenticated;
revoke execute on function public.current_customer_id() from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.guard_customer_self_update() from authenticated;