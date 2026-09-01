DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual,'') ~ 'public\\.(has_role|is_admin|is_staff|can_operate)'
        OR coalesce(with_check,'') ~ 'public\\.(has_role|is_admin|is_staff|can_operate)')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    EXECUTE format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s USING (%s)%s',
      r.policyname, r.schemaname, r.tablename,
      CASE WHEN r.qual IS NOT NULL AND r.with_check IS NOT NULL THEN 'ALL'
           WHEN r.with_check IS NOT NULL THEN 'INSERT'
           ELSE 'SELECT' END,
      'authenticated',
      regexp_replace(coalesce(r.qual, r.with_check), 'public\\.(has_role|is_admin|is_staff|can_operate)', 'private.\\1', 'g'),
      CASE WHEN r.with_check IS NULL THEN '' ELSE format(' WITH CHECK (%s)', regexp_replace(r.with_check, 'public\\.(has_role|is_admin|is_staff|can_operate)', 'private.\\1', 'g')) END);
  END LOOP;
END $$;