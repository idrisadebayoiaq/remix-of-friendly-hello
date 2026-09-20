-- Phase 0: gender, dating match prefs, connection origin, match requests

DO $$ BEGIN
  CREATE TYPE public.profile_gender AS ENUM ('man', 'woman', 'other', 'prefer_not');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender public.profile_gender;

COMMENT ON COLUMN public.profiles.gender IS 'Used for Meet Dating opposite-gender deck (man↔woman).';

ALTER TABLE public.dating_profiles
  ADD COLUMN IF NOT EXISTS match_mode text NOT NULL DEFAULT 'approve',
  ADD COLUMN IF NOT EXISTS preferred_genders text[] NOT NULL DEFAULT '{}'::text[];

DO $$ BEGIN
  ALTER TABLE public.dating_profiles
    ADD CONSTRAINT dating_profiles_match_mode_check
    CHECK (match_mode IN ('approve', 'instant'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.dating_profiles.match_mode IS 'approve = notify+approve before chat; instant = open chat on Match with no approve.';
COMMENT ON COLUMN public.dating_profiles.preferred_genders IS 'Who appears in this user dating deck. Default opposite of own gender.';

UPDATE public.connections
SET origin_type = 'friends'
WHERE origin_type IS NULL OR origin_type = '';

DO $$ BEGIN
  ALTER TABLE public.connections
    ADD CONSTRAINT connections_origin_type_check
    CHECK (origin_type IN ('invite', 'dating', 'friends', 'discover'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.connections.origin_type IS 'Bond source: invite | dating | friends (discover legacy → treat as friends).';

CREATE TABLE IF NOT EXISTS public.dating_match_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dating_match_requests_status_check
    CHECK (status IN ('pending', 'approved', 'declined', 'expired')),
  CONSTRAINT dating_match_requests_pair_unique UNIQUE (from_user_id, to_user_id),
  CONSTRAINT dating_match_requests_no_self CHECK (from_user_id <> to_user_id)
);

ALTER TABLE public.dating_match_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dating_match_requests_to_pending
  ON public.dating_match_requests(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_dating_match_requests_from
  ON public.dating_match_requests(from_user_id);

DROP POLICY IF EXISTS "Users can view own dating match requests" ON public.dating_match_requests;
CREATE POLICY "Users can view own dating match requests"
  ON public.dating_match_requests FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create dating match requests" ON public.dating_match_requests;
CREATE POLICY "Users can create dating match requests"
  ON public.dating_match_requests FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update dating match requests they receive or sent" ON public.dating_match_requests;
CREATE POLICY "Users can update dating match requests they receive or sent"
  ON public.dating_match_requests FOR UPDATE TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid())
  WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

GRANT ALL ON public.dating_match_requests TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_username text;
  v_gender public.profile_gender;
  v_gender_raw text;
BEGIN
  v_full_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  v_username := lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'username', ''), '[^a-zA-Z0-9_]', '', 'g'));
  v_gender_raw := lower(trim(COALESCE(NEW.raw_user_meta_data->>'gender', '')));

  IF v_gender_raw IN ('man', 'woman', 'other', 'prefer_not') THEN
    v_gender := v_gender_raw::public.profile_gender;
  ELSE
    v_gender := NULL;
  END IF;

  IF v_username IS NULL OR length(v_username) < 3 THEN
    v_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 4);
  END IF;

  INSERT INTO public.profiles (user_id, full_name, username, email, relationship_status, gender)
  VALUES (
    NEW.id,
    COALESCE(v_full_name, 'Lovli User'),
    v_username,
    NEW.email,
    'single',
    v_gender
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
    email = COALESCE(NULLIF(btrim(public.profiles.email), ''), EXCLUDED.email),
    gender = COALESCE(public.profiles.gender, EXCLUDED.gender);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.default_preferred_genders(p_gender public.profile_gender)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_gender
    WHEN 'man' THEN ARRAY['woman']::text[]
    WHEN 'woman' THEN ARRAY['man']::text[]
    ELSE '{}'::text[]
  END;
$$;
