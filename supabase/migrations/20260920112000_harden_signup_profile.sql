-- Ensure signup metadata (full_name, username, email) always lands on profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_username text;
BEGIN
  v_full_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  v_username := lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'username', ''), '[^a-zA-Z0-9_]', '', 'g'));

  IF v_username IS NULL OR length(v_username) < 3 THEN
    v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  -- Avoid rare username collisions
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 4);
  END IF;

  INSERT INTO public.profiles (user_id, full_name, username, email, relationship_status)
  VALUES (
    NEW.id,
    COALESCE(v_full_name, 'Lovli User'),
    v_username,
    NEW.email,
    'single'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = CASE
      WHEN public.profiles.full_name IS NULL OR btrim(public.profiles.full_name) = ''
        THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    username = CASE
      WHEN public.profiles.username IS NULL OR btrim(public.profiles.username) = '' OR public.profiles.username LIKE 'user_%'
        THEN EXCLUDED.username
      ELSE public.profiles.username
    END,
    email = COALESCE(NULLIF(btrim(public.profiles.email), ''), EXCLUDED.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
