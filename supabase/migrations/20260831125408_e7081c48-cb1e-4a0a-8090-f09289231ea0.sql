create policy "cron_tokens_service_role_only"
  on internal.cron_tokens for all
  to service_role
  using (true)
  with check (true);