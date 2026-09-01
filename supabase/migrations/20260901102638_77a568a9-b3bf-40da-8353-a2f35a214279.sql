DO $$
DECLARE r record;
DECLARE q text;
DECLARE w text;
BEGIN
  FOR r IN
    SELECT p.polname, n.nspname AS schemaname, c.relname AS tablename, p.polcmd,
           pg_get_expr(p.polqual, p.polrelid, true) AS qual,
           pg_get_expr(p.polwithcheck, p.polrelid, true) AS with_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (coalesce(pg_get_expr(p.polqual, p.polrelid, true), '') LIKE '%is_admin(%'
        OR coalesce(pg_get_expr(p.polqual, p.polrelid, true), '') LIKE '%is_staff(%'
        OR coalesce(pg_get_expr(p.polqual, p.polrelid, true), '') LIKE '%has_role(%'
        OR coalesce(pg_get_expr(p.polqual, p.polrelid, true), '') LIKE '%can_operate(%'
        OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid, true), '') LIKE '%is_admin(%'
        OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid, true), '') LIKE '%is_staff(%'
        OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid, true), '') LIKE '%has_role(%'
        OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid, true), '') LIKE '%can_operate(%')
  LOOP
    q := replace(replace(replace(replace(coalesce(r.qual, ''), 'is_admin(', 'private.is_admin('), 'is_staff(', 'private.is_staff('), 'has_role(', 'private.has_role('), 'can_operate(', 'private.can_operate(');
    w := replace(replace(replace(replace(coalesce(r.with_check, ''), 'is_admin(', 'private.is_admin('), 'is_staff(', 'private.is_staff('), 'has_role(', 'private.has_role('), 'can_operate(', 'private.can_operate(');
    EXECUTE format('DROP POLICY %I ON %I.%I', r.polname, r.schemaname, r.tablename);
    IF r.polcmd = 'r' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (%s)', r.polname, r.schemaname, r.tablename, q);
    ELSIF r.polcmd = 'a' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (%s)', r.polname, r.schemaname, r.tablename, w);
    ELSIF r.polcmd = 'w' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', r.polname, r.schemaname, r.tablename, q, w);
    ELSIF r.polcmd = 'd' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE TO authenticated USING (%s)', r.polname, r.schemaname, r.tablename, q);
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)', r.polname, r.schemaname, r.tablename, q, w);
    END IF;
  END LOOP;
END $$;