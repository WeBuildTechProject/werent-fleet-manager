CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_customer boolean;
BEGIN
  is_customer := COALESCE(NEW.raw_user_meta_data->>'portal', '') = 'customer';

  IF is_customer THEN
    UPDATE public.customers
      SET auth_user_id = NEW.id
      WHERE lower(email) = lower(COALESCE(NEW.email, '')) AND auth_user_id IS NULL;
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'front_desk')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$